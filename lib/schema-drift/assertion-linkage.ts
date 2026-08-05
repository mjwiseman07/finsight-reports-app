/**
 * MAJOR #2 — Assertion linkage for schema drift signatures.
 *
 * Given a drift signature, returns the assertion IDs (from public.assertions_catalog:
 * accuracy, classification, completeness, cutoff, existence_occurrence,
 * presentation_disclosure, rights_obligations, valuation_allocation) whose evidence
 * flow depends on the missing schema element.
 *
 * The linkage table is intentionally coarse — a schema-drift event that we can't
 * confidently link to a specific assertion set falls back to a full-coverage
 * degradation (all 8 assertions). Better to over-flag one org-wide drift issue
 * than to silently drop assertion evidence quality.
 *
 * Refinement is expected: as we learn which columns/tables drive which assertions,
 * we add explicit rows to TABLE_ASSERTION_MAP. This module is deliberately data,
 * not logic — auditors can review the linkage table itself.
 */

export type AssertionId =
  | "accuracy"
  | "classification"
  | "completeness"
  | "cutoff"
  | "existence_occurrence"
  | "presentation_disclosure"
  | "rights_obligations"
  | "valuation_allocation";

export const ALL_ASSERTIONS: readonly AssertionId[] = [
  "accuracy",
  "classification",
  "completeness",
  "cutoff",
  "existence_occurrence",
  "presentation_disclosure",
  "rights_obligations",
  "valuation_allocation",
] as const;

// Assertion impact when a specific TABLE is affected by drift. Keys are
// unqualified table names as they appear in queries. Missing → fallback to
// ALL_ASSERTIONS (see resolveAssertionImpact below).
export const TABLE_ASSERTION_MAP: Readonly<Record<string, readonly AssertionId[]>> = {
  // Journal/GL tables drive accuracy, existence, cutoff, classification.
  qbo_journal_entries: ["accuracy", "existence_occurrence", "cutoff", "classification"],
  qbo_transactions: ["accuracy", "existence_occurrence", "cutoff", "classification"],
  qbo_general_ledger: ["accuracy", "existence_occurrence", "cutoff", "classification", "completeness"],
  // Balance-sheet reconciliation tables drive completeness, valuation, existence.
  bs_recon_summary: ["completeness", "valuation_allocation", "existence_occurrence"],
  balance_sheet_periods: ["completeness", "valuation_allocation"],
  // AP/AR + vendor/customer tables drive rights_obligations + valuation.
  qbo_bills: ["existence_occurrence", "rights_obligations", "valuation_allocation", "cutoff"],
  qbo_invoices: ["existence_occurrence", "rights_obligations", "valuation_allocation", "cutoff"],
  qbo_vendors: ["rights_obligations", "existence_occurrence"],
  qbo_customers: ["rights_obligations", "existence_occurrence"],
  // Close-period tables drive presentation + cutoff.
  close_periods: ["cutoff", "presentation_disclosure"],
  close_packets: ["presentation_disclosure", "completeness"],
  // Assertion coverage tables — drift here degrades ALL assertions (self-referential).
  assertions_catalog: ALL_ASSERTIONS,
  assertion_relevance_matrix: ALL_ASSERTIONS,
  rule_assertion_coverage: ALL_ASSERTIONS,
  // Users/auth/RLS drift is org-wide → all assertions (evidence chain of custody).
  users: ALL_ASSERTIONS,
  company_users: ALL_ASSERTIONS,
  firm_memberships: ALL_ASSERTIONS,
  // Lifecycle issues drift is self-referential → all assertions.
  lifecycle_issues: ALL_ASSERTIONS,
};

/** Resolve the assertion impact set for a given drift table (or unknown table). */
export function resolveAssertionImpact(table: string | undefined): readonly AssertionId[] {
  if (!table) return ALL_ASSERTIONS;
  const mapped = TABLE_ASSERTION_MAP[table];
  return mapped ?? ALL_ASSERTIONS;
}
