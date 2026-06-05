import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticHistoricalSnapshotRecord } from "../../types/snapshot-storage";
import type { SyntheticSnapshotCoverage, SyntheticSnapshotRetrievalConsumer } from "../types";

export interface ResolveSnapshotVersionInput {
  snapshots: SyntheticHistoricalSnapshotRecord[];
  companyId: string;
  sourceSystem?: SyntheticHistoricalSnapshotRecord["sourceSystem"];
  tenantId?: string | null;
  periodKey: string;
  exactVersion: number;
  retrievalConsumer: SyntheticSnapshotRetrievalConsumer;
  includeSuperseded?: boolean;
}

export interface ResolveSnapshotVersionResult {
  status: "resolved" | "missing_version" | "ambiguous";
  snapshot?: SyntheticHistoricalSnapshotRecord;
  matches: SyntheticHistoricalSnapshotRecord[];
  retrievalDeterminismHash: string;
  coverage: SyntheticSnapshotCoverage;
}

export function resolveSnapshotVersion(input: ResolveSnapshotVersionInput): ResolveSnapshotVersionResult {
  const matches = input.snapshots
    .filter((snapshot) => snapshot.companyId === input.companyId)
    .filter((snapshot) => !input.sourceSystem || snapshot.sourceSystem === input.sourceSystem)
    .filter((snapshot) => input.tenantId === undefined || snapshot.tenantId === input.tenantId)
    .filter((snapshot) => snapshot.periodKey === input.periodKey)
    .filter((snapshot) => snapshot.snapshotVersion === input.exactVersion)
    .filter((snapshot) => input.includeSuperseded || snapshot.snapshotStatus !== "superseded")
    .sort((left, right) => left.snapshotId.localeCompare(right.snapshotId));
  const snapshot = matches.length === 1 ? matches[0] : undefined;
  const retrievedPeriods = snapshot ? [snapshot.periodKey] : [];
  const missingPeriods = snapshot ? [] : [input.periodKey];

  return {
    status: matches.length === 0 ? "missing_version" : matches.length === 1 ? "resolved" : "ambiguous",
    snapshot,
    matches,
    retrievalDeterminismHash: stableSnapshotHash({
      resolver: "resolveSnapshotVersion",
      companyId: input.companyId,
      sourceSystem: input.sourceSystem,
      tenantId: input.tenantId,
      periodKey: input.periodKey,
      exactVersion: input.exactVersion,
      retrievalConsumer: input.retrievalConsumer,
      versionPolicy: "exact_version",
      includeSuperseded: Boolean(input.includeSuperseded),
      snapshotIds: matches.map((match) => match.snapshotId),
    }),
    coverage: {
      requestedPeriods: [input.periodKey],
      retrievedPeriods,
      missingPeriods,
      requestedCount: 1,
      retrievedCount: retrievedPeriods.length,
      missingCount: missingPeriods.length,
      coveragePercent: retrievedPeriods.length * 100,
    },
  };
}
