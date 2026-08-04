/**
 * Phase TCP1 W1 — Stripe checkout.session.completed → pilot_slots.
 *
 * Phase MEM-LIFECYCLE Block 4: all mutating pilot_slots writes flow through
 * writePilotSlotAndEventAtomic (SSOT-adjacent). Every state change emits a
 * hash-chained pilot_lifecycle_events row.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { getSubscriptionEntity } from "@/lib/product-tiers";
import { writePilotSlotAndEventAtomic } from "@/lib/pilot-lifecycle/pilot-slots-writer";
import { getPilotLifecycleAuditWriter } from "@/lib/pilot-lifecycle/get-audit-writer";

/** Empty-content sha256 — used when Stripe provides no payload bytes to hash. */
const STRIPE_EVIDENCE_SHA256_PLACEHOLDER =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

export interface CheckoutSessionPayload {
  id: string;
  subscription?: string | null;
  customer?: string | null;
  metadata?: Record<string, string | undefined>;
  livemode?: boolean;
}

export interface CheckoutContext {
  /** Stripe event.livemode flag propagated from the webhook. */
  readonly livemode: boolean;
}

const EXPECT_LIVEMODE = process.env.STRIPE_EXPECT_LIVEMODE === "true";

export async function handleTcp1CheckoutCompleted(
  session: CheckoutSessionPayload,
  context: CheckoutContext = { livemode: Boolean(session.livemode) },
): Promise<{ handled: boolean; reason?: string }> {
  // --- C2: livemode guard ---
  if (EXPECT_LIVEMODE && !context.livemode) {
    console.error("[stripe/webhook] REJECTED test-mode event on live env", {
      session_id: session.id,
    });
    return { handled: false, reason: "livemode_mismatch_expected_live" };
  }
  if (!EXPECT_LIVEMODE && context.livemode) {
    console.error("[stripe/webhook] REJECTED live-mode event on test env", {
      session_id: session.id,
    });
    return { handled: false, reason: "livemode_mismatch_expected_test" };
  }

  const tierKey = session.metadata?.tier_key;
  const pricingStructure = session.metadata?.pricing_structure ?? "flat";
  const pricingCadence = session.metadata?.pricing_cadence ?? "monthly";
  const track = session.metadata?.track;
  const firmId = session.metadata?.firm_id;
  const companyId = session.metadata?.company_id;

  if (!tierKey) {
    console.error("[stripe/webhook] checkout.session.completed missing tier_key metadata", {
      session_id: session.id,
    });
    return { handled: false, reason: "missing_tier_key" };
  }

  const TCP1_LAUNCHED_TIERS = new Set([
    "solo_bookkeeper",
    "client_seat_alacarte",
    "review_assist",
    "review_assist_pro",
  ]);
  if (!TCP1_LAUNCHED_TIERS.has(tierKey)) {
    console.warn("[stripe/webhook] tier not yet launched; ignoring", { tierKey });
    return { handled: false, reason: "out_of_scope_tier" };
  }

  const entityType = getSubscriptionEntity(tierKey);
  if (entityType === null) {
    console.log("[stripe/webhook] add-on tier — no pilot_slots row written", { tierKey });
    return { handled: true, reason: "addon_no_slot_row" };
  }

  if (entityType === "firm") {
    if (!firmId) {
      console.error("[stripe/webhook] firm-tier checkout missing firm_id metadata", {
        session_id: session.id,
        tierKey,
      });
      return { handled: false, reason: "missing_firm_id" };
    }
    if (companyId) {
      console.error("[stripe/webhook] firm-tier checkout received unexpected company_id metadata", {
        session_id: session.id,
        tierKey,
      });
      return { handled: false, reason: "unexpected_company_id_on_firm_tier" };
    }
  } else if (entityType === "company") {
    if (!companyId) {
      console.error("[stripe/webhook] owner-tier checkout missing company_id metadata", {
        session_id: session.id,
        tierKey,
      });
      return { handled: false, reason: "missing_company_id" };
    }
    if (firmId) {
      console.error("[stripe/webhook] owner-tier checkout received unexpected firm_id metadata", {
        session_id: session.id,
        tierKey,
      });
      return { handled: false, reason: "unexpected_firm_id_on_owner_tier" };
    }
  } else {
    return { handled: false, reason: "unknown_entity_type" };
  }

  const supabase = createServiceClient();

  let assignedSlot: number | null = null;
  if (track === "pilot") {
    const { data: existingSlots } = await supabase
      .from("pilot_slots")
      .select("pilot_slot_number")
      .eq("tier_key", tierKey)
      .gt("pilot_slot_number", 0)
      .order("pilot_slot_number", { ascending: true });

    const taken = new Set((existingSlots ?? []).map((r) => r.pilot_slot_number as number));
    for (let n = 1; n <= 10; n++) {
      if (!taken.has(n)) {
        assignedSlot = n;
        break;
      }
    }
    if (assignedSlot === null) {
      console.error("[stripe/webhook] pilot cap reached for", tierKey);
      return { handled: false, reason: "pilot_cap_reached" };
    }
  }

  const slotNumberForRow: number | null = track === "pilot" ? assignedSlot : null;

  const stripeSubscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;
  const stripeCustomerId =
    typeof session.customer === "string" ? session.customer : null;

  await writePilotSlotAndEventAtomic(
    {
      slotOp: {
        op: "upsert",
        tier_key: tierKey,
        firm_id: entityType === "firm" ? (firmId as string) : null,
        company_id: entityType === "company" ? (companyId as string) : null,
        pilot_slot_number: slotNumberForRow,
        pilot_status: "active",
        pricing_structure: pricingStructure,
        pricing_cadence: pricingCadence,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        _on_conflict:
          entityType === "firm" ? "tier_key,firm_id" : "tier_key,company_id",
      },
      eventKind: "pilot.lifecycle.created",
      subject: {
        // RPC rebinds pilot_slot_id after upsert; placeholder satisfies the type.
        pilotSlotId: "00000000-0000-4000-8000-000000000000",
        ...(entityType === "firm"
          ? { firmId: firmId as string }
          : { companyId: companyId as string }),
      },
      actor: {
        kind: "system",
        userId: null,
        via: "stripe-webhook",
      },
      fromStatus: null,
      toStatus: "active",
      reasonCode: "stripe.checkout.session.completed",
      reasonText: `Checkout ${session.id} → pilot_slot creation`,
      classificationHint: null,
      assertionsCovered: ["existence", "rights_obligations"],
      evidenceRefs: [
        {
          kind: "stripe_event",
          uri: `stripe://checkout_session/${session.id}`,
          sha256: STRIPE_EVIDENCE_SHA256_PLACEHOLDER,
        },
      ],
      payload: {
        stripe_session_id: session.id,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_customer_id: stripeCustomerId,
        track,
        tier_key: tierKey,
        pilot_slot_number: slotNumberForRow,
        entity_type: entityType,
      },
      eventAt: new Date(),
    },
    supabase,
  );

  try {
    const auditWriter = getPilotLifecycleAuditWriter();
    auditWriter.append({
      kind: "pilot.lifecycle.created",
      actor: {
        kind: "system",
        id: "stripe:webhook",
        via: "direct-api",
      },
      subject: {
        tenantId: entityType === "firm" ? (firmId as string) : (companyId as string),
        orgId: entityType === "firm" ? (firmId as string) : (companyId as string),
      },
      payload: {
        stripe_session_id: session.id,
        tier_key: tierKey,
        entity_type: entityType,
        pilot_slot_number: slotNumberForRow,
      },
    });
  } catch (err) {
    console.error("[pilot-lifecycle] AuditLogWriter append failed (non-fatal)", err);
  }

  return { handled: true };
}

