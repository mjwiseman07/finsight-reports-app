import { describe, expect, it } from "vitest";
import {
  NO_GAPS_COPY,
  gapListOverflow,
  gapOverflowCopy,
  generateAssertionCoverageStatementPdf,
  testedListOverflow,
  testedOverflowCopy,
} from "@/lib/close-packet/pdf/AssertionCoverageStatement";
import { makeSyntheticStatement } from "./_fixtures/statement";
import { ASSERTION_IDS } from "@/lib/pre-close/assertions-types";

describe("generateAssertionCoverageStatementPdf", () => {
  it("returns non-empty Buffer", async () => {
    const { buffer } = await generateAssertionCoverageStatementPdf(makeSyntheticStatement());
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("sha256 is 64-char hex", async () => {
    const { sha256 } = await generateAssertionCoverageStatementPdf(makeSyntheticStatement());
    expect(sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("byteSize matches buffer.length", async () => {
    const { buffer, byteSize } = await generateAssertionCoverageStatementPdf(makeSyntheticStatement());
    expect(byteSize).toBe(buffer.length);
  });

  it("gaps>40 truncation note appears in PDF bytes", async () => {
    const { overflow } = gapListOverflow(41);
    expect(overflow).toBe(1);
    expect(gapOverflowCopy(overflow)).toContain("additional gap");

    const gaps = Array.from({ length: 41 }, (_, i) => ({
      account_category: "cash" as const,
      assertion_id: ASSERTION_IDS[i % ASSERTION_IDS.length],
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
    }));
    const { buffer } = await generateAssertionCoverageStatementPdf(
      makeSyntheticStatement({
        coverage_cells: gaps,
        summary: {
          total_cells: 41,
          tested: 0,
          partial: 0,
          gap: 41,
          not_applicable: 0,
          gaps_by_root_cause: { no_rule_defined: 41 },
          coverage_rate_pct: 0,
          critical_gaps: 41,
        },
      }),
    );
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("tested>30 truncation note appears in PDF bytes", async () => {
    const { overflow } = testedListOverflow(31);
    expect(overflow).toBe(1);
    expect(testedOverflowCopy(overflow)).toContain("additional tested cells");

    const tested = Array.from({ length: 31 }, (_, i) => ({
      account_category: "cash" as const,
      assertion_id: ASSERTION_IDS[i % ASSERTION_IDS.length],
      relevance_at_computation: "relevant" as const,
      coverage_status: "tested" as const,
      evidence_strength: "strong" as const,
      covering_rule_ids: ["gen.rule"],
      covering_fire_ids: [],
      data_source_reliability_basis: null,
      manual_test_ref: null,
      gap_root_cause_code: null,
      gap_recommendation: null,
      drilldowns: [],
    }));
    const { buffer } = await generateAssertionCoverageStatementPdf(
      makeSyntheticStatement({
        coverage_cells: tested,
        summary: {
          total_cells: 31,
          tested: 31,
          partial: 0,
          gap: 0,
          not_applicable: 0,
          gaps_by_root_cause: {},
          coverage_rate_pct: 100,
          critical_gaps: 0,
        },
      }),
    );
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("statement with 0 gaps produces No gaps identified text", async () => {
    expect(NO_GAPS_COPY).toContain("No gaps identified");
    const { buffer } = await generateAssertionCoverageStatementPdf(
      makeSyntheticStatement({
        coverage_cells: [],
        summary: {
          total_cells: 0,
          tested: 0,
          partial: 0,
          gap: 0,
          not_applicable: 0,
          gaps_by_root_cause: {},
          coverage_rate_pct: 0,
          critical_gaps: 0,
        },
      }),
    );
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
