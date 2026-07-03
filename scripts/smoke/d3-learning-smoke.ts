/* eslint-disable no-console */
// D3 learning engine smoke — 8 cases.
// Cases 5-7 hit QBO sandbox realm 9341457151063823 and write memory records.
// Case 8 verifies governance payload immutability survives the D3 relaxation.
// Run: npx tsx scripts/smoke/d3-learning-smoke.ts
import { readFileSync } from "node:fs";

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

import { wilsonScoreLower, welfordInit, welfordUpdate, welfordStddev } from "../../lib/learning/confidence";
import { runHistoricalScan } from "../../lib/learning/qbo-scanner";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";
const SINCE = "2024-07-01";

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
function pass(name: string, ok: boolean, detail?: string) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

function welfordOf(nums: number[]) {
  let s = welfordInit();
  for (const n of nums) s = welfordUpdate(s, n);
  return welfordStddev(s);
}

async function companyIdFor(firmClientId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("firm_clients")
    .select("company_id")
    .eq("id", firmClientId)
    .maybeSingle();
  return (data?.company_id as string) ?? "";
}

async function countMemories(companyId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("company_memory_records")
    .select("memory_id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("memory_type", ["vendor_gl_mapping", "recurring_pattern", "amount_range", "scan_run"]);
  return count ?? 0;
}

async function main() {
  console.log("=== D3 learning engine smoke test ===\n");
  const supabase = getSupabaseAdmin();

  // Case 1
  const w1 = wilsonScoreLower(10, 10);
  pass("wilsonScoreLower(10,10) in [0.7,1.0]", w1 >= 0.7 && w1 <= 1.0, `= ${w1.toFixed(4)}`);

  // Case 2
  const w2 = wilsonScoreLower(1, 3);
  pass("wilsonScoreLower(1,3) < 0.5", w2 < 0.5, `= ${w2.toFixed(4)}`);

  // Case 3
  const s3 = welfordOf([5, 5, 5, 5, 5]);
  pass("Welford stddev = 0 on constant series", s3 === 0, `= ${s3}`);

  // Case 4
  const s4 = welfordOf([10, 20, 30, 40, 50]);
  pass("Welford stddev ≈ 15.81 on [10..50]", Math.abs(s4 - 15.8114) < 0.01, `= ${s4.toFixed(4)}`);

  // Case 5 — historical scan completes on accrual client
  await supabase.from("firm_clients").update({ accounting_method: "accrual" }).eq("id", FIRM_CLIENT_ID);
  let scanOk = false;
  let scanDetail = "";
  try {
    const scan = await runHistoricalScan(FIRM_CLIENT_ID, { sinceDate: SINCE });
    scanOk = typeof scan.run_id === "string" && scan.txn_count >= 0;
    scanDetail = `run_id=${scan.run_id} txns=${scan.txn_count} patterns=${JSON.stringify(scan.patterns_created)}`;
  } catch (err) {
    scanDetail = err instanceof Error ? err.message : String(err);
  }
  pass("runHistoricalScan completes on accrual sandbox client", scanOk, scanDetail);

  // Case 6 — at least one memory record after scan
  const companyId = await companyIdFor(FIRM_CLIENT_ID);
  const memCount = await countMemories(companyId);
  pass("≥1 memory record written after scan", memCount >= 1, `count=${memCount}`);

  // Case 7 — cash-basis client scan also completes
  await supabase.from("firm_clients").update({ accounting_method: "cash" }).eq("id", FIRM_CLIENT_ID);
  let cashOk = false;
  let cashDetail = "";
  try {
    const scan = await runHistoricalScan(FIRM_CLIENT_ID, { sinceDate: SINCE });
    cashOk = typeof scan.run_id === "string";
    cashDetail = `run_id=${scan.run_id} txns=${scan.txn_count}`;
  } catch (err) {
    cashDetail = err instanceof Error ? err.message : String(err);
  }
  pass("cash-basis client scan also completes", cashOk, cashDetail);

  // Restore to accrual
  await supabase.from("firm_clients").update({ accounting_method: "accrual" }).eq("id", FIRM_CLIENT_ID);

  // Case 8 — payload immutability preserved for governance types (posted_je).
  // company_memory_records has no firm_client_id column; scope by company_id
  // and target a specific posted_je memory_id created by the D2 poster.
  const { data: postedJe } = await supabase
    .from("company_memory_records")
    .select("memory_id")
    .eq("company_id", companyId)
    .eq("memory_type", "posted_je")
    .limit(1)
    .maybeSingle();

  if (!postedJe?.memory_id) {
    pass(
      "posted_je payload still immutable after D3 trigger relaxation",
      false,
      "no posted_je memory found for company (run D2 live test first)",
    );
  } else {
    const { error: immutErr } = await supabase
      .from("company_memory_records")
      .update({ payload: { tampered: true } })
      .eq("memory_id", postedJe.memory_id);
    pass(
      "posted_je payload still immutable after D3 trigger relaxation",
      !!immutErr && /immutable/i.test(immutErr.message),
      `err=${immutErr?.message ?? "no error (FAIL)"}`,
    );
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
