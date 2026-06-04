export type SyntheticIndustryProfileStatus = "draft" | "active" | "retired";
export type SyntheticIndustryMaturityLevel = "basic" | "intermediate" | "advanced" | "enterprise";
export type SyntheticIndustryKpiTier = "required" | "optional" | "advanced";
export type SyntheticIndustryBenchmarkConfidence = "low" | "medium" | "high";
export type SyntheticIndustryThresholdType = "kpi" | "signal" | "severity" | "benchmark";
export type SyntheticIndustryThresholdOperator = "greater_than" | "less_than" | "between" | "outside_range";

export interface SyntheticIndustryMetricDefinition {
  metricKey: string;
  label: string;
  category?: string;
  unit?: "currency" | "percent" | "days" | "count" | "ratio";
  required?: boolean;
  minimumMaturityLevel?: SyntheticIndustryMaturityLevel;
  recommendedMaturityLevel?: SyntheticIndustryMaturityLevel;
  inheritedFromProfileId?: string;
  overridesParentId?: string;
}

export interface SyntheticIndustryThresholdDefinition {
  thresholdKey: string;
  metricKey: string;
  severity?: "low" | "medium" | "high" | "critical";
  value: number;
  direction?: "increase" | "decrease" | "absolute";
  thresholdType?: SyntheticIndustryThresholdType;
  operator?: SyntheticIndustryThresholdOperator;
  range?: { min: number; max: number };
  version?: string;
  effectiveDate?: string;
  retiredDate?: string;
  minimumMaturityLevel?: SyntheticIndustryMaturityLevel;
  inheritedFromProfileId?: string;
  overridesParentId?: string;
}

export interface SyntheticIndustryEvidenceExpectation {
  evidenceKey: string;
  sourceType: "financial_statement" | "supporting_schedule" | "operational" | "benchmark" | "manual" | "industry_profile";
  requiredForHighConfidence?: boolean;
  requiredForModules?: string[];
  fallbackAllowed?: boolean;
  missingDataImpact?: "low" | "medium" | "high";
  minimumMaturityLevel?: SyntheticIndustryMaturityLevel;
  inheritedFromProfileId?: string;
  overridesParentId?: string;
}

export interface SyntheticIndustryModulePreference {
  moduleKey: string;
  enabledByDefault: boolean;
  minimumHistoryMonths?: number;
}

export interface SyntheticIndustryProfileParent {
  parentIndustryProfileId: string;
  parentVersion?: string;
  inheritedKpiKeys: string[];
  inheritedThresholdIds: string[];
  inheritedEvidenceKeys: string[];
  inheritedSignalTypes: string[];
  inheritedRecommendationTypes: string[];
}

export interface SyntheticIndustryKpiCatalogEntry extends SyntheticIndustryMetricDefinition {
  kpiKey: string;
  tier: SyntheticIndustryKpiTier;
  requiredEvidenceKeys?: string[];
  supportedModules?: string[];
  benchmarkEligible?: boolean;
}

export interface SyntheticIndustryBenchmark {
  benchmarkId: string;
  metricKey: string;
  version: string;
  percentileRanges?: Array<{ percentile: number; min: number; max: number }>;
  targetRange?: { min: number; max: number };
  benchmarkSourceMetadata: {
    sourceName: string;
    sourceVersion?: string;
    effectiveDate?: string;
  };
  benchmarkConfidence: SyntheticIndustryBenchmarkConfidence;
  effectiveDate: string;
  retiredDate?: string;
  minimumMaturityLevel?: SyntheticIndustryMaturityLevel;
  inheritedFromProfileId?: string;
}

export interface SyntheticIndustrySeasonalityProfile {
  seasonalityProfileId: string;
  version: string;
  rules: string[];
  expectedPeakPeriods?: string[];
  expectedLowPeriods?: string[];
  assumptionNotes?: string[];
  confidenceImpact?: "positive" | "negative" | "neutral";
}

export interface SyntheticIndustryConfidenceRule {
  ruleId: string;
  moduleKey: string;
  requiredEvidenceKey: string;
  impact: "positive" | "negative" | "neutral";
  confidenceTierImpact?: "high" | "medium" | "low";
  reasonCode: string;
  minimumMaturityLevel?: SyntheticIndustryMaturityLevel;
  inheritedFromProfileId?: string;
}

export interface SyntheticIndustrySignalProfile {
  signalType: string;
  requiredMetricKeys: string[];
  expectedEvidenceKeys: string[];
  thresholdRefs?: string[];
  severityRefs?: string[];
  correlationGroupHints?: string[];
  minimumMaturityLevel?: SyntheticIndustryMaturityLevel;
  inheritedFromProfileId?: string;
}

export interface SyntheticIndustryRecommendationProfile {
  recommendationType: string;
  sourceSignalTypes: string[];
  expectedImpactCategory: string;
  affectedMetricIds: string[];
  allowedActionTypes: Array<"review" | "investigate" | "analyze">;
  reviewRiskCategory?: string;
  minimumMaturityLevel?: SyntheticIndustryMaturityLevel;
  inheritedFromProfileId?: string;
}

export interface SyntheticIndustryProfileVersionHistory {
  version: string;
  effectiveDate: string;
  retiredDate?: string;
  changeSummary: string;
  supersedesVersion?: string;
}

export interface SyntheticIndustryProfile {
  industryProfileId?: string;
  industryKey: string;
  industryName?: string;
  displayName: string;
  version?: string;
  effectiveDate?: string;
  retiredDate?: string;
  profileStatus?: SyntheticIndustryProfileStatus;
  parentProfile?: SyntheticIndustryProfileParent;
  industryMaturityLevel?: SyntheticIndustryMaturityLevel;
  supportedModules?: string[];
  benchmarkAvailability?: "available" | "partial" | "unavailable";
  kpiCatalog?: SyntheticIndustryKpiCatalogEntry[];
  thresholdCatalog?: SyntheticIndustryThresholdDefinition[];
  benchmarkCatalog?: SyntheticIndustryBenchmark[];
  seasonalityProfile?: SyntheticIndustrySeasonalityProfile;
  confidenceRules?: SyntheticIndustryConfidenceRule[];
  signalExpectations?: SyntheticIndustrySignalProfile[];
  recommendationExpectations?: SyntheticIndustryRecommendationProfile[];
  versionHistory?: SyntheticIndustryProfileVersionHistory[];
  metricCatalog: SyntheticIndustryMetricDefinition[];
  thresholds?: SyntheticIndustryThresholdDefinition[];
  evidenceExpectations?: SyntheticIndustryEvidenceExpectation[];
  modulePreferences?: SyntheticIndustryModulePreference[];
}
