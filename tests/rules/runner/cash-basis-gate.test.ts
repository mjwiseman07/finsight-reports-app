import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import { RULE_REGISTRY } from "@/lib/rules/logic";
import { makeSupabaseMock } from "./_mock-supabase";
import type { MockClientRow } from "./_mock-supabase";

vi.mock("@/lib/rules/logic", () => {
  const mk = () => ({
    RULE_ID: "x",
    RULE_VERSION: 1,
    evaluate: vi.fn().mockResolvedValue({
      fired: false,
      outcome: "not_implemented",
      reason_code: "stub",
      reason_detail: {},
    }),
  });
  const registry: Record<string, ReturnType<typeof mk>> = {
    "gen.gl_mapping_variance_check": mk(),
    "gen.subledger_tie_check": mk(),
  };
  return { RULE_REGISTRY: registry, ALL_RULE_IDS: Object.keys(registry) };
});

vi.mock("@/lib/rules/runner/resolve-qbo", () => ({
  resolveQBOForClient: vi
    .fn()
    .mockResolvedValue({ handle: null, healthy: false, reason: "no_connection" }),
}));

const CASH_CLIENT: MockClientRow = {
  id: "client-1",
  company_id: "co-1",
  industry_vertical: "general",
  accounting_method: "cash",
  vertical_rules_enabled: true,
};

// gl_mapping supports cash; subledger_tie does not.
const RULES = [
  {
    rule_id: "gen.gl_mapping_variance_check",
    version: 1,
    vertical: "general",
    severity: "info",
    applies_to_cash_basis: true,
    applies_to_accrual_basis: true,
    is_active: true,
  },
  {
    rule_id: "gen.subledger_tie_check",
    version: 1,
    vertical: "general",
    severity: "error",
    applies_to_cash_basis: false,
    applies_to_accrual_basis: true,
    is_active: true,
  },
];

describe("executeRules — cash-basis gate (Option B)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("suppresses cash-incompatible rules with reason_code cash_basis_scope", async () => {
    const supabase = makeSupabaseMock({ client: CASH_CLIENT, rules: RULES });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.rulesEvaluated).toBe(2);
    expect(summary.fires.suppressed).toBe(1);
    expect(summary.fires.not_implemented).toBe(1);
    const suppressed = supabase.inserts.find((r) => r.rule_id === "gen.subledger_tie_check");
    expect(suppressed).toMatchObject({
      outcome: "suppressed",
      reason_code: "cash_basis_scope",
      reason_detail: { accounting_method: "cash" },
    });
  });

  it("still evaluates cash-compatible rules and never invokes suppressed rule modules", async () => {
    const supabase = makeSupabaseMock({ client: CASH_CLIENT, rules: RULES });
    await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(
      (RULE_REGISTRY["gen.gl_mapping_variance_check"].evaluate as ReturnType<typeof vi.fn>).mock
        .calls.length,
    ).toBe(1);
    expect(
      (RULE_REGISTRY["gen.subledger_tie_check"].evaluate as ReturnType<typeof vi.fn>).mock.calls
        .length,
    ).toBe(0);
  });

  it("writes exactly one fire row per rule (evaluated or suppressed)", async () => {
    const supabase = makeSupabaseMock({ client: CASH_CLIENT, rules: RULES });
    await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(supabase.inserts).toHaveLength(2);
  });
});
