/**
 * Continuous Close OBSERVE runner — final fail-closed hardening.
 */

import {
  DEFAULT_OBSERVE_POLICY,
  assertContinuousCloseRunIdentity,
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
  ContinuousCloseCapabilityStatus,
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

export function evaluateContinuousCloseFreshness(
  sync: ContinuousCloseObserveInput["sync"],
  maxAgeHours: number | null,
): ContinuousCloseFreshness {
  const syncedAt = sync.syncedAt ?? null;
  if (maxAgeHours == null) {
    return {
      accountingSyncId: sync.accountingSyncId,
      syncedAt,
      maxAgeHours,
      status: "not_gated",
      isStale: false,
    };
  }
  if (!syncedAt) {
    return {
      accountingSyncId: sync.accountingSyncId,
      syncedAt: null,
      maxAgeHours,
      status: "unknown",
      isStale: false,
    };
  }
  const parsedMs = Date.parse(syncedAt);
  // Missing authority vs known-old: invalid/unparsable timestamps are unknown, not stale.
  if (!Number.isFinite(parsedMs)) {
    return {
      accountingSyncId: sync.accountingSyncId,
      syncedAt,
      maxAgeHours,
      status: "unknown",
      isStale: false,
    };
  }
  const ageMs = Date.now() - parsedMs;
  if (ageMs > maxAgeHours * 3600_000) {
    return {
      accountingSyncId: sync.accountingSyncId,
      syncedAt,
      maxAgeHours,
      status: "stale",
      isStale: true,
    };
  }
  return {
    accountingSyncId: sync.accountingSyncId,
    syncedAt,
    maxAgeHours,
    status: "current",
    isStale: false,
  };
}

function statementControlCapability(
  control: ContinuousCloseObserveInput["statementControl"],
  requiredKeys: readonly string[],
): ContinuousCloseCapabilityStatus {
  if (!control) return "SUPPORTED_AND_UNAVAILABLE";
  if (requiredKeys.length === 0) {
    return control.overallPasses ? "SUPPORTED_AND_PASSED" : "SUPPORTED_AND_FAILED";
  }
  const lines = [...control.balanceSheet.lines, ...control.incomeStatement.lines];
  const requiredFailed = requiredKeys.some((key) => {
    const line = lines.find((l) => l.key === key);
    return !line || !line.passes;
  });
  return requiredFailed ? "SUPPORTED_AND_FAILED" : "SUPPORTED_AND_PASSED";
}

function assertionCapability(
  assertion: ContinuousCloseObserveInput["assertion"],
): ContinuousCloseCapabilityStatus {
  if (!assertion) return "NOT_SUPPORTED";
  return assertion.summary.gap > 0 ? "SUPPORTED_AND_FAILED" : "SUPPORTED_AND_PASSED";
}

function urmCapability(
  urmInputs: ContinuousCloseObserveInput["urmInputs"],
  requiredKinds: readonly string[],
): ContinuousCloseCapabilityStatus {
  if (requiredKinds.length === 0 && urmInputs.length === 0) return "NOT_SUPPORTED";
  if (urmInputs.length === 0) return "SUPPORTED_AND_UNAVAILABLE";
  const blocked = urmInputs.some(
    (u) =>
      u.outcome === "open_material" ||
      u.outcome === "failed" ||
      u.outcome === "provider_action_required",
  );
  return blocked ? "SUPPORTED_AND_FAILED" : "SUPPORTED_AND_PASSED";
}

function memoryCapability(
  prior: ContinuousCloseObserveInput["priorMemoryContext"],
): ContinuousCloseCapabilityStatus {
  if (!prior || prior.recordCount <= 0) return "NOT_SUPPORTED";
  return "SUPPORTED_AND_PASSED";
}

export function buildCapabilityStatus(input: {
  statementControl: ContinuousCloseObserveInput["statementControl"];
  statementControlRequiredKeys: readonly string[];
  assertion: ContinuousCloseObserveInput["assertion"];
  urmInputs: ContinuousCloseObserveInput["urmInputs"];
  requiredReconKinds: readonly string[];
  priorMemoryContext: ContinuousCloseObserveInput["priorMemoryContext"];
}): ContinuousCloseCapabilitySnapshot {
  return {
    statementControl: statementControlCapability(
      input.statementControl,
      input.statementControlRequiredKeys,
    ),
    assertions: assertionCapability(input.assertion),
    urm: urmCapability(input.urmInputs, input.requiredReconKinds),
    memoryContext: memoryCapability(input.priorMemoryContext),
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
  const runCheck = assertContinuousCloseRunIdentity(input.run);
  const freshness = evaluateContinuousCloseFreshness(
    input.sync,
    policy.freshnessMaxAgeHours,
  );

  const capabilityStatus = buildCapabilityStatus({
    statementControl: input.statementControl,
    statementControlRequiredKeys: policy.statementControlRequiredKeys,
    assertion: input.assertion,
    urmInputs: input.urmInputs,
    requiredReconKinds: policy.requiredReconKinds,
    priorMemoryContext: input.priorMemoryContext,
  });

  const classify = (modeExecutable: boolean) =>
    classifyContinuousCloseExceptions({
      policy,
      observeAccountingSyncId: input.sync.accountingSyncId,
      statementControl: input.statementControl,
      statementControlContractVersion: input.statementControlContractVersion,
      assertion: input.assertion,
      urmInputs: input.urmInputs,
      syncIdentityOk: identityCheck.ok,
      syncIdentityReason: identityCheck.ok ? undefined : identityCheck.reason,
      runIdentityOk: runCheck.ok,
      runIdentityReason: runCheck.ok ? undefined : runCheck.reason,
      modeExecutable,
      freshnessStatus: freshness.status,
    });

  if (!executable || !capability.mayEvaluateControls) {
    const exceptions = classify(false);
    const readiness = composeContinuousCloseReadiness(exceptions);
    return {
      ok: false,
      mode: input.mode,
      executable: false,
      capability,
      capabilityStatus,
      freshness,
      stagesCompleted,
      exceptions,
      readiness,
      memoryReadyAccountingSummary: buildContinuousCloseMemoryReadyAccountingSummary({
        run: input.run,
        sync: input.sync,
        readiness,
        exceptions,
        urmInputs: input.urmInputs,
        assertion: input.assertion,
        capability: capabilityStatus,
        freshness,
        policy,
        priorMemoryContext: input.priorMemoryContext,
      }),
      receipt: null,
      providerWriteAttempted: false,
      journalEntryPostAttempted: false,
      memoryWriteAttempted: false,
    };
  }

  stagesCompleted.push("evaluate_controls");
  stagesCompleted.push("classify_exceptions");
  const exceptions = classify(true);

  stagesCompleted.push("compose_readiness");
  const readiness = composeContinuousCloseReadiness(exceptions);

  stagesCompleted.push("summarize_memory");
  const memoryReadyAccountingSummary = buildContinuousCloseMemoryReadyAccountingSummary({
    run: input.run,
    sync: input.sync,
    readiness,
    exceptions,
    urmInputs: input.urmInputs,
    assertion: input.assertion,
    capability: capabilityStatus,
    freshness,
    policy,
    priorMemoryContext: input.priorMemoryContext,
  });

  stagesCompleted.push("emit_observe_receipt");
  const receipt: ContinuousCloseObserveReceipt | null = capability.mayEmitObserveReceipt
    ? {
        eventCategory: "close",
        eventType: "continuous_close.observe.completed",
        aggregateType: "continuous_close_run",
        mode: "OBSERVE",
        runId: input.run.runId,
        closePeriodId: input.run.closePeriodId,
        firmClientId: input.run.firmClientId,
        observedAt: input.run.observedAt,
        readinessState: readiness.state,
        provider: input.sync.provider,
        tenantOrRealmId: input.sync.tenantOrRealmId,
        accountingConnectionId: input.sync.accountingConnectionId,
        accountingSyncId: input.sync.accountingSyncId,
        companyId: input.sync.companyId,
        blockerCount: readiness.blockerCodes.length,
        reviewCount: readiness.reviewCodes.length,
        freshnessStatus: freshness.status,
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
