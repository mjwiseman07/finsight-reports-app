export type SyntheticForecastCategory =
  | "revenue"
  | "expense"
  | "payroll"
  | "workforce"
  | "cash"
  | "working_capital"
  | "inventory"
  | "treasury"
  | "tax"
  | "healthcare"
  | "manufacturing"
  | "construction"
  | "municipality"
  | "strategic";

export type SyntheticForecastHorizon =
  | "monthly"
  | "quarterly"
  | "annual"
  | "rolling_3_month"
  | "rolling_6_month"
  | "rolling_12_month"
  | "multi_year";

export type SyntheticForecastMethodologyType =
  | "trend_based"
  | "driver_based"
  | "workforce_based"
  | "contract_based"
  | "project_based"
  | "budget_based"
  | "historical_actual_based"
  | "manual_override"
  | "hybrid";

export type SyntheticForecastGranularityLevel =
  | "enterprise"
  | "consolidated"
  | "entity"
  | "segment"
  | "business_unit"
  | "department"
  | "location"
  | "facility"
  | "project"
  | "contract"
  | "fund"
  | "account_group"
  | "general_ledger_account";

export type SyntheticForecastSource =
  | "system_forecast"
  | "management_forecast"
  | "budget_forecast"
  | "board_forecast";

export type SyntheticForecastEvidenceStrength = "weak" | "moderate" | "strong" | "compelling";

export type SyntheticForecastRiskSeverity = "low" | "moderate" | "high" | "critical" | "unknown";

export type SyntheticForecastRiskProbability = "low" | "medium" | "high" | "unknown";

export type SyntheticForecastBiasDirection = "over_forecast" | "under_forecast" | "neutral" | "unknown";

export type SyntheticForecastBiasCategory = "optimistic_bias" | "pessimistic_bias" | "neutral_bias";

export type SyntheticForecastReviewStatus =
  | "not_started"
  | "in_review"
  | "changes_requested"
  | "reviewed"
  | "not_required";

export type SyntheticForecastApprovalStatus =
  | "not_submitted"
  | "pending"
  | "approved"
  | "rejected"
  | "not_required";

export type SyntheticForecastApprovalLevel =
  | "department_review"
  | "controller_review"
  | "cfo_review"
  | "executive_review"
  | "board_review";

export interface SyntheticForecastLineage {
  forecastId: string;
  sourceReferenceIds: string[];
  assumptionIds: string[];
  driverIds: string[];
  recommendationIds: string[];
  riskIds: string[];
  priorForecastIds: string[];
  determinismHash?: string;
}

export interface SyntheticForecastEvidence {
  evidenceId: string;
  sourceReferenceIds: string[];
  supportingObservationIds: string[];
  supportingPatternIds: string[];
  supportingMemoryIds: string[];
  supportingCommentaryIds: string[];
  supportingRecommendationIds: string[];
  evidenceStrength: SyntheticForecastEvidenceStrength;
  dataCompletenessScore: number;
  lineage: SyntheticForecastLineage;
}

export interface SyntheticForecastAssumption {
  assumptionId: string;
  assumptionCategory: string;
  assumptionDescription: string;
  assumptionConfidence: number;
  assumptionSource: string;
  assumptionLineage: string[];
}

export interface SyntheticForecastDriver {
  forecastDriverIds: string[];
  driverCategory: string;
  driverConfidence: number;
  driverStrength: number;
}

export interface SyntheticForecastRisk {
  riskIds: string[];
  riskSeverity: SyntheticForecastRiskSeverity;
  riskProbability: SyntheticForecastRiskProbability;
  riskImpact: string;
  riskConfidence: number;
}

export interface SyntheticForecastAccuracy {
  forecastAccuracyScore?: number;
  forecastAccuracyPercent?: number;
  forecastAccuracyTrend?: string;
  forecastError?: number;
}

export interface SyntheticForecastReliability {
  forecastReliabilityScore?: number;
  forecastReliabilityReason?: string;
  historicalForecastConsistency?: number;
}

