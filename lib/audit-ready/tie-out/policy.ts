export type PolicySnapshot = {
  auto_reconcile_max_dollar: number;
  auto_reconcile_max_percent: number;
  kickout_min_dollar: number;
  kickout_min_percent: number;
  authoritative_comparison: "dollar_only" | "percent_only" | "tighter_of_both";
};

export type VarianceClassification =
  | "tie"
  | "auto_cleared"
  | "review"
  | "kickout";

/**
 * Classify a variance against a policy snapshot.
 * All amounts in cents (bigint-safe when small; caller passes numbers).
 */
export function classifyVariance(
  varianceCents: number,
  referenceCents: number,
  policy: PolicySnapshot,
): { status: VarianceClassification; reason: string; percent: number } {
  if (varianceCents === 0) {
    return { status: "tie", reason: "exact tie", percent: 0 };
  }
  const absDollar = Math.abs(varianceCents) / 100;
  const absReference = Math.abs(referenceCents) / 100;
  const percent = absReference > 0 ? absDollar / absReference : 1; // 100% when reference is 0
  const dollarBelowAuto = absDollar <= policy.auto_reconcile_max_dollar;
  const dollarBelowKickout = absDollar < policy.kickout_min_dollar;
  const percentBelowAuto = percent <= policy.auto_reconcile_max_percent;
  const percentBelowKickout = percent < policy.kickout_min_percent;
  let autoOk: boolean;
  let kickoutTrip: boolean;
  switch (policy.authoritative_comparison) {
    case "dollar_only":
      autoOk = dollarBelowAuto;
      kickoutTrip = !dollarBelowKickout;
      break;
    case "percent_only":
      autoOk = percentBelowAuto;
      kickoutTrip = !percentBelowKickout;
      break;
    case "tighter_of_both":
    default:
      // Auto only if BOTH tolerances agree; kickout if EITHER exceeds.
      autoOk = dollarBelowAuto && percentBelowAuto;
      kickoutTrip = !dollarBelowKickout || !percentBelowKickout;
      break;
  }
  if (autoOk) {
    return {
      status: "auto_cleared",
      reason: `variance $${absDollar.toFixed(2)} (${(percent * 100).toFixed(3)}%) within auto tolerance`,
      percent,
    };
  }
  if (kickoutTrip) {
    return {
      status: "kickout",
      reason: `variance $${absDollar.toFixed(2)} (${(percent * 100).toFixed(3)}%) exceeds kickout tolerance`,
      percent,
    };
  }
  return {
    status: "review",
    reason: `variance $${absDollar.toFixed(2)} (${(percent * 100).toFixed(3)}%) between auto and kickout tolerances`,
    percent,
  };
}
