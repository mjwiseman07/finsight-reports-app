/**
 * JE-2 — decideJournalEntryProposal
 * Bind immutable JE-1 proposal to human APPROVED|REJECTED under explicit policy.
 * No provider write. No proposal mutation. No automatic posting lane.
 */

import { randomUUID } from "node:crypto";
import {
  canonicalizeJeApprovalPolicy,
  hashJeApprovalIdempotencyKey,
  hashJeApprovalPolicy,
} from "./approval-hash";
import {
  JeApprovalAuthorityError,
  resolveJeApproverAuthority,
  type JeApproverAuthority,
} from "./approval-authority";
import {
  JeApprovalCustodyError,
  assertSourceAccountingSyncExists,
  assertSourceCcNotSuperseded,
  assertSourceCcReadinessAllowed,
  assertSourceReconRunsExist,
  loadEngagementFirmId,
  loadExactJournalEntryProposal,
  loadExactProposalSourceCc,
  loadPriorRejection,
  isLiveApprovalMfaSatisfied,
  isMfaRequiredForApproval,
  resolveApprovalClosePeriodId,
  resolveJeAuthenticationAssurance,
} from "./approval-custody";
import {
  JeApprovalPersistError,
  persistJournalEntryApproval,
} from "./approval-repository";
import { evaluateApprovalValidity } from "./approval-validity";
import {
  DEFAULT_JE_APPROVAL_POLICY,
  JE_APPROVAL_DECISIONS,
  JE_APPROVAL_ERROR,
  type DecideJeApprovalInput,
  type DecideJeApprovalResult,
  type JeApprovalExecutionContext,
  type JeApprovalPolicy,
  type JeAuthenticationAssurance,
  type JournalEntryApprovalRow,
} from "./approval-types";
import type { JournalEntryProposalRow } from "./types";

export type DecideJeApprovalDeps = {
  loadProposal: typeof loadExactJournalEntryProposal;
  loadSourceCc: typeof loadExactProposalSourceCc;
  assertNotSuperseded: typeof assertSourceCcNotSuperseded;
  assertSyncExists: typeof assertSourceAccountingSyncExists;
  assertReconsExist: typeof assertSourceReconRunsExist;
  loadPriorRejection: typeof loadPriorRejection;
  resolveApprover: typeof resolveJeApproverAuthority;
  resolveAssurance: typeof resolveJeAuthenticationAssurance;
  loadFirmId: typeof loadEngagementFirmId;
  resolveClosePeriodId: typeof resolveApprovalClosePeriodId;
  persist: typeof persistJournalEntryApproval;
  newId: () => string;
  nowIso: () => string;
};

export function createDefaultJeApprovalDeps(): DecideJeApprovalDeps {
  return {
    loadProposal: loadExactJournalEntryProposal,
    loadSourceCc: loadExactProposalSourceCc,
    assertNotSuperseded: assertSourceCcNotSuperseded,
    assertSyncExists: assertSourceAccountingSyncExists,
    assertReconsExist: assertSourceReconRunsExist,
    loadPriorRejection,
    resolveApprover: resolveJeApproverAuthority,
    resolveAssurance: resolveJeAuthenticationAssurance,
    loadFirmId: loadEngagementFirmId,
    resolveClosePeriodId: resolveApprovalClosePeriodId,
    persist: persistJournalEntryApproval,
    newId: () => randomUUID(),
    nowIso: () => new Date().toISOString(),
  };
}

function requireExplicitPolicy(
  policy: JeApprovalPolicy | null | undefined,
): JeApprovalPolicy {
  if (!policy || typeof policy !== "object") {
    throw Object.assign(new Error("JeApprovalPolicy is required."), {
      code: JE_APPROVAL_ERROR.POLICY_REQUIRED,
    });
  }
  if (policy.requireHumanApproval !== true) {
    throw Object.assign(new Error("requireHumanApproval must be true."), {
      code: JE_APPROVAL_ERROR.POLICY_REQUIRED,
    });
  }
  if (policy.approvalMode !== "REVIEW_REQUIRED") {
    throw Object.assign(new Error("approvalMode must be REVIEW_REQUIRED."), {
      code: JE_APPROVAL_ERROR.POLICY_REQUIRED,
    });
  }
  return policy;
}