export interface SubscriptionDeletedContext {
  readonly livemode: boolean;
  readonly stripeEventId: string;
}

export async function handleTcp1SubscriptionDeleted(
  subscriptionId: string,
  context: SubscriptionDeletedContext,
): Promise<void> {
  if (EXPECT_LIVEMODE && !context.livemode) {
    console.error("[stripe/webhook] REJECTED test-mode subscription.deleted on live env", {
      subscriptionId,
    });
    return;
  }
  if (!EXPECT_LIVEMODE && context.livemode) {
    console.error("[stripe/webhook] REJECTED live-mode subscription.deleted on test env", {
      subscriptionId,
    });
    return;
  }

  const supabase = createServiceClient();

  const { data: slots, error: slotErr } = await supabase
    .from("pilot_slots")
    .select("id, firm_id, company_id, pilot_status, tier_key")
    .eq("stripe_subscription_id", subscriptionId);
  if (slotErr) throw slotErr;
  if (!slots || slots.length === 0) return;

  for (const slot of slots) {
    if (slot.pilot_status === "cancelled") continue;

    const subject =
      slot.firm_id != null
        ? { pilotSlotId: slot.id as string, firmId: slot.firm_id as string }
        : { pilotSlotId: slot.id as string, companyId: slot.company_id as string };

    await writePilotSlotAndEventAtomic(
      {
        slotOp: { op: "update_status", id: slot.id, pilot_status: "cancelled" },
        eventKind: "pilot.lifecycle.transition",
        subject,
        actor: { kind: "system", userId: null, via: "stripe-webhook" },
        fromStatus: slot.pilot_status,
        toStatus: "cancelled",
        reasonCode: "stripe.customer.subscription.deleted",
        reasonText: `Subscription ${subscriptionId} deleted → pilot_status cancelled`,
        classificationHint: null,
        assertionsCovered: ["existence", "rights_obligations"],
        evidenceRefs: [
          {
            kind: "stripe_event",
            uri: `stripe://event/${context.stripeEventId}`,
            sha256: STRIPE_EVIDENCE_SHA256_PLACEHOLDER,
          },
        ],
        payload: {
          stripe_subscription_id: subscriptionId,
          stripe_event_id: context.stripeEventId,
          tier_key: slot.tier_key,
        },
        eventAt: new Date(),
      },
      supabase,
    );
  }
}
