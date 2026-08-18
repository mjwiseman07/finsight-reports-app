import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  fetchQboInventoryValuationDetail,
  fetchQboTrialBalance,
  type QboInventoryValuationResult,
  type QboTrialBalanceResult,
} from "./qbo-reports";
import { inventoryEmitter } from "./emitters/inventory-emitter";
import { dualWriteWorkpaper } from "./emitters/_shared/emit-common";
import { persistInventoryUrmBridge } from "./inventory-fa-urm";
import type { PolicySnapshot, VarianceClassification } from "./policy";
import { measureInventoryTieOut } from "./inventory-measure";
import {
  assertRunIdDistinctFromBaselineSyncId,
  baselineSyncInsertForMeasurement,
  type TieOutMeasurementSource,
} from "./baseline-sync-custody";
import {
  MEASUREMENT_SNAPSHOT_ERROR,
  MeasurementSnapshotError,
  type TieOutInventoryMeasurementSnapshot,
} from "@/lib/audit-ready/measurement-snapshots/types";
import { validateInventoryMeasurementSnapshot } from "@/lib/audit-ready/measurement-snapshots/validate";
import { inventoryReportsFromSnapshot } from "@/lib/audit-ready/measurement-snapshots/qbo-inventory-adapter";

export type InventoryLiveMeasurement = { mode: "live" };

export type InventoryPersistedSnapshotMeasurement = {
  mode: "persisted_snapshot";
  snapshot: TieOutInventoryMeasurementSnapshot;
};

export type InventoryResolverInput = {
  engagementId: string;
  pbcRequestId: string;
  realmId: string;
  accessToken: string;
  inventoryAccountId: string;
  asOfDate: string;
  policy: PolicySnapshot & { policy_mode: string };
  triggeredByUserId: string;
  triggerReason: "manual" | "scheduled" | "memory_replay" | "api";
  regeneratedFromRunId?: string | null;
  triggerKind?: "initial" | "regenerated" | "cron";
  /** Default omitted = live_provider. Worker/regenerate stay on this path. */
  measurement?: InventoryLiveMeasurement | InventoryPersistedSnapshotMeasurement;
  companyId?: string | null;
  accountingConnectionId?: string | null;
  provider?: string | null;
};

export type InventoryResolverOutput = {
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
  measurementSource: TieOutMeasurementSource;
  baselineSyncId: string | null;
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

function failedPreInsert(args: {
  code: string;
  msg: string;
  durationMs: number;
}): InventoryResolverOutput {
  return {
    runId: "",
    status: "failed",
    totalsStatus: "kickout",
    subledgerTotalCents: 0,
    glTotalCents: 0,
    totalsVarianceCents: 0,
    itemCount: 0,
    autoReconcileCount: 0,
    reviewCount: 0,
    kickoutCount: 0,
    durationMs: args.durationMs,
    errorCode: args.code,
    errorMessage: args.msg,
    measurementSource: "live_provider",
    baselineSyncId: null,
  };
}

function snapshotReportsOrThrow(input: InventoryResolverInput): {
  valuation: QboInventoryValuationResult;
  trial: QboTrialBalanceResult;
  baselineSyncId: string;
} {
  if (input.measurement?.mode !== "persisted_snapshot") {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.AUTHORITATIVE_REQUIRED,
      "Persisted Inventory snapshot measurement was not supplied.",
    );
  }
  const companyId = String(input.companyId || "").trim();
  const accountingConnectionId = String(input.accountingConnectionId || "").trim();
  const provider = String(input.provider || "").trim();
  if (!companyId || !accountingConnectionId || !provider) {
    throw new MeasurementSnapshotError(
      MEASUREMENT_SNAPSHOT_ERROR.CUSTODY_MISMATCH,
      "Persisted Inventory snapshot measurement requires company, connection, and provider custody.",
    );
  }
  const snapshot = validateInventoryMeasurementSnapshot(input.measurement.snapshot, {
    asOfDate: input.asOfDate,
    companyId,
    accountingConnectionId,
    provider,
    tenantOrRealmId: input.realmId,
    accountingSyncId: input.measurement.snapshot.accountingSyncId,
  });
  const reports = inventoryReportsFromSnapshot(snapshot);
  return {
    valuation: reports.valuation,
    trial: reports.trial,
    baselineSyncId: snapshot.accountingSyncId,
  };
}

