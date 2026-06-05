import type { SyntheticCompanyMemoryRecordInputReadinessStatus } from "./types";

export const SYNTHETIC_COMPANY_MEMORY_RECORD_INPUT_SCHEMA_VERSION = 1;

export const SYNTHETIC_COMPANY_MEMORY_RECORD_INPUT_READINESS_STATUSES: SyntheticCompanyMemoryRecordInputReadinessStatus[] = [
  "ready",
  "skipped",
  "blocked",
];

export const SYNTHETIC_COMPANY_MEMORY_RECORD_INPUT_SOURCE_AUTHORITY = "historical_snapshot";
