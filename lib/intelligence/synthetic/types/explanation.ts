import type { SyntheticConfidenceTier } from "./confidence";

export type SyntheticExplanationConfidence = "low" | "medium" | "high";
export type SyntheticExplanationTone = "concise" | "technical" | "advisor";
export type SyntheticExplanationLanguageCategory = "trend" | "risk" | "observation" | "driver" | "limitation";
export type SyntheticRecommendationActionType = "review" | "investigate" | "analyze";
export type SyntheticExplanationCitationSourceType = "recommendation" | "signal" | "metric" | "evidence" | "trace" | "root_cause";
export type SyntheticForbiddenExplanationCategory = "forecast" | "budget" | "scenario" | "roi" | "guarantee" | "execution" | "prediction";

export interface SyntheticExplanationCitation {
  citationId: string;
  sourceType: SyntheticExplanationCitationSourceType;
  sourceId: string;
}

export interface SyntheticExplanationClaimRegistryEntry {
  claimType: string;
  allowedEvidenceTypes: SyntheticExplanationCitationSourceType[];
  allowedLanguageCategories: SyntheticExplanationLanguageCategory[];
  disallowedLanguageCategories: SyntheticForbiddenExplanationCategory[];
}

export interface SyntheticRecommendationActionRegistryEntry {
  recommendationType: string;
  allowedActionTypes: SyntheticRecommendationActionType[];
  allowedExplanationContexts: SyntheticExplanationLanguageCategory[];
  disallowedActionTypes: Array<"execute" | "guarantee" | "predict">;
}

export interface SyntheticExplanationLineage {
  explanationId: string;
  recommendationId: string;
  sourceSignalIds: string[];
  sourceMetricIds: string[];
  evidenceIds: string[];
  calculationTraceIds: string[];
  correlationGroupId?: string;
}

export interface SyntheticExplanationGuardrailCheck {
  code: string;
  passed: boolean;
  blockedClaim?: string;
}

export interface SyntheticExplanationGuardrailResult {
  status: "passed" | "failed";
  passedChecks: string[];
  failedChecks: string[];
  blockedClaims: string[];
}

export interface SyntheticAIExplanationObject {
  explanationId: string;
  recommendationId: string;
  recommendationType: string;
  claimType: string;
  languageCategory: SyntheticExplanationLanguageCategory;
  actionType: SyntheticRecommendationActionType;
  confidenceScore: number;
  confidenceTier: SyntheticConfidenceTier;
  explanationConfidence: SyntheticExplanationConfidence;
  explanationSummary: string;
  keyDrivers: string[];
  evidenceCitations: SyntheticExplanationCitation[];
  limitationCodes: string[];
  sourceSignalIds: string[];
  sourceMetricIds: string[];
  evidenceIds: string[];
  calculationTraceIds: string[];
  rootCauseSignalIds: string[];
  correlationGroupId?: string;
  recommendationLineageId: string;
  explanationLineage: SyntheticExplanationLineage;
  explanationGuardrailResult: SyntheticExplanationGuardrailResult;
  guardrailChecks: SyntheticExplanationGuardrailCheck[];
  createdAt: string;
}
