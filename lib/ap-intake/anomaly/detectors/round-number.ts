import type { AnomalySignal, VendorBaseline } from "../schema";

export function detectRoundNumberClustering(args: {
  invoiceAmountCents: number | null;
  baseline: VendorBaseline;
}): AnomalySignal | null {
  if (args.invoiceAmountCents == null) return null;
  if (args.invoiceAmountCents % 10000 !== 0) return null;
  if (args.baseline.round_amount_ratio >= 0.25) return null;

  return {
    code: "round_number_clustering",
    severity: "MEDIUM",
    evidence: {
      invoice_amount_cents: args.invoiceAmountCents,
      baseline_round_ratio: args.baseline.round_amount_ratio,
      sample_size: args.baseline.sample_size,
    },
  };
}
