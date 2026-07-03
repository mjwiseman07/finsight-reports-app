import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
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
    "gen.subledger_tie_check": mk(),
    "mfg.wip_cutoff_check": mk(),
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

function rule(rule_id: string) {
  return {
    rule_id,
    version: 1,
    vertical: rule_id.startsWith("gen.") ? "general" : "manufacturing",
    severity: "warning",
    applies_to_cash_basis: false,
    applies_to_accrual_basis: true,
    is_active: true,
  };
}

const RULES = [rule("gen.subledger_tie_check"), rule("mfg.wip_cutoff_check")];

describe("executeRules — idempotency (dedup unique violation)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("treats a 23505 unique-violation as a no-op and does not throw", async () => {
    // Second insert simulates the dedup index rejecting a duplicate fire.
    const supabase = makeSupabaseMock({
      client: CLIENT,
      rules: RULES,
      insertResults: [
        { data: { fire_id: "fire-1" }, error: null },
        { data: null, error: { code: "23505" } },
      ],
    });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.rulesEvaluated).toBe(2);
    // Both rules still evaluated and counted, even though the 2nd write was a dedup no-op.
    expect(summary.fires.not_implemented).toBe(2);
    expect(supabase.inserts).toHaveLength(2);
  });

  it("propagates non-dedup insert errors instead of swallowing them", async () => {
    const supabase = makeSupabaseMock({
      client: CLIENT,
      rules: [rule("gen.subledger_tie_check")],
      insertResults: [{ data: null, error: { code: "23503" } }],
    });
    await expect(
      executeRules(supabase as unknown as SupabaseClient, {
        firmClientId: "client-1",
        trigger: "on_demand",
      }),
    ).rejects.toBeTruthy();
  });
});
