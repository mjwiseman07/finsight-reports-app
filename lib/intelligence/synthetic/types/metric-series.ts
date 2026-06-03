export interface SyntheticMetricSeriesPeriod {
  startDate: string;
  endDate: string;
  label?: string;
  sequence?: number;
}

export interface SyntheticMetricSeriesSource {
  snapshotId?: string;
  evidenceId?: string;
  sourceSystem?: string;
  sourceReport?: string;
}

export interface SyntheticMetricSeriesPoint {
  period: SyntheticMetricSeriesPeriod;
  value: number | null;
  source?: SyntheticMetricSeriesSource;
  qualityFlags?: string[];
}

export interface SyntheticMetricSeriesCoverage {
  requestedPeriods: number;
  availablePeriods: number;
  missingPeriods?: string[];
}

export interface SyntheticMetricSeriesComparison {
  currentPeriod: SyntheticMetricSeriesPeriod;
  comparisonPeriod: SyntheticMetricSeriesPeriod;
  currentValue: number | null;
  comparisonValue: number | null;
  varianceAmount?: number | null;
  variancePercent?: number | null;
}

export interface SyntheticMetricSeries {
  metricKey: string;
  label?: string;
  unit?: "currency" | "percent" | "days" | "count" | "ratio" | "text";
  points: SyntheticMetricSeriesPoint[];
  coverage?: SyntheticMetricSeriesCoverage;
}
