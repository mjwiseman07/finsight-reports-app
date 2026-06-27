import type { FiscalCalendarPolicy } from "../types";
import { RETAIL_DEFAULTS } from "../types";

export function defaultFiscalCalendarPolicy(): FiscalCalendarPolicy {
  return {
    calendar: RETAIL_DEFAULTS.fiscalCalendar,
    exclude53rdWeekFromCompStore: RETAIL_DEFAULTS.exclude53rdWeekFromCompStore,
  };
}

export function normalizeFiscalPeriod(
  policy: FiscalCalendarPolicy,
  isoDate: string,
  fiscalWeek: number,
): { fiscalYear: number; fiscalWeek: number; isComparable: boolean } {
  const year = Number.parseInt(isoDate.slice(0, 4), 10);
  const is53rdWeek = fiscalWeek === 53;
  const isComparable =
    !(policy.calendar === "4_5_4_NRF" && policy.exclude53rdWeekFromCompStore && is53rdWeek);
  return { fiscalYear: year, fiscalWeek, isComparable };
}
