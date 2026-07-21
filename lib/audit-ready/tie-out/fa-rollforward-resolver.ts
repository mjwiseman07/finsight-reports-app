import { createHash } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { type PolicySnapshot } from "./policy";
import {
  fetchQboAccountList,
  fetchQboGeneralLedgerDetail,
  fetchQboTrialBalance,
  isFaAccumDeprSubType,
  isFaCostAccountType,
  type QboAccountListEntry,
  type QboGlActivityRow,
} from "./qbo-reports";
import { renderFaRollforwardPdf } from "./fa-rollforward-pdf";
import {
  activityWindowForFiscalYear,
  resolveFiscalYearStartMonth,
} from "./fiscal-year";

export type RunFaRollforwardResolverInput = {
  engagementId: string;
  pbcRequestId: string;
  realmId: string;
  accessToken: string;
  asOfDate: string; // yyyy-mm-dd
  activityStartDate?: string; // defaults to fiscal-year-start
  policy: PolicySnapshot & { policy_mode: string };
  triggeredByUserId: string;
  triggerReason: "manual" | "scheduled" | "memory_replay" | "api";
};

export type RunFaRollforwardResolverResult =
  | {
      status: "completed";
      runId: string;
      artifactId: string;
      storageObjectKey: string;
      totalsStatus: "tie" | "auto_reconcile" | "review" | "kickout";
      itemCount: number;
      costEndingCents: number;
      accumEndingCents: number;
      nbvEndingCents: number;
    }
  | {
      status: "failed";
      errorCode: string;
      errorMessage: string;
      runId?: string;
    };

type FaLine = {
  side: "cost" | "accum";
  bucket: "addition" | "disposal" | "depreciation" | "reclass" | "other";
  ordinal: number;
  qboAccountId: string;
  qboAccountName: string;
  txnDate: string;
  txnType: string;
  docNumber: string | null;
  nameDisplay: string | null;
  memo: string | null;
  splitAccount: string | null;
  debitCents: number;
  creditCents: number;
  signedCents: number;
};

function classifyActivity(
  row: QboGlActivityRow,
  side: "cost" | "accum",
): "addition" | "disposal" | "depreciation" | "reclass" | "other" {
  const type = (row.txnType ?? "").toLowerCase();
  const memo = (row.memo ?? "").toLowerCase();
  if (side === "cost") {
    if (
      type.includes("bill") ||
      type.includes("check") ||
      type.includes("purchase") ||
      type.includes("cc expense") ||
      type.includes("credit card")
    ) {
      return "addition";
    }
    if (
      memo.includes("dispos") ||
      type.includes("credit memo") ||
      (row.creditCents ?? 0) > 0
    ) {
      return "disposal";
    }
    if (memo.includes("reclass") || type.includes("journal entry")) {
      return "reclass";
    }
    return (row.debitCents ?? 0) > 0 ? "addition" : "other";
  }
  // accum side: depreciation is a credit; disposal is a debit that removes accum
  if (
    memo.includes("depreciation") ||
    memo.includes("depr") ||
    type.includes("depreciation")
  ) {
    return "depreciation";
  }
  if (memo.includes("dispos")) return "disposal";
  if (memo.includes("reclass")) return "reclass";
  return (row.creditCents ?? 0) > 0 ? "depreciation" : "other";
}

