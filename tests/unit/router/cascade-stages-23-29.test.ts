import { describe, expect, it, beforeAll } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CASCADE_STAGE_NAMES, CASCADE_STAGE_RANGE } from "../../../lib/router/crossover/cascadeStages";

const ROOT = join(import.meta.dirname, "../../..");
const EVIDENCE_PATH = join(ROOT, "architecture-lane/d0-evidence/G7_C7_CASCADE_EVIDENCE.json");

interface StageRecord {
  pairCode: string;
  stage: number;
  name: string;
  outcome: "pass" | "fail";
  metrics: Record<string, unknown>;
}

interface Evidence {
  evidenceVersion: string;
  generatedAt: string;
  lockTag: string;
  commitSha: string;
  totalStageRuns: number;
  passCount: number;
  failCount: number;
  stages: StageRecord[];
}

let evidence: Evidence;

beforeAll(() => {
  execSync(`node ${join(ROOT, "scripts/generate-g7-c7-cascade-evidence.js")}`, {
    cwd: ROOT,
    stdio: "inherit",
  });
  expect(existsSync(EVIDENCE_PATH)).toBe(true);
  evidence = JSON.parse(readFileSync(EVIDENCE_PATH, "utf8")) as Evidence;
});

describe("G7-C7 Wave 2 — Cascade stages 23–29", () => {
  it("stage range constant is correct", () => {
    expect(CASCADE_STAGE_RANGE).toEqual([23, 24, 25, 26, 27, 28, 29]);
  });
  it("all 7 stage names are defined", () => {
    expect(Object.keys(CASCADE_STAGE_NAMES)).toHaveLength(7);
  });
  it("evidence file generates with 49 stage runs (7 pairs × 7 stages)", () => {
    expect(evidence.totalStageRuns).toBe(49);
  });
  it("all stage runs pass on happy path", () => {
    expect(evidence.passCount).toBe(49);
    expect(evidence.failCount).toBe(0);
  });
  it("evidence covers all 7 pair codes", () => {
    const codes = new Set(evidence.stages.map((s) => s.pairCode));
    expect(codes.size).toBe(7);
    expect(codes.has("hc-npo")).toBe(true);
    expect(codes.has("con-re")).toBe(true);
  });
  it("each pair has exactly 7 stage entries", () => {
    const counts = new Map<string, number>();
    for (const s of evidence.stages) counts.set(s.pairCode, (counts.get(s.pairCode) ?? 0) + 1);
    for (const [code, n] of counts) {
      expect(n, `pair ${code}`).toBe(7);
    }
  });
  it("evidence version and lockTag are correct", () => {
    expect(evidence.evidenceVersion).toBe("G7.C7.W2.0");
    expect(evidence.lockTag).toBe("LOCK-G7-C7");
  });
});
