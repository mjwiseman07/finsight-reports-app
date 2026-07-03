/**
 * D4 Uncategorized Cleanup Engine — domain type surface.
 *
 * Single source of truth for D4 types (Steps 3-9 import from here).
 * UncategorizedProposal mirrors the public.uncategorized_proposals columns
 * 1:1 (spec §5); nullable columns use `| null` because the DB returns null,
 * not undefined.
 */
import type { AccountingMethod } from "@/lib/rules/types";

export type { AccountingMethod };

// --- Enum unions (match DB CHECK constraints exactly) ---

export type UncategorizedProposalStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "modified"
  | "skipped";

export type UncategorizedProposalTxnType =
  | "Purchase"
  | "Bill"
  | "JournalEntry"
  | "Deposit"
  | "Expense";

export type UncategorizedProposalSource =
  | "vendor_gl_mapping"
  | "recurring_pattern"
  | "amount_range"
  | "no_pattern";

export type UncategorizedProposalConfidenceBucket = "green" | "yellow" | "red";

// --- Row shape: mirrors public.uncategorized_proposals (30 columns) ---

export type UncategorizedProposal = {
  proposal_id: string; // UUID PK
  firm_client_id: string; // UUID NOT NULL
  scan_run_id: string; // UUID NOT NULL
  txn_id: string; // TEXT NOT NULL
  txn_type: UncategorizedProposalTxnType; // TEXT NOT NULL (CHECK)
  txn_date: string; // DATE NOT NULL (YYYY-MM-DD)
  txn_amount: number; // NUMERIC(18,2) NOT NULL
  txn_memo: string | null; // TEXT
  vendor_id: string | null; // TEXT
  vendor_name: string | null; // TEXT
  current_account_id: string; // TEXT NOT NULL
  current_account_name: string; // TEXT NOT NULL
  suggested_account_id: string | null; // TEXT
  suggested_account_name: string | null; // TEXT
  suggested_account_type: string | null; // TEXT
  suggested_account_subtype: string | null; // TEXT
  source: UncategorizedProposalSource; // TEXT NOT NULL (CHECK)
  memory_id: string | null; // TEXT
  confidence: number; // NUMERIC(4,3) NOT NULL
  confidence_bucket: UncategorizedProposalConfidenceBucket; // TEXT NOT NULL (CHECK)
  sample_count: number; // INTEGER NOT NULL DEFAULT 0
  status: UncategorizedProposalStatus; // TEXT NOT NULL DEFAULT 'pending'
  reviewer_user_id: string | null; // UUID
  decided_at: string | null; // TIMESTAMPTZ
  final_account_id: string | null; // TEXT
  final_account_name: string | null; // TEXT
  posted_je_id: string | null; // TEXT (D2 attempt_id)
  reject_reason: string | null; // TEXT
  created_at: string; // TIMESTAMPTZ NOT NULL
  updated_at: string; // TIMESTAMPTZ NOT NULL
};

// --- Path B advisory output (not persisted) ---

export type Inconsistency = {
  txn_id: string;
  txn_date: string;
  vendor_id: string;
  vendor_name: string;
  posted_account_id: string;
  posted_account_name: string;
  pattern_account_id: string;
  pattern_account_name: string;
  pattern_confidence: number;
  pattern_sample_count: number;
};

// --- API input DTOs (Step 7) ---

export type AcceptProposalInput = { final_account_id?: string };
export type RejectProposalInput = { reject_reason: string };
export type ModifyProposalInput = { final_account_id: string; modify_reason?: string };
export type SkipProposalInput = { skip_reason?: string };
export type BulkAcceptInput = { proposal_ids: string[] };
export type ScanInput = { firm_client_id: string; since?: string };

// --- API response types (spec §6) ---

export type ScanResponse = {
  run_id: string;
  proposals_generated: number;
  by_bucket: { green: number; yellow: number; red: number };
  by_source: Record<UncategorizedProposalSource, number>;
  duration_ms: number;
};

export type BulkAcceptResult = {
  proposal_id: string;
  posted_je_id: string | null;
  status: "posted" | "failed" | "cash_basis";
  error?: string;
};

export type BulkAcceptResponse = {
  batch_id: string;
  accepted: number;
  failed: number;
  results: BulkAcceptResult[];
};

export type AcceptProposalResponse =
  | { status: "accepted"; proposal_id: string; posted_je_id: string; final_account_id: string }
  | { status: "cash_basis"; proposal_id: string; posted_je_id: null; reason: "cash_basis_notes_only" }
  | { status: "rejected_by_d2"; proposal_id: string; reason: string };
