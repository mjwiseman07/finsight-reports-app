/**
 * URM-2 — Persist universal reconciliation outcomes.
 *
 * Does not change reconciliation math (uses URM-1 deriveReconBridge).
 * Does not migrate resolvers — callers opt in when ready (URM-4+).
 *
 * Gross variance authority: audit_ready_tie_out_runs.totals_variance_cents.
 * Run identity authority: engagement_id / pbc_request_id always derived from the run
 * (DB trigger + atomic RPC). Callers cannot stamp cross-engagement identity.
 *
 * baseline_sync_id: schema hook only — this helper NEVER sets it.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  deriveReconBridge,
  type ReconBridgeResult,
  type ReconcilingItem,
  type ReconcilingItemClass,
  type ReconcilingItemClearancePolicy,
  type ReconOutcome,
  type ReconOutcomePolicy,
} from "@/lib/audit-ready/tie-out/recon-model";
import type { VarianceClassification } from "@/lib/audit-ready/tie-out/policy";

export type PersistedReconcilingItemRow = {
  id: string;
  run_id: string;
  engagement_id: string;
  pbc_request_id: string;
  item_class: ReconcilingItemClass;
  amount_cents: number;
  entity_kind: string | null;
  entity_display_name: string | null;
  expected_clear_date: string | null;
  clearance_policy: ReconcilingItemClearancePolicy;
  status: VarianceClassification;
  measurement_link_variance_id: string | null;
  evidence_ids: string[];
  narrative: string | null;
  sort_order: number;
  created_at: string;
};

export type PersistReconBridgeInput = {
  runId: string;
  /** Identified items only — never residual. */
  items: ReadonlyArray<
    Omit<ReconcilingItem, "runId" | "id"> & { runId?: string; id?: string }
  >;
  /** Explicit approved policy — required (no silent DEFAULT clearance). */
  policy: ReconOutcomePolicy;
  forceOutcome?: Extract<ReconOutcome, "failed" | "provider_action_required">;
};

export type PersistReconBridgeResult = {
  runId: string;
  bridge: ReconBridgeResult;
  /** Gross variance used as authority (from run.totals_variance_cents). */
  grossVarianceCents: number;
  itemIds: string[];
  /** Read-back only — never assigned by this helper. */
  baselineSyncId: string | null;
  persistedAt: string;
};

export type LoadedReconBridge = {
  runId: string;
  engagementId: string;
  pbcRequestId: string;
  grossVarianceCents: number | null;
  identifiedItemsTotalCents: number | null;
  unidentifiedResidualCents: number | null;
  reconcilingItemCount: number | null;
  unresolvedMaterialCount: number | null;
  reconOutcome: ReconOutcome | null;
  allowsTimingReconciled: boolean | null;
  baselineSyncId: string | null;
  urmBridgePersistedAt: string | null;
  items: PersistedReconcilingItemRow[];
};

type RunAuthorityRow = {
  id: string;
  engagement_id: string;
  pbc_request_id: string;
  totals_variance_cents: number | null;
  baseline_sync_id: string | null;
};

function requireAdmin() {
  return getSupabaseAdmin();
}

function assertIdentifiedOnly(
  items: ReadonlyArray<{ itemClass: string }>,
): void {
  for (const item of items) {
    if (
      item.itemClass === "unidentified_residual" ||
      !item.itemClass?.startsWith("identified_")
    ) {
      throw new Error("urm2_unidentified_residual_not_persistable");
    }
  }
}

function itemsToRpcPayload(
  items: PersistReconBridgeInput["items"],
): Array<Record<string, unknown>> {
  return items.map((item, index) => ({
    item_class: item.itemClass,
    amount_cents: item.amountCents,
    entity_kind: item.entityKind ?? null,
    entity_display_name: item.entityDisplayName ?? null,
    expected_clear_date: item.expectedClearDate ?? null,
    clearance_policy: item.clearancePolicy,
    status: item.status,
    measurement_link_variance_id: item.measurementLinkVarianceId ?? null,
    evidence_ids: (item.evidenceIds ?? []).filter(Boolean),
    narrative: null,
    sort_order: index,
  }));
}

/**
 * Persist identified items + derived run-level URM outcome atomically.
 *
 * Authority:
 * - Gross variance = run.totals_variance_cents (measurement; required)
 * - Residual / outcome = deriveReconBridge (URM-1; sole formula authority)
 * - engagement_id / pbc_request_id = derived inside DB from run_id
 *
 * baseline_sync_id is never written here (custody PR later).
 */
