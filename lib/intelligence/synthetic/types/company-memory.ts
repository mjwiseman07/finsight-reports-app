export type SyntheticCompanyMemoryType =
  | "recurring_pattern"
  | "known_seasonality"
  | "entity_alias"
  | "advisor_feedback"
  | "recommendation_outcome"
  | "threshold_override"
  | "operational_note"
  | "industry_override"
  | "company_context";

export type SyntheticCompanyMemoryRecordType = SyntheticCompanyMemoryType | "company_fact" | "known_entity_alias" | "recommendation_memory";
export type SyntheticCompanyMemoryStatus = "active" | "superseded" | "retired" | "invalid";
export type SyntheticCompanyMemorySourceAuthority =
  | "advisor"
  | "review_workflow"
  | "recommendation_outcome"
  | "historical_snapshot"
  | "system_observation"
  | "manual_import";
export type SyntheticCompanyMemorySourceType =
  | "advisor"
  | "recommendation"
  | "signal"
  | "metric_series"
  | "evidence"
  | "historical_snapshot"
  | "industry_profile"
  | "system_observation"
  | "manual_import";
export type SyntheticMemoryConfidenceTier = "low" | "medium" | "high";
export type SyntheticMemoryConfidenceImpact = "positive" | "negative" | "neutral";
export type SyntheticRecommendationOutcomeStatus = "successful" | "partially_successful" | "unsuccessful" | "not_measured" | "in_progress";
export type SyntheticAdvisorFeedbackStatus = "accepted" | "rejected" | "partially_accepted" | "incorrect" | "useful" | "not_useful";
export type SyntheticEntityAliasType = "customer" | "vendor" | "account" | "department" | "class" | "location" | "project";
export type SyntheticThresholdOverrideOperator = "greater_than" | "less_than" | "between" | "outside_range";

export interface SyntheticCompanyMemorySourceRef {
  sourceType: SyntheticCompanyMemorySourceType;
  sourceId: string;
  sourceLabel?: string;
  observedPeriodKey?: string;
}

export interface SyntheticCompanyMemoryConfidenceFactor {
  code: string;
  label: string;
  impact: SyntheticMemoryConfidenceImpact;
  factorContribution: number;
}

export interface SyntheticCompanyMemoryConfidence {
  score: number;
  tier: SyntheticMemoryConfidenceTier;
  factors: SyntheticCompanyMemoryConfidenceFactor[];
  explanationCodes: string[];
}

export interface SyntheticCompanyMemoryFreshness {
  memoryFreshnessScore: number;
  memoryLastConfirmedAt: string;
  observedPeriodKeys: string[];
  freshnessExplanationCodes: string[];
  staleAfterMonths?: number;
}

export interface SyntheticCompanyMemoryLineage {
  memoryId: string;
  recommendationIds: string[];
  signalIds: string[];
  metricIds: string[];
  evidenceIds: string[];
  snapshotIds: string[];
  industryProfileId?: string;
  industryProfileVersion?: string;
  advisorFeedbackIds?: string[];
  recommendationOutcomeIds?: string[];
}

export interface SyntheticCompanyMemoryAudit {
  memoryId: string;
  recordVersion: number;
  createdByProcess: "system_observation" | "advisor_review" | "recommendation_review" | "manual_import";
  createdAt: string;
  updatedAt: string;
  memoryLastConfirmedAt: string;
  memoryFreshnessScore: number;
  memorySourceAuthority: SyntheticCompanyMemorySourceAuthority;
  sourceHash: string;
  payloadHash: string;
  supersedesMemoryId?: string;
  supersededByMemoryId?: string;
  validationWarnings: string[];
}

export interface SyntheticRecurringPatternMemory {
  patternKey: string;
  description: string;
  recurrenceCount: number;
  observedPeriodKeys: string[];
  periodCadence?: "monthly" | "quarterly" | "annual" | "irregular";
  affectedMetricIds: string[];
  evidenceIds: string[];
  snapshotIds: string[];
}

export interface SyntheticKnownSeasonalityMemory {
  seasonalityKey: string;
  expectedPeakPeriods: string[];
  expectedLowPeriods: string[];
  observedPeriodKeys: string[];
  confidenceImpact?: SyntheticMemoryConfidenceImpact;
}

export interface SyntheticEntityAlias {
  aliasId: string;
  entityType: SyntheticEntityAliasType;
  canonicalEntityId?: string;
  canonicalName: string;
  aliases: string[];
  normalizationRules?: string[];
  firstObservedPeriod: string;
  lastObservedPeriod: string;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
  confidence: SyntheticCompanyMemoryConfidence;
}

