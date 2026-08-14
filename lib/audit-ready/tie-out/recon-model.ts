/**
 * URM-1 — Universal Reconciliation Model (foundation).
 *
 * Pure types + formula/status helpers. No persistence, no resolver rewrites.
 *
 * Persistence note (locked for URM-2):
 * - `audit_ready_tie_out_variances` remains the measurement layer.
 * - Identified reconciling items become their own workpaper/remediation objects.
 * - Unidentified residual is always derived (never a ReconcilingItem).
 * - This module defines the conceptual contract only.
 */

import type { VarianceClassification } from "@/lib/audit-ready/tie-out/policy";

/**
 * Classification of an identified reconciling item (workpaper/remediation object).
 * Unidentified residual is NOT a class — it is derived:
 * GrossVariance − Σ IdentifiedReconcilingItems.
 */
export type ReconcilingItemClass =
  | "identified_timing"
  | "identified_documented"
  | "identified_reclass"
  | "identified_error";

/**
 * Whether an identified item may contribute to a reconciled outcome.
 * Clearance authority requires an explicit approved policy snapshot.
 */
export type ReconcilingItemClearancePolicy =
  | "may_reconcile_with_timing"
  | "requires_resolution"
  | "immaterial_ok";

/**
 * First-class identified reconciling item (workpaper/remediation object in URM-2).
 * Optional measurementLinkVarianceId ties to the variance measurement layer
 * without making variances the item identity.
 *
 * Never represents unidentified residual — that is derived only.
 */
export type ReconcilingItem = {
  /** Stable workpaper identity once persisted (URM-2). */
  id?: string;
  runId: string;
  itemClass: ReconcilingItemClass;
  /** Signed contribution to the bridge (cents). */
  amountCents: number;
  entityKind?: string;
  entityDisplayName?: string;
  expectedClearDate?: string | null;
  evidenceIds?: string[];
  clearancePolicy: ReconcilingItemClearancePolicy;
  /** Row-level policy classification (reuse existing variance statuses). */
  status: VarianceClassification;
  /**
   * Optional link to `audit_ready_tie_out_variances.id` (measurement layer).
   * Not the item primary key — URM-2 persists items separately.
   */
  measurementLinkVarianceId?: string | null;
};

/**
 * Run-level recon outcome (additive; richer than legacy ties|kickout).
 */
export type ReconOutcome =
  | "reconciled_exact"
  | "reconciled_with_timing"
  | "reconciled_immaterial_residual"
  | "open_review"
  | "open_material"
  | "provider_action_required"
  | "failed";

/** Policy flags that affect outcome derivation (snapshot at compute time). */
export type ReconOutcomePolicy = {
  /** When true, timing identified items may yield reconciled_with_timing. */
  allowTimingReconciled: boolean;
  /** Absolute dollar cap for immaterial unidentified residual (dollars, not cents). */
  immaterialResidualMaxDollar: number;
  /** Percent of |grossVariance| cap for immaterial residual (0–1). */
  immaterialResidualMaxPercent: number;
  /**
   * How dollar vs percent immaterial caps combine.
   * Defaults to both must pass (tighter).
   */
  immaterialComparison?: "dollar_only" | "percent_only" | "tighter_of_both";
};

export type ReconBridgeInput = {
  /** Left − Right (or prepared schedule − GL), in cents. */
  grossVarianceCents: number;
  /** Identified reconciling items only — never residual rows. */
  items: ReadonlyArray<
    Pick<ReconcilingItem, "itemClass" | "amountCents" | "clearancePolicy" | "status">
  >;
  /** Explicit approved policy snapshot required for clearance authority. */
  policy: ReconOutcomePolicy;
  /** Force failed / provider_action_required when the run itself failed. */
  forceOutcome?: Extract<ReconOutcome, "failed" | "provider_action_required">;
};

