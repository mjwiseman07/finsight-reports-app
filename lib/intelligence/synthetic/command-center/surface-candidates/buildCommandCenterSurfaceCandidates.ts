import {
  buildCommandCenterSurfaceCandidate,
  type BuildCommandCenterSurfaceCandidateInput,
  type BuildCommandCenterSurfaceCandidateResult,
  type SyntheticStructuredCommandCenterSurfaceCandidate,
} from "./buildCommandCenterSurfaceCandidate";

export interface BuildCommandCenterSurfaceCandidatesInput {
  requests: BuildCommandCenterSurfaceCandidateInput[];
}

export interface BuildCommandCenterSurfaceCandidatesResult {
  surfaceCandidates: SyntheticStructuredCommandCenterSurfaceCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommandCenterSurfaceCandidateResult[];
}

export function buildCommandCenterSurfaceCandidates(
  input: BuildCommandCenterSurfaceCandidatesInput,
): BuildCommandCenterSurfaceCandidatesResult {
  const surfaceCandidates: SyntheticStructuredCommandCenterSurfaceCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommandCenterSurfaceCandidateResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      surfaceCandidates,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommandCenterSurfaceCandidate(request);
    results.push(result);

    if (result.surfaceCandidate) {
      surfaceCandidates.push(result.surfaceCandidate);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    surfaceCandidates,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
