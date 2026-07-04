import type { AssertionCoverageStatement, GapRootCauseEntry } from "@/lib/pre-close/assertion-coverage-statement-types";
import { ATTESTATION_FOOTER } from "@/lib/pre-close/assertion-coverage-statement-types";
import { ASSERTION_IDS, ACCOUNT_CATEGORIES } from "@/lib/pre-close/assertions-types";

export const CATALOG_FIXTURE = ASSERTION_IDS.map((id) => ({
  assertion_id: id,
  display_name: id.replace(/_/g, " "),
  isa_315_label: id,
  authoritative_citation: "ISA 315 (Revised 2019) ¶A190; PCAOB AS 1105",
  description: `Description for ${id}`,
}));

export const ROOT_CAUSES_FIXTURE = [
  {
    root_cause_code: "no_rule_defined",
    display_name: "No rule defined",
    description: "d",
    pcaob_reference: "PCAOB QC 1000 §.15",
  },
  {
    root_cause_code: "rule_defined_but_not_fired",
    display_name: "Rule not fired",
    description: "d",
    pcaob_reference: "PCAOB QC 1000 §.15",
  },
];

export function coverageRow(
  account_category: string,
  assertion_id: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    close_period_id: "cp1",
    firm_client_id: "fc1",
    account_category,
    assertion_id,
    relevance_at_computation: "relevant",
    coverage_status: "gap",
    evidence_strength: "unassessed",
    covering_rule_ids: [],
    covering_fire_ids: [],
    data_source_reliability_basis: null,
    manual_test_ref: null,
    gap_root_cause_code: "no_rule_defined",
    gap_recommendation: null,
    ...overrides,
  };
}

export function makeSyntheticStatement(
  overrides: Partial<AssertionCoverageStatement> = {},
): AssertionCoverageStatement {
  const cells = ACCOUNT_CATEGORIES.flatMap((cat) =>
    ASSERTION_IDS.map((a) => ({
      account_category: cat,
      assertion_id: a,
      relevance_at_computation: "relevant" as const,
      coverage_status: "gap" as const,
      evidence_strength: "unassessed" as const,
      covering_rule_ids: [],
      covering_fire_ids: [],
      data_source_reliability_basis: null,
      manual_test_ref: null,
      gap_root_cause_code: "no_rule_defined" as const,
      gap_recommendation: null,
      drilldowns: [],
    })),
  );
  return {
    version: 1,
    content_type: "assertion_coverage_statement",
    isa_315_baseline_version: "ISA 315 (Revised 2019)",
    generated_at: "2026-07-01T00:00:00.000Z",
    firm_client: {
      id: "fc1",
      name: "Test Client",
      industry_vertical: "general",
      accounting_method: "accrual",
      is_demo: false,
    },
    close_period: {
      id: "cp1",
      period_start: "2026-06-01",
      period_end: "2026-06-30",
      status: "prep",
    },
    assertions_catalog: CATALOG_FIXTURE.map((c) => ({
      assertion_id: c.assertion_id,
      display_name: c.display_name,
      isa_315_reference: c.authoritative_citation,
      pcaob_reference: "PCAOB AS 1105",
      description: c.description,
    })),
    gap_root_causes: ROOT_CAUSES_FIXTURE as GapRootCauseEntry[],
    coverage_cells: cells,
    summary: {
      total_cells: cells.length,
      tested: 0,
      partial: 0,
      gap: cells.length,
      not_applicable: 0,
      gaps_by_root_cause: { no_rule_defined: cells.length },
      coverage_rate_pct: 0,
      critical_gaps: cells.length,
    },
    attestation_footer: ATTESTATION_FOOTER,
    ...overrides,
  };
}
