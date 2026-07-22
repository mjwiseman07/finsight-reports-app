import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  runBsAccountResolver,
  type RunBsAccountResolverResult,
} from "./bs-account-resolver";
import {
  fetchQboAccountList,
  type QboAccountListEntry,
} from "./qbo-reports";
import {
  activityWindowForFiscalYear,
  resolveFiscalYearStartMonth,
} from "./fiscal-year";
import type { PolicySnapshot } from "./policy";
import { renderBsSummaryPdf, type BsSummaryPdfLine } from "./bs-summary-pdf";
import { createHash } from "node:crypto";

export type RunBsSummaryResolverInput = {
  engagementId: string;
  realmId: string;
  accessToken: string;
  asOfDate: string; // yyyy-mm-dd
  policy: PolicySnapshot & { policy_mode: string };
  triggeredByUserId: string;
  triggerReason: "manual" | "scheduled" | "memory_replay" | "api";
  /**
   * Optional scope. When omitted or empty, every active BS account
   * returned by fetchQboAccountList is included.
   */
  bsAccountIds?: string[];
  /**
   * Test seam. Defaults to real QBO fetch + real per-account resolver.
   * Used exclusively by the vitest suite; production callers do not
   * pass these.
   */
  _accountsLoader?: (params: {
    realmId: string;
    accessToken: string;
  }) => Promise<QboAccountListEntry[]>;
  _perAccountRunner?: (args: {
    engagementId: string;
    realmId: string;
    accessToken: string;
    asOfDate: string;
    account: QboAccountListEntry;
    policy: PolicySnapshot & { policy_mode: string };
    triggeredByUserId: string;
    triggerReason:
      | "manual"
      | "scheduled"
      | "memory_replay"
      | "api";
    activityStartDate?: string;
  }) => Promise<RunBsAccountResolverResult>;
};

export type RunBsSummaryResolverResult =
  | {
      status: "completed";
      runId: string;
      summaryArtifactId: string;
      storageObjectKey: string;
      totalsStatus: "tie" | "kickout";
      accountCountTotal: number;
      accountCountTie: number;
      accountCountAutoReconcile: number;
      accountCountReview: number;
      accountCountKickout: number;
      accountCountFailed: number;
      assetsEndingCents: number;
      liabilitiesEndingCents: number;
      equityEndingCents: number;
      bsEquationVarianceCents: number;
    }
  | {
      status: "failed";
      errorCode: string;
      errorMessage: string;
      runId?: string;
    };

/** Stable per-engagement PBC row so rollup runs satisfy NOT NULL FK. */
const BS_SUMMARY_PBC_SENTINEL = "SYS-ROLLUP-BS-RECON-SUMMARY";

/**
 * audit_ready_tie_out_runs.pbc_request_id is uuid NOT NULL → FK to
 * audit_ready_pbc_requests. Rollup runs need one stable sentinel PBC row
 * per engagement to satisfy that FK without polluting the PBC inbox with
 * one row per run.
 *
 * Identity: (engagement_id, request_number='SYS-ROLLUP-BS-RECON-SUMMARY',
 * tie_out_kind='bs_recon_summary'). Enforced at the DB layer by partial
 * UNIQUE index audit_ready_pbc_requests_sys_rollup_sentinel_key.
 *
 * Status: 'accepted' — terminal PBC state meaning "no further bookkeeper
 * action required". Semantically correct for a system-managed anchor and
 * avoids extending the status CHECK constraint.
 *
 * Race handling: get-or-create with a re-SELECT on unique-violation (Postgres
 * SQLSTATE 23505) so concurrent first-time callers converge on the row
 * created by whichever transaction committed first.
 */
async function ensureBsSummaryPbcAnchor(
  engagementId: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  // Fast path: sentinel already exists.
  const { data: existing } = await supabase
    .from("audit_ready_pbc_requests")
    .select("id")
    .eq("engagement_id", engagementId)
    .eq("request_number", BS_SUMMARY_PBC_SENTINEL)
    .eq("tie_out_kind", "bs_recon_summary")
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  // First-time path: insert. The partial UNIQUE index will reject a
  // concurrent second insert with SQLSTATE 23505; in that case, re-SELECT.
  const { data: created, error } = await supabase
    .from("audit_ready_pbc_requests")
    .insert({
      engagement_id: engagementId,
      request_number: BS_SUMMARY_PBC_SENTINEL,
      request_description:
        "System-managed sentinel PBC anchor for engagement-level BS recon summary rollup runs. Not visible in the bookkeeper PBC inbox; identified by the SYS-ROLLUP-* request_number prefix. Do not modify.",
      tie_out_kind: "bs_recon_summary",
      status: "accepted",
    })
    .select("id")
    .single();
  if (created?.id && !error) return created.id as string;
  // Race lost — another concurrent caller just inserted the sentinel.
  // supabase-js surfaces Postgres error codes on error.code.
  const pgCode = (error as { code?: string } | null)?.code;
  if (pgCode === "23505") {
    const { data: reread, error: rereadErr } = await supabase
      .from("audit_ready_pbc_requests")
      .select("id")
      .eq("engagement_id", engagementId)
      .eq("request_number", BS_SUMMARY_PBC_SENTINEL)
      .eq("tie_out_kind", "bs_recon_summary")
      .single();
    if (reread?.id && !rereadErr) return reread.id as string;
    throw new Error(
      `pbc_anchor_reselect_failed: ${rereadErr?.message ?? "unknown"}`,
    );
  }
  throw new Error(
    `pbc_anchor_insert_failed: ${error?.message ?? "unknown"}`,
  );
}

