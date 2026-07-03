import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import { makeSupabaseMock } from "./_mock-supabase";
import type { MockClientRow } from "./_mock-supabase";

vi.mock("@/lib/rules/logic", () => {
  const registry = {
    "gen.subledger_tie_check": {
      RULE_ID: "gen.subledger_tie_check",
      RULE_VERSION: 1,
      evaluate: vi.fn().mockResolvedValue({
        fired: false,
        outcome: "not_implemented",
        reason_code: "stub",
        reason_detail: {},
      }),
    },
  };
  return { RULE_REGISTRY: registry, ALL_RULE_IDS: Object.keys(registry) };
});

const DISABLED_CLIENT: MockClientRow = {
  id: "client-1",
  industry_vertical: "manufacturing",
  accounting_method: "accrual",
  vertical_rules_enabled: false,
};

const ONE_RULE = [
  {
    rule_id: "gen.subledger_tie_check",
    version: 1,
    vertical: "general",
    severity: "warning",
    applies_to_cash_basis: false,
    applies_to_accrual_basis: true,
    is_active: true,
  },
];

describe("executeRules — kill switch", () => {
  it("short-circuits when vertical_rules_enabled is false", async () => {
    const supabase = makeSupabaseMock({ client: DISABLED_CLIENT, rules: ONE_RULE });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.killSwitchShortCircuit).toBe(true);
    expect(summary.rulesEvaluated).toBe(0);
    expect(summary.fires).toEqual({ fired: 0, suppressed: 0, error: 0, not_implemented: 0 });
  });

  it("performs no rule query and no writes when the kill switch is off", async () => {
    const supabase = makeSupabaseMock({ client: DISABLED_CLIENT, rules: ONE_RULE });
    await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(supabase.loadActiveRulesCalled()).toBe(false);
    expect(supabase.inserts).toHaveLength(0);
  });
});
