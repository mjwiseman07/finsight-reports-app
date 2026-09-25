/**
 * Bind a VERIFIED execution, its Patent #6 verification receipt, and the
 * proposal that owns expected effects. Caller-supplied company and sync
 * identifiers are not accepted here.
 */

import type { JournalEntryExecutionRow } from "./execution-types";
import type { JournalEntryProposalRow } from "./types";
import {
  assertVerifiedJeMemoryProjectionCustody,
  VerifiedJeProjectionError,
  type PriorLedgerEventCustody,
  type VerificationLedgerEventCustody,
} from "./verified-memory-projection-custody";
import {
  PostWriteVerificationError,
  type PostWriteExecutionCustody,
} from "./post-write-verification-types";

function fail(code: string, message: string): never {
  throw new PostWriteVerificationError(code, message);
}

export function assertPostWriteVerificationCustody(args: {
  execution: JournalEntryExecutionRow;
  proposal: JournalEntryProposalRow;
  receipt: VerificationLedgerEventCustody;
  priorEventByPreviousHash: PriorLedgerEventCustody | null;
}): PostWriteExecutionCustody {
  const { execution, proposal } = args;
  if (execution.status !== "VERIFIED") {
    fail(
      "je4_requires_verified",
      "Post-write verification requires VERIFIED execution custody.",
    );
  }
  if (proposal.id !== execution.proposal_id) {
    fail(
      "je4_proposal_mismatch",
      "Proposal id does not match execution custody.",
    );
  }
  if (proposal.company_id !== execution.company_id) {
    fail(
      "je4_proposal_company_mismatch",
      "Proposal company does not match execution custody.",
    );
  }
  if (proposal.engagement_id !== execution.engagement_id) {
    fail(
      "je4_proposal_engagement_mismatch",
      "Proposal engagement does not match execution custody.",
    );
  }
  if (
    proposal.source_continuous_close_run_id !==
    execution.source_continuous_close_run_id
  ) {
    fail(
      "je4_proposal_cc_mismatch",
      "Proposal source Continuous Close run does not match execution custody.",
    );
  }
  if (proposal.source_accounting_sync_id !== execution.source_accounting_sync_id) {
    fail(
      "je4_proposal_sync_mismatch",
      "Proposal source accounting sync does not match execution custody.",
    );
  }
  if (proposal.proposal_hash !== execution.proposal_hash) {
    fail(
      "je4_proposal_hash_mismatch",
      "Proposal hash does not match execution custody.",
    );
  }
  const requestedBy = String(execution.requested_by || "").trim();
  if (!requestedBy) {
    fail("je4_requester_required", "Execution requested_by is required.");
  }

  let bound;
  try {
    bound = assertVerifiedJeMemoryProjectionCustody({
      execution,
      receipt: args.receipt,
      priorEventByPreviousHash: args.priorEventByPreviousHash,
    });
  } catch (error) {
    if (error instanceof VerifiedJeProjectionError) {
      fail(error.code, error.message);
    }
    throw error;
  }

  if (
    bound.totalDebitsCents !== proposal.total_debits_cents ||
    bound.totalCreditsCents !== proposal.total_credits_cents
  ) {
    fail(
      "je4_economics_receipt_mismatch",
      "Verification snapshot economics do not match the proposal totals.",
    );
  }

  return {
    executionId: execution.id,
    proposalId: proposal.id,
    proposalHash: proposal.proposal_hash,
    companyId: execution.company_id,
    engagementId: execution.engagement_id,
    firmClientId: bound.firmClientId,
    accountingConnectionId: execution.accounting_connection_id,
    provider: "quickbooks",
    periodEnd: String(proposal.period_end).slice(0, 10),
    sourceContinuousCloseRunId: execution.source_continuous_close_run_id,
    sourceAccountingSyncId: execution.source_accounting_sync_id,
    providerJournalId: bound.providerJournalId,
    providerReadbackHash: bound.providerReadbackHash,
    verificationLedgerEventId: bound.verificationLedgerEventId,
    verifiedAt: bound.verifiedAt,
    requestedBy,
    currency: bound.currency,
    lines: proposal.lines,
    expectedEffects: proposal.expected_effects,
    sourceReconRunIds: proposal.source_recon_run_ids || [],
    totalDebitsCents: proposal.total_debits_cents,
    totalCreditsCents: proposal.total_credits_cents,
    correlationMarker: bound.correlationMarker,
  };
}
