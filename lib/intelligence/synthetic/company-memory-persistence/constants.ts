import type {
  SyntheticCompanyMemoryPersistenceActor,
  SyntheticCompanyMemoryPersistenceAuditEventType,
  SyntheticCompanyMemoryPersistenceSource,
  SyntheticCompanyMemoryPersistenceStatus,
} from "./types";

export const SYNTHETIC_COMPANY_MEMORY_PERSISTENCE_SCHEMA_VERSION = 1;

export const SYNTHETIC_COMPANY_MEMORY_PERSISTENCE_STATUSES: SyntheticCompanyMemoryPersistenceStatus[] = [
  "pending",
  "persisted",
  "superseded",
  "archived",
  "blocked",
];

export const SYNTHETIC_COMPANY_MEMORY_PERSISTENCE_ACTORS: SyntheticCompanyMemoryPersistenceActor[] = [
  "system",
  "advisor",
  "admin",
  "migration",
];

export const SYNTHETIC_COMPANY_MEMORY_PERSISTENCE_SOURCES: SyntheticCompanyMemoryPersistenceSource[] = [
  "company_memory_record_input",
  "repair",
  "backfill",
  "manual_import",
];

export const SYNTHETIC_COMPANY_MEMORY_PERSISTENCE_AUDIT_EVENT_TYPES: SyntheticCompanyMemoryPersistenceAuditEventType[] = [
  "created",
  "superseded",
  "archived",
  "retained",
  "legal_hold_applied",
  "legal_hold_released",
  "validation_failed",
];

export const SYNTHETIC_COMPANY_MEMORY_PERSISTENCE_SOURCE_AUTHORITY = "historical_snapshot";
