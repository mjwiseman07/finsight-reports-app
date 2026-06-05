import type { SyntheticHistoryWindow } from "../types/historical-snapshot";
import type {
  SyntheticSnapshotRetrievalConsumer,
  SyntheticSnapshotRetrievalMode,
} from "./types";

export const SYNTHETIC_SNAPSHOT_RETRIEVAL_WINDOWS: SyntheticHistoryWindow[] = [12, 24, 36, 60];

export const SYNTHETIC_SNAPSHOT_RETRIEVAL_MODES: SyntheticSnapshotRetrievalMode[] = [
  "latest_finalized_snapshot",
  "exact_version_snapshot",
  "latest_finalized_window",
  "window",
  "audit_history",
];

export const SYNTHETIC_SNAPSHOT_RETRIEVAL_CONSUMERS: SyntheticSnapshotRetrievalConsumer[] = [
  "company_memory",
  "forecast_foundation",
  "budget_foundation",
  "audit",
  "manual_verification",
];

export const SYNTHETIC_SNAPSHOT_LOW_QUALITY_THRESHOLD = 0.75;

export const SYNTHETIC_SNAPSHOT_RETRIEVAL_SCHEMA_VERSION = 1;
