import {
  buildFteMemoryCandidate,
  type BuildFteMemoryCandidateInput,
  type BuildFteMemoryCandidateResult,
  type SyntheticFteMemoryCandidate,
} from "./buildFteMemoryCandidate";
import type { SyntheticFtePattern, SyntheticFteSourceReference } from "../types";

export interface BuildFteMemoryCandidatesInput {
  companyId: string;
  patterns: SyntheticFtePattern[];
  sourceReferencesByPatternId: Record<string, SyntheticFteSourceReference[]>;
}

export interface BuildFteMemoryCandidatesResult {
  candidates: SyntheticFteMemoryCandidate[];
  skippedPatternIds: string[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildFteMemoryCandidateResult[];
}

export function buildFteMemoryCandidates(
  input: BuildFteMemoryCandidatesInput,
): BuildFteMemoryCandidatesResult {
  const candidates: SyntheticFteMemoryCandidate[] = [];
  const skippedPatternIds: string[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildFteMemoryCandidateResult[] = [];

  input.patterns.forEach((pattern, index) => {
    const request: BuildFteMemoryCandidateInput = {
      companyId: input.companyId,
      scope: pattern.scope,
      pattern,
      sourceReferences: input.sourceReferencesByPatternId[pattern.patternId] || [],
    };
    const result = buildFteMemoryCandidate(request);
    results.push(result);

    if (result.candidate) {
      candidates.push(result.candidate);
      return;
    }

    skippedRequestIndexes.push(index);
    if (pattern.patternId) skippedPatternIds.push(pattern.patternId);
    for (const warning of result.warnings) {
      warnings.push(`pattern[${index}]${pattern.patternId ? ` ${pattern.patternId}` : ""}: ${warning}`);
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
