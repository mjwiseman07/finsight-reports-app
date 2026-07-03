import { describe, expect, it } from "vitest";
import { evaluateAutoPostGate } from "../../lib/recurring/auto-post-gate";
import type { AutoPostClientContext } from "../../lib/recurring/auto-post-gate";
import type { RecurringFire, RecurringTemplate } from "../../lib/recurring/types";

function makeTemplate(overrides: Partial<RecurringTemplate> = {}): RecurringTemplate {
  return {
    template_id: "t-1",
    firm_client_id: "c-1",
    name: "Rent",
    description: null,
    template_type: "fixed",
    je_payload_template: {},
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

describe("evaluateAutoPostGate", () => {
  it("1. all conditions met → dispatch", () => {
    const d = evaluateAutoPostGate(makeTemplate(), makeClient(), makeFire());
    expect(d.action).toBe("dispatch");
  });

  it("2. fire status posted → hold fire_not_proposed", () => {
    const d = evaluateAutoPostGate(makeTemplate(), makeClient(), makeFire({ status: "posted" }));
    expect(d).toEqual({ action: "hold", reason: "fire_not_proposed" });
  });

  it("3. fire status failed → hold fire_not_proposed", () => {
    const d = evaluateAutoPostGate(makeTemplate(), makeClient(), makeFire({ status: "failed" }));
    expect(d).toEqual({ action: "hold", reason: "fire_not_proposed" });
  });

  it("4. fire status skipped → hold fire_not_proposed", () => {
    const d = evaluateAutoPostGate(makeTemplate(), makeClient(), makeFire({ status: "skipped" }));
    expect(d).toEqual({ action: "hold", reason: "fire_not_proposed" });
  });

  it("5. template paused → hold template_not_active", () => {
    const d = evaluateAutoPostGate(makeTemplate({ status: "paused" }), makeClient(), makeFire());
    expect(d).toEqual({ action: "hold", reason: "template_not_active" });
  });

  it("6. template ended → hold template_not_active", () => {
    const d = evaluateAutoPostGate(makeTemplate({ status: "ended" }), makeClient(), makeFire());
    expect(d).toEqual({ action: "hold", reason: "template_not_active" });
  });

  it("7. template archived → hold template_not_active", () => {
    const d = evaluateAutoPostGate(makeTemplate({ status: "archived" }), makeClient(), makeFire());
    expect(d).toEqual({ action: "hold", reason: "template_not_active" });
  });

  it("8. cash-basis client → hold cash_basis_client", () => {
    const d = evaluateAutoPostGate(makeTemplate(), makeClient({ accounting_method: "cash" }), makeFire());
    expect(d).toEqual({ action: "hold", reason: "cash_basis_client" });
  });

  it("9. client auto-post disabled → hold client_auto_post_disabled", () => {
    const d = evaluateAutoPostGate(
      makeTemplate(),
      makeClient({ recurring_auto_post_enabled: false }),
      makeFire(),
    );
    expect(d).toEqual({ action: "hold", reason: "client_auto_post_disabled" });
  });

  it("10. template auto_post off → hold template_auto_post_off", () => {
    const d = evaluateAutoPostGate(makeTemplate({ auto_post: false }), makeClient(), makeFire());
    expect(d).toEqual({ action: "hold", reason: "template_auto_post_off" });
  });

  it("11. modified_cash is NOT cash → proceeds past cash gate to dispatch", () => {
    const d = evaluateAutoPostGate(makeTemplate(), makeClient({ accounting_method: "modified_cash" }), makeFire());
    expect(d.action).toBe("dispatch");
  });

  it("12. order: fire status beats template status", () => {
    const d = evaluateAutoPostGate(
      makeTemplate({ status: "paused" }),
      makeClient(),
      makeFire({ status: "posted" }),
    );
    expect(d).toEqual({ action: "hold", reason: "fire_not_proposed" });
  });

  it("13. order: template status beats cash-basis", () => {
    const d = evaluateAutoPostGate(
      makeTemplate({ status: "ended" }),
      makeClient({ accounting_method: "cash" }),
      makeFire(),
    );
    expect(d).toEqual({ action: "hold", reason: "template_not_active" });
  });

  it("14. order: cash-basis beats client kill switch", () => {
    const d = evaluateAutoPostGate(
      makeTemplate(),
      makeClient({ accounting_method: "cash", recurring_auto_post_enabled: false }),
      makeFire(),
    );
    expect(d).toEqual({ action: "hold", reason: "cash_basis_client" });
  });

  it("15. order: client kill switch beats template flag", () => {
    const d = evaluateAutoPostGate(
      makeTemplate({ auto_post: false }),
      makeClient({ recurring_auto_post_enabled: false }),
      makeFire(),
    );
    expect(d).toEqual({ action: "hold", reason: "client_auto_post_disabled" });
  });
});
