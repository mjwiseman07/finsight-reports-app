import { describe, expect, it } from "vitest";
import { seedPart2Migration } from "./_migration-fixture";

describe("D-Assertions Part 2 migration fixture", () => {
  it("migration file exists with begin/commit", () => {
    const { sql } = seedPart2Migration();
    expect(sql).toContain("begin;");
    expect(sql).toContain("commit;");
    expect(sql).toContain("close_assertion_coverage");
  });

  it("seeds at least 7 root cause codes", () => {
    const { rootCauses } = seedPart2Migration();
    expect(rootCauses.length).toBeGreaterThanOrEqual(7);
    expect(rootCauses).toContain("no_rule_defined");
    expect(rootCauses).toContain("manual_test_documented");
  });

  it("seeds both advisacor flags", () => {
    const { flags } = seedPart2Migration();
    expect(flags).toContain("assertions_gap_reasoning_enabled");
    expect(flags).toContain("assertions_projection_worker_enabled");
  });
});
