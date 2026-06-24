import type { RetailPanelContext } from "../../contracts/retail/RetailBasisContracts";
import { buildKpiField } from "./fieldBuilder";
import { safePercent, safeRatio } from "./types";

/** RTL-K-14: (net sales - cogs) / net sales * 100 */
export function computeGrossMarginPercent(netSales: number, cogs: number): number {
  return safePercent(netSales - cogs, netSales);
}

/** RTL-K-16: gross margin $ / average inventory at cost */
export function computeGMROI(netSales: number, cogs: number, averageInventoryAtCost: number): number {
  return safeRatio(netSales - cogs, averageInventoryAtCost);
}

/** RTL-K-24: cogs / average inventory at cost */
export function computeInventoryTurnover(cogs: number, averageInventoryAtCost: number): number {
  return safeRatio(cogs, averageInventoryAtCost);
}

export function evaluateMarginAndInventory(
  context: RetailPanelContext,
  netSales: number,
  cogs: number,
  averageInventoryAtCost: number,
) {
  return {
    grossMarginPercent: buildKpiField(context, {
      id: "RTL-K-06",
      label: "Gross Margin %",
      unitOfMeasure: "%",
      signConvention: "higher-better",
      applicableSubSegments: ["B", "E", "O", "G", "S"],
      computeAmount: () => computeGrossMarginPercent(netSales, cogs),
    }),
    grossMarginROI: buildKpiField(context, {
      id: "RTL-K-07",
      label: "GMROI",
      unitOfMeasure: "ratio",
      signConvention: "higher-better",
      applicableSubSegments: ["B", "E", "O", "G", "S"],
      computeAmount: () => computeGMROI(netSales, cogs, averageInventoryAtCost),
    }),
    inventoryTurnover: buildKpiField(context, {
      id: "RTL-K-08",
      label: "Inventory Turnover",
      unitOfMeasure: "ratio",
      signConvention: "higher-better",
      applicableSubSegments: ["B", "E", "O", "G", "S"],
      computeAmount: () => computeInventoryTurnover(cogs, averageInventoryAtCost),
    }),
  };
}
