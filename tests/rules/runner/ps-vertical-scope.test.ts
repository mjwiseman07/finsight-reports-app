import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import { RULE_REGISTRY } from "@/lib/rules/logic";
import { makeSupabaseMock } from "./_mock-supabase";
import type { MockActivationRow, MockClientRow } from "./_mock-supabase";

const { PS_RULE_IDS_LIST, GEN_RULE_IDS_LIST, OTHER_VERTICAL_IDS_LIST } = vi.hoisted(() => {
  const PS_RULE_IDS = [
    "ps.bill_rate_variance_check",
    "ps.contract_asset_reclass_check",
    "ps.project_margin_flag_check",
    "ps.revenue_percent_complete_check",
    "ps.unbilled_receivables_check",
    "ps.wip_billable_hours_check",
  ] as const;
  const GEN_RULE_IDS = [
    "gen.subledger_tie_check",
    "gen.gl_mapping_variance_check",
    "gen.accrual_reversal_check",
    "gen.reversing_entry_period_check",
  ] as const;
  const OTHER_VERTICAL_IDS = [
    "mfg.absorption_check",
    "mfg.wip_cutoff_check",
    "rtl.cogs_recognition_check",
    "rtl.seasonal_markdown_check",
  ] as const;
  return {
    PS_RULE_IDS_LIST: [...PS_RULE_IDS],
    GEN_RULE_IDS_LIST: [...GEN_RULE_IDS],
    OTHER_VERTICAL_IDS_LIST: [...OTHER_VERTICAL_IDS],
  };
});

vi.mock("@/lib/rules/logic", async (importOriginal) => {
  await importOriginal<typeof import("@/lib/rules/logic")>();
  const registry: Record<string, unknown> = {};
  for (const id of [...PS_RULE_IDS_LIST, ...GEN_RULE_IDS_LIST, ...OTHER_VERTICAL_IDS_LIST]) {
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
  ...PS_RULE_IDS_LIST.map((id) => registryRow(id, "professional_services")),
  registryRow("mfg.absorption_check", "manufacturing"),
  registryRow("mfg.wip_cutoff_check", "manufacturing"),
  registryRow("rtl.cogs_recognition_check", "retail"),
  registryRow("rtl.seasonal_markdown_check", "retail"),
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

const PS_CLIENT: MockClientRow = {
  id: "73333333-3333-4333-8333-333333333333",
  company_id: "co-ps",
  industry_vertical: "professional_services",
  accounting_method: "accrual",
  vertical_rules_enabled: true,
};

describe("Guardrail 2 — professional services rules scoped by vertical", () => {
  beforeEach(() => vi.clearAllMocks());

  it("excludes all 6 PS rules for a general-vertical client", async () => {
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
    for (const psId of PS_RULE_IDS_LIST) {
      expect(firedRuleIds).not.toContain(psId);
      expect(RULE_REGISTRY[psId].evaluate).not.toHaveBeenCalled();
    }
    // Regression: mfg + rtl also excluded for general client
    for (const otherId of OTHER_VERTICAL_IDS_LIST) {
      expect(firedRuleIds).not.toContain(otherId);
    }
    for (const genId of GEN_RULE_IDS_LIST) {
      expect(firedRuleIds).toContain(genId);
    }
    expect(supabase.inserts).toHaveLength(4);
    expect(summary.fires.error).toBe(0);
  });

  it("evaluates PS + general rules for a PS client, still excluding mfg/rtl", async () => {
    const supabase = makeSupabaseMock({
      client: PS_CLIENT,
      rules: ALL_REGISTRY_ROWS,
      activations: ALL_ACTIVATIONS,
    });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: PS_CLIENT.id,
      trigger: "on_demand",
    });

    // 4 general + 6 PS = 10; mfg/rtl scoped out
    expect(summary.rulesEvaluated).toBe(10);
    const firedRuleIds = supabase.inserts.map((r) => r.rule_id);
    for (const psId of PS_RULE_IDS_LIST) {
      expect(firedRuleIds).toContain(psId);
      expect(RULE_REGISTRY[psId].evaluate).toHaveBeenCalled();
    }
    for (const genId of GEN_RULE_IDS_LIST) {
      expect(firedRuleIds).toContain(genId);
    }
    for (const otherId of OTHER_VERTICAL_IDS_LIST) {
      expect(firedRuleIds).not.toContain(otherId);
      expect(RULE_REGISTRY[otherId].evaluate).not.toHaveBeenCalled();
    }
    expect(summary.fires.error).toBe(0);
  });
});
