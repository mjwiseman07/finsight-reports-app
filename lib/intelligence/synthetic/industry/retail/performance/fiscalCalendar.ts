import type {
  ComparableStorePeriodPair,
  PeriodBoundaryKind,
  RetailFiscalCalendar,
} from "../../contracts/retail/RetailBasisContracts";
import type { RetailEvaluatorResult } from "./types";

export function resolvePeriodBoundaryKind(fiscalCalendar: RetailFiscalCalendar): PeriodBoundaryKind {
  return fiscalCalendar === "4-5-4" ? "NRF_454_WEEK" : "ISO_CALENDAR_MONTH";
}

export function assertComparableStoreBoundaryMatch(
  pair: ComparableStorePeriodPair,
): RetailEvaluatorResult<void> {
  if (pair.current.boundaryKind !== pair.prior.boundaryKind) {
    return { ok: false, error: "FISCAL_BOUNDARY_MISMATCH" };
  }
  return { ok: true, value: undefined };
}
