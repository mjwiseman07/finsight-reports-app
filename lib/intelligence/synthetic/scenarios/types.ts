export type SyntheticScenarioCategory =
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
  | "government_contracting"
  | "strategic";

export type SyntheticScenarioType =
  | "best_case"
  | "expected_case"
  | "worst_case"
  | "management_case"
  | "stress_case"
  | "upside_case"
  | "downside_case"
  | "custom_case";

export type SyntheticScenarioHorizon =
  | "monthly"
  | "quarterly"
  | "annual"
  | "rolling_3_month"
  | "rolling_6_month"
  | "rolling_12_month"
  | "multi_year";

export type SyntheticScenarioGranularity =
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

export type SyntheticScenarioMethodologyType =
  | "assumption_change"
  | "driver_change"
  | "recommendation_inclusion"
  | "risk_event"
  | "sensitivity_case"
  | "stress_test"
  | "portfolio_case"
  | "manual_case"
  | "hybrid_case";

export type SyntheticScenarioEvidenceStrength = "weak" | "moderate" | "strong" | "compelling";

export type SyntheticScenarioConstraintCategory =
  | "cash_constraint"
  | "staffing_constraint"
  | "capacity_constraint"
  | "funding_constraint"
  | "contract_constraint"
  | "regulatory_constraint"
  | "debt_covenant_constraint"
  | "operational_constraint"
  | "liquidity_constraint";

export type SyntheticScenarioConstraintSeverity = "low" | "moderate" | "high" | "critical" | "unknown";

export type SyntheticScenarioDependencyStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "blocked"
  | "not_applicable"
  | "unknown";

export interface SyntheticScenarioLineage {
  scenarioId: string;
  sourceReferenceIds: string[];
  forecastIds: string[];
  recommendationIds: string[];
  commentaryIds: string[];
  memoryIds: string[];
  assumptionIds: string[];
  driverIds: string[];
  riskIds: string[];
  constraintIds: string[];
  dependencyIds: string[];
  determinismHash?: string;
}

export interface SyntheticScenarioEvidence {
  evidenceId: string;
  sourceReferenceIds: string[];
  supportingForecastIds: string[];
  supportingRecommendationIds: string[];
  supportingCommentaryIds: string[];
  supportingMemoryIds: string[];
  supportingObservationIds: string[];
  supportingPatternIds: string[];
  supportingRiskIds: string[];
  evidenceStrength: SyntheticScenarioEvidenceStrength;
  dataCompletenessScore: number;
  lineage: SyntheticScenarioLineage;
}

export interface SyntheticScenarioMetadata {
  scenarioId: string;
  companyId: string;
  scenarioCategory: SyntheticScenarioCategory;
  scenarioType: SyntheticScenarioType;
  scenarioHorizon: SyntheticScenarioHorizon;
  scenarioGranularity: SyntheticScenarioGranularity;
  scenarioMethodology: SyntheticScenarioMethodologyType;
  confidenceScore: number;
  confidenceReason: string;
  scenarioConfidence: number;
  evidenceStrength: SyntheticScenarioEvidenceStrength;
  dataCompletenessScore: number;
  assumptionConfidence: number;
  driverConfidence: number;
  scenarioRiskScore: number;
}

export interface SyntheticScenarioAssumption {
  assumptionId: string;
  assumptionCategory: string;
  assumptionDescription: string;
  baselineValue?: number | string;
  scenarioValue?: number | string;
  assumptionChange?: number | string;
  assumptionConfidence: number;
  assumptionLineage: string[];
}

export interface SyntheticScenarioDriver {
  driverIds: string[];
  driverCategory: string;
  baselineDriverValue?: number | string;
  scenarioDriverValue?: number | string;
  driverChange?: number | string;
  driverConfidence: number;
  driverStrength: number;
}

export interface SyntheticScenarioImpact {
  revenueImpact?: number;
  expenseImpact?: number;
  marginImpact?: number;
  EBITDAImpact?: number;
  cashImpact?: number;
  workingCapitalImpact?: number;
  inventoryImpact?: number;
  workforceImpact?: number;
  riskImpact?: string;
  taxImpact?: number;
}

