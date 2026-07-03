import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import { RULE_REGISTRY } from "@/lib/rules/logic";
import { makeSupabaseMock } from "./_mock-supabase";
import type { MockActivationRow, MockClientRow } from "./_mock-supabase";

const { RTL_RULE_IDS_LIST, GEN_RULE_IDS_LIST } = vi.hoisted(() => {
  const RTL_RULE_IDS = [
    "rtl.cogs_recognition_check",
    "rtl.gift_card_liability_check",
    "rtl.inventory_shrink_check",
    "rtl.loyalty_reward_liability_check",
    "rtl.sales_returns_reserve_check",
    "rtl.seasonal_markdown_check",
  ] as const;
  const GEN_RULE_IDS = [
    "gen.subledger_tie_check",
    "gen.gl_mapping_variance_check",
    "gen.accrual_reversal_check",
    "gen.reversing_entry_period_check",
  ] as const;
  return { RTL_RULE_IDS_LIST: [...RTL_RULE_IDS], GEN_RULE_IDS_LIST: [...GEN_RULE_IDS] };
});

vi.mock("@/lib/rules/logic", async (importOriginal) => {
  await importOriginal<typeof import("@/lib/rules/logic")>();
  const registry: Record<string, unknown> = {};
  for (const id of [...RTL_RULE_IDS_LIST, ...GEN_RULE_IDS_LIST]) {
    registry[id] = {
      RULE_ID: id,
      RULE_VERSION: 1,
      evaluate: vi.fn().mockResolvedValue({
        fired: false,
        outcome: "suppressed",
        reason_code: "test_stub",
        reason_detail: {},
      }),
    };
  }
  return { RULE_REGISTRY: registry, ALL_RULE_IDS: Object.keys(registry) };
});

vi.mock("@/lib/rules/runner/resolve-qbo", () => ({
  resolveQBOForClient: vi
    .fn()
    .mockResolvedValue({ handle: null, healthy: false, reason: "no_connection" }),
}));

function registryRow(rule_id: string, vertical: string) {
  return {
    rule_id,
    version: 1,
    vertical,
    severity: "warning",
    applies_to_cash_basis: false,
    applies_to_accrual_basis: true,
    is_active: true,
  };
}

const ALL_REGISTRY_ROWS = [
  ...GEN_RULE_IDS_LIST.map((id) => registryRow(id, "general")),
  ...RTL_RULE_IDS_LIST.map((id) => registryRow(id, "retail")),
];

const ALL_ACTIVATIONS: MockActivationRow[] = ALL_REGISTRY_ROWS.map((r) => ({
  rule_id: r.rule_id,
  is_enabled: true,
  override_severity: null,
  disabled_at: null,
}));

const GENERAL_CLIENT: MockClientRow = {
  id: "71111111-1111-4111-8111-111111111111",
  company_id: "co-test",
  industry_vertical: "general",
  accounting_method: "accrual",
  vertical_rules_enabled: true,
};

const RETAIL_CLIENT: MockClientRow = {
  id: "72222222-2222-4222-8222-222222222222",
  company_id: "co-retail",
  industry_vertical: "retail",
  accounting_method: "accrual",
  vertical_rules_enabled: true,
};

describe("Guardrail 2 — retail rules scoped by vertical", () => {
  beforeEach(() => vi.clearAllMocks());

  it("excludes all 6 retail rules for a general-vertical client", async () => {
    const supabase = makeSupabaseMock({
      client: GENERAL_CLIENT,
      rules: ALL_REGISTRY_ROWS,
      activations: ALL_ACTIVATIONS,
    });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: GENERAL_CLIENT.id,
      trigger: "on_demand",
    });

    expect(summary.rulesEvaluated).toBe(4);
    const firedRuleIds = supabase.inserts.map((r) => r.rule_id);
    for (const rtlId of RTL_RULE_IDS_LIST) {
      expect(firedRuleIds).not.toContain(rtlId);
      expect(RULE_REGISTRY[rtlId].evaluate).not.toHaveBeenCalled();
    }
    for (const genId of GEN_RULE_IDS_LIST) {
      expect(firedRuleIds).toContain(genId);
    }
    expect(supabase.inserts).toHaveLength(4);
    expect(summary.fires.error).toBe(0);
  });

  it("evaluates retail rules for a retail-vertical client (pre-filter is vertical-scoped, not blanket)", async () => {
    const supabase = makeSupabaseMock({
      client: RETAIL_CLIENT,
      rules: ALL_REGISTRY_ROWS,
      activations: ALL_ACTIVATIONS,
    });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: RETAIL_CLIENT.id,
      trigger: "on_demand",
    });

    // 4 general + 6 retail = 10 evaluated for a retail client
    expect(summary.rulesEvaluated).toBe(10);
    const firedRuleIds = supabase.inserts.map((r) => r.rule_id);
    for (const rtlId of RTL_RULE_IDS_LIST) {
      expect(firedRuleIds).toContain(rtlId);
      expect(RULE_REGISTRY[rtlId].evaluate).toHaveBeenCalled();
    }
    expect(summary.fires.error).toBe(0);
  });
});
