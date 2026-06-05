import {
  buildFtePattern,
  type BuildFtePatternInput,
  type BuildFtePatternResult,
} from "./buildFtePattern";
import type { SyntheticFtePattern } from "../types";

export interface BuildFtePatternsInput {
  requests: BuildFtePatternInput[];
}

export interface BuildFtePatternsResult {
  patterns: SyntheticFtePattern[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildFtePatternResult[];
}

export function buildFtePatterns(input: BuildFtePatternsInput): BuildFtePatternsResult {
  const patterns: SyntheticFtePattern[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildFtePatternResult[] = [];

  input.requests.forEach((request, index) => {
    const result = buildFtePattern(request);
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
