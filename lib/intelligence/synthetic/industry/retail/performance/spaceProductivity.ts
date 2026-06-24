import type { RetailPanelContext } from "../../contracts/retail/RetailBasisContracts";
import { buildKpiField } from "./fieldBuilder";
import { safeRatio } from "./types";

export function evaluateSalesPerSquareFoot(
  context: RetailPanelContext,
  netSales: number,
  sellingAreaSqFt: number,
) {
  return buildKpiField(context, {
    id: "RTL-K-13",
    label: "Sales per Square Foot",
    unitOfMeasure: "USD_per_sqft",
    signConvention: "higher-better",
    applicableSubSegments: ["B", "O", "G", "S"],
    computeAmount: () => safeRatio(netSales, sellingAreaSqFt),
  });
}
