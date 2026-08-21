/**
 * JE-3A — prepareGovernedJournalEntryExecution
 * Governed execution foundation: custody → preflight → READY_TO_POST | PRECHECK_FAILED.
 * Stops before provider write. No provider poster call. No Memory. No auto-governed principal.
 */

import { randomUUID } from "node:crypto";
import { resolveEngagementActorForVerifiedUser } from "@/lib/audit-ready/server-auth";
import {
  JeApprovalCustodyError,
  assertSourceAccountingSyncExists,
  assertSourceCcNotSuperseded,
  assertSourceReconRunsExist,
  loadExactJournalEntryProposal,
  loadExactProposalSourceCc,
  loadEngagementFirmId,
  resolveApprovalClosePeriodId,
  resolveJeAuthenticationAssurance,
} from "./approval-custody";
import {
  JeProposalCustodyError,
  assertClosePeriodNotLocked,
  loadAccountsFromCoaMirror,
  loadEngagementCustody,
} from "./source-custody";
import {
  canonicalizeJeExecutionPolicy,
  hashJeExecution,
  hashJeExecutionIdempotencyKey,
  hashJeExecutionPolicy,
  hashProviderRequestPreview,
} from "./execution-hash";
import {
  assertCorrelationMarkerSafeForPrivateNote,
  buildJeCorrelationMarker,
} from "./execution-correlation";
import {
  assembleJeExecutionPreflight,
  evaluateJeExecutionEligibility,
} from "./execution-eligibility";
import {
  assertJeWriteEntitlement,
  assertNoExecutionCallerOverrides,
  assertQboWriteEnabledGate,
  JeExecutionCustodyError,
  loadExactApprovedApprovalForProposal,
  loadEngagementSubscriberIds,
  resolveCanonicalExecutionConnection,
} from "./execution-custody";
import { mapGovernedProposalToQboPayload } from "./execution-payload";
import {
  JeExecutionPersistError,
  persistJournalEntryExecutionReservation,
  transitionJournalEntryExecution,
} from "./execution-repository";
import { assertJeExecutionTransition } from "./execution-state";
import {
  DEFAULT_JE_EXECUTION_POLICY,
  JE_EXECUTION_ERROR,
  type JeExecutionContext,
  type JeExecutionPolicy,
  type JePreflightResult,
  type JournalEntryExecutionRow,
  type PrepareJeExecutionInput,
  type PrepareJeExecutionResult,
} from "./execution-types";
import type { JeProposalAccountMeta } from "./types";

export type PrepareJeExecutionDeps = {
  loadProposal: typeof loadExactJournalEntryProposal;
  loadApproval: typeof loadExactApprovedApprovalForProposal;
  resolveActor: typeof resolveEngagementActorForVerifiedUser;
  loadEngagement: typeof loadEngagementCustody;
  loadSourceCc: typeof loadExactProposalSourceCc;
  assertNotSuperseded: typeof assertSourceCcNotSuperseded;
  assertSyncExists: typeof assertSourceAccountingSyncExists;
  assertReconsExist: typeof assertSourceReconRunsExist;
  resolveConnection: typeof resolveCanonicalExecutionConnection;
  assertEntitlement: typeof assertJeWriteEntitlement;
  assertQboWriteEnabled: typeof assertQboWriteEnabledGate;
  loadAccounts: typeof loadAccountsFromCoaMirror;
  assertPeriodNotLocked: typeof assertClosePeriodNotLocked;
  loadSubscriberIds: typeof loadEngagementSubscriberIds;
  loadFirmId: typeof loadEngagementFirmId;
  resolveClosePeriodId: typeof resolveApprovalClosePeriodId;
  resolveAssurance: typeof resolveJeAuthenticationAssurance;
  persistReservation: typeof persistJournalEntryExecutionReservation;
  transition: typeof transitionJournalEntryExecution;
  newId: () => string;
  nowIso: () => string;
};

