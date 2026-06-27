import type { USGAAPRetailLease, RetailPanelContext } from "../types";

export function routeAsc842RetailLease(
  ctx: RetailPanelContext,
  lease: USGAAPRetailLease,
): { variableRentExpense: number; percentageRentExpense: number } {
  if (ctx.reportingBasis !== "US_GAAP") {
    throw new Error("ASC 842 retail router requires reportingBasis=US_GAAP");
  }
  const variableRentExpense = lease.variableLeasePaymentNonRoUFlow;
  const percentageRentExpense = lease.percentageRentTerms
    ? Math.max(0, ctx.netSalesForPeriod - lease.percentageRentTerms.thresholdSales) *
      lease.percentageRentTerms.ratePct
    : 0;
  return { variableRentExpense, percentageRentExpense };
}
