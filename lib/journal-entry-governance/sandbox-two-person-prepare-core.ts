/**
 * Internal two-person sandbox mechanical prepare — not exported from index.ts.
 * All authority constants and deps are sealed inside this module.
 */

import {
  loadExactJournalEntryProposal,
  resolveJeAuthenticationAssurance,
} from "./approval-custody";
import { loadExactApprovedApprovalForProposal } from "./execution-custody";
import { loadAuthoritativeDemoAConnection } from "./demo-a-authoritative-connection";
import { prepareGovernedJournalEntryExecution } from "./execution-service";
import type {
  JeExecutionContext,
  PrepareJeExecutionResult,
} from "./execution-types";
import {
  buildSandboxTwoPersonPrepareEventPayload,
  canonicalizeSandboxTwoPersonExecutionPolicySnapshot,
  hashSandboxTwoPersonExecutionPolicy,
  SANDBOX_TWO_PERSON_JE_EXECUTION_POLICY,
} from "./sandbox-two-person-prepare-policy";

/**
 * Mechanical execution preparation for sandbox two-person custody.
 * Caller must have already enforced capability, identity, MFA, and custody guards.
 */
export async function executeSandboxTwoPersonMechanicalPrepare(args: {
  proposalId: string;
  approvalId: string;
  executionContext: JeExecutionContext;
}): Promise<PrepareJeExecutionResult> {
  const userId = String(args.executionContext.principal.userId || "").trim();
  const prepareAssurance = await resolveJeAuthenticationAssurance(userId);
  const proposal = await loadExactJournalEntryProposal(args.proposalId);
  const approval = await loadExactApprovedApprovalForProposal({
    approvalId: args.approvalId,
    proposal,
  });
  const connection = await loadAuthoritativeDemoAConnection();

  return prepareGovernedJournalEntryExecution(
    {
      proposalId: args.proposalId,
      approvalId: args.approvalId,
    },
    args.executionContext,
    SANDBOX_TWO_PERSON_JE_EXECUTION_POLICY,
    {
      resolveConnection: async () => connection,
      canonicalizeExecutionPolicySnapshot: () =>
        canonicalizeSandboxTwoPersonExecutionPolicySnapshot(),
      hashExecutionPolicy: () => hashSandboxTwoPersonExecutionPolicy(),
      buildExecutionEventPayload: (payloadArgs) =>
        buildSandboxTwoPersonPrepareEventPayload({
          execution: payloadArgs.execution,
          proposal,
          approval,
          connection: {
            id: connection.id,
            tenant_or_realm_id: String(connection.tenant_or_realm_id || ""),
            provider: String(connection.provider || ""),
            provider_environment:
              (connection as { provider_environment?: string | null })
                .provider_environment ?? "sandbox",
          },
          initiatingUserId: userId,
          prepareAssurance,
          preflightEligible: payloadArgs.preflightEligible,
          preflightSummary: payloadArgs.preflightSummary,
          preflight: payloadArgs.preflight ?? null,
          providerRequestHash: payloadArgs.execution.provider_request_hash,
        }),
    },
  );
}
