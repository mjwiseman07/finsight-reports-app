import {
  buildWorkflowCandidate,
  type BuildWorkflowCandidateInput,
  type SyntheticWorkflowCandidate,
} from "./buildWorkflowCandidate";

export interface BuildWorkflowCandidatesInput {
  workflowCandidateInputs: BuildWorkflowCandidateInput[];
}

export interface BuildWorkflowCandidatesResult {
  workflowCandidates: SyntheticWorkflowCandidate[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildWorkflowCandidates(input: BuildWorkflowCandidatesInput): BuildWorkflowCandidatesResult {
  const workflowCandidates: SyntheticWorkflowCandidate[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.workflowCandidateInputs.forEach((workflowCandidateInput, index) => {
    const result = buildWorkflowCandidate(workflowCandidateInput);

    warnings.push(...result.warnings.map((warning) => `workflowCandidateInputs[${index}]: ${warning}`));

    if (result.workflowCandidate) {
      workflowCandidates.push(result.workflowCandidate);
      return;
    }

    skippedIndexes.push(index);
  });

  return {
    workflowCandidates,
    skippedIndexes,
    warnings,
  };
}