export async function persistReconBridgeForRun(
  input: PersistReconBridgeInput,
): Promise<PersistReconBridgeResult> {
  const supabase = requireAdmin();
  const { runId, items, policy, forceOutcome } = input;

  assertIdentifiedOnly(items);

  const { data: run, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, engagement_id, pbc_request_id, totals_variance_cents, baseline_sync_id",
    )
    .eq("id", runId)
    .maybeSingle();
  if (runErr) throw new Error(runErr.message);
  if (!run) throw new Error("run_not_found");

  const authority = run as RunAuthorityRow;
  if (
    authority.totals_variance_cents === null ||
    authority.totals_variance_cents === undefined
  ) {
    throw new Error("urm2_gross_variance_authority_missing");
  }

  const grossVarianceCents = Number(authority.totals_variance_cents);
  if (!Number.isFinite(grossVarianceCents)) {
    throw new Error("urm2_gross_variance_authority_invalid");
  }

  // URM-1 remains the sole formula authority.
  const bridge = deriveReconBridge({
    grossVarianceCents,
    items: items.map((i) => ({
      itemClass: i.itemClass,
      amountCents: i.amountCents,
      clearancePolicy: i.clearancePolicy,
      status: i.status,
    })),
    policy,
    forceOutcome,
  });

  const persistedAt = new Date().toISOString();

  const { data: itemIds, error: rpcErr } = await supabase.rpc(
    "persist_audit_ready_recon_bridge",
    {
      p_run_id: runId,
      p_items: itemsToRpcPayload(items),
      p_identified_items_total_cents: bridge.identifiedItemsTotalCents,
      p_unidentified_residual_cents: bridge.unidentifiedResidualCents,
      p_reconciling_item_count: bridge.reconcilingItemCount,
      p_unresolved_material_count: bridge.unresolvedMaterialCount,
      p_recon_outcome: bridge.reconOutcome,
      p_allows_timing_reconciled: policy.allowTimingReconciled,
      p_persisted_at: persistedAt,
    },
  );
  if (rpcErr) throw new Error(rpcErr.message);

  return {
    runId,
    bridge,
    grossVarianceCents,
    itemIds: (itemIds as string[] | null) ?? [],
    baselineSyncId: authority.baseline_sync_id ?? null,
    persistedAt,
  };
}

/**
 * Atomically clear URM bridge items + run columns.
 * Does not delete the run, measurement variances, or baseline_sync_id.
 */
export async function clearReconBridgeForRun(runId: string): Promise<void> {
  const supabase = requireAdmin();
  const { error } = await supabase.rpc("clear_audit_ready_recon_bridge", {
    p_run_id: runId,
  });
  if (error) throw new Error(error.message);
}

/**
 * Load persisted URM bridge (run columns + identified items).
 * Does not recompute outcome — returns stored values.
 */
export async function loadReconBridgeForRun(
  runId: string,
): Promise<LoadedReconBridge> {
  const supabase = requireAdmin();

  const { data: run, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, engagement_id, pbc_request_id, totals_variance_cents, " +
        "identified_items_total_cents, unidentified_residual_cents, " +
        "reconciling_item_count, unresolved_material_count, recon_outcome, " +
        "allows_timing_reconciled, baseline_sync_id, urm_bridge_persisted_at",
    )
    .eq("id", runId)
    .maybeSingle();
  if (runErr) throw new Error(runErr.message);
  if (!run) throw new Error("run_not_found");

  const { data: items, error: itemsErr } = await supabase
    .from("audit_ready_reconciling_items")
    .select("*")
    .eq("run_id", runId)
    .order("sort_order", { ascending: true });
  if (itemsErr) throw new Error(itemsErr.message);

  return {
    runId: run.id as string,
    engagementId: run.engagement_id as string,
    pbcRequestId: run.pbc_request_id as string,
    grossVarianceCents:
      run.totals_variance_cents == null
        ? null
        : Number(run.totals_variance_cents),
    identifiedItemsTotalCents:
      run.identified_items_total_cents == null
        ? null
        : Number(run.identified_items_total_cents),
    unidentifiedResidualCents:
      run.unidentified_residual_cents == null
        ? null
        : Number(run.unidentified_residual_cents),
    reconcilingItemCount:
      run.reconciling_item_count == null
        ? null
        : Number(run.reconciling_item_count),
    unresolvedMaterialCount:
      run.unresolved_material_count == null
        ? null
        : Number(run.unresolved_material_count),
    reconOutcome: (run.recon_outcome as ReconOutcome | null) ?? null,
    allowsTimingReconciled:
      run.allows_timing_reconciled == null
        ? null
        : Boolean(run.allows_timing_reconciled),
    baselineSyncId: (run.baseline_sync_id as string | null) ?? null,
    urmBridgePersistedAt:
      (run.urm_bridge_persisted_at as string | null) ?? null,
    items: (items ?? []) as PersistedReconcilingItemRow[],
  };
}
