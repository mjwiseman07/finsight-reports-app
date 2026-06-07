import {
  buildForecastEvidence,
  type BuildForecastEvidenceInput,
  type BuildForecastEvidenceResult,
  type SyntheticForecastEvidencePackage,
} from "./buildForecastEvidence";

export interface BuildForecastEvidenceCollectionInput {
  requests: BuildForecastEvidenceInput[];
}

export interface BuildForecastEvidenceCollectionResult {
  evidencePackages: SyntheticForecastEvidencePackage[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildForecastEvidenceResult[];
}

export function buildForecastEvidenceCollection(
  input: BuildForecastEvidenceCollectionInput,
): BuildForecastEvidenceCollectionResult {
  const evidencePackages: SyntheticForecastEvidencePackage[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildForecastEvidenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      evidencePackages,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildForecastEvidence(request);
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
