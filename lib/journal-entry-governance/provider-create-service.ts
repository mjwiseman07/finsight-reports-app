/**
 * JE-3B2 — Public governed QBO JournalEntry create entry.
 *
 * Compile-time JE_3B2_FEATURE_GATE remains false. Controlled sandbox activation
 * (JE-3D) is the only path that may wire orchestration — and only when
 * CREATE_SANDBOX_JE capability is deliberately enabled.
 *
 * No Memory. No legacy poster. No worker. No DI/test bypass surface.
 */

import { JE_MEMORY_PROJECTION_CONTRACT } from "./memory-projection-contract";
import type { JeExecutionContext } from "./execution-types";
import {
  assertJe3dCreateActivationPolicy,
  assertJe3dSandboxExecutionCustody,
} from "./je3d-activation-guards";
import { rejectCallerTransportOverrides } from "./je3d-sandbox-environment";
import { buildJe3dProductionCreateDeps } from "./je3d-production-wiring";
import { loadExactExecution } from "./provider-attempt-service";
import {
  runGovernedJournalEntryCreateOrchestration,
  type ExecuteGovernedJeCreateInput,
  type ExecuteGovernedJeCreateResult,
} from "./provider-create-orchestration";

export type {
  ExecuteGovernedJeCreateInput,
  ExecuteGovernedJeCreateResult,
} from "./provider-create-orchestration";

export type ExecuteGovernedJournalEntryCreateInput = ExecuteGovernedJeCreateInput & {
  /** Forbidden — custody authority is execution-bound only. */
  callerRealmId?: never;
  callerConnectionId?: never;
  callerProviderId?: never;
  callerAccessToken?: never;
  callerApiHost?: never;
  callerCompanyId?: never;
};

/**
 * Sole public create surface.
 * Default: fail-closed (CREATE_SANDBOX_JE capability OFF).
 * When capability is ON: sandbox-only wired orchestration — still no Memory.
 */
export async function executeGovernedJournalEntryCreate(
  input: ExecuteGovernedJournalEntryCreateInput,
  ctx: JeExecutionContext,
): Promise<ExecuteGovernedJeCreateResult> {
  void JE_MEMORY_PROJECTION_CONTRACT;
  rejectCallerTransportOverrides(input as Record<string, unknown>);
  assertJe3dCreateActivationPolicy();

  const execution = await loadExactExecution(input.executionId);
  if (!execution) {
    return {
      ok: false,
      code: "je_execution_not_found",
      message: "Execution not found.",
      providerPostIssued: false,
      memoryWritten: false,
      discoveryRequired: false,
    };
  }

  await assertJe3dSandboxExecutionCustody({ execution });

  return runGovernedJournalEntryCreateOrchestration(
    { executionId: input.executionId },
    ctx,
    buildJe3dProductionCreateDeps(),
  );
}
