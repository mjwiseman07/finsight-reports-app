import { describe, expect, it } from "vitest";
import {
  assessEvidenceStrength,
  assessFireOnlyStrength,
} from "@/lib/assertions/evidence-strength";

describe("assessFireOnlyStrength / assessEvidenceStrength", () => {
  it("empty fires + empty manual → unassessed", () => {
    const r = assessEvidenceStrength({ fires: [], manualTests: [] });
    expect(r.strength).toBe("unassessed");
  });

  it("primary fired, no manual → strong (pre-Part-6 parity)", () => {
    const r = assessEvidenceStrength({
      fires: [{ ruleId: "r1", coverageStrength: "primary", outcome: "fired" }],
      manualTests: [],
    });
    expect(r.strength).toBe("strong");
  });

  it("secondary fired, no manual → moderate", () => {
    const r = assessEvidenceStrength({
      fires: [{ ruleId: "r1", coverageStrength: "secondary", outcome: "fired" }],
      manualTests: [],
    });
    expect(r.strength).toBe("moderate");
  });

  it("partial fired, no manual → weak", () => {
    const r = assessEvidenceStrength({
      fires: [{ ruleId: "r1", coverageStrength: "partial", outcome: "fired" }],
      manualTests: [],
    });
    expect(r.strength).toBe("weak");
  });

  it("empty fires, bank_statement manual → strong", () => {
    const r = assessEvidenceStrength({
      fires: [],
      manualTests: [
        { evidenceId: "m1", evidenceType: "bank_statement", dataSourceReliabilityBasis: null },
      ],
    });
    expect(r.strength).toBe("strong");
  });

  it("empty fires, manual_override manual → weak", () => {
    const r = assessEvidenceStrength({
      fires: [],
      manualTests: [
        { evidenceId: "m1", evidenceType: "manual_override", dataSourceReliabilityBasis: null },
      ],
    });
    expect(r.strength).toBe("weak");
  });

  it("secondary fire + moderate manual corroboration → strong with promotion", () => {
    const r = assessEvidenceStrength({
      fires: [{ ruleId: "r1", coverageStrength: "secondary", outcome: "fired" }],
      manualTests: [
        {
          evidenceId: "m1",
          evidenceType: "manual_procedure",
          dataSourceReliabilityBasis: null,
        },
      ],
    });
    expect(r.strength).toBe("strong");
    expect(r.promoted).toBe(true);
  });

  it("partial fire + manual_procedure manual → moderate (no promotion)", () => {
    const r = assessEvidenceStrength({
      fires: [{ ruleId: "r1", coverageStrength: "partial", outcome: "fired" }],
      manualTests: [
        { evidenceId: "m1", evidenceType: "manual_procedure", dataSourceReliabilityBasis: null },
      ],
    });
    expect(r.strength).toBe("moderate");
    expect(r.promoted).toBe(false);
  });

  it("primary fire + weak manual → stays strong", () => {
    const r = assessEvidenceStrength({
      fires: [{ ruleId: "r1", coverageStrength: "primary", outcome: "fired" }],
      manualTests: [
        { evidenceId: "m1", evidenceType: "manual_override", dataSourceReliabilityBasis: null },
      ],
    });
    expect(r.strength).toBe("strong");
  });

  it("suppressed-only fires + bank_statement manual → strong (manual carries)", () => {
    const fireOnly = assessFireOnlyStrength([
      { ruleId: "r1", coverageStrength: "primary", outcome: "suppressed" },
    ]);
    expect(fireOnly.strength).toBe("unassessed");
    const r = assessEvidenceStrength({
      fires: [{ ruleId: "r1", coverageStrength: "primary", outcome: "suppressed" }],
      manualTests: [
        { evidenceId: "m1", evidenceType: "bank_statement", dataSourceReliabilityBasis: null },
      ],
    });
    expect(r.strength).toBe("strong");
  });
});
