/**
 * MAJOR #2.3 Block A.1 — Assertion linkage for schema drift signatures.
 *
 * Research-grounded rewrite. See research/schema_drift_assertion_mapping_research.md
 * for the full audit-literature review. Key findings applied here:
 *
 * 1. The ALL_ASSERTIONS fallback (pre-A.1) is NOT defensible under ISA 315 Para. A150:
 *    "A general IT control alone is typically not sufficient to address a risk of
 *    material misstatement at the assertion level." Auto-tagging all 8 assertions
 *    from a schema-drift signal alone claims exactly what the standard prohibits.
 *
 * 2. Only Completeness and Accuracy have direct textual grounding across all six
 *    schema-drift signatures (ISA 315 Para 12(d)/(i) definition of information
 *    integrity = completeness + accuracy + validity). Cutoff, Rights & Obligations,
 *    Classification, and Presentation & Disclosure have zero cited support in ISA
 *    315, PCAOB AS 2110, SAS 145, KPMG ICFR Handbook, or peer-reviewed literature
 *    (Li 2012, Haislip 2016, Mojtahedi & Zhou 2024, Sexton 2021) for schema-drift
 *    events specifically.
 *
 * 3. Materiality/relevance gate is required per ISA 315 Appendix 5 §19 and KPMG
 *    Q3.4.20 — assertion risk only attaches to tables that feed financially-
 *    relevant accounts.
 *
 * The function now returns a ContingentAssertionRiskIndicator carrying:
 *   - `assertion_impact` — array of assertion IDs the drift MAY indicate risk for
 *   - `assertion_confidence` — grounded | framework_definition | judgment_required | unknown
 *   - `financial_reporting_relevance` — in_scope | out_of_scope | unknown
 *   - `mapping_source` — short citation reference for Block B footnotes
 *
 * Semantic reframe: output is a CONTINGENT RISK INDICATOR, not a deterministic
 * assertion determination. Downstream code and UI must present it as such,
 * consistent with ISA 315's requirement that assertion-level determination
 * requires professional judgment about the specific account/disclosure,
 * materiality, and reliance.
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

export type AssertionConfidence =
  | "grounded"
  | "framework_definition"
  | "judgment_required"
  | "unknown";

export type FinancialReportingRelevance =
  | "in_scope"
  | "out_of_scope"
  | "unknown";

export type MappingSource =
  | "ISA_315_12_d_i" // Framework definition of information integrity
  | "ISA_315_A190_a_iii" // Accuracy assertion textual match
  | "ISA_315_A190_a_ii" // Completeness assertion textual match
  | "COBIT_MANAGED_DATA" // COBIT 2019 "Managed Data" objective — closest crosswalk
  | "KPMG_Q6_4_110" // KPMG ICFR Handbook data integrity risk framing
  | "framework_definition_fallback" // ISA 315 12(d) integrity = completeness + accuracy
  | "judgment_required_marker"; // Table known but linkage requires auditor judgment

export interface ContingentAssertionRiskIndicator {
  readonly assertion_impact: readonly AssertionId[];
  readonly assertion_confidence: AssertionConfidence;
  readonly financial_reporting_relevance: FinancialReportingRelevance;
  readonly mapping_source: MappingSource;
}

// Framework-definition minimum: ISA 315 Para 12(d)/(i) — information integrity =
// completeness + accuracy + validity. We treat completeness + accuracy as the
// literature-grounded core; validity is handled per-table because "validity" in
// ISA 315's usage maps to occurrence/existence contextually, not universally.
const FRAMEWORK_DEFINITION_MINIMUM: readonly AssertionId[] = ["completeness", "accuracy"] as const;

interface TableMapping {
  readonly assertion_impact: readonly AssertionId[];
  readonly assertion_confidence: AssertionConfidence;
  readonly financial_reporting_relevance: FinancialReportingRelevance;
  readonly mapping_source: MappingSource;
}

// Per-table mappings, restricted to what the research supports.
// See research/schema_drift_assertion_mapping_research.md §7 for the
// signature-by-signature grounding table.
const TABLE_MAPPING: Readonly<Record<string, TableMapping>> = {
  // Journal/GL — completeness + accuracy + existence/occurrence grounded in
  // ISA 315 A190(a)(i)(ii)(iii). Cutoff/classification stripped: they emerge
  // from period-end business logic, not database schema.
  qbo_journal_entries: {
    assertion_impact: ["completeness", "accuracy", "existence_occurrence"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "ISA_315_A190_a_iii",
  },
  qbo_transactions: {
    assertion_impact: ["completeness", "accuracy", "existence_occurrence"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "ISA_315_A190_a_iii",
  },
  qbo_general_ledger: {
    assertion_impact: ["completeness", "accuracy", "existence_occurrence"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "ISA_315_A190_a_iii",
  },
  // Balance-sheet reconciliation — completeness + existence grounded.
  // Valuation & allocation removed (research §7: supported only for type-change
  // signatures, requires signature-specific dispatch — v2 refinement).
  bs_recon_summary: {
    assertion_impact: ["completeness", "accuracy", "existence_occurrence"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "COBIT_MANAGED_DATA",
  },
  balance_sheet_periods: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "COBIT_MANAGED_DATA",
  },
  // AP/AR + vendor/customer — existence + completeness + accuracy.
  // Rights & obligations REMOVED — research §7 finds ZERO cited support for
  // R&O attaching to a schema-drift signal alone.
  qbo_bills: {
    assertion_impact: ["existence_occurrence", "completeness", "accuracy"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "ISA_315_A190_a_iii",
  },
  qbo_invoices: {
    assertion_impact: ["existence_occurrence", "completeness", "accuracy"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "ISA_315_A190_a_iii",
  },
  qbo_vendors: {
    assertion_impact: ["existence_occurrence", "completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "judgment_required_marker",
  },
  qbo_customers: {
    assertion_impact: ["existence_occurrence", "completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "judgment_required_marker",
  },
  // Close periods — completeness + accuracy only. Cutoff removed per research.
  close_periods: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "judgment_required_marker",
  },
  close_packets: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "judgment_required_marker",
  },
  // Assertion-catalog tables — completeness + accuracy with judgment_required.
  // Self-referential drift here means the mapping itself may be affected;
  // full-coverage claim requires manual review, not automatic ALL_ASSERTIONS.
  assertions_catalog: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "judgment_required_marker",
  },
  assertion_relevance_matrix: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "judgment_required_marker",
  },
  rule_assertion_coverage: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "judgment_required_marker",
  },
  // Auth/RLS tables — completeness + accuracy with judgment_required.
  // Research finding: auth drift can implicate ALL assertions ONLY through
  // the specific account/process affected — no source supports blanket
  // ALL_ASSERTIONS from auth drift on its own.
  users: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "KPMG_Q6_4_110",
  },
  company_users: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "KPMG_Q6_4_110",
  },
  firm_memberships: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "KPMG_Q6_4_110",
  },
  // Ledger event sourcing — grounded via completeness + accuracy.
  ledger_events: {
    assertion_impact: ["completeness", "accuracy", "existence_occurrence"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "COBIT_MANAGED_DATA",
  },
  // Payments processing — grounded via completeness + accuracy.
  payment_batches: {
    assertion_impact: ["completeness", "accuracy", "existence_occurrence"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "ISA_315_A190_a_iii",
  },
  payment_batch_lines: {
    assertion_impact: ["completeness", "accuracy", "existence_occurrence"],
    assertion_confidence: "grounded",
    financial_reporting_relevance: "in_scope",
    mapping_source: "ISA_315_A190_a_iii",
  },
  // Refund requests — feeds revenue recognition. Judgment_required because
  // refund reversal timing depends on business logic.
  refund_requests: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "judgment_required_marker",
  },
  // Self-referential — the memory substrate itself.
  lifecycle_issues: {
    assertion_impact: ["completeness", "accuracy"],
    assertion_confidence: "judgment_required",
    financial_reporting_relevance: "in_scope",
    mapping_source: "judgment_required_marker",
  },
};

/**
 * Resolve the contingent assertion risk indicator for a given drift table.
 *
 * Returns a full ContingentAssertionRiskIndicator carrying the assertion
 * impact set, confidence tag, financial reporting relevance, and mapping
 * source citation.
 *
 * For unknown tables: returns Completeness + Accuracy per ISA 315 12(d)/(i)
 * framework definition of information integrity, with confidence set to
 * "framework_definition" and financial_reporting_relevance set to "unknown"
 * (the safest default — assertion risk is contingent on downstream FR use).
 */
