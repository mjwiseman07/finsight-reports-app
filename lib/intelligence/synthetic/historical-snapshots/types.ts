import type {
  SyntheticHistoricalSnapshotRecord,
  SyntheticSnapshotCreatedByProcess,
  SyntheticSnapshotIndustryContext,
  SyntheticSnapshotPayload,
  SyntheticSnapshotStatus,
} from "../types/snapshot-storage";
import type { SyntheticIntelligencePeriod, SyntheticIntelligenceSourceSystem } from "../types/core";

export interface SyntheticSnapshotNormalizedDataInput {
  sourceSystem: SyntheticIntelligenceSourceSystem;
  adapterName: string;
  companyId: string | null;
  connectionId: string;
  tenantId: string | null;
  tenantName: string;
  syncId: string;
  reportPeriod: SyntheticIntelligencePeriod;
  mappedAt: string;
  rawReportsPulled: Record<string, boolean>;
  syncStatus: string;
  normalizedBalanceSheet?: Record<string, unknown>[];
  normalizedIncomeStatement?: Record<string, unknown>[];
  normalizedIncomeStatementYtd?: Record<string, unknown>[];
  normalizedTrialBalance?: Record<string, unknown>[];
  normalizedARAging?: Record<string, unknown>[];
  normalizedAPAging?: Record<string, unknown>[];
  normalizedBudgets?: Record<string, unknown>[];
  normalizedDepartments?: Record<string, unknown>[];
  normalizedLocations?: Record<string, unknown>[];
  normalizedClasses?: Record<string, unknown>[];
  normalizedProjects?: Record<string, unknown>[];
  normalizedVendors?: Record<string, unknown>[];
  normalizedCustomers?: Record<string, unknown>[];
  validation: {
    readyForReporting: boolean;
    warnings: string[];
  };
}

export interface BuildHistoricalSnapshotRecordInput {
  normalizedData: SyntheticSnapshotNormalizedDataInput;
  snapshotVersion: number;
  snapshotStatus?: SyntheticSnapshotStatus;
  createdAt: string;
  finalizedAt?: string;
  supersedesSnapshotId?: string;
  supersededBySnapshotId?: string;
  createdByProcess?: SyntheticSnapshotCreatedByProcess;
  snapshotIndustryContext?: SyntheticSnapshotIndustryContext;
  fixedAssets?: Record<string, unknown>[];
  inventory?: Record<string, unknown>[];
  payroll?: Record<string, unknown>[];
  debt?: Record<string, unknown>[];
}

export interface BuildSnapshotSeriesInput {
  records: SyntheticHistoricalSnapshotRecord[];
  companyId: string | null;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  tenantId: string | null;
  endPeriod: string;
  window: 12 | 24 | 36 | 60;
  includeSuperseded?: boolean;
  exactVersion?: number;
}

export type SnapshotPayloadBuilderInput = Pick<
  BuildHistoricalSnapshotRecordInput,
  "normalizedData" | "fixedAssets" | "inventory" | "payroll" | "debt"
>;

export type SnapshotPayloadBuilder = (input: SnapshotPayloadBuilderInput) => SyntheticSnapshotPayload;
