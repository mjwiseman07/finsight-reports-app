import { describe, expect, it } from "vitest";
import { computeNextFireDate } from "../../lib/recurring/cadence";
import type { RecurringTemplate } from "../../lib/recurring/types";

function mkTemplate(overrides: Partial<RecurringTemplate> = {}): RecurringTemplate {
  return {
    template_id: "11111111-1111-4111-8111-111111111111",
    firm_client_id: "22222222-2222-4222-8222-222222222222",
    name: "Test template",
    description: null,
    template_type: "fixed",
    je_payload_template: {},
    cadence: "monthly",
    custom_days: null,
    day_of_month: null,
    day_of_week: null,
    month_of_year: null,
    timezone: "America/New_York",
    starting_balance: null,
    total_periods: null,
    periods_elapsed: 0,
    start_date: "2026-01-01",
    end_date: null,
    next_fire_date: "2026-01-01",
    last_fired_at: null,
    status: "active",
    auto_post: false,
    origin: "user",
    origin_memory_id: null,
    fire_count: 0,
    post_count: 0,
    skip_count: 0,
    reject_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by_user_id: null,
    ended_by_user_id: null,
    ended_at: null,
    ...overrides,
  };
}

describe("d5 cadence — weekly / biweekly / custom_days", () => {
  it("weekly adds 7 days", () => {
    const t = mkTemplate({ cadence: "weekly", start_date: "2026-01-01" });
    expect(computeNextFireDate(t, "2026-07-03")).toEqual({
      next_fire_date: "2026-07-10",
      is_terminal: false,
    });
  });

  it("biweekly adds 14 days", () => {
    const t = mkTemplate({ cadence: "biweekly", start_date: "2026-01-01" });
    expect(computeNextFireDate(t, "2026-07-03").next_fire_date).toBe("2026-07-17");
  });

  it("custom_days adds the configured interval", () => {
    const t = mkTemplate({ cadence: "custom_days", custom_days: 10, start_date: "2026-01-01" });
    expect(computeNextFireDate(t, "2026-07-03").next_fire_date).toBe("2026-07-13");
  });

  it("custom_days with null interval is terminal", () => {
    const t = mkTemplate({ cadence: "custom_days", custom_days: null, start_date: "2026-01-01" });
    const r = computeNextFireDate(t, "2026-07-03");
    expect(r.is_terminal).toBe(true);
    expect(r.reason).toBe("missing_custom_days");
  });
});

describe("d5 cadence — monthly / quarterly", () => {
  it("monthly advances one month on the anchor day", () => {
    const t = mkTemplate({ cadence: "monthly", day_of_month: 15, start_date: "2026-01-15" });
    expect(computeNextFireDate(t, "2026-01-15").next_fire_date).toBe("2026-02-15");
  });

  it("monthly clamps the anchor day at short months", () => {
    const t = mkTemplate({ cadence: "monthly", day_of_month: 31, start_date: "2026-01-31" });
    expect(computeNextFireDate(t, "2026-01-31").next_fire_date).toBe("2026-02-28");
  });

  it("monthly with no anchor preserves from's day (clamped)", () => {
    const t = mkTemplate({ cadence: "monthly", day_of_month: null, start_date: "2026-01-31" });
    expect(computeNextFireDate(t, "2026-01-31").next_fire_date).toBe("2026-02-28");
  });

  it("quarterly advances three months on the anchor day", () => {
    const t = mkTemplate({ cadence: "quarterly", day_of_month: 15, start_date: "2026-01-15" });
    expect(computeNextFireDate(t, "2026-01-15").next_fire_date).toBe("2026-04-15");
  });
});

