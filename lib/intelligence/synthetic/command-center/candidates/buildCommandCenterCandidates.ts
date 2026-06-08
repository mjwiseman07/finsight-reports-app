import {
  buildCommandCenterCandidate,
  type BuildCommandCenterCandidateInput,
  type BuildCommandCenterCandidateResult,
  type SyntheticStructuredCommandCenterCandidate,
} from "./buildCommandCenterCandidate";

export interface BuildCommandCenterCandidatesInput {
  requests: BuildCommandCenterCandidateInput[];
}

export interface BuildCommandCenterCandidatesResult {
  candidates: SyntheticStructuredCommandCenterCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommandCenterCandidateResult[];
}

export function buildCommandCenterCandidates(
  input: BuildCommandCenterCandidatesInput,
): BuildCommandCenterCandidatesResult {
  const candidates: SyntheticStructuredCommandCenterCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommandCenterCandidateResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      candidates,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommandCenterCandidate(request);
    results.push(result);

    if (result.candidate) {
      candidates.push(result.candidate);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    candidates,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