export async function decideJournalEntryProposal(
  input: DecideJeApprovalInput,
  executionContext: JeApprovalExecutionContext,
  approvalPolicy: JeApprovalPolicy,
  deps?: Partial<DecideJeApprovalDeps>,
): Promise<DecideJeApprovalResult> {
  const resolved: DecideJeApprovalDeps = {
    ...createDefaultJeApprovalDeps(),
    ...(deps || {}),
  };

  try {
    const policy = requireExplicitPolicy(approvalPolicy);
    const principal = executionContext?.principal;
    if (!principal?.userId) {
      return {
        ok: false,
        code: JE_APPROVAL_ERROR.PRINCIPAL_REQUIRED,
        message: "Verified user principal is required.",
      };
    }
    if (principal.type !== "user") {
      return {
        ok: false,
        code: JE_APPROVAL_ERROR.UNSUPPORTED_PRINCIPAL,
        message: "Only verified user principals may approve JE proposals.",
      };
    }
    if (!(JE_APPROVAL_DECISIONS as readonly string[]).includes(input.decision)) {
      return {
        ok: false,
        code: JE_APPROVAL_ERROR.DECISION_INVALID,
        message: "decision must be APPROVED or REJECTED.",
      };
    }

    const proposal = await resolved.loadProposal(input.proposalId);
    if (!policy.allowedOriginTypes.map(String).includes(proposal.origin_type)) {
      return {
        ok: false,
        code: JE_APPROVAL_ERROR.ORIGIN_UNSUPPORTED,
        message: `Origin ${proposal.origin_type} is not allowed by approval policy.`,
      };
    }
    if (
      policy.maxApprovalAmountCents != null &&
      proposal.total_debits_cents > policy.maxApprovalAmountCents
    ) {
      return {
        ok: false,
        code: JE_APPROVAL_ERROR.AMOUNT_EXCEEDS_POLICY,
        message: "Proposal amount exceeds approval policy maxApprovalAmountCents.",
      };
    }

    const sourceCc = await resolved.loadSourceCc({
      runId: proposal.source_continuous_close_run_id,
      expectedEngagementId: proposal.engagement_id,
      expectedCompanyId: proposal.company_id,
      expectedAccountingSyncId: proposal.source_accounting_sync_id,
    });
    assertSourceCcReadinessAllowed({
      readiness: sourceCc.readiness,
      policy,
    });
    if (policy.requireSourceCcNotSuperseded) {
      await resolved.assertNotSuperseded(sourceCc.id);
    }
    await resolved.assertSyncExists(proposal.source_accounting_sync_id);
    await resolved.assertReconsExist(proposal.source_recon_run_ids);

    const approver = await resolved.resolveApprover({
      engagementId: proposal.engagement_id,
      userId: principal.userId,
      policy,
    });

    const sodSatisfied = evaluateSod({
      policy,
      proposerUserId: proposal.proposed_by,
      reviewerUserId: approver.userId,
    });
    if (!sodSatisfied) {
      return {
        ok: false,
        code: JE_APPROVAL_ERROR.SOD_VIOLATION,
        message: "Segregation of duties: proposer may not approve this proposal.",
      };
    }

    const mfaRequired = isMfaRequiredForApproval({
      policy,
      amountCents: proposal.total_debits_cents,
    });
    const assurance = await resolved.resolveAssurance(approver.userId);
    const mfaSatisfied = isLiveApprovalMfaSatisfied({
      policy,
      amountCents: proposal.total_debits_cents,
      assuranceSatisfied: assurance.satisfied,
    });
    if (mfaRequired && !assurance.satisfied) {
      return {
        ok: false,
        code: JE_APPROVAL_ERROR.MFA_NOT_SATISFIED,
        message: "Trusted MFA/AAL2 assurance is required for this approval.",
      };
    }

    const approvalPolicyHash = hashJeApprovalPolicy(policy);
    const proposalHash = proposal.proposal_hash;

    if (
      !policy.allowReconsiderationAfterRejection &&
      input.decision === "APPROVED"
    ) {
      const priorRejected = await resolved.loadPriorRejection({
        proposalId: proposal.id,
        proposalHash,
        approvalPolicyHash,
      });
      if (priorRejected) {
        return {
          ok: false,
          code: JE_APPROVAL_ERROR.PRIOR_REJECTION,
          message:
            "Prior REJECTED decision exists; create a new proposal (reconsideration disabled).",
        };
      }
    }

    const approvedAt = resolved.nowIso();
    const idempotencyKey = hashJeApprovalIdempotencyKey({
      proposalId: proposal.id,
      proposalHash,
      approvalPolicyHash,
      reviewerUserId: approver.userId,
      decision: input.decision,
    });

    const row: JournalEntryApprovalRow = {
      id: resolved.newId(),
      proposal_id: proposal.id,
      company_id: proposal.company_id,
      engagement_id: proposal.engagement_id,
      proposal_hash: proposalHash,
      policy_hash: approvalPolicyHash,
      decision: input.decision,
      approval_mode: "REVIEW_REQUIRED",
      reviewer_user_id: approver.userId,
      reviewer_role: approver.role,
      mfa_level: mfaRequired ? assurance.level : assurance.satisfied ? assurance.level : null,
      mfa_verified_at: mfaRequired && assurance.satisfied ? assurance.verifiedAt : null,
      decision_reason: input.reason == null ? null : String(input.reason),
      policy_snapshot: canonicalizeJeApprovalPolicy(policy),
      approved_at: approvedAt,
      idempotency_key: idempotencyKey,
    };

    const firmId = await resolved.loadFirmId(proposal.engagement_id);
    const closePeriodId = await resolved.resolveClosePeriodId({
      firmClientId: proposal.firm_client_id,
      periodEnd: proposal.period_end,
      sourceAccountingSyncId: proposal.source_accounting_sync_id,
    });
    // Custody lock: period_end is a date, never a close_period_id.
    if (closePeriodId && closePeriodId === proposal.period_end) {
      return {
        ok: false,
        code: JE_APPROVAL_ERROR.PERSIST_FAILED,
        message:
          "close_period_id must not equal proposal.period_end; use exact close_periods.id or null.",
      };
    }
    const eventType =
      input.decision === "APPROVED"
        ? ("journal_entry.approved" as const)
        : ("journal_entry.rejected" as const);
    const eventPayload = buildApprovalEventPayload({
      proposal,
      approval: row,
      sodSatisfied,
      mfaRequired,
      mfaSatisfied,
      assurance,
      approver,
      closePeriodId,
    });

    const persisted = await resolved.persist({
      row,
      eventType,
      eventPayload,
      firmId,
      firmClientId: proposal.firm_client_id,
      engagementId: proposal.engagement_id,
      closePeriodId,
      actorId: approver.userId,
    });

    const validity = evaluateApprovalValidity({
      approval: persisted.row,
      proposalHash,
      approvalPolicyHash,
      sodSatisfied,
      mfaSatisfied,
      policy,
    });

    return {
      ok: true,
      approval: persisted.row,
      reused: persisted.reused,
      ledgerEventId: persisted.ledgerEventId,
      validity,
    };
  } catch (error) {
    if (
      error instanceof JeApprovalCustodyError ||
      error instanceof JeApprovalAuthorityError ||
      error instanceof JeApprovalPersistError
    ) {
      return { ok: false, code: error.code, message: error.message };
    }
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : JE_APPROVAL_ERROR.PERSIST_FAILED;
    return {
      ok: false,
      code,
      message: error instanceof Error ? error.message : "unknown error",
    };
  }
}

