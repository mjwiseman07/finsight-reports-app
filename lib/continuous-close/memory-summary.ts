/**
 * Continuous Close memory-ready accounting summary (OBSERVE).
 *
 * Primary output is the close accounting summary (period/provider/sync/
 * readiness/blockers/recon/assertion). Prior Memory records are optional
 * context only — never the primary payload. No Memory writes.
 */

import type { ContinuousCloseException } from "./exceptions";
import type { ContinuousCloseReadinessResult } from "./readiness";
import type {
  AccountingProviderKind,
  ContinuousCloseAssertionSignal,
  ContinuousCloseCapabilitySnapshot,
  ContinuousCloseFreshness,
  ContinuousClosePriorMemoryContext,
  ContinuousCloseReadinessState,
  ContinuousCloseRunIdentity,
  ContinuousCloseSyncIdentity,
  ContinuousCloseUrmNormalizedInput,
} from "./types";

export type ContinuousCloseMemoryReadyAccountingSummary = {
  period: {
    closePeriodId: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    runId: string;
    observedAt: string;
  };
  provider: AccountingProviderKind;
  sync: {
    accountingSyncId: string;
    accountingConnectionId: string;
    companyId: string;
    tenantOrRealmId: string;
  };
  readiness: ContinuousCloseReadinessState;
  blockers: string[];
  reviewItems: string[];
  reconOutcomes: Array<{
    workpaperId: string;
    workpaperKind: string;
    required: boolean;
    outcome: ContinuousCloseUrmNormalizedInput["outcome"];
  }>;
  assertionState: {
    gap: number;
    gapRate: number;
    tested: number;
    partial: number;
  } | null;
  capability: ContinuousCloseCapabilitySnapshot;
  freshness: ContinuousCloseFreshness;
  /** Optional prior Memory context — secondary to the accounting summary. */
  priorMemoryContext: ContinuousClosePriorMemoryContext | null;
};

export function buildContinuousCloseMemoryReadyAccountingSummary(input: {
  run: ContinuousCloseRunIdentity;
  sync: ContinuousCloseSyncIdentity;
  readiness: ContinuousCloseReadinessResult;
  exceptions: readonly ContinuousCloseException[];
  urmInputs: readonly ContinuousCloseUrmNormalizedInput[];
  assertion: ContinuousCloseAssertionSignal | null;
  capability: ContinuousCloseCapabilitySnapshot;
  freshness: ContinuousCloseFreshness;
  priorMemoryContext?: ContinuousClosePriorMemoryContext | null;
}): ContinuousCloseMemoryReadyAccountingSummary {
  const blockers = input.exceptions
    .filter((e) => e.disposition === "block")
    .map((e) => e.code);
  const reviewItems = input.exceptions
    .filter((e) => e.disposition === "review")
    .map((e) => e.code);

  const reconOutcomes = [...input.urmInputs]
    .map((u) => ({
      workpaperId: u.workpaperId,
      workpaperKind: u.workpaperKind,
      required: u.required,
      outcome: u.outcome,
    }))
    .sort((a, b) => a.workpaperId.localeCompare(b.workpaperId));

  return {
    period: {
      closePeriodId: input.run.closePeriodId,
      periodStart: input.run.periodStart ?? null,
      periodEnd: input.run.periodEnd ?? null,
      runId: input.run.runId,
      observedAt: input.run.observedAt,
    },
    provider: input.sync.provider,
    sync: {
      accountingSyncId: input.sync.accountingSyncId,
      accountingConnectionId: input.sync.accountingConnectionId,
      companyId: input.sync.companyId,
      tenantOrRealmId: input.sync.tenantOrRealmId,
    },
    readiness: input.readiness.state,
    blockers,
    reviewItems,
    reconOutcomes,
    assertionState: input.assertion
      ? {
          gap: input.assertion.summary.gap,
          gapRate: input.assertion.summary.gapRate,
          tested: input.assertion.summary.tested,
          partial: input.assertion.summary.partial,
        }
      : null,
    capability: input.capability,
    freshness: input.freshness,
    priorMemoryContext: input.priorMemoryContext ?? null,
  };
}
