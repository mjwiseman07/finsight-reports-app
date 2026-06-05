import type { SyntheticHistoryWindow } from "../types/historical-snapshot";
import type { SyntheticIntelligenceSourceSystem } from "../types/core";
import type {
  SyntheticHistoricalSnapshotRecord,
  SyntheticSnapshotVersionPolicy,
} from "../types/snapshot-storage";

export type SyntheticSnapshotRetrievalMode =
  | "latest_finalized_snapshot"
  | "exact_version_snapshot"
  | "latest_finalized_window"
  | "window"
  | "audit_history";

export type SyntheticSnapshotRetrievalConsumer =
  | "company_memory"
  | "forecast_foundation"
  | "budget_foundation"
  | "audit"
  | "manual_verification";

export type SyntheticSnapshotRetrievalWarningCode =
  | "missing_period"
  | "missing_version"
  | "version_conflict"
  | "superseded_excluded"
  | "coverage_incomplete"
  | "company_scope_violation"
  | "invalid_request";

export interface SyntheticSnapshotRetrievalRequest {
  companyId: string;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  tenantId: string | null;
  mode: SyntheticSnapshotRetrievalMode;
  retrievalConsumer: SyntheticSnapshotRetrievalConsumer;
  versionPolicy: SyntheticSnapshotVersionPolicy;
  endPeriodKey?: string;
  periodKey?: string;
  window?: SyntheticHistoryWindow;
  exactVersion?: number;
  includeSuperseded?: boolean;
  requestedBy?: string;
  requestedByRole?: string;
  requestedAt?: string;
}

export interface NormalizedSyntheticSnapshotRetrievalRequest extends SyntheticSnapshotRetrievalRequest {
  includeSuperseded: boolean;
  requestedAt: string;
}

export interface SyntheticSnapshotCoverage {
  requestedPeriods: string[];
  retrievedPeriods: string[];
  missingPeriods: string[];
  requestedCount: number;
  retrievedCount: number;
  missingCount: number;
  coveragePercent: number;
}

export interface SyntheticSnapshotRetrievalConfidenceSummary {
  requestedCount: number;
  retrievedCount: number;
  missingCount: number;
  averageSnapshotQualityScore: number | null;
  minSnapshotQualityScore: number | null;
  maxSnapshotQualityScore: number | null;
  hasMissingPeriods: boolean;
  hasLowQualitySnapshots: boolean;
}

export interface SyntheticSnapshotRetrievalLineage {
  retrievalId: string;
  retrievalConsumer: SyntheticSnapshotRetrievalConsumer;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  companyId: string;
  tenantId: string | null;
  requestedPeriodKeys: string[];
  resolvedSnapshotIds: string[];
  supersededSnapshotIds: string[];
  normalizedRequestHash: string;
}

export interface SyntheticSnapshotRetrievalMetadata {
  retrievalId: string;
  retrievalMode: SyntheticSnapshotRetrievalMode;
  retrievalConsumer: SyntheticSnapshotRetrievalConsumer;
  versionPolicy: SyntheticSnapshotVersionPolicy;
  companyId: string;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  tenantId: string | null;
  requestedAt: string;
  resolvedAt: string;
  retrievalExecutionDurationMs: number;
  retrievalDeterminismHash: string;
  endPeriodKey?: string;
  requestedWindow?: SyntheticHistoryWindow;
  exactVersion?: number;
  includeSuperseded: boolean;
  resultCount: number;
  snapshotIds: string[];
  periodKeys: string[];
  storageSchemaVersions: number[];
  persistenceVersions: number[];
  coverage: SyntheticSnapshotCoverage;
  retrievalConfidenceSummary: SyntheticSnapshotRetrievalConfidenceSummary;
  lineage: SyntheticSnapshotRetrievalLineage;
}

export interface SyntheticSnapshotRetrievalWarning {
  code: SyntheticSnapshotRetrievalWarningCode;
  message: string;
  periodKey?: string;
  snapshotId?: string;
}

export interface SyntheticSnapshotRetrievalResult {
  request: NormalizedSyntheticSnapshotRetrievalRequest;
  metadata: SyntheticSnapshotRetrievalMetadata;
  snapshots: SyntheticHistoricalSnapshotRecord[];
  missingPeriodKeys: string[];
  warnings: SyntheticSnapshotRetrievalWarning[];
}

export interface SyntheticSnapshotRetrievalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
