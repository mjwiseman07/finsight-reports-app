/**
 * Phase TCP1 W1 — Stripe checkout.session.completed → pilot_slots upsert.
 */
import { createServiceClient } from "@/lib/supabase/service";

export interface CheckoutSessionPayload {
  id: string;
  subscription?: string | null;
  customer?: string | null;
  metadata?: Record<string, string | undefined>;
}

export async function handleTcp1CheckoutCompleted(
  session: CheckoutSessionPayload,
): Promise<{ handled: boolean; reason?: string }> {
  const companyId = session.metadata?.company_id;
  const tierKey = session.metadata?.tier_key;
  const pricingStructure = session.metadata?.pricing_structure;
  const pricingCadence = session.metadata?.pricing_cadence;
  const track = session.metadata?.track;

  if (!companyId || !tierKey) {
    console.error(
      "[stripe/webhook] checkout.session.completed missing company_id or tier_key metadata",
      { session_id: session.id },
    );
    return { handled: false, reason: "missing_metadata" };
  }

  if (tierKey !== "solo_bookkeeper" && tierKey !== "client_seat_alacarte") {
    console.warn("[stripe/webhook] W1 only handles solo_bookkeeper; ignoring", { tierKey });
    return { handled: false, reason: "out_of_scope_tier" };
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

  // Standard-track subscribers do NOT occupy a pilot slot number — that's
  // reserved for the pilot cohort. Use NULL so the partial unique index
  // does not collide across standard subscribers (Bug 2).
  const slotNumberForRow: number | null = track === "pilot" ? assignedSlot : null;
  const { error } = await supabase.from("pilot_slots").upsert(
    {
      tier_key: tierKey,
      company_id: companyId,
      pilot_slot_number: slotNumberForRow,
      pilot_status: "active",
      pricing_structure: pricingStructure ?? "flat",
      pricing_cadence: pricingCadence ?? "monthly",
      stripe_subscription_id:
        typeof session.subscription === "string" ? session.subscription : null,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
    },
    { onConflict: "tier_key,company_id" },
  );
  if (error) throw error;
  return { handled: true };
}

export async function handleTcp1SubscriptionDeleted(subscriptionId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("pilot_slots")
    .update({ pilot_status: "cancelled" })
    .eq("stripe_subscription_id", subscriptionId);
  if (error) throw error;
}
