import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  fetchQboArAgingDetail,
  fetchQboTrialBalance,
  type QboArAgingResult,
  type QboTrialBalanceResult,
} from "./qbo-reports";
import {
  classifyVariance,
  type PolicySnapshot,
  type VarianceClassification,
} from "./policy";

export type ArResolverInput = {
  engagementId: string;
  pbcRequestId: string;
  realmId: string;
  accessToken: string;
  arAccountId: string; // QBO Account ID for AR control
  asOfDate: string; // YYYY-MM-DD, period end
  policy: PolicySnapshot & { policy_mode: string };
  triggeredByUserId: string;
  triggerReason: "manual" | "scheduled" | "memory_replay" | "api";
};

export type ArResolverOutput = {
  runId: string;
  status: "completed" | "failed" | "partial";
  totalsStatus: "tie" | "auto_reconcile" | "review" | "kickout";
  subledgerTotalCents: number;
  glTotalCents: number;
  totalsVarianceCents: number;
  itemCount: number;
  autoReconcileCount: number;
  reviewCount: number;
  kickoutCount: number;
  durationMs: number;
  errorCode?: string;
  errorMessage?: string;
};

type VarianceInsert = {
  run_id: string;
  engagement_id: string;
  pbc_request_id: string;
  entity_kind: "customer" | "vendor" | "item" | "account" | "totals" | "cutoff";
  entity_qbo_id: string | null;
  entity_display_name: string | null;
  subledger_amount_cents: number | null;
  gl_amount_cents: number | null;
  variance_cents: number;
  variance_percent: number | null;
  status: VarianceClassification;
  classification_reason: string | null;
};

