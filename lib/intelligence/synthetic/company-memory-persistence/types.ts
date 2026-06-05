import type { SyntheticCompanyMemoryRecordInput } from "../company-memory-record-input";
import type { SyntheticMemoryPromotionMetadata } from "../company-memory-promotion";
import type {
  SyntheticCompanyMemorySourceAuthority,
  SyntheticCompanyMemoryStatus,
  SyntheticCompanyMemoryType,
} from "../types/company-memory";

export type SyntheticCompanyMemoryPersistenceStatus =
  | "pending"
  | "persisted"
  | "superseded"
  | "archived"
  | "blocked";

export type SyntheticCompanyMemoryPersistenceActor =
  | "system"
  | "advisor"
  | "admin"
  | "migration";

export type SyntheticCompanyMemoryPersistenceSource =
  | "company_memory_record_input"
  | "repair"
  | "backfill"
  | "manual_import";

export type SyntheticCompanyMemoryPersistenceAuditEventType =
  | "created"
  | "superseded"
  | "archived"
  | "retained"
  | "legal_hold_applied"
  | "legal_hold_released"
  | "validation_failed";

export interface SyntheticCompanyMemoryPersistenceRequest {
  companyId: string;
  recordInputs: SyntheticCompanyMemoryRecordInput[];
  persistenceActor: SyntheticCompanyMemoryPersistenceActor;
  persistenceSource: SyntheticCompanyMemoryPersistenceSource;
  requestedAt: string;
}

export interface SyntheticCompanyMemoryPersistenceLineage {
  memoryId: string;
  recordInputId: string;
  candidateId: string;
  promotionId: string;
  ingestionId: string;
  retrievalId: string;
  retrievalLineageId: string;
  recordInputDeterminismHash: string;
  promotionDeterminismHash: string;
  retrievalDeterminismHash: string;
  sourceReferenceIds: string[];
  snapshotIds: string[];
}

export interface SyntheticCompanyMemoryPersistenceAudit {
  auditId: string;
  memoryId: string;
  auditEventType: SyntheticCompanyMemoryPersistenceAuditEventType;
  recordInputReadinessStatus: "ready";
  persistenceActor: SyntheticCompanyMemoryPersistenceActor;
  persistenceSource: SyntheticCompanyMemoryPersistenceSource;
  persistedAt: string;
}

export interface SyntheticCompanyMemoryPersistedRecord {
  memoryId: string;
  companyId: string;
  memoryType: SyntheticCompanyMemoryType;
  memoryStatus: SyntheticCompanyMemoryStatus;
  memorySourceAuthority: SyntheticCompanyMemorySourceAuthority;
  recordVersion: number;
  persistenceStatus: SyntheticCompanyMemoryPersistenceStatus;
  persistenceDeterminismHash: string;
  recordInputDeterminismHash: string;
  promotionDeterminismHash: string;
  retrievalDeterminismHash: string;
  retrievalLineageId: string;
  promotionMetadata: SyntheticMemoryPromotionMetadata;
  lineage: SyntheticCompanyMemoryPersistenceLineage;
  audit: SyntheticCompanyMemoryPersistenceAudit;
}

export interface SyntheticCompanyMemoryPersistenceMetadata {
  persistenceRunId: string;
  companyId: string;
  requestedAt: string;
  persistedAt: string;
  persistenceActor: SyntheticCompanyMemoryPersistenceActor;
  persistenceSource: SyntheticCompanyMemoryPersistenceSource;
  persistenceStatus: SyntheticCompanyMemoryPersistenceStatus;
  persistenceDeterminismHash: string;
  recordInputDeterminismHash: string;
  promotionDeterminismHash: string;
  retrievalDeterminismHash: string;
  retrievalLineageId: string;
  inputCount: number;
  persistedCount: number;
  skippedCount: number;
  blockedCount: number;
}

export interface SyntheticCompanyMemoryPersistenceResult {
  request: SyntheticCompanyMemoryPersistenceRequest;
  metadata: SyntheticCompanyMemoryPersistenceMetadata;
  persistedRecords: SyntheticCompanyMemoryPersistedRecord[];
  skippedInputIds: string[];
  blockedInputIds: string[];
  warnings: string[];
}
