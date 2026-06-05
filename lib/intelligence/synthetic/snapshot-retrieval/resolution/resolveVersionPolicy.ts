import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticSnapshotVersionPolicy } from "../../types/snapshot-storage";
import type { SyntheticSnapshotRetrievalConsumer, SyntheticSnapshotRetrievalMode } from "../types";

export interface ResolveVersionPolicyInput {
  mode: SyntheticSnapshotRetrievalMode;
  versionPolicy: SyntheticSnapshotVersionPolicy;
  retrievalConsumer: SyntheticSnapshotRetrievalConsumer;
  exactVersion?: number;
  includeSuperseded?: boolean;
}

export interface ResolveVersionPolicyResult {
  status: "resolved" | "invalid";
  versionPolicy: SyntheticSnapshotVersionPolicy;
  includeSuperseded: boolean;
  requiresExactVersion: boolean;
  requiresFinalizedOnly: boolean;
  errors: string[];
  retrievalDeterminismHash: string;
}

export function resolveVersionPolicy(input: ResolveVersionPolicyInput): ResolveVersionPolicyResult {
  const errors: string[] = [];
  const requiresExactVersion = input.versionPolicy === "exact_version" || input.mode === "exact_version_snapshot";
  const includeSuperseded = input.includeSuperseded || input.versionPolicy === "include_superseded" || input.mode === "audit_history";
  const requiresFinalizedOnly = input.versionPolicy === "latest_finalized" && !includeSuperseded;

  if (requiresExactVersion && (!input.exactVersion || input.exactVersion <= 0)) {
    errors.push("exactVersion is required for exact_version policy.");
  }

  if (input.mode === "exact_version_snapshot" && input.versionPolicy !== "exact_version") {
    errors.push("exact_version_snapshot mode requires exact_version policy.");
  }

  if (input.mode === "latest_finalized_snapshot" && input.versionPolicy === "exact_version") {
    errors.push("latest_finalized_snapshot mode cannot use exact_version policy.");
  }

  return {
    status: errors.length ? "invalid" : "resolved",
    versionPolicy: input.versionPolicy,
    includeSuperseded,
    requiresExactVersion,
    requiresFinalizedOnly,
    errors,
    retrievalDeterminismHash: stableSnapshotHash({
      resolver: "resolveVersionPolicy",
      mode: input.mode,
      versionPolicy: input.versionPolicy,
      retrievalConsumer: input.retrievalConsumer,
      exactVersion: input.exactVersion,
      includeSuperseded,
      requiresExactVersion,
      requiresFinalizedOnly,
      errors,
    }),
  };
}
