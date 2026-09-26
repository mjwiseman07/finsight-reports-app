/**
 * JE-4 — post-VERIFIED accounting refresh and expected-effect proof.
 *
 * This pipeline does not create or verify provider journal entries.
 * JE-3B2 / JE-3C / JE-3D gates stay hard-disabled. Callers supply an
 * execution id only; company, connection, and sync identity come from custody.
 */

import type { JeExpectedEffect, JeProposalLine } from "./types";

export const JE4_RUN_STATUSES = [
  "IN_PROGRESS",
  "REFRESH_FAILED",
  "CANONICAL_INCOMPLETE",
  "RECON_FAILED",
  "TIE_OUT_FAILED",
  "OBSERVE_FAILED",
  "PENDING_PROVIDER_VISIBILITY",
  "EFFECTS_MISMATCH",
  "EFFECTS_INCOMPLETE",
  "EFFECTS_VERIFIED",
] as const;

export type Je4RunStatus = (typeof JE4_RUN_STATUSES)[number];

export const JE4_EFFECT_CONCLUSIONS = [
  "NOT_EVALUATED",
  "PENDING_PROVIDER_VISIBILITY",
  "INCOMPLETE",
  "MISMATCH",
  "VERIFIED",
] as const;

export type Je4EffectConclusion = (typeof JE4_EFFECT_CONCLUSIONS)[number];

export type Je4ReadinessState = "READY" | "READY_WITH_REVIEW" | "BLOCKED";

export class PostWriteVerificationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PostWriteVerificationError";
  }
}

export type PostWriteVisibleJournalLine = {
  accountId: string;
  debitCents: number;
  creditCents: number;
};

export type PostWriteReconEvidence = {
  outcome: string | null;
  residualDeltaCents: number | null;
  authoritative: boolean;
};

/**
 * Refreshed canonical/URM facts used to prove expected effects.
 * Built from the post-write accounting sync and observation slots.
 * Never taken from caller-supplied company or sync ids.
 */
export type PostWriteCanonicalEvidence = {
  accountingSyncId: string;
  companyId: string;
  connectionId: string;
  periodEnd: string;
  validationStatus: string;
  /** accounting_syncs.last_synced_at. Missing → cannot prove at-or-after VERIFIED. */
  syncedAt: string | null;
  partial: boolean;
  /**
   * absent: the canonical payload has no journal-line collection.
   * present: a journal-line collection exists. visibleJournalLines is null
   * when the verified provider journal id is missing from that collection.
   */
  journalLineRepresentation: "absent" | "present";
  /**
   * Lines from the verified provider journal when a journal-line collection
   * contains that id. null is lag only when journalLineRepresentation is present.
   */
  visibleJournalLines: PostWriteVisibleJournalLine[] | null;
  /**
   * Provider-backed GL detail endings in qbo_natural_sign, keyed by qbo account id.
   * Filled from bs recon artifact ending_balance_cents or run subledger_total_cents.
   * Trial-balance net amounts are not stored here.
   */
  glDetailEndingCents: Record<string, number>;
  reconEvidence: Record<string, PostWriteReconEvidence>;
};

export type PostWriteExecutionCustody = {
  executionId: string;
  proposalId: string;
  proposalHash: string;
  companyId: string;
  engagementId: string;
  firmClientId: string;
  accountingConnectionId: string;
  provider: "quickbooks";
  periodEnd: string;
  sourceContinuousCloseRunId: string;
  sourceAccountingSyncId: string;
  providerJournalId: string;
  providerReadbackHash: string;
  verificationLedgerEventId: string;
  verifiedAt: string;
  requestedBy: string;
  currency: string;
  lines: JeProposalLine[];
  expectedEffects: JeExpectedEffect[];
  sourceReconRunIds: string[];
  totalDebitsCents: number;
  totalCreditsCents: number;
  correlationMarker: string;
};

export type Je4RunRow = {
  id: string;
  execution_id: string;
  company_id: string;
  engagement_id: string;
  firm_client_id: string | null;
  accounting_connection_id: string;
  provider_journal_id: string | null;
  provider_readback_hash: string;
  verification_ledger_event_id: string;
  source_accounting_sync_id: string;
  accounting_sync_id: string | null;
  observation_id: string | null;
  tie_out_run_ids: string[];
  continuous_close_run_id: string | null;
  source_continuous_close_run_id: string;
  policy_hash: string;
  input_hash: string;
  idempotency_key: string;
  status: Je4RunStatus;
  effect_conclusion: Je4EffectConclusion;
  retryable: boolean;
  readiness: Je4ReadinessState | null;
  evidence: Record<string, unknown>;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};

export type PostWriteVerificationResult = {
  /** True only when expected effects are proven. Readiness is reported separately. */
  ok: boolean;
  reused: boolean;
  code: string;
  message: string;
  run: Je4RunRow | null;
};

export const JE4_FORBIDDEN_CALLER_KEYS = [
  "companyId",
  "company_id",
  "firmClientId",
  "firm_client_id",
  "engagementId",
  "engagement_id",
  "accountingSyncId",
  "accounting_sync_id",
  "connectionId",
  "accounting_connection_id",
  "realmId",
  "providerJournalId",
  "provider_journal_id",
  "accessToken",
  "providerToken",
] as const;

export const JE4_TRANSIENT_ATTEMPT_LIMIT = 3;
