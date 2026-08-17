/**
 * Continuous Close OBSERVE runner (CC-1 corrected).
 *
 * Pure orchestration only. No provider API calls, ERP writes, JE posts,
 * DB migrations, or Memory writes.
 */

import {
  DEFAULT_OBSERVE_POLICY,
  assertContinuousCloseSyncIdentity,
  capabilityForMode,
  isExecutableContinuousCloseMode,
  type ContinuousCloseObservePolicy,
} from "./policy";
import {
  classifyContinuousCloseExceptions,
  type ContinuousCloseException,
} from "./exceptions";
import {
  composeContinuousCloseReadiness,
  type ContinuousCloseReadinessResult,
} from "./readiness";
import {
  buildContinuousCloseMemoryReadyAccountingSummary,
  type ContinuousCloseMemoryReadyAccountingSummary,
} from "./memory-summary";
import type {
  ContinuousCloseCapability,
  ContinuousCloseCapabilitySnapshot,
  ContinuousCloseFreshness,
  ContinuousCloseObserveInput,
  ContinuousCloseObserveReceipt,
  ContinuousCloseRunStage,
} from "./types";
import { CONTINUOUS_CLOSE_RUN_STAGES } from "./types";

export type ContinuousCloseObserveResult = {
  ok: boolean;
  mode: ContinuousCloseObserveInput["mode"];
  executable: boolean;
  capability: ContinuousCloseCapability;
  capabilityStatus: ContinuousCloseCapabilitySnapshot;
  freshness: ContinuousCloseFreshness;
  stagesCompleted: ContinuousCloseRunStage[];
  exceptions: ContinuousCloseException[];
  readiness: ContinuousCloseReadinessResult;
  memoryReadyAccountingSummary: ContinuousCloseMemoryReadyAccountingSummary;
  receipt: ContinuousCloseObserveReceipt | null;
  providerWriteAttempted: false;
  journalEntryPostAttempted: false;
  memoryWriteAttempted: false;
};

function evaluateFreshness(
  sync: ContinuousCloseObserveInput["sync"],
  maxAgeHours: number | null,
): ContinuousCloseFreshness {
  const syncedAt = sync.syncedAt ?? null;
  if (maxAgeHours == null || !syncedAt) {
    return {
      accountingSyncId: sync.accountingSyncId,
      syncedAt,
      maxAgeHours,
      isStale: false,
    };
  }
  const ageMs = Date.now() - new Date(syncedAt).getTime();
  const isStale = !Number.isFinite(ageMs) || ageMs > maxAgeHours * 3600_000;
  return {
    accountingSyncId: sync.accountingSyncId,
    syncedAt,
    maxAgeHours,
    isStale,
  };
}

function buildCapabilityStatus(input: {
  statementControlPresent: boolean;
  assertionPresent: boolean;
  urmCount: number;
  priorMemoryPresent: boolean;
  freshnessStale: boolean;
}): ContinuousCloseCapabilitySnapshot {
  return {
    statementControl: input.statementControlPresent
      ? "available"
      : "unavailable",
    assertions: input.assertionPresent ? "available" : "not_applicable",
    urm: input.urmCount > 0 ? "available" : "not_applicable",
    memoryContext: input.priorMemoryPresent
      ? input.freshnessStale
        ? "degraded"
        : "available"
      : "not_applicable",
  };
}

