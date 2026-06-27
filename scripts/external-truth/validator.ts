/**
 * Phase G7 — three-tier external-truth validator + per-vertical assertion packs.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runFrameworkAssertions, runVerticalAssertions } from "./assertions/registry";
import type { AssertionResult, ValidatorContext } from "./assertions/types";
import { DEFAULT_TOLERANCES } from "./lib/tolerances";
import type {
  ExpectedFiling,
  ExtractedFiling,
  GapEntry,
  GapRegister,
  SourceJson,
  ValidationResult,
} from "./types";
import { nextGapId } from "./utils";

/** SEC SAB 99 materiality default for numeric tier (5%). */
const NUMERIC_TOLERANCE_PCT = DEFAULT_TOLERANCES.sab99Materiality;

function withinTolerance(observed: number, expected: number): boolean {
  if (!Number.isFinite(observed) || !Number.isFinite(expected)) {
    return false;
  }
  if (expected === 0) {
    return observed === 0;
  }
  const delta = Math.abs(observed - expected) / Math.abs(expected);
  return delta <= NUMERIC_TOLERANCE_PCT;
}

function makeGap(
  register: GapRegister,
  partial: Omit<GapEntry, "id" | "triage" | "triageDecisionSha" | "triageNote" | "createdAt">,
): GapEntry {
  const gap: GapEntry = {
    ...partial,
    id: nextGapId(register),
    triage: null,
    triageDecisionSha: null,
    triageNote: null,
    createdAt: new Date().toISOString(),
  };
  register.gaps.push(gap);
  return gap;
}

function assertionToGap(ctx: ValidatorContext, assertion: AssertionResult): Omit<
  GapEntry,
  "id" | "triage" | "triageDecisionSha" | "triageNote" | "createdAt"
> {
  return {
    filingId: ctx.filingId,
    vertical: ctx.vertical,
    framework: ctx.framework,
    tier: assertion.tier,
    severity: assertion.severity ?? "medium",
    classification: assertion.classification ?? "missing-field",
    message: `${assertion.pack}/${assertion.id}: ${assertion.message}`,
    observed: assertion.observed ?? "",
    expected: assertion.expected ?? "",
  };
}

function buildContext(
  filingPath: string,
  extracted: ExtractedFiling,
  expected: ExpectedFiling,
): ValidatorContext {
  const sourcePath = join(filingPath, "source.json");
  const source = existsSync(sourcePath)
    ? (JSON.parse(readFileSync(sourcePath, "utf8")) as SourceJson)
    : null;
  return {
    filingPath,
    filingId: extracted.filingId,
    vertical: extracted.vertical,
    framework: extracted.framework,
    extracted,
    expected,
    source,
    tolerances: DEFAULT_TOLERANCES,
    materialityThreshold: DEFAULT_TOLERANCES.sab99Materiality,
  };
}

