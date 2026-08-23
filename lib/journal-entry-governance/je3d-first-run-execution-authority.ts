/**
 * JE-3D — First controlled sandbox JE execution authority.
 *
 * Binds public CREATE to ONE exact reviewed execution identity.
 * Capability ON alone is never sufficient for dispatch.
 */

import { hashProviderRequestPreview } from "./execution-hash";
import { mapGovernedProposalToQboPayload } from "./execution-payload";
import type { JournalEntryExecutionRow } from "./execution-types";
import {
  FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID,
  FIRST_RUN_EXPENSE_ACCOUNT_ID,
  FIRST_RUN_JE_AMOUNT_CENTS,
  FIRST_RUN_JE_CURRENCY,
  buildFirstRunAccountCandidate,
  validateExplicitFirstRunAccounts,
  type CoaMirrorAccountRow,
} from "./je3d-first-run-account-authority";
import type { JournalEntryProposalRow } from "./types";

/** Set only after ChatGPT/human review of staged execution cockpit. */
export const FIRST_RUN_APPROVED_EXECUTION_ID: string | null = null;

/**
 * Must be true before public executeGovernedJournalEntryCreate may dispatch.
 * Separate from account approval and staging proposal creation.
 */
export const FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED = false;

export const FIRST_RUN_REASON_CODE = "cutoff_accrual" as const;

export const FIRST_RUN_EXECUTION_AUTHORITY_ERROR = {
  EXECUTION_REVIEW_REQUIRED: "je_3d_first_run_execution_review_required",
  EXECUTION_ID_NOT_SET: "je_3d_first_run_execution_id_not_set",
  EXECUTION_ID_MISMATCH: "je_3d_first_run_execution_id_mismatch",
  ECONOMICS_ORIGIN_INVALID: "je_3d_first_run_economics_origin_invalid",
  ECONOMICS_REASON_INVALID: "je_3d_first_run_economics_reason_invalid",
  ECONOMICS_CURRENCY_INVALID: "je_3d_first_run_economics_currency_invalid",
  ECONOMICS_AMOUNT_INVALID: "je_3d_first_run_economics_amount_invalid",
  ECONOMICS_LINE_COUNT_INVALID: "je_3d_first_run_economics_line_count_invalid",
  ECONOMICS_LINE_SHAPE_INVALID: "je_3d_first_run_economics_line_shape_invalid",
  ECONOMICS_ACCOUNT_MISMATCH: "je_3d_first_run_economics_account_mismatch",
  ECONOMICS_CLASS_FORBIDDEN: "je_3d_first_run_economics_class_forbidden",
  ECONOMICS_ACCOUNT_AUTHORITY_FAILED: "je_3d_first_run_economics_account_authority_failed",
  PROVIDER_REQUEST_HASH_MISMATCH: "je_3d_first_run_provider_request_hash_mismatch",
} as const;

export type FirstRunExecutionAuthorityFailureCode =
  (typeof FIRST_RUN_EXECUTION_AUTHORITY_ERROR)[keyof typeof FIRST_RUN_EXECUTION_AUTHORITY_ERROR];

export type FirstRunExecutionIdentityEvidence = {
  approvedExecutionId: string | null;
  executionReviewedAndApproved: boolean;
};

export function resolveFirstRunExecutionIdentityEvidence(): FirstRunExecutionIdentityEvidence {
  return {
    approvedExecutionId: FIRST_RUN_APPROVED_EXECUTION_ID,
    executionReviewedAndApproved: FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED,
  };
}

export type FirstRunExecutionAuthorityResult =
  | { ok: true }
  | {
      ok: false;
      code: FirstRunExecutionAuthorityFailureCode;
      message: string;
    };

export function evaluateFirstRunExecutionIdentityGate(
  executionId: string,
  evidence: FirstRunExecutionIdentityEvidence = resolveFirstRunExecutionIdentityEvidence(),
): FirstRunExecutionAuthorityResult {
  if (!evidence.executionReviewedAndApproved) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_REVIEW_REQUIRED,
      "FIRST_RUN_EXECUTION_REVIEWED_AND_APPROVED is false; exact execution approval is required before dispatch.",
    );
  }
  if (!evidence.approvedExecutionId) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_ID_NOT_SET,
      "FIRST_RUN_APPROVED_EXECUTION_ID is not set.",
    );
  }
  if (executionId !== evidence.approvedExecutionId) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.EXECUTION_ID_MISMATCH,
      `Execution ${executionId} is not the approved first-run execution ${evidence.approvedExecutionId}.`,
    );
  }
  return { ok: true };
}

