import type { USGAAPLease } from "../types";

export function routeAsc842Lease(input: {
  classification: "OPERATING" | "FINANCE";
  rouAsset: number;
  leaseLiability: number;
  shortTermExpedientElected?: boolean;
}): USGAAPLease {
  const expensePattern =
    input.classification === "OPERATING"
      ? "STRAIGHT_LINE"
      : "INTEREST_PLUS_AMORTIZATION";
  return {
    basis: "US_GAAP",
    classification: input.classification,
    rouAsset: input.rouAsset,
    leaseLiability: input.leaseLiability,
    expensePattern,
    shortTermExpedientElected: input.shortTermExpedientElected ?? true,
  };
}
