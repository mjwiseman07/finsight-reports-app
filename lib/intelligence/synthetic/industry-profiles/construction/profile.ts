import type { SyntheticIndustryProfile } from "../../types/industry-profile";

export const constructionProfile: SyntheticIndustryProfile = {
  industryProfileId: "construction",
  industryKey: "construction",
  industryName: "Construction",
  displayName: "Construction",
  version: "1.0.0",
  effectiveDate: "2026-01-01",
  profileStatus: "active",
  industryMaturityLevel: "advanced",
  supportedModules: ["metric_series", "signal_engine", "recommendation_engine", "confidence_scoring"],
  benchmarkAvailability: "partial",
  metricCatalog: [
    { metricKey: "wip", label: "WIP", category: "working_capital", unit: "currency", required: true, minimumMaturityLevel: "advanced" },
    { metricKey: "backlog", label: "Backlog", category: "revenue", unit: "currency", required: true, minimumMaturityLevel: "intermediate" },
    { metricKey: "over_under_billings", label: "Over/Under Billings", category: "working_capital", unit: "currency", required: true, minimumMaturityLevel: "advanced" },
    { metricKey: "gross_margin_by_job", label: "Gross Margin by Job", category: "margin", unit: "percent", required: true, minimumMaturityLevel: "advanced" },
  ],
  kpiCatalog: [
    { kpiKey: "wip", metricKey: "wip", label: "WIP", tier: "required", category: "working_capital", unit: "currency", required: true, benchmarkEligible: true, minimumMaturityLevel: "advanced" },
    { kpiKey: "backlog", metricKey: "backlog", label: "Backlog", tier: "required", category: "revenue", unit: "currency", required: true, benchmarkEligible: true, minimumMaturityLevel: "intermediate" },
    { kpiKey: "labor_utilization", metricKey: "labor_utilization", label: "Labor Utilization", tier: "optional", category: "productivity", unit: "percent", required: false, benchmarkEligible: true, minimumMaturityLevel: "intermediate" },
  ],
  thresholdCatalog: [
    { thresholdKey: "wip_risk_high", metricKey: "wip", thresholdType: "signal", operator: "greater_than", value: 20, severity: "high", direction: "increase", version: "1.0.0", effectiveDate: "2026-01-01", minimumMaturityLevel: "advanced" },
  ],
  benchmarkCatalog: [
    { benchmarkId: "construction_gross_margin", metricKey: "gross_margin_by_job", version: "1.0.0", targetRange: { min: 18, max: 30 }, benchmarkSourceMetadata: { sourceName: "internal_default" }, benchmarkConfidence: "low", effectiveDate: "2026-01-01", minimumMaturityLevel: "advanced" },
  ],
  seasonalityProfile: { seasonalityProfileId: "construction_weather", version: "1.0.0", rules: ["weather_seasonality", "project_cycle_timing"], expectedPeakPeriods: ["Q2", "Q3"], confidenceImpact: "neutral" },
  confidenceRules: [{ ruleId: "wip_required", moduleKey: "confidence_scoring", requiredEvidenceKey: "wip", impact: "positive", confidenceTierImpact: "high", reasonCode: "wip_present", minimumMaturityLevel: "advanced" }],
  evidenceExpectations: [
    { evidenceKey: "jobs", sourceType: "operational", requiredForHighConfidence: true, requiredForModules: ["metric_series"], fallbackAllowed: false, missingDataImpact: "high", minimumMaturityLevel: "intermediate" },
    { evidenceKey: "billing", sourceType: "operational", requiredForHighConfidence: true, requiredForModules: ["signal_engine"], fallbackAllowed: false, missingDataImpact: "high", minimumMaturityLevel: "advanced" },
  ],
  signalExpectations: [{ signalType: "wip_risk", requiredMetricKeys: ["wip"], expectedEvidenceKeys: ["jobs", "billing"], thresholdRefs: ["wip_risk_high"], minimumMaturityLevel: "advanced" }],
  recommendationExpectations: [{ recommendationType: "wip_review", sourceSignalTypes: ["wip_risk"], expectedImpactCategory: "working_capital", affectedMetricIds: ["wip", "cash"], allowedActionTypes: ["review", "investigate"], reviewRiskCategory: "working_capital", minimumMaturityLevel: "advanced" }],
  versionHistory: [{ version: "1.0.0", effectiveDate: "2026-01-01", changeSummary: "Initial construction profile." }],
};
