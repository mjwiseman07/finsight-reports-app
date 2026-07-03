import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dayOfWeek,
  daysInMonth,
  formatIsoDate,
  isBefore,
  isBeforeOrEqual,
  parseIsoDate,
  wallClockToday,
} from "../../lib/recurring/tz";

describe("d5 tz — parseIsoDate", () => {
  it("parses to UTC midnight", () => {
    const d = parseIsoDate("2026-07-03");
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(6); // 0-based July
    expect(d.getUTCDate()).toBe(3);
    expect(d.getUTCHours()).toBe(0);
  });

  it.each(["2026-7-3", "20260703", "2026/07/03", "not-a-date", "2026-13-01", "2026-02-30"])(
    "rejects invalid input: %s",
    (bad) => {
      expect(() => parseIsoDate(bad)).toThrow();
    },
  );
});

describe("d5 tz — formatIsoDate", () => {
  it("round-trips through parse", () => {
    expect(formatIsoDate(parseIsoDate("2026-01-09"))).toBe("2026-01-09");
    expect(formatIsoDate(parseIsoDate("2024-12-31"))).toBe("2024-12-31");
  });

  it("zero-pads month and day", () => {
    expect(formatIsoDate(new Date(Date.UTC(2026, 0, 5)))).toBe("2026-01-05");
  });
});

describe("d5 tz — daysInMonth", () => {
  it.each([
    [2026, 1, 31],
    [2026, 2, 28],
    [2024, 2, 29], // leap year
    [2000, 2, 29], // divisible by 400
    [1900, 2, 28], // divisible by 100 not 400
    [2026, 4, 30],
    [2026, 12, 31],
  ])("daysInMonth(%i, %i) === %i", (y, m, expected) => {
    expect(daysInMonth(y, m)).toBe(expected);
  });
});

describe("d5 tz — addDays", () => {
  it("adds within a month", () => {
    expect(addDays("2026-07-03", 7)).toBe("2026-07-10");
  });
  it("crosses a month boundary", () => {
    expect(addDays("2026-07-03", 30)).toBe("2026-08-02");
  });
  it("crosses a year boundary", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("subtracts with negative days", () => {
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("d5 tz — addMonths (clamping)", () => {
  it("Jan 31 + 1mo clamps to Feb 28 (non-leap)", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
  });
  it("Jan 31 + 1mo clamps to Feb 29 (leap)", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
  });
  it("crosses a year with clamping", () => {
    expect(addMonths("2026-01-31", 13)).toBe("2027-02-28");
  });
  it("subtracts months with clamping", () => {
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
  });
  it("preserves day when target month is long enough", () => {
    expect(addMonths("2026-01-15", 1)).toBe("2026-02-15");
  });
});

describe("d5 tz — dayOfWeek", () => {
  it("Friday July 3 2026 === 5", () => {
    expect(dayOfWeek("2026-07-03")).toBe(5);
  });
  it("Sunday === 0", () => {
    expect(dayOfWeek("2026-07-05")).toBe(0);
  });
});

describe("d5 tz — isBefore / isBeforeOrEqual", () => {
  it("isBefore is strict", () => {
    expect(isBefore("2026-01-01", "2026-01-02")).toBe(true);
    expect(isBefore("2026-01-02", "2026-01-01")).toBe(false);
    expect(isBefore("2026-01-01", "2026-01-01")).toBe(false);
  });
  it("isBeforeOrEqual includes equality", () => {
    expect(isBeforeOrEqual("2026-01-01", "2026-01-01")).toBe(true);
    expect(isBeforeOrEqual("2026-01-01", "2026-01-02")).toBe(true);
    expect(isBeforeOrEqual("2026-01-02", "2026-01-01")).toBe(false);
  });
});

describe("d5 tz — wallClockToday (timezone awareness)", () => {
  it("00:30 EDT Jul 3 (UTC 04:30 Jul 3) resolves to 2026-07-03", () => {
    const now = new Date("2026-07-03T04:30:00Z");
    expect(wallClockToday("America/New_York", now)).toBe("2026-07-03");
  });

  it("23:30 EDT Jul 2 (UTC 03:30 Jul 3) resolves to 2026-07-02 in NY", () => {
    const now = new Date("2026-07-03T03:30:00Z");
    expect(wallClockToday("America/New_York", now)).toBe("2026-07-02");
  });

  it("same instant differs across timezones", () => {
    const now = new Date("2026-07-03T03:30:00Z");
    expect(wallClockToday("America/New_York", now)).toBe("2026-07-02");
    expect(wallClockToday("Asia/Tokyo", now)).toBe("2026-07-03"); // UTC+9 -> 12:30 Jul 3
    expect(wallClockToday("UTC", now)).toBe("2026-07-03");
  });
});
