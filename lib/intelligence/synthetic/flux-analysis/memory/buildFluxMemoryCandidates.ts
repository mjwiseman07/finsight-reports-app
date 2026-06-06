import {
  buildFluxMemoryCandidate,
  type BuildFluxMemoryCandidateInput,
  type BuildFluxMemoryCandidateResult,
  type SyntheticFluxMemoryCandidate,
} from "./buildFluxMemoryCandidate";
import type { SyntheticFluxPattern } from "../types";

export interface BuildFluxMemoryCandidatesInput {
  companyId: string;
  patterns: Array<SyntheticFluxPattern | null>;
}

export interface BuildFluxMemoryCandidatesResult {
  candidates: SyntheticFluxMemoryCandidate[];
  skippedPatternIds: string[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildFluxMemoryCandidateResult[];
}

export function buildFluxMemoryCandidates(
  input: BuildFluxMemoryCandidatesInput,
): BuildFluxMemoryCandidatesResult {
  const candidates: SyntheticFluxMemoryCandidate[] = [];
  const skippedPatternIds: string[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildFluxMemoryCandidateResult[] = [];

  if (!Array.isArray(input.patterns)) {
    return {
      candidates,
      skippedPatternIds,
      skippedRequestIndexes,
      warnings: ["patterns must be an array."],
      results,
    };
  }

  input.patterns.forEach((pattern, index) => {
    const request: BuildFluxMemoryCandidateInput = {
      companyId: input.companyId,
      scope: pattern?.scope ?? { companyId: input.companyId },
      pattern,
    };
    const result = buildFluxMemoryCandidate(request);
    results.push(result);

    if (result.candidate) {
      candidates.push(result.candidate);
      return;
    }

    skippedRequestIndexes.push(index);
    if (pattern?.patternId) skippedPatternIds.push(pattern.patternId);
    for (const warning of result.warnings) {
      warnings.push(`pattern[${index}]${pattern?.patternId ? ` ${pattern.patternId}` : ""}: ${warning}`);
    }
  });

  return {
    candidates,
    skippedPatternIds,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
