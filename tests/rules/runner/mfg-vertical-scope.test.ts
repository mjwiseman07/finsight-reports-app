import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import { RULE_REGISTRY } from "@/lib/rules/logic";
import { makeSupabaseMock } from "./_mock-supabase";
import type { MockActivationRow, MockClientRow } from "./_mock-supabase";

const { MFG_RULE_IDS_LIST, GEN_RULE_IDS_LIST } = vi.hoisted(() => {
  const MFG_RULE_IDS = [
    "mfg.absorption_check",
    "mfg.cogs_variance_check",
    "mfg.freight_capitalization_check",
    "mfg.inventory_reconciliation_check",
    "mfg.scrap_variance_check",
    "mfg.standard_cost_capitalization_check",
    "mfg.warranty_accrual_check",
    "mfg.wip_cutoff_check",
  ] as const;
  const GEN_RULE_IDS = [
    "gen.subledger_tie_check",
    "gen.gl_mapping_variance_check",
    "gen.accrual_reversal_check",
    "gen.reversing_entry_period_check",
  ] as const;
  return {
    MFG_RULE_IDS_LIST: [...MFG_RULE_IDS],
    GEN_RULE_IDS_LIST: [...GEN_RULE_IDS],
  };
});

vi.mock("@/lib/rules/logic", async (importOriginal) => {
  await importOriginal<typeof import("@/lib/rules/logic")>();
  const evaluateFns: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const id of [...MFG_RULE_IDS_LIST, ...GEN_RULE_IDS_LIST]) {
    evaluateFns[id] = vi.fn().mockResolvedValue({
      fired: false,
      outcome: "suppressed",
      reason_code: "test_stub",
      reason_detail: {},
    });
  }
  const registry = Object.fromEntries(
    [...MFG_RULE_IDS_LIST, ...GEN_RULE_IDS_LIST].map((id) => [
      id,
      { RULE_ID: id, RULE_VERSION: 1, evaluate: evaluateFns[id] },
    ]),
  );
  return { RULE_REGISTRY: registry, ALL_RULE_IDS: Object.keys(registry), evaluateFns };
});

vi.mock("@/lib/rules/runner/resolve-qbo", () => ({
  resolveQBOForClient: vi
    .fn()
    .mockResolvedValue({ handle: null, healthy: false, reason: "no_connection" }),
}));

const GENERAL_CLIENT: MockClientRow = {
  id: "71111111-1111-4111-8111-111111111111",
  company_id: "co-test",
  industry_vertical: "general",
  accounting_method: "accrual",
  vertical_rules_enabled: true,
};

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
  ...MFG_RULE_IDS_LIST.map((id) => registryRow(id, "manufacturing")),
];

const ALL_ACTIVATIONS: MockActivationRow[] = ALL_REGISTRY_ROWS.map((r) => ({
  rule_id: r.rule_id,
  is_enabled: true,
  override_severity: null,
  disabled_at: null,
}));

describe("Guardrail 2 — MFG rules excluded for general-vertical client", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never evaluates MFG rules; general rules still run; zero MFG fire rows", async () => {
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
    for (const mfgId of MFG_RULE_IDS_LIST) {
      expect(firedRuleIds).not.toContain(mfgId);
    }
    for (const genId of GEN_RULE_IDS_LIST) {
      expect(firedRuleIds).toContain(genId);
    }
    expect(supabase.inserts).toHaveLength(4);
    expect(summary.fires.error).toBe(0);
  });

  it("MFG rule evaluate is never called when client vertical is general", async () => {
    const supabase = makeSupabaseMock({
      client: GENERAL_CLIENT,
      rules: ALL_REGISTRY_ROWS,
      activations: ALL_ACTIVATIONS,
    });
    await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: GENERAL_CLIENT.id,
      trigger: "on_demand",
    });
    for (const mfgId of MFG_RULE_IDS_LIST) {
      expect(RULE_REGISTRY[mfgId].evaluate).not.toHaveBeenCalled();
    }
  });
});
