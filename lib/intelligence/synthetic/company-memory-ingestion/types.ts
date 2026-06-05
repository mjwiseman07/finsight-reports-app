import type {
  SyntheticCompanyMemoryConfidence,
  SyntheticCompanyMemoryFreshness,
  SyntheticCompanyMemoryType,
} from "../types/company-memory";
import type { SyntheticIntelligenceSourceSystem } from "../types/core";
import type {
  SyntheticSnapshotRetrievalConsumer,
  SyntheticSnapshotRetrievalResult,
} from "../snapshot-retrieval";

export type SyntheticMemoryIngestionConsumer = "company_memory";

export type SyntheticMemoryIngestionMode =
  | "snapshot_source_references"
  | "candidate_generation"
  | "dedupe_review";

export type SyntheticMemoryCandidateStatus =
  | "candidate"
  | "duplicate"
  | "conflicting"
  | "stale"
  | "superseded";

export type SyntheticMemoryCandidateKind =
  | "recurring_customer_concentration"
  | "recurring_cash_pressure"
  | "recurring_margin_decline"
  | "recurring_working_capital_observation";

export type SyntheticMemoryCandidateObservationStrength =
  | "weak"
  | "moderate"
  | "strong"
  | "persistent";

export interface SyntheticMemoryIngestionRequest {
  companyId: string;
  retrievalResult: SyntheticSnapshotRetrievalResult;
  ingestionConsumer: SyntheticMemoryIngestionConsumer;
  ingestionMode: SyntheticMemoryIngestionMode;
  requestedAt: string;
}

export interface SyntheticMemoryCoverage {
  requestedPeriods: string[];
  observedPeriods: string[];
  missingPeriods: string[];
  sourceReferenceCount: number;
  coveragePercent: number;
  retrievalAverageQualityScore: number | null;
}

export interface SyntheticMemorySourceReference {
  sourceType: "historical_snapshot";
  sourceId: string;
  snapshotId: string;
  companyId: string;
  periodKey: string;
  sourceSystem: SyntheticIntelligenceSourceSystem;
  tenantId: string | null;
  snapshotVersion: number;
  payloadHash: string;
  normalizedDataHash: string;
  retrievalLineageId: string;
  retrievalDeterminismHash: string;
}

export interface SyntheticMemoryIngestionLineage {
  ingestionId: string;
  candidateId?: string;
  retrievalId: string;
  retrievalLineageId: string;
  retrievalDeterminismHash: string;
  snapshotIds: string[];
  sourceReferenceIds: string[];
  observedPeriodKeys: string[];
  candidateDeterminismHash?: string;
}

export interface SyntheticMemoryCandidate {
  candidateId: string;
  companyId: string;
  memoryType: SyntheticCompanyMemoryType;
  candidateStatus: SyntheticMemoryCandidateStatus;
  candidateKind: SyntheticMemoryCandidateKind;
  sourceReferences: SyntheticMemorySourceReference[];
  observedPeriodKeys: string[];
  memoryConfidence: SyntheticCompanyMemoryConfidence;
  memoryFreshness: SyntheticCompanyMemoryFreshness;
  memorySourceAuthority: "historical_snapshot";
  memoryCoverage: SyntheticMemoryCoverage;
  candidateObservationStrength: SyntheticMemoryCandidateObservationStrength;
  candidateStabilityScore: number;
  lineage: SyntheticMemoryIngestionLineage;
}

export interface SyntheticMemoryIngestionMetadata {
  ingestionId: string;
  companyId: string;
  retrievalId: string;
  retrievalConsumer: SyntheticSnapshotRetrievalConsumer;
  retrievalLineageId: string;
  retrievalDeterminismHash: string;
  ingestionDeterminismHash: string;
  requestedAt: string;
  completedAt: string;
  executionDurationMs: number;
  sourceReferenceCount: number;
  candidateCount: number;
  memoryCoverage: SyntheticMemoryCoverage;
}

export interface SyntheticMemoryIngestionResult {
  request: SyntheticMemoryIngestionRequest;
  metadata: SyntheticMemoryIngestionMetadata;
  sourceReferences: SyntheticMemorySourceReference[];
  candidates: SyntheticMemoryCandidate[];
  duplicateCandidateIds: string[];
  conflictingCandidateIds: string[];
  staleCandidateIds: string[];
  supersededCandidateIds: string[];
  warnings: string[];
}
