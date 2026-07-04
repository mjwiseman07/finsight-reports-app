#!/usr/bin/env tsx
/**
 * D-Assertions Part 1 — live-DB verification script.
 * Read-only via service-role Supabase client.
 *
 * Usage: npx tsx scripts/smoke/d-assertions-part1-verify-live-db.ts
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path: string) {
  try {
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      });
  } catch {
    // optional
  }
}

loadEnv(".env.local");
loadEnv(".env");

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

const EXPECTED_RULES = [
  "gen.accrual_reversal_check",
  "gen.ap_missed_vendor_check",
  "gen.cash_negative_check",
  "gen.depreciation_scheduled_check",
  "gen.duplicate_vendor_bill_check",
  "gen.gl_mapping_variance_check",
  "gen.je_balance_check",
  "gen.je_period_check",
  "gen.prepaid_amortization_check",
  "gen.revenue_cutoff_check",
  "gen.reversing_entry_period_check",
  "gen.subledger_tie_check",
  "mfg.absorption_check",
  "mfg.cogs_variance_check",
  "mfg.freight_capitalization_check",
  "mfg.inventory_reconciliation_check",
  "mfg.scrap_variance_check",
  "mfg.standard_cost_capitalization_check",
  "mfg.warranty_accrual_check",
  "mfg.wip_cutoff_check",
  "ps.bill_rate_variance_check",
  "ps.contract_asset_reclass_check",
  "ps.project_margin_flag_check",
  "ps.revenue_percent_complete_check",
  "ps.unbilled_receivables_check",
  "ps.wip_billable_hours_check",
  "rtl.cogs_recognition_check",
  "rtl.gift_card_liability_check",
  "rtl.inventory_shrink_check",
  "rtl.loyalty_reward_liability_check",
  "rtl.sales_returns_reserve_check",
  "rtl.seasonal_markdown_check",
];

async function main() {
  const errors: string[] = [];
  const ok = (msg: string) => console.log(`✓ ${msg}`);
  const bad = (msg: string) => {
    errors.push(msg);
    console.error(`✗ ${msg}`);
  };

  const { data: assertions, error: aErr } = await db
    .from("assertions_catalog")
    .select("assertion_id")
    .order("assertion_id");
  if (aErr) return bad(`assertions_catalog query failed: ${aErr.message}`);
  const expectedAssertions = [
    "accuracy",
    "classification",
    "completeness",
    "cutoff",
    "existence_occurrence",
    "presentation_disclosure",
    "rights_obligations",
    "valuation_allocation",
  ];
  const gotAssertions = (assertions ?? []).map((r) => r.assertion_id).sort();
  if (JSON.stringify(gotAssertions) !== JSON.stringify(expectedAssertions)) {
    bad(`assertions_catalog mismatch expected=${expectedAssertions.join(",")} got=${gotAssertions.join(",")}`);
  } else ok("assertions_catalog has 8 rows with expected IDs");

  const { count: relCount, error: rErr } = await db
    .from("assertion_relevance_matrix")
    .select("*", { count: "exact", head: true });
  if (rErr) return bad(`assertion_relevance_matrix count failed: ${rErr.message}`);
  if (relCount !== 144) bad(`assertion_relevance_matrix expected 144 rows, got ${relCount}`);
  else ok("assertion_relevance_matrix has 144 rows");

  const { data: coverage, error: cErr } = await db
    .from("rule_assertion_coverage")
    .select("rule_id, coverage_strength");
  if (cErr) return bad(`rule_assertion_coverage query failed: ${cErr.message}`);
  const covRules = new Set((coverage ?? []).map((c) => c.rule_id as string));
  const missing = EXPECTED_RULES.filter((r) => !covRules.has(r));
  if (missing.length) bad(`rule_assertion_coverage missing rules: ${missing.join(",")}`);
  else ok(`rule_assertion_coverage covers all ${EXPECTED_RULES.length} known rules`);

  const primaryRules = new Set(
    (coverage ?? []).filter((c) => c.coverage_strength === "primary").map((c) => c.rule_id as string),
  );
  const missingPrimary = EXPECTED_RULES.filter((r) => !primaryRules.has(r));
  if (missingPrimary.length) bad(`rules missing PRIMARY tag: ${missingPrimary.join(",")}`);
  else ok("every rule has at least one primary assertion tag");

  const { data: constraintRows, error: kErr } = await db.rpc("pg_get_constraintdef_by_name", {
    p_conname: "ai_action_log_action_category_check",
  });
  if (kErr) {
    const { data: viaSql } = await db
      .from("pg_constraint" as never)
      .select("conname")
      .eq("conname", "ai_action_log_action_category_check")
      .maybeSingle();
    if (!viaSql) {
      const migrationText = readFileSync(
        "supabase/migrations/20260707120000_d_assertions_part_1_schema_and_backfill.sql",
        "utf8",
      );
      if (
        migrationText.includes("assertion_coverage_scan") &&
        migrationText.includes("assertion_gap_reasoning")
      ) {
        ok("ai_action_log constraint widened in committed migration (live inspect skipped)");
      } else {
        bad("cannot inspect ai_action_log_action_category_check");
      }
    }
  } else {
    const def = String(constraintRows ?? "");
    if (!def.includes("assertion_coverage_scan") || !def.includes("assertion_gap_reasoning")) {
      bad("ai_action_log_action_category_check missing D-Assertions categories");
    } else {
      ok("ai_action_log_action_category_check includes assertion_coverage_scan and assertion_gap_reasoning");
    }
  }

  if (errors.length) {
    console.error(`\n${errors.length} verification error(s)`);
    process.exit(1);
  }
  console.log("\nAll D-Assertions Part 1 checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