describe("d5 cadence — annual", () => {
  it("annual advances one year on month_of_year / day_of_month", () => {
    const t = mkTemplate({
      cadence: "annual",
      month_of_year: 3,
      day_of_month: 15,
      start_date: "2026-03-15",
    });
    expect(computeNextFireDate(t, "2026-03-15").next_fire_date).toBe("2027-03-15");
  });

  it("annual clamps Feb 29 to Feb 28 in a non-leap target year", () => {
    const t = mkTemplate({
      cadence: "annual",
      month_of_year: 2,
      day_of_month: 29,
      start_date: "2024-02-29",
    });
    expect(computeNextFireDate(t, "2024-02-29").next_fire_date).toBe("2025-02-28");
  });
});

describe("d5 cadence — semimonthly (15th + last day)", () => {
  const t = () => mkTemplate({ cadence: "semimonthly", start_date: "2026-01-01" });

  it("before the 15th -> the 15th", () => {
    expect(computeNextFireDate(t(), "2026-07-01").next_fire_date).toBe("2026-07-15");
  });
  it("on the 15th -> last day of month", () => {
    expect(computeNextFireDate(t(), "2026-07-15").next_fire_date).toBe("2026-07-31");
  });
  it("between 15th and last day -> last day", () => {
    expect(computeNextFireDate(t(), "2026-07-20").next_fire_date).toBe("2026-07-31");
  });
  it("on the last day -> 15th of next month", () => {
    expect(computeNextFireDate(t(), "2026-07-31").next_fire_date).toBe("2026-08-15");
  });
  it("February last day is the 28th (non-leap)", () => {
    expect(computeNextFireDate(t(), "2026-02-15").next_fire_date).toBe("2026-02-28");
  });
  it("December last day rolls to Jan 15 next year", () => {
    expect(computeNextFireDate(t(), "2026-12-31").next_fire_date).toBe("2027-01-15");
  });
});

describe("d5 cadence — status guards", () => {
  it.each(["paused", "ended", "archived"] as const)("status=%s is terminal", (status) => {
    const t = mkTemplate({ cadence: "weekly", status, start_date: "2026-01-01" });
    const r = computeNextFireDate(t, "2026-07-03");
    expect(r.is_terminal).toBe(true);
    expect(r.reason).toBe(`status_${status}`);
    expect(r.next_fire_date).toBe("2026-07-03");
  });

  it("status=active is not terminal", () => {
    const t = mkTemplate({ cadence: "weekly", status: "active", start_date: "2026-01-01" });
    expect(computeNextFireDate(t, "2026-07-03").is_terminal).toBe(false);
  });
});

describe("d5 cadence — start-date guard", () => {
  it("anchor before start_date returns start_date, not terminal", () => {
    const t = mkTemplate({ cadence: "weekly", start_date: "2026-06-01" });
    const r = computeNextFireDate(t, "2026-05-01");
    expect(r).toEqual({ next_fire_date: "2026-06-01", is_terminal: false });
  });
});

describe("d5 cadence — end-date guard", () => {
  it("candidate past end_date is terminal", () => {
    const t = mkTemplate({ cadence: "weekly", start_date: "2026-01-01", end_date: "2026-07-05" });
    const r = computeNextFireDate(t, "2026-07-03");
    expect(r.is_terminal).toBe(true);
    expect(r.reason).toBe("past_end_date");
  });

  it("candidate on end_date is allowed", () => {
    const t = mkTemplate({ cadence: "weekly", start_date: "2026-01-01", end_date: "2026-07-10" });
    const r = computeNextFireDate(t, "2026-07-03");
    expect(r.is_terminal).toBe(false);
    expect(r.next_fire_date).toBe("2026-07-10");
  });
});

describe("d5 cadence — now param does not affect determinism", () => {
  it("same result with and without injected now", () => {
    const t = mkTemplate({ cadence: "weekly", start_date: "2026-01-01" });
    const a = computeNextFireDate(t, "2026-07-03");
    const b = computeNextFireDate(t, "2026-07-03", new Date("2030-01-01T00:00:00Z"));
    expect(a).toEqual(b);
  });
});
