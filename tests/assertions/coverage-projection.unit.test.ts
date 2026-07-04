import { describe, expect, it } from "vitest";
import {
  ACCOUNT_CATEGORIES,
  ASSERTION_IDS,
} from "@/lib/pre-close/assertions-types";
import { projectCoverage, summarize } from "@/lib/assertions/coverage-projection";
import type { ProjectionInput } from "@/lib/pre-close/assertions-coverage-types";

function baseInput(overrides: Partial<ProjectionInput> = {}): ProjectionInput {
  const relevance = ACCOUNT_CATEGORIES.flatMap((account_category) =>
    ASSERTION_IDS.map((assertion_id) => ({
      account_category,
      assertion_id,
      relevance: "relevant" as const,
    })),
  );
  return {
    firmClientId: "fc1",
    closePeriodId: "cp1",
    workerRunId: "wr1",
    relevance,
    ruleCoverage: [],
    fires: [],
    ...overrides,
  };
}

describe("projectCoverage", () => {
  it("emits exactly 144 rows with zero fires", () => {
    const rows = projectCoverage(baseInput());
    expect(rows).toHaveLength(144);
  });

  it("emits 144 rows even with many fires", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.je_balance_check",
            assertion_id: "accuracy",
            coverage_strength: "primary",
            account_categories: ["cash"],
          },
        ],
        fires: [
          { fire_id: "f1", rule_id: "gen.je_balance_check", outcome: "fired" },
          { fire_id: "f2", rule_id: "gen.je_balance_check", outcome: "fired" },
        ],
      }),
    );
    expect(rows).toHaveLength(144);
  });

  it("N/A pairs short-circuit to not_applicable", () => {
    const input = baseInput({
      relevance: [{ account_category: "cash", assertion_id: "accuracy", relevance: "not_applicable" }],
    });
    const row = projectCoverage(input).find(
      (r) => r.account_category === "cash" && r.assertion_id === "accuracy",
    );
    expect(row?.coverage_status).toBe("not_applicable");
    expect(row?.evidence_strength).toBe("unassessed");
    expect(row?.gap_root_cause_code).toBeNull();
  });

  it("usually_not_primary short-circuits to not_applicable", () => {
    const input = baseInput({
      relevance: [
        { account_category: "cash", assertion_id: "accuracy", relevance: "usually_not_primary" },
      ],
    });
    const row = projectCoverage(input).find(
      (r) => r.account_category === "cash" && r.assertion_id === "accuracy",
    );
    expect(row?.coverage_status).toBe("not_applicable");
  });

  it("no rule for relevant pair → gap + no_rule_defined", () => {
    const row = projectCoverage(baseInput()).find(
      (r) => r.account_category === "cash" && r.assertion_id === "accuracy",
    );
    expect(row?.coverage_status).toBe("gap");
    expect(row?.gap_root_cause_code).toBe("no_rule_defined");
  });

  it("rule defined but no fires → gap + rule_defined_but_not_fired", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.je_balance_check",
            assertion_id: "accuracy",
            coverage_strength: "primary",
            account_categories: ["cash"],
          },
        ],
      }),
    );
    const row = rows.find((r) => r.account_category === "cash" && r.assertion_id === "accuracy");
    expect(row?.coverage_status).toBe("gap");
    expect(row?.gap_root_cause_code).toBe("rule_defined_but_not_fired");
  });

  it("primary fired → tested + strong", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.je_balance_check",
            assertion_id: "accuracy",
            coverage_strength: "primary",
            account_categories: ["cash"],
          },
        ],
        fires: [{ fire_id: "f1", rule_id: "gen.je_balance_check", outcome: "fired" }],
      }),
    );
    const row = rows.find((r) => r.account_category === "cash" && r.assertion_id === "accuracy");
    expect(row?.coverage_status).toBe("tested");
    expect(row?.evidence_strength).toBe("strong");
  });

  it("secondary only fired → partial + moderate", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.rule",
            assertion_id: "accuracy",
            coverage_strength: "secondary",
            account_categories: ["cash"],
          },
        ],
        fires: [{ fire_id: "f1", rule_id: "gen.rule", outcome: "fired" }],
      }),
    );
    const row = rows.find((r) => r.account_category === "cash" && r.assertion_id === "accuracy");
    expect(row?.coverage_status).toBe("partial");
    expect(row?.evidence_strength).toBe("moderate");
    expect(row?.gap_root_cause_code).toBe("coverage_partial_by_design");
  });

  it("partial strength only fired → partial + weak", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.rule",
            assertion_id: "accuracy",
            coverage_strength: "partial",
            account_categories: ["cash"],
          },
        ],
        fires: [{ fire_id: "f1", rule_id: "gen.rule", outcome: "fired" }],
      }),
    );
    const row = rows.find((r) => r.account_category === "cash" && r.assertion_id === "accuracy");
    expect(row?.coverage_status).toBe("partial");
    expect(row?.evidence_strength).toBe("weak");
  });

  it("only suppressed → gap + rule_fired_but_all_suppressed", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.rule",
            assertion_id: "accuracy",
            coverage_strength: "primary",
            account_categories: ["cash"],
          },
        ],
        fires: [{ fire_id: "f1", rule_id: "gen.rule", outcome: "suppressed" }],
      }),
    );
    const row = rows.find((r) => r.account_category === "cash" && r.assertion_id === "accuracy");
    expect(row?.coverage_status).toBe("gap");
    expect(row?.gap_root_cause_code).toBe("rule_fired_but_all_suppressed");
  });

  it("only errored → gap + rule_errored", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.rule",
            assertion_id: "accuracy",
            coverage_strength: "primary",
            account_categories: ["cash"],
          },
        ],
        fires: [{ fire_id: "f1", rule_id: "gen.rule", outcome: "error" }],
      }),
    );
    const row = rows.find((r) => r.account_category === "cash" && r.assertion_id === "accuracy");
    expect(row?.coverage_status).toBe("gap");
    expect(row?.gap_root_cause_code).toBe("rule_errored");
  });

  it("primary fired beats secondary suppressed across rules", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.primary",
            assertion_id: "accuracy",
            coverage_strength: "primary",
            account_categories: ["cash"],
          },
          {
            rule_id: "gen.secondary",
            assertion_id: "accuracy",
            coverage_strength: "secondary",
            account_categories: ["cash"],
          },
        ],
        fires: [
          { fire_id: "f1", rule_id: "gen.primary", outcome: "fired" },
          { fire_id: "f2", rule_id: "gen.secondary", outcome: "suppressed" },
        ],
      }),
    );
    const row = rows.find((r) => r.account_category === "cash" && r.assertion_id === "accuracy");
    expect(row?.coverage_status).toBe("tested");
    expect(row?.covering_rule_ids).toContain("gen.primary");
  });

  it("covering_rule_ids deduplicates multiple fires of same rule", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.rule",
            assertion_id: "accuracy",
            coverage_strength: "primary",
            account_categories: ["cash"],
          },
        ],
        fires: [
          { fire_id: "f1", rule_id: "gen.rule", outcome: "fired" },
          { fire_id: "f2", rule_id: "gen.rule", outcome: "fired" },
        ],
      }),
    );
    const row = rows.find((r) => r.account_category === "cash" && r.assertion_id === "accuracy");
    expect(row?.covering_rule_ids).toEqual(["gen.rule"]);
    expect(row?.covering_fire_ids).toEqual(expect.arrayContaining(["f1", "f2"]));
    expect(row?.covering_fire_ids).toHaveLength(2);
  });

  it("summarize gap_rate is 0 when no relevant pairs", () => {
    const rows = ACCOUNT_CATEGORIES.flatMap((account_category) =>
      ASSERTION_IDS.map((assertion_id) => ({
        account_category,
        assertion_id,
        relevance_at_computation: "not_applicable" as const,
        coverage_status: "not_applicable" as const,
        covering_rule_ids: [],
        covering_fire_ids: [],
        evidence_strength: "unassessed" as const,
        gap_root_cause_code: null,
      })),
    );
    const s = summarize(rows);
    expect(s.gapRate).toBe(0);
    expect(s.notApplicable).toBe(144);
  });

  it("summarize computes gap rate over relevant pairs only", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.rule",
            assertion_id: "accuracy",
            coverage_strength: "primary",
            account_categories: ["cash"],
          },
        ],
        fires: [{ fire_id: "f1", rule_id: "gen.rule", outcome: "fired" }],
      }),
    );
    const s = summarize(rows);
    expect(s.tested).toBe(1);
    expect(s.gap).toBeGreaterThan(0);
    expect(s.gapRate).toBeGreaterThan(0);
    expect(s.gapRate).toBeLessThan(1);
  });

  it("missing relevance defaults to not_applicable", () => {
    const rows = projectCoverage(
      baseInput({
        relevance: [],
      }),
    );
    expect(rows.every((r) => r.coverage_status === "not_applicable")).toBe(true);
  });

  it("rule not covering account category is ignored", () => {
    const rows = projectCoverage(
      baseInput({
        ruleCoverage: [
          {
            rule_id: "gen.rule",
            assertion_id: "accuracy",
            coverage_strength: "primary",
            account_categories: ["revenue"],
          },
        ],
        fires: [{ fire_id: "f1", rule_id: "gen.rule", outcome: "fired" }],
      }),
    );
    const cash = rows.find((r) => r.account_category === "cash" && r.assertion_id === "accuracy");
    expect(cash?.coverage_status).toBe("gap");
    const rev = rows.find((r) => r.account_category === "revenue" && r.assertion_id === "accuracy");
    expect(rev?.coverage_status).toBe("tested");
  });
});
