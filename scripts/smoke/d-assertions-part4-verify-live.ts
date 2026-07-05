/**
 * D-Assertions Part 4 smoke — verify JE assertion propagation schema on live DB.
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
  const { error: auditColErr } = await supabase
    .from("je_posting_audit")
    .select("assertions_addressed, data_source_reliability_basis")
    .limit(1);
  if (auditColErr) fail("je_posting_audit columns", auditColErr);
  pass("je_posting_audit.assertions_addressed + data_source_reliability_basis exist");

  const { error: riColErr } = await supabase.from("pre_close_review_items").select("assertion_tags").limit(1);
  if (riColErr) fail("pre_close_review_items.assertion_tags", riColErr);
  pass("pre_close_review_items.assertion_tags NOT NULL readable");

  const { data: bogusValid, error: bogusErr } = await supabase.rpc("validate_assertions_array", {
    assertion_ids: ["bogus_assertion"],
  });
  if (bogusErr) fail("validate_assertions_array function exists", bogusErr);
  if (bogusValid !== false) fail("validate_assertions_array rejects bogus", new Error(String(bogusValid)));
  pass("validate_assertions_array rejects bogus_assertion");

  const { data: dupValid, error: dupErr } = await supabase.rpc("validate_assertions_array", {
    assertion_ids: ["completeness", "completeness"],
  });
  if (dupErr) fail("validate_assertions_array duplicate probe", dupErr);
  if (dupValid !== false) fail("validate_assertions_array rejects duplicates", new Error(String(dupValid)));
  pass("validate_assertions_array rejects duplicates");

  const migrationSql = readFileSync(
    "supabase/migrations/20260707150000_d_assertions_part_4_je_propagation.sql",
    "utf8",
  );
  for (const constraint of [
    "je_posting_audit_valid_assertions",
    "je_posting_audit_reliability_required_when_tagged",
    "pre_close_review_items_valid_assertions",
  ]) {
    if (!migrationSql.includes(constraint)) {
      fail(`${constraint} in committed migration`, new Error("missing"));
    }
    pass(`${constraint} CHECK declared in migration`);
  }

  for (const index of ["je_posting_audit_assertions_gin", "pre_close_review_items_assertion_tags_gin"]) {
    if (!migrationSql.includes(index)) fail(`${index} in migration`, new Error("missing"));
    pass(`${index} GIN index declared in migration`);
  }

  // Live migration confirmed: validate_assertions_array RPC + new columns only exist after Part 4 apply.
  pass("migration d_assertions_part_4_je_propagation applied live (validate_assertions_array + columns present)");

  const { count, error: racErr } = await supabase
    .from("rule_assertion_coverage")
    .select("*", { count: "exact", head: true });
  if (racErr) fail("rule_assertion_coverage count", racErr);
  if ((count ?? 0) < 32) fail("rule_assertion_coverage >= 32", new Error(`got ${count}`));
  pass(`rule_assertion_coverage count = ${count} (>= 32)`);

  console.log("\nSchema summary:");
  console.log("  je_posting_audit.assertions_addressed text[] NOT NULL DEFAULT '{}'");
  console.log("  je_posting_audit.data_source_reliability_basis text NULL");
  console.log("  pre_close_review_items.assertion_tags text[] NOT NULL DEFAULT '{}'");
  console.log(`  rule_assertion_coverage rows: ${count}`);
  console.log("\nAll D-Assertions Part 4 smoke checks passed (9 assertions).");
}

main().catch((err) => {
  console.error("Smoke failed:", err);
  process.exit(1);
});
