export type SyntheticRecommendationCategory =
  | "revenue"
  | "expense"
  | "payroll"
  | "workforce"
  | "cash"
  | "working_capital"
  | "inventory"
  | "procurement"
  | "customer"
  | "treasury"
  | "tax"
  | "healthcare"
  | "manufacturing"
  | "construction"
  | "municipality"
  | "strategic";

export type SyntheticRecommendationType =
  | "efficiency_recommendation"
  | "risk_mitigation_recommendation"
  | "working_capital_recommendation"
  | "growth_recommendation"
  | "margin_recommendation"
  | "compliance_recommendation"
  | "strategic_recommendation"
  | "operational_recommendation"
  | "cash_flow_recommendation"
  | "workforce_recommendation";

export type SyntheticRecommendationAudience =
  | "cfo"
  | "controller"
  | "accounting_manager"
  | "operations"
  | "board"
  | "executive";

export type SyntheticRecommendationActionabilityType =
  | "informational_recommendation"
  | "review_recommendation"
  | "action_recommendation"
  | "decision_recommendation"
  | "escalation_recommendation";

export type SyntheticRecommendationEffortLevel = "low" | "medium" | "high";

export type SyntheticRecommendationTimeframe = "short_term" | "medium_term" | "long_term";

export type SyntheticRecommendationOwnershipType =
  | "finance"
  | "accounting"
  | "controller"
  | "cfo"
  | "operations"
  | "treasury"
  | "revenue_cycle"
  | "supply_chain"
  | "procurement"
  | "hr"
  | "executive_team"
  | "department_leader"
  | "board";

export type SyntheticRecommendationOutcomeStatus =
  | "successful"
  | "partially_successful"
  | "unsuccessful"
  | "inconclusive"
  | "insufficient_data";

export type SyntheticRecommendationMaterialityStatus =
  | "immaterial"
  | "monitor"
  | "material"
  | "highly_material"
  | "unknown";

export type SyntheticRecommendationEvidenceStrength = "weak" | "moderate" | "strong" | "compelling";

export type SyntheticRecommendationConflictSeverity = "low" | "medium" | "high" | "critical" | "unknown";

export type SyntheticRecommendationGovernanceStatus =
  | "candidate"
  | "under_review"
  | "approved"
  | "rejected"
  | "retired";

export type SyntheticRecommendationRefreshStatus =
  | "current"
  | "stale"
  | "needs_review"
  | "needs_reprocessing"
  | "superseded_by_new_data"
  | "superseded_by_new_rule";

export interface SyntheticRecommendationLineage {
  recommendationId: string;
  sourceReferenceIds: string[];
  commentaryIds: string[];
  observationIds: string[];
  patternIds: string[];
  memoryIds: string[];
  driverReferenceIds: string[];
  determinismHash?: string;
}

export interface SyntheticRecommendationEvidence {
  evidenceId: string;
  supportingObservationIds: string[];
  supportingPatternIds: string[];
  supportingMemoryIds: string[];
  supportingCommentaryIds: string[];
  supportingDriverIds: string[];
  supportingSourceReferenceIds: string[];
  evidenceStrength: SyntheticRecommendationEvidenceStrength;
  dataCompletenessScore: number;
  lineage: SyntheticRecommendationLineage;
}

export interface SyntheticRecommendationMetadata {
  recommendationId: string;
  companyId: string;
  recommendationCategory: SyntheticRecommendationCategory;
  recommendationType: SyntheticRecommendationType;
  audience: SyntheticRecommendationAudience;
  actionabilityType: SyntheticRecommendationActionabilityType;
  materialityStatus: SyntheticRecommendationMaterialityStatus;
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: SyntheticRecommendationEvidenceStrength;
  dataCompletenessScore: number;
  governanceStatus: SyntheticRecommendationGovernanceStatus;
  refreshStatus: SyntheticRecommendationRefreshStatus;
  lineage: SyntheticRecommendationLineage;
}

export interface SyntheticRecommendationImpact {
  estimatedCashImpact?: number;
  estimatedMarginImpact?: number;
  estimatedRevenueImpact?: number;
  estimatedCostImpact?: number;
  estimatedWorkingCapitalImpact?: number;
  estimatedRiskReduction?: number;
  impactConfidence: number;
  impactAssumptions: string[];
  impactLimitations: string[];
}

export interface SyntheticRecommendationEffort {
  effortLevel: SyntheticRecommendationEffortLevel;
  implementationComplexity: string;
  expectedTimeframe: SyntheticRecommendationTimeframe;
  requiredResources: string[];
  dependencyCount: number;
  organizationalChangeRequired: boolean;
}

export interface SyntheticRecommendationOwnership {
  ownershipType: SyntheticRecommendationOwnershipType;
  ownershipReason: string;
  suggestedOnly: boolean;
}

export interface SyntheticRecommendationDependency {
  dependencyIds: string[];
  dependencyType: string;
  dependencyDescription: string;
  blockingDependency: boolean;
  optionalDependency: boolean;
}

export interface SyntheticRecommendationConflict {
  conflictingRecommendationIds: string[];
  conflictType: string;
  conflictReason: string;
  conflictSeverity: SyntheticRecommendationConflictSeverity;
  conflictResolutionRequired: boolean;
}

export interface SyntheticRecommendationOutcome {
  recommendationOutcomeStatus: SyntheticRecommendationOutcomeStatus;
  expectedImpact?: number;
  actualImpact?: number;
  impactVariance?: number;
  outcomeConfidence: number;
  outcomeMeasurementPeriod?: string;
  outcomeNotes: string[];
  outcomeEvidence: string[];
  outcomeLineage?: SyntheticRecommendationLineage;
}

export interface SyntheticRecommendationPortfolio {
  portfolioId: string;
  recommendationIds: string[];
  totalEstimatedCashImpact?: number;
  totalEstimatedMarginImpact?: number;
  totalEstimatedRevenueImpact?: number;
  totalEstimatedRiskReduction?: number;
  portfolioView: string;
  lineage: SyntheticRecommendationLineage;
}

export interface SyntheticRecommendationSimulationCompatibility {
  simulationEligible: boolean;
  simulationAssumptions: string[];
  simulationInputs: string[];
  simulationDependencies: string[];
  simulationConstraints: string[];
  simulationConfidence: number;
  simulationReadiness: string;
}

export interface SyntheticRecommendationCandidate {
  recommendationId: string;
  companyId: string;
  metadata: SyntheticRecommendationMetadata;
  evidence: SyntheticRecommendationEvidence[];
  impact: SyntheticRecommendationImpact;
  effort: SyntheticRecommendationEffort;
  ownership: SyntheticRecommendationOwnership[];
  dependencies: SyntheticRecommendationDependency[];
  conflicts: SyntheticRecommendationConflict[];
  outcome?: SyntheticRecommendationOutcome;
  portfolio?: SyntheticRecommendationPortfolio;
  simulationCompatibility: SyntheticRecommendationSimulationCompatibility;
  warnings: string[];
}
