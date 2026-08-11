import type {
  AccountingConnectionRecord,
  AccountingDateRange,
  AccountingProvider,
  AdvisacorNormalizedFinancialData,
  ProviderRawReports,
} from "../../accounting/types";

export type AccountingSystemAdapterSource = Extract<AccountingProvider, "quickbooks" | "xero">;

export type AccountingSystemConnectionResult = {
  provider: AccountingSystemAdapterSource;
};

export type InitialPeriodPullInput = {
  connection: AccountingConnectionRecord;
  reportPeriod: AccountingDateRange;
};

export type HistoricalPeriodPullInput = {
  connection: AccountingConnectionRecord;
  reportPeriods: AccountingDateRange[];
};

export type NormalizedDataContext = {
  connection: AccountingConnectionRecord;
  reportPeriod: AccountingDateRange;
  syncId: string;
  tenantId: string | null;
  tenantName: string;
};

export type ReturnNormalizedFinancialDataInput = NormalizedDataContext & {
  rawReports?: ProviderRawReports;
};

export type SourceValidationResult = {
  readyForReporting: boolean;
  missingObjects: string[];
  warnings: string[];
};

// =========================================================================
// WBP W1a — Write boundary types
// Powers XeroAccountingProvider.writeJournalEntry / QuickBooksAccountingProvider.writeJournalEntry
// wired in W1c. Validation and drift-detection live in lib/accounting/write-boundary (W1b).
// Every write emits hash-chained pilot_lifecycle_events per patent (rule 2).
// =========================================================================

export type JournalLine = {
  /**
   * Canonical account code. For Xero: Account.Code (e.g. "090", "200"). For QBO: Account.Id (numeric).
   * Adapter resolves to provider-specific AccountRef/AccountCode using *_accounts_cache table.
   */
  accountCode: string;
  /**
   * Provider-canonical account ID (Xero AccountID / QBO Id). Optional on input;
   * populated on response so callers can persist both code and ID.
   */
  accountId?: string;
  /** Positive amount. 0 if this is a credit-side line. */
  debit: number;
  /** Positive amount. 0 if this is a debit-side line. */
  credit: number;
  description?: string;
  /** Xero tracking category option ID. Ignored for QBO. */
  trackingCategoryId?: string;
  /** QBO class ref ID. Ignored for Xero. */
  classId?: string;
};

export type JournalEntry = {
  /** Xero XeroTenantId or QBO realmId. Must match connection.tenant_or_realm_id. */
  tenantId: string;
  /** ISO date YYYY-MM-DD in tenant timezone. */
  journalDate: string;
  /** Header memo / narration. Required. */
  narration: string;
  /** Two or more lines. Sum of debits must equal sum of credits. */
  lines: JournalLine[];
  /**
   * ISO 4217 currency code. Must match connection.home_currency for W1
   * (multi-currency journals deferred to W1.5).
   */
  currency: string;
  /** DRAFT is safe for validation + review. POSTED commits to the GL. W1 supports both. */
  status: "DRAFT" | "POSTED";
  /**
   * Caller-provided idempotency key. Adapter MUST reject a second write with the same
   * externalRef against the same connection (checked via write-boundary event log).
   */
  externalRef: string;
};

export type ValidationIssue = {
  code:
    | "unbalanced-lines"
    | "insufficient-lines"
    | "zero-amount-line"
    | "currency-mismatch"
    | "unknown-account-code"
    | "forbidden-account"
    | "invalid-date"
    | "missing-narration"
    | "duplicate-external-ref"
    /** Q7/provider-level rejection surfaced via type-adapters.toWriteReceipt (W1c.1). */
    | "provider-rejected";
  message: string;
  lineIndex?: number;
  accountCode?: string;
  systemAccount?: string;
  accountType?: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};

export type WriteReceipt = {
  /** Provider-canonical journal ID (Xero XeroID / QBO Id). */
  providerJournalId: string;
  /** Human-readable provider number if the provider assigns one. */
  providerJournalNumber?: string;
  status: "DRAFT" | "POSTED";
  /** ISO8601 from provider response body. */
  writtenAt: string;
  /**
   * All lines as the provider recorded them (post-drift-check).
   * Length MUST equal request.lines.length; adapter throws WriteDrifted otherwise.
   */
  resolvedAccounts: Array<{ accountCode: string; accountId: string }>;
  /**
   * pilot_lifecycle_events.id values emitted for this write (typically
   * [write-validated, write-posted] for happy path; [write-rejected] for validation
   * failure; [write-validated, write-drifted, write-void-succeeded] for drift path).
   * Callers can walk the hash chain from any of these IDs.
   */
  lifecycleEventIds: string[];
};

export type AccountsCacheRefreshResult = {
  refreshedAt: string; // ISO8601
  totalAccounts: number;
  addedAccounts: number;
  updatedAccounts: number;
  removedAccounts: number; // now-inactive accounts
};

export type AccountsCacheRefreshOptions = {
  /** Origin of this refresh — flows into the CacheRefreshedPayload.trigger field. */
  trigger?:
    | "manual"
    | "scheduled"
    | "write-preflight"
    | "preflight-stale"
    | "preflight-miss";
};

// =========================================================================
// Errors thrown by the write path
// Adapters throw one of these; callers pattern-match on `.name` for handling.
// =========================================================================

