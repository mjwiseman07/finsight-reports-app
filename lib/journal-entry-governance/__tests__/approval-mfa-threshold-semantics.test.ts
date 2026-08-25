import { describe, expect, it } from "vitest";
import {
  isHistoricalApprovalMfaSatisfied,
  isLiveApprovalMfaSatisfied,
  isMfaRequiredForApproval,
  mfaRequiredForProposal,
} from "../approval-custody";
import { evaluateApprovalValidity } from "../approval-validity";
import { evaluateJeExecutionEligibility } from "../execution-eligibility";
import {
  DEFAULT_JE_APPROVAL_POLICY,
  type JeApprovalPolicy,
  type JournalEntryApprovalRow,
} from "../approval-types";
import { hashJeApprovalPolicy } from "../approval-hash";
import type { JournalEntryProposalRow } from "../types";
import { DEFAULT_JE_EXECUTION_POLICY } from "../execution-types";

const THRESHOLD = 100_000;

function policy(over: Partial<JeApprovalPolicy> = {}): JeApprovalPolicy {
  return { ...DEFAULT_JE_APPROVAL_POLICY, ...over };
}

function approvalRow(args: {
  amountCents?: number;
  mfaVerifiedAt?: string | null;
  policy?: JeApprovalPolicy;
}): JournalEntryApprovalRow {
  const approvalPolicy = args.policy ?? policy();
  const proposalHash = "a".repeat(64);
  return {
    id: "appr-1",
    proposal_id: "prop-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    proposal_hash: proposalHash,
    policy_hash: hashJeApprovalPolicy(approvalPolicy),
    decision: "APPROVED",
    approval_mode: "REVIEW_REQUIRED",
    reviewer_user_id: "reviewer-1",
    reviewer_role: "controller",
    mfa_level: args.mfaVerifiedAt ? "aal2" : null,
    mfa_verified_at: args.mfaVerifiedAt ?? null,
    decision_reason: null,
    policy_snapshot: approvalPolicy as unknown as Record<string, unknown>,
    approved_at: "2026-08-25T04:00:00.000Z",
    idempotency_key: "d".repeat(64),
  };
}

function proposalRow(amountCents: number): JournalEntryProposalRow {
  return {
    id: "prop-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    period_end: "2026-08-31",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    source_recon_run_ids: ["run-ar"],
    origin_type: "ACCRUAL",
    reason_code: "cutoff_accrual",
    memo: "test",
    currency: "USD",
    txn_date: "2026-08-31",
    lines: [
      {
        sequence: 1,
        accountId: "15",
        debitCents: amountCents,
        creditCents: 0,
      },
      {
        sequence: 2,
        accountId: "1150040002",
        debitCents: 0,
        creditCents: amountCents,
      },
    ],
    total_debits_cents: amountCents,
    total_credits_cents: amountCents,
    expected_effects: [],
    policy_snapshot: {},
    policy_hash: "b".repeat(64),
    proposal_hash: "a".repeat(64),
    status: "SUBMITTED",
    proposed_by: "proposer-1",
    proposed_at: "2026-08-25T03:00:00.000Z",
    idempotency_key: "c".repeat(64),
  };
}

describe("isMfaRequiredForApproval — canonical threshold semantics", () => {
  it("1. alwaysRequireMfa=true requires MFA regardless of amount", () => {
    expect(
      isMfaRequiredForApproval({
        policy: policy({ alwaysRequireMfa: true, mfaRequiredAboveCents: null }),
        amountCents: 1,
      }),
    ).toBe(true);
  });

  it("2. threshold null does not require MFA unless alwaysRequireMfa", () => {
    expect(
      isMfaRequiredForApproval({
        policy: policy({ alwaysRequireMfa: false, mfaRequiredAboveCents: null }),
        amountCents: 999_999_999,
      }),
    ).toBe(false);
  });

  it("3. amount below threshold does not require MFA", () => {
    expect(
      isMfaRequiredForApproval({
        policy: policy({ mfaRequiredAboveCents: THRESHOLD }),
        amountCents: THRESHOLD - 1,
      }),
    ).toBe(false);
  });

  it("4. amount exactly at threshold requires MFA (>= boundary)", () => {
    expect(
      isMfaRequiredForApproval({
        policy: policy({ mfaRequiredAboveCents: THRESHOLD }),
        amountCents: THRESHOLD,
      }),
    ).toBe(true);
  });

  it("5. amount above threshold requires MFA", () => {
    expect(
      isMfaRequiredForApproval({
        policy: policy({ mfaRequiredAboveCents: THRESHOLD }),
        amountCents: THRESHOLD + 1,
      }),
    ).toBe(true);
  });

  it("mfaRequiredForProposal delegates to isMfaRequiredForApproval", () => {
    expect(
      mfaRequiredForProposal({
        policy: policy({ mfaRequiredAboveCents: THRESHOLD }),
        totalDebitsCents: 100,
      }),
    ).toBe(
      isMfaRequiredForApproval({
        policy: policy({ mfaRequiredAboveCents: THRESHOLD }),
        amountCents: 100,
      }),
    );
  });
});

