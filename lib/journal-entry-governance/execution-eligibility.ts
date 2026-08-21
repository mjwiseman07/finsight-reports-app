/**
 * JE-3A — Execution eligibility + structured preflight assembly.
 * Fail-closed revalidation beyond evaluateApprovalValidity alone.
 */

import type { JeApprovalPolicy, JournalEntryApprovalRow } from "./approval-types";
import { evaluateApprovalValidity } from "./approval-validity";
import {
  JE_EXECUTION_ERROR,
  type JeExecutionEligibility,
  type JeExecutionPolicy,
  type JePreflightCheck,
  type JePreflightResult,
} from "./execution-types";
import type {
  JeProposalAccountMeta,
  JeProposalPolicy,
  JournalEntryProposalRow,
} from "./types";
import { DEFAULT_JE_PROPOSAL_POLICY } from "./types";
import {
  JeProposalValidationError,
  rejectControlAccounts,
} from "./validation";

export function parseStoredApprovalPolicySnapshot(
  snapshot: Record<string, unknown>,
): JeApprovalPolicy {
  const allowedCompanyApproverRoles = Array.isArray(
    snapshot.allowedCompanyApproverRoles,
  )
    ? snapshot.allowedCompanyApproverRoles.map(String)
    : [];
  const allowedFirmApproverRoles = Array.isArray(snapshot.allowedFirmApproverRoles)
    ? snapshot.allowedFirmApproverRoles.map(String)
    : [];
  const allowedOriginTypes = Array.isArray(snapshot.allowedOriginTypes)
    ? (snapshot.allowedOriginTypes.map(String) as JeApprovalPolicy["allowedOriginTypes"])
    : (["ACCRUAL", "RECLASS"] as const);
  return {
    requireHumanApproval: true,
    approvalMode: "REVIEW_REQUIRED",
    requireSegregationOfDuties: Boolean(snapshot.requireSegregationOfDuties ?? true),
    proposerMayApprove: Boolean(snapshot.proposerMayApprove ?? false),
    allowReconsiderationAfterRejection: Boolean(
      snapshot.allowReconsiderationAfterRejection ?? false,
    ),
    allowedCompanyApproverRoles,
    allowedFirmApproverRoles,
    requireFirmCanApproveFlag: Boolean(snapshot.requireFirmCanApproveFlag ?? true),
    allowSuperAdminApproval: Boolean(snapshot.allowSuperAdminApproval ?? false),
    alwaysRequireMfa: Boolean(snapshot.alwaysRequireMfa ?? false),
    mfaRequiredAboveCents:
      snapshot.mfaRequiredAboveCents == null
        ? null
        : Number(snapshot.mfaRequiredAboveCents),
    maxApprovalAgeHours:
      snapshot.maxApprovalAgeHours == null
        ? null
        : Number(snapshot.maxApprovalAgeHours),
    requireCurrentProposalHash: true,
    requireCurrentPolicyHash: true,
    allowedOriginTypes,
    maxApprovalAmountCents:
      snapshot.maxApprovalAmountCents == null
        ? null
        : Number(snapshot.maxApprovalAmountCents),
    requireSourceCcNotSuperseded: Boolean(
      snapshot.requireSourceCcNotSuperseded ?? true,
    ),
    requireSourceCcReadiness: Array.isArray(snapshot.requireSourceCcReadiness)
      ? (snapshot.requireSourceCcReadiness.map(String) as JeApprovalPolicy["requireSourceCcReadiness"])
      : null,
    requireFreshSourceSync:
      snapshot.requireFreshSourceSync == null
        ? null
        : Boolean(snapshot.requireFreshSourceSync),
  };
}

/**
 * JE-3 execution gate eligibility wrapper over historical approval row.
 */
