/**
 * URM-4 — AR/AP migration onto the universal reconciliation model.
 *
 * Measurement math stays in ar-resolver / ap-resolver (unchanged).
 * This module only:
 * - derives identified items where defensible (v1: none)
 * - maps the explicit URM outcome policy used for AR/AP persist
 * - builds the Reconciling Items backup tab + face URM fields
 *
 * Credit-balance customers / vendor debit balances remain measurement
 * quality flags (variance_cents = 0). They must NOT be summed into the
 * bridge as “explanations” of subledger−GL Gross.
 */

import type { BackupTabSpec, ReconFaceSpec } from "@/lib/audit-ready/tie-out/workpaper-emitter";
import {
  DEFAULT_RECON_OUTCOME_POLICY,
  legacyTieStatusFromOutcome,
  type ReconcilingItem,
  type ReconOutcomePolicy,
} from "@/lib/audit-ready/tie-out/recon-model";
import type { LoadedReconBridge } from "@/lib/audit-ready/tie-out/reconciling-items-persistence";
import { persistReconBridgeForRun } from "@/lib/audit-ready/tie-out/reconciling-items-persistence";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

/**
 * Explicit AR/AP URM outcome policy.
 * Fail-closed: timing does not clear; any non-zero residual is material.
 * Do not silently reuse measurement auto_reconcile thresholds as URM clearance.
 */
export const AR_AP_URM_OUTCOME_POLICY: ReconOutcomePolicy = {
  ...DEFAULT_RECON_OUTCOME_POLICY,
};

export type ArApIdentifiedItemDraft = Omit<ReconcilingItem, "runId" | "id"> & {
  runId?: string;
  id?: string;
};

export type DeriveArIdentifiedItemsInput = {
  runId: string;
  totalsVarianceCents: number;
  /** Customer measurement rows (informational / credit-balance reviews). */
  customerRows: ReadonlyArray<{
    entityQboId: string | null;
    entityDisplayName: string | null;
    subledgerAmountCents: number | null;
    status: string;
    classificationReason: string | null;
  }>;
};

export type DeriveApIdentifiedItemsInput = {
  runId: string;
  totalsVarianceCents: number;
  vendorRows: ReadonlyArray<{
    entityQboId: string | null;
    entityDisplayName: string | null;
    subledgerAmountCents: number | null;
    status: string;
    classificationReason: string | null;
  }>;
};

/**
 * AR identification logic (URM-4 v1).
 *
 * Gross = AR subledger − GL AR control (resolver authority).
 * Open AR QBO aging alone does not deterministically explain that Gross.
 * Credit-balance customers are review flags, not bridge amounts.
 *
 * Correct posture when unexplained: Identified = 0, Unidentified = Gross.
 */
export function deriveArIdentifiedItems(
  _input: DeriveArIdentifiedItemsInput,
): ArApIdentifiedItemDraft[] {
  return [];
}

/**
 * AP identification logic (URM-4 v1).
 *
 * Gross = AP subledger − |GL AP control| (resolver authority).
 * Open AP QBO aging alone does not deterministically explain that Gross.
 * Vendor debit balances are review flags, not bridge amounts.
 *
 * Correct posture when unexplained: Identified = 0, Unidentified = Gross.
 */
export function deriveApIdentifiedItems(
  _input: DeriveApIdentifiedItemsInput,
): ArApIdentifiedItemDraft[] {
  return [];
}

/** Persist sequencing step: after totals_variance_cents is written, before emit. */
export async function persistArUrmBridge(input: DeriveArIdentifiedItemsInput) {
  const items = deriveArIdentifiedItems(input);
  return persistReconBridgeForRun({
    runId: input.runId,
    items,
    policy: AR_AP_URM_OUTCOME_POLICY,
  });
}

export async function persistApUrmBridge(input: DeriveApIdentifiedItemsInput) {
  const items = deriveApIdentifiedItems(input);
  return persistReconBridgeForRun({
    runId: input.runId,
    items,
    policy: AR_AP_URM_OUTCOME_POLICY,
  });
}

