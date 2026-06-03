import type { SyntheticCompanyMemoryRecord } from "../types/company-memory";
import type { SyntheticEvidenceQualityFlag } from "../types/evidence";
import type { SyntheticFormulaRegistryEntry } from "../types/formula";
import type { SyntheticHistoricalSnapshotSeries } from "../types/historical-snapshot";
import type { SyntheticIndustryProfile } from "../types/industry-profile";
import type { SyntheticKpiDefinition } from "../types/kpi";
import type { SyntheticMetricSeriesPeriod } from "../types/metric-series";

export interface SyntheticMetricSeriesValueInput {
  period: SyntheticMetricSeriesPeriod;
  value: number | null;
  snapshotId?: string;
  sourceSystem?: string;
  sourceReport?: string;
  qualityFlags?: SyntheticEvidenceQualityFlag[];
}

export interface SyntheticMetricSeriesBuilderInput {
  metricKey: string;
  label: string;
  values: SyntheticMetricSeriesValueInput[];
  snapshotSeries: SyntheticHistoricalSnapshotSeries;
  kpiDefinition: SyntheticKpiDefinition;
  formulaRegistryEntry: SyntheticFormulaRegistryEntry;
  industryProfile?: SyntheticIndustryProfile | null;
  companyMemory?: SyntheticCompanyMemoryRecord[];
  createdAt: string;
  parentMetricIds?: string[];
  sourceMetricIds?: string[];
  hasCashFlow?: boolean;
  missingRequiredEvidence?: boolean;
  missingOptionalSchedules?: number;
}
