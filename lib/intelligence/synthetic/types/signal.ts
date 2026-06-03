import type { SyntheticConfidenceScore } from "./confidence";

export type SyntheticSignalSeverity = "low" | "medium" | "high" | "critical";
export type SyntheticSignalStatus = "candidate" | "new" | "reviewed" | "dismissed" | "converted_to_recommendation";

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
