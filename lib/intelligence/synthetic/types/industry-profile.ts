export interface SyntheticIndustryMetricDefinition {
  metricKey: string;
  label: string;
  category?: string;
  unit?: "currency" | "percent" | "days" | "count" | "ratio";
  required?: boolean;
}

export interface SyntheticIndustryThresholdDefinition {
  thresholdKey: string;
  metricKey: string;
  severity?: "low" | "medium" | "high" | "critical";
  value: number;
  direction?: "increase" | "decrease" | "absolute";
}

export interface SyntheticIndustryEvidenceExpectation {
  evidenceKey: string;
  sourceType: "financial_statement" | "supporting_schedule" | "operational" | "benchmark" | "manual";
  requiredForHighConfidence?: boolean;
}

export interface SyntheticIndustryModulePreference {
  moduleKey: string;
  enabledByDefault: boolean;
  minimumHistoryMonths?: number;
}

export interface SyntheticIndustryProfile {
  industryKey: string;
  displayName: string;
  metricCatalog: SyntheticIndustryMetricDefinition[];
  thresholds?: SyntheticIndustryThresholdDefinition[];
  evidenceExpectations?: SyntheticIndustryEvidenceExpectation[];
  modulePreferences?: SyntheticIndustryModulePreference[];
}
