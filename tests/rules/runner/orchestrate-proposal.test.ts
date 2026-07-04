/**
 * D6.4c-2 — Orchestration wiring tests.
 *
 * Verifies WHICH branch executeRules takes under which composer outcome. The
 * composer's internals are covered by tests/pre-close/compose-proposal.test.ts;
 * here composeProposal/insertReviewItem/publishEvent are mocked at the module
 * boundary so we assert the runner's branching + counters + audit events.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import { RULE_REGISTRY } from "@/lib/rules/logic";
import { makeSupabaseMock, type MockClientRow } from "./_mock-supabase";

vi.mock("@/lib/rules/runner/resolve-qbo", () => ({
  resolveQBOForClient: vi.fn().mockResolvedValue({
    handle: { accessToken: "t", realmId: "r" },
    healthy: true,
    reason: "ok",
  }),
}));

const composeMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());
const publishMock = vi.hoisted(() => vi.fn());
const balancedDraft = vi.hoisted(() => ({
  narration: "reverse",
  transactionDate: "2026-07-06",
  lines: [
    { lineIndex: 0, accountId: "6000", accountName: "Rent", drAmountCents: 10000, crAmountCents: 0, memo: "" },
    { lineIndex: 1, accountId: "1000", accountName: "Cash", drAmountCents: 0, crAmountCents: 10000, memo: "" },
  ],
}));

vi.mock("@/lib/pre-close/compose-proposal", () => ({
  composeProposal: composeMock,
  ComposeProposalError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "ComposeProposalError";
    }
  },
}));
vi.mock("@/lib/pre-close/insert-review-item", () => ({
  insertReviewItem: insertMock,
  InsertReviewItemError: class extends Error {
    constructor(message: string) {
      super(message);
      this.name = "InsertReviewItemError";
    }
  },
}));
vi.mock("@/lib/events/publisher", () => ({
  publishEvent: publishMock,
}));
vi.mock("@/lib/entitlements/gate", () => ({
  EntitlementDenied: class extends Error {
    constructor(
      public addonCode: string,
      public engagementId: string,
    ) {
      super("denied");
      this.name = "EntitlementDenied";
    }
  },
  assertEntitlement: vi.fn(),
}));

vi.mock("@/lib/rules/logic", () => {
  const registry = {
    "gen.canary_with_proposal": {
      RULE_ID: "gen.canary_with_proposal",
      RULE_VERSION: 1,
      evaluate: vi.fn().mockResolvedValue({
        fired: true,
        outcome: "fired",
        reason_code: "canary_fire",
        reason_detail: { proposedJE: balancedDraft },
      }),
    },
    "gen.flag_only": {
      RULE_ID: "gen.flag_only",
      RULE_VERSION: 1,
      evaluate: vi.fn().mockResolvedValue({
        fired: true,
        outcome: "fired",
        reason_code: "flag_only",
        reason_detail: { note: "no draft" },
      }),
    },
  };
  return { RULE_REGISTRY: registry, ALL_RULE_IDS: Object.keys(registry) };
});

const CLIENT: MockClientRow = {
  id: "client-1",
  company_id: "co-1",
  industry_vertical: "manufacturing",
  accounting_method: "accrual",
  vertical_rules_enabled: true,
};

function accrualRule(rule_id: string) {
  return {
    rule_id,
    version: 1,
    vertical: "general",
    severity: "warning",
    applies_to_cash_basis: false,
    applies_to_accrual_basis: true,
    is_active: true,
  };
}

function composedRow(fireId: string, method = "accrual") {
  return {
    fireId,
    firmClientId: "client-1",
    engagementId: "e",
    closePeriodId: null,
    ruleId: "gen.canary_with_proposal",
    ruleVersion: 1,
    accountingMethod: method,
    ruleReasonCode: "canary_fire",
    ruleReasonDetail: {},
    severity: "warning",
    jeDraft: { narration: "x", transactionDate: "2026-07-06", lines: [] },
    evidenceRefs: [],
    basisGuardReasonCode: null,
    basisGuardReasonText: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  composeMock.mockReset();
  insertMock.mockReset();
  publishMock.mockReset();
  publishMock.mockResolvedValue({});
  // Restore default canary evaluate (clearAllMocks preserves implementations,
  // but a prior test's mockRejectedValueOnce could linger — reassert default).
  (RULE_REGISTRY["gen.canary_with_proposal"].evaluate as ReturnType<typeof vi.fn>).mockResolvedValue({
    fired: true,
    outcome: "fired",
    reason_code: "canary_fire",
    reason_detail: { proposedJE: balancedDraft },
  });
});

describe("D6.4c-2 orchestrate proposal", () => {
  it("composer 'composed' -> inserts review item, increments composed count", async () => {
    composeMock.mockResolvedValueOnce({ status: "composed", row: composedRow("f") });
    insertMock.mockResolvedValueOnce({ id: "ri-1" });
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("gen.canary_with_proposal")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.fires.fired).toBe(1);
    expect(summary.proposals.composed).toBe(1);
    expect(composeMock).toHaveBeenCalledOnce();
    expect(insertMock).toHaveBeenCalledOnce();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("composer 'basis_blocked' -> emits ledger_events, no insert", async () => {
    composeMock.mockResolvedValueOnce({
      status: "basis_blocked",
      reasonCode: "basis_mismatch_accrual_on_cash",
      reasonText: "Rule requires accrual basis",
      wouldHaveComposed: { ...composedRow("f", "cash") },
    });
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("gen.canary_with_proposal")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.proposals.basis_blocked).toBe(1);
    expect(summary.proposals.composed).toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledOnce();
    expect(publishMock.mock.calls[0][0]).toMatchObject({
      eventType: "review_item.basis_blocked",
      eventCategory: "rule",
      aggregateType: "curated_rule_fire",
    });
  });

  it("composer 'invalid_draft' -> emits ledger_events, increments invalid_draft", async () => {
    composeMock.mockResolvedValueOnce({ status: "invalid_draft", reason: "unbalanced" });
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("gen.canary_with_proposal")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.proposals.invalid_draft).toBe(1);
    expect(insertMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledOnce();
    expect(publishMock.mock.calls[0][0]).toMatchObject({ eventType: "review_item.invalid_draft" });
  });

  it("rule fired but NO proposedJE (flag-only) -> no compose, increments no_proposal", async () => {
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("gen.flag_only")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.fires.fired).toBe(1);
    expect(summary.proposals.no_proposal).toBe(1);
    expect(composeMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });

  it("composer throws EntitlementDenied -> increments entitlement_denied, emits audit, run continues", async () => {
    const { EntitlementDenied } = await import("@/lib/entitlements/gate");
    composeMock.mockRejectedValueOnce(new EntitlementDenied("ap_intake", "e", "no_row"));
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("gen.canary_with_proposal")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.proposals.entitlement_denied).toBe(1);
    expect(summary.proposals.composition_error).toBe(0);
    expect(insertMock).not.toHaveBeenCalled();
    expect(publishMock).toHaveBeenCalledOnce();
    expect(publishMock.mock.calls[0][0]).toMatchObject({
      eventType: "review_item.entitlement_denied",
      payload: expect.objectContaining({ addon_code: "ap_intake" }),
    });
  });

  it("composer throws ComposeProposalError -> composition_error kind = compose_failed", async () => {
    const { ComposeProposalError } = await import("@/lib/pre-close/compose-proposal");
    composeMock.mockRejectedValueOnce(new ComposeProposalError("firm_clients lookup failed"));
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("gen.canary_with_proposal")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.proposals.composition_error).toBe(1);
    expect(publishMock).toHaveBeenCalledOnce();
    expect(publishMock.mock.calls[0][0]).toMatchObject({
      eventType: "review_item.composition_error",
      payload: expect.objectContaining({ error_kind: "compose_failed" }),
    });
  });

  it("inserter throws InsertReviewItemError -> composition_error kind = insert_failed", async () => {
    const { InsertReviewItemError } = await import("@/lib/pre-close/insert-review-item");
    composeMock.mockResolvedValueOnce({ status: "composed", row: composedRow("f") });
    insertMock.mockRejectedValueOnce(new InsertReviewItemError("insert failed"));
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("gen.canary_with_proposal")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.proposals.composition_error).toBe(1);
    expect(publishMock.mock.calls[0][0]).toMatchObject({
      eventType: "review_item.composition_error",
      payload: expect.objectContaining({ error_kind: "insert_failed" }),
    });
  });

  it("dedup no-op (fireWrite.inserted === false) -> no orchestration attempted", async () => {
    const supabase = makeSupabaseMock({
      client: CLIENT,
      rules: [accrualRule("gen.canary_with_proposal")],
      insertResults: [{ data: null, error: { code: "23505" } }],
    });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(composeMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
    expect(summary.proposals.composed).toBe(0);
    expect(summary.proposals.no_proposal).toBe(0);
  });

  it("suppressed rule (cash basis gate) -> no orchestration, proposals unchanged", async () => {
    const cashClient: MockClientRow = { ...CLIENT, accounting_method: "cash" };
    const supabase = makeSupabaseMock({ client: cashClient, rules: [accrualRule("gen.canary_with_proposal")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.fires.suppressed).toBe(1);
    expect(summary.proposals.composed).toBe(0);
    expect(summary.proposals.no_proposal).toBe(0);
    expect(composeMock).not.toHaveBeenCalled();
  });

  it("error-branch fire (rule throws) -> no orchestration attempted", async () => {
    (RULE_REGISTRY["gen.canary_with_proposal"].evaluate as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("boom"),
    );
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("gen.canary_with_proposal")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.fires.error).toBe(1);
    expect(composeMock).not.toHaveBeenCalled();
    expect(publishMock).not.toHaveBeenCalled();
  });
});
