/* eslint-disable no-console */
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

import { runHistoricalScan } from "../../lib/learning/qbo-scanner";
import { getSupabaseAdmin } from "../../lib/supabase-admin.js";

const FIRM_CLIENT_ID = "71111111-1111-4111-8111-111111111111";
const SINCE = "2024-07-01";
const LEARNING_TYPES = ["vendor_gl_mapping", "recurring_pattern", "amount_range"];
const ALL_TYPES = [...LEARNING_TYPES, "scan_run"];

async function main() {
  const supabase = getSupabaseAdmin();
  const { data: fc } = await supabase
    .from("firm_clients")
    .select("company_id")
    .eq("id", FIRM_CLIENT_ID)
    .single();
  const companyId = fc?.company_id as string;

  const countRows = async (types: string[]) => {
    const { count } = await supabase
      .from("company_memory_records")
      .select("memory_id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .in("memory_type", types);
    return count ?? 0;
  };

  const patternsBefore = await countRows(LEARNING_TYPES);
  const allBefore = await countRows(ALL_TYPES);
  console.log(`PATTERNS_BEFORE: ${patternsBefore}`);
  console.log(`ALL_BEFORE (incl scan_run): ${allBefore}`);

  const scan = await runHistoricalScan(FIRM_CLIENT_ID, { sinceDate: SINCE });
  console.log(`RESCAN: run_id=${scan.run_id} txns=${scan.txn_count} patterns=${JSON.stringify(scan.patterns_created)}`);

  const patternsAfter = await countRows(LEARNING_TYPES);
  const allAfter = await countRows(ALL_TYPES);
  const patternDelta = patternsAfter - patternsBefore;
  const allDelta = allAfter - allBefore;
  console.log(`PATTERNS_AFTER: ${patternsAfter}`);
  console.log(`ALL_AFTER (incl scan_run): ${allAfter}`);
  console.log(`PATTERN_DELTA: ${patternDelta}`);
  console.log(`ALL_DELTA: ${allDelta} (expected +1 for new scan_run only)`);
  console.log(
    patternDelta === 0
      ? "IDEMPOTENCY: PASS (zero new pattern rows; upserts in place)"
      : "IDEMPOTENCY: FAIL (new pattern rows created)",
  );

  const { data: sample } = await supabase
    .from("company_memory_records")
    .select("memory_id, memory_type, payload")
    .eq("company_id", companyId)
    .eq("memory_type", "vendor_gl_mapping")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  console.log("\nSAMPLE_VENDOR_GL:");
  console.log(JSON.stringify(sample, null, 2));

  if (patternDelta !== 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
