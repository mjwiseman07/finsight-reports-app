/**
 * Continuous Close OBSERVE policy — final fail-closed hardening.
 *
 * Locked rule: no required statement controls AND no required recon kinds
 * configured → policy invalid → BLOCKED (never silent READY).
 */

import type {
  ContinuousCloseCapability,
  ContinuousCloseMode,
  ExecutableContinuousCloseMode,
  StatementControlPolicyKey,
} from "./types";
import { EXECUTABLE_CONTINUOUS_CLOSE_MODES } from "./types";
import type { ReconOutcome } from "@/lib/audit-ready/tie-out/recon-model";

export type ContinuousCloseAssertionPolicy = {
  gapsRequireReview: boolean;
  /** Null = no universal % gate. */
  blockGapRate: number | null;
};

export type ContinuousCloseUrmPolicy = {
  requiredBlockOutcomes: readonly ReconOutcome[];
  requiredReviewOutcomes: readonly ReconOutcome[];
  optionalBlockOutcomes: readonly ReconOutcome[];
  optionalReviewOutcomes: readonly ReconOutcome[];
};

export type ContinuousCloseEvidencePolicy = {
  /**
   * When true, reconciled* outcomes with evidenceCount < minEvidenceCount
   * are gated. Policy-required recons → BLOCK; optional → review.
   * Do not invent evidence.
   */
  requireEvidenceForReconciled: boolean;
  minEvidenceCountForReconciled: number;
};

export type ContinuousCloseObservePolicy = {
  mode: ExecutableContinuousCloseMode;
  requireStatementControlSnapshotWhenContracted: boolean;
  statementControlRequiredKeys: readonly StatementControlPolicyKey[];
  statementControlOptionalKeys: readonly StatementControlPolicyKey[];
  /** Engagement-required recon kinds (e.g. bank, ar, ap). */
  requiredReconKinds: readonly string[];
  /** Optional recon kinds. */
  optionalReconKinds: readonly string[];
  assertion: ContinuousCloseAssertionPolicy;
  urm: ContinuousCloseUrmPolicy;
  evidence: ContinuousCloseEvidencePolicy;
  /**
   * Cross-sync: URM sourceAccountingSyncId must equal OBSERVE sync id.
   * Mismatch → BLOCKED.
   */
  requireUrmSourceSyncMatch: boolean;
  /** Null disables freshness gating. When set, missing syncedAt → unknown → BLOCK. */
  freshnessMaxAgeHours: number | null;
};

export const DEFAULT_OBSERVE_POLICY: ContinuousCloseObservePolicy = {
  mode: "OBSERVE",
  requireStatementControlSnapshotWhenContracted: true,
  statementControlRequiredKeys: [],
  statementControlOptionalKeys: [],
  requiredReconKinds: [],
  optionalReconKinds: [],
  assertion: {
    gapsRequireReview: true,
    blockGapRate: null,
  },
  urm: {
    requiredBlockOutcomes: ["open_material", "failed", "provider_action_required"],
    requiredReviewOutcomes: ["open_review"],
    optionalBlockOutcomes: ["open_material", "failed"],
    optionalReviewOutcomes: ["open_review", "provider_action_required"],
  },
  evidence: {
    requireEvidenceForReconciled: true,
    minEvidenceCountForReconciled: 1,
  },
  requireUrmSourceSyncMatch: true,
  freshnessMaxAgeHours: null,
};

/**
 * Policy validation — fail closed when no required controls are configured.
 * At least one of statementControlRequiredKeys or requiredReconKinds must be set.
 */
export function validateObservePolicy(
  policy: ContinuousCloseObservePolicy,
): { ok: true } | { ok: false; reason: string } {
  const hasRequiredStatement = policy.statementControlRequiredKeys.length > 0;
  const hasRequiredRecon = policy.requiredReconKinds.length > 0;
  if (!hasRequiredStatement && !hasRequiredRecon) {
    return { ok: false, reason: "no_required_controls_configured" };
  }
  return { ok: true };
}

export function isExecutableContinuousCloseMode(
  mode: ContinuousCloseMode,
): mode is ExecutableContinuousCloseMode {
  return (EXECUTABLE_CONTINUOUS_CLOSE_MODES as readonly string[]).includes(mode);
}