export function createDefaultJeExecutionDeps(): PrepareJeExecutionDeps {
  return {
    loadProposal: loadExactJournalEntryProposal,
    loadApproval: loadExactApprovedApprovalForProposal,
    resolveActor: resolveEngagementActorForVerifiedUser,
    loadEngagement: loadEngagementCustody,
    loadSourceCc: loadExactProposalSourceCc,
    assertNotSuperseded: assertSourceCcNotSuperseded,
    assertSyncExists: assertSourceAccountingSyncExists,
    assertReconsExist: assertSourceReconRunsExist,
    resolveConnection: resolveCanonicalExecutionConnection,
    assertEntitlement: assertJeWriteEntitlement,
    assertQboWriteEnabled: assertQboWriteEnabledGate,
    loadAccounts: loadAccountsFromCoaMirror,
    assertPeriodNotLocked: assertClosePeriodNotLocked,
    loadSubscriberIds: loadEngagementSubscriberIds,
    loadFirmId: loadEngagementFirmId,
    resolveClosePeriodId: resolveApprovalClosePeriodId,
    resolveAssurance: resolveJeAuthenticationAssurance,
    persistReservation: persistJournalEntryExecutionReservation,
    transition: transitionJournalEntryExecution,
    newId: () => randomUUID(),
    nowIso: () => new Date().toISOString(),
  };
}

function requireExplicitPolicy(
  policy: JeExecutionPolicy | null | undefined,
): JeExecutionPolicy {
  if (!policy || typeof policy !== "object") {
    throw Object.assign(new Error("JeExecutionPolicy is required."), {
      code: JE_EXECUTION_ERROR.POLICY_REQUIRED,
    });
  }
  if (policy.provider !== "quickbooks") {
    throw Object.assign(new Error("provider must be quickbooks."), {
      code: JE_EXECUTION_ERROR.PROVIDER_UNSUPPORTED,
    });
  }
  if (policy.manualExecutionOnly !== true) {
    throw Object.assign(new Error("manualExecutionOnly must be true."), {
      code: JE_EXECUTION_ERROR.POLICY_REQUIRED,
    });
  }
  if (policy.requireWriteEntitlement !== true) {
    throw Object.assign(new Error("requireWriteEntitlement must be true."), {
      code: JE_EXECUTION_ERROR.POLICY_REQUIRED,
    });
  }
  if (policy.requireQboWriteEnabled !== true) {
    throw Object.assign(new Error("requireQboWriteEnabled must be true."), {
      code: JE_EXECUTION_ERROR.POLICY_REQUIRED,
    });
  }
  if (policy.unknownCommitPolicy !== "HALT_AND_DISCOVER") {
    throw Object.assign(
      new Error("unknownCommitPolicy must be HALT_AND_DISCOVER."),
      { code: JE_EXECUTION_ERROR.POLICY_REQUIRED },
    );
  }
  return policy;
}

function fail(code: string, message: string): PrepareJeExecutionResult {
  return { ok: false, code, message };
}

function mapCustodyError(err: unknown): PrepareJeExecutionResult {
  if (
    err instanceof JeExecutionCustodyError ||
    err instanceof JeApprovalCustodyError ||
    err instanceof JeProposalCustodyError
  ) {
    return fail(err.code, err.message);
  }
  if (err instanceof JeExecutionPersistError) {
    return fail(err.code, err.message);
  }
  if (err && typeof err === "object" && "code" in err) {
    const e = err as { code?: string; message?: string };
    if (e.code) return fail(String(e.code), e.message || String(e.code));
  }
  return fail(
    JE_EXECUTION_ERROR.PERSIST_FAILED,
    err instanceof Error ? err.message : "Unknown execution error",
  );
}

function buildEventPayload(args: {
  execution: JournalEntryExecutionRow;
  preflightEligible: boolean | null;
  preflightSummary?: string;
}): Record<string, unknown> {
  return {
    execution_id: args.execution.id,
    proposal_id: args.execution.proposal_id,
    approval_id: args.execution.approval_id,
    company_id: args.execution.company_id,
    engagement_id: args.execution.engagement_id,
    source_continuous_close_run_id: args.execution.source_continuous_close_run_id,
    source_accounting_sync_id: args.execution.source_accounting_sync_id,
    accounting_connection_id: args.execution.accounting_connection_id,
    proposal_hash: args.execution.proposal_hash,
    approval_policy_hash: args.execution.approval_policy_hash,
    execution_policy_hash: args.execution.execution_policy_hash,
    execution_hash: args.execution.execution_hash,
    idempotency_key: args.execution.idempotency_key,
    correlation_marker: args.execution.correlation_marker,
    status: args.execution.status,
    preflight_eligible: args.preflightEligible,
    preflight_summary: args.preflightSummary ?? null,
  };
}