export async function runInventoryResolver(
  input: InventoryResolverInput,
): Promise<InventoryResolverOutput> {
  const supabase = getSupabaseAdmin();
  const start = Date.now();
  const snapshotMode = input.measurement?.mode === "persisted_snapshot";
  let measurementSource: TieOutMeasurementSource = snapshotMode
    ? "persisted_sync_snapshot"
    : "live_provider";
  let baselineSyncId: string | null = null;
  let subledger: QboInventoryValuationResult | null = null;
  let trial: QboTrialBalanceResult | null = null;

  if (snapshotMode) {
    try {
      const resolved = snapshotReportsOrThrow(input);
      subledger = resolved.valuation;
      trial = resolved.trial;
      baselineSyncId = resolved.baselineSyncId;
      measurementSource = "persisted_sync_snapshot";
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "unknown";
      const code =
        e instanceof MeasurementSnapshotError
          ? e.code
          : MEASUREMENT_SNAPSHOT_ERROR.AUTHORITATIVE_REQUIRED;
      return failedPreInsert({ code, msg, durationMs: Date.now() - start });
    }
  }

  const stamp = snapshotMode
    ? baselineSyncInsertForMeasurement({
        measurementSource: "persisted_sync_snapshot",
        accountingSyncId: baselineSyncId,
      })
    : {};

  const { data: runRow, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .insert({
      engagement_id: input.engagementId,
      pbc_request_id: input.pbcRequestId,
      tie_out_kind: "inventory",
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
      regenerated_from_run_id: input.regeneratedFromRunId ?? null,
      trigger_kind: input.triggerKind ?? "initial",
      ...stamp,
    })
    .select("id")
    .single();
  if (runErr || !runRow) throw new Error(`insert run failed: ${runErr?.message}`);
  const runId = runRow.id as string;
  if (baselineSyncId) {
    assertRunIdDistinctFromBaselineSyncId(runId, baselineSyncId);
  }
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

  if (!snapshotMode) {
    try {
      [subledger, trial] = await Promise.all([
        fetchQboInventoryValuationDetail({
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
        measurementSource: "live_provider",
        baselineSyncId: null,
      };
    }
  }

  const measured = measureInventoryTieOut({
    valuation: subledger as QboInventoryValuationResult,
    trialBalance: trial as QboTrialBalanceResult,
    inventoryAccountId: input.inventoryAccountId,
    policy: input.policy,
  });
  const {
    glLine,
    glTotalCents,
    subTotalCents,
    totalsVariance,
    totalsClass,
    totalsStatus,
    itemRows,
  } = measured;

  const variances: VarianceInsert[] = itemRows.map((item) => ({
    run_id: runId,
    engagement_id: input.engagementId,
    pbc_request_id: input.pbcRequestId,
    entity_kind: "item",
    entity_qbo_id: item.entity_qbo_id,
    entity_display_name: item.entity_display_name,
    subledger_amount_cents: item.subledger_amount_cents,
    gl_amount_cents: item.gl_amount_cents,
    variance_cents: item.variance_cents,
    variance_percent: item.variance_percent,
    status: item.status,
    classification_reason: item.classification_reason,
  }));
  variances.push({
    run_id: runId,
    engagement_id: input.engagementId,
    pbc_request_id: input.pbcRequestId,
    entity_kind: "totals",
    entity_qbo_id: input.inventoryAccountId,
    entity_display_name: `Inventory valuation vs GL (${glLine?.account_name ?? "Inventory control"})`,
    subledger_amount_cents: subTotalCents,
    gl_amount_cents: glTotalCents,
    variance_cents: totalsVariance,
    variance_percent: totalsClass.percent,
    status: totalsClass.status,
    classification_reason: totalsClass.reason,
  });
  if (variances.length) {
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
          measurementSource,
          baselineSyncId,
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
  const fetchedAt = new Date().toISOString();
  await supabase
    .from("audit_ready_tie_out_runs")
    .update({
      subledger_total_cents: subTotalCents,
      gl_total_cents: glTotalCents,
      totals_variance_cents: totalsVariance,
      totals_status: totalsStatus,
      item_count: itemCount,
      item_auto_reconcile_count: autoCount,
      item_review_count: reviewCount,
      item_kickout_count: kickoutCount,
      subledger_source_url: (subledger as QboInventoryValuationResult).raw_report_url,
      gl_source_url: (trial as QboTrialBalanceResult).raw_report_url,
      intuit_tid_subledger: (subledger as QboInventoryValuationResult).intuit_tid,
      intuit_tid_gl: (trial as QboTrialBalanceResult).intuit_tid,
      raw_qbo_payload_jsonb: {
        version: 1,
        kind: "inventory",
        fetched_at: fetchedAt,
        qbo_realm_id: input.realmId,
        qbo_connection_id: input.accountingConnectionId ?? "",
        measurement_source: measurementSource,
        inventory_valuation: subledger,
        trial_balance: trial,
      },
    })
    .eq("id", runId);

  try {
    await persistInventoryUrmBridge({
      runId,
      totalsVarianceCents: totalsVariance,
      itemRows: variances
        .filter((v) => v.entity_kind === "item")
        .map((v) => ({
          entityQboId: v.entity_qbo_id,
          entityDisplayName: v.entity_display_name,
          subledgerAmountCents: v.subledger_amount_cents,
          status: v.status,
          classificationReason: v.classification_reason,
        })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    await failRun("urm_bridge_persist_failed", msg);
    return {
      runId,
      status: "failed",
      totalsStatus,
      subledgerTotalCents: subTotalCents,
      glTotalCents,
      totalsVarianceCents: totalsVariance,
      itemCount,
      autoReconcileCount: autoCount,
      reviewCount,
      kickoutCount,
      durationMs: Date.now() - start,
      errorCode: "urm_bridge_persist_failed",
      errorMessage: msg,
      measurementSource,
      baselineSyncId,
    };
  }

  try {
    await dualWriteWorkpaper({
      emitter: inventoryEmitter,
      runId,
      engagementId: input.engagementId,
      generatedBy: input.triggeredByUserId ?? null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    await failRun("emit_failed", msg);
    return {
      runId,
      status: "failed",
      totalsStatus,
      subledgerTotalCents: subTotalCents,
      glTotalCents,
      totalsVarianceCents: totalsVariance,
      itemCount,
      autoReconcileCount: autoCount,
      reviewCount,
      kickoutCount,
      durationMs: Date.now() - start,
      errorCode: "emit_failed",
      errorMessage: msg,
      measurementSource,
      baselineSyncId,
    };
  }

  await supabase
    .from("audit_ready_tie_out_runs")
    .update({
      status: "completed",
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
    measurementSource,
    baselineSyncId,
  };
}