export function resolveAssertionImpact(table: string | undefined): ContingentAssertionRiskIndicator {
  if (!table || table.trim().length === 0) {
    return {
      assertion_impact: FRAMEWORK_DEFINITION_MINIMUM,
      assertion_confidence: "framework_definition",
      financial_reporting_relevance: "unknown",
      mapping_source: "framework_definition_fallback",
    };
  }

  const mapped = TABLE_MAPPING[table];
  if (mapped) {
    return mapped;
  }

  // Table not in the allowlist — fall back to framework definition.
  return {
    assertion_impact: FRAMEWORK_DEFINITION_MINIMUM,
    assertion_confidence: "framework_definition",
    financial_reporting_relevance: "unknown",
    mapping_source: "framework_definition_fallback",
  };
}

/**
 * Legacy shape support — the pre-A.1 signature returned only readonly AssertionId[].
 * The trigger and detector routes may still call the legacy shape until callers are
 * migrated. This helper returns just the assertion_impact array for backward
 * compatibility. Callers should migrate to resolveAssertionImpact() proper.
 *
 * @deprecated Use resolveAssertionImpact() which returns the full contingent
 * risk indicator. This function is retained only for callers not yet migrated
 * to the new shape.
 */
export function resolveAssertionImpactLegacy(table: string | undefined): readonly AssertionId[] {
  return resolveAssertionImpact(table).assertion_impact;
}

// Exported for tests and Block B UI copy.
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
