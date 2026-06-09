import {
  buildAuditEvidence,
  type BuildAuditEvidenceInput,
  type BuildAuditEvidenceResult,
  type SyntheticAuditEvidencePackage,
} from "./buildAuditEvidence";

export interface BuildAuditEvidenceCollectionInput {
  requests: BuildAuditEvidenceInput[];
}

export interface BuildAuditEvidenceCollectionResult {
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAuditEvidenceResult[];
}

export function buildAuditEvidenceCollection(
  input: BuildAuditEvidenceCollectionInput,
): BuildAuditEvidenceCollectionResult {
  const auditEvidencePackages: SyntheticAuditEvidencePackage[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAuditEvidenceResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      auditEvidencePackages,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAuditEvidence(request);
    results.push(result);

    if (result.auditEvidencePackage) {
      auditEvidencePackages.push(result.auditEvidencePackage);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    auditEvidencePackages,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