export interface SyntheticAdvisorFeedback {
  feedbackId: string;
  recommendationId?: string;
  signalId?: string;
  feedbackStatus: SyntheticAdvisorFeedbackStatus;
  feedbackSource: "advisor" | "review_workflow" | "manual_import";
  feedbackText?: string;
  reviewedBy: string;
  reviewDate: string;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
}

export interface SyntheticRecommendationOutcomeMetric {
  metricId: string;
  beforeValue?: number;
  afterValue?: number;
  delta?: number;
  periodStart?: string;
  periodEnd?: string;
  direction?: "improved" | "worsened" | "unchanged";
}

export interface SyntheticRecommendationOutcome {
  outcomeId: string;
  recommendationId: string;
  outcomeStatus: SyntheticRecommendationOutcomeStatus;
  outcomeMetrics: SyntheticRecommendationOutcomeMetric[];
  outcomeEvidence: SyntheticCompanyMemorySourceRef[];
  reviewedBy: string;
  reviewDate: string;
}

export interface SyntheticCompanyThresholdOverride {
  overrideId: string;
  industryProfileId: string;
  industryProfileVersion: string;
  thresholdKey: string;
  metricKey: string;
  operator: SyntheticThresholdOverrideOperator;
  overrideValue?: number;
  overrideRange?: { min: number; max: number };
  overrideReasonCode: string;
  approvedBy: string;
  approvedAt: string;
  effectiveDate: string;
  retiredDate?: string;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
}

export interface SyntheticOperationalNote {
  noteId: string;
  noteCategory: "business_model" | "operating_constraint" | "data_quality" | "advisor_context";
  noteText: string;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
}

export interface SyntheticIndustryOverride {
  overrideId: string;
  industryProfileId: string;
  industryProfileVersion: string;
  overrideCategory: "threshold" | "seasonality" | "evidence_expectation" | "kpi_expectation";
  overrideReasonCode: string;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
}

export interface SyntheticCompanyContextMemory {
  contextKey: string;
  contextValue: string | number | boolean | null;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
}

export interface SyntheticCompanyFact {
  key: string;
  value: string | number | boolean | null;
  source?: "advisor" | "system" | "import";
  confidence?: number;
}

export interface SyntheticRecurringPattern {
  patternKey: string;
  metricKey?: string;
  description: string;
  expectedPeriods?: string[];
  evidenceIds?: string[];
}

export interface SyntheticAdvisorFeedbackRecord {
  feedbackId: string;
  signalId?: string;
  recommendationId?: string;
  disposition: "accepted" | "dismissed" | "modified" | "deferred";
  notes?: string;
}

export interface SyntheticKnownEntityAlias {
  canonicalName: string;
  aliases: string[];
  entityType: SyntheticEntityAliasType;
}

export interface SyntheticRecommendationMemory {
  recommendationType: string;
  lastStatus?: string;
  lastRecommendedAt?: string;
  recurrenceCount?: number;
}

export interface SyntheticCompanyMemoryRecord {
  memoryId: string;
  id: string;
  companyId: string | null;
  memoryType: SyntheticCompanyMemoryType;
  recordType?: SyntheticCompanyMemoryRecordType;
  memoryStatus: SyntheticCompanyMemoryStatus;
  confidence: SyntheticCompanyMemoryConfidence;
  memoryFreshnessScore: number;
  memoryLastConfirmedAt: string;
  memorySourceAuthority: SyntheticCompanyMemorySourceAuthority;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
  createdAt: string;
  updatedAt: string;
  version: number;
  supersedesMemoryId?: string;
  supersededByMemoryId?: string;
  memoryLineage: SyntheticCompanyMemoryLineage;
  memoryAudit: SyntheticCompanyMemoryAudit;
  recurringPattern?: SyntheticRecurringPatternMemory;
  knownSeasonality?: SyntheticKnownSeasonalityMemory;
  entityAlias?: SyntheticEntityAlias;
  advisorFeedback?: SyntheticAdvisorFeedback;
  recommendationOutcome?: SyntheticRecommendationOutcome;
  thresholdOverride?: SyntheticCompanyThresholdOverride;
  operationalNote?: SyntheticOperationalNote;
  industryOverride?: SyntheticIndustryOverride;
  companyContext?: SyntheticCompanyContextMemory;
  fact?: SyntheticCompanyFact;
  knownEntityAlias?: SyntheticKnownEntityAlias;
  recommendationMemory?: SyntheticRecommendationMemory;
}
