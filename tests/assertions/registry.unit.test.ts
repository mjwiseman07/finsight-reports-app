import { describe, expect, it } from "vitest";
import {
  assertionsForRule,
  isAssertionRelevant,
  type RuleAssertionCoverageRow,
} from "@/lib/pre-close/assertions-types";
import { unionAssertions } from "@/lib/assertions/registry";

const sampleMatrix = [
  { account_category: "cash" as const, assertion_id: "existence_occurrence" as const, relevance: "relevant" as const },
  { account_category: "cash" as const, assertion_id: "rights_obligations" as const, relevance: "usually_not_primary" as const },
  { account_category: "revenue" as const, assertion_id: "rights_obligations" as const, relevance: "not_applicable" as const },
];

const sampleCoverage: RuleAssertionCoverageRow[] = [
  {
    coverage_id: "1",
    rule_id: "gen.je_balance_check",
    assertion_id: "accuracy",
    coverage_strength: "primary",
    account_categories: ["revenue"],
    rationale: "r",
    citation: "c",
  },
  {
    coverage_id: "2",
    rule_id: "gen.je_balance_check",
    assertion_id: "completeness",
    coverage_strength: "secondary",
    account_categories: [],
    rationale: "r",
    citation: "c",
  },
  {
    coverage_id: "3",
    rule_id: "gen.subledger_tie_check",
    assertion_id: "completeness",
    coverage_strength: "primary",
    account_categories: ["accounts_receivable"],
    rationale: "r",
    citation: "c",
  },
  {
    coverage_id: "4",
    rule_id: "gen.subledger_tie_check",
    assertion_id: "accuracy",
    coverage_strength: "primary",
    account_categories: ["accounts_payable"],
    rationale: "r",
    citation: "c",
  },
];

describe("isAssertionRelevant", () => {
  it("returns true when relevance is relevant", () => {
    expect(isAssertionRelevant(sampleMatrix, "cash", "existence_occurrence")).toBe(true);
  });

  it("returns false for usually_not_primary", () => {
    expect(isAssertionRelevant(sampleMatrix, "cash", "rights_obligations")).toBe(false);
  });

  it("returns false for not_applicable", () => {
    expect(isAssertionRelevant(sampleMatrix, "revenue", "rights_obligations")).toBe(false);
  });

  it("returns false when pair is missing from matrix", () => {
    expect(isAssertionRelevant(sampleMatrix, "inventory", "cutoff")).toBe(false);
  });

  it("returns false for empty matrix", () => {
    expect(isAssertionRelevant([], "cash", "existence_occurrence")).toBe(false);
  });
});

describe("assertionsForRule", () => {
  it("returns all coverage rows for a rule", () => {
    const rows = assertionsForRule(sampleCoverage, "gen.je_balance_check");
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.assertion).sort()).toEqual(["accuracy", "completeness"]);
  });

  it("preserves coverage strength", () => {
    const rows = assertionsForRule(sampleCoverage, "gen.je_balance_check");
    const accuracy = rows.find((r) => r.assertion === "accuracy");
    expect(accuracy?.strength).toBe("primary");
  });

  it("supports multiple primary assertions on one rule", () => {
    const rows = assertionsForRule(sampleCoverage, "gen.subledger_tie_check");
    const primaries = rows.filter((r) => r.strength === "primary");
    expect(primaries).toHaveLength(2);
    expect(primaries.map((p) => p.assertion).sort()).toEqual(["accuracy", "completeness"]);
  });

  it("returns empty array for unknown rule", () => {
    expect(assertionsForRule(sampleCoverage, "gen.unknown")).toEqual([]);
  });

  it("returns empty array for empty coverage input", () => {
    expect(assertionsForRule([], "gen.je_balance_check")).toEqual([]);
  });
});

describe("unionAssertions", () => {
  it("deduplicates assertion ids", () => {
    const withDup: RuleAssertionCoverageRow[] = [
      ...sampleCoverage,
      {
        coverage_id: "5",
        rule_id: "gen.je_balance_check",
        assertion_id: "accuracy",
        coverage_strength: "partial",
        account_categories: [],
        rationale: "r",
        citation: "c",
      },
    ];
    const set = unionAssertions(withDup.filter((r) => r.rule_id === "gen.je_balance_check"));
    expect(set.size).toBe(2);
    expect([...set].sort()).toEqual(["accuracy", "completeness"]);
  });

  it("returns empty set for empty input", () => {
    expect(unionAssertions([])).toEqual(new Set());
  });
});
