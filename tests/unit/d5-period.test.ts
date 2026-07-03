import { describe, expect, it } from "vitest";
import { computePeriodAmount } from "../../lib/recurring/period";
import type { RecurringScheduleLine, RecurringTemplate } from "../../lib/recurring/types";

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

describe("d5 period — fixed", () => {
  it("returns NaN with amount_from_payload, not terminal", () => {
    const t = mkTemplate({ template_type: "fixed" });
    const r = computePeriodAmount(t, 1);
    expect(Number.isNaN(r.amount)).toBe(true);
    expect(r.is_terminal).toBe(false);
    expect(r.reason).toBe("amount_from_payload");
  });
});

describe("d5 period — straight_line", () => {
  it("splits evenly with residual pennies in the final period", () => {
    const t = mkTemplate({ template_type: "straight_line", starting_balance: 1000, total_periods: 12 });
    expect(computePeriodAmount(t, 1).amount).toBe(83.33);
    expect(computePeriodAmount(t, 11).amount).toBe(83.33);
    expect(computePeriodAmount(t, 12).amount).toBe(83.37); // 83.33 + 0.04 residual
  });

  it("is not terminal for the final period", () => {
    const t = mkTemplate({ template_type: "straight_line", starting_balance: 1000, total_periods: 12 });
    expect(computePeriodAmount(t, 12).is_terminal).toBe(false);
  });

  it("is terminal past total_periods", () => {
    const t = mkTemplate({ template_type: "straight_line", starting_balance: 1000, total_periods: 12 });
    const r = computePeriodAmount(t, 13);
    expect(r.is_terminal).toBe(true);
    expect(r.reason).toBe("past_total_periods");
  });

  it("is terminal when config is missing", () => {
    const t = mkTemplate({ template_type: "straight_line", starting_balance: 1000, total_periods: null });
    const r = computePeriodAmount(t, 1);
    expect(r.is_terminal).toBe(true);
    expect(r.reason).toBe("missing_straight_line_config");
  });
});

describe("d5 period — schedule", () => {
  const lines: RecurringScheduleLine[] = [
    { schedule_line_id: "a", template_id: "t", period_index: 1, amount: 100.0, memo_override: null },
    { schedule_line_id: "b", template_id: "t", period_index: 2, amount: 250.5, memo_override: "adj" },
  ];

  it("returns the per-period amount from schedule lines", () => {
    const t = mkTemplate({ template_type: "schedule" });
    expect(computePeriodAmount(t, 1, lines).amount).toBe(100.0);
    expect(computePeriodAmount(t, 2, lines).amount).toBe(250.5);
  });

  it("is terminal when no line matches the period", () => {
    const t = mkTemplate({ template_type: "schedule" });
    const r = computePeriodAmount(t, 3, lines);
    expect(r.is_terminal).toBe(true);
    expect(r.reason).toBe("no_schedule_line_for_period");
  });

  it("is terminal when no schedule lines are supplied", () => {
    const t = mkTemplate({ template_type: "schedule" });
    const r = computePeriodAmount(t, 1);
    expect(r.is_terminal).toBe(true);
    expect(r.reason).toBe("no_schedule_lines_provided");
  });
});

describe("d5 period — invalid period index", () => {
  it.each([0, -1, 1.5])("rejects period_index=%s", (idx) => {
    const t = mkTemplate({ template_type: "straight_line", starting_balance: 100, total_periods: 4 });
    const r = computePeriodAmount(t, idx);
    expect(r.is_terminal).toBe(true);
    expect(r.reason).toBe("invalid_period_index");
  });
});

describe("d5 period — straight-line penny reconciliation (property)", () => {
  const cases: Array<{ balance: number; periods: number }> = [
    { balance: 1000, periods: 12 },
    { balance: 100, periods: 3 },
    { balance: 0.1, periods: 3 },
    { balance: 999999.99, periods: 7 },
    { balance: 50, periods: 1 },
    { balance: 1234.56, periods: 13 },
    { balance: 0.01, periods: 5 },
    { balance: 250.75, periods: 24 },
  ];

  it.each(cases)(
    "sum of periods === starting_balance for $balance / $periods",
    ({ balance, periods }) => {
      const t = mkTemplate({
        template_type: "straight_line",
        starting_balance: balance,
        total_periods: periods,
      });
      let totalCents = 0;
      for (let i = 1; i <= periods; i++) {
        const r = computePeriodAmount(t, i);
        expect(r.is_terminal).toBe(false);
        totalCents += Math.round(r.amount * 100);
      }
      expect(totalCents).toBe(Math.round(balance * 100));
    },
  );
});
