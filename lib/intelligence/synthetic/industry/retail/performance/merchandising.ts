import type { RetailPanelContext } from "../../contracts/retail/RetailBasisContracts";
import { buildKpiField } from "./fieldBuilder";
import { safePercent } from "./types";

export function evaluateSellThroughRate(
  context: RetailPanelContext,
  unitsSold: number,
  unitsReceived: number,
) {
  return buildKpiField(context, {
    id: "RTL-K-09",
    label: "Sell-Through Rate",
    unitOfMeasure: "%",
    signConvention: "target-band",
    applicableSubSegments: ["B", "O", "G", "S"],
    computeAmount: () => safePercent(unitsSold, unitsReceived),
  });
}

/** RTL-K-34: (book inventory - physical inventory) / net sales * 100 */
export function computeShrinkRate(bookInventory: number, physicalInventory: number, netSales: number): number {
  return safePercent(bookInventory - physicalInventory, netSales);
}

export function evaluateShrinkRate(
  context: RetailPanelContext,
  bookInventory: number,
  physicalInventory: number,
  netSales: number,
) {
  return buildKpiField(context, {
    id: "RTL-K-10",
    label: "Shrink Rate (% of Net Sales)",
    unitOfMeasure: "%",
    signConvention: "lower-better",
    applicableSubSegments: ["B", "E", "O", "G", "S"],
    computeAmount: () => computeShrinkRate(bookInventory, physicalInventory, netSales),
  });
}

export function evaluateReturnsRate(
  context: RetailPanelContext,
  returnedMerchandise: number,
  grossSales: number,
) {
  return buildKpiField(context, {
    id: "RTL-K-11",
    label: "Returns Rate",
    unitOfMeasure: "%",
    signConvention: "lower-better",
    applicableSubSegments: ["B", "E", "O", "G", "S"],
    computeAmount: () => safePercent(returnedMerchandise, grossSales),
  });
}
