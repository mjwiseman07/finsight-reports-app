import type { ProviderCapabilities } from "../types";

/**
 * QBO capability declaration. Sourced from WBP_Provider_Research.md §9.
 * Any change here must be reflected in the parity test suite (W5).
 */
export const QBO_CAPABILITIES: ProviderCapabilities = {
  supportsHeaderLevelCurrency: false, // QBO derives from company setting
  supportsPerLineCurrency: true, // Multi-currency QBO orgs, per-line
  nativeIdempotency: false, // No RequestId equivalent on JE
  callerSuppliesCurrency: true, // Caller specifies per-line currency
  singleCallJournalEntry: true,
  requiresSubsidiaryId: false, // NS-only
  requiresJournalBatch: false, // BC-only
  maxDimensionsPerLine: 2, // Class + Department
  dimensionsAreDynamicPerCustomer: false, // Fixed taxonomy (Class, Dept, Location)
  forbiddenAccountTypes: [], // QBO allows all account types on JE
  rateLimitModel: "rpm_per_realm", // ~500 RPM/realm empirical
  signConvention: "discriminated_side", // Debit/Credit column on line
  supportsDistinctReversalDate: false,
} as const;
