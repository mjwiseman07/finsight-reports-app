/**
 * URM-1 — Universal Reconciliation Model (foundation).
 *
 * Pure types + formula/status helpers. No persistence, no resolver rewrites.
 *
 * Persistence note (locked for URM-2):
 * - `audit_ready_tie_out_variances` remains the measurement layer.
 * - Identified reconciling items become their own workpaper/remediation objects.
 * - This module defines the conceptual contract only.
 */

import type { VarianceClassification } from "@/lib/audit-ready/tie-out/policy";

/** Classification of a first-class reconciling item on the recon face. */
export type ReconcilingItemClass =
  | "identified_timing"
  | "identified_documented"
  | "identified_reclass"
  | "identified_error"
  | "unidentified_residual";

/**
 * Whether an identified item may contribute to a reconciled outcome.
 * Unidentified residual never uses may_reconcile_with_timing.
 */
export type ReconcilingItemClearancePolicy =
  | "may_reconcile_with_timing"
  | "requires_resolution"
  | "immaterial_ok";

/**
 * First-class reconciling item (workpaper/remediation object in URM-2).
 * Optional measurementLinkVarianceId ties to the variance measurement layer
 * without making variances the item identity.
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
  /** When true, timing-only identified items may yield reconciled_with_timing. */
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
  items: ReadonlyArray<Pick<ReconcilingItem, "itemClass" | "amountCents" | "clearancePolicy" | "status">>;
  policy: ReconOutcomePolicy;
  /** Force failed / provider_action_required when the run itself failed. */
  forceOutcome?: Extract<ReconOutcome, "failed" | "provider_action_required">;
};

export type ReconBridgeResult = {
  grossVarianceCents: number;
  identifiedItemsTotalCents: number;
  unidentifiedResidualCents: number;
  reconcilingItemCount: number;
  unresolvedMaterialCount: number;
  reconOutcome: ReconOutcome;
  /** Legacy badge derived from reconOutcome. */
  legacyTieStatus: "ties" | "kickout";
  /** True when Σ identified + unidentified === gross (cent-exact). */
  isCentExact: boolean;
};

const IDENTIFIED_CLASSES: ReadonlySet<ReconcilingItemClass> = new Set([
  "identified_timing",
  "identified_documented",
  "identified_reclass",
  "identified_error",
]);

/**
 * Sum identified item amounts (excludes unidentified_residual rows).
 */
export function sumIdentifiedItemsCents(
  items: ReadonlyArray<Pick<ReconcilingItem, "itemClass" | "amountCents">>,
): number {
  let total = 0;
  for (const item of items) {
    if (IDENTIFIED_CLASSES.has(item.itemClass)) {
      total += item.amountCents;
    }
  }
  return total;
}

/**
 * Sum explicit unidentified_residual rows, if any.
 * When none are present, residual is derived as gross − identified.
 */
export function sumUnidentifiedResidualRowsCents(
  items: ReadonlyArray<Pick<ReconcilingItem, "itemClass" | "amountCents">>,
): number | null {
  let found = false;
  let total = 0;
  for (const item of items) {
    if (item.itemClass === "unidentified_residual") {
      found = true;
      total += item.amountCents;
    }
  }
  return found ? total : null;
}

/**
 * Cent-exact bridge:
 * GrossVariance − Σ Identified = UnidentifiedResidual
 */
export function computeUnidentifiedResidualCents(
  grossVarianceCents: number,
  identifiedItemsTotalCents: number,
): number {
  return grossVarianceCents - identifiedItemsTotalCents;
}

/**
 * Validate that residual rows (if present) match the formula residual.
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
 * Count unresolved material identified items (excludes residual rows).
 * identified_error or requires_resolution that are not cleared → count.
 */
export function countUnresolvedMaterialItems(
  items: ReadonlyArray<
    Pick<ReconcilingItem, "itemClass" | "clearancePolicy" | "status">
  >,
): number {
  let count = 0;
  for (const item of items) {
    if (!IDENTIFIED_CLASSES.has(item.itemClass)) continue;
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
 * - Material unidentified residual → never reconciled_*
 * - Timing items + allowTimingReconciled → reconciled_with_timing when residual is 0
 * - Exact zero gross with no residual → reconciled_exact
 */
export function deriveReconBridge(input: ReconBridgeInput): ReconBridgeResult {
  const { grossVarianceCents, items, policy, forceOutcome } = input;

  const identifiedItemsTotalCents = sumIdentifiedItemsCents(items);
  const residualFromRows = sumUnidentifiedResidualRowsCents(items);
  const formulaResidual = computeUnidentifiedResidualCents(
    grossVarianceCents,
    identifiedItemsTotalCents,
  );
  const unidentifiedResidualCents =
    residualFromRows === null ? formulaResidual : residualFromRows;

  const centCheck = assertCentExactResidual({
    grossVarianceCents,
    identifiedItemsTotalCents,
    unidentifiedResidualCents,
  });
  const isCentExact = centCheck.ok;

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
  } else if (!isCentExact) {
    reconOutcome = "failed";
  } else if (unresolvedIdentified > 0) {
    reconOutcome = "open_material";
  } else if (unidentifiedResidualCents === 0) {
    if (grossVarianceCents === 0) {
      reconOutcome = "reconciled_exact";
    } else if (policy.allowTimingReconciled && hasTimingItems(items)) {
      reconOutcome = "reconciled_with_timing";
    } else {
      // Fully explained by documented/reclass (or timing with policy off → still exact bridge).
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

/** Default outcome policy used when emitters have not yet supplied one. */
export const DEFAULT_RECON_OUTCOME_POLICY: ReconOutcomePolicy = {
  allowTimingReconciled: true,
  immaterialResidualMaxDollar: 1,
  immaterialResidualMaxPercent: 0.001,
  immaterialComparison: "tighter_of_both",
};
