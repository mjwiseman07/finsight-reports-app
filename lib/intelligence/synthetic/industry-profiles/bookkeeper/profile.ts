import type { SyntheticIndustryProfile } from "../../types/industry-profile";

export const bookkeeperProfile: SyntheticIndustryProfile = {
  industryProfileId: "bookkeeper",
  industryKey: "bookkeeper",
  industryName: "Bookkeeper",
  displayName: "Bookkeeper",
  version: "1.0.0",
  effectiveDate: "2026-01-01",
  profileStatus: "active",
  industryMaturityLevel: "intermediate",
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
    { metricKey: "monthly_recurring_revenue", label: "Monthly Recurring Revenue", category: "revenue", unit: "currency", required: true, minimumMaturityLevel: "basic" },
    { metricKey: "client_concentration", label: "Client Concentration", category: "customer", unit: "percent", required: true, minimumMaturityLevel: "intermediate" },
  ],
  kpiCatalog: [
    { kpiKey: "revenue_per_fte", metricKey: "revenue_per_fte", label: "Revenue Per FTE", tier: "required", category: "productivity", unit: "currency", required: true, inheritedFromProfileId: "professional_services", minimumMaturityLevel: "basic" },
    { kpiKey: "monthly_recurring_revenue", metricKey: "monthly_recurring_revenue", label: "Monthly Recurring Revenue", tier: "required", category: "revenue", unit: "currency", required: true, benchmarkEligible: true, minimumMaturityLevel: "basic" },
    { kpiKey: "client_concentration", metricKey: "client_concentration", label: "Client Concentration", tier: "required", category: "customer", unit: "percent", required: true, benchmarkEligible: true, minimumMaturityLevel: "intermediate" },
  ],
  thresholdCatalog: [
    { thresholdKey: "client_concentration_high", metricKey: "client_concentration", thresholdType: "signal", operator: "greater_than", value: 25, severity: "high", direction: "increase", version: "1.0.0", effectiveDate: "2026-01-01", minimumMaturityLevel: "intermediate" },
  ],
  benchmarkCatalog: [
    { benchmarkId: "bookkeeper_mrr", metricKey: "monthly_recurring_revenue", version: "1.0.0", benchmarkSourceMetadata: { sourceName: "internal_default" }, benchmarkConfidence: "low", effectiveDate: "2026-01-01", minimumMaturityLevel: "basic" },
  ],
  seasonalityProfile: { seasonalityProfileId: "bookkeeper_default", version: "1.0.0", rules: ["monthly_close_cycle"], confidenceImpact: "neutral" },
  confidenceRules: [{ ruleId: "mrr_required", moduleKey: "confidence_scoring", requiredEvidenceKey: "monthly_recurring_revenue", impact: "positive", confidenceTierImpact: "high", reasonCode: "mrr_present", minimumMaturityLevel: "basic" }],
  evidenceExpectations: [{ evidenceKey: "monthly_recurring_revenue", sourceType: "operational", requiredForHighConfidence: true, requiredForModules: ["metric_series"], fallbackAllowed: true, missingDataImpact: "medium", minimumMaturityLevel: "basic" }],
  signalExpectations: [{ signalType: "client_concentration", requiredMetricKeys: ["client_concentration"], expectedEvidenceKeys: ["monthly_recurring_revenue"], thresholdRefs: ["client_concentration_high"], minimumMaturityLevel: "intermediate" }],
  recommendationExpectations: [{ recommendationType: "client_concentration_review", sourceSignalTypes: ["client_concentration"], expectedImpactCategory: "concentration", affectedMetricIds: ["client_concentration"], allowedActionTypes: ["review", "analyze"], reviewRiskCategory: "financial", minimumMaturityLevel: "intermediate" }],
  versionHistory: [{ version: "1.0.0", effectiveDate: "2026-01-01", changeSummary: "Initial bookkeeper profile." }],
};
