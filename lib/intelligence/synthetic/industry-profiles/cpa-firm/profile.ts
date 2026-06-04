import type { SyntheticIndustryProfile } from "../../types/industry-profile";

export const cpaFirmProfile: SyntheticIndustryProfile = {
  industryProfileId: "cpa_firm",
  industryKey: "cpa_firm",
  industryName: "CPA Firm",
  displayName: "CPA Firm",
  version: "1.0.0",
  effectiveDate: "2026-01-01",
  profileStatus: "active",
  industryMaturityLevel: "advanced",
  parentProfile: {
    parentIndustryProfileId: "professional_services",
    parentVersion: "1.0.0",
    inheritedKpiKeys: ["revenue_per_fte", "utilization", "realization"],
    inheritedThresholdIds: ["utilization_low"],
    inheritedEvidenceKeys: ["labor_utilization"],
    inheritedSignalTypes: ["utilization_risk"],
    inheritedRecommendationTypes: ["utilization_review"],
  },
  supportedModules: ["metric_series", "signal_engine", "recommendation_engine", "confidence_scoring"],
  benchmarkAvailability: "partial",
  metricCatalog: [
    { metricKey: "wip", label: "WIP", category: "working_capital", unit: "currency", required: true, minimumMaturityLevel: "advanced", inheritedFromProfileId: undefined },
    { metricKey: "billing_realization", label: "Billing Realization", category: "margin", unit: "percent", required: true, minimumMaturityLevel: "advanced" },
  ],
  kpiCatalog: [
    { kpiKey: "revenue_per_fte", metricKey: "revenue_per_fte", label: "Revenue Per FTE", tier: "required", category: "productivity", unit: "currency", required: true, inheritedFromProfileId: "professional_services", minimumMaturityLevel: "basic" },
    { kpiKey: "utilization", metricKey: "utilization", label: "Utilization", tier: "required", category: "productivity", unit: "percent", required: true, inheritedFromProfileId: "professional_services", minimumMaturityLevel: "intermediate" },
    { kpiKey: "realization", metricKey: "realization", label: "Realization", tier: "required", category: "margin", unit: "percent", required: true, inheritedFromProfileId: "professional_services", minimumMaturityLevel: "intermediate" },
    { kpiKey: "wip", metricKey: "wip", label: "WIP", tier: "required", category: "working_capital", unit: "currency", required: true, benchmarkEligible: true, minimumMaturityLevel: "advanced" },
    { kpiKey: "billing_realization", metricKey: "billing_realization", label: "Billing Realization", tier: "required", category: "margin", unit: "percent", required: true, benchmarkEligible: true, minimumMaturityLevel: "advanced" },
  ],
  thresholdCatalog: [
    { thresholdKey: "wip_growth_high", metricKey: "wip", thresholdType: "signal", operator: "greater_than", value: 20, severity: "high", direction: "increase", version: "1.0.0", effectiveDate: "2026-01-01", minimumMaturityLevel: "advanced" },
  ],
  benchmarkCatalog: [
    { benchmarkId: "cpa_billing_realization", metricKey: "billing_realization", version: "1.0.0", targetRange: { min: 80, max: 95 }, benchmarkSourceMetadata: { sourceName: "internal_default" }, benchmarkConfidence: "low", effectiveDate: "2026-01-01", minimumMaturityLevel: "advanced" },
  ],
  seasonalityProfile: { seasonalityProfileId: "cpa_firm_seasonality", version: "1.0.0", rules: ["tax_season_workload"], expectedPeakPeriods: ["Q1", "Q2"], confidenceImpact: "neutral" },
  confidenceRules: [{ ruleId: "wip_required", moduleKey: "confidence_scoring", requiredEvidenceKey: "wip", impact: "positive", confidenceTierImpact: "high", reasonCode: "wip_present", minimumMaturityLevel: "advanced" }],
  evidenceExpectations: [{ evidenceKey: "wip", sourceType: "operational", requiredForHighConfidence: true, requiredForModules: ["signal_engine"], fallbackAllowed: false, missingDataImpact: "high", minimumMaturityLevel: "advanced" }],
  signalExpectations: [{ signalType: "wip_risk", requiredMetricKeys: ["wip"], expectedEvidenceKeys: ["wip"], thresholdRefs: ["wip_growth_high"], minimumMaturityLevel: "advanced" }],
  recommendationExpectations: [{ recommendationType: "wip_review", sourceSignalTypes: ["wip_risk"], expectedImpactCategory: "working_capital", affectedMetricIds: ["wip"], allowedActionTypes: ["review", "investigate"], reviewRiskCategory: "working_capital", minimumMaturityLevel: "advanced" }],
  versionHistory: [{ version: "1.0.0", effectiveDate: "2026-01-01", changeSummary: "Initial CPA firm profile.", supersedesVersion: undefined }],
};
