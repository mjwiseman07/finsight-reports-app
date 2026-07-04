/**
 * D-Assertions Part 3 — Coverage Statement content-json types.
 */
import type { AssertionId, AccountCategory } from "./assertions-types";
import type {
  CoverageStatus,
  EvidenceStrength,
  RootCauseCode,
  RelevanceLevel,
} from "./assertions-coverage-types";

export interface AssertionCatalogEntry {
  assertion_id: AssertionId;
  display_name: string;
  isa_315_reference: string;
  pcaob_reference: string | null;
  description: string;
}

export interface GapRootCauseEntry {
  root_cause_code: RootCauseCode;
  display_name: string;
  description: string;
  pcaob_reference: string;
}

export interface CoverageCellDrilldown {
  fire_id: string;
  rule_id: string;
  rule_version: number;
  fired_at: string;
  outcome: string;
  review_item_id: string | null;
  review_item_decision: string | null;
}

export interface CoverageCell {
  account_category: AccountCategory;
  assertion_id: AssertionId;
  relevance_at_computation: RelevanceLevel;
  coverage_status: CoverageStatus;
  evidence_strength: EvidenceStrength;
  covering_rule_ids: string[];
  covering_fire_ids: string[];
  data_source_reliability_basis: string | null;
  manual_test_ref: string | null;
  gap_root_cause_code: RootCauseCode | null;
  gap_recommendation: string | null;
  drilldowns: CoverageCellDrilldown[];
}

export interface CoverageStatementSummary {
  total_cells: number;
  tested: number;
  partial: number;
  gap: number;
  not_applicable: number;
  gaps_by_root_cause: Record<string, number>;
  coverage_rate_pct: number;
  critical_gaps: number;
}

export interface AssertionCoverageStatement {
  version: 1;
  content_type: "assertion_coverage_statement";
  isa_315_baseline_version: string;
  generated_at: string;
  firm_client: {
    id: string;
    name: string | null;
    industry_vertical: string | null;
    accounting_method: string | null;
    is_demo: boolean;
  };
  close_period: {
    id: string;
    period_start: string;
    period_end: string;
    status: string | null;
  };
  assertions_catalog: AssertionCatalogEntry[];
  gap_root_causes: GapRootCauseEntry[];
  coverage_cells: CoverageCell[];
  summary: CoverageStatementSummary;
  attestation_footer: {
    isa_315_citation: string;
    pcaob_as_2301_citation: string;
    pcaob_as_1105_citation: string;
    pcaob_qc_1000_citation: string;
    disclaimer: string;
  };
}

export const ATTESTATION_FOOTER = {
  isa_315_citation:
    "This Coverage Statement documents assertion-level risk coverage per ISA 315 (Revised 2019) ¶A128 and the ISA 315 IT-Environment appendices.",
  pcaob_as_2301_citation:
    "Coverage designations against relevant assertions align with PCAOB AS 2301 ¶08 (The Auditor's Responses to the Risks of Material Misstatement).",
  pcaob_as_1105_citation:
    "Evidence drill-downs preserve provenance of the underlying electronic information consistent with PCAOB AS 1105 ¶.10A (as amended 2025, technology-assisted analysis reliability).",
  pcaob_qc_1000_citation:
    "Identified gaps carry a root-cause classification consistent with PCAOB QC 1000 §.15 (root-cause analysis of quality deficiencies).",
  disclaimer:
    "This Coverage Statement is a management-produced artifact of Advisacor's automated close-review controls. It supplements, but does not substitute for, an external auditor's independent assessment of assertion-level risk.",
};
