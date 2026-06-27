import type { ReturnsReserve, ReturnsReserveBasis, RetailPanelContext } from "../types";

export function computeReturnsReserve(
  _ctx: RetailPanelContext,
  reserve: ReturnsReserve,
  _netSalesThisPeriod: number,
  _historicalReturnsData: ReadonlyArray<{ periodIso: string; returnsRate: number }>,
): { refundLiability: number; returnAssetGross: number; basisApplied: ReturnsReserveBasis } {
  return {
    refundLiability: 0,
    returnAssetGross: 0,
    basisApplied: reserve.reserveBasis,
  };
}
