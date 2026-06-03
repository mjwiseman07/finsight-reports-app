export type SyntheticConfidenceTier = "high" | "medium" | "low";

export type SyntheticConfidenceReasonCode =
  | "history_60_months"
  | "history_36_months"
  | "history_24_months"
  | "history_12_months"
  | "history_under_12_months"
  | "core_statements_available"
  | "supporting_schedule_missing"
  | "validation_warning_present"
  | "industry_profile_available"
  | "industry_benchmark_unavailable";

export interface SyntheticConfidenceFactor {
  code: SyntheticConfidenceReasonCode;
  label: string;
  impact: "positive" | "negative" | "neutral";
  weight?: number;
}

export interface SyntheticConfidenceInputSummary {
  monthsOfHistory: number;
  dataCompletenessScore?: number;
  validationWarningCount?: number;
  industryCoverageAvailable?: boolean;
  requiredEvidenceAvailable?: boolean;
}

export interface SyntheticConfidenceScore {
  score: number;
  tier: SyntheticConfidenceTier;
  factors: SyntheticConfidenceFactor[];
  inputSummary: SyntheticConfidenceInputSummary;
}
