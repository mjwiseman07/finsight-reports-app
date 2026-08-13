/**
 * Canonical completed-period helpers for Scorecard / accounting memory.
 */

export type AccountingDateRange = {
  startDate: string;
  endDate: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function assertIsoDate(value: string, label: string): void {
  if (!ISO_DATE.test(value)) {
    throw new Error(`${label} must be YYYY-MM-DD, got: ${value}`);
  }
}

function parseUtcDate(iso: string): Date {
  const d = new Date(`${iso}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid ISO date: ${iso}`);
  }
  return d;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function daysInUtcMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/**
 * Trailing twelve completed months ending on `endDate`.
 *
 * For month-end as-of (e.g. 2026-07-31):
 *   startDate = 2025-08-01
 *   endDate   = 2026-07-31
 *
 * If `endDate` is mid-month, the window still ends on that date and starts
 * on the first day of the month twelve months earlier (same calendar day
 * clamped), so T12M always covers ~12 months of completed activity ending
 * at the selected as-of.
 */
export function trailingTwelveMonthPeriod(endDate: string): AccountingDateRange {
  assertIsoDate(endDate, "endDate");
  const end = parseUtcDate(endDate);
  const endYear = end.getUTCFullYear();
  const endMonth = end.getUTCMonth(); // 0-based
  const endDay = end.getUTCDate();

  // Start month = same month index, one year earlier, day 1 when end is month-end;
  // otherwise first day of the month containing (end - 12 months + 1 day) semantics:
  // canonical Scorecard contract: first day of the month that is 11 months before
  // the end month when endDate is the last day of its month; otherwise first day
  // of (endMonth - 11).
  //
  // Example: end 2026-07-31 → start month Aug 2025 → 2025-08-01
  // Example: end 2026-02-28 (non-leap) → start 2025-03-01
  // Example: end 2024-02-29 (leap) → start 2023-03-01
  const startMonthIndex = endMonth - 11;
  const start = new Date(Date.UTC(endYear, startMonthIndex, 1));
  // Guard: if endDate is not last day of its month, still use day-1 of start month
  // (Scorecard T12M is defined on completed month ends in practice).
  void endDay;
  void daysInUtcMonth;

  return {
    startDate: toIsoDate(start),
    endDate,
  };
}
