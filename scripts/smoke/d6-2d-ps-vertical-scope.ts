#!/usr/bin/env tsx
/**
 * D6.2d smoke — vertical scope proof for professional-services rules.
 *
 * Usage: pnpm tsx scripts/smoke/d6-2d-ps-vertical-scope.ts
 *
 * Runs the runner against the general test client (71111111-...). The PS test
 * client (73333333-...) is mock-only (see migration note) so it is skipped here
 * unless it has been seeded into live firm_clients.
 *
 * Expected (general client):
 *   RunSummary.rulesEvaluated = 4
 *   All 6 ps.* absent from fires (D6.2d scope proof)
 *   All 8 mfg.* absent (D6.2b guarantee)
 *   All 6 rtl.* absent (D6.2c guarantee)
 *   4 gen.* rules present
 *   No thrown errors
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { executeRules } from "@/lib/rules/runner/execute-rules";

const GENERAL_CLIENT_ID = "71111111-1111-4111-8111-111111111111";
const PS_CLIENT_ID = "73333333-3333-4333-8333-333333333333";

const PS_RULE_IDS = [
  "ps.bill_rate_variance_check",
  "ps.contract_asset_reclass_check",
  "ps.project_margin_flag_check",
  "ps.revenue_percent_complete_check",
  "ps.unbilled_receivables_check",
  "ps.wip_billable_hours_check",
] as const;

const GEN_RULE_IDS = [
  "gen.subledger_tie_check",
  "gen.gl_mapping_variance_check",
  "gen.accrual_reversal_check",
  "gen.reversing_entry_period_check",
] as const;

type FireRow = { rule_id: string; outcome: string; reason_code: string; created_at: string };

async function runFor(label: string, firmClientId: string) {
  const supabase = getSupabaseAdmin();
  console.log(`\n=== Run against ${firmClientId} (${label}) ===`);

  const summary = await executeRules(supabase, { firmClientId, trigger: "on_demand" });
  console.log("RunSummary:", JSON.stringify(summary));

  const { data } = await supabase
    .from("curated_rule_fires")
    .select("rule_id, outcome, reason_code, created_at")
    .eq("firm_client_id", firmClientId)
    .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false });

  const fires = (data ?? []) as FireRow[];
  const seen = new Set(fires.map((r) => r.rule_id));

  const offVertical = fires.filter(
    (r) => r.rule_id.startsWith("mfg.") || r.rule_id.startsWith("rtl."),
  );
  const psSeen = PS_RULE_IDS.filter((id) => seen.has(id));
  const genSeen = GEN_RULE_IDS.filter((id) => seen.has(id));

  if (label === "general") {
    console.log(`ps.* present (expect 0): ${psSeen.length}`);
    console.log(`mfg.*/rtl.* present (expect 0): ${offVertical.length}`);
    console.log(`gen.* present (expect 4): ${genSeen.length}`);
    if (psSeen.length > 0 || offVertical.length > 0) {
      console.error("FAIL: off-vertical rules produced fire rows for the general client.");
      process.exitCode = 1;
    }
  } else {
    console.log(`ps.* present (expect 6): ${psSeen.length}`);
    console.log(`gen.* present (expect 4): ${genSeen.length}`);
    console.log(`mfg.*/rtl.* present (expect 0): ${offVertical.length}`);
    if (offVertical.length > 0) {
      console.error("FAIL: mfg/rtl leaked into a PS client run.");
      process.exitCode = 1;
    }
  }
}

async function main() {
  const supabase = getSupabaseAdmin();
  await runFor("general", GENERAL_CLIENT_ID);

  const { data: psClient } = await supabase
    .from("firm_clients")
    .select("id")
    .eq("id", PS_CLIENT_ID)
    .maybeSingle();

  if (psClient) {
    await runFor("professional_services", PS_CLIENT_ID);
  } else {
    console.log(
      `\n(PS test client ${PS_CLIENT_ID} not seeded live — mock-only, per migration note. Skipping PS-client run.)`,
    );
  }
  process.exit(process.exitCode ?? 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
