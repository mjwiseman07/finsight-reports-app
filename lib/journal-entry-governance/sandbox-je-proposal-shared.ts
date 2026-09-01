/**
 * Client-safe constants and response shapes for sandbox JE proposal/approval.
 * No server imports — safe for client components.
 */

import { JE_3D_VERIFIED_DEMO_A_IDENTITY } from "./je3d-first-controlled-create-activation";
import type { Patent6ChainReceiptEvent } from "./sandbox-je-cockpit-shared";

/** Authoritatively validated designated Demo A firm approver (revalidated 2026-08-31). */
export const SANDBOX_JE_DESIGNATED_APPROVER_USER_ID =
  "dc145a4f-e052-4d30-8512-32eb2c9c5289" as const;

export const SANDBOX_JE_DESIGNATED_APPROVER_EMAIL =
  "jwiseman@advisacor.com" as const;

export const SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID = "15" as const;
export const SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID = "1150040002" as const;
export const SANDBOX_JE_LOCKED_AMOUNT_CENTS = 100 as const;
export const SANDBOX_JE_LOCKED_CURRENCY = "USD" as const;
export const SANDBOX_JE_LOCKED_ORIGIN = "ACCRUAL" as const;
export const SANDBOX_JE_REASON_CODE = "SANDBOX_JE_COCKPIT_ACCRUAL" as const;

export const SANDBOX_JE_PROPOSAL_MUTATE_RATE_LIMIT_KEY =
  "governed-sandbox-je-proposal-mutate";

export const SANDBOX_JE_PROPOSAL_READ_RATE_LIMIT_KEY =
  "governed-sandbox-je-proposal-read";

export type SandboxJeProposalUxFields = {
  memo?: string | null;
  txnDate?: string | null;
  clientMutationId: string;
};

export type SafeSandboxProposalResponse = {
  proposal_id: string;
  status: string;
  proposal_hash: string;
  currency: typeof SANDBOX_JE_LOCKED_CURRENCY;
  amount_cents: typeof SANDBOX_JE_LOCKED_AMOUNT_CENTS;
  txn_date: string;
  memo: string | null;
  origin_type: typeof SANDBOX_JE_LOCKED_ORIGIN;
  reason_code: typeof SANDBOX_JE_REASON_CODE;
  debit_account_id: typeof SANDBOX_JE_LOCKED_DEBIT_ACCOUNT_ID;
  credit_account_id: typeof SANDBOX_JE_LOCKED_CREDIT_ACCOUNT_ID;
  proposed_by: string;
  proposed_at: string;
  period_end: string;
  source_continuous_close_run_id: string;
  source_accounting_sync_id: string;
  source_recon_run_ids: string[];
  firm_client_id: string | null;
  company_id: string;
  engagement_id: string;
  reused: boolean;
  client_mutation_id: string | null;
  demo_a: typeof JE_3D_VERIFIED_DEMO_A_IDENTITY;
  capabilities: {
    create_sandbox_je: false;
    verify_sandbox_je: false;
    memory: false;
    worker: false;
    governed_auto: false;
    dispatch_kill_switch_engaged: true;
    post_disabled: true;
    verify_disabled: true;
    execution_prepare_disabled: true;
  };
  patent6_chain_receipt: {
    aggregate_type: "journal_entry_proposal";
    aggregate_id: string;
    events: Patent6ChainReceiptEvent[];
  };
  approvals: SafeSandboxApprovalSummary[];
};

export type SafeSandboxApprovalSummary = {
  approval_id: string;
  decision: "APPROVED" | "REJECTED";
  decided_at: string;
  reviewer_user_id: string;
  reason: string | null;
  mfa_level: string | null;
  proposal_hash: string;
};

export type SafeSandboxDecisionResponse = {
  approval_id: string;
  proposal_id: string;
  decision: "APPROVED" | "REJECTED";
  proposal_hash: string;
  reused: boolean;
  client_mutation_id: string;
  mfa_required: true;
  mfa_satisfied: boolean;
  patent6_chain_receipt: {
    aggregate_type: "journal_entry_proposal";
    aggregate_id: string;
    events: Patent6ChainReceiptEvent[];
  };
  capabilities: SafeSandboxProposalResponse["capabilities"];
};

export { JE_3D_VERIFIED_DEMO_A_IDENTITY };
