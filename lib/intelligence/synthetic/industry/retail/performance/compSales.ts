import type { RetailPanelContext } from "../../contracts/retail/RetailBasisContracts";
import { buildKpiField } from "./fieldBuilder";
import { assertComparableStoreBoundaryMatch } from "./fiscalCalendar";
import type { RetailEvaluatorResult } from "./types";

/** RTL-K-01: (s_c,t - s_c,t-1) / s_c,t-1 * 100 */
export function computeSameStoreSalesGrowth(
  comparableSalesCurrent: number,
  comparableSalesPrior: number,
): number {
  if (!Number.isFinite(comparableSalesCurrent) || !Number.isFinite(comparableSalesPrior) || comparableSalesPrior === 0) {
    return 0;
  }
  return ((comparableSalesCurrent - comparableSalesPrior) / comparableSalesPrior) * 100;
}

export function evaluateCompSales(
  context: RetailPanelContext,
  comparableSalesCurrent: number,
  comparableSalesPrior: number,
  compPeriodPair: Parameters<typeof assertComparableStoreBoundaryMatch>[0],
): RetailEvaluatorResult<ReturnType<typeof buildKpiField>> {
  const boundaryCheck = assertComparableStoreBoundaryMatch(compPeriodPair);
  if (!boundaryCheck.ok) return boundaryCheck;

  return {
    ok: true,
    value: buildKpiField(context, {
      id: "RTL-K-01",
      label: "Comparable / Same-Store Sales Growth",
      unitOfMeasure: "%",
      signConvention: "higher-better",
      applicableSubSegments: ["B", "E", "O", "G", "S"],
      computeAmount: () =>
        computeSameStoreSalesGrowth(comparableSalesCurrent, comparableSalesPrior),
    }),
  };
}
