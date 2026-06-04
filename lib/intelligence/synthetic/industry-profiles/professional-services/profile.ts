import type { SyntheticIndustryProfile } from "../../types/industry-profile";

export const professionalServicesProfile: SyntheticIndustryProfile = {
  industryProfileId: "professional_services",
  industryKey: "professional_services",
  industryName: "Professional Services",
  displayName: "Professional Services",
  version: "1.0.0",
  effectiveDate: "2026-01-01",
  profileStatus: "active",
  industryMaturityLevel: "intermediate",
  supportedModules: ["metric_series", "signal_engine", "recommendation_engine", "confidence_scoring"],
  benchmarkAvailability: "partial",
  metricCatalog: [
    { metricKey: "revenue_per_fte", label: "Revenue Per FTE", category: "productivity", unit: "currency", required: true, minimumMaturityLevel: "basic" },
    { metricKey: "utilization", label: "Utilization", category: "productivity", unit: "percent", required: true, minimumMaturityLevel: "intermediate" },
    { metricKey: "realization", label: "Realization", category: "margin", unit: "percent", required: true, minimumMaturityLevel: "intermediate" },
  ],
  kpiCatalog: [
    { kpiKey: "revenue_per_fte", metricKey: "revenue_per_fte", label: "Revenue Per FTE", tier: "required", category: "productivity", unit: "currency", required: true, benchmarkEligible: true, minimumMaturityLevel: "basic" },
    { kpiKey: "utilization", metricKey: "utilization", label: "Utilization", tier: "required", category: "productivity", unit: "percent", required: true, benchmarkEligible: true, minimumMaturityLevel: "intermediate" },
    { kpiKey: "realization", metricKey: "realization", label: "Realization", tier: "required", category: "margin", unit: "percent", required: true, benchmarkEligible: true, minimumMaturityLevel: "intermediate" },
  ],
  thresholdCatalog: [
    { thresholdKey: "utilization_low", metricKey: "utilization", thresholdType: "signal", operator: "less_than", value: 70, severity: "medium", direction: "decrease", version: "1.0.0", effectiveDate: "2026-01-01", minimumMaturityLevel: "intermediate" },
  ],
  benchmarkCatalog: [
    { benchmarkId: "professional_services_utilization", metricKey: "utilization", version: "1.0.0", targetRange: { min: 70, max: 85 }, benchmarkSourceMetadata: { sourceName: "internal_default", effectiveDate: "2026-01-01" }, benchmarkConfidence: "low", effectiveDate: "2026-01-01", minimumMaturityLevel: "intermediate" },
  ],
  seasonalityProfile: { seasonalityProfileId: "professional_services_default", version: "1.0.0", rules: ["project_cycle_timing"], confidenceImpact: "neutral" },
  confidenceRules: [
    { ruleId: "timesheet_data_required", moduleKey: "confidence_scoring", requiredEvidenceKey: "labor_utilization", impact: "positive", confidenceTierImpact: "high", reasonCode: "utilization_data_present", minimumMaturityLevel: "intermediate" },
  ],
  evidenceExpectations: [
    { evidenceKey: "labor_utilization", sourceType: "operational", requiredForHighConfidence: true, requiredForModules: ["confidence_scoring"], fallbackAllowed: false, missingDataImpact: "medium", minimumMaturityLevel: "intermediate" },
  ],
  signalExpectations: [
    { signalType: "utilization_risk", requiredMetricKeys: ["utilization"], expectedEvidenceKeys: ["labor_utilization"], thresholdRefs: ["utilization_low"], minimumMaturityLevel: "intermediate" },
  ],
  recommendationExpectations: [
    { recommendationType: "utilization_review", sourceSignalTypes: ["utilization_risk"], expectedImpactCategory: "operations", affectedMetricIds: ["utilization", "revenue_per_fte"], allowedActionTypes: ["review", "analyze"], reviewRiskCategory: "financial", minimumMaturityLevel: "intermediate" },
  ],
  versionHistory: [{ version: "1.0.0", effectiveDate: "2026-01-01", changeSummary: "Initial professional services profile." }],
};