export function runObserveContinuousClose(
  input: ContinuousCloseObserveInput,
  policy: ContinuousCloseObservePolicy = DEFAULT_OBSERVE_POLICY,
): ContinuousCloseObserveResult {
  const stagesCompleted: ContinuousCloseRunStage[] = [];
  const capability = capabilityForMode(input.mode);
  const executable = isExecutableContinuousCloseMode(input.mode);

  stagesCompleted.push("ingest_sync");
  const identityCheck = assertContinuousCloseSyncIdentity(input.sync);
  const freshness = evaluateFreshness(input.sync, policy.freshnessMaxAgeHours);

  const emptySummary = (): ContinuousCloseMemoryReadyAccountingSummary =>
    buildContinuousCloseMemoryReadyAccountingSummary({
      run: input.run,
      sync: input.sync,
      readiness: { state: "BLOCKED", blockerCodes: [], reviewCodes: [] },
      exceptions: [],
      urmInputs: input.urmInputs,
      assertion: input.assertion,
      capability: buildCapabilityStatus({
        statementControlPresent: Boolean(input.statementControl),
        assertionPresent: Boolean(input.assertion),
        urmCount: input.urmInputs.length,
        priorMemoryPresent: Boolean(input.priorMemoryContext?.recordCount),
        freshnessStale: freshness.isStale,
      }),
      freshness,
      priorMemoryContext: input.priorMemoryContext,
    });

  if (!executable || !capability.mayEvaluateControls) {
    const exceptions = classifyContinuousCloseExceptions({
      policy,
      statementControl: input.statementControl,
      statementControlContractVersion: input.statementControlContractVersion,
      assertion: input.assertion,
      urmInputs: input.urmInputs,
      syncIdentityOk: identityCheck.ok,
      syncIdentityReason: identityCheck.ok ? undefined : identityCheck.reason,
      modeExecutable: false,
      freshnessStale: freshness.isStale,
    });
    const readiness = composeContinuousCloseReadiness(exceptions);
    return {
      ok: false,
      mode: input.mode,
      executable: false,
      capability,
      capabilityStatus: buildCapabilityStatus({
        statementControlPresent: Boolean(input.statementControl),
        assertionPresent: Boolean(input.assertion),
        urmCount: input.urmInputs.length,
        priorMemoryPresent: Boolean(input.priorMemoryContext?.recordCount),
        freshnessStale: freshness.isStale,
      }),
      freshness,
      stagesCompleted,
      exceptions,
      readiness,
      memoryReadyAccountingSummary: {
        ...emptySummary(),
        readiness: readiness.state,
        blockers: readiness.blockerCodes,
        reviewItems: readiness.reviewCodes,
      },
      receipt: null,
      providerWriteAttempted: false,
      journalEntryPostAttempted: false,
      memoryWriteAttempted: false,
    };
  }

  stagesCompleted.push("evaluate_controls");
  stagesCompleted.push("classify_exceptions");

  const exceptions = classifyContinuousCloseExceptions({
    policy,
    statementControl: input.statementControl,
    statementControlContractVersion: input.statementControlContractVersion,
    assertion: input.assertion,
    urmInputs: input.urmInputs,
    syncIdentityOk: identityCheck.ok,
    syncIdentityReason: identityCheck.ok ? undefined : identityCheck.reason,
    modeExecutable: true,
    freshnessStale: freshness.isStale,
  });

  stagesCompleted.push("compose_readiness");
  const readiness = composeContinuousCloseReadiness(exceptions);

  const capabilityStatus = buildCapabilityStatus({
    statementControlPresent: Boolean(input.statementControl),
    assertionPresent: Boolean(input.assertion),
    urmCount: input.urmInputs.length,
    priorMemoryPresent: Boolean(input.priorMemoryContext?.recordCount),
    freshnessStale: freshness.isStale,
  });

  stagesCompleted.push("summarize_memory");
  const memoryReadyAccountingSummary = capability.maySummarizeMemory
    ? buildContinuousCloseMemoryReadyAccountingSummary({
        run: input.run,
        sync: input.sync,
        readiness,
        exceptions,
        urmInputs: input.urmInputs,
        assertion: input.assertion,
        capability: capabilityStatus,
        freshness,
        priorMemoryContext: input.priorMemoryContext,
      })
    : emptySummary();

  stagesCompleted.push("emit_observe_receipt");
  const receipt: ContinuousCloseObserveReceipt | null = capability.mayEmitObserveReceipt
    ? {
        eventCategory: "close",
        eventType: "continuous_close.observe.completed",
        aggregateType: "continuous_close_run",
        mode: "OBSERVE",
        runId: input.run.runId,
        closePeriodId: input.run.closePeriodId,
        readinessState: readiness.state,
        provider: input.sync.provider,
        accountingSyncId: input.sync.accountingSyncId,
        companyId: input.sync.companyId,
        blockerCount: readiness.blockerCodes.length,
        reviewCount: readiness.reviewCodes.length,
        stagesCompleted: [...CONTINUOUS_CLOSE_RUN_STAGES],
      }
    : null;

  return {
    ok: readiness.state !== "BLOCKED",
    mode: "OBSERVE",
    executable: true,
    capability,
    capabilityStatus,
    freshness,
    stagesCompleted,
    exceptions,
    readiness,
    memoryReadyAccountingSummary,
    receipt,
    providerWriteAttempted: false,
    journalEntryPostAttempted: false,
    memoryWriteAttempted: false,
  };
}
