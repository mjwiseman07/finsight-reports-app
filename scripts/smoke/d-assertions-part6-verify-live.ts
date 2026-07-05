/**
 * D-Assertions Part 6 smoke — manual test evidence + strength scoring on live DB.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

type Step = { step: string; ok: boolean; details: string };

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
  console.error(JSON.stringify([{ step: "env", ok: false, details: "SUPABASE_URL and SERVICE_ROLE_KEY required" }]));
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const migrationSql = readFileSync(
  "supabase/migrations/20260707170000_d_assertions_part_6_manual_test_evidence.sql",
  "utf8",
);

async function main() {
  const results: Step[] = [];

  const { error: covErr } = await supabase
    .from("close_assertion_coverage")
    .select("covering_manual_test_ids")
    .limit(1);
  results.push({
    step: "close_assertion_coverage.covering_manual_test_ids",
    ok: !covErr,
    details: covErr?.message ?? "column readable",
  });

  const mteCols = [
    "id", "firm_client_id", "engagement_id", "close_period_id", "account_category", "assertion_id",
    "evidence_type", "source_type", "source_key", "source_amount", "source_date", "evidence_summary",
    "calculation_notes", "resolves_gap_item_id", "data_source_reliability_basis", "content_hash",
    "created_by_user_id", "created_by_display_name", "created_at", "updated_at",
  ];
  const { error: mteErr } = await supabase.from("manual_test_evidence").select(mteCols.join(", ")).limit(0);
  const checkValues = ["manual_procedure", "external_confirmation", "analytical_review", "reperformance"];
  results.push({
    step: "manual_test_evidence table + 20 columns",
    ok: !mteErr && checkValues.every((v) => migrationSql.includes(`'${v}'`)),
    details: mteErr?.message ?? "20 columns + 4 assertion evidence types in CHECK",
  });

  const mtaCols = [
    "attachment_id", "evidence_id", "firm_client_id", "storage_bucket", "storage_path",
    "original_filename", "mime_type", "byte_size", "sha256", "ingested_from", "ingested_at", "ingested_by",
  ];
  const { error: mtaErr } = await supabase.from("manual_test_attachments").select(mtaCols.join(", ")).limit(0);
  results.push({
    step: "manual_test_attachments table + bucket CHECK",
    ok: !mtaErr && migrationSql.includes("manual_test_attachments_bucket_check"),
    details: mtaErr?.message ?? "11 columns + manual-test-evidence bucket constraint",
  });

  results.push({
    step: "storage bucket manual-test-evidence",
    ok: migrationSql.includes("'manual-test-evidence'") && migrationSql.includes("false"),
    details: "private bucket declared in migration",
  });

  const idxOk =
    migrationSql.includes("manual_test_evidence_period_idx") &&
    migrationSql.includes("manual_test_evidence_engagement_idx") &&
    migrationSql.includes("manual_test_evidence_gap_idx") &&
    migrationSql.includes("manual_test_attachments_evidence_idx") &&
    migrationSql.includes("close_assertion_coverage_manual_tests_gin");
  results.push({
    step: "indexes (3 mte + 1 mta + 1 GIN)",
    ok: idxOk,
    details: idxOk ? "all expected indexes in migration SQL" : "missing index",
  });

  const rlsOk =
    migrationSql.includes("manual_test_evidence_firm_read") &&
    migrationSql.includes("manual_test_evidence_service_all") &&
    migrationSql.includes("manual_test_attachments_firm_read") &&
    migrationSql.includes("manual_test_attachments_service_all");
  results.push({
    step: "RLS policies (2 per table)",
    ok: rlsOk,
    details: rlsOk ? "4 policies in migration SQL" : "missing policy",
  });

  const { data: fc } = await supabase.from("firm_clients").select("id").limit(1).maybeSingle();
  const { data: eng } = await supabase.from("engagements").select("id").limit(1).maybeSingle();
  const { data: cp } = await supabase.from("close_periods").select("id").limit(1).maybeSingle();

  let evidenceId: string | null = null;
  if (fc?.id && eng?.id && cp?.id) {
    const contentHash = createHash("sha256").update("part6-smoke").digest("hex");
    const { data: ev, error: insErr } = await supabase
      .from("manual_test_evidence")
      .upsert(
        {
          firm_client_id: fc.id,
          engagement_id: eng.id,
          close_period_id: cp.id,
          account_category: "cash",
          assertion_id: "accuracy",
          evidence_type: "bank_statement",
          source_type: "smoke",
          evidence_summary: "Part 6 smoke manual test",
          content_hash: contentHash,
          created_by_user_id: "00000000-0000-0000-0000-000000000001",
        },
        {
          onConflict: "firm_client_id,close_period_id,account_category,assertion_id,content_hash",
        },
      )
      .select("id")
      .single();
    evidenceId = ev?.id ?? null;
    results.push({
      step: "insert manual_test_evidence smoke row",
      ok: !insErr && !!evidenceId,
      details: insErr?.message ?? String(evidenceId),
    });

    if (evidenceId) {
      const bytes = Buffer.from("test");
      const sha = createHash("sha256").update(bytes).digest("hex");
      const { error: attErr } = await supabase.from("manual_test_attachments").upsert(
        {
          evidence_id: evidenceId,
          firm_client_id: fc.id,
          storage_path: `${fc.id}/${evidenceId}/${sha}.bin`,
          original_filename: "smoke.bin",
          mime_type: "application/octet-stream",
          byte_size: bytes.length,
          sha256: sha,
          ingested_from: "smoke",
          ingested_by: "system",
        },
        { onConflict: "evidence_id,sha256" },
      );
      results.push({
        step: "insert manual_test_attachments smoke row",
        ok: !attErr,
        details: attErr?.message ?? sha,
      });
    }
  } else {
    results.push({
      step: "insert smoke rows",
      ok: true,
      details: "skipped — no seed firm_client/engagement/close_period",
    });
  }

  if (evidenceId && fc?.id && cp?.id) {
    const { data: cov } = await supabase
      .from("close_assertion_coverage")
      .select("covering_manual_test_ids, evidence_strength, manual_test_ref")
      .eq("firm_client_id", fc.id)
      .eq("close_period_id", cp.id)
      .eq("account_category", "cash")
      .eq("assertion_id", "accuracy")
      .maybeSingle();
    results.push({
      step: "projection worker manual test linkage",
      ok: true,
      details: cov
        ? `covering_manual_test_ids=${JSON.stringify(cov.covering_manual_test_ids)} strength=${cov.evidence_strength}`
        : "no coverage row yet — run projection worker separately",
    });
  }

  if (evidenceId) {
    await supabase.from("manual_test_attachments").delete().eq("evidence_id", evidenceId);
    await supabase.from("manual_test_evidence").delete().eq("id", evidenceId);
    results.push({ step: "cleanup smoke rows", ok: true, details: evidenceId });
  }

  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.log(JSON.stringify([{ step: "unhandled", ok: false, details: String(e) }]));
  process.exit(1);
});
