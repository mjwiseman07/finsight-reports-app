export type SyntheticKpiCategory =
  | "revenue"
  | "expense"
  | "margin"
  | "cash"
  | "working_capital"
  | "payroll"
  | "inventory"
  | "fixed_asset"
  | "debt"
  | "customer"
  | "vendor"
  | "industry";

export interface SyntheticKpiFormulaRef {
  formulaKey: string;
  version?: string;
}

export interface SyntheticKpiInputRequirement {
  inputKey: string;
  sourceType: "normalized_financial_data" | "historical_snapshot" | "supporting_schedule" | "company_memory" | "industry_profile";
  required: boolean;
}

export interface SyntheticKpiOutputShape {
  unit: "currency" | "percent" | "days" | "count" | "ratio" | "text";
  supportsTrend?: boolean;
  supportsBenchmark?: boolean;
}

export interface SyntheticKpiIndustryApplicability {
  industryKey: string;
  priority?: "core" | "recommended" | "optional";
}

export interface SyntheticKpiEvidenceRequirement {
  evidenceKey: string;
  requiredForConfidenceTier?: "high" | "medium" | "low";
}

export interface SyntheticKpiDefinition {
  kpiKey: string;
  label: string;
  category: SyntheticKpiCategory;
  formula: SyntheticKpiFormulaRef;
  inputs: SyntheticKpiInputRequirement[];
  output: SyntheticKpiOutputShape;
  industryApplicability?: SyntheticKpiIndustryApplicability[];
  evidenceRequirements?: SyntheticKpiEvidenceRequirement[];
}
