import type { SyntheticCompanyMemoryRecord } from "../types/company-memory";
import type { SyntheticIndustryProfile } from "../types/industry-profile";
import type { SyntheticMetricSeries } from "../types/metric-series";
import type { SyntheticRootCauseCandidate, SyntheticSignalCandidate, SyntheticSignalSeverity } from "../types/signal";

export interface SyntheticSignalCandidateInput {
  signalType: string;
  metricSeries: SyntheticMetricSeries;
  createdAt: string;
  threshold?: number;
  direction?: "increase" | "decrease" | "absolute";
  industryProfile?: SyntheticIndustryProfile | null;
  companyMemory?: SyntheticCompanyMemoryRecord[];
  relatedSignalIds?: string[];
  correlationGroupId?: string;
  rootCauseCandidate?: SyntheticRootCauseCandidate;
}

export interface SyntheticSignalThreshold {
  value: number;
  direction: "increase" | "decrease" | "absolute";
}

export interface SyntheticSignalSeverityInput {
  variancePercent: number | null;
  threshold: SyntheticSignalThreshold;
  confidenceTier?: "high" | "medium" | "low";
}

export type SyntheticSignalCandidateBuilder = (input: Omit<SyntheticSignalCandidateInput, "signalType">) => SyntheticSignalCandidate[];
export type SyntheticResolvedSignalSeverity = SyntheticSignalSeverity | null;
