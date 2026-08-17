/**
 * Continuous Close (CC-1) — final hardened domain contracts.
 *
 * Product readiness: READY | READY_WITH_REVIEW | BLOCKED.
 * OBSERVE only executable. No ERP writes / JE posts / DB / Memory writes.
 */

import type { ReconOutcome } from "@/lib/audit-ready/tie-out/recon-model";
import type { CoverageSummary } from "@/lib/assertions/coverage-projection";
import type { StatementControlLineKey } from "@/lib/integrations/accounting/statement-control";
import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";

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

export type ContinuousCloseReadinessState = "READY" | "READY_WITH_REVIEW" | "BLOCKED";

/**
 * Normalized accounting-source capability semantics.
 * Distinguishes supported-and-passed from supported-and-failed.
 */
export type ContinuousCloseCapabilityStatus =
  | "SUPPORTED_AND_PASSED"
  | "SUPPORTED_AND_FAILED"
  | "SUPPORTED_AND_UNAVAILABLE"
  | "NOT_SUPPORTED";

export type ContinuousCloseCapabilitySnapshot = {
  statementControl: ContinuousCloseCapabilityStatus;
  assertions: ContinuousCloseCapabilityStatus;
  urm: ContinuousCloseCapabilityStatus;
  memoryContext: ContinuousCloseCapabilityStatus;
};

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

export type ContinuousCloseSyncIdentity = {
  provider: AccountingProviderKind;
  tenantOrRealmId: string;
  companyId: string;
  accountingConnectionId: string;
  accountingSyncId: string;
  syncedAt?: string | null;
};

/**
 * Run identity contract: non-empty `runId` is mandatory custody key for OBSERVE.
 * Separate from sync identity.
 */
export type ContinuousCloseRunIdentity = {
  runId: string;
  closePeriodId: string | null;
  firmClientId: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  observedAt: string;
};

export type ContinuousCloseFreshnessStatus = "current" | "stale" | "unknown" | "not_gated";

export type ContinuousCloseFreshness = {
  accountingSyncId: string;
  syncedAt: string | null;
  maxAgeHours: number | null;
  status: ContinuousCloseFreshnessStatus;
  /** True only when status === "stale". Unknown is NOT stale — it blocks separately. */
  isStale: boolean;
};

/**
 * Authoritative URM measurement/provenance projection.
 * Values are supplied by URM — Continuous Close never recomputes them.
 */
export type ContinuousCloseUrmNormalizedInput = {
  workpaperId: string;
  workpaperKind: string;
  required: boolean;
  outcome: ReconOutcome;
  unidentifiedResidualCents: number | null;
  materialityThresholdCents: number | null;
  /** Authoritative gross variance from URM measurement layer (cents). */
  grossVarianceCents: number | null;
  /** Sum of identified reconciling items (cents). */
  identifiedTotalCents: number | null;
  evidenceCount: number;
  /** Sync that produced this workpaper measurement. */
  sourceAccountingSyncId: string;
  /** As-of / workpaper date (ISO date or datetime). */
  asOfDate: string | null;
  /** URM run / workpaper run identity. */
  urmRunId: string | null;
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
  priorMemoryContext?: ContinuousClosePriorMemoryContext | null;
};

/** Receipt custody fields for later persistence / event publish. */
export type ContinuousCloseObserveReceipt = {
  eventCategory: "close";
  eventType: "continuous_close.observe.completed";
  aggregateType: "continuous_close_run";
  mode: "OBSERVE";
  runId: string;
  closePeriodId: string | null;
  firmClientId: string | null;
  observedAt: string;
  readinessState: ContinuousCloseReadinessState;
  provider: AccountingProviderKind;
  tenantOrRealmId: string;
  accountingConnectionId: string;
  accountingSyncId: string;
  companyId: string;
  blockerCount: number;
  reviewCount: number;
  freshnessStatus: ContinuousCloseFreshnessStatus;
  stagesCompleted: ContinuousCloseRunStage[];
};

export type StatementControlPolicyKey = StatementControlLineKey;
