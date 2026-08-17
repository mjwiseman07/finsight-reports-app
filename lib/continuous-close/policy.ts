/**
 * Continuous Close OBSERVE policy (corrected).
 *
 * Default policy does NOT hardcode universal statement-control lines or an
 * arbitrary assertion-gap percentage. Engagement/caller supplies required keys.
 * Material open residuals and required control failures fail closed → BLOCKED.
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
  /** Gaps create READY_WITH_REVIEW when true. */
  gapsRequireReview: boolean;
  /**
   * Optional explicit block threshold (0–1). Null = no universal % gate.
   * Only applied when the caller opts in via policy — never a silent default.
   */
  blockGapRate: number | null;
};

export type ContinuousCloseUrmPolicy = {
  /** Outcomes that BLOCK when the workpaper is required. */
  requiredBlockOutcomes: readonly ReconOutcome[];
  /** Outcomes that require review when the workpaper is required. */
  requiredReviewOutcomes: readonly ReconOutcome[];
  /**
   * Outcomes that BLOCK even for optional workpapers.
   * Material open variance never becomes soft-open.
   */
  optionalBlockOutcomes: readonly ReconOutcome[];
  /** Outcomes that require review for optional workpapers. */
  optionalReviewOutcomes: readonly ReconOutcome[];
};

export type ContinuousCloseObservePolicy = {
  mode: ExecutableContinuousCloseMode;
  /** Fail closed when contract version >= 1 but statementControl snapshot is missing. */
  requireStatementControlSnapshotWhenContracted: boolean;
  /** Engagement-required statement-control lines (empty by default — not universal). */
  statementControlRequiredKeys: readonly StatementControlPolicyKey[];
  /** Optional lines: failure → review, not block. */
  statementControlOptionalKeys: readonly StatementControlPolicyKey[];
  assertion: ContinuousCloseAssertionPolicy;
  urm: ContinuousCloseUrmPolicy;
  /** Null disables freshness gating. */
  freshnessMaxAgeHours: number | null;
};

/**
 * Starter OBSERVE policy: fail-closed on missing contracted control snapshot and
 * material/failed/provider-required URM outcomes — without inventing a universal
 * KPI line list or assertion % tolerance.
 */
export const DEFAULT_OBSERVE_POLICY: ContinuousCloseObservePolicy = {
  mode: "OBSERVE",
  requireStatementControlSnapshotWhenContracted: true,
  statementControlRequiredKeys: [],
  statementControlOptionalKeys: [],
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
  freshnessMaxAgeHours: null,
};

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

/**
 * Sync identity rule (locked — separate from run/period identity):
 * 1. Provider tenant/realm binds the connection.
 * 2. companyId must already be resolved by sync persistence.
 * 3. Refuse OBSERVE when tenant/realm, companyId, connectionId, or syncId is missing.
 */
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

/** Material residual blocking: uses supplied residual + threshold only (no URM math). */
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
