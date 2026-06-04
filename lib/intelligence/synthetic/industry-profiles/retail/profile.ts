import type { SyntheticIndustryProfile } from "../../types/industry-profile";

export const retailProfile: SyntheticIndustryProfile = {
  industryProfileId: "retail",
  industryKey: "retail",
  industryName: "Retail",
  displayName: "Retail",
  version: "1.0.0",
  effectiveDate: "2026-01-01",
  profileStatus: "active",
  industryMaturityLevel: "intermediate",
  supportedModules: ["metric_series", "signal_engine", "recommendation_engine", "confidence_scoring"],
  benchmarkAvailability: "partial",
  metricCatalog: [
    { metricKey: "inventory_turns", label: "Inventory Turns", category: "inventory", unit: "ratio", required: true, minimumMaturityLevel: "intermediate" },
    { metricKey: "gross_margin", label: "Gross Margin", category: "margin", unit: "percent", required: true, minimumMaturityLevel: "basic" },
    { metricKey: "same_store_sales", label: "Same Store Sales", category: "revenue", unit: "percent", required: false, minimumMaturityLevel: "advanced" },
    { metricKey: "cash_conversion_cycle", label: "Cash Conversion Cycle", category: "working_capital", unit: "days", required: true, minimumMaturityLevel: "intermediate" },
  ],
  kpiCatalog: [
    { kpiKey: "inventory_turns", metricKey: "inventory_turns", label: "Inventory Turns", tier: "required", category: "inventory", unit: "ratio", required: true, benchmarkEligible: true, minimumMaturityLevel: "intermediate" },
    { kpiKey: "gross_margin", metricKey: "gross_margin", label: "Gross Margin", tier: "required", category: "margin", unit: "percent", required: true, benchmarkEligible: true, minimumMaturityLevel: "basic" },
    { kpiKey: "same_store_sales", metricKey: "same_store_sales", label: "Same Store Sales", tier: "advanced", category: "revenue", unit: "percent", required: false, benchmarkEligible: true, minimumMaturityLevel: "advanced" },
  ],
  thresholdCatalog: [
    { thresholdKey: "inventory_turns_low", metricKey: "inventory_turns", thresholdType: "signal", operator: "less_than", value: 4, severity: "medium", direction: "decrease", version: "1.0.0", effectiveDate: "2026-01-01", minimumMaturityLevel: "intermediate" },
  ],
  benchmarkCatalog: [
    { benchmarkId: "retail_inventory_turns", metricKey: "inventory_turns", version: "1.0.0", targetRange: { min: 4, max: 8 }, benchmarkSourceMetadata: { sourceName: "internal_default" }, benchmarkConfidence: "low", effectiveDate: "2026-01-01", minimumMaturityLevel: "intermediate" },
  ],
  seasonalityProfile: { seasonalityProfileId: "retail_holiday", version: "1.0.0", rules: ["holiday_season", "post_holiday_inventory"], expectedPeakPeriods: ["Q4"], expectedLowPeriods: ["Q1"], confidenceImpact: "neutral" },
  confidenceRules: [{ ruleId: "inventory_required", moduleKey: "confidence_scoring", requiredEvidenceKey: "inventory", impact: "positive", confidenceTierImpact: "high", reasonCode: "inventory_data_present", minimumMaturityLevel: "intermediate" }],
  evidenceExpectations: [{ evidenceKey: "inventory", sourceType: "supporting_schedule", requiredForHighConfidence: true, requiredForModules: ["metric_series"], fallbackAllowed: false, missingDataImpact: "high", minimumMaturityLevel: "intermediate" }],
  signalExpectations: [{ signalType: "inventory_build", requiredMetricKeys: ["inventory_turns"], expectedEvidenceKeys: ["inventory"], thresholdRefs: ["inventory_turns_low"], minimumMaturityLevel: "intermediate" }],
  recommendationExpectations: [{ recommendationType: "inventory_review", sourceSignalTypes: ["inventory_build"], expectedImpactCategory: "inventory", affectedMetricIds: ["inventory_turns", "cash_conversion_cycle"], allowedActionTypes: ["review", "analyze"], reviewRiskCategory: "financial", minimumMaturityLevel: "intermediate" }],
  versionHistory: [{ version: "1.0.0", effectiveDate: "2026-01-01", changeSummary: "Initial retail profile." }],
};
