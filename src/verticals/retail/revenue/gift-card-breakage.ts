import type { GiftCardBreakageMethodology, GiftCardLiability, RetailPanelContext } from "../types";
import { RETAIL_DEFAULTS } from "../types";

export function recognizeGiftCardBreakage(
  _ctx: RetailPanelContext,
  liability: GiftCardLiability,
  _redemptionsThisPeriod: number,
): { breakageThisPeriod: number; methodologyApplied: GiftCardBreakageMethodology } {
  const minHistory = RETAIL_DEFAULTS.giftCardMinHistoryMonths;
  const effectiveMethod: GiftCardBreakageMethodology =
    liability.breakageMethodology === "PROPORTIONAL" &&
    liability.redemptionPatternHistoryMonths >= minHistory
      ? "PROPORTIONAL"
      : "REMOTE";

  return { breakageThisPeriod: 0, methodologyApplied: effectiveMethod };
}
