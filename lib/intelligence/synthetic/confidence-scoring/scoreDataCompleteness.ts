import type { SyntheticConfidenceFactor } from "../types/confidence";

export interface SyntheticDataCompletenessInput {
  hasCoreStatements: boolean;
  hasCashFlow?: boolean;
  missingRequiredEvidence?: boolean;
  missingOptionalSchedules?: number;
}

export function scoreDataCompleteness(input: SyntheticDataCompletenessInput): SyntheticConfidenceFactor[] {
  const factors: SyntheticConfidenceFactor[] = [];
  factors.push({
    code: input.hasCoreStatements ? "core_statements_available" : "supporting_schedule_missing",
    label: input.hasCoreStatements ? "Core Statements" : "Missing Core Statements",
    impact: input.hasCoreStatements ? "positive" : "negative",
    factorContribution: input.hasCoreStatements ? 0.2 : -0.3,
  });
  if (!input.hasCashFlow) {
    factors.push({ code: "cash_flow_missing", label: "Missing Cash Flow", impact: "negative", factorContribution: -0.1 });
  }
  if (input.missingRequiredEvidence) {
    factors.push({ code: "supporting_schedule_missing", label: "Missing Required Evidence", impact: "negative", factorContribution: -0.2 });
  } else if (input.missingOptionalSchedules) {
    factors.push({ code: "supporting_schedule_missing", label: "Missing Optional Schedules", impact: "negative", factorContribution: -0.05 });
  }
  return factors;
}
