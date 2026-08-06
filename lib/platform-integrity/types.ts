/**
 * MAJOR #2.3 Block B.1 — shared types for Platform Integrity surface.
 * Server (API route) and client (React components) both import from here.
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
  | "ISA_315_A190_a_iii"
  | "ISA_315_A190_a_ii"
  | "ISA_315_12_d_i"
  | "COBIT_MANAGED_DATA"
  | "KPMG_Q6_4_110"
  | "judgment_required_marker"
  | "framework_definition_fallback";

/**
 * A single Platform Integrity finding as returned by the API.
 * Mirrors v_platform_integrity_current one-for-one, plus a client-friendly
 * citation object resolved server-side from mapping_source.
 */
export interface PlatformIntegrityFinding {
  readonly id: string;
  readonly detected_at: string; // ISO 8601
  readonly fingerprint: string;
  readonly issue_kind: string;
  readonly level: string;
  readonly firm_id: string | null;
  readonly company_id: string | null;
  readonly drift_table: string | null;
  readonly drift_column: string | null;
  readonly drift_reason: string | null;
  readonly assertion_impact: readonly AssertionId[];
  readonly assertion_confidence: AssertionConfidence;
  readonly financial_reporting_relevance: FinancialReportingRelevance;
  readonly mapping_source: MappingSource;
  readonly detector_version: string | null;
  readonly citation: Citation;
}

export interface Citation {
  readonly source_key: MappingSource;
  readonly label: string;
  readonly url: string;
  readonly note: string;
}

export interface ChainStatus {
  readonly chain_intact: boolean;
  readonly chain_gap_count: number;
  readonly latest_seq: number | null;
  readonly latest_event_at: string | null;
}

export interface PlatformIntegrityMethodology {
  readonly headline: string;
  readonly subtitle: string;
  readonly disclosure: string;
  readonly primary_sources: readonly {
    readonly label: string;
    readonly url: string;
  }[];
}

export interface PlatformIntegrityResponse {
  readonly findings: readonly PlatformIntegrityFinding[];
  readonly chain: ChainStatus;
  readonly methodology: PlatformIntegrityMethodology;
  readonly detector_next_run_hint: string;
  readonly generated_at: string;
}
