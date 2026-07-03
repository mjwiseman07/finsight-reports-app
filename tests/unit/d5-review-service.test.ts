import { describe, expect, it } from "vitest";
import { enrichFiresForReview } from "../../lib/recurring/review-service";
import type { AutoPostClientContext } from "../../lib/recurring/auto-post-gate";
import type {
  RecurringFire,
  RecurringScheduleLine,
  RecurringTemplate,
} from "../../lib/recurring/types";

function makeTemplate(overrides: Partial<RecurringTemplate> = {}): RecurringTemplate {
  return {
    template_id: "t-1",
    firm_client_id: "c-1",
    name: "Rent",
    description: null,
    template_type: "fixed",
    je_payload_template: {
      Line: [
        { Amount: 100, JournalEntryLineDetail: { PostingType: "Debit" } },
        { Amount: 100, JournalEntryLineDetail: { PostingType: "Credit" } },
      ],
    },
    cadence: "monthly",
    custom_days: null,
    day_of_month: 15,
    day_of_week: null,
    month_of_year: null,
    timezone: "America/New_York",
    starting_balance: null,
    total_periods: null,
    periods_elapsed: 0,
    start_date: "2026-01-01",
    end_date: null,
    next_fire_date: "2026-01-15",
    last_fired_at: null,
    status: "active",
    auto_post: true,
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

function makeFire(overrides: Partial<RecurringFire> = {}): RecurringFire {
  return {
    fire_id: "f-1",
    template_id: "t-1",
    firm_client_id: "c-1",
    fire_date: "2026-01-15",
    fired_at: "2026-01-15T00:00:00Z",
    period_index: 1,
    status: "proposed",
    je_attempt_id: null,
    qbo_je_id: null,
    proposal_id: null,
    reviewer_user_id: null,
    reviewed_at: null,
    amount_override: null,
    skip_reason: null,
    reject_reason: null,
    error_detail: null,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
    ...overrides,
  };
}

function makeClient(overrides: Partial<AutoPostClientContext> = {}): AutoPostClientContext {
  return {
    firm_client_id: "c-1",
    recurring_auto_post_enabled: true,
    accounting_method: "accrual",
    ...overrides,
  };
}

function tplMap(...templates: RecurringTemplate[]): Map<string, RecurringTemplate> {
  return new Map(templates.map((t) => [t.template_id, t]));
}

function lineMap(
  entries: Record<string, RecurringScheduleLine[]> = {},
): Map<string, RecurringScheduleLine[]> {
  return new Map(Object.entries(entries));
}

describe("enrichFiresForReview", () => {
  it("1. fixed template → one row with payload debit-side amount", () => {
    const t = makeTemplate();
    const rows = enrichFiresForReview([makeFire()], tplMap(t), lineMap(), makeClient());
    expect(rows).toHaveLength(1);
    expect(rows[0].template_name).toBe("Rent");
    expect(rows[0].cadence).toBe("monthly");
    expect(rows[0].amount).toBe(100);
    expect(rows[0].fire_id).toBe("f-1");
    expect(rows[0].template_id).toBe("t-1");
  });

  it("2. fire with missing template is skipped entirely", () => {
    const rows = enrichFiresForReview(
      [makeFire({ fire_id: "orphan", template_id: "does-not-exist" })],
      tplMap(makeTemplate()),
      lineMap(),
      makeClient(),
    );
    expect(rows).toHaveLength(0);
  });

  it("3. preserves input order (no internal sort)", () => {
    const t = makeTemplate();
    const fires = [
      makeFire({ fire_id: "b", period_index: 2, fire_date: "2026-02-15" }),
      makeFire({ fire_id: "a", period_index: 1, fire_date: "2026-01-15" }),
      makeFire({ fire_id: "c", period_index: 3, fire_date: "2026-03-15" }),
    ];
    const rows = enrichFiresForReview(fires, tplMap(t), lineMap(), makeClient());
    expect(rows.map((r) => r.fire_id)).toEqual(["b", "a", "c"]);
  });

  it("4. straight_line total_periods=12 balance=1200 period 1 → 100", () => {
    const t = makeTemplate({
      template_id: "sl",
      template_type: "straight_line",
      starting_balance: 1200,
      total_periods: 12,
    });
    const rows = enrichFiresForReview(
      [makeFire({ template_id: "sl", period_index: 1 })],
      tplMap(t),
      lineMap(),
      makeClient(),
    );
    expect(rows[0].amount).toBe(100);
  });

  it("5. schedule line period_index=3 amount=321 → 321", () => {
    const t = makeTemplate({ template_id: "sch", template_type: "schedule" });
    const line: RecurringScheduleLine = {
      schedule_line_id: "sl-3",
      template_id: "sch",
      period_index: 3,
      amount: 321,
      memo_override: null,
    };
    const rows = enrichFiresForReview(
      [makeFire({ template_id: "sch", period_index: 3 })],
      tplMap(t),
      lineMap({ sch: [line] }),
      makeClient(),
    );
    expect(rows[0].amount).toBe(321);
  });

  it("6. gate decision is re-derived per read (dispatch vs hold)", () => {
    const t = makeTemplate();
    const dispatch = enrichFiresForReview([makeFire()], tplMap(t), lineMap(), makeClient());
    expect(dispatch[0].gate_decision).toEqual({ action: "dispatch" });

    const hold = enrichFiresForReview(
      [makeFire()],
      tplMap(t),
      lineMap(),
      makeClient({ accounting_method: "cash" }),
    );
    expect(hold[0].gate_decision).toEqual({ action: "hold", reason: "cash_basis_client" });
  });

  it("7. amount_override is metadata, never truth", () => {
    const t = makeTemplate(); // fixed, balanced payload totaling 100
    const rows = enrichFiresForReview(
      [makeFire({ amount_override: 7777 })],
      tplMap(t),
      lineMap(),
      makeClient(),
    );
    expect(rows[0].amount).toBe(100);
    expect(rows[0].amount_override).toBe(7777);
  });

  it("8. straight_line residual pennies land in the final period", () => {
    const t = makeTemplate({
      template_id: "sl2",
      template_type: "straight_line",
      starting_balance: 100,
      total_periods: 3,
    });
    const p1 = enrichFiresForReview(
      [makeFire({ template_id: "sl2", period_index: 1 })],
      tplMap(t),
      lineMap(),
      makeClient(),
    );
    const p3 = enrichFiresForReview(
      [makeFire({ template_id: "sl2", period_index: 3 })],
      tplMap(t),
      lineMap(),
      makeClient(),
    );
    expect(p1[0].amount).toBe(33.33);
    expect(p3[0].amount).toBe(33.34);
  });
});
