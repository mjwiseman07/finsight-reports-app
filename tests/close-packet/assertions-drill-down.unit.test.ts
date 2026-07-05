import { describe, expect, it } from "vitest";

/**
 * Read-only forward-compatibility: coverage drill-down lineage via je_posting_audit.
 * Does not import or modify Part 3 close-packet code.
 */
function overlapAssertions(auditAssertions: string[], cellRuleIds: string[], auditRuleId: string | null) {
  if (!auditRuleId || !cellRuleIds.includes(auditRuleId)) return false;
  return auditAssertions.length > 0;
}

function resolveFireFromAuditSource(
  sourceId: string | null,
  fires: Array<{ fire_id: string; rule_id: string }>,
) {
  return fires.find((f) => f.fire_id === sourceId) ?? null;
}

function drilldownAuditRows(
  coveringFireIds: string[],
  audits: Array<{ source_id: string | null; assertions_addressed: string[] }>,
  fires: Array<{ fire_id: string; rule_id: string }>,
  coveringRuleIds: string[],
) {
  return audits.filter((a) => {
    const fire = resolveFireFromAuditSource(a.source_id, fires);
    if (!fire || !coveringFireIds.includes(fire.fire_id)) return false;
    return overlapAssertions(a.assertions_addressed, coveringRuleIds, fire.rule_id);
  });
}

describe("assertions drill-down forward compatibility", () => {
  const fires = [
    { fire_id: "fire-1", rule_id: "gen.rule" },
    { fire_id: "fire-2", rule_id: "gen.other" },
  ];

  it("je_posting_audit rows for covering fires have overlapping assertions_addressed", () => {
    const audits = [
      { source_id: "fire-1", assertions_addressed: ["completeness"] },
      { source_id: "fire-2", assertions_addressed: ["accuracy"] },
      { source_id: "manual-1", assertions_addressed: ["cutoff"] },
    ];
    const hits = drilldownAuditRows(["fire-1"], audits, fires, ["gen.rule"]);
    expect(hits).toHaveLength(1);
    expect(hits[0].assertions_addressed).toContain("completeness");
  });

  it("je_posting_audit source_id resolves back to curated_rule_fires row", () => {
    const fire = resolveFireFromAuditSource("fire-1", fires);
    expect(fire?.rule_id).toBe("gen.rule");
  });

  it("unrelated je_posting_audit rows do not appear in coverage cell drill-down", () => {
    const audits = [
      { source_id: "fire-1", assertions_addressed: ["completeness"] },
      { source_id: "manual-9", assertions_addressed: ["accuracy"] },
    ];
    const hits = drilldownAuditRows(["fire-1"], audits, fires, ["gen.rule"]);
    expect(hits.every((h) => h.source_id === "fire-1")).toBe(true);
    expect(hits).toHaveLength(1);
  });
});