export type ReconBridgeResult = {
  grossVarianceCents: number;
  identifiedItemsTotalCents: number;
  /** Always Gross − Σ Identified (single mathematical source). */
  unidentifiedResidualCents: number;
  reconcilingItemCount: number;
  unresolvedMaterialCount: number;
  reconOutcome: ReconOutcome;
  /** Legacy badge derived from reconOutcome. */
  legacyTieStatus: "ties" | "kickout";
  /** True when Σ identified + unidentified === gross (cent-exact). */
  isCentExact: boolean;
};

/**
 * Sum identified item amounts (all ReconcilingItem rows are identified).
 */
export function sumIdentifiedItemsCents(
  items: ReadonlyArray<Pick<ReconcilingItem, "amountCents">>,
): number {
  let total = 0;
  for (const item of items) {
    total += item.amountCents;
  }
  return total;
}

/**
 * Cent-exact bridge — sole source of unidentified residual:
 * GrossVariance − Σ IdentifiedReconcilingItems = UnidentifiedResidual
 */
export function computeUnidentifiedResidualCents(
  grossVarianceCents: number,
  identifiedItemsTotalCents: number,
): number {
  return grossVarianceCents - identifiedItemsTotalCents;
}

/**
 * Validate a candidate residual against the derived formula.
 * Callers that project residual into exception/kickout records must use this.
 */
export function assertCentExactResidual(params: {
  grossVarianceCents: number;
  identifiedItemsTotalCents: number;
  unidentifiedResidualCents: number;
}): { ok: true } | { ok: false; expected: number; actual: number } {
  const expected = computeUnidentifiedResidualCents(
    params.grossVarianceCents,
    params.identifiedItemsTotalCents,
  );
  if (expected !== params.unidentifiedResidualCents) {
    return { ok: false, expected, actual: params.unidentifiedResidualCents };
  }
  return { ok: true };
}

/**
 * Material unidentified residual must never silently clear.
 * Returns true when residual is material under policy.
 *
 * Fail-closed: with zero immaterial caps, any non-zero residual is material.
 */
export function isMaterialUnidentifiedResidual(
  unidentifiedResidualCents: number,
  grossVarianceCents: number,
  policy: ReconOutcomePolicy,
): boolean {
  if (unidentifiedResidualCents === 0) return false;
  const absDollar = Math.abs(unidentifiedResidualCents) / 100;
  const absGross = Math.abs(grossVarianceCents) / 100;
  const percent = absGross > 0 ? absDollar / absGross : 1;
  const dollarImmaterial = absDollar <= policy.immaterialResidualMaxDollar;
  const percentImmaterial = percent <= policy.immaterialResidualMaxPercent;
  const mode = policy.immaterialComparison ?? "tighter_of_both";
  let immaterial: boolean;
  switch (mode) {
    case "dollar_only":
      immaterial = dollarImmaterial;
      break;
    case "percent_only":
      immaterial = percentImmaterial;
      break;
    case "tighter_of_both":
    default:
      immaterial = dollarImmaterial && percentImmaterial;
      break;
  }
  return !immaterial;
}

/**
 * Map reconOutcome → legacy face badge (one-release compat).
 * reconciled_* → ties; everything else → kickout.
 */
export function legacyTieStatusFromOutcome(
  outcome: ReconOutcome,
): "ties" | "kickout" {
  switch (outcome) {
    case "reconciled_exact":
    case "reconciled_with_timing":
    case "reconciled_immaterial_residual":
      return "ties";
    default:
      return "kickout";
  }
}

/**
 * Count unresolved material identified items.
 * identified_error or requires_resolution that are not cleared → count.
 */
export function countUnresolvedMaterialItems(
  items: ReadonlyArray<
    Pick<ReconcilingItem, "itemClass" | "clearancePolicy" | "status">
  >,
): number {
  let count = 0;
  for (const item of items) {
    if (item.itemClass === "identified_error" && item.status !== "tie") {
      count += 1;
      continue;
    }
    if (
      item.clearancePolicy === "requires_resolution" &&
      item.status !== "tie" &&
      item.status !== "auto_cleared"
    ) {
      count += 1;
    }
  }
  return count;
}

