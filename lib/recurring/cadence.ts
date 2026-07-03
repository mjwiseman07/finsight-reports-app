// D5.1 — cadence engine. Pure function that, given a template and an anchor
// date `from`, computes the next scheduled fire date. No DB, no side effects.
//
// Semantics (assumption, flagged for review): `from` is the previous fire date
// (or the template's next_fire_date). The next fire is computed by advancing
// one cadence interval from `from`, re-anchored to the configured day where a
// day anchor applies. All month arithmetic clamps the day of month via
// addMonths / the local clampToMonth helper (Jan 31 + 1mo -> Feb 28/29).

import type { Cadence, NextFireResult, RecurringTemplate } from "./types";
import { addDays, addMonths, daysInMonth, isBefore, parseIsoDate } from "./tz";

/**
 * Compute the next fire date strictly after `from` for a recurring template.
 *
 * @param template the recurring template (status, cadence, anchors, bounds)
 * @param from     the anchor ISO date ('YYYY-MM-DD'), typically the prior fire
 * @param now      optional injected "now"; accepted for signature parity with
 *                 the wider recurring engine and future backfill guards. The
 *                 cadence math itself is fully determined by `from`, so `now`
 *                 is intentionally not consulted here (keeps this pure and
 *                 deterministic). Flagged assumption — see file header.
 */
export function computeNextFireDate(
  template: RecurringTemplate,
  from: string,
  now?: Date,
): NextFireResult {
  void now; // deliberately unused; see @param now above.

  // 1. Status guard — only active templates schedule further fires.
  if (template.status !== "active") {
    return { next_fire_date: from, is_terminal: true, reason: `status_${template.status}` };
  }

  // 2. Start-date guard — the first fire lands on start_date. If the anchor is
  //    before start_date, the next fire is start_date itself.
  if (isBefore(from, template.start_date)) {
    return finalize(template, template.start_date);
  }

  // 3. Advance one cadence interval from `from`.
  const candidate = advance(template, from);
  if (candidate.is_terminal) {
    return candidate;
  }

  // 4. End-date guard.
  return finalize(template, candidate.next_fire_date);
}

/** Apply the end-date bound to a computed candidate. */
function finalize(template: RecurringTemplate, candidate: string): NextFireResult {
  if (template.end_date !== null && isBefore(template.end_date, candidate)) {
    return { next_fire_date: candidate, is_terminal: true, reason: "past_end_date" };
  }
  return { next_fire_date: candidate, is_terminal: false };
}

/** Advance exactly one cadence interval from `from`, with an exhaustive guard. */
function advance(template: RecurringTemplate, from: string): NextFireResult {
  const cadence: Cadence = template.cadence;
  switch (cadence) {
    case "weekly":
      return { next_fire_date: addDays(from, 7), is_terminal: false };

    case "biweekly":
      return { next_fire_date: addDays(from, 14), is_terminal: false };

    case "custom_days": {
      if (template.custom_days === null || template.custom_days <= 0) {
        return { next_fire_date: from, is_terminal: true, reason: "missing_custom_days" };
      }
      return { next_fire_date: addDays(from, template.custom_days), is_terminal: false };
    }

    case "monthly":
      return { next_fire_date: monthlyAnchor(from, 1, template.day_of_month), is_terminal: false };

    case "quarterly":
      return { next_fire_date: monthlyAnchor(from, 3, template.day_of_month), is_terminal: false };

    case "annual":
      return { next_fire_date: nextAnnual(from, template.month_of_year, template.day_of_month), is_terminal: false };

    case "semimonthly":
      return { next_fire_date: nextSemimonthly(from), is_terminal: false };

    default: {
      const _exhaustive: never = cadence;
      throw new Error(`computeNextFireDate: unhandled cadence '${String(_exhaustive)}'`);
    }
  }
}

/** Build an ISO date at (year, month, day) with the day clamped to the month's
 *  length. month is 1-based. */
function clampToMonth(year: number, month: number, day: number): string {
  const clamped = Math.min(day, daysInMonth(year, month));
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(clamped).padStart(2, "0")}`;
}

/** Add `monthsToAdd` months to `from`, landing on `anchorDay` (or from's own
 *  day when no anchor is configured), clamped to the target month length. */
function monthlyAnchor(from: string, monthsToAdd: number, anchorDay: number | null): string {
  if (anchorDay === null) {
    // No anchor: preserve from's day and let addMonths handle clamping.
    return addMonths(from, monthsToAdd);
  }
  const d = parseIsoDate(from);
  const totalMonths = d.getUTCMonth() + monthsToAdd; // 0-based month + offset
  const targetYear = d.getUTCFullYear() + Math.floor(totalMonths / 12);
  const targetMonth = (((totalMonths % 12) + 12) % 12) + 1; // back to 1-based
  return clampToMonth(targetYear, targetMonth, anchorDay);
}

/** Next annual occurrence: exactly one year after `from`, re-anchored to the
 *  configured month_of_year / day_of_month when present, clamped. */
function nextAnnual(from: string, monthOfYear: number | null, anchorDay: number | null): string {
  const d = parseIsoDate(from);
  const targetYear = d.getUTCFullYear() + 1;
  const targetMonth = monthOfYear ?? d.getUTCMonth() + 1;
  const day = anchorDay ?? d.getUTCDate();
  return clampToMonth(targetYear, targetMonth, day);
}

/** Semimonthly = 15th + last day of month (payroll/rent convention). Returns
 *  the next such date strictly after `from`. */
function nextSemimonthly(from: string): string {
  const d = parseIsoDate(from);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1; // 1-based
  const day = d.getUTCDate();
  const lastDay = daysInMonth(year, month);

  if (day < 15) {
    return clampToMonth(year, month, 15);
  }
  if (day < lastDay) {
    return clampToMonth(year, month, lastDay);
  }
  // On (or past) the last day -> roll to the 15th of next month.
  const totalMonths = month; // (month-1) + 1, 0-based next month
  const nextYear = year + Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  return clampToMonth(nextYear, nextMonth, 15);
}
