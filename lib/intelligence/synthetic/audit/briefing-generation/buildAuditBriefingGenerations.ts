import {
  buildAuditBriefingGeneration,
  type BuildAuditBriefingGenerationInput,
  type BuildAuditBriefingGenerationResult,
  type SyntheticAuditBriefingGeneration,
} from "./buildAuditBriefingGeneration";

export interface BuildAuditBriefingGenerationsInput {
  requests: BuildAuditBriefingGenerationInput[];
}

export interface BuildAuditBriefingGenerationsResult {
  auditBriefingGenerations: SyntheticAuditBriefingGeneration[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAuditBriefingGenerationResult[];
}

export function buildAuditBriefingGenerations(
  input: BuildAuditBriefingGenerationsInput,
): BuildAuditBriefingGenerationsResult {
  const auditBriefingGenerations: SyntheticAuditBriefingGeneration[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAuditBriefingGenerationResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      auditBriefingGenerations,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAuditBriefingGeneration(request);
    results.push(result);

    if (result.auditBriefingGeneration) {
      auditBriefingGenerations.push(result.auditBriefingGeneration);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    auditBriefingGenerations,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
