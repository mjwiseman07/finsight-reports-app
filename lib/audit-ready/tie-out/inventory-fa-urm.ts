/**
 * URM-5 — Inventory + Fixed Assets migration onto the universal reconciliation model.
 *
 * Measurement math stays in inventory-measure / fa-rollforward-resolver (unchanged).
 * This module only:
 * - derives identified items where defensible (v1: none)
 * - maps the explicit URM outcome policy used for Inventory/FA persist
 * - re-exports shared face / Reconciling Items helpers from URM-4
 *
 * Negative qty/value inventory rows and FA cost/accum presentation flags remain
 * measurement quality signals. They must NOT be summed into the bridge as
 * “explanations” of Gross.
 */

import {
  DEFAULT_RECON_OUTCOME_POLICY,
  type ReconcilingItem,
  type ReconOutcomePolicy,
} from "@/lib/audit-ready/tie-out/recon-model";
import { persistReconBridgeForRun } from "@/lib/audit-ready/tie-out/reconciling-items-persistence";

export {
  applyUrmBridgeToFace,
  buildReconcilingItemsBackupTab,
  countEvidenceByReconcilingItemIds,
} from "@/lib/audit-ready/tie-out/ar-ap-urm";

/**
 * Explicit Inventory/FA URM outcome policy.
 * Fail-closed: timing does not clear; any non-zero residual is material.
 * Do not silently reuse measurement auto_reconcile thresholds as URM clearance.
 */
export const INVENTORY_FA_URM_OUTCOME_POLICY: ReconOutcomePolicy = {
  ...DEFAULT_RECON_OUTCOME_POLICY,
};

export type InventoryFaIdentifiedItemDraft = Omit<
  ReconcilingItem,
  "runId" | "id"
> & {
  runId?: string;
  id?: string;
};

export type DeriveInventoryIdentifiedItemsInput = {
  runId: string;
  totalsVarianceCents: number;
  /** Item measurement rows (informational / negative qty-value reviews). */
  itemRows: ReadonlyArray<{
    entityQboId: string | null;
    entityDisplayName: string | null;
    subledgerAmountCents: number | null;
    status: string;
    classificationReason: string | null;
  }>;
};

export type DeriveFaIdentifiedItemsInput = {
  runId: string;
  totalsVarianceCents: number;
  costVarianceCents: number;
  accumVarianceCents: number;
};

/**
 * Inventory identification logic (URM-5 v1).
 *
 * Gross = Inventory valuation − GL inventory control (resolver authority).
 * Item valuation detail alone does not deterministically explain that Gross.
 * Negative qty / negative asset-value rows are review flags, not bridge amounts.
 *
 * Correct posture when unexplained: Identified = 0, Unidentified = Gross.
 */
export function deriveInventoryIdentifiedItems(
  _input: DeriveInventoryIdentifiedItemsInput,
): InventoryFaIdentifiedItemDraft[] {
  return [];
}

/**
 * Fixed Asset identification logic (URM-5 v1).
 *
 * Gross = NBV schedule − NBV GL
 *       = (costEnd − accumEnd) − (costGlEnd − accumGlEnd) (resolver authority).
 * Cost/accum side variances are measurement diagnostics; without a defensible
 * register-to-GL item mapping they must not invent Identified amounts.
 *
 * Correct posture when unexplained: Identified = 0, Unidentified = Gross.
 */
export function deriveFaIdentifiedItems(
  _input: DeriveFaIdentifiedItemsInput,
): InventoryFaIdentifiedItemDraft[] {
  return [];
}

/** Persist sequencing step: after totals_variance_cents is written, before emit. */
export async function persistInventoryUrmBridge(
  input: DeriveInventoryIdentifiedItemsInput,
) {
  const items = deriveInventoryIdentifiedItems(input);
  return persistReconBridgeForRun({
    runId: input.runId,
    items,
    policy: INVENTORY_FA_URM_OUTCOME_POLICY,
  });
}

export async function persistFaUrmBridge(input: DeriveFaIdentifiedItemsInput) {
  const items = deriveFaIdentifiedItems(input);
  return persistReconBridgeForRun({
    runId: input.runId,
    items,
    policy: INVENTORY_FA_URM_OUTCOME_POLICY,
  });
}
