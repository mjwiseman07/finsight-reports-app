import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertionIdFromMessage,
  emitterContainsAssertionHook,
  validateEmitterPathIntegrity,
} from "../../lib/router/crossover/emitterPathValidator";
import { validateCrossoverFooting } from "../../lib/router/crossover/crossoverFootingValidator";
import { validateCollapseStepDocumentation } from "../../lib/router/crossover/collapseStepValidator";
import { EntityFrameworkComminglingError } from "../../lib/router/crossover/errors";
import { validateFrameworkConsistency } from "../../lib/router/crossover/frameworkConsistencyValidator";
import { validateLessorGapSurveillance } from "../../lib/router/crossover/lessorGapSurveillance";
import { loadDefaultCrossoverContext } from "../../lib/router/crossover/index";
import { validateRegisterClassification } from "../../lib/router/crossover/registerClassificationValidator";
import { REGISTER_SCHEMA_VERSION, validateRegisterSchemaV120 } from "../../lib/router/crossover/registerSchemaValidator";
import { stripGeneratedAt, validateTimestampDrift } from "../../lib/router/crossover/timestampDriftValidator";
import { CrossoverFootingError, EmitterPathMismatchError } from "../../lib/router/crossover/errors";

const ROOT = join(import.meta.dirname, "../..");

describe("crossover validators C7b", () => {
  it("frameworkConsistency passes when entity declares single framework", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    ctx.disclosures = [
      {
        entityId: "CAT-10k",
        framework: "US_GAAP_ASC330",
        emitterPath: "lib/router/lanes/manufacturing/emitters/inventoryDecomposition.ts",
        text: "ASC 330 inventory",
      },
    ];
    expect(validateFrameworkConsistency(ctx).passed).toBe(true);
  });

  it("frameworkConsistency throws EntityFrameworkComminglingError on mixed frameworks", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    ctx.disclosures = [
      {
        entityId: "X",
        framework: "US_GAAP_ASC330",
        emitterPath: "a.ts",
        text: "us",
      },
      {
        entityId: "X",
        framework: "IAS2_IFRS",
        emitterPath: "b.ts",
        text: "ifrs",
      },
    ];
    expect(() => validateFrameworkConsistency(ctx)).toThrow(EntityFrameworkComminglingError);
  });

  it("emitterPathIntegrity validates full register including C7a-4 NPO regression", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    const result = validateEmitterPathIntegrity(ctx);
    expect(result.passed).toBe(true);
    expect(result.detail).toMatch(/C7a-4 NPO/);
  });

  it("emitterPathMismatch when assertion hook missing from emitter source", () => {
    expect(emitterContainsAssertionHook('assertionId: "foo"', "foo")).toBe(true);
    expect(emitterContainsAssertionHook("no hooks here", "foo")).toBe(false);
    expect(assertionIdFromMessage("gc/cas-410-gna-pool: detail")).toBe("cas-410-gna-pool");
  });

  it("crossoverFooting rejects mismatch above tolerance", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    ctx.footingPairs = [
      { label: "test", computed: 1000, referenced: 5000, tolerance: 1000, vertical: "mfg" },
    ];
    expect(() => validateCrossoverFooting(ctx)).toThrow(CrossoverFootingError);
  });

  it("crossoverFooting passes reconciled MFG COGM to COGS pair", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    ctx.footingPairs = [
      {
        label: "COGM to COGS",
        computed: 22_700_000_000,
        referenced: 22_700_000_000,
        tolerance: 1_000,
        vertical: "mfg",
      },
    ];
    expect(validateCrossoverFooting(ctx).passed).toBe(true);
  });

  it("lessorGapSurveillance is warn-only with no lessor gaps", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    const result = validateLessorGapSurveillance(ctx);
    expect(result.passed).toBe(true);
    expect(result.haltOnFailure).toBe(false);
  });

  it("registerClassification confirms B6 GAP-0174/0177/0180 channel-disag doc-lim", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    expect(validateRegisterClassification(ctx).passed).toBe(true);
  });

  it("registerSchema v1.2.0 validates all 201 gaps", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    expect(ctx.register.schemaVersion).toBe(REGISTER_SCHEMA_VERSION);
    expect(validateRegisterSchemaV120(ctx).passed).toBe(true);
    expect(ctx.register.gaps.length).toBe(201);
  });

  it("timestampDrift stripGeneratedAt removes generatedAt only", () => {
    const stripped = stripGeneratedAt({ generatedAt: "x", passCount: 1 }) as Record<string, unknown>;
    expect(stripped.generatedAt).toBeUndefined();
    expect(stripped.passCount).toBe(1);
  });

  it("timestampDrift validator passes with gitattributes rule", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    const result = validateTimestampDrift(ctx);
    expect(result.passed).toBe(true);
    expect(readFileSync(join(ROOT, ".gitattributes"), "utf8")).toContain("generatedAt");
  });

  it("collapseStepDocumentation validates C7a-7/C7a-10 reclassify+close gaps", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    expect(validateCollapseStepDocumentation(ctx).passed).toBe(true);
  });

  it("B1 NPO pattern: functionalExpenseAllocation emitter covers distinct assertion hooks", () => {
    const source = readFileSync(
      join(ROOT, "lib/router/nonprofit/usgaap/functionalExpenseAllocation.ts"),
      "utf8",
    );
    expect(emitterContainsAssertionHook(source, "functional-expense-allocation")).toBe(true);
    expect(emitterContainsAssertionHook(source, "part9-part10-cross-tie")).toBe(true);
  });

  it("emitter path integrity throws EmitterPathMismatchError for missing file", () => {
    const ctx = loadDefaultCrossoverContext(ROOT);
    const gap = ctx.register.gaps.find((g) => g.id === "GAP-0110");
    if (!gap) throw new Error("missing gap");
    const saved = gap.emitter_path;
    gap.emitter_path = "lib/router/missing/emitter.ts";
    expect(() => validateEmitterPathIntegrity(ctx)).toThrow(EmitterPathMismatchError);
    gap.emitter_path = saved;
  });
});
