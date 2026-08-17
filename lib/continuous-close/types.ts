/**
 * Continuous Close (CC-1) — domain contracts (corrected).
 *
 * Product readiness is READY | READY_WITH_REVIEW | BLOCKED.
 * Only OBSERVE is executable. No ERP writes / JE posts / DB persistence.
 */

import type { ReconOutcome } from "@/lib/audit-ready/tie-out/recon-model";
import type { CoverageSummary } from "@/lib/assertions/coverage-projection";
import type { StatementControlLineKey } from "@/lib/integrations/accounting/statement-control";
import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";

/** Product mode spine. Only OBSERVE is executable in CC-1. */
export type ContinuousCloseMode =
  | "OBSERVE"
  | "PROPOSE"
  | "REVIEW_REQUIRED"
  | "GOVERNED_AUTO";

export const CONTINUOUS_CLOSE_MODES = [
  "OBSERVE",
  "PROPOSE",
  "REVIEW_REQUIRED",
  "GOVERNED_AUTO",
] as const satisfies readonly ContinuousCloseMode[];

export const EXECUTABLE_CONTINUOUS_CLOSE_MODES = ["OBSERVE"] as const;
export type ExecutableContinuousCloseMode = (typeof EXECUTABLE_CONTINUOUS_CLOSE_MODES)[number];

export type ContinuousCloseRunStage =
  | "ingest_sync"
  | "evaluate_controls"
  | "classify_exceptions"
  | "compose_readiness"
  | "summarize_memory"
  | "emit_observe_receipt";

export const CONTINUOUS_CLOSE_RUN_STAGES = [
  "ingest_sync",
  "evaluate_controls",
  "classify_exceptions",
  "compose_readiness",
  "summarize_memory",
  "emit_observe_receipt",
] as const satisfies readonly ContinuousCloseRunStage[];

/** Product-level readiness contract for RA Pro / Continuous Close. */
export type ContinuousCloseReadinessState = "READY" | "READY_WITH_REVIEW" | "BLOCKED";

export type ContinuousCloseCapabilityStatus =
  | "available"
  | "degraded"
  | "unavailable"
  | "not_applicable";

export type ContinuousCloseCapabilitySnapshot = {
  statementControl: ContinuousCloseCapabilityStatus;
  assertions: ContinuousCloseCapabilityStatus;
  urm: ContinuousCloseCapabilityStatus;
  memoryContext: ContinuousCloseCapabilityStatus;
};

/**
 * Mode capability flags. OBSERVE is read/evaluate/classify/emit only.
 * Write / post / auto-govern stay false until later blocks.
 */
export type ContinuousCloseCapability = {
  mayReadSyncSnapshot: boolean;
  mayEvaluateControls: boolean;
  mayClassifyExceptions: boolean;
  mayComposeReadiness: boolean;
  maySummarizeMemory: boolean;
  mayEmitObserveReceipt: boolean;
  mayProposeRemediation: boolean;
  mayRequireHumanReview: boolean;
  mayAutoPostJournalEntries: boolean;
  mayWriteProviderErp: boolean;
};

export type AccountingProviderKind = "quickbooks" | "xero";

/**
 * Sync identity — separate from run/period identity.
 * Company must already be resolved by accounting sync persistence.
 */
export type ContinuousCloseSyncIdentity = {
  provider: AccountingProviderKind;
  tenantOrRealmId: string;
  companyId: string;
  accountingConnectionId: string;
  accountingSyncId: string;
  syncedAt?: string | null;
};

/** Run / period identity for an OBSERVE evaluation. */
export type ContinuousCloseRunIdentity = {
  /** Deterministic when caller omits: hash of period+sync+mode+observedAt day. */
  runId: string;
  closePeriodId: string | null;
  firmClientId: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  observedAt: string;
};

export type ContinuousCloseFreshness = {
  accountingSyncId: string;
  syncedAt: string | null;
  maxAgeHours: number | null;
  isStale: boolean;
};

/**
 * Normalized URM input — outcomes supplied by URM; CC never invents residuals.
 * `required` marks engagement-required recon vs optional.
 */
export type ContinuousCloseUrmNormalizedInput = {
  workpaperId: string;
  workpaperKind: string;
  required: boolean;
  outcome: ReconOutcome;
  unidentifiedResidualCents: number | null;
  /** When set with residual, abs(residual) > threshold ⇒ material block. */
  materialityThresholdCents: number | null;
};

export type ContinuousCloseAssertionSignal = {
  summary: CoverageSummary;
};

export type ContinuousClosePriorMemoryContext = {
  recordCount: number;
  highlightKeys: string[];
};

export type ContinuousCloseObserveInput = {
  mode: ContinuousCloseMode;
  run: ContinuousCloseRunIdentity;
  sync: ContinuousCloseSyncIdentity;
  statementControl: StatementControlResult | null;
  statementControlContractVersion: number | null;
  assertion: ContinuousCloseAssertionSignal | null;
  urmInputs: ContinuousCloseUrmNormalizedInput[];
  /** Optional prior Memory context — never the primary accounting summary. */
  priorMemoryContext?: ContinuousClosePriorMemoryContext | null;
};

export type ContinuousCloseObserveReceipt = {
  eventCategory: "close";
  eventType: "continuous_close.observe.completed";
  aggregateType: "continuous_close_run";
  mode: "OBSERVE";
  runId: string;
  closePeriodId: string | null;
  readinessState: ContinuousCloseReadinessState;
  provider: AccountingProviderKind;
  accountingSyncId: string;
  companyId: string;
  blockerCount: number;
  reviewCount: number;
  stagesCompleted: ContinuousCloseRunStage[];
};

export type StatementControlPolicyKey = StatementControlLineKey;