export function evaluateFirstRunExecutionEconomicsGate(args: {
  proposal: JournalEntryProposalRow;
  execution: Pick<
    JournalEntryExecutionRow,
    "correlation_marker" | "provider_request_hash"
  >;
  mirrorRows: readonly CoaMirrorAccountRow[];
  expenseAccountId?: string | null;
  accruedLiabilityAccountId?: string | null;
}): FirstRunExecutionAuthorityResult {
  const expenseAccountId =
    args.expenseAccountId ?? FIRST_RUN_EXPENSE_ACCOUNT_ID;
  const accruedLiabilityAccountId =
    args.accruedLiabilityAccountId ?? FIRST_RUN_ACCRUED_LIABILITY_ACCOUNT_ID;

  if (!expenseAccountId || !accruedLiabilityAccountId) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_ACCOUNT_MISMATCH,
      "Approved first-run expense and accrued-liability account IDs must be configured before dispatch.",
    );
  }
  if (args.proposal.origin_type !== "ACCRUAL") {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_ORIGIN_INVALID,
      "First-run execution must originate from ACCRUAL.",
    );
  }
  if (args.proposal.reason_code !== FIRST_RUN_REASON_CODE) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_REASON_INVALID,
      `First-run execution reason_code must be ${FIRST_RUN_REASON_CODE}.`,
    );
  }
  if (String(args.proposal.currency).toUpperCase() !== FIRST_RUN_JE_CURRENCY) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_CURRENCY_INVALID,
      `First-run execution currency must be ${FIRST_RUN_JE_CURRENCY}.`,
    );
  }
  if (Number(args.proposal.total_debits_cents) !== FIRST_RUN_JE_AMOUNT_CENTS) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_AMOUNT_INVALID,
      `First-run execution total_debits_cents must be ${FIRST_RUN_JE_AMOUNT_CENTS}.`,
    );
  }
  if (Number(args.proposal.total_credits_cents) !== FIRST_RUN_JE_AMOUNT_CENTS) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_AMOUNT_INVALID,
      `First-run execution total_credits_cents must be ${FIRST_RUN_JE_AMOUNT_CENTS}.`,
    );
  }
  if (!Array.isArray(args.proposal.lines) || args.proposal.lines.length !== 2) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_LINE_COUNT_INVALID,
      "First-run execution must have exactly two proposal lines.",
    );
  }

  const [debitLine, creditLine] = [...args.proposal.lines].sort(
    (a, b) => a.sequence - b.sequence,
  );
  if (
    !debitLine ||
    !creditLine ||
    debitLine.debitCents !== FIRST_RUN_JE_AMOUNT_CENTS ||
    debitLine.creditCents !== 0 ||
    creditLine.debitCents !== 0 ||
    creditLine.creditCents !== FIRST_RUN_JE_AMOUNT_CENTS ||
    debitLine.classId ||
    creditLine.classId ||
    debitLine.departmentId ||
    creditLine.departmentId ||
    debitLine.locationId ||
    creditLine.locationId
  ) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_LINE_SHAPE_INVALID,
      "First-run execution lines must be a balanced $1.00 accrual with no ClassRef/department/location dimensions.",
    );
  }
  if (
    !expenseAccountId ||
    !accruedLiabilityAccountId ||
    debitLine.accountId !== expenseAccountId ||
    creditLine.accountId !== accruedLiabilityAccountId
  ) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_ACCOUNT_MISMATCH,
      "First-run execution lines must debit the approved expense account and credit the approved accrued-liability account.",
    );
  }

  const accountAuthority = validateExplicitFirstRunAccounts({
    evidence: {
      expenseAccountId,
      accruedLiabilityAccountId,
      accountsReviewedAndApproved: true,
    },
    mirrorRows: args.mirrorRows,
  });
  if (!accountAuthority.ok) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.ECONOMICS_ACCOUNT_AUTHORITY_FAILED,
      accountAuthority.message,
    );
  }

  const preview = mapGovernedProposalToQboPayload({
    proposal: args.proposal,
    correlationMarker: args.execution.correlation_marker,
  });
  const reconstructedHash = hashProviderRequestPreview(
    preview as unknown as Record<string, unknown>,
  );
  if (
    !args.execution.provider_request_hash ||
    reconstructedHash !== args.execution.provider_request_hash
  ) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.PROVIDER_REQUEST_HASH_MISMATCH,
      "Reconstructed provider_request_hash does not match persisted execution hash.",
    );
  }

  if (!preview.PrivateNote.includes(args.execution.correlation_marker)) {
    return deny(
      FIRST_RUN_EXECUTION_AUTHORITY_ERROR.PROVIDER_REQUEST_HASH_MISMATCH,
      "Governed preview PrivateNote must contain the exact persisted correlation marker.",
    );
  }

  void buildFirstRunAccountCandidate(accountAuthority.expense);
  void buildFirstRunAccountCandidate(accountAuthority.liability);

  return { ok: true };
}

export function evaluateFirstRunCreateAuthority(args: {
  executionId: string;
  execution: JournalEntryExecutionRow;
  proposal: JournalEntryProposalRow;
  mirrorRows: readonly CoaMirrorAccountRow[];
  identityEvidence?: FirstRunExecutionIdentityEvidence;
  expenseAccountId?: string | null;
  accruedLiabilityAccountId?: string | null;
}): FirstRunExecutionAuthorityResult {
  const identity = evaluateFirstRunExecutionIdentityGate(
    args.executionId,
    args.identityEvidence,
  );
  if (!identity.ok) return identity;
  return evaluateFirstRunExecutionEconomicsGate({
    proposal: args.proposal,
    execution: args.execution,
    mirrorRows: args.mirrorRows,
    expenseAccountId: args.expenseAccountId,
    accruedLiabilityAccountId: args.accruedLiabilityAccountId,
  });
}

function deny(
  code: FirstRunExecutionAuthorityFailureCode,
  message: string,
): FirstRunExecutionAuthorityResult {
  return { ok: false, code, message };
}
