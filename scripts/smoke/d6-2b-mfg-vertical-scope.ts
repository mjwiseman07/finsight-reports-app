#!/usr/bin/env tsx
/**
 * D6.2b smoke — vertical scope proof for general test client.
 *
 * Usage: pnpm tsx scripts/smoke/d6-2b-mfg-vertical-scope.ts
 *
 * Expected:
 *   - 8 MFG rules: EXCLUDED (Guardrail 2 pre-load filter; not in rulesEvaluated)
 *   - 4 general rules: evaluated (prior D6.2a behavior)
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { executeRules } from "@/lib/rules/runner/execute-rules";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";

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

function lastMonthPeriodEnd(): string {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return end.toISOString().slice(0, 10);
}

async function main() {
  const supabase = getSupabaseAdmin();
  const periodEnd = lastMonthPeriodEnd();

  console.log("=== D6.2b MFG Vertical Scope Smoke ===");
  console.log("Client:", FIRM_CLIENT_ID);
  console.log("Period end:", periodEnd);
  console.log("");

  const summary = await executeRules(supabase, {
    firmClientId: FIRM_CLIENT_ID,
    trigger: "on_demand",
    closePeriodId: undefined,
  });

  console.log("--- RunSummary ---");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");

  const { data: recentFires } = await supabase
    .from("curated_rule_fires")
    .select("rule_id, outcome, reason_code, created_at")
    .eq("firm_client_id", FIRM_CLIENT_ID)
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false });

  type FireRow = { rule_id: string; outcome: string; reason_code: string; created_at: string };
  const fires = (recentFires ?? []) as FireRow[];
  const firedByRule = new Map(fires.map((r) => [r.rule_id, r]));

  console.log("--- Per-rule status (this run) ---");
  for (const ruleId of MFG_RULE_IDS) {
    const row = firedByRule.get(ruleId);
    if (row) {
      console.log(
        `${ruleId.padEnd(42)} UNEXPECTED_FIRE outcome=${row.outcome} reason=${row.reason_code}`,
      );
    } else {
      console.log(
        `${ruleId.padEnd(42)} fired=false excluded=true reason=vertical_scope_excluded`,
      );
    }
  }
  for (const ruleId of GEN_RULE_IDS) {
    const row = firedByRule.get(ruleId);
    if (row) {
      console.log(
        `${ruleId.padEnd(42)} fired=${row.outcome === "fired"} outcome=${row.outcome} reason=${row.reason_code}`,
      );
    } else {
      console.log(`${ruleId.padEnd(42)} (no fire row in last 5 min — check rulesEvaluated)`);
    }
  }

  const mfgFires = fires.filter((r) => r.rule_id.startsWith("mfg."));
  if (mfgFires.length > 0) {
    console.error("\nFAIL: MFG rules produced fire rows for a general-vertical client.");
    process.exit(1);
  }

  if (summary.rulesEvaluated !== 4) {
    console.warn(
      `\nWARN: expected rulesEvaluated=4 (general only), got ${summary.rulesEvaluated}`,
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
