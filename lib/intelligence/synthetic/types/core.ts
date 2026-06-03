export type SyntheticIntelligenceModuleKey =
  | "core"
  | "trend_analysis"
  | "seasonality"
  | "forecasting"
  | "anomaly_detection"
  | "cash_flow"
  | "customer_concentration"
  | "vendor_concentration"
  | "industry_intelligence"
  | "confidence_scoring"
  | "signal_engine"
  | "recommendation_engine"
  | "evidence_store"
  | "industry_profiles"
  | "company_memory"
  | "historical_snapshots"
  | "kpi_library"
  | "formula_registry"
  | "healthcare";

export type SyntheticIntelligencePackageTier = "starter" | "pro" | "cpa_firm" | "virtual_cfo" | "healthcare";
export type SyntheticIntelligenceSourceSystem = "quickbooks" | "xero" | "sage" | "netsuite" | "dynamics365" | "csv_upload";

export interface SyntheticIntelligencePeriod {
  startDate: string;
  endDate: string;
  label?: string;
  periodType?: "month" | "quarter" | "year" | "custom";
}

export interface SyntheticIntelligenceRunContext {
  companyId: string | null;
  connectionId: string;
  tenantId: string | null;
  tenantName: string;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  syncId: string;
  reportPeriod: SyntheticIntelligencePeriod;
  packageTier?: SyntheticIntelligencePackageTier;
  industryKey?: string;
  generatedAt: string;
}
