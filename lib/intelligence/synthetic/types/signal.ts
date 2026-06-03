import type { SyntheticConfidenceScore } from "./confidence";

export type SyntheticSignalSeverity = "low" | "medium" | "high" | "critical";
export type SyntheticSignalStatus = "candidate" | "new" | "reviewed" | "dismissed" | "converted_to_recommendation";
export type SyntheticSignalCandidateLifecycleStatus = "created" | "acknowledged" | "resolved" | "expired";

export interface SyntheticSignalEvidenceLink {
  evidenceId: string;
  role: "primary" | "supporting" | "context" | "trace";
}

export interface SyntheticSignal {
  id: string;
  companyId: string | null;
  sourceSystem?: string;
  period?: string;
  signalType: string;
  metricKey: string;
  moduleKey: string;
  severity: SyntheticSignalSeverity;
  status: SyntheticSignalStatus;
  confidence: SyntheticConfidenceScore;
  currentValue?: number | null;
  comparisonValue?: number | null;
  varianceAmount?: number | null;
  variancePercent?: number | null;
  threshold?: number | null;
  evidence: SyntheticSignalEvidenceLink[];
  calculationTraceId?: string;
  createdAt: string;
}

export interface SyntheticRootCauseCandidate {
  signalId?: string;
  signalType: string;
  metricKey: string;
  confidence?: SyntheticConfidenceScore;
}

export interface SyntheticSignalCandidate {
  signalId: string;
  signalType: string;
  metricKey: string;
  severity: SyntheticSignalSeverity;
  confidence: SyntheticConfidenceScore;
  evidenceIds: string[];
  calculationTraceIds: string[];
  sourceMetricIds: string[];
  industryProfileId?: string;
  companyMemoryRefs: string[];
  relatedSignalIds: string[];
  correlationGroupId?: string;
  rootCauseCandidate?: SyntheticRootCauseCandidate;
  status: SyntheticSignalCandidateLifecycleStatus;
  currentValue?: number | null;
  comparisonValue?: number | null;
  varianceAmount?: number | null;
  variancePercent?: number | null;
  threshold?: number | null;
  direction?: "increase" | "decrease" | "absolute";
  period?: string;
  metricSeriesKey?: string;
  createdAt: string;
}