export interface SyntheticScenarioRisk {
  riskIds: string[];
  riskCategory: string;
  riskSeverity: string;
  riskProbability: string;
  riskImpact: string;
  riskConfidence: number;
}

export interface SyntheticScenarioConstraint {
  constraintId: string;
  constraintCategory: SyntheticScenarioConstraintCategory;
  constraintDescription: string;
  constraintSeverity: SyntheticScenarioConstraintSeverity;
  constraintSource: string;
  constraintConfidence: number;
}

export interface SyntheticScenarioDependency {
  dependencyId: string;
  dependencyCategory: string;
  dependencyDescription: string;
  dependencyConfidence: number;
  dependencyLineage: string[];
  dependencyStatus: SyntheticScenarioDependencyStatus;
}

export interface SyntheticScenarioFeasibility {
  feasibilityScore?: number;
  feasibilityReason?: string;
  feasibilityConstraints: string[];
  feasibilityConfidence?: number;
}

export interface SyntheticScenarioVersion {
  scenarioVersion?: string;
  priorScenarioVersion?: string;
  scenarioRevisionReason?: string;
  scenarioRevisionDate?: string;
  scenarioChangeDriverIds: string[];
}

export interface SyntheticScenarioPortfolio {
  portfolioId?: string;
  portfolioType?: string;
  scenarioIds: string[];
  portfolioConfidence?: number;
}

export interface SyntheticScenarioComparison {
  scenarioVsForecast?: string;
  scenarioVsBudget?: string;
  scenarioVsPriorScenario?: string;
  scenarioVsActuals?: string;
  scenarioVsManagementCase?: string;
  scenarioVsBoardCase?: string;
}

export interface SyntheticScenarioMethodology {
  methodologyId?: string;
  methodologyCategory: SyntheticScenarioMethodologyType;
  methodologyConfidence: number;
  methodologyReason: string;
  methodologyLineage: string[];
}

export interface SyntheticScenarioDecisionCompatibility {
  decisionId?: string;
  decisionCategory?: string;
  decisionDescription?: string;
}

export interface SyntheticScenarioIndustryCompatibility {
  indirectRateIds?: string[];
  indirectRateAssumptions?: string[];
  changeOrderIds?: string[];
  changeOrderAssumptions?: string[];
  fundingIds?: string[];
  fundingAssumptions?: string[];
  volumeAssumptions?: string[];
  utilizationAssumptions?: string[];
}

export interface SyntheticScenarioTriggerEventCompatibility {
  triggerEventId?: string;
  triggerEventCategory?: string;
  triggerEventProbability?: string;
}

export interface SyntheticScenarioInstitutionalMemoryCompatibility {
  historicalScenarioIds?: string[];
  historicalOutcomeIds?: string[];
  behaviorPatternId?: string;
  behaviorPatternCategory?: string;
  successProbability?: number;
  executionRiskScore?: number;
  organizationalCapacityScore?: number;
  executionBandwidth?: string;
  decisionCollisionIds?: string[];
  collisionCategory?: string;
  memoryAdjustedOutcome?: string;
  historicalRealizationRate?: number;
}

export interface SyntheticScenarioCandidate {
  scenarioId: string;
  companyId: string;
  metadata: SyntheticScenarioMetadata;
  evidence: SyntheticScenarioEvidence[];
  assumptions: SyntheticScenarioAssumption[];
  drivers: SyntheticScenarioDriver[];
  impacts: SyntheticScenarioImpact;
  risks: SyntheticScenarioRisk[];
  constraints: SyntheticScenarioConstraint[];
  dependencies: SyntheticScenarioDependency[];
  feasibility?: SyntheticScenarioFeasibility;
  version?: SyntheticScenarioVersion;
  portfolio?: SyntheticScenarioPortfolio;
  comparison?: SyntheticScenarioComparison;
  methodology: SyntheticScenarioMethodology;
  decisionCompatibility?: SyntheticScenarioDecisionCompatibility;
  industryCompatibility?: SyntheticScenarioIndustryCompatibility;
  triggerEventCompatibility?: SyntheticScenarioTriggerEventCompatibility;
  institutionalMemoryCompatibility?: SyntheticScenarioInstitutionalMemoryCompatibility;
  lineage: SyntheticScenarioLineage;
  warnings: string[];
}
