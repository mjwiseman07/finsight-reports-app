import { describe, expect, it } from "vitest";
import {
  ACCOUNT_CATEGORY_SET,
  ASSERTION_ID_SET,
  EXPECTED_RULE_IDS,
  assertEnumCoverage,
  parseAssertionCatalogSeeds,
  parseRelevanceMatrixSeeds,
  parseRuleCoverageSeeds,
  readMigrationSql,
} from "./_migration-fixture";
import { ASSERTION_IDS } from "@/lib/pre-close/assertions-types";

describe("D-Assertions migration seed validation", () => {
  const sql = readMigrationSql();

  it("migration file exists and contains begin/commit", () => {
    expect(sql).toContain("begin;");
    expect(sql).toContain("commit;");
    expect(sql).toContain("assertions_catalog");
    expect(sql).toContain("rule_assertion_coverage");
  });

  it("assertions_catalog seed has exactly 8 rows", () => {
    const ids = parseAssertionCatalogSeeds(sql);
    expect(ids).toHaveLength(8);
  });

  it("every assertions_catalog assertion_id matches AssertionId enum", () => {
    const ids = parseAssertionCatalogSeeds(sql);
    for (const id of ids) {
      expect(ASSERTION_ID_SET.has(id)).toBe(true);
    }
  });

  it("assertion_relevance_matrix seed has exactly 144 rows (18×8)", () => {
    const rows = parseRelevanceMatrixSeeds(sql);
    expect(rows).toHaveLength(144);
  });

  it("relevance matrix uses only valid account categories and assertion ids", () => {
    const rows = parseRelevanceMatrixSeeds(sql);
    for (const row of rows) {
      expect(ACCOUNT_CATEGORY_SET.has(row.account)).toBe(true);
      expect(ASSERTION_ID_SET.has(row.assertion)).toBe(true);
    }
  });

  it("every rule_assertion_coverage rule_id is one of the 32 known rules", () => {
    const coverage = parseRuleCoverageSeeds(sql);
    const known = new Set(EXPECTED_RULE_IDS);
    const ruleIds = [...new Set(coverage.map((c) => c.rule_id))];
    expect(ruleIds).toHaveLength(32);
    for (const id of ruleIds) {
      expect(known.has(id as (typeof EXPECTED_RULE_IDS)[number])).toBe(true);
    }
  });

  it("every rule has at least one primary coverage row in migration seed", () => {
    const coverage = parseRuleCoverageSeeds(sql);
    for (const ruleId of EXPECTED_RULE_IDS) {
      const primaries = coverage.filter(
        (c) => c.rule_id === ruleId && c.coverage_strength === "primary",
      );
      expect(primaries.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every coverage assertion_id exists in assertions_catalog seed", () => {
    const { catalog, coverage } = assertEnumCoverage();
    const catalogSet = new Set(catalog);
    for (const row of coverage) {
      expect(catalogSet.has(row.assertion_id)).toBe(true);
    }
  });

  it("every account_categories element in coverage is a valid enum value", () => {
    const coverage = parseRuleCoverageSeeds(sql);
    for (const row of coverage) {
      for (const cat of row.account_categories) {
        expect(ACCOUNT_CATEGORY_SET.has(cat)).toBe(true);
      }
    }
  });

  it("constraint widening includes assertion_coverage_scan categories", () => {
    expect(sql).toContain("assertion_coverage_scan");
    expect(sql).toContain("assertion_gap_reasoning");
  });

  it("relevance matrix covers every account category × assertion pair once", () => {
    const rows = parseRelevanceMatrixSeeds(sql);
    const pairs = new Set(rows.map((r) => `${r.account}:${r.assertion}`));
    expect(pairs.size).toBe(144);
    expect(rows.length).toBe(144);
  });

  it("coverage seed has no orphan rule ids outside the 32-rule registry list", () => {
    const coverage = parseRuleCoverageSeeds(sql);
    const known = new Set(EXPECTED_RULE_IDS);
    for (const row of coverage) {
      expect(known.has(row.rule_id as (typeof EXPECTED_RULE_IDS)[number])).toBe(true);
    }
  });

  it("assertions_catalog seed ids match ASSERTION_IDS constant ordering subset", () => {
    const ids = parseAssertionCatalogSeeds(sql).sort();
    const expected = [...ASSERTION_ID_SET].sort();
    expect(ids).toEqual(expected);
  });
});
