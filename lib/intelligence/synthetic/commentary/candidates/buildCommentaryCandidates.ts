import {
  buildCommentaryCandidate,
  type BuildCommentaryCandidateInput,
  type BuildCommentaryCandidateResult,
  type SyntheticStructuredCommentaryCandidate,
} from "./buildCommentaryCandidate";

export interface BuildCommentaryCandidatesInput {
  requests: BuildCommentaryCandidateInput[];
}

export interface BuildCommentaryCandidatesResult {
  candidates: SyntheticStructuredCommentaryCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommentaryCandidateResult[];
}

export function buildCommentaryCandidates(
  input: BuildCommentaryCandidatesInput,
): BuildCommentaryCandidatesResult {
  const candidates: SyntheticStructuredCommentaryCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommentaryCandidateResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      candidates,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommentaryCandidate(request);
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
