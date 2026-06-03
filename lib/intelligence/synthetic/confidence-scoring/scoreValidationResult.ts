import type { SyntheticConfidenceFactor } from "../types/confidence";

export interface SyntheticValidationConfidenceInput {
  readyForReporting: boolean;
  warningCount?: number;
}

export function scoreValidationResult(input: SyntheticValidationConfidenceInput): SyntheticConfidenceFactor[] {
  if (!input.readyForReporting) {
    return [{ code: "validation_warning_present", label: "Validation Readiness", impact: "negative", factorContribution: -0.35 }];
  }
  const warningCount = Number(input.warningCount || 0);
  if (warningCount > 0) {
    return [{ code: "validation_warnings_present", label: "Validation Warnings", impact: "negative", factorContribution: Math.max(-0.2, warningCount * -0.05) }];
  }
  return [{ code: "core_statements_available", label: "Validation Readiness", impact: "positive", factorContribution: 0.1 }];
}
