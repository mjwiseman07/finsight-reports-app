import type { SyntheticIndustryProfile } from "../../types/industry-profile";

export const healthcareProfile: SyntheticIndustryProfile = {
  industryProfileId: "healthcare",
  industryKey: "healthcare",
  industryName: "Healthcare",
  displayName: "Healthcare",
  version: "1.0.0",
  effectiveDate: "2026-01-01",
  profileStatus: "active",
  industryMaturityLevel: "advanced",
  supportedModules: ["metric_series", "signal_engine", "recommendation_engine", "confidence_scoring"],
  benchmarkAvailability: "partial",
  metricCatalog: [
    { metricKey: "clean_claim_rate", label: "Clean Claim Rate", category: "revenue_cycle", unit: "percent", required: true, minimumMaturityLevel: "advanced" },
    { metricKey: "dso", label: "DSO", category: "working_capital", unit: "days", required: true, minimumMaturityLevel: "basic" },
    { metricKey: "denial_rate", label: "Denial Rate", category: "revenue_cycle", unit: "percent", required: true, minimumMaturityLevel: "advanced" },
    { metricKey: "payer_mix", label: "Payer Mix", category: "revenue_cycle", unit: "percent", required: false, minimumMaturityLevel: "advanced" },
  ],
  kpiCatalog: [
    { kpiKey: "clean_claim_rate", metricKey: "clean_claim_rate", label: "Clean Claim Rate", tier: "required", category: "revenue_cycle", unit: "percent", required: true, benchmarkEligible: true, minimumMaturityLevel: "advanced" },
    { kpiKey: "dso", metricKey: "dso", label: "DSO", tier: "required", category: "working_capital", unit: "days", required: true, benchmarkEligible: true, minimumMaturityLevel: "basic" },
    { kpiKey: "denial_rate", metricKey: "denial_rate", label: "Denial Rate", tier: "required", category: "revenue_cycle", unit: "percent", required: true, benchmarkEligible: true, minimumMaturityLevel: "advanced" },
    { kpiKey: "revenue_per_patient_day", metricKey: "revenue_per_patient_day", label: "Revenue Per Patient Day", tier: "advanced", category: "revenue", unit: "currency", required: false, benchmarkEligible: true, minimumMaturityLevel: "enterprise" },
  ],
  thresholdCatalog: [
    { thresholdKey: "dso_high", metricKey: "dso", thresholdType: "signal", operator: "greater_than", value: 45, severity: "high", direction: "increase", version: "1.0.0", effectiveDate: "2026-01-01", minimumMaturityLevel: "basic" },
    { thresholdKey: "denial_rate_high", metricKey: "denial_rate", thresholdType: "severity", operator: "greater_than", value: 8, severity: "critical", direction: "increase", version: "1.0.0", effectiveDate: "2026-01-01", minimumMaturityLevel: "advanced" },
  ],
  benchmarkCatalog: [
    { benchmarkId: "healthcare_dso", metricKey: "dso", version: "1.0.0", targetRange: { min: 30, max: 45 }, benchmarkSourceMetadata: { sourceName: "internal_default" }, benchmarkConfidence: "low", effectiveDate: "2026-01-01", minimumMaturityLevel: "basic" },
  ],
  seasonalityProfile: { seasonalityProfileId: "healthcare_payer_cycles", version: "1.0.0", rules: ["payer_cycle_impacts"], assumptionNotes: ["Claims timing can affect cash collection timing."], confidenceImpact: "neutral" },
  confidenceRules: [{ ruleId: "claims_required", moduleKey: "confidence_scoring", requiredEvidenceKey: "claims", impact: "positive", confidenceTierImpact: "high", reasonCode: "claims_data_present", minimumMaturityLevel: "advanced" }],
  evidenceExpectations: [
    { evidenceKey: "claims", sourceType: "operational", requiredForHighConfidence: true, requiredForModules: ["confidence_scoring"], fallbackAllowed: false, missingDataImpact: "high", minimumMaturityLevel: "advanced" },
    { evidenceKey: "payer_mix", sourceType: "operational", requiredForHighConfidence: false, requiredForModules: ["metric_series"], fallbackAllowed: true, missingDataImpact: "medium", minimumMaturityLevel: "advanced" },
  ],
  signalExpectations: [
    { signalType: "dso_risk", requiredMetricKeys: ["dso"], expectedEvidenceKeys: ["claims"], thresholdRefs: ["dso_high"], minimumMaturityLevel: "basic" },
    { signalType: "denial_risk", requiredMetricKeys: ["denial_rate"], expectedEvidenceKeys: ["claims"], thresholdRefs: ["denial_rate_high"], minimumMaturityLevel: "advanced" },
  ],
  recommendationExpectations: [
    { recommendationType: "collections_review", sourceSignalTypes: ["dso_risk"], expectedImpactCategory: "working_capital", affectedMetricIds: ["dso", "cash"], allowedActionTypes: ["review", "investigate"], reviewRiskCategory: "healthcare", minimumMaturityLevel: "basic" },
    { recommendationType: "denial_review", sourceSignalTypes: ["denial_risk"], expectedImpactCategory: "revenue_cycle", affectedMetricIds: ["denial_rate"], allowedActionTypes: ["review", "analyze"], reviewRiskCategory: "healthcare", minimumMaturityLevel: "advanced" },
  ],
  versionHistory: [{ version: "1.0.0", effectiveDate: "2026-01-01", changeSummary: "Initial healthcare profile." }],
};
