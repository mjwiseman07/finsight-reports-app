import {
  buildAuditConfidence,
  type BuildAuditConfidenceInput,
  type BuildAuditConfidenceResult,
  type SyntheticAuditConfidence,
} from "./buildAuditConfidence";

export interface BuildAuditConfidenceCollectionInput {
  requests: BuildAuditConfidenceInput[];
}

export interface BuildAuditConfidenceCollectionResult {
  auditConfidenceArtifacts: SyntheticAuditConfidence[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAuditConfidenceResult[];
}

export function buildAuditConfidenceCollection(
  input: BuildAuditConfidenceCollectionInput,
): BuildAuditConfidenceCollectionResult {
  const auditConfidenceArtifacts: SyntheticAuditConfidence[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAuditConfidenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      auditConfidenceArtifacts,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAuditConfidence(request);
    results.push(result);

    if (result.auditConfidence) {
      auditConfidenceArtifacts.push(result.auditConfidence);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    auditConfidenceArtifacts,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