function hasTimingItems(
  items: ReadonlyArray<Pick<ReconcilingItem, "itemClass" | "clearancePolicy">>,
): boolean {
  return items.some(
    (i) =>
      i.itemClass === "identified_timing" &&
      i.clearancePolicy === "may_reconcile_with_timing",
  );
}

/**
 * Derive run-level reconOutcome + bridge totals.
 *
 * Hard rules:
 * - Unidentified residual is purely derived (single mathematical source)
 * - Material unidentified residual → never reconciled_*
 * - Timing items + allowTimingReconciled → reconciled_with_timing when residual is 0
 * - Exact zero gross with no residual → reconciled_exact
 * - Missing/fail-closed policy cannot grant clearance authority
 */
export function deriveReconBridge(input: ReconBridgeInput): ReconBridgeResult {
  const { grossVarianceCents, items, policy, forceOutcome } = input;

  const identifiedItemsTotalCents = sumIdentifiedItemsCents(items);
  const unidentifiedResidualCents = computeUnidentifiedResidualCents(
    grossVarianceCents,
    identifiedItemsTotalCents,
  );

  // Pure derivation is always cent-exact by construction.
  const isCentExact = true;

  const residualIsMaterial = isMaterialUnidentifiedResidual(
    unidentifiedResidualCents,
    grossVarianceCents,
    policy,
  );

  const unresolvedIdentified = countUnresolvedMaterialItems(items);
  const unresolvedMaterialCount =
    unresolvedIdentified +
    (residualIsMaterial && unidentifiedResidualCents !== 0 ? 1 : 0);

  let reconOutcome: ReconOutcome;
  if (forceOutcome) {
    reconOutcome = forceOutcome;
  } else if (unresolvedIdentified > 0) {
    reconOutcome = "open_material";
  } else if (unidentifiedResidualCents === 0) {
    if (grossVarianceCents === 0) {
      reconOutcome = "reconciled_exact";
    } else if (policy.allowTimingReconciled && hasTimingItems(items)) {
      reconOutcome = "reconciled_with_timing";
    } else {
      // Fully explained by documented/reclass (or timing with policy off).
      reconOutcome =
        hasTimingItems(items) && !policy.allowTimingReconciled
          ? "open_review"
          : "reconciled_exact";
    }
  } else if (residualIsMaterial) {
    // Material unidentified residual — never reconciled_*.
    reconOutcome = "open_material";
  } else {
    reconOutcome = "reconciled_immaterial_residual";
  }

  return {
    grossVarianceCents,
    identifiedItemsTotalCents,
    unidentifiedResidualCents,
    reconcilingItemCount: items.length,
    unresolvedMaterialCount,
    reconOutcome,
    legacyTieStatus: legacyTieStatusFromOutcome(reconOutcome),
    isCentExact,
  };
}

/**
 * Hard rule helper: material unidentified residual must never map to reconciled_*.
 */
export function materialUnidentifiedBlocksReconcile(
  unidentifiedResidualCents: number,
  grossVarianceCents: number,
  policy: ReconOutcomePolicy,
): boolean {
  return isMaterialUnidentifiedResidual(
    unidentifiedResidualCents,
    grossVarianceCents,
    policy,
  );
}

/**
 * Fail-closed foundation default — missing policy must not grant clearance.
 * Timing does not auto-reconcile; any non-zero residual is material.
 * Callers that want permissive behavior must pass an explicit approved policy.
 */
export const DEFAULT_RECON_OUTCOME_POLICY: ReconOutcomePolicy = {
  allowTimingReconciled: false,
  immaterialResidualMaxDollar: 0,
  immaterialResidualMaxPercent: 0,
  immaterialComparison: "tighter_of_both",
};
