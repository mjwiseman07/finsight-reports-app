/**
 * D-Assertions Part 7 — E2E LOCK smoke.
 * Chains Parts 1–6 on a synthetic engagement. Gated behind --allow-live-writes.
 *
 * Exit codes: 0 = all steps ok; 1 = step failure; 2 = misconfiguration.
 */
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServiceClient } from "@/lib/supabase/service";
import { runProjectionWorker } from "@/lib/assertions/projection-worker";
import {
  attachFileToManualTest,
  createManualTestEvidence,
} from "@/lib/assertions/manual-test-service";
import {
  build as buildSection,
  toAssertionCoverageStatement,
} from "@/lib/close-packet/sections/assertion_coverage";
import { generateAssertionCoverageStatementPdf } from "@/lib/close-packet/pdf/AssertionCoverageStatement";
import type { AssertionCoverageStatement } from "@/lib/pre-close/assertion-coverage-statement-types";

type Step = { step: string; ok: boolean; details: string };

const E2E_PREFIX = "e2e-lock";
const ACTOR_USER_ID = "00000000-0000-4000-8000-0000000000e2";
const RULE_ID = "gen.subledger_tie_check";
const TARGET_PAIR = { accountCategory: "accounts_receivable", assertionId: "completeness" };
const GAP_PAIR = { accountCategory: "cash", assertionId: "cutoff" };

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
const allowWrites =
  process.argv.includes("--allow-live-writes") ||
  process.env.E2E_LOCK_ALLOW_WRITES === "true";
const doCleanup = process.argv.includes("--cleanup");

if (!url || !key) {
  console.error(
    JSON.stringify([
      {
        step: "env",
        ok: false,
        details: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required",
      },
    ]),
  );
  process.exit(2);
}

if (!allowWrites) {
  console.error(
    JSON.stringify([
      {
        step: "allow_live_writes",
        ok: false,
        details:
          "Refusing to run: pass --allow-live-writes or set E2E_LOCK_ALLOW_WRITES=true",
      },
    ]),
  );
  process.exit(2);
}

const results: Step[] = [];

function record(step: string, ok: boolean, details: string) {
  results.push({ step, ok, details });
}

