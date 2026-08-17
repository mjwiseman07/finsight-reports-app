/**
 * Continuous Close OBSERVE runner (CC-1).
 *
 * Pure orchestration: ingest → controls → exceptions → readiness → memory
 * summary → observe receipt. No provider API calls, no ERP writes, no JE posts,
 * no DB migrations. Callers may optionally publish the receipt via
 * `publishEvent({ eventCategory: "close", ... })` or lifecycle emitters.
 */

import {
  DEFAULT_OBSERVE_POLICY,
  assertContinuousCloseSyncIdentity,
  capabilityForMode,
  isExecutableContinuousCloseMode,
  type ContinuousCloseObservePolicy,
} from "./policy";
import { classifyContinuousCloseExceptions, type ContinuousCloseException } from "./exceptions";
import { composeContinuousCloseReadiness, type ContinuousCloseReadinessResult } from "./readiness";
import {
  buildContinuousCloseMemorySummary,
  type ContinuousCloseMemorySummary,
} from "./memory-summary";
import type {
  ContinuousCloseCapability,
  ContinuousCloseObserveInput,
  ContinuousCloseObserveReceipt,
  ContinuousCloseRunStage,
} from "./types";
import { CONTINUOUS_CLOSE_RUN_STAGES } from "./types";

export type ContinuousCloseObserveResult = {
  ok: boolean;
  mode: "OBSERVE" | ContinuousCloseObserveInput["mode"];
  executable: boolean;
  capability: ContinuousCloseCapability;
  stagesCompleted: ContinuousCloseRunStage[];
  exceptions: ContinuousCloseException[];
  readiness: ContinuousCloseReadinessResult;
  memorySummary: ContinuousCloseMemorySummary;
  receipt: ContinuousCloseObserveReceipt | null;
  /** Always false in CC-1 — documents the hard write boundary. */
  providerWriteAttempted: false;
  journalEntryPostAttempted: false;
};

export function runObserveContinuousClose(
  input: ContinuousCloseObserveInput,
  policy: ContinuousCloseObservePolicy = DEFAULT_OBSERVE_POLICY,
): ContinuousCloseObserveResult {
  const stagesCompleted: ContinuousCloseRunStage[] = [];
  const capability = capabilityForMode(input.mode);
  const executable = isExecutableContinuousCloseMode(input.mode);

  // Stage: ingest_sync — validate identity only (no provider fetch).
  stagesCompleted.push("ingest_sync");
  const identityCheck = assertContinuousCloseSyncIdentity(input.identity);

  if (!executable || !capability.mayEvaluateControls) {
    const exceptions = classifyContinuousCloseExceptions({
      policy,
      statementControl: input.statementControl,
      statementControlContractVersion: input.statementControlContractVersion,
      assertion: input.assertion,
      urmSignals: input.urmSignals,
      syncIdentityOk: identityCheck.ok,
      syncIdentityReason: identityCheck.ok ? undefined : identityCheck.reason,
      modeExecutable: false,
    });
    const readiness = composeContinuousCloseReadiness(exceptions);
    return {
      ok: false,
      mode: input.mode,
      executable: false,
      capability,
      stagesCompleted,
      exceptions,
      readiness,
      memorySummary: buildContinuousCloseMemorySummary(input.memoryRecords),
      receipt: null,
      providerWriteAttempted: false,
      journalEntryPostAttempted: false,
    };
  }

  // Stage: evaluate_controls (statement control + assertion signal already supplied).
  stagesCompleted.push("evaluate_controls");

  // Stage: classify_exceptions
  stagesCompleted.push("classify_exceptions");
  const exceptions = classifyContinuousCloseExceptions({
    policy,
    statementControl: input.statementControl,
    statementControlContractVersion: input.statementControlContractVersion,
    assertion: input.assertion
      ? {
          ...input.assertion,
          maxGapRate: Math.min(input.assertion.maxGapRate, policy.maxAssertionGapRate),
        }
      : null,
    urmSignals: input.urmSignals,
    syncIdentityOk: identityCheck.ok,
    syncIdentityReason: identityCheck.ok ? undefined : identityCheck.reason,
    modeExecutable: true,
  });

  // Stage: compose_readiness
  stagesCompleted.push("compose_readiness");
  const readiness = composeContinuousCloseReadiness(exceptions);

  // Stage: summarize_memory (read-only composition)
  stagesCompleted.push("summarize_memory");
  const memorySummary = capability.maySummarizeMemory
    ? buildContinuousCloseMemorySummary(input.memoryRecords)
    : buildContinuousCloseMemorySummary([]);

  // Stage: emit_observe_receipt (pure receipt object — caller publishes)
  stagesCompleted.push("emit_observe_receipt");
  const receipt: ContinuousCloseObserveReceipt | null = capability.mayEmitObserveReceipt
    ? {
        eventCategory: "close",
        eventType: "continuous_close.observe.completed",
        aggregateType: "continuous_close_run",
        mode: "OBSERVE",
        readinessState: readiness.state,
        provider: input.identity.provider,
        accountingSyncId: input.identity.accountingSyncId,
        companyId: input.identity.companyId,
        exceptionCount: exceptions.length,
        stagesCompleted: [...CONTINUOUS_CLOSE_RUN_STAGES],
      }
    : null;

  return {
    ok: readiness.state === "observe_ready" || readiness.state === "exceptions_open" || readiness.state === "controls_incomplete",
    mode: "OBSERVE",
    executable: true,
    capability,
    stagesCompleted,
    exceptions,
    readiness,
    memorySummary,
    receipt,
    providerWriteAttempted: false,
    journalEntryPostAttempted: false,
  };
}
