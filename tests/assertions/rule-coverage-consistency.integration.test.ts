import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";
import {
  ACCOUNT_CATEGORY_SET,
  ASSERTION_ID_SET,
  EXPECTED_RULE_IDS,
  parseRuleCoverageSeeds,
  readMigrationSql,
} from "./_migration-fixture";
import { listRuleCoverage } from "@/lib/assertions/registry";

const mock = makeMockDb();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mock,
}));

function seedFromMigration() {
  const coverage = parseRuleCoverageSeeds(readMigrationSql());
  mock.__seed(
    "rule_assertion_coverage",
    coverage.map((row, i) => ({
      coverage_id: `cov-${i}`,
      rule_id: row.rule_id,
      assertion_id: row.assertion_id,
      coverage_strength: row.coverage_strength,
      account_categories: row.account_categories,
      rationale: "r",
      citation: "c",
    })),
  );
  mock.__seed(
    "curated_rules_registry",
    EXPECTED_RULE_IDS.map((rule_id) => ({
      rule_id,
      rule_name: rule_id,
      is_active: true,
      vertical: "general",
    })),
  );
}

beforeEach(() => {
  mock.__reset();
});

describe("rule_assertion_coverage consistency", () => {
  beforeEach(() => seedFromMigration());

  it("has coverage rows for all 32 curated rules", async () => {
    const rows = await listRuleCoverage();
    const covered = new Set(rows.map((r) => r.rule_id));
    for (const ruleId of EXPECTED_RULE_IDS) {
      expect(covered.has(ruleId)).toBe(true);
    }
  });

  it("every coverage row references a valid assertion_id", async () => {
    const rows = await listRuleCoverage();
    for (const row of rows) {
      expect(ASSERTION_ID_SET.has(row.assertion_id)).toBe(true);
    }
  });

  it("every account_categories element is a valid enum", async () => {
    const rows = await listRuleCoverage();
    for (const row of rows) {
      for (const cat of row.account_categories) {
        expect(ACCOUNT_CATEGORY_SET.has(cat)).toBe(true);
      }
    }
  });

  it("every rule has at least one primary tag", async () => {
    const rows = await listRuleCoverage();
    for (const ruleId of EXPECTED_RULE_IDS) {
      const primaries = rows.filter(
        (r) => r.rule_id === ruleId && r.coverage_strength === "primary",
      );
      expect(primaries.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("listRuleCoverage filters by rule_id", async () => {
    const rows = await listRuleCoverage("gen.je_balance_check");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.rule_id === "gen.je_balance_check")).toBe(true);
  });
});

describe("listAssertions registry", () => {
  beforeEach(() => seedFromMigration());

  it("returns rows ordered by assertion_id", async () => {
    const { listAssertions } = await import("@/lib/assertions/registry");
    mock.__seed(
      "assertions_catalog",
      ["cutoff", "accuracy", "completeness"].map((assertion_id) => ({
        assertion_id,
        display_name: assertion_id,
        isa_315_label: assertion_id,
        pcaob_legacy_category: "existence_occurrence",
        applies_transaction: true,
        applies_balance: true,
        description: "d",
        authoritative_citation: "c",
      })),
    );
    const rows = await listAssertions();
    const ids = rows.map((r) => r.assertion_id);
    expect([...ids].sort()).toEqual(ids);
  });
});