export function capabilityForMode(mode: ContinuousCloseMode): ContinuousCloseCapability {
  if (mode === "OBSERVE") {
    return {
      mayReadSyncSnapshot: true,
      mayEvaluateControls: true,
      mayClassifyExceptions: true,
      mayComposeReadiness: true,
      maySummarizeMemory: true,
      mayEmitObserveReceipt: true,
      mayProposeRemediation: false,
      mayRequireHumanReview: false,
      mayAutoPostJournalEntries: false,
      mayWriteProviderErp: false,
    };
  }
  if (mode === "PROPOSE") {
    return {
      mayReadSyncSnapshot: true,
      mayEvaluateControls: true,
      mayClassifyExceptions: true,
      mayComposeReadiness: true,
      maySummarizeMemory: true,
      mayEmitObserveReceipt: true,
      mayProposeRemediation: true,
      mayRequireHumanReview: false,
      mayAutoPostJournalEntries: false,
      mayWriteProviderErp: false,
    };
  }
  if (mode === "REVIEW_REQUIRED") {
    return {
      mayReadSyncSnapshot: true,
      mayEvaluateControls: true,
      mayClassifyExceptions: true,
      mayComposeReadiness: true,
      maySummarizeMemory: true,
      mayEmitObserveReceipt: true,
      mayProposeRemediation: true,
      mayRequireHumanReview: true,
      mayAutoPostJournalEntries: false,
      mayWriteProviderErp: false,
    };
  }
  return {
    mayReadSyncSnapshot: true,
    mayEvaluateControls: true,
    mayClassifyExceptions: true,
    mayComposeReadiness: true,
    maySummarizeMemory: true,
    mayEmitObserveReceipt: true,
    mayProposeRemediation: true,
    mayRequireHumanReview: true,
    mayAutoPostJournalEntries: false,
    mayWriteProviderErp: false,
  };
}

export function assertContinuousCloseSyncIdentity(identity: {
  tenantOrRealmId?: string | null;
  companyId?: string | null;
  accountingConnectionId?: string | null;
  accountingSyncId?: string | null;
}): { ok: true } | { ok: false; reason: string } {
  if (!String(identity.tenantOrRealmId || "").trim()) {
    return { ok: false, reason: "missing_tenant_or_realm_id" };
  }
  if (!String(identity.companyId || "").trim()) {
    return { ok: false, reason: "missing_company_id" };
  }
  if (!String(identity.accountingConnectionId || "").trim()) {
    return { ok: false, reason: "missing_accounting_connection_id" };
  }
  if (!String(identity.accountingSyncId || "").trim()) {
    return { ok: false, reason: "missing_accounting_sync_id" };
  }
  return { ok: true };
}

export function assertContinuousCloseRunIdentity(run: {
  runId?: string | null;
  observedAt?: string | null;
}): { ok: true } | { ok: false; reason: string } {
  if (!String(run.runId || "").trim()) {
    return { ok: false, reason: "missing_run_id" };
  }
  if (!String(run.observedAt || "").trim()) {
    return { ok: false, reason: "missing_observed_at" };
  }
  return { ok: true };
}

export function isMaterialResidualBlocked(input: {
  outcome: ReconOutcome;
  unidentifiedResidualCents: number | null;
  materialityThresholdCents: number | null;
}): boolean {
  if (input.outcome === "open_material") return true;
  if (
    input.unidentifiedResidualCents != null &&
    input.materialityThresholdCents != null &&
    Math.abs(input.unidentifiedResidualCents) > Math.abs(input.materialityThresholdCents)
  ) {
    return true;
  }
  return false;
}

export function isReconciledOutcome(outcome: ReconOutcome): boolean {
  return (
    outcome === "reconciled_exact" ||
    outcome === "reconciled_with_timing" ||
    outcome === "reconciled_immaterial_residual"
  );
}

/**
 * Policy is sole requiredness authority.
 * - Kind in requiredReconKinds → required (signal cannot downgrade).
 * - Otherwise → not policy-required (signal.required=true cannot create authority).
 */
export function isPolicyRequiredReconKind(
  policy: ContinuousCloseObservePolicy,
  workpaperKind: string,
): boolean {
  return policy.requiredReconKinds.includes(workpaperKind);
}