export async function runArResolver(
  input: ArResolverInput,
): Promise<ArResolverOutput> {
  const supabase = getSupabaseAdmin();
  const start = Date.now();
  // 1. Insert run row in 'running' status
  const { data: runRow, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .insert({
      engagement_id: input.engagementId,
      pbc_request_id: input.pbcRequestId,
      tie_out_kind: "ar_aging",
      status: "running",
      policy_mode: input.policy.policy_mode,
      auto_reconcile_max_dollar: input.policy.auto_reconcile_max_dollar,
      auto_reconcile_max_percent: input.policy.auto_reconcile_max_percent,
      kickout_min_dollar: input.policy.kickout_min_dollar,
      kickout_min_percent: input.policy.kickout_min_percent,
      authoritative_comparison: input.policy.authoritative_comparison,
      period_end: input.asOfDate,
      triggered_by_user_id: input.triggeredByUserId,
      trigger_reason: input.triggerReason,
    })
    .select("id")
    .single();
  if (runErr || !runRow) throw new Error(`insert run failed: ${runErr?.message}`);
  const runId = runRow.id as string;
  const failRun = async (code: string, msg: string) => {
    await supabase
      .from("audit_ready_tie_out_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - start,
        error_code: code,
        error_message: msg,
      })
      .eq("id", runId);
    await supabase
      .from("audit_ready_pbc_requests")
      .update({
        last_tie_out_run_id: runId,
        last_tie_out_status: "failed",
        last_tie_out_at: new Date().toISOString(),
      })
      .eq("id", input.pbcRequestId);
  };
  let subledger: QboArAgingResult;
  let trial: QboTrialBalanceResult;
  try {
    [subledger, trial] = await Promise.all([
      fetchQboArAgingDetail({
        realmId: input.realmId,
        accessToken: input.accessToken,
        asOfDate: input.asOfDate,
      }),
      fetchQboTrialBalance({
        realmId: input.realmId,
        accessToken: input.accessToken,
        asOfDate: input.asOfDate,
      }),
    ]);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    await failRun("qbo_fetch_failed", msg);
    return {
      runId,
      status: "failed",
      totalsStatus: "kickout",
      subledgerTotalCents: 0,
      glTotalCents: 0,
      totalsVarianceCents: 0,
      itemCount: 0,
      autoReconcileCount: 0,
      reviewCount: 0,
      kickoutCount: 0,
      durationMs: Date.now() - start,
      errorCode: "qbo_fetch_failed",
      errorMessage: msg,
    };
  }
  // 2. GL side — locate the AR account line
  const glLine = trial.lines.find((l) => l.account_ref === input.arAccountId);
  const glTotalCents = glLine ? glLine.net_cents : 0;
  const subTotalCents = subledger.total_cents;
  const totalsVariance = subTotalCents - glTotalCents;
  const totalsClass = classifyVariance(
    totalsVariance,
    glTotalCents !== 0 ? glTotalCents : subTotalCents,
    input.policy,
  );
  const totalsStatus: ArResolverOutput["totalsStatus"] =
    totalsClass.status === "auto_cleared"
      ? "auto_reconcile"
      : totalsClass.status === "tie"
        ? "tie"
        : totalsClass.status === "review"
          ? "review"
          : "kickout";
  // 3. Per-customer variances (subledger side; GL AR control has no per-customer breakdown)
  // In classic subledger-to-GL tie-out, the entire per-customer detail IS the
  // subledger source of truth. We record each open-balance customer as a
  // variance row of kind='customer' where gl_amount_cents is NULL and
  // status='tie' — these are informational. Any customer with a NEGATIVE
  // balance (credit-balance customer) is flagged as 'review' regardless of
  // policy — a classic AR audit finding.
  const variances: VarianceInsert[] = subledger.customers.map((c) => {
    const isCredit = c.total_cents < 0;
    return {
      run_id: runId,
      engagement_id: input.engagementId,
      pbc_request_id: input.pbcRequestId,
      entity_kind: "customer",
      entity_qbo_id: c.customer_ref,
      entity_display_name: c.customer_display_name,
      subledger_amount_cents: c.total_cents,
      gl_amount_cents: null,
      variance_cents: 0,
      variance_percent: null,
      status: (isCredit ? "review" : "tie") as VarianceClassification,
      classification_reason: isCredit
        ? "credit-balance customer on AR aging (potential misapplied payment or unearned revenue)"
        : "customer detail row (informational)",
    };
  });
  // 4. Totals variance row
  variances.push({
    run_id: runId,
    engagement_id: input.engagementId,
    pbc_request_id: input.pbcRequestId,
    entity_kind: "totals",
    entity_qbo_id: input.arAccountId,
    entity_display_name: `AR subledger vs GL (${glLine?.account_name ?? "AR control"})`,
    subledger_amount_cents: subTotalCents,
    gl_amount_cents: glTotalCents,
    variance_cents: totalsVariance,
    variance_percent: totalsClass.percent,
    status: totalsClass.status,
    classification_reason: totalsClass.reason,
  });
  if (variances.length) {
    // Batch insert (cap at ~1000 for safety)
    for (let i = 0; i < variances.length; i += 500) {
      const chunk = variances.slice(i, i + 500);
      const { error: varErr } = await supabase
        .from("audit_ready_tie_out_variances")
        .insert(chunk);
      if (varErr) {
        await failRun("variance_insert_failed", varErr.message);
        return {
          runId,
          status: "failed",
          totalsStatus: "kickout",
          subledgerTotalCents: subTotalCents,
          glTotalCents,
          totalsVarianceCents: totalsVariance,
          itemCount: 0,
          autoReconcileCount: 0,
          reviewCount: 0,
          kickoutCount: 0,
          durationMs: Date.now() - start,
          errorCode: "variance_insert_failed",
          errorMessage: varErr.message,
        };
      }
    }
  }
  const itemCount = variances.length;
  const autoCount = variances.filter((v) => v.status === "auto_cleared").length;
  const reviewCount = variances.filter((v) => v.status === "review").length;
  const kickoutCount = variances.filter((v) => v.status === "kickout").length;
  const pbcLastStatus: "tie" | "auto_reconciled" | "review" | "kickout" =
    totalsStatus === "tie"
      ? "tie"
      : totalsStatus === "auto_reconcile"
        ? "auto_reconciled"
        : totalsStatus === "review"
          ? "review"
          : "kickout";
  await supabase
    .from("audit_ready_tie_out_runs")
    .update({
      status: "completed",
      subledger_total_cents: subTotalCents,
      gl_total_cents: glTotalCents,
      totals_variance_cents: totalsVariance,
      totals_status: totalsStatus,
      item_count: itemCount,
      item_auto_reconcile_count: autoCount,
      item_review_count: reviewCount,
      item_kickout_count: kickoutCount,
      subledger_source_url: subledger.raw_report_url,
      gl_source_url: trial.raw_report_url,
      intuit_tid_subledger: subledger.intuit_tid,
      intuit_tid_gl: trial.intuit_tid,
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - start,
    })
    .eq("id", runId);
  await supabase
    .from("audit_ready_pbc_requests")
    .update({
      last_tie_out_run_id: runId,
      last_tie_out_status: pbcLastStatus,
      last_tie_out_at: new Date().toISOString(),
    })
    .eq("id", input.pbcRequestId);
  return {
    runId,
    status: "completed",
    totalsStatus,
    subledgerTotalCents: subTotalCents,
    glTotalCents,
    totalsVarianceCents: totalsVariance,
    itemCount,
    autoReconcileCount: autoCount,
    reviewCount,
    kickoutCount,
    durationMs: Date.now() - start,
  };
}