function emptyPreflight(): JePreflightResult {
  return { eligible: false, checks: [] };
}

/**
 * Public JE-3A entry point. No provider-write method.
 */
export async function prepareGovernedJournalEntryExecution(
  input: PrepareJeExecutionInput,
  executionContext: JeExecutionContext,
  executionPolicy: JeExecutionPolicy,
  deps?: Partial<PrepareJeExecutionDeps>,
): Promise<PrepareJeExecutionResult> {
  const resolved: PrepareJeExecutionDeps = {
    ...createDefaultJeExecutionDeps(),
    ...(deps || {}),
  };

  try {
    const policy = requireExplicitPolicy(executionPolicy);
    const principal = executionContext?.principal;
    if (!principal?.userId) {
      return fail(
        JE_EXECUTION_ERROR.PRINCIPAL_REQUIRED,
        "Verified user principal is required.",
      );
    }
    if ((principal as { type?: string }).type !== "user") {
      return fail(
        JE_EXECUTION_ERROR.UNSUPPORTED_PRINCIPAL,
        "Only principal.type=user is supported. System / auto-governed principal unsupported.",
      );
    }
    const userId = String(principal.userId).trim();
    if (!userId) {
      return fail(
        JE_EXECUTION_ERROR.PRINCIPAL_REQUIRED,
        "Verified user principal is required.",
      );
    }

    assertNoExecutionCallerOverrides(input as unknown as Record<string, unknown>);

    const proposalId = String(input.proposalId || "").trim();
    const approvalId = String(input.approvalId || "").trim();
    if (!proposalId) {
      return fail(JE_EXECUTION_ERROR.PROPOSAL_REQUIRED, "proposalId is required.");
    }
    if (!approvalId) {
      return fail(JE_EXECUTION_ERROR.APPROVAL_REQUIRED, "approvalId is required.");
    }

    const proposal = await resolved.loadProposal(proposalId);
    const approval = await resolved.loadApproval({ approvalId, proposal });

    const actor = await resolved.resolveActor({
      engagementId: proposal.engagement_id,
      userId,
    });
    if (!actor || actor.userId !== userId || !actor.canWrite) {
      return fail(
        JE_EXECUTION_ERROR.WRITE_FORBIDDEN,
        "Executor must have current engagement write authority. can_approve alone is insufficient.",
      );
    }

    let sodProposerOk = true;
    let sodApproverOk = true;
    if (
      policy.requireExecutorDifferentFromProposer &&
      userId === proposal.proposed_by
    ) {
      sodProposerOk = false;
    }
    if (
      policy.requireExecutorDifferentFromApprover &&
      userId === approval.reviewer_user_id
    ) {
      sodApproverOk = false;
    }

    if (policy.requireFreshMfa) {
      const assurance = await resolved.resolveAssurance(userId);
      if (!assurance.satisfied) {
        return fail(
          JE_EXECUTION_ERROR.MFA_NOT_SATISFIED,
          "Fresh MFA assurance required by execution policy.",
        );
      }
    }

    const engagement = await resolved.loadEngagement(proposal.engagement_id);
    const subscribers = await resolved.loadSubscriberIds(proposal.engagement_id);

    let entitled = false;
    try {
      await resolved.assertEntitlement({
        firmId: subscribers.firmId || engagement.firmId,
        companyId: subscribers.companyId || proposal.company_id,
      });
      entitled = true;
    } catch (err) {
      if (err instanceof JeExecutionCustodyError) {
        return fail(err.code, err.message);
      }
      throw err;
    }

    let sourceCcCurrent = true;
    let sourceSyncExists = true;
    let sourceReconsExist = true;

    try {
      const cc = await resolved.loadSourceCc({
        runId: proposal.source_continuous_close_run_id,
        expectedEngagementId: proposal.engagement_id,
        expectedCompanyId: proposal.company_id,
        expectedAccountingSyncId: proposal.source_accounting_sync_id,
      });
      if (policy.requireSourceCcNotSuperseded) {
        try {
          await resolved.assertNotSuperseded(cc.id);
        } catch {
          sourceCcCurrent = false;
        }
      }
    } catch {
      sourceCcCurrent = false;
    }

    try {
      await resolved.assertSyncExists(proposal.source_accounting_sync_id);
      sourceSyncExists = true;
    } catch {
      sourceSyncExists = false;
    }

    try {
      await resolved.assertReconsExist(proposal.source_recon_run_ids);
      sourceReconsExist = true;
    } catch {
      sourceReconsExist = false;
    }

    const connection = await resolved.resolveConnection({
      userId,
      companyId: proposal.company_id,
      policy,
    });

    let qboWriteEnabled = true;
    try {
      await resolved.assertQboWriteEnabled(
        proposal.firm_client_id || engagement.firmClientId,
      );
    } catch {
      qboWriteEnabled = false;
    }

    let periodOpen = true;
    try {
      if (policy.requirePeriodOpen) {
        await resolved.assertPeriodNotLocked({
          firmClientId: proposal.firm_client_id || engagement.firmClientId,
          txnDate: proposal.txn_date,
        });
      }
    } catch {
      periodOpen = false;
    }

    let accounts = new Map<string, JeProposalAccountMeta>();
    try {
      const firmClientId = proposal.firm_client_id || engagement.firmClientId;
      if (firmClientId) {
        accounts = await resolved.loadAccounts({
          firmClientId,
          accountIds: proposal.lines.map((l) => l.accountId),
        });
      }
    } catch {
      accounts = new Map();
    }

    const eligibility = evaluateJeExecutionEligibility({
      approval,
      proposal,
      executionPolicy: policy,
      executorSodSatisfied: sodProposerOk && sodApproverOk,
      sourceCurrent: sourceCcCurrent && sourceSyncExists && sourceReconsExist,
    });

    const executionPolicyHash = hashJeExecutionPolicy(policy);
    const executionHash = hashJeExecution({
      proposalId: proposal.id,
      proposalHash: proposal.proposal_hash,
      approvalId: approval.id,
      approvalPolicyHash: approval.policy_hash,
      executionPolicyHash,
      provider: policy.provider,
      companyId: proposal.company_id,
      accountingConnectionId: connection.id,
      txnDate: proposal.txn_date,
    });
    const idempotencyKey = hashJeExecutionIdempotencyKey({
      proposalId: proposal.id,
      proposalHash: proposal.proposal_hash,
      approvalId: approval.id,
      approvalPolicyHash: approval.policy_hash,
      executionPolicyHash,
      provider: policy.provider,
      companyId: proposal.company_id,
      accountingConnectionId: connection.id,
    });

    const executionId = resolved.newId();
    const correlationMarker = buildJeCorrelationMarker(executionId);
    assertCorrelationMarkerSafeForPrivateNote(correlationMarker);

    const payloadPreview = mapGovernedProposalToQboPayload({
      proposal,
      correlationMarker,
    });
    const providerRequestHash = hashProviderRequestPreview(
      payloadPreview as unknown as Record<string, unknown>,
    );

    const reservedRow: JournalEntryExecutionRow = {
      id: executionId,
      proposal_id: proposal.id,
      approval_id: approval.id,
      company_id: proposal.company_id,
      engagement_id: proposal.engagement_id,
      firm_client_id: proposal.firm_client_id || engagement.firmClientId,
      source_continuous_close_run_id: proposal.source_continuous_close_run_id,
      source_accounting_sync_id: proposal.source_accounting_sync_id,
      accounting_connection_id: connection.id,
      provider: "quickbooks",
      proposal_hash: proposal.proposal_hash,
      approval_policy_hash: approval.policy_hash,
      execution_policy_hash: executionPolicyHash,
      execution_hash: executionHash,
      idempotency_key: idempotencyKey,
      status: "RESERVED",
      correlation_marker: correlationMarker,
      execution_policy_snapshot: canonicalizeJeExecutionPolicy(policy),
      preflight_result: emptyPreflight(),
      requested_by: userId,
      requested_at: resolved.nowIso(),
      state_version: 1,
      provider_journal_id: null,
      provider_request_hash: providerRequestHash,
      provider_response_hash: null,
      last_error_code: null,
      last_error_message: null,
    };

    const firmId =
      (await resolved.loadFirmId(proposal.engagement_id)) ||
      subscribers.firmId ||
      engagement.firmId;
    const closePeriodId = await resolved.resolveClosePeriodId({
      firmClientId: reservedRow.firm_client_id,
      periodEnd: proposal.period_end,
      sourceAccountingSyncId: proposal.source_accounting_sync_id,
    });

    const reserved = await resolved.persistReservation({
      row: reservedRow,
      eventPayload: buildEventPayload({
        execution: reservedRow,
        preflightEligible: null,
        preflightSummary: "reserved",
      }),
      firmId,
      firmClientId: reservedRow.firm_client_id,
      engagementId: proposal.engagement_id,
      closePeriodId,
      actorId: userId,
    });

    if (reserved.reused) {
      const existing = reserved.row;
      const existingPreflight = (existing.preflight_result ||
        emptyPreflight()) as JePreflightResult;
      return {
        ok: true,
        execution: existing,
        reused: true,
        ledgerEventIds: { requested: null, transition: null },
        eligibility,
        preflight: existingPreflight,
        payloadPreview: payloadPreview as unknown as Record<string, unknown>,
      };
    }

    const preflight = assembleJeExecutionPreflight({
      proposal,
      approval,
      eligibility,
      executionPolicy: policy,
      executorAuthorized: Boolean(actor.canWrite),
      executorSodProposerOk: sodProposerOk,
      executorSodApproverOk: sodApproverOk,
      entitled,
      connectionFound: Boolean(connection.id),
      connectionHealthy: connection.status === "connected",
      qboWriteEnabled,
      periodOpen,
      accounts,
      engagementControlAccountIds: {
        ar: engagement.arControlAccountId,
        ap: engagement.apControlAccountId,
        inventory: engagement.inventoryControlAccountId,
      },
      sourceCcCurrent,
      sourceSyncExists,
      sourceReconsExist,
      idempotencyAvailable: true,
    });

    const nextStatus = preflight.eligible ? "READY_TO_POST" : "PRECHECK_FAILED";
    assertJeExecutionTransition("RESERVED", nextStatus);

    const eventType = preflight.eligible
      ? "journal_entry.execution_ready"
      : "journal_entry.execution_precheck_failed";

    const failedCheck = preflight.checks.find((c) => c.status === "FAIL");
    const transitioned = await resolved.transition({
      executionId: reserved.row.id,
      expectedStatus: "RESERVED",
      expectedStateVersion: reserved.row.state_version,
      newStatus: nextStatus,
      patch: {
        preflight_result: preflight,
        provider_request_hash: providerRequestHash,
        last_error_code: preflight.eligible
          ? null
          : failedCheck?.code || JE_EXECUTION_ERROR.APPROVAL_INVALID,
        last_error_message: preflight.eligible
          ? null
          : failedCheck?.details || "precheck_failed",
      },
      eventType,
      eventPayload: buildEventPayload({
        execution: {
          ...reserved.row,
          status: nextStatus,
          preflight_result: preflight,
        },
        preflightEligible: preflight.eligible,
        preflightSummary: preflight.eligible
          ? "all_checks_pass"
          : failedCheck?.code || "precheck_failed",
      }),
      firmId,
      firmClientId: reserved.row.firm_client_id,
      engagementId: proposal.engagement_id,
      closePeriodId,
      actorId: userId,
    });

    return {
      ok: true,
      execution: transitioned.row,
      reused: false,
      ledgerEventIds: {
        requested: reserved.ledgerEventId,
        transition: transitioned.ledgerEventId,
      },
      eligibility,
      preflight,
      payloadPreview: payloadPreview as unknown as Record<string, unknown>,
    };
  } catch (err) {
    return mapCustodyError(err);
  }
}

export { DEFAULT_JE_EXECUTION_POLICY };
