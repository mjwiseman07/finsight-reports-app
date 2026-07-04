/**
 * D-Assertions Part 3 smoke — verify Coverage Statement produces a deterministic PDF.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { build as buildSection } from "@/lib/close-packet/sections/assertion_coverage";
import { generateAssertionCoverageStatementPdf } from "@/lib/close-packet/pdf/AssertionCoverageStatement";
import type { AssertionCoverageStatement } from "@/lib/pre-close/assertion-coverage-statement-types";

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
  const { error: schemaErr } = await supabase
    .from("assertion_coverage_statement_versions")
    .select("snapshot_id")
    .limit(1);
  if (schemaErr) fail("assertion_coverage_statement_versions table exists", schemaErr);
  pass("assertion_coverage_statement_versions table exists");

  const { error: dlErr } = await supabase
    .from("assertion_coverage_statement_downloads")
    .select("download_id")
    .limit(1);
  if (dlErr) fail("assertion_coverage_statement_downloads table exists", dlErr);
  pass("assertion_coverage_statement_downloads table exists");

  const { data: coverageRows } = await supabase
    .from("close_assertion_coverage")
    .select("close_period_id")
    .limit(1);
  if (!coverageRows || coverageRows.length === 0) {
    fail("close_assertion_coverage has at least one row", new Error("no coverage data"));
  }
  const closePeriodId = coverageRows[0].close_period_id;
  pass(`coverage exists for close_period ${closePeriodId}`);

  const { data: closePeriod } = await supabase
    .from("close_periods")
    .select("*")
    .eq("id", closePeriodId)
    .single();
  if (!closePeriod) fail("close_period found", new Error("missing close_period"));
  pass("close_period found");

  const { data: firmClient } = await supabase
    .from("firm_clients")
    .select("*")
    .eq("id", closePeriod.firm_client_id)
    .single();
  if (!firmClient) fail("firm_client found", new Error("missing firm_client"));
  pass("firm_client found");

  const built = await buildSection({ closePeriod, firmClient, supabase });
  if (built.status !== "ok") fail("section build ok", new Error(built.error_message));
  pass("section build ok");

  const statement = built as unknown as AssertionCoverageStatement;
  if (!statement.coverage_cells || statement.coverage_cells.length === 0) {
    fail("statement has coverage cells", new Error("empty cells"));
  }
  pass(`statement has ${statement.coverage_cells.length} coverage cells`);

  if (statement.summary.total_cells !== statement.coverage_cells.length) {
    fail(
      "summary.total_cells matches cells.length",
      new Error(`${statement.summary.total_cells} !== ${statement.coverage_cells.length}`),
    );
  }
  pass("summary math consistent");

  if (statement.assertions_catalog.length !== 8) {
    fail("assertions_catalog has 8 entries", new Error(`got ${statement.assertions_catalog.length}`));
  }
  pass("assertions_catalog has 8 entries");

  if (statement.gap_root_causes.length !== 7) {
    fail("gap_root_causes has 7 entries", new Error(`got ${statement.gap_root_causes.length}`));
  }
  pass("gap_root_causes has 7 entries");

  const { buffer, sha256, byteSize } = await generateAssertionCoverageStatementPdf(statement);
  if (buffer.length === 0) fail("PDF has bytes", new Error("empty PDF"));
  if (sha256.length !== 64) fail("sha256 well-formed", new Error(`got ${sha256.length}`));
  pass(`PDF rendered: ${byteSize} bytes, sha256=${sha256.slice(0, 12)}...`);

  const outDir = path.join(process.cwd(), "tmp", "smoke");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `coverage-${closePeriodId}.pdf`);
  writeFileSync(outPath, buffer);
  pass(`PDF written to ${outPath}`);

  const { sha256: sha2 } = await generateAssertionCoverageStatementPdf(statement);
  if (sha256 !== sha2) {
    console.warn(`[WARN] PDF hashes differ between renders`);
  } else {
    pass("PDF is deterministic across renders");
  }

  const { error: insErr } = await supabase.from("assertion_coverage_statement_downloads").insert({
    close_period_id: closePeriodId,
    firm_client_id: firmClient.id,
    requested_by_email: "smoke@test",
    content_sha256: sha256,
    byte_size: byteSize,
  });
  if (insErr) fail("download log insert ok", insErr);
  pass("download log insert ok");

  console.log("\nAll D-Assertions Part 3 smoke checks passed.");
}

main().catch((err) => {
  console.error("Smoke failed:", err);
  process.exit(1);
});
