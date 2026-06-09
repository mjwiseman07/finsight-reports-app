import {
  buildAuditFinding,
  type BuildAuditFindingInput,
  type BuildAuditFindingResult,
  type SyntheticAuditFinding,
} from "./buildAuditFinding";

export interface BuildAuditFindingsInput {
  requests: BuildAuditFindingInput[];
}

export interface BuildAuditFindingsResult {
  auditFindings: SyntheticAuditFinding[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAuditFindingResult[];
}

export function buildAuditFindings(input: BuildAuditFindingsInput): BuildAuditFindingsResult {
  const auditFindings: SyntheticAuditFinding[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAuditFindingResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      auditFindings,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAuditFinding(request);
    results.push(result);

    if (result.auditFinding) {
      auditFindings.push(result.auditFinding);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    auditFindings,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
