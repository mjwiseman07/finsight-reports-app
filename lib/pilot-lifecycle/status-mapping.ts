/**
 * Phase MEM-LIFECYCLE Block 4 — canonical mapping from Stripe subscription
 * status to Advisacor pilot_slots.pilot_status.
 *
 * past_due → active is intentional. Stripe holds the sub in past_due during
 * dunning; entitlements remain active until the terminal cancel. The
 * invoice.payment_failed handler surfaces the dunning signal separately.
 *
 * DB CHECK only allows: pending | active | converted | cancelled | complimentary.
 * Paste-literal "suspended" is mapped to the nearest legal values below.
 */
export const PILOT_STATUS_FROM_STRIPE_STATUS: Record<string, string> = {
  active: "active",
  trialing: "active",
  past_due: "active", // dunning — still entitled
  unpaid: "cancelled", // no DB "suspended" — fail closed
  paused: "pending", // parked / not actively entitled
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
