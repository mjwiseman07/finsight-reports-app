import type { IFRSStoreCgu, RetailPanelContext } from "../types";

export function evaluateStoreCgu(
  ctx: RetailPanelContext,
  cgu: IFRSStoreCgu,
): { impairmentLoss: number; reversalRecognized?: number } {
  if (ctx.reportingBasis !== "IFRS") {
    throw new Error("IFRS store-CGU handler requires reportingBasis=IFRS");
  }
  const loss = Math.max(0, cgu.carryingAmount - cgu.recoverableAmount);
  return { impairmentLoss: loss };
}
