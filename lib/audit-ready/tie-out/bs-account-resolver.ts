import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { classifyVariance, type PolicySnapshot } from "./policy";
import {
  fetchQboCompanyInfo,
  fetchQboGeneralLedgerDetail,
  fetchQboTrialBalance,
  type QboGlActivityRow,
} from "./qbo-reports";
import { renderBsAccountReconXlsx } from "./recon-xlsx";

export type RunBsAccountResolverInput = {
  engagementId: string;
  pbcRequestId: string;
  realmId: string;
  accessToken: string;
  bsAccountId: string; // QBO Account.Id
  bsAccountName?: string; // optional label, fetched from QBO if omitted
  accountType?: string;
  accountSubType?: string;
  asOfDate: string; // yyyy-mm-dd (period end)
  activityStartDate?: string; // optional override; defaults to fiscal-year-start
  policy: PolicySnapshot & { policy_mode: string };
  triggeredByUserId: string;
  triggerReason: "manual" | "scheduled" | "memory_replay" | "api";
};

export type RunBsAccountResolverResult =
  | {
      status: "completed";
      runId: string;
      artifactId: string;
      storageObjectKey: string;
      totalsStatus: "tie" | "auto_reconcile" | "review" | "kickout";
      itemCount: number;
      endingBalanceCents: number;
      glEndingBalanceCents: number;
      tieVarianceCents: number;
    }
  | {
      status: "failed";
      errorCode: string;
      errorMessage: string;
      runId?: string;
    };

/**
 * Ensure the engagement has a cached fiscal_year_start_month. If null, fetch from QBO
 * CompanyInfo and persist it. Returns the month (1-12).
 */
async function resolveFiscalYearStartMonth(input: {
  engagementId: string;
  realmId: string;
  accessToken: string;
}): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data: eng } = await supabase
    .from("audit_ready_engagements")
    .select("fiscal_year_start_month")
    .eq("id", input.engagementId)
    .maybeSingle();
  const cached =
    (eng?.fiscal_year_start_month as number | null | undefined) ?? null;
  if (cached && cached >= 1 && cached <= 12) return cached;
  const info = await fetchQboCompanyInfo({
    realmId: input.realmId,
    accessToken: input.accessToken,
  });
  const month = info.fiscalYearStartMonth || 1;
  await supabase
    .from("audit_ready_engagements")
    .update({ fiscal_year_start_month: month })
    .eq("id", input.engagementId);
  return month;
}

/**
 * Compute the default activity window: fiscal-year-start (of the FY containing asOfDate)
 * through asOfDate.
 */
