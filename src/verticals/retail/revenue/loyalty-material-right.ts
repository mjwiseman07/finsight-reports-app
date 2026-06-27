import type { LoyaltyMaterialRight, RetailPanelContext } from "../types";
import { RETAIL_DEFAULTS } from "../types";

export function allocateLoyaltyMaterialRight(
  _ctx: RetailPanelContext,
  program: LoyaltyMaterialRight,
  _transactionPrice: number,
  _pointsEarned: number,
): { transactionRevenue: number; deferredLoyaltyRevenue: number } {
  if (program.sspAllocation !== "RELATIVE_SSP") {
    throw new Error("Only RELATIVE_SSP allocation implemented at v1.0; RESIDUAL deferred to W3");
  }
  const _breakageRate = program.breakageRate ?? RETAIL_DEFAULTS.loyaltyBreakageRate;
  return { transactionRevenue: 0, deferredLoyaltyRevenue: 0 };
}
