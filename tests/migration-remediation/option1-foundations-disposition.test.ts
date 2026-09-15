import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const DOC = path.join(
  ROOT,
  "docs/migration-remediation/option1-foundations-disposition-byte-review-2026-09-06.md",
);
const EVIDENCE = path.join(
  ROOT,
  "docs/migration-remediation/evidence/option1-foundations-disposition-2026-09-06.json",
);

describe("option1 foundations disposition + byte review (design-only)", () => {
  it("recommends executable squash and rejects foundations insert as primary", () => {
    const ev = JSON.parse(fs.readFileSync(EVIDENCE, "utf8"));
    expect(ev.recommendation.primaryPath).toBe("executable_squash_baseline");
    expect(ev.recommendation.rejectPrimary).toBe("foundations_insert_20260701043599");
    expect(ev.recommendation.mutationAuthorized).toBe(false);
    expect(ev.recommendation.fullParityFeasible).toBe(true);
    expect(ev.recommendation.fullParityReady).toBe(false);
    expect(ev.cliBehavior.repairAppliedExecutesSql).toBe(false);
    expect(ev.cliBehavior.repairAppliedWritesStatementsFromLocalFiles).toBe(true);
    expect(ev.cliBehavior.squashOmitsDml).toBe(true);
  });

  it("approves four d6 guarded candidates with distinct prod vs candidate hashes", () => {
    const ev = JSON.parse(fs.readFileSync(EVIDENCE, "utf8"));
    expect(ev.d6ByteReviews).toHaveLength(4);
    for (const row of ev.d6ByteReviews) {
      expect(row.verdict).toBe("APPROVE_GUARDED_CANDIDATE");
      expect(row.prod.sha256).not.toBe(row.candidate.sha256);
      expect(row.candidate.gitBlob).toMatch(/^[0-9a-f]{40}$/);
    }
  });

  it("marks tcp1 and grant provenance as divergent / unsafe for same-version replace", () => {
    const ev = JSON.parse(fs.readFileSync(EVIDENCE, "utf8"));
    expect(ev.provenance).toHaveLength(2);
    for (const p of ev.provenance) {
      expect(p.sameVersionReplaceSafe).toBe(false);
      expect(String(p.verdict)).toMatch(/DIVERGENT/);
    }
  });

  it("human report exists and forbids mutation language as authorized", () => {
    const text = fs.readFileSync(DOC, "utf8");
    expect(text).toContain("Primary path: Mechanism 2");
    expect(text).toContain("Reject Mechanism 1");
    expect(text).toContain("not authorized; none performed");
    expect(text).not.toMatch(/production mutation authorized/i);
  });
});
