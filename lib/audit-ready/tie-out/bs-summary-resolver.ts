import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  runBsAccountResolver,
  type RunBsAccountResolverResult,
} from "./bs-account-resolver";
import {
  fetchQboBalanceSheet,
  type QboBalanceSheetLine,
  type QboBalanceSheetReportResult,
} from "./qbo-reports";
import { resolveAccountingBasis, type AccountingBasis } from "./basis";
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
   * Optional scope. When omitted or empty, every non-computed line from
   * the QBO BalanceSheet report is included. When provided, only lines
   * whose qboAccountId matches an entry are included; computed lines are
   * always excluded from this filter (they are not scopable).
   */
  bsAccountIds?: string[];
  /**
   * Test seam. Defaults to real QBO fetch + real per-account resolver.
   * Used exclusively by the vitest suite; production callers do not
   * pass these.
   */
  _balanceSheetLoader?: (params: {
    realmId: string;
    accessToken: string;
    asOfDate: string;
    accountingMethod: AccountingBasis;
  }) => Promise<QboBalanceSheetReportResult>;
  _basisResolver?: (params: {
    engagementId: string;
  }) => Promise<AccountingBasis>;
  _perAccountRunner?: (args: {
    engagementId: string;
    realmId: string;
    accessToken: string;
    asOfDate: string;
    account: QboBalanceSheetLine;
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

  // 1. Resolve accounting basis once — stamped on the summary artifact
  //    (not the parent tie_out_runs row). Basis is a property of the
  //    specific QBO report, not the orchestration run.
  const basisResolver = input._basisResolver ?? resolveAccountingBasis;
  const accountingMethod: AccountingBasis = await basisResolver({
    engagementId: input.engagementId,
  });

  // 2. Insert running rollup run row.
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
    // 3. Load QBO BalanceSheet report as source of truth. QBO's rollup
    //    rules (sub-accounts, computed Net Income line) are honored by
    //    definition — we render exactly what the client sees in QBO.
    const bsLoader = input._balanceSheetLoader ?? fetchQboBalanceSheet;
    const bsReport = await bsLoader({
      realmId: input.realmId,
      accessToken: input.accessToken,
      asOfDate: input.asOfDate,
      accountingMethod,
    });
    // Scope filter: bsAccountIds ONLY applies to non-computed lines.
    // Computed lines (Net Income) are always included when in-scope of
    // the report; they cannot be scoped away because they have no id.
    const scoped: QboBalanceSheetLine[] =
      input.bsAccountIds && input.bsAccountIds.length > 0
        ? bsReport.lines.filter(
            (l) =>
              l.isComputedLine ||
              (l.qboAccountId != null &&
                input.bsAccountIds!.includes(l.qboAccountId)),
          )
        : bsReport.lines;
    // 4. Preserve QBO's own sort order — no independent sort. Matching
    //    QBO exactly is the product decision (see 4B.3.5 planning doc).
    const accounts = [...scoped].sort((a, b) => a.sortOrder - b.sortOrder);

    // 5. Fiscal-year window — shipped signatures (positional + { start, end }).
    const fyStart = await resolveFiscalYearStartMonth({
      engagementId: input.engagementId,
      realmId: input.realmId,
      accessToken: input.accessToken,
    });
    const window = activityWindowForFiscalYear(input.asOfDate, fyStart);
    const startDate = window.start;
    const endDate = window.end;

    // 6. Fan out per-account (skip computed lines — no underlying account).
    const perAccountRunner =
      input._perAccountRunner ??
      (async (args) => {
        if (args.account.isComputedLine || args.account.qboAccountId == null) {
          throw new Error(
            "perAccountRunner should not be called for computed lines — filter upstream",
          );
        }
        return runBsAccountResolver({
          engagementId: args.engagementId,
          // Real PBC UUID (sentinel), not rollup runId — FK to pbc_requests.
          pbcRequestId,
          realmId: args.realmId,
          accessToken: args.accessToken,
          bsAccountId: args.account.qboAccountId,
          bsAccountName: args.account.qboAccountName,
          accountType: args.account.qboAccountType ?? "",
          classification: args.account.classification,
          policy: args.policy,
          triggeredByUserId: args.triggeredByUserId,
          triggerReason: args.triggerReason,
          asOfDate: args.asOfDate,
          activityStartDate: args.activityStartDate,
        });
      });

    // Accumulator for summary-lines batch insert (real + computed).
    // Columns match the audit_ready_bs_recon_summary_lines schema; every
    // NOT NULL column receives a value (0 for beginning/activity fields
    // we do not track per-line for BS reconciliation).
    const summaryLineInserts: Array<{
      qbo_account_id: string | null;
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
      is_computed_line: boolean;
      child_run_id: string | null;
      child_artifact_id: string | null;
      error_code: string | null;
      error_message: string | null;
    }> = [];

    for (const account of accounts) {
      const cls = account.classification;
      // Computed line (Net Income): insert with QBO-reported balance,
      // tautologically tied (variance=0), no underlying child run.
      if (account.isComputedLine || account.qboAccountId == null) {
        summaryLineInserts.push({
          qbo_account_id: null,
          qbo_account_name: account.qboAccountName,
          qbo_account_type: null,
          qbo_account_subtype: null,
          classification: cls,
          beginning_balance_cents: 0,
          ending_balance_cents: account.balanceCents,
          gl_ending_balance_cents: account.balanceCents,
          tie_variance_cents: 0,
          activity_count: 0,
          totals_status: "tie",
          sort_order: account.sortOrder,
          is_computed_line: true,
          child_run_id: null,
          child_artifact_id: null,
          error_code: null,
          error_message: null,
        });
        continue;
      }
      // Real account: run per-account tie-out.
      const res = await perAccountRunner({
        engagementId: input.engagementId,
        realmId: input.realmId,
        accessToken: input.accessToken,
        asOfDate: input.asOfDate,
        account,
        policy: input.policy,
        triggeredByUserId: input.triggeredByUserId,
        triggerReason: input.triggerReason,
        activityStartDate: startDate,
      });
      // Narrow the discriminated union before reading fields.
      if (res.status === "failed") {
        summaryLineInserts.push({
          qbo_account_id: account.qboAccountId,
          qbo_account_name: account.qboAccountName,
          qbo_account_type: account.qboAccountType,
          qbo_account_subtype: null,
          classification: cls,
          beginning_balance_cents: 0,
          ending_balance_cents: account.balanceCents,
          gl_ending_balance_cents: 0,
          tie_variance_cents: 0,
          activity_count: 0,
          totals_status: "failed",
          sort_order: account.sortOrder,
          is_computed_line: false,
          child_run_id: res.runId ?? null,
          child_artifact_id: null,
          error_code: res.errorCode ?? null,
          error_message: res.errorMessage ?? null,
        });
        continue;
      }
      // Completed: read the fields that actually exist on the type.
      summaryLineInserts.push({
        qbo_account_id: account.qboAccountId,
        qbo_account_name: account.qboAccountName,
        qbo_account_type: account.qboAccountType,
        qbo_account_subtype: null, // BS report does not carry subtype
        classification: cls,
        beginning_balance_cents: 0, // not tracked per-line for BS recon
        ending_balance_cents: res.endingBalanceCents,
        gl_ending_balance_cents: res.glEndingBalanceCents,
        tie_variance_cents: res.tieVarianceCents,
        activity_count: 0, // not tracked per-line for BS recon
        totals_status: res.totalsStatus,
        sort_order: account.sortOrder,
        is_computed_line: false,
        child_run_id: res.runId,
        child_artifact_id: res.artifactId,
        error_code: null,
        error_message: null,
      });
    }

    // Rollup: equation math iterates the summary lines (which include
    // QBO's computed Net Income under Equity). This is the source-of-
    // truth match against the QBO BalanceSheet report itself.
    //
    // Note: we sum ending_balance_cents (QBO-reported) rather than
    // gl_ending_balance_cents (per-account tie-out). The two agree
    // for real accounts (that IS the tie), and for computed lines
    // there is no GL-side value.
    let assetsCents = 0;
    let liabilitiesCents = 0;
    let equityCents = 0;
    for (const line of summaryLineInserts) {
      if (line.classification === "Asset") {
        assetsCents += line.ending_balance_cents;
      } else if (line.classification === "Liability") {
        liabilitiesCents += line.ending_balance_cents;
      } else {
        // Equity — includes computed Net Income line.
        equityCents += line.ending_balance_cents;
      }
    }
    const bsEquationVarianceCents =
      assetsCents - (liabilitiesCents + equityCents);

    const realLines = summaryLineInserts.filter((l) => !l.is_computed_line);
    const totalsVarianceCents = realLines.reduce(
      (s, l) => s + Math.abs(l.tie_variance_cents),
      0,
    );
    // Use real vocabulary from RunBsAccountResolverResult (`auto_reconcile`,
    // not amendment's `auto_cleared`).
    const cTie = realLines.filter((l) => l.totals_status === "tie").length;
    const cAuto = realLines.filter(
      (l) => l.totals_status === "auto_reconcile",
    ).length;
    const cReview = realLines.filter((l) => l.totals_status === "review").length;
    const cKick = realLines.filter((l) => l.totals_status === "kickout").length;
    const cFail = realLines.filter((l) => l.totals_status === "failed").length;

    const bsEquationStatus: "tie" | "kickout" =
      bsEquationVarianceCents === 0 ? "tie" : "kickout";
    const totalsStatus: "tie" | "kickout" =
      bsEquationStatus === "tie" && cFail === 0 && cKick === 0
        ? "tie"
        : "kickout";

    const pdfLines: BsSummaryPdfLine[] = summaryLineInserts.map((l) => ({
      classification: l.classification,
      accountName: l.qbo_account_name,
      accountType: l.qbo_account_type ?? "",
      endingCents: l.ending_balance_cents,
      glEndingCents: l.gl_ending_balance_cents,
      varianceCents: l.tie_variance_cents,
      status: l.totals_status,
      isComputedLine: l.is_computed_line,
    }));

    // 7. Render deterministic PDF.
    const pdfBuf = await renderBsSummaryPdf({
      engagementId: input.engagementId,
      periodStart: startDate,
      periodEnd: endDate,
      lines: pdfLines,
      assetsEndingCents: assetsCents,
      liabilitiesEndingCents: liabilitiesCents,
      equityEndingCents: equityCents,
      bsEquationVarianceCents,
      bsEquationStatus,
      accountCountTotal: summaryLineInserts.length,
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

    // 8. Insert summary artifact.
    const { data: artRow, error: artErr } = await supabase
      .from("audit_ready_bs_recon_summary_artifacts")
      .insert({
        engagement_id: input.engagementId,
        run_id: runId,
        period_start: startDate,
        period_end: endDate,
        accounting_method: accountingMethod,
        account_count_total: summaryLineInserts.length,
        account_count_tie: cTie,
        account_count_auto_reconcile: cAuto,
        account_count_review: cReview,
        account_count_kickout: cKick,
        account_count_failed: cFail,
        assets_ending_cents: assetsCents,
        liabilities_ending_cents: liabilitiesCents,
        equity_ending_cents: equityCents,
        bs_equation_variance_cents: bsEquationVarianceCents,
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

    // 9. Batched insert of all summary lines (real + computed) after
    //    the summary artifact has been created upstream.
    if (summaryLineInserts.length > 0) {
      const { error: insertErr } = await supabase
        .from("audit_ready_bs_recon_summary_lines")
        .insert(
          summaryLineInserts.map((row) => ({
            ...row,
            engagement_id: input.engagementId,
            run_id: runId,
            summary_artifact_id: summaryArtifactId,
          })),
        );
      if (insertErr) {
        throw new Error(`lines_insert_failed: ${insertErr.message}`);
      }
    }

    // 10. Complete the run. Include per-classification counts, duration,
    // and BS-equation-side totals so downstream consumers (4B.4 monthly
    // cron notifications, admin dashboards) can read the run row alone
    // without joining the summary artifact.
    //
    // totals_variance_cents = sum of abs(tie variance) on REAL lines only
    // (not the equation variance — that lives on the artifact as
    // bs_equation_variance_cents / return.bsEquationVarianceCents).
    const runFinishedAtMs = Date.now();
    await supabase
      .from("audit_ready_tie_out_runs")
      .update({
        status: "completed",
        totals_status: totalsStatus,
        item_count: summaryLineInserts.length,
        item_auto_reconcile_count: cAuto,
        item_review_count: cReview,
        item_kickout_count: cKick,
        duration_ms: runFinishedAtMs - runStartedAtMs,
        subledger_total_cents: assetsCents,
        gl_total_cents: liabilitiesCents + equityCents,
        totals_variance_cents: totalsVarianceCents,
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
      accountCountTotal: summaryLineInserts.length,
      accountCountTie: cTie,
      accountCountAutoReconcile: cAuto,
      accountCountReview: cReview,
      accountCountKickout: cKick,
      accountCountFailed: cFail,
      assetsEndingCents: assetsCents,
      liabilitiesEndingCents: liabilitiesCents,
      equityEndingCents: equityCents,
      bsEquationVarianceCents,
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
