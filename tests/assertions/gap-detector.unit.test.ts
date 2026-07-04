import { describe, expect, it } from "vitest";
import { detectGaps } from "@/lib/assertions/gap-detector";
import type { ProjectedCoverageRow } from "@/lib/pre-close/assertions-coverage-types";

function row(
  partial: Partial<ProjectedCoverageRow> & Pick<ProjectedCoverageRow, "account_category" | "assertion_id">,
): ProjectedCoverageRow {
  return {
    relevance_at_computation: "relevant",
    coverage_status: "gap",
    covering_rule_ids: [],
    covering_fire_ids: [],
    evidence_strength: "unassessed",
    gap_root_cause_code: "no_rule_defined",
    ...partial,
  };
}

describe("detectGaps", () => {
  it("returns empty array when no gaps", () => {
    const gaps = detectGaps([
      row({
        account_category: "cash",
        assertion_id: "accuracy",
        coverage_status: "tested",
        evidence_strength: "strong",
        gap_root_cause_code: null,
      }),
    ]);
    expect(gaps).toEqual([]);
  });

  it("enumerates all gap rows", () => {
    const gaps = detectGaps([
      row({ account_category: "cash", assertion_id: "accuracy", gap_root_cause_code: "no_rule_defined" }),
      row({
        account_category: "revenue",
        assertion_id: "completeness",
        gap_root_cause_code: "rule_defined_but_not_fired",
      }),
      row({
        account_category: "inventory",
        assertion_id: "existence_occurrence",
        coverage_status: "tested",
        gap_root_cause_code: null,
      }),
    ]);
    expect(gaps).toHaveLength(2);
    expect(gaps[0].root_cause_code).toBe("no_rule_defined");
    expect(gaps[1].root_cause_code).toBe("rule_defined_but_not_fired");
  });

  it("N/A rows never appear as gaps", () => {
    const gaps = detectGaps([
      row({
        account_category: "cash",
        assertion_id: "accuracy",
        coverage_status: "not_applicable",
        relevance_at_computation: "not_applicable",
        gap_root_cause_code: null,
      }),
    ]);
    expect(gaps).toEqual([]);
  });

  it("partial rows never appear as gaps", () => {
    const gaps = detectGaps([
      row({
        account_category: "cash",
        assertion_id: "accuracy",
        coverage_status: "partial",
        evidence_strength: "moderate",
        gap_root_cause_code: "coverage_partial_by_design",
      }),
    ]);
    expect(gaps).toEqual([]);
  });

  it("skips gap rows without root_cause_code", () => {
    const gaps = detectGaps([
      row({
        account_category: "cash",
        assertion_id: "accuracy",
        coverage_status: "gap",
        gap_root_cause_code: null,
      }),
    ]);
    expect(gaps).toEqual([]);
  });

  it("preserves account_category and assertion_id", () => {
    const gaps = detectGaps([
      row({
        account_category: "accounts_receivable",
        assertion_id: "valuation_allocation",
        gap_root_cause_code: "rule_errored",
      }),
    ]);
    expect(gaps[0]).toEqual({
      account_category: "accounts_receivable",
      assertion_id: "valuation_allocation",
      root_cause_code: "rule_errored",
    });
  });
});
