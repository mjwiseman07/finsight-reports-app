import type { SyntheticIntelligencePeriod, SyntheticIntelligenceSourceSystem } from "./core";

export type SyntheticHistoryWindow = 12 | 24 | 36 | 60;

export interface SyntheticHistoricalSnapshotRef {
  snapshotId: string;
  companyId: string | null;
  connectionId: string;
  syncId: string;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  tenantId: string | null;
  reportPeriod: SyntheticIntelligencePeriod;
}

export interface SyntheticSnapshotCoverageSummary {
  requestedMonths: SyntheticHistoryWindow;
  availableMonths: number;
  missingPeriods?: string[];
  hasBalanceSheet: boolean;
  hasIncomeStatement: boolean;
  hasARAging?: boolean;
  hasAPAging?: boolean;
  hasCashFlow?: boolean;
}

export interface SyntheticHistoricalSnapshotReadModel {
  ref: SyntheticHistoricalSnapshotRef;
  validationReadyForReporting: boolean;
  validationWarnings: string[];
  rawReportsPulled: Record<string, boolean>;
  normalizedObjectCounts: Record<string, number>;
}

export interface SyntheticHistoricalSnapshotSeries {
  companyId: string | null;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  window: SyntheticHistoryWindow;
  coverage: SyntheticSnapshotCoverageSummary;
  snapshots: SyntheticHistoricalSnapshotReadModel[];
}
