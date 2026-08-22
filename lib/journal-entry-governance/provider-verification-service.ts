/**
 * JE-3C — Public exact QBO JournalEntry verification entry.
 *
 * Compile-time JE_3C_FEATURE_GATE remains false. Controlled sandbox activation
 * (JE-3D) is the only path that may wire orchestration — and only when
 * VERIFY_SANDBOX_JE capability is deliberately enabled.
 *
 * No Memory. No POST. No discovery authority. No DI/test bypass on public entry.
 */

import { JE_MEMORY_PROJECTION_CONTRACT } from "./memory-projection-contract";
import type { JeExecutionContext } from "./execution-types";
import {
  assertJe3dVerifyActivationPolicy,
  assertJe3dSandboxExecutionCustody,
} from "./je3d-activation-guards";
import { rejectCallerTransportOverrides } from "./je3d-sandbox-environment";
import { buildJe3dProductionVerificationDeps } from "./je3d-production-wiring";
import { loadExactExecution } from "./provider-attempt-service";
import {
  runGovernedJournalEntryVerification,
  type VerifyGovernedJeInput,
  type VerifyGovernedJeResult,
} from "./provider-verification-orchestration";

export type {
  VerifyGovernedJeInput,
  VerifyGovernedJeResult,
} from "./provider-verification-orchestration";

export type VerifyGovernedJournalEntryInput = VerifyGovernedJeInput & {
  callerRealmId?: never;
  callerConnectionId?: never;
  callerProviderId?: never;
  callerAccessToken?: never;
  callerApiHost?: never;
  callerCompanyId?: never;
};

/**
 * Sole public verification surface.
 * Default: fail-closed (VERIFY_SANDBOX_JE capability OFF).
 * When capability is ON: sandbox-only exact-ID GET wiring — still no Memory.
 *
 * Does NOT chain POST + GET. Invoke create and verification separately.
 */
export async function verifyGovernedJournalEntry(
  input: VerifyGovernedJournalEntryInput,
  ctx: JeExecutionContext,
): Promise<VerifyGovernedJeResult> {
  void JE_MEMORY_PROJECTION_CONTRACT;
  rejectCallerTransportOverrides(input as Record<string, unknown>);
  assertJe3dVerifyActivationPolicy();

  const execution = await loadExactExecution(input.executionId);
  if (!execution) {
    return {
      ok: false,
      code: "je_execution_not_found",
      message: "Execution not found.",
      conclusion: "REJECTED",
      getIssued: false,
      memoryWritten: false,
      discoveryUsed: false,
    };
  }

  await assertJe3dSandboxExecutionCustody({ execution });

  return runGovernedJournalEntryVerification(
    { executionId: input.executionId },
    ctx,
    buildJe3dProductionVerificationDeps(),
  );
}
