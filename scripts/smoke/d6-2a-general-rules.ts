#!/usr/bin/env tsx
/**
 * D6.2a smoke — run the 4 general rules end-to-end against real QBO
 * for test client 71111111-1111-4111-8111-111111111111.
 *
 * Usage: pnpm tsx scripts/smoke/d6-2a-general-rules.ts
 *
 * Prints:
 *   - RunSummary (rulesEvaluated, fires breakdown, durationMs)
 *   - Last 10 curated_rule_fires rows for the client
 *   - Per-rule reason_code counts (this run)
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { executeRules } from "@/lib/rules/runner/execute-rules";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";

async function main() {
  const supabase = getSupabaseAdmin();
  console.log("=== D6.2a Live Smoke ===");
  console.log("Client:", FIRM_CLIENT_ID);
  console.log("");

  const summary = await executeRules(supabase, {
    firmClientId: FIRM_CLIENT_ID,
    trigger: "on_demand",
  });

  console.log("--- RunSummary ---");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");

  console.log("--- Last 10 curated_rule_fires ---");
  const { data: fires } = await supabase
    .from("curated_rule_fires")
    .select("fire_id, rule_id, outcome, reason_code, severity_applied, created_at")
    .eq("firm_client_id", FIRM_CLIENT_ID)
    .order("created_at", { ascending: false })
    .limit(10);
  console.table(fires ?? []);

  console.log("--- Per-rule reason_code counts (this run) ---");
  const { data: byRule } = await supabase
    .from("curated_rule_fires")
    .select("rule_id, outcome, reason_code")
    .eq("firm_client_id", FIRM_CLIENT_ID)
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());
  const grouped: Record<string, Record<string, number>> = {};
  for (const row of byRule ?? []) {
    const key = `${row.rule_id}::${row.outcome}::${row.reason_code}`;
    grouped[row.rule_id] = grouped[row.rule_id] ?? {};
    grouped[row.rule_id][key] = (grouped[row.rule_id][key] ?? 0) + 1;
  }
  console.log(JSON.stringify(grouped, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
