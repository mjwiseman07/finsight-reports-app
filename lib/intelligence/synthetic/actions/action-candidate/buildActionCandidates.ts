import {
  buildActionCandidate,
  type BuildActionCandidateInput,
  type SyntheticActionCandidate,
} from "./buildActionCandidate";

export interface BuildActionCandidatesInput {
  actionCandidateInputs: BuildActionCandidateInput[];
}

export interface BuildActionCandidatesResult {
  actionCandidates: SyntheticActionCandidate[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildActionCandidates(input: BuildActionCandidatesInput): BuildActionCandidatesResult {
  const actionCandidates: SyntheticActionCandidate[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.actionCandidateInputs.forEach((actionCandidateInput, index) => {
    const result = buildActionCandidate(actionCandidateInput);

    warnings.push(...result.warnings.map((warning) => `actionCandidateInputs[${index}]: ${warning}`));

    if (result.actionCandidate) {
      actionCandidates.push(result.actionCandidate);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    actionCandidates,
    skippedIndexes,
    warnings,
  };
}
