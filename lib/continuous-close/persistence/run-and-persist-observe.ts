/**
 * CC-2B composition: authoritative observation → CC-1 OBSERVE → persist.
 *
 * Does not wire the worker, cron, regenerate, Auto-JE, Memory, or provider writes.
 * Observe policy is a required caller argument — never a silent empty default.
 */

import { randomUUID } from "node:crypto";
import { runAuthoritativeArApInventoryObservation } from "@/lib/audit-ready/authoritative-observation/run-authoritative-ar-ap-inventory-observation";
import { requireVerifiedUserPrincipal } from "@/lib/audit-ready/authoritative-observation/principal";
import type {
  AuthoritativeObservationExecutionContext,
  AuthoritativeObservationInput,
  AuthoritativeObservationResult,
} from "@/lib/audit-ready/authoritative-observation/types";
import {
  runObserveContinuousClose,
  type ContinuousCloseObserveResult,
} from "@/lib/continuous-close/observe";
import type { ContinuousCloseObservePolicy } from "@/lib/continuous-close/policy";
import type {
  ContinuousCloseAssertionSignal,
  ContinuousCloseObserveInput,
} from "@/lib/continuous-close/types";
import type { StatementControlResult } from "@/lib/integrations/accounting/statement-control";
import { mapAuthoritativeObservationToUrmInputs } from "./authoritative-urm-mapper";
import {
  canonicalizeObservePolicy,
  hashObserveIdempotencyKey,
  hashObserveInput,
  hashObservePolicy,
} from "./hash";
import type { AuthoritativeUrmMapperDeps } from "./authoritative-urm-mapper";
import {
  PersistObserveLoadError,
  countUrmEvidenceSpine,
  loadAuthoritativeUrmRunFacts,
  loadContinuousCloseRunByIdempotencyKey,
  loadEngagementScope,
  loadExactClosePeriodId,
  loadExactObserveAccountingSync,
  loadPriorContinuousCloseRunId,
} from "./loaders";
import { PersistObserveWriteError, persistContinuousCloseObserveRun } from "./repository";
import {
  PERSIST_OBSERVE_ERROR,
  type ContinuousCloseRunRow,
  type ObservationSummary,
  type ObserveAccountingState,
  type PersistContinuousCloseRunResult,
  type RunAndPersistAuthoritativeObserveResult,
  type SelectedUrmRuns,
} from "./types";

const SECRET_JSON_RE =
  /access[_-]?token|refresh[_-]?token|"authorization"|authorization:/i;

export type PersistObserveDeps = {
  runObservation: (
    input: AuthoritativeObservationInput,
    executionContext: AuthoritativeObservationExecutionContext,
  ) => Promise<AuthoritativeObservationResult>;
  loadAccountingState: (args: {
    accountingSyncId: string;
    expectedCompanyId: string;
    expectedPeriodEnd: string;
  }) => Promise<ObserveAccountingState>;
  mapUrm: typeof mapAuthoritativeObservationToUrmInputs;
  loadEngagementScope: typeof loadEngagementScope;
  loadClosePeriodId: typeof loadExactClosePeriodId;
  loadAssertion: (args: {
    closePeriodId: string | null;
  }) => Promise<ContinuousCloseAssertionSignal | null>;
  loadPriorRunId: typeof loadPriorContinuousCloseRunId;
  loadByIdempotencyKey: typeof loadContinuousCloseRunByIdempotencyKey;
  persistRun: typeof persistContinuousCloseObserveRun;
  urmMapperDeps?: AuthoritativeUrmMapperDeps;
  newRunId: () => string;
  nowIso: () => string;
};

export function hasCompleteAuthoritativeSnapshotTrio(
  observation: AuthoritativeObservationResult,
): boolean {
  if (!String(observation.accountingSyncId || "").trim()) return false;
  const present = new Set(observation.custody.snapshotsPresent || []);
  return present.has("ar_aging") && present.has("ap_aging") && present.has("inventory");
}

export function createDefaultPersistObserveDeps(): PersistObserveDeps {
  return {
    async runObservation(input, executionContext) {
      return runAuthoritativeArApInventoryObservation(input, executionContext);
    },
    loadAccountingState: loadExactObserveAccountingSync,
    mapUrm: mapAuthoritativeObservationToUrmInputs,
    loadEngagementScope,
    loadClosePeriodId: loadExactClosePeriodId,
    async loadAssertion() {
      return null;
    },
    loadPriorRunId: loadPriorContinuousCloseRunId,
    loadByIdempotencyKey: loadContinuousCloseRunByIdempotencyKey,
    persistRun: persistContinuousCloseObserveRun,
    newRunId: () => randomUUID(),
    nowIso: () => new Date().toISOString(),
  };
}

function assertNoSecrets(label: string, value: unknown): void {
  const json = JSON.stringify(value);
  if (json && SECRET_JSON_RE.test(json)) {
    throw new Error(`${label} must not contain tokens or authorization headers.`);
  }
}

