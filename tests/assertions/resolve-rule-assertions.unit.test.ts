import { beforeEach, describe, expect, it } from "vitest";
import { makeMockDb } from "../pre-close/_mock-db";
import { resolveFireAssertions, resolveRuleAssertions, clearResolverCache } from "@/lib/assertions/resolve-rule-assertions";

const mock = makeMockDb();

function seedCoverage(ruleId: string, assertionIds: string[]) {
  mock.__seed(
    "rule_assertion_coverage",
    assertionIds.map((assertion_id) => ({ rule_id: ruleId, assertion_id })),
  );
}

beforeEach(() => {
  mock.__reset();
  clearResolverCache(mock as never);
});

describe("resolveRuleAssertions", () => {
  it("returns empty array for unmapped rule_id", async () => {
    expect(await resolveRuleAssertions(mock as never, "gen.unknown")).toEqual([]);
  });

  it("returns sorted deduplicated assertion_ids for mapped rule", async () => {
    seedCoverage("gen.rule", ["completeness", "accuracy", "completeness"]);
    expect(await resolveRuleAssertions(mock as never, "gen.rule")).toEqual([
      "accuracy",
      "completeness",
    ]);
  });

  it("caches per SupabaseClient (second call same client + same rule = 1 DB query)", async () => {
    seedCoverage("gen.rule", ["cutoff"]);
    let queries = 0;
    const origImpl = mock.from.getMockImplementation() as (table: string) => object;
    mock.from.mockImplementation((table: string) => {
      if (table === "rule_assertion_coverage") queries += 1;
      return origImpl(table);
    });
    try {
      await resolveRuleAssertions(mock as never, "gen.rule");
      await resolveRuleAssertions(mock as never, "gen.rule");
      expect(queries).toBe(1);
    } finally {
      mock.from.mockImplementation(origImpl);
    }
  });

  it("different clients do not share cache", async () => {
    seedCoverage("gen.rule", ["cutoff"]);
    const mock2 = makeMockDb();
    mock2.__seed("rule_assertion_coverage", [{ rule_id: "gen.rule", assertion_id: "accuracy" }]);

    let q1 = 0;
    let q2 = 0;
    const orig1 = mock.from.getMockImplementation() as (table: string) => object;
    const orig2 = mock2.from.getMockImplementation() as (table: string) => object;
    mock.from.mockImplementation((t: string) => {
      if (t === "rule_assertion_coverage") q1 += 1;
      return orig1(t);
    });
    mock2.from.mockImplementation((t: string) => {
      if (t === "rule_assertion_coverage") q2 += 1;
      return orig2(t);
    });
    try {
      await resolveRuleAssertions(mock as never, "gen.rule");
      await resolveRuleAssertions(mock2 as never, "gen.rule");
      expect(q1).toBe(1);
      expect(q2).toBe(1);
    } finally {
      mock.from.mockImplementation(orig1);
      mock2.from.mockImplementation(orig2);
    }
  });
});

describe("resolveFireAssertions", () => {
  it("returns empty for missing fire_id", async () => {
    expect(await resolveFireAssertions(mock as never, "missing-fire")).toEqual([]);
  });

  it("chains through curated_rule_fires to rule_assertion_coverage", async () => {
    mock.__seed("curated_rule_fires", [{ fire_id: "fire-9", rule_id: "gen.je_balance_check" }]);
    seedCoverage("gen.je_balance_check", ["accuracy", "existence_occurrence"]);
    expect(await resolveFireAssertions(mock as never, "fire-9")).toEqual([
      "accuracy",
      "existence_occurrence",
    ]);
  });
});

describe("resolveRuleAssertions error path", () => {
  it("returns empty array when rule_assertion_coverage query errors", async () => {
    const broken = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: { message: "boom" } }),
        }),
      }),
    };
    expect(await resolveRuleAssertions(broken as never, "gen.rule")).toEqual([]);
  });
});
