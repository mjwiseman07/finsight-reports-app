import {
  buildOutcomeEvidence,
  type BuildOutcomeEvidenceInput,
  type BuildOutcomeEvidenceResult,
  type SyntheticOutcomeEvidencePackage,
} from "./buildOutcomeEvidence";

export interface BuildOutcomeEvidenceCollectionInput {
  requests: BuildOutcomeEvidenceInput[];
}

export interface BuildOutcomeEvidenceCollectionResult {
  outcomeEvidencePackages: SyntheticOutcomeEvidencePackage[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildOutcomeEvidenceResult[];
}

export function buildOutcomeEvidenceCollection(
  input: BuildOutcomeEvidenceCollectionInput,
): BuildOutcomeEvidenceCollectionResult {
  const outcomeEvidencePackages: SyntheticOutcomeEvidencePackage[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildOutcomeEvidenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      outcomeEvidencePackages,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildOutcomeEvidence(request);
    results.push(result);

    if (result.outcomeEvidencePackage) {
      outcomeEvidencePackages.push(result.outcomeEvidencePackage);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    outcomeEvidencePackages,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
