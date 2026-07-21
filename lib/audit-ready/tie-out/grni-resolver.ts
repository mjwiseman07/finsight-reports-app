import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  fetchQboOpenUnbilledBills,
  type QboUnbilledBillsQueryResult,
} from "./qbo-reports";
import {
  type PolicySnapshot,
  type VarianceClassification,
} from "./policy";

export type GrniResolverInput = {
  engagementId: string;
  pbcRequestId: string;
  realmId: string;
  accessToken: string;
  asOfDate: string;
  policy: PolicySnapshot & { policy_mode: string };
  triggeredByUserId: string;
  triggerReason: "manual" | "scheduled" | "memory_replay" | "api";
};

export type GrniResolverOutput = {
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

type EvidenceRow = {
  // Temp join key (unused by DB). Bill evidence maps to vendor variance
  // rows via billVarianceStart offset — not positional index 0 (totals).
  variance_key: string;
  run_id: string;
  engagement_id: string;
  source_kind: "bill";
  source_qbo_id: string;
  source_txn_date: string | null;
  source_doc_number: string | null;
  vendor_ref: string | null;
  customer_ref: null;
  total_cents: number;
  subtotal_cents: number;
  balance_cents: number;
  linked_po_ids: string[];
  linked_invoice_ids: string[]; // always [] for bills
  enrichment_error: string | null;
  aging_bucket: string | null;
  age_days_at_run: number;
};

export async function runGrniResolver(
  input: GrniResolverInput,
): Promise<GrniResolverOutput> {
  const supabase = getSupabaseAdmin();
  const start = Date.now();
  const { data: runRow, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .insert({
      engagement_id: input.engagementId,
      pbc_request_id: input.pbcRequestId,
      tie_out_kind: "grni",
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
  let subledger: QboUnbilledBillsQueryResult;
  try {
    subledger = await fetchQboOpenUnbilledBills({
      realmId: input.realmId,
      accessToken: input.accessToken,
      asOfDate: input.asOfDate,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    // The Bill entity is universally available on every QBO Online
    // subscription tier (Simple Start → Advanced), so there is no
    // entity-not-enabled fallback to distinguish here. Any 4xx from
    // the query is surfaced as qbo_fetch_failed with the redacted Fault
    // body for diagnosis.
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
  // Report-only resolver: no GL/subledger comparison. Just list open unbilled
  // Bills and age them. Totals status is always "tie" for the header row
  // (nothing to reconcile against); individual bills get "review" if aged
  // >60 days.
  const subTotalCents = subledger.total_cents;
  const varianceRows: VarianceInsert[] = [];
  varianceRows.push({
    run_id: runId,
    engagement_id: input.engagementId,
    pbc_request_id: input.pbcRequestId,
    entity_kind: "totals",
    entity_qbo_id: null,
    entity_display_name: "Open Unbilled Bills (GRNI)",
    subledger_amount_cents: subTotalCents,
    gl_amount_cents: null,
    variance_cents: 0,
    variance_percent: null,
    status: "tie",
    classification_reason: null,
  });
  let reviewCount = 0;
  const asOf = new Date(input.asOfDate);
  const daysBetween = (a: Date, b: Date): number =>
    Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
  const evidenceRows: EvidenceRow[] = [];
  for (const b of subledger.bills) {
    const ageDays = daysBetween(new Date(b.txn_date), asOf);
    // Aging buckets: current (<=60), 60-90, 90-180, over-180.
    // Anything >60 days flagged for review; bucket carried in
    // classification_reason for reporting + future memory-based narratives.
    let bucket: string;
    let isStale: boolean;
    if (ageDays <= 60) {
      bucket = "current_0_60";
      isStale = false;
    } else if (ageDays <= 90) {
      bucket = "aging_60_90";
      isStale = true;
    } else if (ageDays <= 180) {
      bucket = "aging_90_180";
      isStale = true;
    } else {
      bucket = "aging_over_180";
      isStale = true;
    }
    const status: VarianceClassification = isStale ? "review" : "tie";
    if (isStale) reviewCount += 1;
    // GRNI reports the pre-tax amount as the subledger figure.
    const billAmountCents = b.subtotal_cents ?? b.total_cents;
    // Display name: prefer vendor name; fall back to "Unbilled Bill <id>"
    // (a GRNI bill by definition has no DocNumber, so we never fall back
    // to the doc number).
    const displayName =
      b.vendor_display_name ?? `Unbilled Bill ${b.bill_id}`;
    // Stable key that ties evidence row -> variance row after insert.
    // Uses bill_id because we write one variance per bill in GRNI (rollup
    // happens at the aggregate/summary row, not here). If GRNI ever moves
    // to per-vendor rollup, this key changes to vendor:bucket + we'd
    // write multiple evidence rows per variance.
    const varianceKey = `bill:${b.bill_id}`;
    varianceRows.push({
      run_id: runId,
      engagement_id: input.engagementId,
      pbc_request_id: input.pbcRequestId,
      entity_kind: "vendor",
      entity_qbo_id: b.vendor_ref,
      entity_display_name: displayName,
      subledger_amount_cents: billAmountCents,
      gl_amount_cents: null,
      variance_cents: 0,
      variance_percent: null,
      status,
      classification_reason: isStale ? `unbilled_bill_${bucket}` : null,
    });
    evidenceRows.push({
      variance_key: varianceKey,
      run_id: runId,
      engagement_id: input.engagementId,
      source_kind: "bill",
      source_qbo_id: b.bill_id,
      source_txn_date: b.txn_date,
      source_doc_number: b.doc_number,
      vendor_ref: b.vendor_ref,
      customer_ref: null,
      total_cents: b.total_cents,
      subtotal_cents: b.subtotal_cents,
      balance_cents: b.balance_cents,
      linked_po_ids: b.linked_po_ids,
      linked_invoice_ids: [],
      enrichment_error: b.enrichment_error,
      aging_bucket: bucket,
      age_days_at_run: ageDays,
    });
  }
  // Insert variances in chunks, capture returned ids to map back to
  // evidence rows. Insert order is preserved by Postgres; totals is first,
  // then one vendor variance per Bill — evidence attaches only to bills.
  const CHUNK = 500;
  const insertedVarianceIds: string[] = [];
  for (let i = 0; i < varianceRows.length; i += CHUNK) {
    const chunk = varianceRows.slice(i, i + CHUNK);
    const { data: insertedChunk, error: vErr } = await supabase
      .from("audit_ready_tie_out_variances")
      .insert(chunk)
      .select("id");
    if (vErr || !insertedChunk) {
      await failRun("variance_insert_failed", vErr?.message ?? "no rows returned");
      return {
        runId,
        status: "failed",
        totalsStatus: "kickout",
        subledgerTotalCents: subTotalCents,
        glTotalCents: 0,
        totalsVarianceCents: 0,
        itemCount: 0,
        autoReconcileCount: 0,
        reviewCount: 0,
        kickoutCount: 0,
        durationMs: Date.now() - start,
        errorCode: "variance_insert_failed",
        errorMessage: vErr?.message ?? "no rows returned",
      };
    }
    for (const row of insertedChunk) insertedVarianceIds.push(row.id as string);
  }
  if (insertedVarianceIds.length !== varianceRows.length) {
    await failRun(
      "variance_insert_count_mismatch",
      `expected ${varianceRows.length} inserted, got ${insertedVarianceIds.length}`,
    );
    return {
      runId,
      status: "failed",
      totalsStatus: "kickout",
      subledgerTotalCents: subTotalCents,
      glTotalCents: 0,
      totalsVarianceCents: 0,
      itemCount: 0,
      autoReconcileCount: 0,
      reviewCount: 0,
      kickoutCount: 0,
      durationMs: Date.now() - start,
      errorCode: "variance_insert_count_mismatch",
      errorMessage: `expected ${varianceRows.length} inserted, got ${insertedVarianceIds.length}`,
    };
  }
  // CRITICAL: varianceRows[0] is the totals row; evidenceRows are bills only.
  // Positional map evidenceRows[i] → insertedVarianceIds[i] would attach
  // bill evidence to the totals variance. Offset by first vendor row.
  const billVarianceStart = varianceRows.findIndex(
    (r) => r.entity_kind === "vendor",
  );
  const vendorVarianceCount = varianceRows.filter(
    (r) => r.entity_kind === "vendor",
  ).length;
  if (
    billVarianceStart < 0 ||
    evidenceRows.length !== vendorVarianceCount ||
    evidenceRows.length !== varianceRows.length - billVarianceStart
  ) {
    await failRun(
      "evidence_variance_alignment_mismatch",
      `evidence=${evidenceRows.length} vendorVariances=${vendorVarianceCount} ` +
        `totalVariances=${varianceRows.length} billVarianceStart=${billVarianceStart}`,
    );
    return {
      runId,
      status: "failed",
      totalsStatus: "kickout",
      subledgerTotalCents: subTotalCents,
      glTotalCents: 0,
      totalsVarianceCents: 0,
      itemCount: 0,
      autoReconcileCount: 0,
      reviewCount: 0,
      kickoutCount: 0,
      durationMs: Date.now() - start,
      errorCode: "evidence_variance_alignment_mismatch",
      errorMessage: `evidence=${evidenceRows.length} vendorVariances=${vendorVarianceCount}`,
    };
  }
  const evidenceInsertRows = evidenceRows.map((e, idx) => {
    const { variance_key: _variance_key, ...rest } = e;
    return {
      ...rest,
      variance_id: insertedVarianceIds[billVarianceStart + idx],
    };
  });
  // Insert evidence in chunks. A failure here is non-fatal for the run —
  // the variance rows are already in place and correct; we log it on the
  // run row but let totals_status stay "tie" so bookkeepers still get the
  // rollup. Evidence-persistence failure is a warning, not a broken run.
  let evidenceInsertError: string | null = null;
  for (let i = 0; i < evidenceInsertRows.length; i += CHUNK) {
    const chunk = evidenceInsertRows.slice(i, i + CHUNK);
    const { error: eErr } = await supabase
      .from("audit_ready_tie_out_variance_evidence")
      .insert(chunk);
    if (eErr) {
      evidenceInsertError = eErr.message;
      break;
    }
  }
  const totalsStatus: GrniResolverOutput["totalsStatus"] = "tie";
  const durationMs = Date.now() - start;
  // Adaptation vs paste: shipped column names are item_*_count (not
  // auto_reconcile_count / review_count / kickout_count).
  await supabase
    .from("audit_ready_tie_out_runs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      subledger_total_cents: subTotalCents,
      gl_total_cents: null,
      totals_variance_cents: 0,
      totals_status: totalsStatus,
      item_count: subledger.bills.length,
      item_auto_reconcile_count: 0,
      item_review_count: reviewCount,
      item_kickout_count: 0,
      subledger_source_url: subledger.raw_query_url,
      gl_source_url: null,
      intuit_tid_subledger: subledger.intuit_tid,
      intuit_tid_gl: null,
      // PBC-TIEOUT-3.4: evidence-persistence warning surface. Non-blocking.
      ...(evidenceInsertError
        ? {
            error_message: `WARNING: evidence_insert_failed: ${evidenceInsertError}`,
          }
        : {}),
    })
    .eq("id", runId);
  // Adaptation vs paste: PBC CHECK allows review|tie (not needs_review|tied_out).
  const pbcLastStatus: "tie" | "review" =
    reviewCount > 0 ? "review" : "tie";
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
    glTotalCents: 0,
    totalsVarianceCents: 0,
    itemCount: subledger.bills.length,
    autoReconcileCount: 0,
    reviewCount,
    kickoutCount: 0,
    durationMs,
  };
}
