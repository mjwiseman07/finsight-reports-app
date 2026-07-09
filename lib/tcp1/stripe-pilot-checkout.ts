/**
 * Phase TCP1 W1 — Stripe checkout.session.completed → pilot_slots upsert.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { getSubscriptionEntity } from "@/lib/product-tiers";

export interface CheckoutSessionPayload {
  id: string;
  subscription?: string | null;
  customer?: string | null;
  metadata?: Record<string, string | undefined>;
}

export async function handleTcp1CheckoutCompleted(
  session: CheckoutSessionPayload,
): Promise<{ handled: boolean; reason?: string }> {
  const tierKey = session.metadata?.tier_key;
  const pricingStructure = session.metadata?.pricing_structure;
  const pricingCadence = session.metadata?.pricing_cadence;
  const track = session.metadata?.track;
  const firmId = session.metadata?.firm_id;
  const companyId = session.metadata?.company_id;

  if (!tierKey) {
    console.error("[stripe/webhook] checkout.session.completed missing tier_key metadata", {
      session_id: session.id,
    });
    return { handled: false, reason: "missing_tier_key" };
  }

  // W1 + W2.5 scope guard — expand this list as later weeks launch.
  // W2.5 (Jul 22): review_assist joins the firm-tier family.
  const TCP1_LAUNCHED_TIERS = new Set([
    "solo_bookkeeper",
    "client_seat_alacarte",
    "review_assist",
  ]);
  if (!TCP1_LAUNCHED_TIERS.has(tierKey)) {
    console.warn("[stripe/webhook] tier not yet launched; ignoring", { tierKey });
    return { handled: false, reason: "out_of_scope_tier" };
  }

  // Add-on tiers (client_seat_alacarte) attach to an existing parent slot and
  // do NOT create their own pilot_slots row. W1 add-on billing is handled by
  // metered usage on the parent solo_bookkeeper subscription, not by a new row.
  const entityType = getSubscriptionEntity(tierKey);
  if (entityType === null) {
    console.log("[stripe/webhook] add-on tier — no pilot_slots row written", { tierKey });
    return { handled: true, reason: "addon_no_slot_row" };
  }

  // Firm-tier: require firm_id, reject company_id.
  // Owner-tier: require company_id, reject firm_id.
  // Loud failure on the wrong metadata prevents silent schema violations
  // when the CHECK constraint would otherwise reject the insert.
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

  // Pilot-cap enforcement is entity-agnostic — the pilot cohort is capped by
  // tier_key regardless of firm or company scope.
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

  // Standard-track subscribers do NOT occupy a pilot slot number (Bug 2).
  const slotNumberForRow: number | null = track === "pilot" ? assignedSlot : null;

  const baseRow = {
    tier_key: tierKey,
    pilot_slot_number: slotNumberForRow,
    pilot_status: "active" as const,
    pricing_structure: pricingStructure ?? "flat",
    pricing_cadence: pricingCadence ?? "monthly",
    stripe_subscription_id:
      typeof session.subscription === "string" ? session.subscription : null,
    stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
  };

  const { error } =
    entityType === "firm"
      ? await supabase.from("pilot_slots").upsert(
          { ...baseRow, firm_id: firmId, company_id: null },
          { onConflict: "tier_key,firm_id" },
        )
      : await supabase.from("pilot_slots").upsert(
          { ...baseRow, firm_id: null, company_id: companyId },
          { onConflict: "tier_key,company_id" },
        );

  if (error) throw error;
  return { handled: true };
}

export async function handleTcp1SubscriptionDeleted(subscriptionId: string): Promise<void> {
  // Unchanged — cancellation is scoped by stripe_subscription_id regardless of
  // whether the row is firm-tier or company-tier.
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("pilot_slots")
    .update({ pilot_status: "cancelled" })
    .eq("stripe_subscription_id", subscriptionId);
  if (error) throw error;
}
