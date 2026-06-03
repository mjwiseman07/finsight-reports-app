import type { SyntheticConfidenceFactor } from "../types/confidence";
import type { SyntheticIndustryProfile } from "../types/industry-profile";

export interface SyntheticIndustryProfileConfidenceInput {
  profile?: SyntheticIndustryProfile | null;
  metricKey?: string;
  benchmarkAvailable?: boolean;
}

export function scoreIndustryProfileCoverage(input: SyntheticIndustryProfileConfidenceInput): SyntheticConfidenceFactor[] {
  if (!input.profile) {
    return [{ code: "industry_benchmark_unavailable", label: "Industry Profile", impact: "neutral", factorContribution: 0 }];
  }
  const factors: SyntheticConfidenceFactor[] = [
    { code: "industry_profile_present", label: "Industry Profile", impact: "positive", factorContribution: 0.15 },
  ];
  const metricCovered = input.metricKey ? input.profile.metricCatalog.some((metric) => metric.metricKey === input.metricKey) : true;
  if (metricCovered) {
    factors.push({ code: "industry_profile_available", label: "Industry Metric Coverage", impact: "positive", factorContribution: 0.05 });
  }
  if (!input.benchmarkAvailable) {
    factors.push({ code: "industry_benchmark_unavailable", label: "Industry Benchmark", impact: "neutral", factorContribution: 0 });
  }
  return factors;
}
