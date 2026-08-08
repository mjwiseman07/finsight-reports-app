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
  | "pilot.lifecycle.write-failed"
  | "pilot.lifecycle.cache-refreshed"; // WBP W1c.4a — emitted by refreshAccountsCache

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

/**
 * WBP W1c.4a/4c — Payload for pilot.lifecycle.cache-refreshed events.
 *
 * Emitted by QuickBooksWriteProvider.refreshAccountsCache /
 * XeroWriteProvider.refreshAccountsCache after every cache hydration
 * (manual admin POST, daily cron, or write-preflight self-heal).
 *
 * trigger values (W1c.4c widened additively to 5):
 *   manual | scheduled | write-preflight | preflight-stale | preflight-miss
 *
 * The same payload shape is ALSO upserted to company_memory_records
 * (memory_type='accounts_cache_refresh') so the lifecycle event and the
 * customer-visible memory row stay byte-identical.
 */
export type CacheRefreshedPayload = {
  connection_id: string;
  tenant_id: string;
  source_system: "xero" | "quickbooks";
  total_accounts: number;
  added_accounts: number;
  updated_accounts: number;
  removed_accounts: number;
  refreshed_at: string; // ISO8601
  trigger:
    | "manual" // admin POST route
    | "scheduled" // vercel cron daily run
    | "write-preflight" // legacy — retained for W1c.4a call sites
    | "preflight-stale" // W1c.4c: cache age exceeded ACCOUNTS_CACHE_MAX_AGE_HOURS
    | "preflight-miss"; // W1c.4c: write referenced an account not in cache
  api_call_duration_ms: number;
  pagination_pages: number; // 1 for Xero; QBO can be >1
  /**
   * Optional list of account codes/IDs that changed in this refresh.
   * Populated when any of added/updated/removed > 0.
   * Enables Pulse to surface "3 new accounts added since last review".
   */
  changed_account_codes?: string[];
};

/**
 * WBP W1c.4a — Discriminated union for the emitter's payload parameter.
 *
 * The 6 write kinds carry WriteLifecyclePayload; cache-refreshed carries
 * CacheRefreshedPayload. Emitter accepts the union and stamps the correct
 * reason_code via reasonCodeForWriteEvent(eventKind).
 */
export type WriteBoundaryLifecyclePayload = WriteLifecyclePayload | CacheRefreshedPayload;
