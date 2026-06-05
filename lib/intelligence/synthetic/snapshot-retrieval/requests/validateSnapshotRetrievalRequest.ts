import { SYNTHETIC_SNAPSHOT_RETRIEVAL_CONSUMERS, SYNTHETIC_SNAPSHOT_RETRIEVAL_MODES, SYNTHETIC_SNAPSHOT_RETRIEVAL_WINDOWS } from "../constants";
import type {
  SyntheticSnapshotRetrievalRequest,
  SyntheticSnapshotRetrievalValidationResult,
} from "../types";

const versionPolicies = ["latest_finalized", "include_superseded", "exact_version"];

export function validateSnapshotRetrievalRequest(
  request: SyntheticSnapshotRetrievalRequest,
): SyntheticSnapshotRetrievalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!request.companyId?.trim()) errors.push("companyId is required for company-scoped retrieval.");
  if (!request.sourceSystem) errors.push("sourceSystem is required.");
  if (!SYNTHETIC_SNAPSHOT_RETRIEVAL_MODES.includes(request.mode)) errors.push(`Unsupported retrieval mode: ${request.mode}.`);
  if (!SYNTHETIC_SNAPSHOT_RETRIEVAL_CONSUMERS.includes(request.retrievalConsumer)) {
    errors.push(`Unsupported retrieval consumer: ${request.retrievalConsumer}.`);
  }
  if (!versionPolicies.includes(request.versionPolicy)) errors.push(`Unsupported version policy: ${request.versionPolicy}.`);

  if (request.mode === "exact_version_snapshot") {
    if (!request.periodKey?.trim()) errors.push("periodKey is required for exact version retrieval.");
    if (!request.exactVersion || request.exactVersion <= 0) errors.push("exactVersion must be positive for exact version retrieval.");
    if (request.versionPolicy !== "exact_version") warnings.push("Exact version retrieval should use versionPolicy exact_version.");
  }

  if (request.mode === "latest_finalized_snapshot" && !request.periodKey?.trim()) {
    errors.push("periodKey is required for latest finalized snapshot retrieval.");
  }

  if (request.mode === "window" || request.mode === "latest_finalized_window") {
    if (!request.endPeriodKey?.trim()) errors.push("endPeriodKey is required for window retrieval.");
    if (!request.window || !SYNTHETIC_SNAPSHOT_RETRIEVAL_WINDOWS.includes(request.window)) {
      errors.push("window must be one of 12, 24, 36, or 60.");
    }
  }

  if (request.mode === "audit_history" && !request.periodKey?.trim() && !request.endPeriodKey?.trim()) {
    errors.push("periodKey or endPeriodKey is required for audit retrieval.");
  }

  if (request.includeSuperseded && request.versionPolicy !== "include_superseded" && request.mode !== "audit_history") {
    warnings.push("includeSuperseded is intended for audit retrieval or include_superseded version policy.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
