import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticHistoricalSnapshotRecord } from "../../types/snapshot-storage";
import type { SyntheticSnapshotRetrievalConsumer, SyntheticSnapshotCoverage } from "../types";

export interface ResolveLatestFinalizedSnapshotInput {
  snapshots: SyntheticHistoricalSnapshotRecord[];
  companyId: string;
  sourceSystem?: SyntheticHistoricalSnapshotRecord["sourceSystem"];
  tenantId?: string | null;
  periodKey?: string;
  retrievalConsumer: SyntheticSnapshotRetrievalConsumer;
}

export interface ResolveLatestFinalizedSnapshotResult {
  status: "resolved" | "missing";
  snapshot?: SyntheticHistoricalSnapshotRecord;
  candidates: SyntheticHistoricalSnapshotRecord[];
  retrievalDeterminismHash: string;
  coverage: SyntheticSnapshotCoverage;
}

function compareDateDesc(left?: string, right?: string) {
  return String(right || "").localeCompare(String(left || ""));
}

export function compareLatestFinalizedSnapshots(
  left: SyntheticHistoricalSnapshotRecord,
  right: SyntheticHistoricalSnapshotRecord,
) {
  return (
    right.snapshotVersion - left.snapshotVersion ||
    compareDateDesc(left.finalizedAt, right.finalizedAt) ||
    compareDateDesc(left.createdAt, right.createdAt) ||
    left.snapshotId.localeCompare(right.snapshotId)
  );
}

export function resolveLatestFinalizedSnapshot(
  input: ResolveLatestFinalizedSnapshotInput,
): ResolveLatestFinalizedSnapshotResult {
  const candidates = input.snapshots
    .filter((snapshot) => snapshot.companyId === input.companyId)
    .filter((snapshot) => !input.sourceSystem || snapshot.sourceSystem === input.sourceSystem)
    .filter((snapshot) => input.tenantId === undefined || snapshot.tenantId === input.tenantId)
    .filter((snapshot) => !input.periodKey || snapshot.periodKey === input.periodKey)
    .filter((snapshot) => snapshot.snapshotStatus === "finalized")
    .sort(compareLatestFinalizedSnapshots);
  const snapshot = candidates[0];
  const requestedPeriods = input.periodKey ? [input.periodKey] : [];
  const retrievedPeriods = snapshot ? [snapshot.periodKey] : [];
  const missingPeriods = requestedPeriods.filter((periodKey) => !retrievedPeriods.includes(periodKey));

  return {
    status: snapshot ? "resolved" : "missing",
    snapshot,
    candidates,
    retrievalDeterminismHash: stableSnapshotHash({
      resolver: "resolveLatestFinalizedSnapshot",
      companyId: input.companyId,
      sourceSystem: input.sourceSystem,
      tenantId: input.tenantId,
      periodKey: input.periodKey,
      retrievalConsumer: input.retrievalConsumer,
      versionPolicy: "latest_finalized",
      snapshotIds: snapshot ? [snapshot.snapshotId] : [],
    }),
    coverage: {
      requestedPeriods,
      retrievedPeriods,
      missingPeriods,
      requestedCount: requestedPeriods.length,
      retrievedCount: retrievedPeriods.length,
      missingCount: missingPeriods.length,
      coveragePercent: requestedPeriods.length ? (retrievedPeriods.length / requestedPeriods.length) * 100 : 0,
    },
  };
}
