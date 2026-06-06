import {
  buildCommentaryEvidence,
  type BuildCommentaryEvidenceInput,
  type BuildCommentaryEvidenceResult,
  type SyntheticCommentaryEvidencePackage,
} from "./buildCommentaryEvidence";

export interface BuildCommentaryEvidenceCollectionInput {
  requests: BuildCommentaryEvidenceInput[];
}

export interface BuildCommentaryEvidenceCollectionResult {
  evidencePackages: SyntheticCommentaryEvidencePackage[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildCommentaryEvidenceResult[];
}

export function buildCommentaryEvidenceCollection(
  input: BuildCommentaryEvidenceCollectionInput,
): BuildCommentaryEvidenceCollectionResult {
  const evidencePackages: SyntheticCommentaryEvidencePackage[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildCommentaryEvidenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      evidencePackages,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildCommentaryEvidence(request);
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
