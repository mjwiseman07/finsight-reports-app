import type { USGAAPRetailImpairmentTrigger, RetailPanelContext } from "../types";

export function evaluateRetailImpairmentTrigger(
  ctx: RetailPanelContext,
  trigger: USGAAPRetailImpairmentTrigger,
): { impairmentRecognized: number; reason: string } {
  if (ctx.reportingBasis !== "US_GAAP") {
    throw new Error("ASC 360 retail trigger requires reportingBasis=US_GAAP");
  }
  if (trigger.undiscountedCashFlows >= trigger.carryingAmount) {
    return {
      impairmentRecognized: 0,
      reason: "Undiscounted CFs cover carrying; no impairment per ASC 360-10-35-17",
    };
  }
  return {
    impairmentRecognized: trigger.carryingAmount - trigger.undiscountedCashFlows,
    reason: trigger.triggerEvent,
  };
}