function requireExplicitPolicy(
  policy: ContinuousCloseObservePolicy | null | undefined,
): ContinuousCloseObservePolicy {
  if (!policy || typeof policy !== "object") {
    throw Object.assign(new Error("ContinuousCloseObservePolicy is required."), {
      code: PERSIST_OBSERVE_ERROR.POLICY_REQUIRED,
    });
  }
  return policy;
}

function observationSummaryFrom(
  observation: AuthoritativeObservationResult,
): ObservationSummary {
  const slot = (
    value: AuthoritativeObservationResult["reconciliations"]["ar"],
  ) => ({
    runId: value?.runId ?? null,
    authoritative: Boolean(value?.authoritative),
    baselineSyncId: value?.baselineSyncId ?? null,
  });
  return {
    observationId: observation.observationId,
    observationMode: observation.mode as ObservationSummary["observationMode"],
    acquisitionId: observation.acquisitionId,
    accountingSyncId: String(observation.accountingSyncId || ""),
    periodEnd: observation.periodEnd,
    status: observation.status,
    reconciliations: {
      ar: slot(observation.reconciliations.ar),
      ap: slot(observation.reconciliations.ap),
      inventory: slot(observation.reconciliations.inventory),
    },
    snapshotHashes: observation.custody.snapshotHashes,
  };
}

function persistableObserveResult(
  result: ContinuousCloseObserveResult,
): Record<string, unknown> {
  return {
    ok: result.ok,
    mode: result.mode,
    executable: result.executable,
    capability: result.capability,
    capabilityStatus: result.capabilityStatus,
    freshness: result.freshness,
    stagesCompleted: result.stagesCompleted,
    exceptions: result.exceptions,
    readiness: result.readiness,
    memoryReadyAccountingSummary: result.memoryReadyAccountingSummary,
    receipt: result.receipt,
    providerWriteAttempted: result.providerWriteAttempted,
    journalEntryPostAttempted: result.journalEntryPostAttempted,
    memoryWriteAttempted: result.memoryWriteAttempted,
  };
}