/**
 * Apply persisted URM bridge onto the workpaper face.
 * Measurement left/right/variance amounts stay as provided by the emitter.
 * When bridge is present, legacy tieStatus is derived from reconOutcome.
 */
export function applyUrmBridgeToFace(
  face: ReconFaceSpec,
  bridge: LoadedReconBridge | null | undefined,
): ReconFaceSpec {
  if (!bridge || bridge.reconOutcome == null) {
    return face;
  }
  return {
    ...face,
    identifiedItemsTotalCents: bridge.identifiedItemsTotalCents ?? 0,
    unidentifiedResidualCents: bridge.unidentifiedResidualCents ?? 0,
    reconcilingItemCount: bridge.reconcilingItemCount ?? bridge.items.length,
    unresolvedMaterialCount: bridge.unresolvedMaterialCount ?? 0,
    reconOutcome: bridge.reconOutcome,
    allowsTimingReconciled: bridge.allowsTimingReconciled ?? false,
    baselineSyncId: bridge.baselineSyncId,
    providerFamily: "quickbooks",
    tieStatus: legacyTieStatusFromOutcome(bridge.reconOutcome),
  };
}

/**
 * Canonical evidence counts from URM-3 FK spine
 * (`audit_ready_tie_out_variance_evidence.reconciling_item_id`).
 * Never reads `evidence_ids[]` cache.
 */
export async function countEvidenceByReconcilingItemIds(
  reconcilingItemIds: ReadonlyArray<string>,
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of reconcilingItemIds) {
    counts[id] = 0;
  }
  const ids = reconcilingItemIds.filter(Boolean);
  if (ids.length === 0) return counts;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_variance_evidence")
    .select("reconciling_item_id")
    .in("reconciling_item_id", ids);
  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    const itemId = row.reconciling_item_id as string | null;
    if (!itemId) continue;
    counts[itemId] = (counts[itemId] ?? 0) + 1;
  }
  return counts;
}

/**
 * Reconciling Items backup tab — identified rows + derived residual footer.
 *
 * `evidenceCountsByItemId` must come from the FK spine (see
 * countEvidenceByReconcilingItemIds). Passing nothing yields null counts
 * (omitted), never a stale evidence_ids[] length.
 */
export function buildReconcilingItemsBackupTab(
  bridge: LoadedReconBridge,
  evidenceCountsByItemId?: Readonly<Record<string, number>>,
): BackupTabSpec {
  const residual = bridge.unidentifiedResidualCents ?? 0;
  return {
    tabName: "Reconciling Items",
    columns: [
      { key: "item_class", label: "Class", format: "text" },
      { key: "entity", label: "Entity", format: "text" },
      { key: "amount_cents", label: "Amount", format: "currency" },
      { key: "clearance_policy", label: "Clearance", format: "text" },
      { key: "status", label: "Status", format: "text" },
      { key: "evidence_count", label: "Evidence", format: "number" },
      { key: "narrative", label: "Notes", format: "text" },
    ],
    rows: bridge.items.map((item) => ({
      item_class: item.item_class,
      entity: item.entity_display_name,
      amount_cents: item.amount_cents,
      clearance_policy: item.clearance_policy,
      status: item.status,
      evidence_count:
        evidenceCountsByItemId && Object.prototype.hasOwnProperty.call(
          evidenceCountsByItemId,
          item.id,
        )
          ? evidenceCountsByItemId[item.id]!
          : null,
      narrative: item.narrative,
    })),
    subtotalRow: {
      item_class: "unidentified_residual (derived)",
      entity: "Gross − Σ Identified",
      amount_cents: residual,
      clearance_policy: null,
      status: bridge.reconOutcome,
      evidence_count: null,
      narrative: "Not a persisted reconciling item — URM-derived residual",
    },
  };
}
