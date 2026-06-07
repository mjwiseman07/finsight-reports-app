import type { SyntheticStructuredScenarioCandidate } from "../candidates";
import {
  buildScenarioMemoryCandidate,
  type BuildScenarioMemoryCandidateResult,
  type SyntheticScenarioMemoryCandidate,
} from "./buildScenarioMemoryCandidate";

export interface BuildScenarioMemoryCandidatesInput {
  companyId: string;
  candidates: Array<SyntheticStructuredScenarioCandidate | null>;
}

export interface BuildScenarioMemoryCandidatesResult {
  candidates: SyntheticScenarioMemoryCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildScenarioMemoryCandidateResult[];
}

export function buildScenarioMemoryCandidates(
  input: BuildScenarioMemoryCandidatesInput,
): BuildScenarioMemoryCandidatesResult {
  const candidates: SyntheticScenarioMemoryCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildScenarioMemoryCandidateResult[] = [];

  if (!Array.isArray(input.candidates)) {
    return {
      candidates,
      skippedRequestIndexes,
      warnings: ["candidates must be an array."],
      results,
    };
  }

  input.candidates.forEach((candidate, index) => {
    const result = buildScenarioMemoryCandidate({
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
      warnings.push(`candidate[${index}]${candidate?.scenarioId ? ` ${candidate.scenarioId}` : ""}: ${warning}`);
    }
  });

  return {
    candidates,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
