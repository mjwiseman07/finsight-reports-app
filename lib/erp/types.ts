/**
 * ERPAdapter — abstract shape any ERP integration must satisfy.
 * QBO adapter satisfies this today; Xero, NetSuite, Sage will implement
 * this interface in Doc E and beyond.
 *
 * D1.1 introduces this as a stub for structure only. The QBO adapter does NOT
 * fully implement it yet — that lands in D2. Concrete payload types below are
 * placeholders replaced with real definitions in D2+.
 */
export interface ERPAdapter {
  readonly provider: "quickbooks" | "xero" | "netsuite" | "sage";

  // Read
  getCompanyInfo(firmClientId: string): Promise<CompanyInfo>;
  getAccounts(firmClientId: string): Promise<Account[]>;
  getTransactions(firmClientId: string, params: TxQuery): Promise<Transaction[]>;
  getReport(firmClientId: string, reportName: string, params: ReportParams): Promise<ReportResult>;

  // Write (stubs — D2 fills in for QBO)
  postJournalEntry?(firmClientId: string, entry: JournalEntryInput): Promise<JournalEntryResult>;
  voidJournalEntry?(firmClientId: string, jeId: string): Promise<void>;

  // Health
  checkHealth(firmClientId: string): Promise<HealthResult>;
  canWrite(firmClientId: string): Promise<WritePreflightResult>;
}

// Stub type re-exports — real definitions live in D2+
export type CompanyInfo = Record<string, unknown>;
export type Account = Record<string, unknown>;
export type Transaction = Record<string, unknown>;
export type TxQuery = Record<string, unknown>;
export type ReportParams = Record<string, unknown>;
export type ReportResult = Record<string, unknown>;
export type HealthResult = Record<string, unknown>;
export type WritePreflightResult = Record<string, unknown>;

// === WBP W0: Provider-agnostic write-op contract ===
// Traced to WBP_Provider_Research.md §8 (interface) and §9 (capabilities).
// See Phase_WBP_Master_Planning_Doc.md for the wave sequence.
// Replaces the D1.1 JournalEntryInput / JournalEntryResult Record placeholders.

export type AccountingProviderId =
  | "quickbooks"
  | "xero"
  | "netsuite"
  | "sage_intacct"
  | "dynamics_bc";

/** Immutable context passed to every provider write op. */
export type WriteContext = {
  /** Advisacor-side firm/client link — the tenant-scoping key for pulse_je_submissions. */
  firm_client_id: string;
  /** Row id from accounting_connections — resolves provider + tokens + tenant. */
  connection_id: string;
  /** The user who triggered this write (audit + chain). */
  actor_user_id: string;
  /** ai=Pulse-generated, human=user-typed. Drives posted_by column on submission row. */
  posted_by: "ai" | "human";
  /** SHA256 canonical hash of the JournalEntryInput, computed by caller.
   *  Enforces idempotency across replay/retry. Research §10 step 1. */
  idempotency_key: string;
  /** Business origin — where the JE came from in Advisacor. */
  source_type: "rule" | "anomaly" | "flux" | "manual" | "reversal" | "recurring" | "pulse_conversational";
  /** Optional pointer to source_type record (rule_fire_id, flux_id, etc.). */
  source_id?: string;
  /** ISA 315 assertion IDs (for AR-Pro audit-ready gating). */
  assertions_addressed?: string[];
  /** PCAOB AS 1105 ¶.10A reliability basis. Required when assertions non-empty. */
  data_source_reliability_basis?: DataSourceReliabilityBasis;
};

export type PostingSide = "debit" | "credit";

export type DimensionTag = {
  /** Dimension name in the caller's canonical taxonomy (e.g. "class", "department", "location", "job", "tracking_a"). */
  name: string;
  /** Provider-specific ID or code for the tag value (e.g. QBO Class.Id, Xero TrackingCategory OptionID). */
  value_id: string;
  /** Optional display label — helps preview UI when provider ID isn't human-readable. */
  value_label?: string;
};

