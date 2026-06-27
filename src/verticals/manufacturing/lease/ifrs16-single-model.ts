import type { IFRSLease } from "../types";

export function recognizeIfrs16Lease(input: {
  leaseLiability: number;
  rouAsset: number;
  shortTermExpedientElected?: boolean;
  lowValueExpedientElected?: boolean;
}): IFRSLease {
  return {
    basis: "IFRS",
    rouAsset: input.rouAsset,
    leaseLiability: input.leaseLiability,
    expensePattern: "INTEREST_PLUS_AMORTIZATION",
    shortTermExpedientElected: input.shortTermExpedientElected ?? true,
    lowValueExpedientElected: input.lowValueExpedientElected ?? false,
  };
}

export function assertSingleModel(lease: IFRSLease): void {
  if (lease.basis !== "IFRS") {
    throw new Error("IFRS 16 single-model applies only to IFRS basis.");
  }
}
