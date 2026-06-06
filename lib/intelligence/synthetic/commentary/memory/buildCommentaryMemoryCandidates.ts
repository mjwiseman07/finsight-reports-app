import type { SyntheticStructuredCommentaryCandidate } from "../candidates";
import {
  buildCommentaryMemoryCandidate,
  type BuildCommentaryMemoryCandidateResult,
  type SyntheticCommentaryMemoryCandidate,
} from "./buildCommentaryMemoryCandidate";

export interface BuildCommentaryMemoryCandidatesInput {
  companyId: string;
  candidates: Array<SyntheticStructuredCommentaryCandidate | null>;
}

export interface BuildCommentaryMemoryCandidatesResult {
  candidates: SyntheticCommentaryMemoryCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommentaryMemoryCandidateResult[];
}

export function buildCommentaryMemoryCandidates(
  input: BuildCommentaryMemoryCandidatesInput,
): BuildCommentaryMemoryCandidatesResult {
  const candidates: SyntheticCommentaryMemoryCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommentaryMemoryCandidateResult[] = [];

  if (!Array.isArray(input.candidates)) {
    return {
      candidates,
      skippedRequestIndexes,
      warnings: ["candidates must be an array."],
      results,
    };
  }

  input.candidates.forEach((candidate, index) => {
    const result = buildCommentaryMemoryCandidate({
      companyId: input.companyId,
      candidate,
    });
    results.push(result);

    if (result.candidate) {
      candidates.push(result.candidate);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`candidate[${index}]${candidate?.commentaryId ? ` ${candidate.commentaryId}` : ""}: ${warning}`);
    }
  });

  return {
    candidates,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
