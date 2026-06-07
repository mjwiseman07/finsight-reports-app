import type { SyntheticStructuredForecastCandidate } from "../candidates";
import {
  buildForecastMemoryCandidate,
  type BuildForecastMemoryCandidateResult,
  type SyntheticForecastMemoryCandidate,
} from "./buildForecastMemoryCandidate";

export interface BuildForecastMemoryCandidatesInput {
  companyId: string;
  candidates: Array<SyntheticStructuredForecastCandidate | null>;
}

export interface BuildForecastMemoryCandidatesResult {
  candidates: SyntheticForecastMemoryCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildForecastMemoryCandidateResult[];
}

export function buildForecastMemoryCandidates(
  input: BuildForecastMemoryCandidatesInput,
): BuildForecastMemoryCandidatesResult {
  const candidates: SyntheticForecastMemoryCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildForecastMemoryCandidateResult[] = [];

  if (!Array.isArray(input.candidates)) {
    return {
      candidates,
      skippedRequestIndexes,
      warnings: ["candidates must be an array."],
      results,
    };
  }

  input.candidates.forEach((candidate, index) => {
    const result = buildForecastMemoryCandidate({
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
      warnings.push(`candidate[${index}]${candidate?.forecastId ? ` ${candidate.forecastId}` : ""}: ${warning}`);
    }
  });

  return {
    candidates,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
