/**
 * Continuous Close (CC-1) — domain contracts.
 *
 * OBSERVE-only foundation. Future modes (PROPOSE / REVIEW_REQUIRED / GOVERNED_AUTO)
 * are declared for the state spine but are not executable in this block.
 */

import type { ReconOutcome } from "@/lib/audit-ready/tie-out/recon-model";
import type { CoverageSummary } from "@/lib/assertions/coverage-projection";
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

/** Modes the runtime may execute today. */
export const EXECUTABLE_CONTINUOUS_CLOSE_MODES = ["OBSERVE"] as const;

export type ExecutableContinuousCloseMode = (typeof EXECUTABLE_CONTINUOUS_CLOSE_MODES)[number];

/** Ordered stages inside a single OBSERVE run. */
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

/** Derived readiness projection for OBSERVE (no write authority). */
export type ContinuousCloseReadinessState =
  | "not_ready"
  | "controls_incomplete"
  | "exceptions_open"
  | "observe_ready"
  | "blocked";

/**
 * Capability flags for a mode. OBSERVE is read/evaluate/classify/emit only.
 * Write / post / auto-govern flags stay false until later blocks.
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
 * Sync identity inputs for Continuous Close.
 * Company resolution must follow the existing accounting sync precedence —
 * never invent a company from display names alone.
 */
export type ContinuousCloseSyncIdentity = {
  provider: AccountingProviderKind;
  /** Provider tenant: QBO realmId or Xero tenantId. */
  tenantOrRealmId: string;
  companyId: string;
  accountingConnectionId: string;
  accountingSyncId: string;
  firmClientId?: string | null;
  closePeriodId?: string | null;
};

export type ContinuousCloseUrmSignal = {
  workpaperKind: string;
  outcome: ReconOutcome;
  /** Optional cents residual for materiality messaging (never invents URM math). */
  unidentifiedResidualCents?: number | null;
};

export type ContinuousCloseAssertionSignal = {
  summary: CoverageSummary;
  /** Max allowed gap rate under OBSERVE policy (0–1). */
  maxGapRate: number;
};

export type ContinuousCloseObserveInput = {
  mode: ContinuousCloseMode;
  identity: ContinuousCloseSyncIdentity;
  statementControl: StatementControlResult | null;
  statementControlContractVersion: number | null;
  assertion: ContinuousCloseAssertionSignal | null;
  urmSignals: ContinuousCloseUrmSignal[];
  /** Opaque memory records already loaded by caller (queryMemory). */
  memoryRecords?: ReadonlyArray<{
    memory_key: string;
    memory_type: string;
    confidence_score: number | null;
    persistence_status: string;
    topic?: string | null;
  }>;
  observedAt?: string;
};

export type ContinuousCloseObserveReceipt = {
  eventCategory: "close";
  eventType: "continuous_close.observe.completed";
  aggregateType: "continuous_close_run";
  mode: "OBSERVE";
  readinessState: ContinuousCloseReadinessState;
  provider: AccountingProviderKind;
  accountingSyncId: string;
  companyId: string;
  exceptionCount: number;
  stagesCompleted: ContinuousCloseRunStage[];
};
