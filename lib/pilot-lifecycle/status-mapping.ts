/**
 * Phase MEM-LIFECYCLE Block 4/6 — canonical mapping from Stripe subscription
 * status to Advisacor pilot_slots.pilot_status.
 *
 * DB CHECK: pending | active | converted | cancelled | complimentary.
 *
 * Block 6 D8: active → pending is illegal. Stripe `paused` therefore maps to
 * cancelled (fail closed) rather than pending.
 *
 * past_due → active is intentional (dunning still entitled).
 */
export const PILOT_STATUS_FROM_STRIPE_STATUS: Record<string, string> = {
  active: "active",
  trialing: "active",
  past_due: "active",
  unpaid: "cancelled",
  paused: "cancelled", // Block 6: was pending; active→pending banned
  canceled: "cancelled",
  incomplete: "pending",
  incomplete_expired: "cancelled",
};

export function derivePilotStatusFromStripe(stripeStatus: string): string {
  const mapped = PILOT_STATUS_FROM_STRIPE_STATUS[stripeStatus];
  if (!mapped) {
    console.warn(
      `[pilot-lifecycle] unknown stripe status="${stripeStatus}", defaulting to cancelled`,
    );
    return "cancelled";
  }
  return mapped;
}
