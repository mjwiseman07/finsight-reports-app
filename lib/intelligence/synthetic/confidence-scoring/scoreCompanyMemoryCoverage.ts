import type { SyntheticCompanyMemoryRecord } from "../types/company-memory";
import type { SyntheticConfidenceFactor } from "../types/confidence";

export function scoreCompanyMemoryCoverage(records: SyntheticCompanyMemoryRecord[] = []): SyntheticConfidenceFactor[] {
  if (!records.length) {
    return [{ code: "company_memory_missing", label: "Company Memory", impact: "neutral", factorContribution: 0 }];
  }
  const hasRecurringPattern = records.some((record) => record.recordType === "recurring_pattern");
  const hasAdvisorFeedback = records.some((record) => record.recordType === "advisor_feedback");
  const contribution = 0.05 + (hasRecurringPattern ? 0.03 : 0) + (hasAdvisorFeedback ? 0.02 : 0);
  return [{ code: "company_memory_present", label: "Company Memory", impact: "positive", factorContribution: Number(contribution.toFixed(2)) }];
}