export function validateFiling(
  filingPath: string,
  register: GapRegister,
): ValidationResult {
  const extractedPath = join(filingPath, "extracted.json");
  const expectedPath = join(filingPath, "expected.json");
  const gaps: GapEntry[] = [];

  if (!existsSync(extractedPath) || !existsSync(expectedPath)) {
    const filingId = filingPath.split(/[\\/]/).pop() ?? "unknown";
    gaps.push(
      makeGap(register, {
        filingId,
        vertical: "saas",
        framework: "us-gaap",
        tier: "structural",
        severity: "high",
        classification: "missing-field",
        message: "Missing extracted.json or expected.json",
        observed: `extracted=${existsSync(extractedPath)} expected=${existsSync(expectedPath)}`,
        expected: "both artifacts present",
      }),
    );
    return { filingId, passed: false, gaps };
  }

  const extracted = JSON.parse(readFileSync(extractedPath, "utf8")) as ExtractedFiling;
  const expected = JSON.parse(readFileSync(expectedPath, "utf8")) as ExpectedFiling;
  const ctx = buildContext(filingPath, extracted, expected);

  // --- Tier 1: structural ---
  if (extracted.framework !== expected.framework) {
    gaps.push(
      makeGap(register, {
        filingId: extracted.filingId,
        vertical: extracted.vertical,
        framework: extracted.framework,
        tier: "structural",
        severity: "critical",
        classification: "framework-mismatch",
        message: "Extracted framework does not match expected binding",
        observed: extracted.framework,
        expected: expected.framework,
      }),
    );
  }

  for (const topic of expected.topics) {
    if (topic.reportingFramework !== expected.frameworkBinding.primary) {
      gaps.push(
        makeGap(register, {
          filingId: extracted.filingId,
          vertical: extracted.vertical,
          framework: expected.framework,
          tier: "structural",
          severity: "critical",
          classification: "comingling-suspect",
          message: `Topic ${topic.topicIdentifier} framework bleed`,
          observed: topic.reportingFramework,
          expected: expected.frameworkBinding.primary,
        }),
      );
    }
  }

  if (
    expected.frameworkBinding.prohibitsLifo &&
    extracted.inventoryMethod?.toUpperCase().includes("LIFO")
  ) {
    gaps.push(
      makeGap(register, {
        filingId: extracted.filingId,
        vertical: extracted.vertical,
        framework: expected.framework,
        tier: "structural",
        severity: "high",
        classification: "comingling-suspect",
        message: "IFRS/IPSAS filing shows LIFO inventory method in extracted facts",
        observed: extracted.inventoryMethod,
        expected: "FIFO or weighted-average (LIFO prohibited)",
      }),
    );
  }

  if (!extracted.entityName) {
    gaps.push(
      makeGap(register, {
        filingId: extracted.filingId,
        vertical: extracted.vertical,
        framework: extracted.framework,
        tier: "structural",
        severity: "medium",
        classification: "missing-field",
        message: "Entity name missing from extracted filing",
        observed: "",
        expected: "non-empty entityName",
      }),
    );
  }

  // --- Tier 2: numeric (SAB 99 tolerance) ---
  const expectedByTag = new Map(expected.numericFacts.map((fact) => [fact.tag, fact]));
  for (const observed of extracted.numericFacts) {
    const golden = expectedByTag.get(observed.tag);
    if (!golden) {
      continue;
    }
    if (!withinTolerance(observed.value, golden.value)) {
      gaps.push(
        makeGap(register, {
          filingId: extracted.filingId,
          vertical: extracted.vertical,
          framework: extracted.framework,
          tier: "numeric",
          severity: "medium",
          classification: "tolerance-exceeded",
          message: `Numeric drift on ${observed.tag} exceeds SAB 99 ${NUMERIC_TOLERANCE_PCT * 100}% band`,
          observed: String(observed.value),
          expected: String(golden.value),
        }),
      );
    }
  }

  // --- Tier 3: narrative ---
  for (const topic of expected.topics) {
    if (!topic.disclosureSummaryAuthored?.trim()) {
      gaps.push(
        makeGap(register, {
          filingId: extracted.filingId,
          vertical: extracted.vertical,
          framework: expected.framework,
          tier: "narrative",
          severity: "low",
          classification: "narrative-gap",
          message: `Empty disclosure summary for ${topic.topicIdentifier}`,
          observed: "",
          expected: "non-empty disclosureSummaryAuthored",
        }),
      );
    }
  }

  if (extracted.narrativeSnippets.length === 0 && expected.topics.length > 0) {
    gaps.push(
      makeGap(register, {
        filingId: extracted.filingId,
        vertical: extracted.vertical,
        framework: extracted.framework,
        tier: "narrative",
        severity: "low",
        classification: "narrative-gap",
        message: "No narrative snippets extracted from filing",
        observed: "0 snippets",
        expected: ">=1 narrative snippet",
      }),
    );
  }

  // --- Per-vertical + framework assertion packs ---
  const packResults = [...runVerticalAssertions(ctx), ...runFrameworkAssertions(ctx)];
  for (const assertion of packResults) {
    if (!assertion.passed) {
      gaps.push(makeGap(register, assertionToGap(ctx, assertion)));
    }
  }

  return {
    filingId: extracted.filingId,
    passed: gaps.length === 0,
    gaps,
  };
}

export function validateAllFilings(
  filingPaths: string[],
  register: GapRegister,
): ValidationResult[] {
  return filingPaths.map((path) => validateFiling(path, register));
}
