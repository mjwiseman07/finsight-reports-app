export type SyntheticConfidenceTier = "high" | "medium" | "low";

export type SyntheticConfidenceReasonCode =
  | "history_60_months"
  | "history_36_months"
  | "history_24_months"
  | "history_12_months"
  | "history_12_months_available"
  | "history_under_12_months"
  | "core_statements_available"
  | "supporting_schedule_missing"
  | "cash_flow_missing"
  | "validation_warning_present"
  | "validation_warnings_present"
  | "industry_profile_available"
  | "industry_profile_present"
  | "industry_benchmark_unavailable"
  | "company_memory_present"
  | "company_memory_missing";

export interface SyntheticConfidenceFactor {
  code: SyntheticConfidenceReasonCode;
  label: string;
  impact: "positive" | "negative" | "neutral";
  weight?: number;
  factorContribution: number;
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
  factorContributions: SyntheticConfidenceFactor[];
  explanationCodes: SyntheticConfidenceReasonCode[];
  inputSummary: SyntheticConfidenceInputSummary;
}

export interface SyntheticConfidenceExplanation {
  confidenceScore: number;
  confidenceTier: SyntheticConfidenceTier;
  explanationCodes: SyntheticConfidenceReasonCode[];
  strengtheningFactors: SyntheticConfidenceFactor[];
  limitingFactors: SyntheticConfidenceFactor[];
  neutralFactors: SyntheticConfidenceFactor[];
  dataGaps: SyntheticConfidenceReasonCode[];
}
