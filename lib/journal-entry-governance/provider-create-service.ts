/**
 * JE-3B2 — Public governed QBO JournalEntry create entry.
 *
 * Compile-time JE_3B2_FEATURE_GATE remains false. Controlled sandbox activation
 * (JE-3D) is the only path that may wire orchestration — and only when
 * CREATE_SANDBOX_JE capability is deliberately enabled.
 *
 * First-run activation additionally requires an exact approved execution ID
 * and revalidated $1.00 USD economics before dispatch.
 *
 * No Memory. No legacy poster. No worker. No DI/test bypass surface.
 */

import { JE_MEMORY_PROJECTION_CONTRACT } from "./memory-projection-contract";
import type { JeExecutionContext } from "./execution-types";
import { resolveJe3dActivationPolicy } from "./je3d-first-controlled-create-activation";
import {
  assertJe3dCreateActivationPolicy,
  assertJe3dSandboxExecutionCustody,
} from "./je3d-activation-guards";
import { rejectCallerTransportOverrides } from "./je3d-sandbox-environment";
import { evaluateFirstRunCreateAuthority } from "./je3d-first-run-execution-authority";
import { buildJe3dProductionCreateDeps } from "./je3d-production-wiring";
import { loadExactJournalEntryProposal } from "./approval-custody";
import { loadExactExecution } from "./provider-attempt-service";
import { loadAccountsFromCoaMirror } from "./source-custody";
import type { CoaMirrorAccountRow } from "./je3d-first-run-account-authority";
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

function firstRunDenied(
  code: string,
  message: string,
): ExecuteGovernedJeCreateResult {
  return {
    ok: false,
    code,
    message,
    providerPostIssued: false,
    memoryWritten: false,
    discoveryRequired: false,
  };
}

async function loadCoaMirrorRowsForProposal(args: {
  firmClientId: string | null;
  accountIds: string[];
}): Promise<CoaMirrorAccountRow[]> {
  if (!args.firmClientId) {
    throw new Error("firm_client_id is required for first-run COA revalidation.");
  }
  const accounts = await loadAccountsFromCoaMirror({
    firmClientId: args.firmClientId,
    accountIds: args.accountIds,
  });
  return [...accounts.values()].map((meta) => ({
    accountId: meta.accountId,
    accountName: String(meta.name || meta.accountId),
    accountType: meta.accountType,
    accountSubtype: meta.accountSubtype,
    active: meta.active,
  }));
}

/**
 * Sole public create surface.
 * Default: fail-closed (CREATE_SANDBOX_JE capability OFF).
 * When capability is ON: sandbox-only wired orchestration for ONE approved
 * first-run execution — still no Memory.
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

  await assertJe3dSandboxExecutionCustody({
    execution,
    policy: resolveJe3dActivationPolicy(),
  });

  const proposal = await loadExactJournalEntryProposal(execution.proposal_id);
  const accountIds = (proposal.lines || []).map((line) => String(line.accountId));
  const mirrorRows = await loadCoaMirrorRowsForProposal({
    firmClientId: execution.firm_client_id,
    accountIds,
  });

  const firstRunAuthority = evaluateFirstRunCreateAuthority({
    executionId: input.executionId,
    execution,
    proposal,
    mirrorRows,
  });
  if (!firstRunAuthority.ok) {
    return firstRunDenied(firstRunAuthority.code, firstRunAuthority.message);
  }

  return runGovernedJournalEntryCreateOrchestration(
    { executionId: input.executionId },
    ctx,
    buildJe3dProductionCreateDeps(),
  );
}
