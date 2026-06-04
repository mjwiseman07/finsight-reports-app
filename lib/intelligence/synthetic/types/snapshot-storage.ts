import type { SyntheticHistoryWindow } from "./historical-snapshot";
import type { SyntheticIntelligencePeriod, SyntheticIntelligenceSourceSystem } from "./core";

export type SyntheticSnapshotStatus = "draft" | "finalized" | "superseded" | "invalid";
export type SyntheticSnapshotVersionPolicy = "latest_finalized" | "include_superseded" | "exact_version";
export type SyntheticSnapshotCreatedByProcess = "sync" | "backfill" | "refresh" | "repair";
export type SyntheticSnapshotIndustryProfileSource = "default" | "company_selected" | "advisor_selected" | "system_inferred";
export type SyntheticSnapshotQualityImpact = "positive" | "negative" | "neutral";

export interface SyntheticSnapshotIdentity {
  snapshotId: string;
  companyId: string | null;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  tenantId: string | null;
  tenantName: string;
  connectionId: string;
  syncId: string;
  reportPeriod: SyntheticIntelligencePeriod;
  periodKey: string;
  snapshotVersion: number;
}

export interface SyntheticSnapshotIndustryContext {
  industryProfileId?: string;
  industryProfileVersion?: string;
  industryProfileEffectiveDate?: string;
  industryProfileSource?: SyntheticSnapshotIndustryProfileSource;
}

export interface SyntheticSnapshotAvailabilitySummary {
  hasBalanceSheet: boolean;
  hasIncomeStatement: boolean;
  hasTrialBalance: boolean;
  hasARAging: boolean;
  hasAPAging: boolean;
  hasFixedAssets: boolean;
  hasInventory: boolean;
  hasPayroll: boolean;
  hasDebt: boolean;
  hasBudgets: boolean;
  rowCounts: Record<string, number>;
  sourceReports: Record<string, string[]>;
}

export interface SyntheticSnapshotPayload {
  balanceSheet: Record<string, unknown>[];
  incomeStatement: Record<string, unknown>[];
  incomeStatementYtd?: Record<string, unknown>[];
  trialBalance: Record<string, unknown>[];
  arAging: Record<string, unknown>[];
  apAging: Record<string, unknown>[];
  fixedAssets: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  payroll: Record<string, unknown>[];
  debt: Record<string, unknown>[];
  budgets: Record<string, unknown>[];
  dimensions?: {
    departments?: Record<string, unknown>[];
    locations?: Record<string, unknown>[];
    classes?: Record<string, unknown>[];
    projects?: Record<string, unknown>[];
    vendors?: Record<string, unknown>[];
    customers?: Record<string, unknown>[];
  };
}

export interface SyntheticSnapshotLineage {
  snapshotId: string;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  adapterName: string;
  connectionId: string;
  tenantId: string | null;
  tenantName: string;
  syncId: string;
  reportPeriod: SyntheticIntelligencePeriod;
  sourceReportNames: string[];
  rawReportsPulled: Record<string, boolean>;
  normalizedObjectCounts: Record<string, number>;
  validationReadyForReporting: boolean;
  validationWarnings: string[];
  createdFromNormalizedDataHash: string;
}

export interface SyntheticSnapshotQualityFactor {
  code: string;
  label: string;
  impact: SyntheticSnapshotQualityImpact;
  factorContribution: number;
}

export interface SyntheticSnapshotQualityScore {
  snapshotQualityScore: number;
  snapshotQualityFactors: SyntheticSnapshotQualityFactor[];
}

export interface SyntheticSnapshotAudit {
  snapshotId: string;
  snapshotVersion: number;
  createdAt: string;
  createdByProcess: SyntheticSnapshotCreatedByProcess;
  sourceSyncId: string;
  normalizedDataHash: string;
  payloadHash: string;
  validationWarnings: string[];
  availabilitySummary: SyntheticSnapshotAvailabilitySummary;
  snapshotIndustryContext: SyntheticSnapshotIndustryContext;
  snapshotQualityScore: number;
  snapshotQualityFactors: SyntheticSnapshotQualityFactor[];
  supersedesSnapshotId?: string;
  supersededBySnapshotId?: string;
}

export interface SyntheticHistoricalSnapshotRecord {
  snapshotId: string;
  companyId: string | null;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  tenantId: string | null;
  tenantName: string;
  connectionId: string;
  syncId: string;
  reportPeriod: SyntheticIntelligencePeriod;
  periodKey: string;
  snapshotVersion: number;
  snapshotStatus: SyntheticSnapshotStatus;
  sourceSyncStatus: string;
  createdAt: string;
  finalizedAt?: string;
  supersededBySnapshotId?: string;
  snapshotLineage: SyntheticSnapshotLineage;
  snapshotIndustryContext: SyntheticSnapshotIndustryContext;
  snapshotPayload: SyntheticSnapshotPayload;
  snapshotAudit: SyntheticSnapshotAudit;
}

export interface SyntheticSnapshotBackfillPlan {
  backfillRunId: string;
  requestedWindow: SyntheticHistoryWindow;
  requestedPeriods: string[];
  completedPeriods: string[];
  failedPeriods: string[];
  missingPeriods: string[];
  providerRateLimitNotes?: string[];
}

export interface SyntheticSnapshotRetrievalRequest {
  companyId: string | null;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  tenantId: string | null;
  endPeriod: string;
  window: SyntheticHistoryWindow;
  versionPolicy: SyntheticSnapshotVersionPolicy;
  exactVersion?: number;
}
