import type { RecommendationAuditEntry } from "../contracts";
import {
  buildAssignmentCandidate,
  type BuildAssignmentCandidateInput,
  type SyntheticAssignmentCandidate,
} from "./buildAssignmentCandidate";
import {
  buildWorkAllocationPackage,
  type BuildWorkAllocationPackageInput,
  type SyntheticWorkAllocationPackage,
} from "./buildWorkAllocationPackage";

export interface BuildWorkAllocationsInput {
  assignmentCandidates: BuildAssignmentCandidateInput[];
  workAllocationPackage?: BuildWorkAllocationPackageInput;
}

export interface BuildWorkAllocationsResult {
  assignmentCandidates: SyntheticAssignmentCandidate[];
  recommendationAuditEntries: RecommendationAuditEntry[];
  workAllocationPackage: SyntheticWorkAllocationPackage | null;
  skippedIndexes: number[];
  warnings: string[];
}

export function buildWorkAllocations(input: BuildWorkAllocationsInput): BuildWorkAllocationsResult {
  const assignmentCandidates: SyntheticAssignmentCandidate[] = [];
  const recommendationAuditEntries: RecommendationAuditEntry[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.assignmentCandidates.forEach((candidateInput, index) => {
    const result = buildAssignmentCandidate({
      ...candidateInput,
      skippedIndexes: [...(candidateInput.skippedIndexes ?? []), index],
    });

    if (result.assignmentCandidate) {
      assignmentCandidates.push(result.assignmentCandidate);
    }

    if (result.recommendationAuditEntry) {
      recommendationAuditEntries.push(result.recommendationAuditEntry);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `assignmentCandidate[${index}]: ${warning}`));
  });

  if (!input.workAllocationPackage) {
    return {
      assignmentCandidates,
      recommendationAuditEntries,
      workAllocationPackage: null,
      skippedIndexes,
      warnings,
    };
  }

  const packageResult = buildWorkAllocationPackage({
    ...input.workAllocationPackage,
    assignmentCandidates,
  });

  return {
    assignmentCandidates,
    recommendationAuditEntries,
    workAllocationPackage: packageResult.workAllocationPackage,
    skippedIndexes,
    warnings: [
      ...warnings,
      ...packageResult.warnings.map((warning) => `workAllocationPackage: ${warning}`),
    ],
  };
}
