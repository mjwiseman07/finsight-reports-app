import type { IFRSRetailLease, RetailPanelContext } from "../types";

export function applyIfrs16RetailGrossUp(
  ctx: RetailPanelContext,
  lease: IFRSRetailLease,
): { rouAssetGrossed: number; leaseLiabilityGrossed: number } {
  if (ctx.reportingBasis !== "IFRS") {
    throw new Error("IFRS 16 retail gross-up requires reportingBasis=IFRS");
  }
  if (!lease.retailTenantGrossUpApplied) {
    return { rouAssetGrossed: lease.rouAsset, leaseLiabilityGrossed: lease.leaseLiability };
  }
  return { rouAssetGrossed: lease.rouAsset, leaseLiabilityGrossed: lease.leaseLiability };
}
