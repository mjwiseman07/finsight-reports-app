/**
 * Phase G7-C5.5 — shared assertion helpers.
 */
import type { ExtractedFiling, ExpectedFiling, NumericFact } from "../types";
import type { AssertionResult, ValidatorContext } from "./types";

export function pass(id: string, pack: string, tier: AssertionResult["tier"]): AssertionResult {
  return { id, pack, tier, passed: true, message: "ok" };
}

export function fail(
  ctx: ValidatorContext,
  partial: Omit<AssertionResult, "passed" | "pack"> & { pack?: string },
): AssertionResult {
  return {
    pack: partial.pack ?? ctx.vertical,
    passed: false,
    ...partial,
  };
}

export function findFact(extracted: ExtractedFiling, tag: string): NumericFact | undefined {
  return extracted.numericFacts.find(
    (fact) => fact.tag === tag || fact.tag.toLowerCase() === tag.toLowerCase(),
  );
}

export function findFactByPattern(extracted: ExtractedFiling, pattern: RegExp): NumericFact | undefined {
  return extracted.numericFacts.find((fact) => pattern.test(fact.tag) || pattern.test(fact.label));
}

export function hasFactTag(extracted: ExtractedFiling, tags: string[]): boolean {
  return tags.some((tag) => Boolean(findFact(extracted, tag)));
}

export function narrativeHaystack(extracted: ExtractedFiling): string {
  return extracted.narrativeSnippets.join(" ").toLowerCase();
}

export function narrativeHas(extracted: ExtractedFiling, patterns: RegExp[]): boolean {
  const hay = narrativeHaystack(extracted);
  return patterns.some((pattern) => pattern.test(hay));
}

export function topicPresent(expected: ExpectedFiling, topicId: string): boolean {
  return expected.topics.some((topic) => topic.topicIdentifier === topicId);
}

export function routerSurfaceStatus(expected: ExpectedFiling, surfaceId: string): string | undefined {
  return expected.routerSurfaces?.[surfaceId]?.status;
}

export function withinPct(observed: number, expected: number, pct: number): boolean {
  if (!Number.isFinite(observed) || !Number.isFinite(expected)) {
    return false;
  }
  if (expected === 0) {
    return observed === 0;
  }
  return Math.abs(observed - expected) / Math.abs(expected) <= pct;
}

export function assertNumericTolerance(
  ctx: ValidatorContext,
  id: string,
  tier: AssertionResult["tier"],
  tag: string,
  tolerancePct: number,
  classification: NonNullable<AssertionResult["classification"]> = "numeric-drift",
  severity: NonNullable<AssertionResult["severity"]> = "medium",
): AssertionResult {
  const extractedFact = findFact(ctx.extracted, tag);
  const expectedFact = findFact(
    { ...ctx.extracted, numericFacts: ctx.expected.numericFacts },
    tag,
  );
  if (!extractedFact) {
    return fail(ctx, {
      id,
      tier: "structural",
      severity: "high",
      classification: "missing-field",
      message: `Filing missing numeric tag ${tag}`,
      observed: "absent",
      expected: tag,
    });
  }
  if (!expectedFact) {
    return fail(ctx, {
      id,
      tier: "structural",
      severity: "high",
      classification: "missing-router-output",
      message: `Router expected.json missing numeric tag ${tag}`,
      observed: String(extractedFact.value),
      expected: "router golden tag",
    });
  }
  const delta = extractedFact.value - expectedFact.value;
  const deltaPct = expectedFact.value === 0 ? 0 : Math.abs(delta) / Math.abs(expectedFact.value);
  const ok = withinPct(extractedFact.value, expectedFact.value, tolerancePct);
  if (ok) {
    return pass(id, ctx.vertical, tier);
  }
  return fail(ctx, {
    id,
    tier,
    severity,
    classification,
    message: `Numeric tolerance exceeded for ${tag}`,
    observed: String(extractedFact.value),
    expected: String(expectedFact.value),
    delta,
    deltaPct,
    tolerance: tolerancePct,
    withinTolerance: false,
  });
}

export function assertPresence(
  ctx: ValidatorContext,
  id: string,
  tier: AssertionResult["tier"],
  condition: boolean,
  message: string,
  options: {
    classification?: AssertionResult["classification"];
    severity?: AssertionResult["severity"];
    observed?: string;
    expected?: string;
  } = {},
): AssertionResult {
  if (condition) {
    return pass(id, ctx.vertical, tier);
  }
  return fail(ctx, {
    id,
    tier,
    severity: options.severity ?? "high",
    classification: options.classification ?? "missing-field",
    message,
    observed: options.observed ?? "absent",
    expected: options.expected ?? "present",
  });
}

export function assertRouterSurface(
  ctx: ValidatorContext,
  id: string,
  surfaceId: string,
  requiredFields: string[],
): AssertionResult {
  const surface = ctx.expected.routerSurfaces?.[surfaceId];
  if (!surface) {
    return fail(ctx, {
      id,
      tier: "structural",
      severity: "high",
      classification: "missing-router-output",
      message: `Router missing surface ${surfaceId}`,
      observed: "absent",
      expected: surfaceId,
    });
  }
  const missing = requiredFields.filter((field) => !surface.fields.includes(field));
  if (missing.length > 0 || surface.status === "missing") {
    return fail(ctx, {
      id,
      tier: "structural",
      severity: surface.status === "partial" ? "medium" : "high",
      classification: "missing-router-output",
      message: `Router surface ${surfaceId} incomplete`,
      observed: surface.status,
      expected: requiredFields.join(", "),
    });
  }
  return pass(id, ctx.vertical, "structural");
}
