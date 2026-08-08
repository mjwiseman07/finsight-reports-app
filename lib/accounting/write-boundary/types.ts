// WBP W1b — Module-internal types + re-exports from the W1a contract.
// Callers should import from ./index (barrel), not directly from here.

export type {
  JournalEntry,
  JournalLine,
  ValidationIssue,
  ValidationResult,
  WriteReceipt,
  AccountsCacheRefreshResult,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";

export {
  WriteBoundaryError,
  WriteRejected,
  WriteDrifted,
  WriteFailed,
  WriteBoundaryDisabled,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";

// ---------- Module-internal types (not exported at W1a level) ----------

/**
 * Snapshot of a Xero account row from xero_accounts_cache.
 * Mirrors the DB column set 1:1.
 */
export type XeroAccountSnapshot = {
  connection_id: string;
  tenant_id: string;
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  account_class: string | null;
  system_account: string | null;
  status: string;
  enable_payments_to_account: boolean;
  tax_type: string | null;
  description: string | null;
  updated_date_utc: string | null;
  cached_at: string;
  raw_payload: Record<string, unknown>;
};

/**
 * Snapshot of a QBO account row from qbo_accounts_cache.
 */
export type QboAccountSnapshot = {
  connection_id: string;
  realm_id: string;
  account_id: string;
  account_name: string;
  fully_qualified_name: string | null;
  account_type: string;
  account_sub_type: string | null;
  classification: string | null;
  active: boolean;
  currency_ref: string | null;
  parent_ref: string | null;
  meta_created_time: string | null;
  meta_last_updated_time: string | null;
  cached_at: string;
  raw_payload: Record<string, unknown>;
};

/**
 * The narrowed subset of AccountingConnectionRecord that the write boundary
 * actually uses. Isolates the module from unrelated connection fields.
 */
export type WriteBoundaryConnection = {
  id: string;
  provider: "xero" | "quickbooks";
  tenant_or_realm_id: string;
  status: string;
  metadata_json: Record<string, unknown>;
  home_currency: string | null;
};

/**
 * What the drift detector compares: caller's original request vs the
 * provider-normalized response after write.
 */
export type ProviderWriteResponse = {
  providerJournalId: string;
  providerJournalNumber?: string;
  status: "DRAFT" | "POSTED";
  writtenAt: string;
  /**
   * Lines as the provider recorded them. Same order as request.lines when the
   * provider preserves order (Xero + QBO both do). If line count differs from
   * request, that is itself a drift signal.
   */
  recordedLines: Array<{
    accountCode: string;
    accountId: string;
    debit: number;
    credit: number;
  }>;
  /**
   * Provider warnings array (Xero returns Warnings[]; QBO returns
   * ValidationErrorCollection). If non-empty, drift is suspected.
   */
  warnings: string[];
};

/**
 * Emitter payload shape — mirrors emit-sync-event.ts payload contract with
 * write-specific fields. Written under snake_case per Cursor's convention
 * verified in the W0.5 lifecycle event.
 */
export type WriteLifecycleEventKind =
  | "pilot.lifecycle.write-validated"
  | "pilot.lifecycle.write-rejected"
  | "pilot.lifecycle.write-posted"
  | "pilot.lifecycle.write-drifted"
  | "pilot.lifecycle.write-void-succeeded"
  | "pilot.lifecycle.write-failed";

export type WriteLifecyclePayload = {
  connection_id: string;
  tenant_id: string;
  source_system: "xero" | "quickbooks";
  external_ref: string;
  narration: string;
  journal_date: string;
  currency: string;
  line_count: number;
  total_debits: number;
  total_credits: number;
  /**
   * SHA-256 of the canonical JSON of the request (see hash.ts helper below).
   * Deterministic — same input yields same hash, enabling replay-safe dedup.
   */
  request_hash: string;
  // Populated for post-provider events:
  provider_journal_id?: string;
  provider_journal_number?: string;
  status?: "DRAFT" | "POSTED";
  written_at?: string;
  // Populated for write-drifted:
  drift_reasons?: string[];
  voided_journal_id?: string;
  // Populated for write-void-succeeded:
  voided_reason?: string;
  // Populated for write-failed:
  http_status?: number;
  provider_error_code?: string;
  error_message?: string;
  // Populated for write-rejected:
  validation_issues?: Array<{
    code: string;
    message: string;
    line_index?: number;
    account_code?: string;
    system_account?: string;
    account_type?: string;
  }>;
  // Universal (mirrors emit-sync-event convention):
  provenance: "live" | "backfill_reconciliation";
  triggered_by?: string;
};
