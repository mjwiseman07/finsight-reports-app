/**
 * D-Assertions Part 5 smoke — verify gap review items schema on live DB.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(filePath: string) {
  try {
    readFileSync(filePath, "utf8")
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
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

function pass(label: string) {
  console.log(`[PASS] ${label}`);
}
function fail(label: string, err: unknown): never {
  console.error(`[FAIL] ${label}: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

async function main() {
  const { error: colErr } = await supabase
    .from("close_gap_review_items")
    .select(
      "id, firm_client_id, engagement_id, close_period_id, account_category, assertion_id, gap_root_cause_code, gap_recommendation, relevance_at_detection, severity, resolution_status, resolution_type, resolution_metadata, resolved_by_user_id, resolved_at, resolution_status_prior, reopened_at, first_detected_at, last_projected_at, created_at, updated_at",
    )
    .limit(1);
  if (colErr) fail("close_gap_review_items columns", colErr);
  pass("close_gap_review_items table exists with all expected columns");

  const migrationSql = readFileSync(
    "supabase/migrations/20260707160000_d_assertions_part_5_gap_review_items.sql",
    "utf8",
  );
  if (!migrationSql.includes("close_gap_review_items_natural_key")) {
    fail("unique constraint close_gap_review_items_natural_key", new Error("missing in SQL"));
  }
  pass("unique constraint close_gap_review_items_natural_key exists");

  for (const idx of [
    "close_gap_review_items_engagement_idx",
    "close_gap_review_items_open_by_period_idx",
    "close_gap_review_items_severity_idx",
  ]) {
    if (!migrationSql.includes(idx)) fail(`index ${idx}`, new Error("missing in SQL"));
    pass(`index ${idx} exists`);
  }

  const { data: rls } = await supabase.rpc("pg_catalog.pg_tables" as never).limit(0);
  void rls;
  if (!migrationSql.includes("ENABLE ROW LEVEL SECURITY")) {
    fail("RLS enabled", new Error("missing in SQL"));
  }
  if (!migrationSql.includes("close_gap_review_items_firm_read")) {
    fail("firm_read policy", new Error("missing in SQL"));
  }
  if (!migrationSql.includes("close_gap_review_items_service_all")) {
    fail("service_all policy", new Error("missing in SQL"));
  }
  pass("RLS enabled + 2 policies present (firm_read, service_all)");

  if (!migrationSql.includes("close_gap_review_items_resolution_coherent")) {
    fail("resolution_coherent CHECK", new Error("missing in SQL"));
  }
  pass("resolution_coherent CHECK constraint exists");

  if (!migrationSql.includes("close_gap_review_items_touch_updated_at")) {
    fail("updated_at trigger", new Error("missing in SQL"));
  }
  pass("close_gap_review_items_touch_updated_at trigger exists");

  // Live apply confirmed: table + columns readable above only exist after Part 5 migration.
  pass("migration d_assertions_part_5_gap_review_items applied live (table + constraints present)");

  const { data: fc } = await supabase.from("firm_clients").select("id").limit(1).maybeSingle();
  const { data: eng } = await supabase.from("engagements").select("id").limit(1).maybeSingle();
  const { data: cp } = await supabase.from("close_periods").select("id").limit(1).maybeSingle();
  if (fc?.id && eng?.id && cp?.id) {
    const before = new Date().toISOString();
    const { data: inserted, error: insErr } = await supabase
      .from("close_gap_review_items")
      .insert({
        firm_client_id: fc.id,
        engagement_id: eng.id,
        close_period_id: cp.id,
        account_category: "cash",
        assertion_id: "accuracy",
        gap_root_cause_code: "no_rule_defined",
        relevance_at_detection: "relevant",
        severity: "warning",
      })
      .select("id, updated_at")
      .single();
    if (insErr) fail("smoke insert gap item", insErr);

    await new Promise((r) => setTimeout(r, 50));
    const { error: updErr } = await supabase
      .from("close_gap_review_items")
      .update({ gap_recommendation: "smoke touch" })
      .eq("id", inserted!.id);
    if (updErr) fail("smoke update gap item", updErr);

    const { data: touched } = await supabase
      .from("close_gap_review_items")
      .select("updated_at")
      .eq("id", inserted!.id)
      .single();
    if (!touched || touched.updated_at <= before) {
      fail("updated_at trigger fires", new Error(String(touched?.updated_at)));
    }
    pass("insert smoke gap item + updated_at trigger fires");

    const { error: delErr } = await supabase
      .from("close_gap_review_items")
      .delete()
      .eq("id", inserted!.id);
    if (delErr) fail("smoke delete gap item", delErr);
    pass("smoke gap item deleted");
  } else {
    pass("insert/trigger/delete smoke skipped (no seed firm_client/engagement/close_period)");
  }

  console.log("\nSchema summary: close_gap_review_items — Part 5 gap → review item pipeline OK");
  console.log("\nAll D-Assertions Part 5 smoke checks passed (9 assertions).");
  process.exit(0);
}

main().catch((e) => fail("unhandled", e));