export type JournalEntryLineInput = {
  /** Provider's account identifier — QBO Account.Id, Xero AccountCode, NS acctnumber, etc. */
  account_id: string;
  /** ALWAYS positive. Adapters convert to signed form per provider convention (Xero flips credit to negative). */
  amount: number;
  side: PostingSide;
  description?: string;
  /** Optional dimensional tags — subject to `capabilities.maxDimensionsPerLine`. */
  dimensions?: DimensionTag[];
  /** For providers with per-line currency (QBO doesn't, Xero currency support pending Wave 0.5). */
  currency?: string;
  /** Optional customer/contact link. */
  customer_id?: string;
};

export type JournalEntryInput = {
  transaction_date: string; // ISO YYYY-MM-DD
  narration?: string;
  private_note?: string;
  currency?: string; // Header-level currency; adapters ignore if provider doesn't support header-level
  lines: JournalEntryLineInput[];
};

export type JournalEntryResult =
  | { status: "posted"; submission_id: string; provider_je_id: string; posted_at: string }
  | { status: "rejected"; submission_id: string; reason: string; details?: unknown; missingCapability?: string }
  | { status: "failed"; submission_id: string; error: string; retryable: boolean };

export type PreflightResult = {
  canWrite: boolean;
  reasons: string[]; // empty if canWrite=true
  /** Preflight-specific hints for UI (e.g. "reconnect QuickBooks", "select tenant"). */
  actionRequired?: "reconnect" | "select_tenant" | "upgrade_edition" | "unlock_period" | "none";
};

export type HealthCheckResult = {
  healthy: boolean;
  tokenValid: boolean;
  rateLimitedUntil?: string; // ISO
  tenantResolvable: boolean;
  message?: string;
};

export type VoidResult =
  | { status: "voided"; provider_je_id: string; voided_at: string }
  | { status: "failed"; error: string; retryable: boolean };

export type JournalEntryDetail = {
  provider_je_id: string;
  transaction_date: string;
  narration?: string;
  lines: JournalEntryLineInput[];
  posted_at: string;
  currency?: string;
};

// === WBP W0: Capability declaration per provider ===
// Every field must be populated; consumer code branches on capabilities, NEVER on providerId.

export type ProviderCapabilities = {
  /** Header-level currency on the JE (QBO=false, Xero=pending W0.5 sandbox). */
  supportsHeaderLevelCurrency: boolean;
  /** Per-line currency (some providers derive from account context only). */
  supportsPerLineCurrency: boolean;
  /** Provider natively enforces idempotency (NS externalId=true; QBO/Xero=false; MUST use pulse_je_submissions ledger). */
  nativeIdempotency: boolean;
  /** Caller supplies currency (false = derived from subsidiary/account per NS). */
  callerSuppliesCurrency: boolean;
  /** Journal template row must be created before line posts (BC=true, all others=false). */
  singleCallJournalEntry: boolean;
  /** Subsidiary is a required WriteContext field (NS multi-subsidiary orgs). */
  requiresSubsidiaryId: boolean;
  /** Journal batch created BEFORE line posts (BC=true — special multi-call). */
  requiresJournalBatch: boolean;
  /** Cap on dimensions per line (QBO=2 [class+dept], Xero=2 [tracking categories]). */
  maxDimensionsPerLine: number;
  /** Dimensions defined per customer (Sage Intacct=true; adapter must probe). */
  dimensionsAreDynamicPerCustomer: boolean;
  /** Account types the provider forbids on JE lines (e.g. Xero forbids AR/AP/RetainedEarnings/Bank). */
  forbiddenAccountTypes: readonly string[];
  /** Rate limiting model — informs adapter's rate limiter shape. */
  rateLimitModel: "rpm_per_tenant" | "rpm_per_realm" | "concurrency_pool" | "soft_dynamic";
  /** Sign convention on the wire: signed=Xero-style, discriminated=QBO/NS-style (Debit/Credit column). */
  signConvention: "signed_amount" | "discriminated_side";
  /** Provider offers a distinct reversal-date field (Sage Intacct only, so far). */
  supportsDistinctReversalDate: boolean;
};

