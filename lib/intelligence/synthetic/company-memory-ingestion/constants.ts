import type {
  SyntheticMemoryCandidateKind,
  SyntheticMemoryCandidateObservationStrength,
  SyntheticMemoryCandidateStatus,
  SyntheticMemoryIngestionMode,
} from "./types";

export const SYNTHETIC_MEMORY_INGESTION_SCHEMA_VERSION = 1;

export const SYNTHETIC_MEMORY_INGESTION_MODES: SyntheticMemoryIngestionMode[] = [
  "snapshot_source_references",
  "candidate_generation",
  "dedupe_review",
];

export const SYNTHETIC_MEMORY_CANDIDATE_STATUSES: SyntheticMemoryCandidateStatus[] = [
  "candidate",
  "duplicate",
  "conflicting",
  "stale",
  "superseded",
];

export const SYNTHETIC_MEMORY_CANDIDATE_KINDS: SyntheticMemoryCandidateKind[] = [
  "recurring_customer_concentration",
  "recurring_cash_pressure",
  "recurring_margin_decline",
  "recurring_working_capital_observation",
];

export const SYNTHETIC_MEMORY_OBSERVATION_STRENGTHS: SyntheticMemoryCandidateObservationStrength[] = [
  "weak",
  "moderate",
  "strong",
  "persistent",
];

export const SYNTHETIC_MEMORY_OBSERVATION_STRENGTH_PERIODS: Record<
  SyntheticMemoryCandidateObservationStrength,
  number
> = {
  weak: 1,
  moderate: 3,
  strong: 12,
  persistent: 24,
};

export const SYNTHETIC_MEMORY_STABILITY_SCORE_MIN = 0;
export const SYNTHETIC_MEMORY_STABILITY_SCORE_MAX = 1;
export const SYNTHETIC_MEMORY_SOURCE_AUTHORITY = "historical_snapshot";
