import {
  buildFluxPattern,
  type BuildFluxPatternInput,
  type BuildFluxPatternResult,
} from "./buildFluxPattern";
import type { SyntheticFluxPattern } from "../types";

export interface BuildFluxPatternsInput {
  requests: BuildFluxPatternInput[];
}

export interface BuildFluxPatternsResult {
  patterns: SyntheticFluxPattern[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildFluxPatternResult[];
}

export function buildFluxPatterns(input: BuildFluxPatternsInput): BuildFluxPatternsResult {
  const patterns: SyntheticFluxPattern[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildFluxPatternResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      patterns,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildFluxPattern(request);
    results.push(result);

    if (result.pattern) {
      patterns.push(result.pattern);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    patterns,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