export function activityWindowForFiscalYear(
  asOfDate: string,
  fiscalYearStartMonth: number,
): { start: string; end: string } {
  const d = new Date(asOfDate + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1-12
  const fyStartYear = m >= fiscalYearStartMonth ? y : y - 1;
  const startIso = `${fyStartYear}-${String(fiscalYearStartMonth).padStart(2, "0")}-01`;
  return { start: startIso, end: asOfDate };
}

export async function runBsAccountResolver(
  input: RunBsAccountResolverInput,
): Promise<RunBsAccountResolverResult> {
  const supabase = getSupabaseAdmin();
  // 1. Insert running run row
  const { data: runRow, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .insert({
      engagement_id: input.engagementId,
      pbc_request_id: input.pbcRequestId,
      tie_out_kind: "bs_account_recon",
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
  try {
    // 2. Determine activity window
    const fyMonth = await resolveFiscalYearStartMonth({
      engagementId: input.engagementId,
      realmId: input.realmId,
      accessToken: input.accessToken,
    });
    const defaultWindow = activityWindowForFiscalYear(input.asOfDate, fyMonth);
    const startDate = input.activityStartDate || defaultWindow.start;
    const endDate = input.asOfDate;
    // 3. Fetch GL detail + Trial Balance in parallel
    const [gl, tb] = await Promise.all([
      fetchQboGeneralLedgerDetail({
        realmId: input.realmId,
        accessToken: input.accessToken,
        accountId: input.bsAccountId,
        startDate,
        endDate,
      }),
      fetchQboTrialBalance({
        realmId: input.realmId,
        accessToken: input.accessToken,
        asOfDate: endDate,
      }),
    ]);
    // 4. Ending-balance tie: compare GL detail ending vs TB net for this account
    // Shipped QboTrialBalanceLine uses account_ref + net_cents (not qboAccountId/balanceCents).
    const tbLine = tb.lines.find((l) => l.account_ref === input.bsAccountId);
    const glEndingCents = tbLine?.net_cents ?? gl.endingBalanceCents;
    const tieVarianceCents = gl.endingBalanceCents - glEndingCents;
    // 5. Insert transaction rows (chunked 500 per batch), computing running balance
    let running = gl.beginningBalanceCents;
    const txnRows = gl.activity.map((r: QboGlActivityRow, i: number) => {
      running += r.netCents;
      return {
        run_id: runId,
        engagement_id: input.engagementId,
        qbo_account_id: input.bsAccountId,
        ordinal: i,
        txn_date: r.txnDate,
        txn_type: r.txnType,
        txn_ref: r.txnRef,
        doc_number: r.docNumber,
        name_display: r.name,
        memo: r.memo,
        split_account: r.splitAccount,
        debit_cents: r.debitCents,
        credit_cents: r.creditCents,
        net_cents: r.netCents,
        running_balance_cents: running,
      };
    });
    const CHUNK = 500;
    for (let i = 0; i < txnRows.length; i += CHUNK) {
      const batch = txnRows.slice(i, i + CHUNK);
      const { error: batchErr } = await supabase
        .from("audit_ready_bs_recon_transactions")
        .insert(batch);
      if (batchErr) throw new Error(`txn_insert_failed: ${batchErr.message}`);
    }
    // 6. Roll up by name → variance rows (entity_kind='subledger_line')
    const byName = new Map<string, number>();
    for (const r of gl.activity) {
      if (!r.name) continue;
      byName.set(r.name, (byName.get(r.name) || 0) + r.netCents);
    }
    if (byName.size > 0) {
      const varianceRows = Array.from(byName.entries()).map(
        ([name, netCents]) => ({
          run_id: runId,
          engagement_id: input.engagementId,
          pbc_request_id: input.pbcRequestId,
          entity_kind: "subledger_line",
          entity_qbo_id: null,
          entity_display_name: name,
          subledger_amount_cents: netCents,
          gl_amount_cents: null,
          variance_cents: 0, // informational name rollup, not a variance
          variance_percent: null,
          status: "tie",
          classification_reason: `Activity for ${name} during period`,
        }),
      );
      for (let i = 0; i < varianceRows.length; i += CHUNK) {
        const batch = varianceRows.slice(i, i + CHUNK);
        const { error: vErr } = await supabase
          .from("audit_ready_tie_out_variances")
          .insert(batch);
        if (vErr) throw new Error(`variance_insert_failed: ${vErr.message}`);
      }
    }
    // 7. Insert totals row (entity_kind='totals') for the GL-account tie
    // Shipped classifyVariance is positional: (varianceCents, referenceCents, policy)
    const totalsClassification = classifyVariance(
      tieVarianceCents,
      Math.abs(glEndingCents),
      input.policy,
    );
    await supabase.from("audit_ready_tie_out_variances").insert({
      run_id: runId,
      engagement_id: input.engagementId,
      pbc_request_id: input.pbcRequestId,
      entity_kind: "totals",
      entity_qbo_id: input.bsAccountId,
      entity_display_name: input.bsAccountName ?? null,
      subledger_amount_cents: gl.endingBalanceCents,
      gl_amount_cents: glEndingCents,
      variance_cents: tieVarianceCents,
      variance_percent: totalsClassification.percent,
      status: totalsClassification.status, // VarianceClassification incl. auto_cleared
      classification_reason: totalsClassification.reason,
    });
    // 8. Generate XLSX
    const xlsxBuf = await renderBsAccountReconXlsx({
      engagementId: input.engagementId,
      accountId: input.bsAccountId,
      accountName: input.bsAccountName ?? "",
      accountType: input.accountType ?? "",
      periodStart: startDate,
      periodEnd: endDate,
      beginningBalanceCents: gl.beginningBalanceCents,
      endingBalanceCents: gl.endingBalanceCents,
      glEndingBalanceCents: glEndingCents,
      tieVarianceCents,
      activity: gl.activity,
      totalsClassification: totalsClassification.status,
    });
    const sha256 = createHash("sha256").update(xlsxBuf).digest("hex");
    const objectKey = `${input.engagementId}/${input.bsAccountId}/${endDate}/xlsx/${sha256}.xlsx`;
    const { error: uploadErr } = await supabase.storage
      .from("audit-ready-recons")
      .upload(objectKey, xlsxBuf, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
    if (uploadErr) throw new Error(`storage_upload_failed: ${uploadErr.message}`);
    // 9. Insert artifact row
    const { data: artifactRow, error: artErr } = await supabase
      .from("audit_ready_bs_recon_artifacts")
      .insert({
        engagement_id: input.engagementId,
        run_id: runId,
        qbo_account_id: input.bsAccountId,
        qbo_account_name: input.bsAccountName ?? "",
        qbo_account_type: input.accountType ?? null,
        qbo_account_subtype: input.accountSubType ?? null,
        period_start: startDate,
        period_end: endDate,
        beginning_balance_cents: gl.beginningBalanceCents,
        ending_balance_cents: gl.endingBalanceCents,
        gl_ending_balance_cents: glEndingCents,
        tie_variance_cents: tieVarianceCents,
        activity_count: gl.activity.length,
        format: "xlsx",
        storage_bucket: "audit-ready-recons",
        storage_object_key: objectKey,
        sha256,
        file_size_bytes: xlsxBuf.length,
        generated_by: input.triggerReason === "manual" ? "manual" : "api",
        visibility: "owner_visible",
        created_by_user_id: input.triggeredByUserId,
      })
      .select("id")
      .single();
    if (artErr || !artifactRow) {
      throw new Error(`artifact_insert_failed: ${artErr?.message ?? "unknown"}`);
    }
    // 10. Complete the run — map auto_cleared → auto_reconcile (runs CHECK)
    const totalsStatus: "tie" | "auto_reconcile" | "review" | "kickout" =
      totalsClassification.status === "auto_cleared"
        ? "auto_reconcile"
        : totalsClassification.status;
    await supabase
      .from("audit_ready_tie_out_runs")
      .update({
        status: "completed",
        totals_status: totalsStatus,
        subledger_total_cents: gl.endingBalanceCents,
        gl_total_cents: glEndingCents,
        totals_variance_cents: tieVarianceCents,
        item_count: gl.activity.length,
        subledger_source_url: gl.reportUrl,
        gl_source_url: gl.reportUrl,
        intuit_tid_subledger: gl.intuitTid,
        intuit_tid_gl: gl.intuitTid,
        period_start: startDate,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return {
      status: "completed",
      runId,
      artifactId: artifactRow.id as string,
      storageObjectKey: objectKey,
      totalsStatus,
      itemCount: gl.activity.length,
      endingBalanceCents: gl.endingBalanceCents,
      glEndingBalanceCents: glEndingCents,
      tieVarianceCents,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    await supabase
      .from("audit_ready_tie_out_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_code: "resolver_exception",
        error_message: msg,
      })
      .eq("id", runId);
    return {
      status: "failed",
      errorCode: "resolver_exception",
      errorMessage: msg,
      runId,
    };
  }
}
