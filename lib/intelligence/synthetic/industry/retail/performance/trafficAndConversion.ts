import type { RetailPanelContext } from "../../contracts/retail/RetailBasisContracts";
import { buildKpiField } from "./fieldBuilder";
import { safePercent } from "./types";

export function evaluateTrafficCount(context: RetailPanelContext, trafficCount: number) {
  return buildKpiField(context, {
    id: "RTL-K-02",
    label: "Store Traffic Count",
    unitOfMeasure: "count",
    signConvention: "higher-better",
    applicableSubSegments: ["B", "O", "G", "S"],
    computeAmount: () => (Number.isFinite(trafficCount) ? trafficCount : 0),
  });
}

/** RTL-K-11: (transactions or orders) / (traffic or sessions) * 100 */
export function computeConversionRate(transactionsOrOrders: number, trafficOrSessions: number): number {
  return safePercent(transactionsOrOrders, trafficOrSessions);
}

export function evaluateConversionRate(
  context: RetailPanelContext,
  transactionsOrOrders: number,
  trafficOrSessions: number,
) {
  return buildKpiField(context, {
    id: "RTL-K-03",
    label: "Conversion Rate",
    unitOfMeasure: "%",
    signConvention: "higher-better",
    applicableSubSegments: ["B", "E", "O", "G", "S"],
    computeAmount: () => computeConversionRate(transactionsOrOrders, trafficOrSessions),
  });
}
