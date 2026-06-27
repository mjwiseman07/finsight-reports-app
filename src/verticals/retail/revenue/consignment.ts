import type { ConsignmentArrangement, RetailPanelContext } from "../types";

export function evaluateConsignmentControlTransfer(
  _ctx: RetailPanelContext,
  arrangement: ConsignmentArrangement,
): { recognizeRevenue: boolean; reason: string } {
  if (!arrangement.controlTransferred) {
    return { recognizeRevenue: false, reason: "Control not transferred per ASC 606-10-55-79" };
  }
  if (arrangement.consignorPricingControl) {
    return { recognizeRevenue: false, reason: "Consignor retains pricing control per ASC 606-10-55-80" };
  }
  return { recognizeRevenue: true, reason: "Control transferred; revenue recognition permitted" };
}
