import {
  buildAuditCandidate,
  type BuildAuditCandidateInput,
  type BuildAuditCandidateResult,
  type SyntheticAuditCandidate,
} from "./buildAuditCandidate";

export interface BuildAuditCandidatesInput {
  requests: BuildAuditCandidateInput[];
}

export interface BuildAuditCandidatesResult {
  auditCandidates: SyntheticAuditCandidate[];
  skippedRequestIndexes: number[];
  warnings: string[];
  results: BuildAuditCandidateResult[];
}

export function buildAuditCandidates(input: BuildAuditCandidatesInput): BuildAuditCandidatesResult {
  const auditCandidates: SyntheticAuditCandidate[] = [];
  const skippedRequestIndexes: number[] = [];
  const warnings: string[] = [];
  const results: BuildAuditCandidateResult[] = [];

  if (!Array.isArray(input.requests)) {
    return {
      auditCandidates,
      skippedRequestIndexes,
      warnings: ["requests must be an array."],
      results,
    };
  }

  input.requests.forEach((request, index) => {
    const result = buildAuditCandidate(request);
    results.push(result);

    if (result.auditCandidate) {
      auditCandidates.push(result.auditCandidate);
      return;
    }

    skippedRequestIndexes.push(index);
    for (const warning of result.warnings) {
      warnings.push(`request[${index}]: ${warning}`);
    }
  });

  return {
    auditCandidates,
    skippedRequestIndexes,
    warnings,
    results,
  };
}