// === WBP W0: The contract every adapter must satisfy ===
export interface AccountingWriteProvider {
  readonly providerId: AccountingProviderId;
  readonly capabilities: ProviderCapabilities;

  /** Post a JE. Idempotent via ctx.idempotency_key + pulse_je_submissions UNIQUE. */
  postJournalEntry(ctx: WriteContext, entry: JournalEntryInput): Promise<JournalEntryResult>;

  /** Reverse a previously-posted JE via provider-native means. */
  voidJournalEntry(ctx: WriteContext, providerJeId: string, reason: string): Promise<VoidResult>;

  /** Fetch a JE for tie-out verification (W4). */
  getJournalEntry(ctx: WriteContext, providerJeId: string): Promise<JournalEntryDetail | null>;

  /** Cheap gate — is the provider currently writable for this connection? */
  preflight(ctx: WriteContext, entry: JournalEntryInput): Promise<PreflightResult>;

  /** Lightweight health probe (token, tenant, rate-limit). */
  checkHealth(ctx: WriteContext): Promise<HealthCheckResult>;
}

// === D2: Safe JE Posting ===

export type JELine = {
  account_id: string; // QBO Account.Id
  amount: number; // positive number
  posting_type: "Debit" | "Credit";
  description?: string;
  customer_id?: string; // QBO Customer.Id
  class_id?: string; // QBO Class.Id
  department_id?: string; // QBO Department.Id
};

export type JEPayload = {
  transaction_date: string; // ISO date YYYY-MM-DD
  narration?: string;
  private_note?: string;
  lines: JELine[];
  currency?: string; // default 'USD'
};

export type JEPostRequest = {
  firm_client_id: string;
  idempotency_key: string;
  source_type: "rule" | "anomaly" | "flux" | "manual" | "reversal" | "recurring";
  source_id?: string;
  posted_by: "ai" | "human";
  posted_by_user_id?: string;
  payload: JEPayload;
  composition?: import("@/lib/je-evidence/types").JeCompositionResult;
  /**
   * ISA 315 assertion IDs this JE addresses at post time.
   * When source_type='rule' and this is omitted, the poster will resolve via
   * curated_rule_fires + rule_assertion_coverage using source_id as fire_id.
   * When empty [], no assertions are propagated (manual JEs, reversals).
   */
  assertions_addressed?: string[];
  /**
   * PCAOB AS 1105 ¶.10A (2025) reliability basis. Required by DB CHECK
   * whenever assertions_addressed is non-empty at post time.
   */
  data_source_reliability_basis?: DataSourceReliabilityBasis;
};

export type DataSourceReliabilityBasis =
  | "qbo_api_authenticated"
  | "bank_feed_ocr"
  | "plaid_direct"
  | "manual_document_upload"
  | "inbound_email_parsed"
  | "rule_synthesized_from_qbo_ledger"
  | "user_conversational_correction";

export const DATA_SOURCE_RELIABILITY_BASES: readonly DataSourceReliabilityBasis[] = [
  "qbo_api_authenticated",
  "bank_feed_ocr",
  "plaid_direct",
  "manual_document_upload",
  "inbound_email_parsed",
  "rule_synthesized_from_qbo_ledger",
  "user_conversational_correction",
] as const;

export type JEPostResult =
  | { status: "posted"; attempt_id: string; qbo_je_id: string }
  | {
      status: "rejected";
      attempt_id: string;
      reason: string;
      details?: unknown;
      /** Phase Q7 — present when reason is edition_missing_capability */
      missingCapability?: string;
      edition?: string | null;
      subscriptionStatus?: string;
    }
  | { status: "failed"; attempt_id: string; error: string; retryable: boolean };

export interface IJournalEntryPoster {
  post(request: JEPostRequest): Promise<JEPostResult>;
  reverse(attemptId: string, reason: string, actorUserId: string): Promise<JEPostResult>;
}
