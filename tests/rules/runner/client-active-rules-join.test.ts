import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import { makeSupabaseMock } from "./_mock-supabase";
import type { MockClientRow, MockActivationRow } from "./_mock-supabase";

vi.mock("@/lib/rules/logic", () => {
  const mk = (id: string) => ({
    RULE_ID: id,
    RULE_VERSION: 1,
    evaluate: vi.fn().mockResolvedValue({
      fired: false,
      outcome: "not_implemented",
      reason_code: "stub",
      reason_detail: {},
    }),
  });
  const ids = [
    "gen.subledger_tie_check",
    "gen.gl_mapping_variance_check",
    "gen.accrual_reversal_check",
    "gen.reversing_entry_period_check",
  ];
  const registry: Record<string, ReturnType<typeof mk>> = {};
  for (const id of ids) registry[id] = mk(id);
  return { RULE_REGISTRY: registry, ALL_RULE_IDS: ids };
});

vi.mock("@/lib/rules/runner/resolve-qbo", () => ({
  resolveQBOForClient: vi
    .fn()
    .mockResolvedValue({ handle: null, healthy: false, reason: "no_connection" }),
}));

const CLIENT: MockClientRow = {
  id: "client-1",
  company_id: "co-1",
  industry_vertical: "general",
  accounting_method: "accrual",
  vertical_rules_enabled: true,
};

function registryRow(rule_id: string, severity = "warning") {
  return {
    rule_id,
    version: 1,
    vertical: "general",
    severity,
    applies_to_cash_basis: true,
    applies_to_accrual_basis: true,
    is_active: true,
  };
}

describe("loadActiveRules — client_active_rules join", () => {
  const RULES = [
    registryRow("gen.subledger_tie_check"),
    registryRow("gen.gl_mapping_variance_check"),
    registryRow("gen.accrual_reversal_check"),
    registryRow("gen.reversing_entry_period_check"),
  ];

  it("evaluates only rules with an enabled, non-disabled activation; applies override_severity", async () => {
    const activations: MockActivationRow[] = [
      // enabled, no override -> evaluated with registry severity (warning)
      {
        rule_id: "gen.subledger_tie_check",
        is_enabled: true,
        override_severity: null,
        disabled_at: null,
      },
      // enabled + override -> evaluated with critical
      {
        rule_id: "gen.gl_mapping_variance_check",
        is_enabled: true,
        override_severity: "critical",
        disabled_at: null,
      },
      // enabled but disabled_at set -> excluded
      {
        rule_id: "gen.accrual_reversal_check",
        is_enabled: true,
        override_severity: null,
        disabled_at: "2026-01-01T00:00:00Z",
      },
      // gen.reversing_entry_period_check -> NO activation row -> excluded
    ];

    const supabase = makeSupabaseMock({ client: CLIENT, rules: RULES, activations });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });

    expect(summary.rulesEvaluated).toBe(2);
    expect(supabase.inserts).toHaveLength(2);

    const firedRuleIds = supabase.inserts.map((r) => r.rule_id);
    expect(firedRuleIds).toContain("gen.subledger_tie_check");
    expect(firedRuleIds).toContain("gen.gl_mapping_variance_check");
    expect(firedRuleIds).not.toContain("gen.accrual_reversal_check");
    expect(firedRuleIds).not.toContain("gen.reversing_entry_period_check");

    const subledger = supabase.inserts.find((r) => r.rule_id === "gen.subledger_tie_check");
    const glmap = supabase.inserts.find((r) => r.rule_id === "gen.gl_mapping_variance_check");
    expect(subledger?.severity_applied).toBe("warning");
    expect(glmap?.severity_applied).toBe("critical");
  });

  it("evaluates zero rules when there are no activation rows", async () => {
    const supabase = makeSupabaseMock({ client: CLIENT, rules: RULES, activations: [] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.rulesEvaluated).toBe(0);
    expect(supabase.inserts).toHaveLength(0);
  });
});