export interface SyntheticForecastVersion {
  forecastVersion?: string;
  priorForecastVersion?: string;
  forecastRevisionReason?: string;
  forecastDelta?: number;
}

export interface SyntheticForecastConsensus {
  forecastConsensus?: string;
  forecastVarianceToBudget?: number;
  forecastVarianceToManagement?: number;
  forecastVarianceToBoard?: number;
}

export interface SyntheticForecastSensitivity {
  forecastDriverSensitivity?: Record<string, number>;
  forecastDriverImpactRank?: string[];
  sensitivityScore?: number;
}

export interface SyntheticForecastOutcome {
  outcomeId?: string;
  actualValue?: number;
  forecastValue?: number;
  forecastVariance?: number;
  outcomePeriodKey?: string;
  outcomeConfidence?: number;
}

export interface SyntheticForecastMethodology {
  methodologyId: string;
  methodologyCategory: SyntheticForecastMethodologyType;
  methodologyConfidence: number;
  methodologyReason: string;
  methodologyLineage: string[];
}

export interface SyntheticForecastGranularity {
  forecastSourceLevel: SyntheticForecastGranularityLevel;
  forecastRollupLevel?: SyntheticForecastGranularityLevel;
  forecastLineage: string[];
  accountNumber?: string;
  accountDescription?: string;
  accountType?: string;
  accountGroup?: string;
  financialStatementClassification?: string;
}

export interface SyntheticForecastBias {
  forecastBiasDirection?: SyntheticForecastBiasDirection;
  forecastBiasMagnitude?: number;
  forecastBiasConfidence?: number;
  forecastBiasCategory?: SyntheticForecastBiasCategory;
  forecastBiasTrend?: string;
}

export interface SyntheticForecastSeasonality {
  seasonalityFactor?: number;
  seasonalityPattern?: string;
  seasonalityConfidence?: number;
  seasonalityPeriod?: string;
  seasonalityStrength?: number;
}

export interface SyntheticForecastMacroeconomicContext {
  macroeconomicIndicatorIds?: string[];
  macroeconomicAssumptions?: string[];
  macroeconomicConfidence?: number;
  macroeconomicSource?: string;
}

export interface SyntheticForecastApproval {
  forecastReviewStatus?: SyntheticForecastReviewStatus;
  forecastApprovalStatus?: SyntheticForecastApprovalStatus;
  forecastApprovalLevel?: SyntheticForecastApprovalLevel;
  forecastApprovalDate?: string;
  forecastApprovalLineage?: string[];
}

export interface SyntheticForecastMetadata {
  forecastId: string;
  companyId: string;
  forecastCategory: SyntheticForecastCategory;
  forecastHorizon: SyntheticForecastHorizon;
  forecastMethodology: SyntheticForecastMethodologyType;
  forecastGranularity: SyntheticForecastGranularityLevel;
  forecastSource: SyntheticForecastSource;
  confidenceScore: number;
  confidenceReason: string;
  forecastConfidence: number;
  evidenceStrength: SyntheticForecastEvidenceStrength;
  dataCompletenessScore: number;
  historicalStabilityScore: number;
  forecastRiskScore: number;
}

export interface SyntheticForecastCandidate {
  forecastId: string;
  companyId: string;
  metadata: SyntheticForecastMetadata;
  evidence: SyntheticForecastEvidence[];
  assumptions: SyntheticForecastAssumption[];
  drivers: SyntheticForecastDriver[];
  risks: SyntheticForecastRisk[];
  outcome?: SyntheticForecastOutcome;
  methodology: SyntheticForecastMethodology;
  granularity: SyntheticForecastGranularity;
  version?: SyntheticForecastVersion;
  consensus?: SyntheticForecastConsensus;
  sensitivity?: SyntheticForecastSensitivity;
  reliability?: SyntheticForecastReliability;
  accuracy?: SyntheticForecastAccuracy;
  bias?: SyntheticForecastBias;
  seasonality?: SyntheticForecastSeasonality;
  macroeconomicContext?: SyntheticForecastMacroeconomicContext;
  approval?: SyntheticForecastApproval;
  warnings: string[];
}
