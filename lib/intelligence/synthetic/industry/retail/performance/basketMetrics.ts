import type { RetailPanelContext } from "../../contracts/retail/RetailBasisContracts";
import { buildKpiField } from "./fieldBuilder";
import { safeRatio } from "./types";

/** RTL-K-06: total revenue / number of orders */
export function computeAverageOrderValue(totalRevenue: number, numberOfOrders: number): number {
  return safeRatio(totalRevenue, numberOfOrders);
}

export function evaluateAverageOrderValue(
  context: RetailPanelContext,
  totalRevenue: number,
  numberOfOrders: number,
) {
  return buildKpiField(context, {
    id: "RTL-K-04",
    label: "Average Order Value (AOV)",
    unitOfMeasure: "USD",
    signConvention: "higher-better",
    applicableSubSegments: ["B", "E", "O", "G", "S"],
    computeAmount: () => computeAverageOrderValue(totalRevenue, numberOfOrders),
  });
}

export function evaluateUnitsPerTransaction(
  context: RetailPanelContext,
  totalUnitsSold: number,
  numberOfTransactions: number,
) {
  return buildKpiField(context, {
    id: "RTL-K-05",
    label: "Units per Transaction (UPT)",
    unitOfMeasure: "ratio",
    signConvention: "higher-better",
    applicableSubSegments: ["B", "E", "O", "G", "S"],
    computeAmount: () => safeRatio(totalUnitsSold, numberOfTransactions),
  });
}
