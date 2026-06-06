import {
  buildRecommendationEvidence,
  type BuildRecommendationEvidenceInput,
  type BuildRecommendationEvidenceResult,
  type SyntheticRecommendationEvidencePackage,
} from "./buildRecommendationEvidence";

export interface BuildRecommendationEvidenceCollectionInput {
  requests: BuildRecommendationEvidenceInput[];
}

export interface BuildRecommendationEvidenceCollectionResult {
  evidencePackages: SyntheticRecommendationEvidencePackage[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildRecommendationEvidenceResult[];
}

export function buildRecommendationEvidenceCollection(
  input: BuildRecommendationEvidenceCollectionInput,
): BuildRecommendationEvidenceCollectionResult {
  const evidencePackages: SyntheticRecommendationEvidencePackage[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildRecommendationEvidenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      evidencePackages,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildRecommendationEvidence(request);
    results.push(result);

    if (result.evidencePackage) {
      evidencePackages.push(result.evidencePackage);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    evidencePackages,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