async function ensureSyntheticEntities(db: ReturnType<typeof createServiceClient>) {
  const { data: firm } = await db.from("firms").select("id").limit(1).maybeSingle();
  if (!firm?.id) throw new Error("no firm exists — cannot seed e2e-lock fixtures");

  const clientName = `${E2E_PREFIX} client`;
  const engName = `${E2E_PREFIX} engagement`;

  let { data: fc } = await db
    .from("firm_clients")
    .select("id")
    .eq("name", clientName)
    .maybeSingle();
  if (!fc?.id) {
    const { data: inserted, error } = await db
      .from("firm_clients")
      .insert({
        firm_id: firm.id,
        name: clientName,
        company_id: randomUUID(),
        is_demo: true,
        industry_vertical: "general",
        accounting_method: "accrual",
        subscription_status: "active",
      })
      .select("id")
      .single();
    if (error) throw error;
    fc = inserted;
  }

  let { data: eng } = await db
    .from("engagements")
    .select("id")
    .eq("firm_id", firm.id)
    .eq("engagement_name", engName)
    .maybeSingle();
  if (!eng?.id) {
    const { data: inserted, error } = await db
      .from("engagements")
      .insert({
        firm_id: firm.id,
        engagement_name: engName,
        engagement_type: "bookkeeping",
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw error;
    eng = inserted;
  }

  const { data: portco } = await db
    .from("portcos")
    .select("id")
    .eq("engagement_id", eng!.id)
    .eq("firm_client_id", fc!.id)
    .maybeSingle();
  if (!portco?.id) {
    const { error } = await db.from("portcos").insert({
      engagement_id: eng!.id,
      firm_client_id: fc!.id,
      portco_name: `${E2E_PREFIX} portco`,
    });
    if (error) throw error;
  }

  let { data: cp } = await db
    .from("close_periods")
    .select("id, period_start, period_end, status, firm_client_id")
    .eq("firm_client_id", fc!.id)
    .eq("period_start", "2026-06-01")
    .eq("period_end", "2026-06-30")
    .maybeSingle();
  if (!cp?.id) {
    const { data: inserted, error } = await db
      .from("close_periods")
      .insert({
        firm_client_id: fc!.id,
        period_start: "2026-06-01",
        period_end: "2026-06-30",
        status: "prep",
      })
      .select("id, period_start, period_end, status, firm_client_id")
      .single();
    if (error) throw error;
    cp = inserted;
  }

  return {
    firmClientId: fc!.id as string,
    engagementId: eng!.id as string,
    closePeriodId: cp!.id as string,
    closePeriod: cp!,
    firmClient: { id: fc!.id, name: clientName, industry_vertical: "general", accounting_method: "accrual", is_demo: true },
  };
}

async function ensureFireAndReviewItem(
  db: ReturnType<typeof createServiceClient>,
  firmClientId: string,
  engagementId: string,
  closePeriodId: string,
  runId: string,
) {
  const inputsHash = createHash("sha256").update(`${E2E_PREFIX}:${runId}:fire`).digest("hex");
  const targetRef = `${E2E_PREFIX}:${runId}:ar-completeness`;

  let { data: fire } = await db
    .from("curated_rule_fires")
    .select("fire_id, rule_id, outcome")
    .eq("firm_client_id", firmClientId)
    .eq("rule_id", RULE_ID)
    .eq("target_ref", targetRef)
    .maybeSingle();

  if (!fire?.fire_id) {
    const { data: inserted, error } = await db
      .from("curated_rule_fires")
      .insert({
        firm_client_id: firmClientId,
        rule_id: RULE_ID,
        rule_version: 1,
        target_type: "period",
        target_ref: targetRef,
        inputs_hash: inputsHash,
        outcome: "fired",
        reason_code: "e2e_lock_synthetic",
        reason_detail: { source: E2E_PREFIX },
        severity_applied: "warning",
      })
      .select("fire_id, rule_id, outcome")
      .single();
    if (error) throw error;
    fire = inserted;
  }

  const { data: existingRi } = await db
    .from("pre_close_review_items")
    .select("id")
    .eq("fire_id", fire!.fire_id)
    .eq("close_period_id", closePeriodId)
    .maybeSingle();

  if (!existingRi?.id) {
    const jeDraft = {
      narration: "e2e-lock synthetic",
      transactionDate: "2026-06-30",
      lines: [
        {
          lineIndex: 0,
          accountId: "1100",
          accountName: "AR",
          drAmountCents: 10000,
          crAmountCents: 0,
          memo: "e2e",
        },
        {
          lineIndex: 1,
          accountId: "4000",
          accountName: "Revenue",
          drAmountCents: 0,
          crAmountCents: 10000,
          memo: "e2e",
        },
      ],
    };
    const { error } = await db.from("pre_close_review_items").insert({
      fire_id: fire!.fire_id,
      firm_client_id: firmClientId,
      engagement_id: engagementId,
      close_period_id: closePeriodId,
      rule_id: RULE_ID,
      rule_version: 1,
      accounting_method: "accrual",
      je_draft: jeDraft,
      je_draft_total_debit_cents: 10000,
      je_draft_total_credit_cents: 10000,
      je_draft_line_count: 2,
      rule_reason_code: "e2e_lock_synthetic",
      rule_reason_detail: { source: E2E_PREFIX },
      severity: "warning",
      evidence_refs: [],
    });
    if (error) throw error;
  }

  return { fireId: fire!.fire_id as string, ruleId: fire!.rule_id as string };
}

async function cleanup(
  db: ReturnType<typeof createServiceClient>,
  ids: { firmClientId: string; engagementId: string; closePeriodId: string },
) {
  const { firmClientId, engagementId, closePeriodId } = ids;
  await db.from("manual_test_attachments").delete().eq("firm_client_id", firmClientId);
  await db.from("manual_test_evidence").delete().eq("firm_client_id", firmClientId);
  await db.from("close_gap_review_items").delete().eq("close_period_id", closePeriodId);
  await db.from("close_assertion_coverage").delete().eq("close_period_id", closePeriodId);
  await db.from("close_assertion_coverage_events").delete().eq("close_period_id", closePeriodId);
  await db.from("pre_close_review_items").delete().eq("close_period_id", closePeriodId);
  await db.from("curated_rule_fires").delete().eq("firm_client_id", firmClientId);
  await db.from("portcos").delete().eq("firm_client_id", firmClientId);
  await db.from("close_periods").delete().eq("id", closePeriodId);
  await db.from("engagements").delete().eq("id", engagementId);
  await db.from("firm_clients").delete().eq("id", firmClientId);
}

async function main() {
  const db = createServiceClient();
  const runId = randomUUID().slice(0, 8);

  // Step 1 — env already loaded above
  record("env", true, "SUPABASE_URL + SERVICE_ROLE_KEY present");

  // Step 2 — allow-live-writes already gated above
  record("allow_live_writes", true, "--allow-live-writes accepted");

  let firmClientId = "";
  let engagementId = "";
  let closePeriodId = "";
  let closePeriod: Record<string, unknown> = {};
  let firmClient: Record<string, unknown> = {};

  try {
    // Step 3 — synthetic entities
    const entities = await ensureSyntheticEntities(db);
    firmClientId = entities.firmClientId;
    engagementId = entities.engagementId;
    closePeriodId = entities.closePeriodId;
    closePeriod = entities.closePeriod as Record<string, unknown>;
    firmClient = entities.firmClient;
    record(
      "synthetic_entities",
      true,
      `fc=${firmClientId} eng=${engagementId} cp=${closePeriodId}`,
    );

    // Steps 4–5 — fire + review item for AR/completeness
    const { fireId } = await ensureFireAndReviewItem(
      db,
      firmClientId,
      engagementId,
      closePeriodId,
      runId,
    );
    record("curated_rule_fire", true, `fire_id=${fireId} rule=${RULE_ID} outcome=fired`);
    record("pre_close_review_item", true, `fire_id=${fireId} period=${closePeriodId}`);

    // Step 6 — first projection
    const result1 = await runProjectionWorker(firmClientId, closePeriodId);
    const { data: arRow } = await db
      .from("close_assertion_coverage")
      .select("coverage_status, evidence_strength, covering_manual_test_ids")
      .eq("firm_client_id", firmClientId)
      .eq("close_period_id", closePeriodId)
      .eq("account_category", TARGET_PAIR.accountCategory)
      .eq("assertion_id", TARGET_PAIR.assertionId)
      .maybeSingle();
    const arOk =
      result1.rowsWritten > 0 &&
      arRow?.coverage_status === "tested";
    record(
      "projection_worker_run1",
      arOk,
      `rowsWritten=${result1.rowsWritten} ar_completeness=${arRow?.coverage_status ?? "missing"}`,
    );

    // Step 7 — gap detected
    let { data: gap } = await db
      .from("close_gap_review_items")
      .select("id, account_category, assertion_id, resolution_status")
      .eq("firm_client_id", firmClientId)
      .eq("close_period_id", closePeriodId)
      .eq("account_category", GAP_PAIR.accountCategory)
      .eq("assertion_id", GAP_PAIR.assertionId)
      .maybeSingle();
    if (!gap?.id) {
      const { data: anyGap } = await db
        .from("close_gap_review_items")
        .select("id, account_category, assertion_id, resolution_status")
        .eq("firm_client_id", firmClientId)
        .eq("close_period_id", closePeriodId)
        .eq("resolution_status", "open")
        .limit(1)
        .maybeSingle();
      gap = anyGap;
    }
    record(
      "gap_review_item",
      !!gap?.id,
      gap
        ? `id=${gap.id} pair=${gap.account_category}/${gap.assertion_id} status=${gap.resolution_status}`
        : "no gap item found",
    );

    // Steps 8–9 — manual test (resolves gap via resolvesGapItemId)
    let evidenceId = "";
    if (gap?.id) {
      const evidence = await createManualTestEvidence(db, {
        firmClientId,
        engagementId,
        closePeriodId,
        accountCategory: gap.account_category as string,
        assertionId: gap.assertion_id as string,
        evidenceType: "bank_statement",
        sourceType: "e2e_lock",
        evidenceSummary: "E2E LOCK smoke manual bank statement for gap remediation",
        dataSourceReliabilityBasis: "AS 1105 .10A — external bank statement",
        resolvesGapItemId: gap.id as string,
        createdByUserId: ACTOR_USER_ID,
        createdByDisplayName: "e2e-lock",
      });
      evidenceId = evidence.id;

      const bytes = new Uint8Array(16);
      bytes.set([0x25, 0x50, 0x44, 0x46]); // %PDF
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const storagePath = `e2e-lock/${runId}/attachment.pdf`;

      const { error: upErr } = await db.storage
        .from("manual-test-evidence")
        .upload(storagePath, Buffer.from(bytes), {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) throw new Error(`storage upload: ${upErr.message}`);

      const attachment = await attachFileToManualTest(db, {
        evidenceId,
        firmClientId,
        engagementId,
        originalFilename: "attachment.pdf",
        mimeType: "application/pdf",
        byteSize: bytes.length,
        sha256,
        storagePath,
        ingestedFrom: "e2e_lock",
        ingestedBy: ACTOR_USER_ID,
      });
      record(
        "manual_test_create_attach",
        true,
        `evidence=${evidenceId} attachment=${attachment.attachmentId}`,
      );

      const { data: resolved } = await db
        .from("close_gap_review_items")
        .select("resolution_status, resolution_type")
        .eq("id", gap.id)
        .single();
      const resolvedOk =
        resolved?.resolution_status === "resolved_remediated" &&
        resolved?.resolution_type === "manual_test";
      record(
        "gap_resolved",
        resolvedOk,
        `status=${resolved?.resolution_status} type=${resolved?.resolution_type}`,
      );
    } else {
      record("manual_test_create_attach", false, "skipped — no gap");
      record("gap_resolved", false, "skipped — no gap");
    }

    // Step 10 — re-project with manual tests
    const result2 = await runProjectionWorker(firmClientId, closePeriodId);
    const gapAc = (gap?.account_category as string) ?? GAP_PAIR.accountCategory;
    const gapAs = (gap?.assertion_id as string) ?? GAP_PAIR.assertionId;
    const { data: afterRow } = await db
      .from("close_assertion_coverage")
      .select("covering_manual_test_ids, evidence_strength, coverage_status, manual_test_ref")
      .eq("firm_client_id", firmClientId)
      .eq("close_period_id", closePeriodId)
      .eq("account_category", gapAc)
      .eq("assertion_id", gapAs)
      .maybeSingle();
    const ids = (afterRow?.covering_manual_test_ids as string[] | null) ?? [];
    const strength = afterRow?.evidence_strength as string;
    const strengthOk =
      ids.length > 0 && (strength === "moderate" || strength === "strong");
    record(
      "projection_worker_run2",
      strengthOk,
      `rowsWritten=${result2.rowsWritten} manual_ids=${ids.length} strength=${strength} status=${afterRow?.coverage_status}`,
    );

    // Step 11 — PDF in memory only
    const built = await buildSection({
      closePeriod,
      firmClient,
      supabase: db,
    });
    const statement = toAssertionCoverageStatement(built) as AssertionCoverageStatement | null;
    if (!statement) throw new Error(`section build failed: ${built?.error_message ?? "unknown"}`);
    const { buffer } = await generateAssertionCoverageStatementPdf(statement);
    const pdfOk =
      buffer.length > 2048 &&
      buffer.subarray(0, 5).toString("utf8") === "%PDF-";
    record(
      "coverage_statement_pdf",
      pdfOk,
      `bytes=${buffer.length} magic=${buffer.subarray(0, 5).toString("utf8")}`,
    );
  } catch (e) {
    const details =
      e instanceof Error
        ? e.message
        : typeof e === "object" && e !== null
          ? JSON.stringify(e)
          : String(e);
    record("unhandled", false, details);
  }

  if (doCleanup && firmClientId && engagementId && closePeriodId) {
    try {
      await cleanup(db, { firmClientId, engagementId, closePeriodId });
      record("cleanup", true, "synthetic rows deleted");
    } catch (e) {
      record("cleanup", false, e instanceof Error ? e.message : String(e));
    }
  }

  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.log(
    JSON.stringify([{ step: "fatal", ok: false, details: String(e) }], null, 2),
  );
  process.exit(1);
});
