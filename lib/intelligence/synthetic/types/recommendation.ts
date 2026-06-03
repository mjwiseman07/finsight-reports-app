import type { SyntheticConfidenceScore } from "./confidence";
import type { SyntheticRootCauseCandidate, SyntheticSignalSeverity } from "./signal";

export type SyntheticRecommendationCategory =
  | "revenue"
  | "expense"
  | "margin"
  | "cash"
  | "working_capital"
  | "operations"
  | "concentration"
  | "benchmark";

export type SyntheticRecommendationPriority = "low" | "medium" | "high" | "critical";
export type SyntheticRecommendationCandidateStatus = "candidate" | "acknowledged" | "dismissed" | "converted" | "expired";
export type SyntheticRecommendationImpactCategory = SyntheticRecommendationCategory;
export type SyntheticRecommendationImpactConfidence = "low" | "medium" | "high";

export interface SyntheticRecommendationLineage {
  recommendationId: string;
  sourceSignalIds: string[];
  sourceMetricIds: string[];
  evidenceIds: string[];
  calculationTraceIds: string[];
  rootCauseSignalIds: string[];
  correlationGroupId?: string;
}

export interface SyntheticRecommendationCandidate {
  recommendationId: string;
  category: SyntheticRecommendationCategory;
  recommendationType: string;
  priority: SyntheticRecommendationPriority;
  priorityScore: number;
  severity: SyntheticSignalSeverity;
  confidence: SyntheticConfidenceScore;
  sourceSignalIds: string[];
  evidenceIds: string[];
  calculationTraceIds: string[];
  sourceMetricIds: string[];
  correlationGroupId?: string;
  relatedRecommendationIds: string[];
  rootCauseCandidate?: SyntheticRootCauseCandidate;
  rootCauseSignalIds: string[];
  expectedImpactCategory: SyntheticRecommendationImpactCategory;
  expectedImpactConfidence: SyntheticRecommendationImpactConfidence;
  affectedMetricIds: string[];
  recommendationLineage: SyntheticRecommendationLineage;
  status: SyntheticRecommendationCandidateStatus;
  createdAt: string;
}
