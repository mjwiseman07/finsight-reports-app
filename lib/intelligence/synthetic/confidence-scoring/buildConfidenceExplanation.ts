import type { SyntheticConfidenceExplanation, SyntheticConfidenceReasonCode, SyntheticConfidenceScore } from "../types/confidence";

const dataGapCodes = new Set<SyntheticConfidenceReasonCode>([
  "history_under_12_months",
  "supporting_schedule_missing",
  "cash_flow_missing",
  "industry_benchmark_unavailable",
  "company_memory_missing",
]);

export function buildConfidenceExplanation(score: SyntheticConfidenceScore): SyntheticConfidenceExplanation {
  const strengtheningFactors = score.factors.filter((factor) => factor.factorContribution > 0);
  const limitingFactors = score.factors.filter((factor) => factor.factorContribution < 0);
  const neutralFactors = score.factors.filter((factor) => factor.factorContribution === 0);
  return {
    confidenceScore: score.score,
    confidenceTier: score.tier,
    explanationCodes: score.explanationCodes,
    strengtheningFactors,
    limitingFactors,
    neutralFactors,
    dataGaps: score.explanationCodes.filter((code) => dataGapCodes.has(code)),
  };
}
