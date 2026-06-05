import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticHistoryWindow } from "../../types/historical-snapshot";
import type {
  SyntheticHistoricalSnapshotRecord,
  SyntheticSnapshotVersionPolicy,
} from "../../types/snapshot-storage";
import { SYNTHETIC_SNAPSHOT_RETRIEVAL_WINDOWS } from "../constants";
import type { SyntheticSnapshotCoverage, SyntheticSnapshotRetrievalConsumer } from "../types";
import { compareLatestFinalizedSnapshots } from "./resolveLatestFinalizedSnapshot";

export interface ResolveSnapshotWindowInput {
  snapshots: SyntheticHistoricalSnapshotRecord[];
  companyId: string;
  sourceSystem?: SyntheticHistoricalSnapshotRecord["sourceSystem"];
  tenantId?: string | null;
  endPeriodKey: string;
  window: SyntheticHistoryWindow;
  versionPolicy: SyntheticSnapshotVersionPolicy;
  retrievalConsumer: SyntheticSnapshotRetrievalConsumer;
  includeSuperseded?: boolean;
}

export interface ResolveSnapshotWindowResult {
  status: "resolved" | "partial" | "missing" | "invalid_window";
  snapshots: SyntheticHistoricalSnapshotRecord[];
  requestedPeriods: string[];
  retrievalDeterminismHash: string;
  coverage: SyntheticSnapshotCoverage;
}

function periodIndex(periodKey: string) {
  const [year, month = "12"] = periodKey.split("-");
  return Number(year) * 12 + Number(month) - 1;
}

function periodKeyFromIndex(index: number) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function buildRequestedPeriods(endPeriodKey: string, window: SyntheticHistoryWindow) {
  const endIndex = periodIndex(endPeriodKey);
  return Array.from({ length: window }, (_, offset) => periodKeyFromIndex(endIndex - window + offset + 1));
}

function chooseSnapshotForPeriod(
  snapshots: SyntheticHistoricalSnapshotRecord[],
  versionPolicy: SyntheticSnapshotVersionPolicy,
) {
  const sorted = [...snapshots].sort(compareLatestFinalizedSnapshots);
  if (versionPolicy === "include_superseded") return sorted[0];
  return sorted.find((snapshot) => snapshot.snapshotStatus === "finalized");
}

export function resolveSnapshotWindow(input: ResolveSnapshotWindowInput): ResolveSnapshotWindowResult {
  if (!SYNTHETIC_SNAPSHOT_RETRIEVAL_WINDOWS.includes(input.window)) {
    return {
      status: "invalid_window",
      snapshots: [],
      requestedPeriods: [],
      retrievalDeterminismHash: stableSnapshotHash({
        resolver: "resolveSnapshotWindow",
        companyId: input.companyId,
        endPeriodKey: input.endPeriodKey,
        window: input.window,
        retrievalConsumer: input.retrievalConsumer,
        error: "invalid_window",
      }),
      coverage: {
        requestedPeriods: [],
        retrievedPeriods: [],
        missingPeriods: [],
        requestedCount: 0,
        retrievedCount: 0,
        missingCount: 0,
        coveragePercent: 0,
      },
    };
  }

  const requestedPeriods = buildRequestedPeriods(input.endPeriodKey, input.window);
  const scoped = input.snapshots
    .filter((snapshot) => snapshot.companyId === input.companyId)
    .filter((snapshot) => !input.sourceSystem || snapshot.sourceSystem === input.sourceSystem)
    .filter((snapshot) => input.tenantId === undefined || snapshot.tenantId === input.tenantId)
    .filter((snapshot) => requestedPeriods.includes(snapshot.periodKey))
    .filter((snapshot) => input.includeSuperseded || input.versionPolicy === "include_superseded" || snapshot.snapshotStatus !== "superseded");
  const snapshots = requestedPeriods
    .map((periodKey) => chooseSnapshotForPeriod(scoped.filter((snapshot) => snapshot.periodKey === periodKey), input.versionPolicy))
    .filter((snapshot): snapshot is SyntheticHistoricalSnapshotRecord => Boolean(snapshot))
    .sort((left, right) => left.periodKey.localeCompare(right.periodKey) || compareLatestFinalizedSnapshots(left, right));
  const retrievedPeriods = snapshots.map((snapshot) => snapshot.periodKey);
  const missingPeriods = requestedPeriods.filter((periodKey) => !retrievedPeriods.includes(periodKey));

  return {
    status: snapshots.length === 0 ? "missing" : missingPeriods.length ? "partial" : "resolved",
    snapshots,
    requestedPeriods,
    retrievalDeterminismHash: stableSnapshotHash({
      resolver: "resolveSnapshotWindow",
      companyId: input.companyId,
      sourceSystem: input.sourceSystem,
      tenantId: input.tenantId,
      endPeriodKey: input.endPeriodKey,
      window: input.window,
      versionPolicy: input.versionPolicy,
      retrievalConsumer: input.retrievalConsumer,
      includeSuperseded: Boolean(input.includeSuperseded),
      requestedPeriods,
      snapshotIds: snapshots.map((snapshot) => snapshot.snapshotId),
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
