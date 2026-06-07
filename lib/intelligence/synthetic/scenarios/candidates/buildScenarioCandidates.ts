import {
  buildScenarioCandidate,
  type BuildScenarioCandidateInput,
  type BuildScenarioCandidateResult,
  type SyntheticStructuredScenarioCandidate,
} from "./buildScenarioCandidate";

export interface BuildScenarioCandidatesInput {
  requests: BuildScenarioCandidateInput[];
}

export interface BuildScenarioCandidatesResult {
  candidates: SyntheticStructuredScenarioCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildScenarioCandidateResult[];
}

export function buildScenarioCandidates(input: BuildScenarioCandidatesInput): BuildScenarioCandidatesResult {
  const candidates: SyntheticStructuredScenarioCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildScenarioCandidateResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      candidates,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildScenarioCandidate(request);
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
