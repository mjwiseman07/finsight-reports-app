import { describe, it, expect } from "vitest";
import { validateJeComposition, JeEvidenceContractError } from "@/lib/je-evidence/contract";
import type { JeCompositionResult, JeLineWithEvidence } from "@/lib/je-evidence/types";

function evidence(overrides: Partial<JeLineWithEvidence["evidence"]> = {}) {
  return {
    evidenceType: "system_calculation" as const,
    sourceType: "memory_record",
    evidenceSummary: "Accrual from vendor GL mapping pattern",
    ...overrides,
  };
}

function line(
  lineIndex: number,
  dr: number,
  cr: number,
  evOverrides?: Partial<JeLineWithEvidence["evidence"]>,
): JeLineWithEvidence {
  return {
    lineIndex,
    accountId: `acct-${lineIndex}`,
    accountName: `Account ${lineIndex}`,
    drAmount: dr,
    crAmount: cr,
    evidence: evidence(evOverrides),
  };
}

function composition(lines: JeLineWithEvidence[]): JeCompositionResult {
  return {
    transactionDate: "2026-06-30",
    narration: "Test JE",
    sourceType: "rule",
    lines,
  };
}

describe("validateJeComposition", () => {
  it("accepts a balanced 2-line JE with valid evidence on each line", () => {
    expect(() =>
      validateJeComposition(composition([line(0, 100, 0), line(1, 0, 100)])),
    ).not.toThrow();
  });

  it("accepts a balanced 4-line multi-account JE with valid evidence", () => {
    expect(() =>
      validateJeComposition(
        composition([
          line(0, 50, 0),
          line(1, 50, 0),
          line(2, 0, 75),
          line(3, 0, 25),
        ]),
      ),
    ).not.toThrow();
  });

  it("throws when JE has only 1 line", () => {
    expect(() => validateJeComposition(composition([line(0, 100, 0)]))).toThrow(
      JeEvidenceContractError,
    );
    expect(() => validateJeComposition(composition([line(0, 100, 0)]))).toThrow(
      /at least 2 lines/,
    );
  });

  it("throws when unbalanced beyond penny tolerance (dr 100 / cr 99.99)", () => {
    expect(() =>
      validateJeComposition(composition([line(0, 100, 0), line(1, 0, 99.99)])),
    ).toThrow(/unbalanced/);
  });

  it("passes penny tolerance (dr 100 / cr 99.996)", () => {
    expect(() =>
      validateJeComposition(composition([line(0, 100, 0), line(1, 0, 99.996)])),
    ).not.toThrow();
  });

  it("throws when a line has both dr>0 and cr>0", () => {
    expect(() =>
      validateJeComposition(composition([line(0, 50, 50), line(1, 0, 100)])),
    ).toThrow(/both dr and cr/);
  });

  it("throws when a line has both dr=0 and cr=0", () => {
    expect(() =>
      validateJeComposition(composition([line(0, 0, 0), line(1, 0, 100)])),
    ).toThrow(/zero dr and zero cr/);
  });

  it("throws when line missing evidence entirely", () => {
    const bad = composition([line(0, 100, 0), line(1, 0, 100)]);
    // @ts-expect-error — intentional contract violation
    bad.lines[0].evidence = undefined;
    expect(() => validateJeComposition(bad)).toThrow(/missing evidence/);
  });

  it("throws when evidence missing evidenceType", () => {
    expect(() =>
      validateJeComposition(
        composition([
          line(0, 100, 0, { evidenceType: "" as "other" }),
          line(1, 0, 100),
        ]),
      ),
    ).toThrow(/evidenceType required/);
  });

  it("throws when evidence missing sourceType", () => {
    expect(() =>
      validateJeComposition(
        composition([line(0, 100, 0, { sourceType: "" }), line(1, 0, 100)]),
      ),
    ).toThrow(/sourceType required/);
  });

  it("throws when evidenceSummary is shorter than 3 chars", () => {
    expect(() =>
      validateJeComposition(
        composition([line(0, 100, 0, { evidenceSummary: "ab" }), line(1, 0, 100)]),
      ),
    ).toThrow(/evidenceSummary required/);
  });

  it("throws when dr amount is negative", () => {
    expect(() =>
      validateJeComposition(composition([line(0, -1, 0), line(1, 0, 100)])),
    ).toThrow(/negative dr\/cr/);
  });
});
