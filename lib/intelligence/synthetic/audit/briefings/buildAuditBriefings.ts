import {
  buildAuditBriefing,
  type BuildAuditBriefingInput,
  type BuildAuditBriefingResult,
  type SyntheticAuditBriefing,
} from "./buildAuditBriefing";

export interface BuildAuditBriefingsInput {
  requests: BuildAuditBriefingInput[];
}

export interface BuildAuditBriefingsResult {
  auditBriefings: SyntheticAuditBriefing[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAuditBriefingResult[];
}

export function buildAuditBriefings(input: BuildAuditBriefingsInput): BuildAuditBriefingsResult {
  const auditBriefings: SyntheticAuditBriefing[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAuditBriefingResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      auditBriefings,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAuditBriefing(request);
    results.push(result);

    if (result.auditBriefing) {
      auditBriefings.push(result.auditBriefing);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    auditBriefings,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
