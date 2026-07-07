import type { AnomalySignal, VendorBaseline } from "../schema";

export function detectUnitPriceDrift(args: {
  invoiceAmountCents: number | null;
  baseline: VendorBaseline;
}): AnomalySignal | null {
  if (args.invoiceAmountCents == null || args.baseline.amount_stddev_cents === 0) return null;
  const diff = args.invoiceAmountCents - args.baseline.amount_mean_cents;
  const pctDelta = Math.abs(diff) / args.baseline.amount_mean_cents;
  const sigma = Math.abs(diff) / args.baseline.amount_stddev_cents;

  const isHigh = pctDelta > 0.4 && sigma > 3;
  const isMedium = pctDelta > 0.2 && sigma > 2;

  if (!isHigh && !isMedium) return null;

  return {
    code: "unit_price_drift",
    severity: isHigh ? "HIGH" : "MEDIUM",
    evidence: {
      invoice_amount_cents: args.invoiceAmountCents,
      baseline_mean_cents: args.baseline.amount_mean_cents,
      baseline_stddev_cents: args.baseline.amount_stddev_cents,
      pct_delta_from_mean: Number(pctDelta.toFixed(3)),
      sigma: Number(sigma.toFixed(2)),
      sample_size: args.baseline.sample_size,
    },
  };
}
