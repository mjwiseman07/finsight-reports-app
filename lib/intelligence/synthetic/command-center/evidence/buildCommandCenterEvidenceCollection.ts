import {
  buildCommandCenterEvidence,
  type BuildCommandCenterEvidenceInput,
  type BuildCommandCenterEvidenceResult,
  type SyntheticCommandCenterEvidencePackage,
} from "./buildCommandCenterEvidence";

export interface BuildCommandCenterEvidenceCollectionInput {
  requests: BuildCommandCenterEvidenceInput[];
}

export interface BuildCommandCenterEvidenceCollectionResult {
  evidencePackages: SyntheticCommandCenterEvidencePackage[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommandCenterEvidenceResult[];
}

export function buildCommandCenterEvidenceCollection(
  input: BuildCommandCenterEvidenceCollectionInput,
): BuildCommandCenterEvidenceCollectionResult {
  const evidencePackages: SyntheticCommandCenterEvidencePackage[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommandCenterEvidenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      evidencePackages,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommandCenterEvidence(request);
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
