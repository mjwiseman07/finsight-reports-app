export type AgeBucket = "new_this_close" | "carried_over" | "stale";

/**
 * Age bucket anchored on engagement close/audit period end.
 * - new_this_close: period_end === anchor (same day)
 * - stale: period_end older than anchor - 90 days
 * - carried_over: everything else (including when no anchor)
 */
export function computeAgeBucket(
  periodEnd: string,
  engagement: { audit_period_end: string | null; closed_at: string | null },
): AgeBucket {
  const anchor = engagement.closed_at ?? engagement.audit_period_end;
  if (!anchor) return "carried_over";
  const periodDate = new Date(periodEnd);
  const anchorDate = new Date(anchor);
  if (Number.isNaN(periodDate.getTime()) || Number.isNaN(anchorDate.getTime())) {
    return "carried_over";
  }
  const anchorDayOnly = new Date(anchorDate);
  anchorDayOnly.setUTCHours(0, 0, 0, 0);
  const periodDayOnly = new Date(periodDate);
  periodDayOnly.setUTCHours(0, 0, 0, 0);
  if (periodDayOnly.getTime() === anchorDayOnly.getTime()) return "new_this_close";
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
  if (periodDayOnly.getTime() < anchorDayOnly.getTime() - ninetyDaysMs) {
    return "stale";
  }
  return "carried_over";
}
