import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticHistoricalSnapshotRecord } from "../../types/snapshot-storage";
import { SYNTHETIC_SNAPSHOT_LOW_QUALITY_THRESHOLD } from "../constants";
import { normalizeSnapshotRetrievalRequest } from "../requests";
import { resolveSnapshotWindow } from "../resolution";
import type {
  NormalizedSyntheticSnapshotRetrievalRequest,
  SyntheticSnapshotCoverage,
  SyntheticSnapshotRetrievalConfidenceSummary,
  SyntheticSnapshotRetrievalMetadata,
  SyntheticSnapshotRetrievalRequest,
  SyntheticSnapshotRetrievalResult,
  SyntheticSnapshotRetrievalWarning,
} from "../types";

export interface SnapshotRetrievalServiceInput {
  request: SyntheticSnapshotRetrievalRequest;
  snapshots: SyntheticHistoricalSnapshotRecord[];
}

export interface BuildSnapshotRetrievalResultInput {
  request: NormalizedSyntheticSnapshotRetrievalRequest;
  startedAtMs: number;
  resolvedAt: string;
  snapshots: SyntheticHistoricalSnapshotRecord[];
  coverage: SyntheticSnapshotCoverage;
  retrievalDeterminismHash: string;
  warnings?: SyntheticSnapshotRetrievalWarning[];
  supersededSnapshotIds?: string[];
}

export function requireCompanyScopedRequest(request: SyntheticSnapshotRetrievalRequest) {
  if (!request.companyId?.trim()) throw new Error("companyId is required for snapshot retrieval.");
}

export function buildRetrievalConfidenceSummary(
  snapshots: SyntheticHistoricalSnapshotRecord[],
  coverage: SyntheticSnapshotCoverage,
): SyntheticSnapshotRetrievalConfidenceSummary {
  const qualityScores = snapshots
    .map((snapshot) => snapshot.snapshotAudit.snapshotQualityScore)
    .filter((score): score is number => typeof score === "number");
  const averageSnapshotQualityScore = qualityScores.length
    ? qualityScores.reduce((total, score) => total + score, 0) / qualityScores.length
    : null;

  return {
    requestedCount: coverage.requestedCount,
    retrievedCount: coverage.retrievedCount,
    missingCount: coverage.missingCount,
    averageSnapshotQualityScore,
    minSnapshotQualityScore: qualityScores.length ? Math.min(...qualityScores) : null,
    maxSnapshotQualityScore: qualityScores.length ? Math.max(...qualityScores) : null,
    hasMissingPeriods: coverage.missingCount > 0,
    hasLowQualitySnapshots: qualityScores.some((score) => score < SYNTHETIC_SNAPSHOT_LOW_QUALITY_THRESHOLD),
  };
}

export function buildSnapshotRetrievalResult(input: BuildSnapshotRetrievalResultInput): SyntheticSnapshotRetrievalResult {
  const snapshotIds = input.snapshots.map((snapshot) => snapshot.snapshotId);
  const periodKeys = input.snapshots.map((snapshot) => snapshot.periodKey);
  const retrievalId = stableSnapshotHash({
    retrievalDeterminismHash: input.retrievalDeterminismHash,
    retrievalConsumer: input.request.retrievalConsumer,
    requestedAt: input.request.requestedAt,
  });
  const metadata: SyntheticSnapshotRetrievalMetadata = {
    retrievalId,
    retrievalMode: input.request.mode,
    retrievalConsumer: input.request.retrievalConsumer,
    versionPolicy: input.request.versionPolicy,
    companyId: input.request.companyId,
    sourceSystem: input.request.sourceSystem,
    tenantId: input.request.tenantId,
    requestedAt: input.request.requestedAt,
    resolvedAt: input.resolvedAt,
    retrievalExecutionDurationMs: Math.max(0, Date.now() - input.startedAtMs),
    retrievalDeterminismHash: input.retrievalDeterminismHash,
    endPeriodKey: input.request.endPeriodKey,
    requestedWindow: input.request.window,
    exactVersion: input.request.exactVersion,
    includeSuperseded: input.request.includeSuperseded,
    resultCount: input.snapshots.length,
    snapshotIds,
    periodKeys,
    storageSchemaVersions: [],
    persistenceVersions: [],
    coverage: input.coverage,
    retrievalConfidenceSummary: buildRetrievalConfidenceSummary(input.snapshots, input.coverage),
    lineage: {
      retrievalId,
      retrievalConsumer: input.request.retrievalConsumer,
      sourceSystem: input.request.sourceSystem,
      companyId: input.request.companyId,
      tenantId: input.request.tenantId,
      requestedPeriodKeys: input.coverage.requestedPeriods,
      resolvedSnapshotIds: snapshotIds,
      supersededSnapshotIds: input.supersededSnapshotIds || [],
      normalizedRequestHash: stableSnapshotHash(input.request),
    },
  };

  return {
    request: input.request,
    metadata,
    snapshots: input.snapshots,
    missingPeriodKeys: input.coverage.missingPeriods,
    warnings: input.warnings || [],
  };
}

export function getSnapshotWindow(input: SnapshotRetrievalServiceInput): SyntheticSnapshotRetrievalResult {
  const startedAtMs = Date.now();
  requireCompanyScopedRequest(input.request);
  const request = normalizeSnapshotRetrievalRequest({ ...input.request, mode: "window" });
  const resolved = resolveSnapshotWindow({
    snapshots: input.snapshots,
    companyId: request.companyId,
    sourceSystem: request.sourceSystem,
    tenantId: request.tenantId,
    endPeriodKey: request.endPeriodKey || "",
    window: request.window || 12,
    versionPolicy: request.versionPolicy,
    retrievalConsumer: request.retrievalConsumer,
    includeSuperseded: request.includeSuperseded,
  });

  return buildSnapshotRetrievalResult({
    request,
    startedAtMs,
    resolvedAt: new Date().toISOString(),
    snapshots: resolved.snapshots,
    coverage: resolved.coverage,
    retrievalDeterminismHash: resolved.retrievalDeterminismHash,
    warnings: resolved.coverage.missingPeriods.map((periodKey) => ({
      code: "missing_period",
      message: `No snapshot resolved for requested period ${periodKey}.`,
      periodKey,
    })),
  });
}
