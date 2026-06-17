import type { RecommendationAuditEntry } from "../contracts";
import {
  buildEscalationCandidate,
  type BuildEscalationCandidateInput,
  type SyntheticEscalationCandidate,
} from "./buildEscalationCandidate";
import {
  buildEscalationPackage,
  type BuildEscalationPackageInput,
  type SyntheticEscalationPackage,
} from "./buildEscalationPackage";

export interface BuildEscalationsInput {
  escalationCandidateInputs?: BuildEscalationCandidateInput[];
  escalationPackageInput?: Omit<
    BuildEscalationPackageInput,
    "escalationCandidates" | "escalationCandidateReferenceIds"
  >;
  buildPackage?: boolean;
}

export interface BuildEscalationsResult {
  escalationCandidates: SyntheticEscalationCandidate[];
  escalationPackage: SyntheticEscalationPackage | null;
  recommendationAuditEntries: RecommendationAuditEntry[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildEscalations(input: BuildEscalationsInput): BuildEscalationsResult {
  const escalationCandidates: SyntheticEscalationCandidate[] = [];
  const recommendationAuditEntries: RecommendationAuditEntry[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.escalationCandidateInputs).forEach((candidateInput, index) => {
    const result = buildEscalationCandidate(candidateInput);

    warnings.push(...result.warnings.map((warning) => `candidate[${index}]: ${warning}`));

    if (result.skipped || !result.escalationCandidate || !result.recommendationAuditEntry) {
      skippedIndexes.push(index);
      return;
    }

    escalationCandidates.push(result.escalationCandidate);
    recommendationAuditEntries.push(result.recommendationAuditEntry);
  });

  if (input.buildPackage !== true) {
    return {
      escalationCandidates,
      escalationPackage: null,
      recommendationAuditEntries,
      skippedIndexes,
      warnings,
    };
  }

  const packageResult = buildEscalationPackage({
    ...input.escalationPackageInput,
    escalationCandidates,
    skippedIndexes,
    warnings: getInputArray(input.escalationPackageInput?.warnings),
  });

  warnings.push(...packageResult.warnings.map((warning) => `package: ${warning}`));

  if (packageResult.skipped || !packageResult.escalationPackage) {
    return {
      escalationCandidates,
      escalationPackage: null,
      recommendationAuditEntries,
      skippedIndexes,
      warnings,
    };
  }

  return {
    escalationCandidates,
    escalationPackage: packageResult.escalationPackage,
    recommendationAuditEntries,
    skippedIndexes,
    warnings,
  };
}
