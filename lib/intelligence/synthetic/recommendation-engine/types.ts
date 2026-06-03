import type {
  SyntheticRecommendationCategory,
  SyntheticRecommendationCandidate,
  SyntheticRecommendationImpactCategory,
  SyntheticRecommendationImpactConfidence,
} from "../types/recommendation";
import type { SyntheticSignalCandidate } from "../types/signal";

export interface SyntheticRecommendationImpactModel {
  expectedImpactCategory: SyntheticRecommendationImpactCategory;
  expectedImpactConfidence: SyntheticRecommendationImpactConfidence;
  affectedMetricIds: string[];
}

export interface SyntheticRecommendationCandidateInput {
  recommendationType: string;
  category: SyntheticRecommendationCategory;
  sourceSignals: SyntheticSignalCandidate[];
  createdAt: string;
  impact: SyntheticRecommendationImpactModel;
  relatedRecommendationIds?: string[];
}

export interface SyntheticRecommendationPriorityScore {
  priorityScore: number;
  priority: "low" | "medium" | "high" | "critical";
}

export type SyntheticRecommendationCandidateBuilder = (signals: SyntheticSignalCandidate[], createdAt: string) => SyntheticRecommendationCandidate[];
