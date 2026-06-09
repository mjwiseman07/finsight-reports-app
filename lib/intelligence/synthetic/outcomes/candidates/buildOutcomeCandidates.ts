import {
  buildOutcomeCandidate,
  type BuildOutcomeCandidateInput,
  type BuildOutcomeCandidateResult,
  type SyntheticOutcomeCandidate,
} from "./buildOutcomeCandidate";

export interface BuildOutcomeCandidatesInput {
  requests: BuildOutcomeCandidateInput[];
}

export interface BuildOutcomeCandidatesResult {
  outcomeCandidates: SyntheticOutcomeCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildOutcomeCandidateResult[];
}

export function buildOutcomeCandidates(input: BuildOutcomeCandidatesInput): BuildOutcomeCandidatesResult {
  const outcomeCandidates: SyntheticOutcomeCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildOutcomeCandidateResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      outcomeCandidates,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildOutcomeCandidate(request);
    results.push(result);

    if (result.outcomeCandidate) {
      outcomeCandidates.push(result.outcomeCandidate);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    outcomeCandidates,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
