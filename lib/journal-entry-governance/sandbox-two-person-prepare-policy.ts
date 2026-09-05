/**
 * Sandbox two-person mechanical execution-preparation authority.
 * Server-governed constants only — never caller-supplied.
 */

import {
  sha256Hex,
  stableCanonicalJson,
} from "@/lib/audit-ready/measurement-snapshots/hash";
import { canonicalizeJeExecutionPolicy } from "./execution-hash";
import type { JeExecutionPolicy } from "./execution-types";
import { JE_3D_VERIFIED_DEMO_A_IDENTITY } from "./je3d-first-controlled-create-activation";
import {
  SANDBOX_JE_LOCKED_AMOUNT_CENTS,
  SANDBOX_JE_LOCKED_CURRENCY,
  SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID,
  SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID,
} from "./sandbox-je-proposal-shared";
import type { JeAuthenticationAssurance } from "./approval-types";
import type { JournalEntryApprovalRow } from "./approval-types";
import type { JournalEntryProposalRow } from "./types";
import type { JournalEntryExecutionRow } from "./execution-types";
import type { JePreflightResult } from "./execution-types";

export const SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1 =
  "SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1" as const;

export const SANDBOX_TWO_PERSON_PREPARATION_MODE =
  "APPROVER_MECHANICAL_CUSTODY" as const;

/** Accepted Demo A custody — immutable for controlled sandbox prepare. */
export const SANDBOX_JE_ACCEPTED_PROPOSAL_ID =
  "750903ca-e3ab-4fdc-8ae8-a4a052c618e5" as const;

export const SANDBOX_JE_ACCEPTED_APPROVAL_ID =
  "e5839fd7-9ddc-439f-bd90-3d89cd0cc3bd" as const;

/**
 * Two-person sandbox execution policy: approver may mechanically prepare;
 * proposer remains barred; fresh MFA required.
 */
export const SANDBOX_TWO_PERSON_JE_EXECUTION_POLICY: JeExecutionPolicy = {
  provider: "quickbooks",
  allowedOriginTypes: ["ACCRUAL"],
  requireApprovedDecision: true,
  requireProposalHashMatch: true,
  requireApprovalPolicyHashMatch: true,
  requireApprovalNotExpired: true,
  requireSourceCcNotSuperseded: true,
  requireWriteEntitlement: true,
  requireConnectionHealthy: true,
  requireQboWriteEnabled: true,
  requirePeriodOpen: true,
  requireControlAccountRecheck: true,
  requireExecutorDifferentFromProposer: true,
  requireExecutorDifferentFromApprover: false,
  requireCurrentAccountsActive: true,
  maxExecutionAmountCents: SANDBOX_JE_LOCKED_AMOUNT_CENTS,
  manualExecutionOnly: true,
  unknownCommitPolicy: "HALT_AND_DISCOVER",
  requireFreshMfa: true,
};

export function canonicalizeSandboxTwoPersonExecutionPolicySnapshot(
  policy: JeExecutionPolicy = SANDBOX_TWO_PERSON_JE_EXECUTION_POLICY,
): Record<string, unknown> {
  return {
    ...canonicalizeJeExecutionPolicy(policy),
    preparation_authority: SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1,
    preparation_mode: SANDBOX_TWO_PERSON_PREPARATION_MODE,
    canonical_company_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.companyId,
    canonical_connection_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.accountingConnectionId,
    canonical_realm_id: JE_3D_VERIFIED_DEMO_A_IDENTITY.realmId,
    provider_environment: JE_3D_VERIFIED_DEMO_A_IDENTITY.providerEnvironment,
    locked_amount_cents: SANDBOX_JE_LOCKED_AMOUNT_CENTS,
    locked_currency: SANDBOX_JE_LOCKED_CURRENCY,
    locked_debit_account_id: SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID,
    locked_credit_account_id: SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID,
  };
}

export function hashSandboxTwoPersonExecutionPolicy(
  policy: JeExecutionPolicy = SANDBOX_TWO_PERSON_JE_EXECUTION_POLICY,
): string {
  return sha256Hex(
    stableCanonicalJson(canonicalizeSandboxTwoPersonExecutionPolicySnapshot(policy)),
  );
}

/** Patent #6 execution-preparation event payload enrichment (authoritative bindings). */
export function buildSandboxTwoPersonPrepareEventPayload(args: {
  execution: JournalEntryExecutionRow;
  proposal: JournalEntryProposalRow;
  approval: JournalEntryApprovalRow;
  connection: {
    id: string;
    tenant_or_realm_id: string;
    provider: string;
    provider_environment?: string | null;
  };
  initiatingUserId: string;
  prepareAssurance: JeAuthenticationAssurance;
  preflightEligible: boolean | null;
  preflightSummary?: string;
  preflight?: JePreflightResult | null;
  providerRequestHash: string | null;
}): Record<string, unknown> {
  const accountIds = args.proposal.lines.map((l) => String(l.accountId));
  return {
    execution_id: args.execution.id,
    proposal_id: args.execution.proposal_id,
    proposal_hash: args.execution.proposal_hash,
    approval_id: args.execution.approval_id,
    approval_policy_hash: args.execution.approval_policy_hash,
    approval_reviewer_user_id: args.approval.reviewer_user_id,
    initiating_user_id: args.initiatingUserId,
    prepare_mfa_level: args.prepareAssurance.level,
    prepare_mfa_verified_at: args.prepareAssurance.verifiedAt,
    prepare_mfa_source: args.prepareAssurance.source,
    prepare_mfa_method: args.prepareAssurance.method,
    preparation_authority: SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1,
    preparation_mode: SANDBOX_TWO_PERSON_PREPARATION_MODE,
    company_id: args.execution.company_id,
    engagement_id: args.execution.engagement_id,
    source_continuous_close_run_id: args.execution.source_continuous_close_run_id,
    source_accounting_sync_id: args.execution.source_accounting_sync_id,
    source_recon_run_ids: args.proposal.source_recon_run_ids,
    accounting_connection_id: args.execution.accounting_connection_id,
    realm_id: String(args.connection.tenant_or_realm_id || ""),
    provider: args.execution.provider,
    provider_environment:
      (args.connection as { provider_environment?: string | null })
        .provider_environment ?? "sandbox",
    currency: args.proposal.currency,
    txn_date: args.proposal.txn_date,
    total_debits_cents: args.proposal.total_debits_cents,
    total_credits_cents: args.proposal.total_credits_cents,
    account_ids: accountIds,
    execution_policy_hash: args.execution.execution_policy_hash,
    execution_hash: args.execution.execution_hash,
    idempotency_key: args.execution.idempotency_key,
    correlation_marker: args.execution.correlation_marker,
    provider_request_hash: args.providerRequestHash,
    preflight_eligible: args.preflightEligible,
    preflight_summary: args.preflightSummary ?? null,
    preflight_result: args.preflight ?? args.execution.preflight_result ?? null,
    status: args.execution.status,
  };
}
