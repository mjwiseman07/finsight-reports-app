import type { SyntheticExplanationReviewQueueItem, SyntheticReviewRiskCategory, SyntheticStoredExplanationRecord } from "../types/explanation-persistence";

export function resolveReviewPriority(record: SyntheticStoredExplanationRecord): SyntheticExplanationReviewQueueItem["priority"] {
  if (record.explanationGuardrailResult.status === "failed") return "critical";
  if (record.explanationConfidence === "low") return "high";
  if (record.explanationObject.confidenceTier === "low") return "high";
  if (record.explanationObject.recommendationType.includes("liquidity")) return "high";
  return "medium";
}

export function resolveReviewRiskCategory(record: SyntheticStoredExplanationRecord): SyntheticReviewRiskCategory {
  if (record.explanationGuardrailResult.status === "failed") return "compliance";
  if (record.recommendationType.includes("working_capital")) return "working_capital";
  if (record.recommendationType.includes("liquidity") || record.explanationObject.sourceMetricIds.includes("cash")) return "liquidity";
  if (record.recommendationType.includes("margin")) return "margin";
  if (record.recommendationType.includes("healthcare")) return "healthcare";
  if (record.confidenceScore < 0.6) return "financial";
  return "informational";
}