function evaluateSod(args: {
  policy: JeApprovalPolicy;
  proposerUserId: string;
  reviewerUserId: string;
}): boolean {
  if (!args.policy.requireSegregationOfDuties) return true;
  if (args.proposerUserId === args.reviewerUserId) {
    return Boolean(args.policy.proposerMayApprove);
  }
  return true;
}

function buildApprovalEventPayload(args: {
  proposal: JournalEntryProposalRow;
  approval: JournalEntryApprovalRow;
  sodSatisfied: boolean;
  mfaRequired: boolean;
  mfaSatisfied: boolean;
  assurance: JeAuthenticationAssurance;
  approver: JeApproverAuthority;
  closePeriodId: string | null;
}): Record<string, unknown> {
  return {
    proposal_id: args.proposal.id,
    approval_id: args.approval.id,
    decision: args.approval.decision,
    proposal_hash: args.approval.proposal_hash,
    approval_policy_hash: args.approval.policy_hash,
    reviewer_user_id: args.approval.reviewer_user_id,
    reviewer_role: args.approval.reviewer_role,
    reviewer_scope: args.approver.scope,
    sod_satisfied: args.sodSatisfied,
    mfa_required: args.mfaRequired,
    mfa_satisfied: args.mfaSatisfied,
    mfa_level: args.assurance.level,
    mfa_source: args.assurance.source,
    source_continuous_close_run_id: args.proposal.source_continuous_close_run_id,
    source_accounting_sync_id: args.proposal.source_accounting_sync_id,
    period_end: args.proposal.period_end,
    close_period_id: args.closePeriodId,
    company_id: args.proposal.company_id,
    engagement_id: args.proposal.engagement_id,
    origin_type: args.proposal.origin_type,
    total_debits_cents: args.proposal.total_debits_cents,
    approval_mode: args.approval.approval_mode,
  };
}

export { DEFAULT_JE_APPROVAL_POLICY };