function classificationOf(
  a: QboAccountListEntry,
): "Asset" | "Liability" | "Equity" | null {
  const c = (a.classification || "").toLowerCase();
  if (c === "asset") return "Asset";
  if (c === "liability") return "Liability";
  if (c === "equity") return "Equity";
  return null;
}

function classificationRank(c: "Asset" | "Liability" | "Equity"): number {
  if (c === "Asset") return 0;
  if (c === "Liability") return 1;
  return 2;
}

export async function runBsSummaryResolver(
  input: RunBsSummaryResolverInput,
): Promise<RunBsSummaryResolverResult> {
  const supabase = getSupabaseAdmin();

  let pbcRequestId: string;
  try {
    pbcRequestId = await ensureBsSummaryPbcAnchor(input.engagementId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return {
      status: "failed",
      errorCode: "pbc_anchor_failed",
      errorMessage: msg,
    };
  }

  // 1. Insert running rollup run row.
  const { data: runRow, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .insert({
      engagement_id: input.engagementId,
      pbc_request_id: pbcRequestId,
      tie_out_kind: "bs_recon_summary",
      status: "running",
      policy_mode: input.policy.policy_mode,
      auto_reconcile_max_dollar: input.policy.auto_reconcile_max_dollar,
      auto_reconcile_max_percent: input.policy.auto_reconcile_max_percent,
      kickout_min_dollar: input.policy.kickout_min_dollar,
      kickout_min_percent: input.policy.kickout_min_percent,
      authoritative_comparison: input.policy.authoritative_comparison,
      triggered_by_user_id: input.triggeredByUserId,
      trigger_reason: input.triggerReason,
      period_end: input.asOfDate,
    })
    .select("id")
    .single();
  if (runErr || !runRow) {
    return {
      status: "failed",
      errorCode: "run_insert_failed",
      errorMessage: runErr?.message ?? "insert failed",
    };
  }
  const runId = runRow.id as string;
  const runStartedAtMs = Date.now();
  try {
    // 2. Load BS-only account universe.
    const loader = input._accountsLoader ?? fetchQboAccountList;
    const allBs = await loader({
      realmId: input.realmId,
      accessToken: input.accessToken,
    });
    const scoped =
      input.bsAccountIds && input.bsAccountIds.length > 0
        ? allBs.filter((a) => input.bsAccountIds!.includes(a.id))
        : allBs;
    // Deterministic order: classification rank, then case-insensitive name.
    const accounts = [...scoped]
      .filter((a) => classificationOf(a) !== null)
      .sort((x, y) => {
        const cx = classificationRank(
          classificationOf(x) as "Asset" | "Liability" | "Equity",
        );
        const cy = classificationRank(
          classificationOf(y) as "Asset" | "Liability" | "Equity",
        );
        if (cx !== cy) return cx - cy;
        return x.name.localeCompare(y.name, undefined, {
          sensitivity: "base",
        });
      });
    // 3. Fiscal-year window — shipped signatures (positional + { start, end }).
    const fyStart = await resolveFiscalYearStartMonth({
      engagementId: input.engagementId,
      realmId: input.realmId,
      accessToken: input.accessToken,
    });
    const window = activityWindowForFiscalYear(input.asOfDate, fyStart);
    const startDate = window.start;
    const endDate = window.end;
    // 4. Fan out per-account.
    const perAccountRunner =
      input._perAccountRunner ??
      (async (args) => {
        const cls = classificationOf(args.account);
        if (cls === null) {
          // Guard: accounts array was already filtered to BS-only above,
          // so this branch is unreachable in practice. Return a synthetic
          // failure to make the type checker happy without throwing.
          return {
            status: "failed" as const,
            errorCode: "non_bs_classification",
            errorMessage: `Account ${args.account.id} lacks a BS classification`,
          };
        }
        return runBsAccountResolver({
          engagementId: args.engagementId,
          // Real PBC UUID (sentinel), not rollup runId — FK to pbc_requests.
          pbcRequestId,
          realmId: args.realmId,
          accessToken: args.accessToken,
          bsAccountId: args.account.id,
          bsAccountName: args.account.name,
          accountType: args.account.accountType,
          accountSubType: args.account.accountSubType ?? undefined,
          classification: cls,
          asOfDate: args.asOfDate,
          activityStartDate: args.activityStartDate,
          policy: args.policy,
          triggeredByUserId: args.triggeredByUserId,
          triggerReason: args.triggerReason,
        });
      });
    let assets = 0;
    let liabilities = 0;
    let equity = 0;
    let cTie = 0;
    let cAuto = 0;
    let cReview = 0;
    let cKick = 0;
    let cFail = 0;
    type LineRow = {
      run_id: string;
      engagement_id: string;
      child_run_id: string | null;
      child_artifact_id: string | null;
      qbo_account_id: string;
      qbo_account_name: string;
      qbo_account_type: string | null;
      qbo_account_subtype: string | null;
      classification: "Asset" | "Liability" | "Equity";
      beginning_balance_cents: number;
      ending_balance_cents: number;
      gl_ending_balance_cents: number;
      tie_variance_cents: number;
      activity_count: number;
      totals_status:
        | "tie"
        | "auto_reconcile"
        | "review"
        | "kickout"
        | "failed";
      sort_order: number;
      error_code: string | null;
      error_message: string | null;
    };
    const pdfLines: BsSummaryPdfLine[] = [];
    const rowsForInsert: LineRow[] = [];
    for (let idx = 0; idx < accounts.length; idx++) {
      const a = accounts[idx];
      const cls = classificationOf(a) as "Asset" | "Liability" | "Equity";
      const res = await perAccountRunner({
        engagementId: input.engagementId,
        realmId: input.realmId,
        accessToken: input.accessToken,
        asOfDate: input.asOfDate,
        account: a,
        policy: input.policy,
        triggeredByUserId: input.triggeredByUserId,
        triggerReason: input.triggerReason,
        activityStartDate: startDate,
      });
      if (res.status === "completed") {
        // Aggregate by classification. After the per-account resolver
        // applies normalizeTbNetToNaturalSign (see ./sign-normalize.ts),
        // glEndingBalanceCents is always in QBO's natural-sign convention:
        // assets positive (contra-assets negative), liabilities positive,
        // equity positive. This lets the BS equation below read literally
        // as assets = liabilities + equity.
        if (cls === "Asset") assets += res.glEndingBalanceCents;
        else if (cls === "Liability") liabilities += res.glEndingBalanceCents;
        else equity += res.glEndingBalanceCents;
        if (res.totalsStatus === "tie") cTie++;
        else if (res.totalsStatus === "auto_reconcile") cAuto++;
        else if (res.totalsStatus === "review") cReview++;
        else cKick++;
        rowsForInsert.push({
          run_id: runId,
          engagement_id: input.engagementId,
          child_run_id: res.runId,
          child_artifact_id: res.artifactId,
          qbo_account_id: a.id,
          qbo_account_name: a.name,
          qbo_account_type: a.accountType,
          qbo_account_subtype: a.accountSubType,
          classification: cls,
          // Per-account resolver does not return beginning balance yet.
          beginning_balance_cents: 0,
          ending_balance_cents: res.endingBalanceCents,
          gl_ending_balance_cents: res.glEndingBalanceCents,
          tie_variance_cents: res.tieVarianceCents,
          activity_count: 0,
          totals_status: res.totalsStatus,
          sort_order: idx,
          error_code: null,
          error_message: null,
        });
        pdfLines.push({
          classification: cls,
          accountName: a.name,
          accountType: a.accountType,
          endingCents: res.endingBalanceCents,
          glEndingCents: res.glEndingBalanceCents,
          varianceCents: res.tieVarianceCents,
          status: res.totalsStatus,
        });
      } else {
        cFail++;
        rowsForInsert.push({
          run_id: runId,
          engagement_id: input.engagementId,
          child_run_id: res.runId ?? null,
          child_artifact_id: null,
          qbo_account_id: a.id,
          qbo_account_name: a.name,
          qbo_account_type: a.accountType,
          qbo_account_subtype: a.accountSubType,
          classification: cls,
          beginning_balance_cents: 0,
          ending_balance_cents: 0,
          gl_ending_balance_cents: 0,
          tie_variance_cents: 0,
          activity_count: 0,
          totals_status: "failed",
          sort_order: idx,
          error_code: res.errorCode,
          error_message: res.errorMessage,
        });
        pdfLines.push({
          classification: cls,
          accountName: a.name,
          accountType: a.accountType,
          endingCents: 0,
          glEndingCents: 0,
          varianceCents: 0,
          status: "failed",
        });
      }
    }
    const bsEquationVariance = assets - (liabilities + equity);
    const bsEquationStatus: "tie" | "kickout" =
      bsEquationVariance === 0 ? "tie" : "kickout";
    const totalsStatus: "tie" | "kickout" =
      bsEquationStatus === "tie" && cFail === 0 && cKick === 0
        ? "tie"
        : "kickout";
    // 5. Render deterministic PDF.
    const pdfBuf = await renderBsSummaryPdf({
      engagementId: input.engagementId,
      periodStart: startDate,
      periodEnd: endDate,
      lines: pdfLines,
      assetsEndingCents: assets,
      liabilitiesEndingCents: liabilities,
      equityEndingCents: equity,
      bsEquationVarianceCents: bsEquationVariance,
      bsEquationStatus,
      accountCountTotal: accounts.length,
      accountCountTie: cTie,
      accountCountAutoReconcile: cAuto,
      accountCountReview: cReview,
      accountCountKickout: cKick,
      accountCountFailed: cFail,
    });
    const sha256 = createHash("sha256").update(pdfBuf).digest("hex");
    const objectKey = `${input.engagementId}/summary/${endDate}/pdf/${sha256}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("audit-ready-recons")
      .upload(objectKey, pdfBuf, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr)
      throw new Error(`storage_upload_failed: ${uploadErr.message}`);
    // 6. Insert summary artifact.
    const { data: artRow, error: artErr } = await supabase
      .from("audit_ready_bs_recon_summary_artifacts")
      .insert({
        engagement_id: input.engagementId,
        run_id: runId,
        period_start: startDate,
        period_end: endDate,
        account_count_total: accounts.length,
        account_count_tie: cTie,
        account_count_auto_reconcile: cAuto,
        account_count_review: cReview,
        account_count_kickout: cKick,
        account_count_failed: cFail,
        assets_ending_cents: assets,
        liabilities_ending_cents: liabilities,
        equity_ending_cents: equity,
        bs_equation_variance_cents: bsEquationVariance,
        bs_equation_status: bsEquationStatus,
        format: "pdf",
        storage_bucket: "audit-ready-recons",
        storage_object_key: objectKey,
        sha256,
        file_size_bytes: pdfBuf.length,
        generated_by: input.triggerReason === "manual" ? "manual" : "api",
        visibility: "owner_visible",
        created_by_user_id: input.triggeredByUserId,
      })
      .select("id")
      .single();
    if (artErr || !artRow) {
      throw new Error(
        `artifact_insert_failed: ${artErr?.message ?? "unknown"}`,
      );
    }
    const summaryArtifactId = artRow.id as string;
    // 7. Bulk insert lines with the artifact FK stamped in.
    const linesPayload = rowsForInsert.map((r) => ({
      ...r,
      summary_artifact_id: summaryArtifactId,
    }));
    if (linesPayload.length > 0) {
      const { error: linesErr } = await supabase
        .from("audit_ready_bs_recon_summary_lines")
        .insert(linesPayload);
      if (linesErr)
        throw new Error(`lines_insert_failed: ${linesErr.message}`);
    }
    // 8. Complete the run. Include per-classification counts, duration,
    // and BS-equation-side totals so downstream consumers (4B.4 monthly
    // cron notifications, admin dashboards) can read the run row alone
    // without joining the summary artifact.
    const runFinishedAtMs = Date.now();
    await supabase
      .from("audit_ready_tie_out_runs")
      .update({
        status: "completed",
        totals_status: totalsStatus,
        item_count: accounts.length,
        item_auto_reconcile_count: cAuto,
        item_review_count: cReview,
        item_kickout_count: cKick,
        duration_ms: runFinishedAtMs - runStartedAtMs,
        // For rollup runs, "subledger" and "gl" are semantically the
        // two sides of the BS equation. Store assets on one side and
        // liabilities+equity on the other so totals_variance_cents matches
        // the BS equation variance surfaced in the summary artifact.
        subledger_total_cents: assets,
        gl_total_cents: liabilities + equity,
        totals_variance_cents: bsEquationVariance,
        period_start: startDate,
        completed_at: new Date(runFinishedAtMs).toISOString(),
      })
      .eq("id", runId);
    return {
      status: "completed",
      runId,
      summaryArtifactId,
      storageObjectKey: objectKey,
      totalsStatus,
      accountCountTotal: accounts.length,
      accountCountTie: cTie,
      accountCountAutoReconcile: cAuto,
      accountCountReview: cReview,
      accountCountKickout: cKick,
      accountCountFailed: cFail,
      assetsEndingCents: assets,
      liabilitiesEndingCents: liabilities,
      equityEndingCents: equity,
      bsEquationVarianceCents: bsEquationVariance,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    await supabase
      .from("audit_ready_tie_out_runs")
      .update({
        status: "failed",
        error_message: msg,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return {
      status: "failed",
      errorCode: "resolver_failed",
      errorMessage: msg,
      runId,
    };
  }
}
