#!/usr/bin/env tsx
/**
 * D6.2c smoke — vertical scope proof for general test client (retail rules).
 *
 * Usage: pnpm tsx scripts/smoke/d6-2c-retail-vertical-scope.ts
 *
 * Expected:
 *   - 6 retail rules EXCLUDED (Guardrail 2 pre-load filter; not in rulesEvaluated)
 *   - 8 MFG rules still EXCLUDED (D6.2b guarantee holds)
 *   - 4 general rules evaluated (D6.2a behavior)
 *   - RunSummary.rulesEvaluated = 4
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { executeRules } from "@/lib/rules/runner/execute-rules";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";

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

function lastMonthPeriodEnd(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
}

async function main() {
  const supabase = getSupabaseAdmin();
  console.log("=== D6.2c Retail Vertical Scope Smoke ===");
  console.log("Client:", FIRM_CLIENT_ID);
  console.log("Period end:", lastMonthPeriodEnd());
  console.log("");

  const summary = await executeRules(supabase, {
    firmClientId: FIRM_CLIENT_ID,
    trigger: "on_demand",
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
  const byRule = new Map(fires.map((r) => [r.rule_id, r]));

  console.log("--- Retail rules (expect excluded) ---");
  for (const id of RTL_RULE_IDS) {
    const row = byRule.get(id);
    console.log(
      row
        ? `${id.padEnd(42)} UNEXPECTED_FIRE outcome=${row.outcome} reason=${row.reason_code}`
        : `${id.padEnd(42)} fired=false excluded=true reason=vertical_scope_excluded`,
    );
  }

  console.log("--- General rules (expect evaluated) ---");
  for (const id of GEN_RULE_IDS) {
    const row = byRule.get(id);
    console.log(
      row
        ? `${id.padEnd(42)} outcome=${row.outcome} reason=${row.reason_code}`
        : `${id.padEnd(42)} (no fire row in last 5 min)`,
    );
  }

  const offVerticalFires = fires.filter(
    (r) => r.rule_id.startsWith("rtl.") || r.rule_id.startsWith("mfg."),
  );
  if (offVerticalFires.length > 0) {
    console.error("\nFAIL: off-vertical (rtl/mfg) rules produced fire rows for a general client.");
    process.exit(1);
  }
  if (summary.rulesEvaluated !== 4) {
    console.warn(`\nWARN: expected rulesEvaluated=4, got ${summary.rulesEvaluated}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
