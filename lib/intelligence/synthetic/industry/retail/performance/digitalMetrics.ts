import type { RetailPanelContext } from "../../contracts/retail/RetailBasisContracts";
import { buildKpiField } from "./fieldBuilder";
import { safePercent, safeRatio } from "./types";

export function evaluateOnlineSessions(context: RetailPanelContext, onlineSessions: number) {
  return buildKpiField(context, {
    id: "RTL-K-14",
    label: "Online Sessions",
    unitOfMeasure: "count",
    signConvention: "higher-better",
    applicableSubSegments: ["E", "O", "S"],
    computeAmount: () => (Number.isFinite(onlineSessions) ? onlineSessions : 0),
  });
}

export function evaluateCartAbandonmentRate(
  context: RetailPanelContext,
  completedPurchases: number,
  cartsCreated: number,
) {
  return buildKpiField(context, {
    id: "RTL-K-15",
    label: "Cart Abandonment Rate",
    unitOfMeasure: "%",
    signConvention: "lower-better",
    applicableSubSegments: ["E", "O"],
    computeAmount: () => safePercent(1 - safeRatio(completedPurchases, cartsCreated), 1),
  });
}

export function evaluateDigitalCAC(
  context: RetailPanelContext,
  totalSalesAndMarketingSpend: number,
  newCustomersAcquired: number,
) {
  return buildKpiField(context, {
    id: "RTL-K-16",
    label: "Digital Customer Acquisition Cost",
    unitOfMeasure: "USD",
    signConvention: "lower-better",
    applicableSubSegments: ["E", "O", "S"],
    computeAmount: () => safeRatio(totalSalesAndMarketingSpend, newCustomersAcquired),
  });
}
