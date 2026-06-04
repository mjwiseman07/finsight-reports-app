import type { SyntheticIndustryProfile } from "../../types/industry-profile";

export const manufacturingProfile: SyntheticIndustryProfile = {
  industryProfileId: "manufacturing",
  industryKey: "manufacturing",
  industryName: "Manufacturing",
  displayName: "Manufacturing",
  version: "1.0.0",
  effectiveDate: "2026-01-01",
  profileStatus: "active",
  industryMaturityLevel: "advanced",
  supportedModules: ["metric_series", "signal_engine", "recommendation_engine", "confidence_scoring"],
  benchmarkAvailability: "partial",
  metricCatalog: [
    { metricKey: "inventory_turns", label: "Inventory Turns", category: "inventory", unit: "ratio", required: true, minimumMaturityLevel: "intermediate" },
    { metricKey: "gross_margin", label: "Gross Margin", category: "margin", unit: "percent", required: true, minimumMaturityLevel: "basic" },
    { metricKey: "labor_efficiency", label: "Labor Efficiency", category: "productivity", unit: "percent", required: true, minimumMaturityLevel: "advanced" },
    { metricKey: "capacity_utilization", label: "Capacity Utilization", category: "operations", unit: "percent", required: false, minimumMaturityLevel: "advanced" },
  ],
  kpiCatalog: [
    { kpiKey: "inventory_turns", metricKey: "inventory_turns", label: "Inventory Turns", tier: "required", category: "inventory", unit: "ratio", required: true, benchmarkEligible: true, minimumMaturityLevel: "intermediate" },
    { kpiKey: "gross_margin", metricKey: "gross_margin", label: "Gross Margin", tier: "required", category: "margin", unit: "percent", required: true, benchmarkEligible: true, minimumMaturityLevel: "basic" },
    { kpiKey: "labor_efficiency", metricKey: "labor_efficiency", label: "Labor Efficiency", tier: "required", category: "productivity", unit: "percent", required: true, benchmarkEligible: true, minimumMaturityLevel: "advanced" },
  ],
  thresholdCatalog: [
    { thresholdKey: "gross_margin_low", metricKey: "gross_margin", thresholdType: "signal", operator: "less_than", value: 20, severity: "high", direction: "decrease", version: "1.0.0", effectiveDate: "2026-01-01", minimumMaturityLevel: "basic" },
  ],
  benchmarkCatalog: [
    { benchmarkId: "manufacturing_gross_margin", metricKey: "gross_margin", version: "1.0.0", targetRange: { min: 20, max: 40 }, benchmarkSourceMetadata: { sourceName: "internal_default" }, benchmarkConfidence: "low", effectiveDate: "2026-01-01", minimumMaturityLevel: "basic" },
  ],
  seasonalityProfile: { seasonalityProfileId: "manufacturing_production_cycles", version: "1.0.0", rules: ["production_cycle_timing", "inventory_build_cycles"], confidenceImpact: "neutral" },
  confidenceRules: [{ ruleId: "inventory_required", moduleKey: "confidence_scoring", requiredEvidenceKey: "inventory", impact: "positive", confidenceTierImpact: "high", reasonCode: "inventory_data_present", minimumMaturityLevel: "intermediate" }],
  evidenceExpectations: [{ evidenceKey: "inventory", sourceType: "supporting_schedule", requiredForHighConfidence: true, requiredForModules: ["metric_series"], fallbackAllowed: false, missingDataImpact: "high", minimumMaturityLevel: "intermediate" }],
  signalExpectations: [{ signalType: "margin_compression", requiredMetricKeys: ["gross_margin"], expectedEvidenceKeys: ["inventory"], thresholdRefs: ["gross_margin_low"], minimumMaturityLevel: "basic" }],
  recommendationExpectations: [{ recommendationType: "margin_structure_review", sourceSignalTypes: ["margin_compression"], expectedImpactCategory: "margin", affectedMetricIds: ["gross_margin"], allowedActionTypes: ["review", "analyze"], reviewRiskCategory: "financial", minimumMaturityLevel: "basic" }],
  versionHistory: [{ version: "1.0.0", effectiveDate: "2026-01-01", changeSummary: "Initial manufacturing profile." }],
};