export function evaluateJeExecutionEligibility(args: {
  approval: JournalEntryApprovalRow;
  proposal: JournalEntryProposalRow;
  executionPolicy: JeExecutionPolicy;
  executorSodSatisfied: boolean;
  sourceCurrent: boolean;
  nowMs?: number;
}): JeExecutionEligibility {
  const approvalPolicy = parseStoredApprovalPolicySnapshot(
    args.approval.policy_snapshot || {},
  );
  const base = evaluateApprovalValidity({
    approval: args.approval,
    proposalHash: args.proposal.proposal_hash,
    approvalPolicyHash: args.approval.policy_hash,
    sodSatisfied: true, // historical SoD already enforced at JE-2; recheck executor SoD separately
    mfaSatisfied: Boolean(args.approval.mfa_verified_at),
    policy: {
      ...approvalPolicy,
      // For expiration: honor execution policy requireApprovalNotExpired
      maxApprovalAgeHours: args.executionPolicy.requireApprovalNotExpired
        ? approvalPolicy.maxApprovalAgeHours
        : null,
    },
    nowMs: args.nowMs,
  });

  let valid = base.valid;
  let reason = base.reason;
  if (args.approval.decision !== "APPROVED") {
    valid = false;
    reason = "decision_not_approved";
  } else if (args.approval.proposal_hash !== args.proposal.proposal_hash) {
    valid = false;
    reason = "proposal_hash_mismatch";
  } else if (!args.executorSodSatisfied) {
    valid = false;
    reason = "executor_sod_unsatisfied";
  } else if (!args.sourceCurrent && args.executionPolicy.requireSourceCcNotSuperseded) {
    valid = false;
    reason = "source_not_current";
  }

  return {
    approvalId: args.approval.id,
    valid,
    proposalHash: args.approval.proposal_hash,
    approvalPolicyHash: args.approval.policy_hash,
    approvedAt: args.approval.approved_at,
    expiresAt: base.expiresAt,
    sodSatisfied: args.executorSodSatisfied,
    mfaSatisfied: base.mfaSatisfied,
    sourceCurrent: args.sourceCurrent,
    reason: valid ? undefined : reason,
  };
}

function pass(code: string, details?: string): JePreflightCheck {
  return details ? { code, status: "PASS", details } : { code, status: "PASS" };
}

function fail(code: string, details?: string): JePreflightCheck {
  return details ? { code, status: "FAIL", details } : { code, status: "FAIL" };
}

export type AssemblePreflightArgs = {
  proposal: JournalEntryProposalRow;
  approval: JournalEntryApprovalRow;
  eligibility: JeExecutionEligibility;
  executionPolicy: JeExecutionPolicy;
  executorAuthorized: boolean;
  executorSodProposerOk: boolean;
  executorSodApproverOk: boolean;
  entitled: boolean;
  connectionFound: boolean;
  connectionHealthy: boolean;
  qboWriteEnabled: boolean;
  periodOpen: boolean;
  accounts: Map<string, JeProposalAccountMeta>;
  engagementControlAccountIds: {
    ar: string | null;
    ap: string | null;
    inventory: string | null;
  };
  sourceCcCurrent: boolean;
  sourceSyncExists: boolean;
  sourceReconsExist: boolean;
  idempotencyAvailable: boolean;
  proposalPolicy?: JeProposalPolicy;
};

