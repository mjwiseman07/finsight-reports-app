export type AnomalyLayer = "L6";
export type AnomalySignalCode =
  | "unit_price_drift"
  | "threshold_splitting"
  | "round_number_clustering"
  | "off_hours_submission";
export type AnomalySeverity = "HIGH" | "MEDIUM";

export interface AnomalySignal {
  code: AnomalySignalCode;
  severity: AnomalySeverity;
  evidence: Record<string, unknown>;
}

export interface AnomalyDetectionResult {
  signals: AnomalySignal[];
  hasHighSeverity: boolean;
}

export interface VendorBaseline {
  sample_size: number;
  amount_mean_cents: number;
  amount_stddev_cents: number;
  amount_p25_cents: number;
  amount_p75_cents: number;
  avg_arrival_hour_utc: number;
  arrival_hour_stddev: number;
  round_amount_ratio: number;
}
