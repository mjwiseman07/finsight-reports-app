import { describe, expect, it } from "vitest";
import { composeJEPayloadForFire } from "../../lib/recurring/je-composer";
import type { ComposeInput } from "../../lib/recurring/je-composer";
import type {
  JePayloadTemplate,
  RecurringScheduleLine,
  RecurringTemplate,
} from "../../lib/recurring/types";

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

/** Two-line balanced QBO-native payload: DR account 60 / CR account 35. */
function twoLinePayload(drAmount: number, crAmount: number): JePayloadTemplate {
  return {
    Line: [
      {
        Amount: drAmount,
        Description: "rent expense",
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { value: "60", name: "Rent Expense" },
        },
      },
      {
        Amount: crAmount,
        DetailType: "JournalEntryLineDetail",
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { value: "35", name: "Checking" },
        },
      },
    ],
  };
}

function baseInput(template: RecurringTemplate, over: Partial<ComposeInput> = {}): ComposeInput {
  return { template, period_index: 1, fire_date: "2026-07-15", ...over };
}

describe("d5 je-composer — fixed", () => {
  it("copies through template amounts and translates to D2 lines", () => {
    const t = mkTemplate({ template_type: "fixed", je_payload_template: twoLinePayload(500, 500) });
    const r = composeJEPayloadForFire(baseInput(t));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.transaction_date).toBe("2026-07-15");
    expect(r.payload.lines).toHaveLength(2);
    expect(r.payload.lines[0]).toMatchObject({ account_id: "60", amount: 500, posting_type: "Debit" });
    expect(r.payload.lines[1]).toMatchObject({ account_id: "35", amount: 500, posting_type: "Credit" });
  });

  it("emits the natural idempotency key recurring_<template>_<period>", () => {
    const t = mkTemplate({ template_type: "fixed", je_payload_template: twoLinePayload(100, 100) });
    const r = composeJEPayloadForFire(baseInput(t, { period_index: 7 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.idempotency_key).toBe(`recurring_${t.template_id}_7`);
  });

  it("carries description, class, department, customer through", () => {
    const payload: JePayloadTemplate = {
      Line: [
        {
          Amount: 200,
          Description: "svc",
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: {
            PostingType: "Debit",
            AccountRef: { value: "60" },
            ClassRef: { value: "C1" },
            DepartmentRef: { value: "D1" },
            Entity: { Type: "Customer", EntityRef: { value: "CUST9" } },
          },
        },
        {
          Amount: 200,
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: "35" } },
        },
      ],
    };
    const t = mkTemplate({ template_type: "fixed", je_payload_template: payload });
    const r = composeJEPayloadForFire(baseInput(t));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.lines[0]).toMatchObject({
      description: "svc",
      class_id: "C1",
      department_id: "D1",
      customer_id: "CUST9",
    });
  });

  it("rejects unbalanced fixed template", () => {
    const t = mkTemplate({ template_type: "fixed", je_payload_template: twoLinePayload(500, 400) });
    const r = composeJEPayloadForFire(baseInput(t));
    expect(r).toEqual({ ok: false, reason: "unbalanced_template" });
  });
});

describe("d5 je-composer — validation rejects", () => {
  it("template_missing_lines when no Line[]", () => {
    const t = mkTemplate({ template_type: "fixed", je_payload_template: {} });
    expect(composeJEPayloadForFire(baseInput(t))).toEqual({ ok: false, reason: "template_missing_lines" });
  });

  it("template_missing_lines when Line[] empty", () => {
    const t = mkTemplate({ template_type: "fixed", je_payload_template: { Line: [] } });
    expect(composeJEPayloadForFire(baseInput(t))).toEqual({ ok: false, reason: "template_missing_lines" });
  });

  it("line_missing_account_id when AccountRef.value absent", () => {
    const payload: JePayloadTemplate = {
      Line: [
        {
          Amount: 100,
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: { PostingType: "Debit", AccountRef: {} },
        },
      ],
    };
    const t = mkTemplate({ template_type: "fixed", je_payload_template: payload });
    expect(composeJEPayloadForFire(baseInput(t))).toEqual({ ok: false, reason: "line_missing_account_id" });
  });

  it("line_missing_posting_type when PostingType absent/invalid", () => {
    const payload: JePayloadTemplate = {
      Line: [
        {
          Amount: 100,
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: { AccountRef: { value: "60" } },
        },
      ],
    };
    const t = mkTemplate({ template_type: "fixed", je_payload_template: payload });
    expect(composeJEPayloadForFire(baseInput(t))).toEqual({ ok: false, reason: "line_missing_posting_type" });
  });
});