export class WriteBoundaryError extends Error {
  readonly lifecycleEventIds: string[];
  constructor(message: string, lifecycleEventIds: string[] = []) {
    super(message);
    this.name = "WriteBoundaryError";
    this.lifecycleEventIds = lifecycleEventIds;
  }
}

export class WriteRejected extends WriteBoundaryError {
  readonly issues: ValidationIssue[];
  constructor(issues: ValidationIssue[], lifecycleEventIds: string[]) {
    super(`Write rejected by validator: ${issues.map((i) => i.code).join(", ")}`, lifecycleEventIds);
    this.name = "WriteRejected";
    this.issues = issues;
  }
}

export class WriteDrifted extends WriteBoundaryError {
  readonly driftReasons: string[];
  readonly voidedJournalId?: string;
  constructor(driftReasons: string[], lifecycleEventIds: string[], voidedJournalId?: string) {
    super(`Write drifted: ${driftReasons.join(", ")}`, lifecycleEventIds);
    this.name = "WriteDrifted";
    this.driftReasons = driftReasons;
    this.voidedJournalId = voidedJournalId;
  }
}

export class WriteFailed extends WriteBoundaryError {
  readonly httpStatus?: number;
  readonly providerErrorCode?: string;
  constructor(message: string, lifecycleEventIds: string[], httpStatus?: number, providerErrorCode?: string) {
    super(message, lifecycleEventIds);
    this.name = "WriteFailed";
    this.httpStatus = httpStatus;
    this.providerErrorCode = providerErrorCode;
  }
}

export class WriteBoundaryDisabled extends WriteBoundaryError {
  constructor(reason: string) {
    super(`Write disabled for this connection: ${reason}`);
    this.name = "WriteBoundaryDisabled";
  }
}

// =========================================================================
// The extended interface
// =========================================================================

export interface AccountingSystemAdapter {
  // --- Read surface (from W0) ---
  sourceSystem: AccountingSystemAdapterSource;
  connect(): Promise<AccountingSystemConnectionResult>;
  fetchInitialPeriodData(input: InitialPeriodPullInput): Promise<ProviderRawReports>;
  fetchHistoricalData(input: HistoricalPeriodPullInput): Promise<ProviderRawReports[]>;
  normalizeData(rawReports: ProviderRawReports, context: NormalizedDataContext): Promise<AdvisacorNormalizedFinancialData>;
  validateSourceData(normalizedData: AdvisacorNormalizedFinancialData): SourceValidationResult;
  returnNormalizedFinancialData(input: ReturnNormalizedFinancialDataInput): Promise<AdvisacorNormalizedFinancialData>;

  // --- Write surface (WBP W1a) ---
  // Adapters implementing these MUST honour accounting_connections.metadata_json.write_enabled_{xero,quickbooks}
  // (default false). If disabled, throw WriteBoundaryDisabled BEFORE validation.
  //
  // Every write MUST emit hash-chained pilot_lifecycle_events via lib/lifecycle/emit-sync-event.ts
  // (or its write-boundary cousin from W1b) and populate WriteReceipt.lifecycleEventIds.
  //
  // Adapters MAY be a no-op at W1a (throw "not implemented yet"). W1c wires the real methods.
  validateJournalEntry(entry: JournalEntry, connection: AccountingConnectionRecord): Promise<ValidationResult>;
  writeJournalEntry(entry: JournalEntry, connection: AccountingConnectionRecord): Promise<WriteReceipt>;
  voidJournalEntry(providerJournalId: string, reason: string, connection: AccountingConnectionRecord): Promise<void>;
  refreshAccountsCache(
    connection: AccountingConnectionRecord,
    options?: AccountsCacheRefreshOptions,
  ): Promise<AccountsCacheRefreshResult>;
}

// =========================================================================
// Migration adapter — bridges the existing AccountingProviderAdapter
// (READ-only, in lib/integrations/accounting/types.ts) to the new
// AccountingSystemAdapter. Providers that haven't implemented writes yet
// use this until W1c. Do NOT use in production writes — throws.
// =========================================================================

export type PartialAccountingSystemAdapter =
  Omit<AccountingSystemAdapter, "validateJournalEntry" | "writeJournalEntry" | "voidJournalEntry">;

/**
 * Attaches stub write methods to a read-only adapter so it satisfies AccountingSystemAdapter
 * at compile time without providing real writes. Use ONLY as an intermediate step during
 * W1a → W1c. In W1c, XeroAccountingProvider and QuickBooksAccountingProvider implement the
 * write methods directly and this helper is deleted.
 *
 * WBP W1c.4b: refreshAccountsCache is no longer stubbed — callers must supply a real
 * implementation (both write providers do).
 */
export function withStubWriteMethods<T extends PartialAccountingSystemAdapter>(
  readOnlyAdapter: T,
): T & AccountingSystemAdapter {
  const stub = async (): Promise<never> => {
    throw new WriteBoundaryError(
      "Write methods not implemented for this provider (WBP W1a stub). Wire real methods in W1c.",
    );
  };
  return Object.assign({}, readOnlyAdapter, {
    validateJournalEntry: stub as unknown as AccountingSystemAdapter["validateJournalEntry"],
    writeJournalEntry: stub as unknown as AccountingSystemAdapter["writeJournalEntry"],
    voidJournalEntry: stub as unknown as AccountingSystemAdapter["voidJournalEntry"],
  }) as T & AccountingSystemAdapter;
}
