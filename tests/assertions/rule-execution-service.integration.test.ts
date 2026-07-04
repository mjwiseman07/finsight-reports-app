import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";
import { parseRuleCoverageSeeds, readMigrationSql } from "./_migration-fixture";

const mock = makeMockDb();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => mock,
}));

import { assertionsExercisedInPeriod } from "@/lib/rules/rule-execution-service";

const RULE_ID = "gen.je_balance_check";

beforeEach(() => {
  mock.__reset();
  const coverage = parseRuleCoverageSeeds(readMigrationSql()).filter((r) => r.rule_id === RULE_ID);
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
});

describe("assertionsExercisedInPeriod", () => {
  it("returns empty set when no fired rules exist", async () => {
    const result = await assertionsExercisedInPeriod("fc1", "cp1");
    expect(result).toEqual(new Set());
  });

  it("returns assertion ids for fired rules in firm client scope", async () => {
    mock.__seed("curated_rule_fires", [
      {
        id: "fire-1",
        firm_client_id: "fc1",
        rule_id: RULE_ID,
        outcome: "fired",
      },
      {
        id: "fire-2",
        firm_client_id: "fc2",
        rule_id: RULE_ID,
        outcome: "fired",
      },
    ]);
    const result = await assertionsExercisedInPeriod("fc1", "cp1");
    expect(result.has("accuracy")).toBe(true);
    expect(result.has("completeness")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("ignores non-fired outcomes", async () => {
    mock.__seed("curated_rule_fires", [
      {
        id: "fire-1",
        firm_client_id: "fc1",
        rule_id: RULE_ID,
        outcome: "skipped",
      },
    ]);
    const result = await assertionsExercisedInPeriod("fc1", "cp1");
    expect(result.size).toBe(0);
  });

  it("deduplicates assertions across multiple fires of same rule", async () => {
    mock.__seed("curated_rule_fires", [
      { id: "f1", firm_client_id: "fc1", rule_id: RULE_ID, outcome: "fired" },
      { id: "f2", firm_client_id: "fc1", rule_id: RULE_ID, outcome: "fired" },
    ]);
    const result = await assertionsExercisedInPeriod("fc1", "cp1");
    expect(result.size).toBe(2);
  });
});
