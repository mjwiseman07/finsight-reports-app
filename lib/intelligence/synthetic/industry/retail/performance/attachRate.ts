import type { RetailPanelContext } from "../../contracts/retail/RetailBasisContracts";
import { buildKpiField } from "./fieldBuilder";
import { safePercent } from "./types";

export function evaluateAttachRate(
  context: RetailPanelContext,
  pickupsWithIncrementalPurchase: number | undefined,
  totalPickups: number | undefined,
) {
  if (!Number.isFinite(pickupsWithIncrementalPurchase) || !Number.isFinite(totalPickups)) {
    return undefined;
  }
  const pickups = Number(pickupsWithIncrementalPurchase);
  const total = Number(totalPickups);
  return buildKpiField(context, {
    id: "RTL-K-12",
    label: "Attach Rate (drill-down)",
    unitOfMeasure: "%",
    signConvention: "higher-better",
    applicableSubSegments: ["B", "E", "O", "G", "S"],
    computeAmount: () => safePercent(pickups, total),
  });
}