describe("d5 je-composer — straight_line distribution", () => {
  it("re-derives period amount from engine (ignores payload amounts)", () => {
    // Payload declares 999/999 but engine derives 1000/12 = 83.33 for period 1.
    const t = mkTemplate({
      template_type: "straight_line",
      starting_balance: 1000,
      total_periods: 12,
      je_payload_template: twoLinePayload(999, 999),
    });
    const r = composeJEPayloadForFire(baseInput(t, { period_index: 1 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.lines[0].amount).toBe(83.33);
    expect(r.payload.lines[1].amount).toBe(83.33);
  });

  it("final period carries the straight-line residual and stays balanced", () => {
    const t = mkTemplate({
      template_type: "straight_line",
      starting_balance: 1000,
      total_periods: 12,
      je_payload_template: twoLinePayload(100, 100),
    });
    const r = composeJEPayloadForFire(baseInput(t, { period_index: 12 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.lines[0].amount).toBe(83.37);
    expect(r.payload.lines[1].amount).toBe(83.37);
  });

  it("distributes across a multi-line side with residual to largest line", () => {
    // DR split 75/25 across two lines, single CR line. Derive 100.01 for a
    // penny-residual case (100.01 * .75 = 75.0075 -> 75.01, .25 -> 25.00,
    // residual .00 -> stays; both sides sum to 100.01).
    const payload: JePayloadTemplate = {
      Line: [
        {
          Amount: 75,
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: "60" } },
        },
        {
          Amount: 25,
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: "61" } },
        },
        {
          Amount: 100,
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: "35" } },
        },
      ],
    };
    const t = mkTemplate({
      template_type: "straight_line",
      starting_balance: 300.03,
      total_periods: 3,
      je_payload_template: payload,
    });
    const r = composeJEPayloadForFire(baseInput(t, { period_index: 1 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const dr = r.payload.lines.filter((l) => l.posting_type === "Debit").reduce((s, l) => s + l.amount, 0);
    const cr = r.payload.lines.filter((l) => l.posting_type === "Credit").reduce((s, l) => s + l.amount, 0);
    expect(Math.round(dr * 100)).toBe(Math.round(cr * 100)); // balanced
    expect(Math.round(cr * 100)).toBe(10001); // 300.03 / 3 = 100.01
  });

  it("amount_not_derivable when straight-line config missing", () => {
    const t = mkTemplate({
      template_type: "straight_line",
      starting_balance: null,
      total_periods: null,
      je_payload_template: twoLinePayload(100, 100),
    });
    expect(composeJEPayloadForFire(baseInput(t))).toEqual({ ok: false, reason: "amount_not_derivable" });
  });

  it("amount_distribution_failed when a side has zero proportion basis", () => {
    // CR line has Amount 0 → basis 0 on the credit side.
    const payload: JePayloadTemplate = {
      Line: [
        {
          Amount: 100,
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: "60" } },
        },
        {
          Amount: 0,
          DetailType: "JournalEntryLineDetail",
          JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: "35" } },
        },
      ],
    };
    const t = mkTemplate({
      template_type: "straight_line",
      starting_balance: 1200,
      total_periods: 12,
      je_payload_template: payload,
    });
    expect(composeJEPayloadForFire(baseInput(t))).toEqual({ ok: false, reason: "amount_distribution_failed" });
  });
});

describe("d5 je-composer — schedule", () => {
  const lines: RecurringScheduleLine[] = [
    { schedule_line_id: "a", template_id: "t", period_index: 1, amount: 500.25, memo_override: null },
    { schedule_line_id: "b", template_id: "t", period_index: 2, amount: 250.0, memo_override: null },
  ];

  it("uses the schedule-line amount for the period, balanced", () => {
    const t = mkTemplate({ template_type: "schedule", je_payload_template: twoLinePayload(1, 1) });
    const r = composeJEPayloadForFire(baseInput(t, { period_index: 1, schedule_lines: lines }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.lines[0].amount).toBe(500.25);
    expect(r.payload.lines[1].amount).toBe(500.25);
  });

  it("schedule_line_not_found for a period with no line", () => {
    const t = mkTemplate({ template_type: "schedule", je_payload_template: twoLinePayload(1, 1) });
    const r = composeJEPayloadForFire(baseInput(t, { period_index: 9, schedule_lines: lines }));
    expect(r).toEqual({ ok: false, reason: "schedule_line_not_found" });
  });

  it("schedule_line_not_found when no schedule lines supplied", () => {
    const t = mkTemplate({ template_type: "schedule", je_payload_template: twoLinePayload(1, 1) });
    const r = composeJEPayloadForFire(baseInput(t, { period_index: 1 }));
    expect(r).toEqual({ ok: false, reason: "schedule_line_not_found" });
  });
});

describe("d5 je-composer — purity", () => {
  it("does not mutate the input template payload", () => {
    const payload = twoLinePayload(500, 500);
    const snapshot = JSON.stringify(payload);
    const t = mkTemplate({ template_type: "fixed", je_payload_template: payload });
    composeJEPayloadForFire(baseInput(t));
    expect(JSON.stringify(payload)).toBe(snapshot);
  });
});