export async function runAndPersistAuthoritativeObserve(
  input: AuthoritativeObservationInput,
  executionContext: AuthoritativeObservationExecutionContext,
  observePolicy: ContinuousCloseObservePolicy,
  deps?: Partial<PersistObserveDeps>,
): Promise<RunAndPersistAuthoritativeObserveResult> {
  const resolved: PersistObserveDeps = {
    ...createDefaultPersistObserveDeps(),
    ...deps,
  };

  let policy: ContinuousCloseObservePolicy;
  try {
    policy = requireExplicitPolicy(observePolicy);
    requireVerifiedUserPrincipal(executionContext);
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : PERSIST_OBSERVE_ERROR.POLICY_REQUIRED;
    return {
      ok: false,
      code,
      message: error instanceof Error ? error.message : "invalid persist observe input",
    };
  }

  const observation = await resolved.runObservation(input, executionContext);
  if (!hasCompleteAuthoritativeSnapshotTrio(observation)) {
    const failure = observation.failures[0];
    return {
      ok: false,
      code:
        failure?.code ||
        (observation.status === "failed"
          ? PERSIST_OBSERVE_ERROR.OBSERVATION_FAILED
          : PERSIST_OBSERVE_ERROR.TRIO_INCOMPLETE),
      message:
        failure?.message ||
        "Authoritative observation did not establish a complete AR+AP+Inventory snapshot trio.",
      observation,
    };
  }

  const createdBy = requireVerifiedUserPrincipal(executionContext).userId;
  const accountingSyncId = String(observation.accountingSyncId);
  const companyId = String(observation.companyId || "");
  const periodEnd = String(observation.periodEnd || "");

  let accounting: ObserveAccountingState;
  try {
    accounting = await resolved.loadAccountingState({
      accountingSyncId,
      expectedCompanyId: companyId,
      expectedPeriodEnd: periodEnd,
    });
  } catch (error) {
    if (error instanceof PersistObserveLoadError) {
      return { ok: false, code: error.code, message: error.message, observation };
    }
    return {
      ok: false,
      code: PERSIST_OBSERVE_ERROR.SYNC_UNAVAILABLE,
      message: error instanceof Error ? error.message : "accounting sync load failed",
      observation,
    };
  }

  const { urmInputs, selectedUrmRuns } = await resolved.mapUrm({
    observation,
    policy,
    deps: resolved.urmMapperDeps ?? {
      loadRunFacts: loadAuthoritativeUrmRunFacts,
      countEvidence: countUrmEvidenceSpine,
    },
  });

  const scope = await resolved.loadEngagementScope(input.engagementId);
  const closePeriodId = await resolved.loadClosePeriodId({
    firmClientId: scope.firmClientId,
    periodStart: accounting.periodStart,
    periodEnd: accounting.periodEnd,
  });
  const assertion = await resolved.loadAssertion({ closePeriodId });

  const policySnapshot = canonicalizeObservePolicy(policy);
  const policyHash = hashObservePolicy(policy);
  const inputHash = hashObserveInput({
    accountingSyncId: accounting.accountingSyncId,
    selectedUrmRuns,
    statementControlContractVersion: accounting.statementControlContractVersion,
    assertionReference: assertion && closePeriodId ? { closePeriodId } : null,
    observationMode: observation.mode || input.mode,
    policyHash,
  });
  const idempotencyKey = hashObserveIdempotencyKey({
    companyId: accounting.companyId,
    engagementId: input.engagementId,
    periodEnd: accounting.periodEnd,
    accountingSyncId: accounting.accountingSyncId,
    mode: "OBSERVE",
    policyHash,
    inputHash,
  });

  const existing = await resolved.loadByIdempotencyKey(idempotencyKey);
  if (existing) {
    return {
      ok: true,
      reused: true,
      run: existing,
      observe: null,
      observation,
      ledgerEventId: null,
    };
  }

  const startedAt = resolved.nowIso();
  const observeInput: ContinuousCloseObserveInput = {
    mode: "OBSERVE",
    run: {
      runId: resolved.newRunId(),
      closePeriodId,
      firmClientId: scope.firmClientId,
      periodStart: accounting.periodStart,
      periodEnd: accounting.periodEnd,
      observedAt: startedAt,
    },
    sync: {
      provider: accounting.provider,
      tenantOrRealmId: accounting.tenantOrRealmId,
      companyId: accounting.companyId,
      accountingConnectionId: accounting.accountingConnectionId,
      accountingSyncId: accounting.accountingSyncId,
      syncedAt: accounting.syncedAt,
    },
    statementControl: (accounting.statementControl as StatementControlResult | null) ?? null,
    statementControlContractVersion: accounting.statementControlContractVersion,
    assertion,
    urmInputs,
    priorMemoryContext: null,
  };

  const observe = runObserveContinuousClose(observeInput, policy);
  const completedAt = resolved.nowIso();
  const priorId = await resolved.loadPriorRunId({
    engagementId: input.engagementId,
    periodEnd: accounting.periodEnd,
    accountingSyncId: accounting.accountingSyncId,
  });
  const summary = observationSummaryFrom(observation);
  const resultJson = persistableObserveResult(observe);
  assertNoSecrets("observation_summary", summary);
  assertNoSecrets("result", resultJson);
  assertNoSecrets("policy_snapshot", policySnapshot);

  const row: ContinuousCloseRunRow = {
    id: observeInput.run.runId,
    company_id: accounting.companyId,
    engagement_id: input.engagementId,
    firm_client_id: scope.firmClientId,
    close_period_id: closePeriodId,
    accounting_sync_id: accounting.accountingSyncId,
    period_end: accounting.periodEnd,
    mode: "OBSERVE",
    readiness: observe.readiness.state,
    status: "completed",
    policy_hash: policyHash,
    input_hash: inputHash,
    policy_snapshot: policySnapshot as unknown as Record<string, unknown>,
    observation_summary: summary as unknown as Record<string, unknown>,
    result: resultJson,
    created_by: createdBy,
    started_at: startedAt,
    completed_at: completedAt,
    supersedes_run_id: priorId && priorId !== observeInput.run.runId ? priorId : null,
    idempotency_key: idempotencyKey,
  };

  const eventPayload = {
    continuous_close_run_id: row.id,
    accounting_sync_id: row.accounting_sync_id,
    engagement_id: row.engagement_id,
    period_end: row.period_end,
    readiness: row.readiness,
    policy_hash: row.policy_hash,
    input_hash: row.input_hash,
    observation_mode: observation.mode || input.mode,
    authoritative_urm_run_ids: selectedUrmRuns as SelectedUrmRuns,
    blocker_count: observe.readiness.blockerCodes.length,
    review_count: observe.readiness.reviewCodes.length,
  };
  assertNoSecrets("ledger_event_payload", eventPayload);

  let persisted: PersistContinuousCloseRunResult;
  try {
    persisted = await resolved.persistRun({
      row,
      eventPayload,
      firmId: scope.firmId,
      firmClientId: scope.firmClientId,
      engagementId: input.engagementId,
      closePeriodId,
      actorId: createdBy,
    });
  } catch (error) {
    const code =
      error instanceof PersistObserveWriteError
        ? error.code
        : PERSIST_OBSERVE_ERROR.PERSIST_FAILED;
    return {
      ok: false,
      code,
      message: error instanceof Error ? error.message : "persist failed",
      observation,
    };
  }

  return {
    ok: true,
    reused: persisted.reused,
    run: persisted.row,
    observe: persisted.reused ? null : observe,
    observation,
    ledgerEventId: persisted.ledgerEventId,
  };
}