export async function runFaRollforwardResolver(
  input: RunFaRollforwardResolverInput,
): Promise<RunFaRollforwardResolverResult> {
  const supabase = getSupabaseAdmin();
  const { data: runRow, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .insert({
      engagement_id: input.engagementId,
      pbc_request_id: input.pbcRequestId,
      tie_out_kind: "fixed_asset_rollforward",
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
    const accounts = await fetchQboAccountList({
      realmId: input.realmId,
      accessToken: input.accessToken,
    });
    const faCostAccounts = accounts.filter(
      (a) =>
        isFaCostAccountType(a.accountType) &&
        !isFaAccumDeprSubType(a.accountSubType),
    );
    const faAccumAccounts = accounts.filter((a) =>
      isFaAccumDeprSubType(a.accountSubType),
    );
    if (faCostAccounts.length === 0) {
      throw new Error("no_fixed_asset_accounts");
    }

    const fyMonth = await resolveFiscalYearStartMonth({
      engagementId: input.engagementId,
      realmId: input.realmId,
      accessToken: input.accessToken,
    });
    const defaultWindow = activityWindowForFiscalYear(input.asOfDate, fyMonth);
    const startDate = input.activityStartDate || defaultWindow.start;
    const endDate = input.asOfDate;

    const allAccounts: Array<QboAccountListEntry & { side: "cost" | "accum" }> =
      [
        ...faCostAccounts.map((a) => ({ ...a, side: "cost" as const })),
        ...faAccumAccounts.map((a) => ({ ...a, side: "accum" as const })),
      ];

    let costBeg = 0;
    let costAdds = 0;
    let costDisp = 0;
    let costReclass = 0;
    let costEnd = 0;
    let accumBeg = 0;
    let accumDepr = 0;
    let accumDisp = 0;
    let accumReclass = 0;
    let accumEnd = 0;
    const lines: FaLine[] = [];

    for (const acct of allAccounts) {
      const gl = await fetchQboGeneralLedgerDetail({
        realmId: input.realmId,
        accessToken: input.accessToken,
        accountId: acct.id,
        startDate,
        endDate,
      });
      if (acct.side === "cost") {
        costBeg += gl.beginningBalanceCents;
        costEnd += gl.endingBalanceCents;
      } else {
        // Accum GL balances are typically credit (negative net on debit-credit).
        // Store as positive credit balances for roll-forward presentation.
        accumBeg += Math.abs(gl.beginningBalanceCents);
        accumEnd += Math.abs(gl.endingBalanceCents);
      }
      for (const row of gl.activity) {
        const bucket = classifyActivity(row, acct.side);
        const signed =
          acct.side === "cost"
            ? (row.debitCents ?? 0) - (row.creditCents ?? 0)
            : (row.creditCents ?? 0) - (row.debitCents ?? 0);
        lines.push({
          side: acct.side,
          bucket,
          ordinal: lines.length,
          qboAccountId: acct.id,
          qboAccountName: acct.name,
          txnDate: row.txnDate ?? endDate,
          txnType: row.txnType ?? "",
          docNumber: row.docNumber ?? null,
          // Shipped QboGlActivityRow uses `name`, not `nameDisplay`.
          nameDisplay: row.name ?? null,
          memo: row.memo ?? null,
          splitAccount: row.splitAccount ?? null,
          debitCents: row.debitCents ?? 0,
          creditCents: row.creditCents ?? 0,
          signedCents: signed,
        });
        if (acct.side === "cost") {
          if (bucket === "addition") costAdds += signed;
          else if (bucket === "disposal") costDisp += Math.abs(signed);
          else if (bucket === "reclass") costReclass += signed;
        } else {
          if (bucket === "depreciation") accumDepr += signed;
          else if (bucket === "disposal") accumDisp += Math.abs(signed);
          else if (bucket === "reclass") accumReclass += signed;
        }
      }
    }

    // Shipped fetchQboTrialBalance returns { lines: QboTrialBalanceLine[] }
    // with account_ref / debit_cents / credit_cents / net_cents — not accounts/accountId.
    const tb = await fetchQboTrialBalance({
      realmId: input.realmId,
      accessToken: input.accessToken,
      asOfDate: endDate,
    });
    const costIdSet = new Set(faCostAccounts.map((a) => a.id));
    const accumIdSet = new Set(faAccumAccounts.map((a) => a.id));
    const costGlEnd = tb.lines
      .filter((r) => r.account_ref != null && costIdSet.has(r.account_ref))
      .reduce((sum, r) => sum + r.net_cents, 0);
    const accumGlEnd = tb.lines
      .filter((r) => r.account_ref != null && accumIdSet.has(r.account_ref))
      .reduce((sum, r) => sum + Math.abs(r.net_cents), 0);
    const costVariance = costEnd - costGlEnd;
    const accumVariance = accumEnd - accumGlEnd;
    const nbvBeg = costBeg - accumBeg;
    const nbvEnd = costEnd - accumEnd;

    const pdfBuf = await renderFaRollforwardPdf({
      engagementId: input.engagementId,
      periodStart: startDate,
      periodEnd: endDate,
      costBeg,
      costAdds,
      costDisp,
      costReclass,
      costEnd,
      costGlEnd,
      costVariance,
      accumBeg,
      accumDepr,
      accumDisp,
      accumReclass,
      accumEnd,
      accumGlEnd,
      accumVariance,
      nbvBeg,
      nbvEnd,
      costAccounts: faCostAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        subType: a.accountSubType ?? "",
      })),
      accumAccounts: faAccumAccounts.map((a) => ({
        id: a.id,
        name: a.name,
        subType: a.accountSubType ?? "",
      })),
      lines,
    });
    const sha256 = createHash("sha256").update(pdfBuf).digest("hex");
    const objectKey = `${input.engagementId}/fa/${endDate}/pdf/${sha256}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("audit-ready-recons")
      .upload(objectKey, pdfBuf, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (uploadErr) {
      throw new Error(`storage_upload_failed: ${uploadErr.message}`);
    }

    const { data: artifactRow, error: artErr } = await supabase
      .from("audit_ready_fa_rollforward_artifacts")
      .insert({
        engagement_id: input.engagementId,
        run_id: runId,
        scope_kind: "all_fixed_assets",
        scope_key: "all",
        scope_label: "All Fixed Assets",
        period_start: startDate,
        period_end: endDate,
        cost_beginning_cents: costBeg,
        cost_additions_cents: costAdds,
        cost_disposals_cents: costDisp,
        cost_reclass_cents: costReclass,
        cost_ending_cents: costEnd,
        cost_gl_ending_cents: costGlEnd,
        cost_variance_cents: costVariance,
        accum_beginning_cents: accumBeg,
        accum_depreciation_cents: accumDepr,
        accum_disposals_cents: accumDisp,
        accum_reclass_cents: accumReclass,
        accum_ending_cents: accumEnd,
        accum_gl_ending_cents: accumGlEnd,
        accum_variance_cents: accumVariance,
        nbv_beginning_cents: nbvBeg,
        nbv_ending_cents: nbvEnd,
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
    if (artErr || !artifactRow) {
      throw new Error(`artifact_insert_failed: ${artErr?.message ?? "unknown"}`);
    }
    const artifactId = artifactRow.id as string;

    const lineRows = lines.map((ln) => ({
      artifact_id: artifactId,
      run_id: runId,
      engagement_id: input.engagementId,
      qbo_account_id: ln.qboAccountId,
      qbo_account_name: ln.qboAccountName,
      side: ln.side,
      bucket: ln.bucket,
      ordinal: ln.ordinal,
      txn_date: ln.txnDate,
      txn_type: ln.txnType,
      doc_number: ln.docNumber,
      name_display: ln.nameDisplay,
      memo: ln.memo,
      split_account: ln.splitAccount,
      debit_cents: ln.debitCents,
      credit_cents: ln.creditCents,
      signed_cents: ln.signedCents,
    }));
    const CHUNK = 500;
    for (let i = 0; i < lineRows.length; i += CHUNK) {
      const batch = lineRows.slice(i, i + CHUNK);
      const { error: batchErr } = await supabase
        .from("audit_ready_fa_rollforward_lines")
        .insert(batch);
      if (batchErr) throw new Error(`line_insert_failed: ${batchErr.message}`);
    }

    const worstAbs = Math.max(Math.abs(costVariance), Math.abs(accumVariance));
    const autoMaxCents = (input.policy.auto_reconcile_max_dollar ?? 0) * 100;
    const kickoutMinCents = (input.policy.kickout_min_dollar ?? Number.POSITIVE_INFINITY) * 100;
    const totalsStatus: "tie" | "auto_reconcile" | "review" | "kickout" =
      worstAbs === 0
        ? "tie"
        : worstAbs <= autoMaxCents
          ? "auto_reconcile"
          : worstAbs >= kickoutMinCents
            ? "kickout"
            : "review";

    await supabase
      .from("audit_ready_tie_out_runs")
      .update({
        status: "completed",
        totals_status: totalsStatus,
        subledger_total_cents: nbvEnd,
        gl_total_cents: costGlEnd - accumGlEnd,
        totals_variance_cents: costEnd - accumEnd - (costGlEnd - accumGlEnd),
        item_count: lines.length,
        period_start: startDate,
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      status: "completed",
      runId,
      artifactId,
      storageObjectKey: objectKey,
      totalsStatus,
      itemCount: lines.length,
      costEndingCents: costEnd,
      accumEndingCents: accumEnd,
      nbvEndingCents: nbvEnd,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    await supabase
      .from("audit_ready_tie_out_runs")
      .update({
        status: "failed",
        error_code: "resolver_exception",
        error_message: msg,
        completed_at: new Date().toISOString(),
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