describe("MFA satisfaction helpers — JE-2 vs JE-3 alignment", () => {
  const p = policy({ mfaRequiredAboveCents: THRESHOLD });

  it("6. required MFA without proof is unsatisfied (live + historical)", () => {
    expect(
      isLiveApprovalMfaSatisfied({
        policy: p,
        amountCents: THRESHOLD,
        assuranceSatisfied: false,
      }),
    ).toBe(false);
    expect(
      isHistoricalApprovalMfaSatisfied({
        policy: p,
        amountCents: THRESHOLD,
        mfaVerifiedAt: null,
      }),
    ).toBe(false);
  });

  it("7. required MFA with valid proof is satisfied (live + historical)", () => {
    const verifiedAt = "2026-08-25T04:00:00.000Z";
    expect(
      isLiveApprovalMfaSatisfied({
        policy: p,
        amountCents: THRESHOLD,
        assuranceSatisfied: true,
      }),
    ).toBe(true);
    expect(
      isHistoricalApprovalMfaSatisfied({
        policy: p,
        amountCents: THRESHOLD,
        mfaVerifiedAt: verifiedAt,
      }),
    ).toBe(true);
  });

  it("8. historical below-threshold approval executable without fabricated MFA", () => {
    const approvalPolicy = policy({ mfaRequiredAboveCents: THRESHOLD });
    const approval = approvalRow({
      policy: approvalPolicy,
      mfaVerifiedAt: null,
    });
    const proposal = proposalRow(100);

    const eligibility = evaluateJeExecutionEligibility({
      approval,
      proposal,
      executionPolicy: DEFAULT_JE_EXECUTION_POLICY,
      executorSodSatisfied: true,
      sourceCurrent: true,
    });
    expect(eligibility.valid).toBe(true);
    expect(eligibility.mfaSatisfied).toBe(true);

    const validity = evaluateApprovalValidity({
      approval,
      proposalHash: proposal.proposal_hash,
      approvalPolicyHash: approval.policy_hash,
      sodSatisfied: true,
      mfaSatisfied: isHistoricalApprovalMfaSatisfied({
        policy: approvalPolicy,
        amountCents: proposal.total_debits_cents,
        mfaVerifiedAt: approval.mfa_verified_at,
      }),
      policy: approvalPolicy,
    });
    expect(validity.valid).toBe(true);
  });

  it("9. JE-2 live and JE-3 historical use identical threshold semantics", () => {
    const amountCents = 100;
    const approvalPolicy = policy({ mfaRequiredAboveCents: THRESHOLD });
    const required = isMfaRequiredForApproval({ policy: approvalPolicy, amountCents });
    expect(required).toBe(false);

    const liveOk = isLiveApprovalMfaSatisfied({
      policy: approvalPolicy,
      amountCents,
      assuranceSatisfied: false,
    });
    const historicalOk = isHistoricalApprovalMfaSatisfied({
      policy: approvalPolicy,
      amountCents,
      mfaVerifiedAt: null,
    });
    expect(liveOk).toBe(historicalOk);
    expect(liveOk).toBe(true);
  });

  it("10. staged $1 first-run scenario passes from policy facts only", () => {
    const approvalPolicy = policy({
      alwaysRequireMfa: false,
      mfaRequiredAboveCents: THRESHOLD,
    });
    const amountCents = 100;
    const approval = approvalRow({
      policy: approvalPolicy,
      mfaVerifiedAt: null,
    });
    const proposal = proposalRow(amountCents);

    expect(
      isMfaRequiredForApproval({ policy: approvalPolicy, amountCents }),
    ).toBe(false);

    const eligibility = evaluateJeExecutionEligibility({
      approval,
      proposal,
      executionPolicy: DEFAULT_JE_EXECUTION_POLICY,
      executorSodSatisfied: true,
      sourceCurrent: true,
    });
    expect(eligibility.valid).toBe(true);
    expect(eligibility.reason).toBeUndefined();
    expect(eligibility.mfaSatisfied).toBe(true);
  });
});

describe("regression — main bug: non-null threshold alone must not invalidate", () => {
  it("evaluateApprovalValidity does not require mfa_verified_at when caller passes mfaSatisfied=true below threshold", () => {
    const approvalPolicy = policy({ mfaRequiredAboveCents: THRESHOLD });
    const approval = approvalRow({
      policy: approvalPolicy,
      mfaVerifiedAt: null,
    });
    const proposal = proposalRow(100);

    const validity = evaluateApprovalValidity({
      approval,
      proposalHash: proposal.proposal_hash,
      approvalPolicyHash: approval.policy_hash,
      sodSatisfied: true,
      mfaSatisfied: true,
      policy: approvalPolicy,
    });
    expect(validity.valid).toBe(true);
    expect(validity.reason).toBeUndefined();
  });

  it("evaluateApprovalValidity fails when MFA was required but proof missing", () => {
    const approvalPolicy = policy({ mfaRequiredAboveCents: THRESHOLD });
    const approval = approvalRow({
      policy: approvalPolicy,
      mfaVerifiedAt: null,
    });
    const proposal = proposalRow(THRESHOLD);

    const validity = evaluateApprovalValidity({
      approval,
      proposalHash: proposal.proposal_hash,
      approvalPolicyHash: approval.policy_hash,
      sodSatisfied: true,
      mfaSatisfied: isHistoricalApprovalMfaSatisfied({
        policy: approvalPolicy,
        amountCents: proposal.total_debits_cents,
        mfaVerifiedAt: approval.mfa_verified_at,
      }),
      policy: approvalPolicy,
    });
    expect(validity.valid).toBe(false);
    expect(validity.reason).toBe("mfa_unsatisfied");
  });
});
