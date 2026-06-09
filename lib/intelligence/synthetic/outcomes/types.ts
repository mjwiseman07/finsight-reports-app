export type SyntheticOutcomeCategory =
  | "decision_outcome"
  | "recommendation_outcome"
  | "forecast_outcome"
  | "scenario_outcome"
  | "controller_outcome"
  | "firm_portfolio_outcome"
  | "capability_outcome"
  | "adoption_outcome"
  | "intervention_outcome"
  | "time_savings_outcome"
  | "organizational_knowledge_outcome";

export type SyntheticOutcomeStatus =
  | "pending_observation"
  | "observed"
  | "partially_observed"
  | "validated"
  | "disputed"
  | "inconclusive"
  | "expired"
  | "not_applicable";

export type SyntheticOutcomeResultCategory =
  | "successful"
  | "partially_successful"
  | "unsuccessful"
  | "neutral"
  | "mixed"
  | "unknown";

export type SyntheticOutcomeEvidenceStrength = "weak" | "moderate" | "strong" | "compelling" | "insufficient";

export type SyntheticOutcomeConfidenceCategory =
  | "high_confidence"
  | "medium_confidence"
  | "low_confidence"
  | "insufficient_evidence"
  | "unknown";

export type SyntheticOutcomeTrustCategory =
  | "trusted"
  | "needs_review"
  | "degraded"
  | "blocked"
  | "unknown";

export type SyntheticOutcomeGovernanceStatus =
  | "candidate"
  | "under_review"
  | "approved"
  | "rejected"
  | "retired"
  | "not_required";

export type SyntheticOutcomeMemoryCompatibilityCategory =
  | "memory_eligible"
  | "memory_pending_review"
  | "memory_ineligible"
  | "memory_not_required";

export type SyntheticOutcomeLearningCompatibilityCategory =
  | "learning_eligible"
  | "learning_pending_review"
  | "learning_ineligible"
  | "learning_not_required";

export interface SyntheticOutcomeScope {
  companyId: string;
  firmId?: string;
  clientId?: string;
  portfolioId?: string;
  entityId?: string;
  userId?: string;
  customerIsolationRequired: boolean;
  firmIsolationRequired: boolean;
  clientIsolationRequired: boolean;
  isolationBoundaryIds: string[];
}

export interface SyntheticOutcomeMetadata {
  outcomeId: string;
  companyId: string;
  outcomeCategory: SyntheticOutcomeCategory;
  outcomeStatus: SyntheticOutcomeStatus;
  resultCategory: SyntheticOutcomeResultCategory;
  observedAt?: string;
  sourceArtifactIds: string[];
  relatedDecisionIds: string[];
  relatedRecommendationIds: string[];
  relatedForecastIds: string[];
  relatedScenarioIds: string[];
  relatedControllerItemIds: string[];
  relatedPortfolioItemIds: string[];
}

export interface SyntheticOutcomeEvidenceReferences {
  evidenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  supportingDecisionIds: string[];
  supportingRecommendationIds: string[];
  supportingForecastIds: string[];
  supportingScenarioIds: string[];
  supportingControllerIds: string[];
  supportingPortfolioIds: string[];
  supportingInterventionIds: string[];
  supportingMemoryIds: string[];
  supportingOutcomeIds: string[];
  evidenceStrength: SyntheticOutcomeEvidenceStrength;
}

export interface SyntheticOutcomeConfidenceMetadata {
  confidenceCategory: SyntheticOutcomeConfidenceCategory;
  confidenceReason?: string;
  confidenceEvidenceIds: string[];
  confidenceSourceReferenceIds: string[];
  confidenceReviewRequired: boolean;
}

export interface SyntheticOutcomeTrustMetadata {
  trustCategory: SyntheticOutcomeTrustCategory;
  trustReason?: string;
  trustEvidenceIds: string[];
  trustSourceReferenceIds: string[];
  trustReviewRequired: boolean;
}

export interface SyntheticOutcomeGovernanceMetadata {
  governanceStatus: SyntheticOutcomeGovernanceStatus;
  governanceReason?: string;
  governanceBoundaryIds: string[];
  governanceEvidenceIds: string[];
  governanceReviewRequired: boolean;
}

export interface SyntheticOutcomeMemoryCompatibility {
  memoryCompatibilityCategory: SyntheticOutcomeMemoryCompatibilityCategory;
  memoryReferenceIds: string[];
  companyMemoryIds: string[];
  historicalMemoryIds: string[];
  memoryEvidenceIds: string[];
  memorySourceReferenceIds: string[];
  memoryReviewRequired: boolean;
}

export interface SyntheticOutcomeLearningCompatibility {
  learningCompatibilityCategory: SyntheticOutcomeLearningCompatibilityCategory;
  learningReferenceIds: string[];
  relatedOutcomeIds: string[];
  relatedMemoryIds: string[];
  relatedCapabilityIds: string[];
  relatedAdoptionIds: string[];
  relatedInterventionIds: string[];
  learningEvidenceIds: string[];
  learningSourceReferenceIds: string[];
  learningReviewRequired: boolean;
}

export interface SyntheticOutcomeContract {
  metadata: SyntheticOutcomeMetadata;
  scope: SyntheticOutcomeScope;
  evidence: SyntheticOutcomeEvidenceReferences;
  confidenceMetadata?: SyntheticOutcomeConfidenceMetadata;
  trustMetadata?: SyntheticOutcomeTrustMetadata;
  governanceMetadata?: SyntheticOutcomeGovernanceMetadata;
  memoryCompatibility?: SyntheticOutcomeMemoryCompatibility;
  learningCompatibility?: SyntheticOutcomeLearningCompatibility;
}
