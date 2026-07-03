import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import { RULE_REGISTRY } from "@/lib/rules/logic";
import { makeSupabaseMock } from "./_mock-supabase";
import type { MockClientRow } from "./_mock-supabase";

vi.mock("@/lib/rules/logic", () => {
  const okStub = () =>
    vi.fn().mockResolvedValue({
      fired: false,
      outcome: "not_implemented",
      reason_code: "stub",
      reason_detail: {},
    });
  const registry: Record<string, { RULE_ID: string; RULE_VERSION: number; evaluate: unknown }> = {
    "gen.subledger_tie_check": {
      RULE_ID: "gen.subledger_tie_check",
      RULE_VERSION: 1,
      evaluate: vi.fn().mockRejectedValue(new Error("boom")),
    },
    "mfg.wip_cutoff_check": {
      RULE_ID: "mfg.wip_cutoff_check",
      RULE_VERSION: 1,
      evaluate: okStub(),
    },
    "mfg.cogs_variance_check": {
      RULE_ID: "mfg.cogs_variance_check",
      RULE_VERSION: 1,
      evaluate: okStub(),
    },
  };
  return { RULE_REGISTRY: registry, ALL_RULE_IDS: Object.keys(registry) };
});

vi.mock("@/lib/rules/runner/resolve-qbo", () => ({
  resolveQBOForClient: vi
    .fn()
    .mockResolvedValue({ handle: null, healthy: false, reason: "no_connection" }),
}));

const CLIENT: MockClientRow = {
  id: "client-1",
  company_id: "co-1",
  industry_vertical: "manufacturing",
  accounting_method: "accrual",
  vertical_rules_enabled: true,
};

function rule(rule_id: string, severity = "warning") {
  return {
    rule_id,
    version: 1,
    vertical: rule_id.startsWith("gen.") ? "general" : "manufacturing",
    severity,
    applies_to_cash_basis: false,
    applies_to_accrual_basis: true,
    is_active: true,
  };
}

const RULES = [
  rule("gen.subledger_tie_check", "error"),
  rule("mfg.wip_cutoff_check"),
  rule("mfg.cogs_variance_check"),
];

describe("executeRules — error isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("records a throwing rule as outcome=error without aborting the run", async () => {
    const supabase = makeSupabaseMock({ client: CLIENT, rules: RULES });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.rulesEvaluated).toBe(3);
    expect(summary.fires.error).toBe(1);
    expect(summary.fires.not_implemented).toBe(2);
  });

  it("writes an error fire with reason_code=exception and message detail", async () => {
    const supabase = makeSupabaseMock({ client: CLIENT, rules: RULES });
    await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    const errRow = supabase.inserts.find((r) => r.outcome === "error");
    expect(errRow).toMatchObject({
      rule_id: "gen.subledger_tie_check",
      reason_code: "exception",
      severity_applied: "error",
    });
    expect((errRow?.reason_detail as { message?: string })?.message).toBe("boom");
  });

  it("continues to evaluate the remaining rules after the failure", async () => {
    const supabase = makeSupabaseMock({ client: CLIENT, rules: RULES });
    await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(
      (RULE_REGISTRY["mfg.wip_cutoff_check"].evaluate as ReturnType<typeof vi.fn>).mock.calls
        .length,
    ).toBe(1);
    expect(
      (RULE_REGISTRY["mfg.cogs_variance_check"].evaluate as ReturnType<typeof vi.fn>).mock.calls
        .length,
    ).toBe(1);
    expect(supabase.inserts).toHaveLength(3);
  });
});
