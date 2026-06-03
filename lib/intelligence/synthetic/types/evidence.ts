export type SyntheticEvidenceQualityFlag =
  | "complete"
  | "partial"
  | "missing_optional_schedule"
  | "validation_warning"
  | "source_unavailable"
  | "low_history";

export interface SyntheticEvidenceSourceRef {
  snapshotId?: string;
  syncId?: string;
  sourceSystem?: string;
  sourceReport?: string;
  externalEntityId?: string;
  externalRecordId?: string;
  rowLabel?: string;
  rowSection?: string;
}

export interface SyntheticEvidenceMetricValue {
  metricKey: string;
  label?: string;
  value: number | null;
  unit?: "currency" | "percent" | "days" | "count" | "ratio" | "text";
  period?: string;
}

export interface SyntheticEvidencePeriodComparison {
  current: SyntheticEvidenceMetricValue;
  comparison?: SyntheticEvidenceMetricValue;
  varianceAmount?: number | null;
  variancePercent?: number | null;
}

export interface SyntheticEvidenceRecord {
  id: string;
  companyId: string | null;
  moduleKey: string;
  evidenceType: "source_row" | "metric_value" | "period_comparison" | "threshold" | "trace" | "context";
  sourceRefs: SyntheticEvidenceSourceRef[];
  metrics?: SyntheticEvidenceMetricValue[];
  comparisons?: SyntheticEvidencePeriodComparison[];
  qualityFlags?: SyntheticEvidenceQualityFlag[];
  createdAt: string;
}
