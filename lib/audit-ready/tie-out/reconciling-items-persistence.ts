/**
 * URM-2 — Persist universal reconciliation outcomes.
 *
 * Does not change reconciliation math (uses URM-1 deriveReconBridge).
 * Does not migrate resolvers — callers opt in when ready (URM-4+).
 *
 * Gross variance authority: audit_ready_tie_out_runs.totals_variance_cents
 * (measurement layer already written by resolvers).
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
  /** Optional Patent/Accuracy Contract sync pin. Never auto-inferred. */
  baselineSyncId?: string | null;
  forceOutcome?: Extract<ReconOutcome, "failed" | "provider_action_required">;
};

export type PersistReconBridgeResult = {
  runId: string;
  bridge: ReconBridgeResult;
  /** Gross variance used as authority (from run.totals_variance_cents). */
  grossVarianceCents: number;
  itemIds: string[];
  baselineSyncId: string | null;
  persistedAt: string;
};

export type LoadedReconBridge = {
  runId: string;
  engagementId: string;
  pbcRequestId: string;
  /** Measurement authority: run.totals_variance_cents (null if run never completed totals). */
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
};

function requireAdmin() {
  return getSupabaseAdmin();
}

/**
 * Replace-all identified items for a run (idempotent write path).
 * Does not update run-level outcome columns — use persistReconBridgeForRun.
 */
export async function replaceReconcilingItemsForRun(params: {
  runId: string;
  engagementId: string;
  pbcRequestId: string;
  items: ReadonlyArray<
    Omit<ReconcilingItem, "runId" | "id"> & { runId?: string; id?: string }
  >;
}): Promise<string[]> {
  const supabase = requireAdmin();
  const { runId, engagementId, pbcRequestId, items } = params;

  for (const item of items) {
    if (
      (item.itemClass as string) === "unidentified_residual" ||
      !item.itemClass?.startsWith("identified_")
    ) {
      throw new Error("urm2_unidentified_residual_not_persistable");
    }
  }

  const { error: delErr } = await supabase
    .from("audit_ready_reconciling_items")
    .delete()
    .eq("run_id", runId);
  if (delErr) throw new Error(delErr.message);

  if (items.length === 0) return [];

  const rows = items.map((item, index) => ({
    run_id: runId,
    engagement_id: engagementId,
    pbc_request_id: pbcRequestId,
    item_class: item.itemClass,
    amount_cents: item.amountCents,
    entity_kind: item.entityKind ?? null,
    entity_display_name: item.entityDisplayName ?? null,
    expected_clear_date: item.expectedClearDate ?? null,
    clearance_policy: item.clearancePolicy,
    status: item.status,
    measurement_link_variance_id: item.measurementLinkVarianceId ?? null,
    evidence_ids: (item.evidenceIds ?? []).filter(Boolean),
    sort_order: index,
  }));

  const { data, error: insErr } = await supabase
    .from("audit_ready_reconciling_items")
    .insert(rows)
    .select("id");
  if (insErr) throw new Error(insErr.message);
  return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Clear URM bridge columns + items for a run (idempotent reset).
 * Does not delete the run or measurement variances.
 */
export async function clearReconBridgeForRun(runId: string): Promise<void> {
  const supabase = requireAdmin();
  const { error: delErr } = await supabase
    .from("audit_ready_reconciling_items")
    .delete()
    .eq("run_id", runId);
  if (delErr) throw new Error(delErr.message);

  const { error: updErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .update({
      identified_items_total_cents: null,
      unidentified_residual_cents: null,
      reconciling_item_count: null,
      unresolved_material_count: null,
      recon_outcome: null,
      allows_timing_reconciled: null,
      // baseline_sync_id intentionally retained unless caller clears separately
      urm_bridge_persisted_at: null,
    })
    .eq("id", runId);
  if (updErr) throw new Error(updErr.message);
}

/**
 * Persist identified items + derived run-level URM outcome for a completed run.
 *
 * Authority:
 * - Gross variance = run.totals_variance_cents (measurement; required)
 * - Residual / outcome = deriveReconBridge (URM-1 pure math; unchanged)
 *
 * Idempotency: replace-all items for run_id, then overwrite run URM columns.
 * Regeneration creates a new run — prior run items remain as audit history.
 */
export async function persistReconBridgeForRun(
  input: PersistReconBridgeInput,
): Promise<PersistReconBridgeResult> {
  const supabase = requireAdmin();
  const { runId, items, policy, forceOutcome } = input;

  const { data: run, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("id, engagement_id, pbc_request_id, totals_variance_cents")
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

  const itemIds = await replaceReconcilingItemsForRun({
    runId,
    engagementId: authority.engagement_id,
    pbcRequestId: authority.pbc_request_id,
    items,
  });

  const persistedAt = new Date().toISOString();
  const baselineSyncId =
    input.baselineSyncId === undefined ? undefined : input.baselineSyncId;

  const updatePayload: Record<string, unknown> = {
    identified_items_total_cents: bridge.identifiedItemsTotalCents,
    unidentified_residual_cents: bridge.unidentifiedResidualCents,
    reconciling_item_count: bridge.reconcilingItemCount,
    unresolved_material_count: bridge.unresolvedMaterialCount,
    recon_outcome: bridge.reconOutcome,
    allows_timing_reconciled: policy.allowTimingReconciled,
    urm_bridge_persisted_at: persistedAt,
  };
  if (baselineSyncId !== undefined) {
    updatePayload.baseline_sync_id = baselineSyncId;
  }

  const { error: updErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .update(updatePayload)
    .eq("id", runId);
  if (updErr) throw new Error(updErr.message);

  // Read back baseline if we didn't set it this call.
  let resolvedBaseline: string | null = baselineSyncId ?? null;
  if (baselineSyncId === undefined) {
    const { data: after } = await supabase
      .from("audit_ready_tie_out_runs")
      .select("baseline_sync_id")
      .eq("id", runId)
      .maybeSingle();
    resolvedBaseline =
      (after?.baseline_sync_id as string | null | undefined) ?? null;
  }

  return {
    runId,
    bridge,
    grossVarianceCents,
    itemIds,
    baselineSyncId: resolvedBaseline,
    persistedAt,
  };
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
