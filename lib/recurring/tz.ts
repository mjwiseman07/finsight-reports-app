// D5.1 — timezone-aware, pure date arithmetic on ISO 'YYYY-MM-DD' strings.
//
// Design: all dates are represented as ISO calendar-date strings and, when a
// Date object is needed internally, it is anchored to UTC midnight. This keeps
// every helper independent of the host machine's local timezone. The ONLY
// function that touches real wall-clock time is wallClockToday(), which uses
// Intl.DateTimeFormat (Node 20+) to resolve "today" in a named IANA timezone.
//
// No DB, no HTTP, no process.env, no side effects.

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse an ISO 'YYYY-MM-DD' string into a Date anchored at UTC midnight. */
export function parseIsoDate(iso: string): Date {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) {
    throw new Error(`parseIsoDate: invalid ISO date '${iso}' (expected YYYY-MM-DD)`);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) {
    throw new Error(`parseIsoDate: month out of range in '${iso}'`);
  }
  const dim = daysInMonth(year, month);
  if (day < 1 || day > dim) {
    throw new Error(`parseIsoDate: day out of range in '${iso}'`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

/** Format a Date's UTC calendar components as ISO 'YYYY-MM-DD'. */
export function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
}

/** Number of days in a given month. `month` is 1-based (1 = January). */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month == last day of `month`.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Add (or subtract) whole days to an ISO date, returning a new ISO date. */
export function addDays(iso: string, days: number): string {
  const base = parseIsoDate(iso);
  const shifted = new Date(base.getTime() + days * 86_400_000);
  return formatIsoDate(shifted);
}

/** Add (or subtract) whole months to an ISO date, clamping the day of month to
 *  the target month's length. Jan 31 + 1 month -> Feb 28 (Feb 29 in leap
 *  years). This is the single source of month-clamping truth. */
export function addMonths(iso: string, months: number): string {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) {
    throw new Error(`addMonths: invalid ISO date '${iso}'`);
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  const totalMonths = (month - 1) + months;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth0 = ((totalMonths % 12) + 12) % 12;
  const targetMonth = targetMonth0 + 1;

  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${pad4(targetYear)}-${pad2(targetMonth)}-${pad2(clampedDay)}`;
}

/** Day of week for an ISO date. 0 = Sunday .. 6 = Saturday. */
export function dayOfWeek(iso: string): number {
  return parseIsoDate(iso).getUTCDay();
}

/** True if ISO date `a` is strictly before ISO date `b`. */
export function isBefore(a: string, b: string): boolean {
  return parseIsoDate(a).getTime() < parseIsoDate(b).getTime();
}

/** True if ISO date `a` is before or equal to ISO date `b`. */
export function isBeforeOrEqual(a: string, b: string): boolean {
  return parseIsoDate(a).getTime() <= parseIsoDate(b).getTime();
}

/** Resolve "today" as a wall-clock ISO date in the given IANA timezone.
 *  This is the only function in the module that reads real time — and even
 *  then, `now` is injected by the caller so the function stays deterministic
 *  under test. Example: 00:30 EDT on Jul 3 (UTC 04:30 Jul 3) -> '2026-07-03'. */
export function wallClockToday(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  let year = "";
  let month = "";
  let day = "";
  for (const part of parts) {
    if (part.type === "year") year = part.value;
    else if (part.type === "month") month = part.value;
    else if (part.type === "day") day = part.value;
  }
  return `${year}-${month}-${day}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function pad4(n: number): string {
  return String(n).padStart(4, "0");
}
