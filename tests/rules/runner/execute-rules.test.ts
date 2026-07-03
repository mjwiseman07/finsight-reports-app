import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { executeRules } from "@/lib/rules/runner/execute-rules";
import { RULE_REGISTRY } from "@/lib/rules/logic";
import { makeSupabaseMock } from "./_mock-supabase";
import type { MockClientRow } from "./_mock-supabase";

vi.mock("@/lib/rules/logic", () => {
  const notImplemented = () =>
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
      evaluate: notImplemented(),
    },
    "mfg.wip_cutoff_check": {
      RULE_ID: "mfg.wip_cutoff_check",
      RULE_VERSION: 1,
      evaluate: notImplemented(),
    },
    "mfg.cogs_variance_check": {
      RULE_ID: "mfg.cogs_variance_check",
      RULE_VERSION: 1,
      evaluate: notImplemented(),
    },
  };
  return { RULE_REGISTRY: registry, ALL_RULE_IDS: Object.keys(registry) };
});

const CLIENT: MockClientRow = {
  id: "client-1",
  industry_vertical: "manufacturing",
  accounting_method: "accrual",
  vertical_rules_enabled: true,
};

function accrualRule(rule_id: string) {
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

const THREE_RULES = [
  accrualRule("gen.subledger_tie_check"),
  accrualRule("mfg.wip_cutoff_check"),
  accrualRule("mfg.cogs_variance_check"),
];

describe("executeRules — happy path", () => {
  beforeEach(() => vi.clearAllMocks());

  it("evaluates all active rules and writes one fire each (all not_implemented)", async () => {
    const supabase = makeSupabaseMock({ client: CLIENT, rules: THREE_RULES });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.rulesEvaluated).toBe(3);
    expect(summary.fires.not_implemented).toBe(3);
    expect(summary.fires.fired).toBe(0);
    expect(summary.fires.error).toBe(0);
    expect(summary.fires.suppressed).toBe(0);
    expect(supabase.inserts).toHaveLength(3);
    expect(summary.killSwitchShortCircuit).toBe(false);
  });

  it("defaults target to account/firmClientId when no targetFilter given", async () => {
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("gen.subledger_tie_check")] });
    await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "scheduled",
    });
    expect(supabase.inserts[0]).toMatchObject({
      target_type: "account",
      target_ref: "client-1",
      rule_id: "gen.subledger_tie_check",
      outcome: "not_implemented",
    });
  });

  it("returns a runId and a non-negative durationMs", async () => {
    const supabase = makeSupabaseMock({ client: CLIENT, rules: THREE_RULES });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(typeof summary.runId).toBe("string");
    expect(summary.runId.length).toBeGreaterThan(0);
    expect(summary.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("missing client short-circuits with zero evaluations and no writes", async () => {
    const supabase = makeSupabaseMock({ client: null, rules: THREE_RULES });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "ghost",
      trigger: "on_demand",
    });
    expect(summary.rulesEvaluated).toBe(0);
    expect(summary.killSwitchShortCircuit).toBe(false);
    expect(supabase.inserts).toHaveLength(0);
  });

  it("honors severity_override from the rule result", async () => {
    (RULE_REGISTRY["mfg.wip_cutoff_check"].evaluate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      fired: true,
      outcome: "fired",
      reason_code: "threshold_exceeded",
      reason_detail: { foo: "bar" },
      severity_override: "critical",
    });
    const supabase = makeSupabaseMock({ client: CLIENT, rules: [accrualRule("mfg.wip_cutoff_check")] });
    const summary = await executeRules(supabase as unknown as SupabaseClient, {
      firmClientId: "client-1",
      trigger: "on_demand",
    });
    expect(summary.fires.fired).toBe(1);
    expect(supabase.inserts[0]).toMatchObject({
      outcome: "fired",
      reason_code: "threshold_exceeded",
      severity_applied: "critical",
    });
  });
});