export function assembleJeExecutionPreflight(
  args: AssemblePreflightArgs,
): JePreflightResult {
  const checks: JePreflightCheck[] = [];
  const policy = args.executionPolicy;
  const proposalPolicy = args.proposalPolicy || DEFAULT_JE_PROPOSAL_POLICY;

  checks.push(
    args.proposal.status === "SUBMITTED"
      ? pass("proposal_valid")
      : fail("proposal_valid", "Proposal must remain SUBMITTED"),
  );

  checks.push(
    args.eligibility.valid && args.approval.decision === "APPROVED"
      ? pass("approval_valid")
      : fail("approval_valid", args.eligibility.reason || "approval invalid"),
  );

  if (policy.requireApprovalNotExpired) {
    const expired =
      args.eligibility.expiresAt != null &&
      Date.parse(args.eligibility.expiresAt) <= Date.now();
    checks.push(
      expired
        ? fail("approval_not_expired", "Approval expired")
        : pass("approval_not_expired"),
    );
  } else {
    checks.push(pass("approval_not_expired", "skipped_by_policy"));
  }

  checks.push(
    policy.requireSourceCcNotSuperseded
      ? args.sourceCcCurrent
        ? pass("source_cc_current")
        : fail("source_cc_current")
      : pass("source_cc_current", "skipped_by_policy"),
  );

  checks.push(
    args.sourceSyncExists
      ? pass("source_sync_exists")
      : fail("source_sync_exists"),
  );

  checks.push(
    args.sourceReconsExist
      ? pass("source_recons_exist")
      : fail("source_recons_exist"),
  );

  checks.push(
    args.entitled ? pass("execution_entitled") : fail("execution_entitled"),
  );

  checks.push(
    args.executorAuthorized
      ? pass("executor_authorized")
      : fail("executor_authorized"),
  );

  checks.push(
    args.executorSodProposerOk && args.executorSodApproverOk
      ? pass("executor_sod")
      : fail(
          "executor_sod",
          !args.executorSodProposerOk
            ? "executor_same_as_proposer"
            : "executor_same_as_approver",
        ),
  );

  checks.push(
    args.connectionFound ? pass("connection_found") : fail("connection_found"),
  );

  checks.push(
    policy.requireConnectionHealthy
      ? args.connectionHealthy
        ? pass("connection_healthy")
        : fail("connection_healthy")
      : pass("connection_healthy", "skipped_by_policy"),
  );

  checks.push(
    args.qboWriteEnabled
      ? pass("qbo_write_enabled")
      : fail("qbo_write_enabled"),
  );

  checks.push(
    policy.requirePeriodOpen
      ? args.periodOpen
        ? pass("period_open")
        : fail("period_open")
      : pass("period_open", "skipped_by_policy"),
  );

  // Accounts active
  let accountsActive = true;
  if (policy.requireCurrentAccountsActive) {
    for (const line of args.proposal.lines) {
      const meta = args.accounts.get(line.accountId);
      if (!meta) {
        accountsActive = false;
        checks.push(fail("accounts_active", `missing:${line.accountId}`));
        break;
      }
      if (!meta.active) {
        accountsActive = false;
        checks.push(fail("accounts_active", `inactive:${line.accountId}`));
        break;
      }
    }
    if (accountsActive) checks.push(pass("accounts_active"));
  } else {
    checks.push(pass("accounts_active", "skipped_by_policy"));
  }

  // Control accounts
  if (policy.requireControlAccountRecheck) {
    try {
      rejectControlAccounts({
        lines: args.proposal.lines,
        accounts: args.accounts,
        engagementControlAccountIds: args.engagementControlAccountIds,
        policy: proposalPolicy,
      });
      checks.push(pass("control_accounts_clear"));
    } catch (err) {
      const code =
        err instanceof JeProposalValidationError
          ? err.code
          : JE_EXECUTION_ERROR.CONTROL_ACCOUNT_AR;
      const mapped =
        code === "je_control_account_ar_prohibited"
          ? "AR"
          : code === "je_control_account_ap_prohibited"
            ? "AP"
            : code === "je_control_account_inventory_prohibited"
              ? "Inventory"
              : "control";
      checks.push(fail("control_accounts_clear", mapped));
    }
  } else {
    checks.push(pass("control_accounts_clear", "skipped_by_policy"));
  }

  // Amount
  if (
    policy.maxExecutionAmountCents != null &&
    Number.isFinite(policy.maxExecutionAmountCents) &&
    args.proposal.total_debits_cents > policy.maxExecutionAmountCents
  ) {
    checks.push(fail("amount_within_policy"));
  } else {
    checks.push(pass("amount_within_policy"));
  }

  // Origin
  if (!policy.allowedOriginTypes.map(String).includes(args.proposal.origin_type)) {
    checks.push(fail("origin_allowed", args.proposal.origin_type));
  } else {
    checks.push(pass("origin_allowed"));
  }

  checks.push(
    args.idempotencyAvailable
      ? pass("idempotency_available")
      : fail("idempotency_available"),
  );

  const eligible = checks.every((c) => c.status === "PASS");
  return { eligible, checks };
}
