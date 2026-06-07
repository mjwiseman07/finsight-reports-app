import {
  buildScenarioEvidence,
  type BuildScenarioEvidenceInput,
  type BuildScenarioEvidenceResult,
  type SyntheticScenarioEvidencePackage,
} from "./buildScenarioEvidence";

export interface BuildScenarioEvidenceCollectionInput {
  requests: BuildScenarioEvidenceInput[];
}

export interface BuildScenarioEvidenceCollectionResult {
  evidencePackages: SyntheticScenarioEvidencePackage[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildScenarioEvidenceResult[];
}

export function buildScenarioEvidenceCollection(
  input: BuildScenarioEvidenceCollectionInput,
): BuildScenarioEvidenceCollectionResult {
  const evidencePackages: SyntheticScenarioEvidencePackage[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildScenarioEvidenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      evidencePackages,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildScenarioEvidence(request);
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
