import { normalizeSnapshotRetrievalRequest } from "../requests";
import { resolveSnapshotVersion } from "../resolution";
import type { SyntheticSnapshotCoverage, SyntheticSnapshotRetrievalResult, SyntheticSnapshotRetrievalWarning } from "../types";
import {
  buildSnapshotRetrievalResult,
  requireCompanyScopedRequest,
  type SnapshotRetrievalServiceInput,
} from "./getSnapshotWindow";

function exactVersionCoverage(periodKey: string, found: boolean): SyntheticSnapshotCoverage {
  return {
    requestedPeriods: [periodKey],
    retrievedPeriods: found ? [periodKey] : [],
    missingPeriods: found ? [] : [periodKey],
    requestedCount: 1,
    retrievedCount: found ? 1 : 0,
    missingCount: found ? 0 : 1,
    coveragePercent: found ? 100 : 0,
  };
}

export function getSnapshotVersion(input: SnapshotRetrievalServiceInput): SyntheticSnapshotRetrievalResult {
  const startedAtMs = Date.now();
  requireCompanyScopedRequest(input.request);
  const request = normalizeSnapshotRetrievalRequest({
    ...input.request,
    mode: "exact_version_snapshot",
    versionPolicy: "exact_version",
  });

  if (!request.periodKey || !request.exactVersion || request.exactVersion <= 0) {
    const periodKey = request.periodKey || "unknown";
    return buildSnapshotRetrievalResult({
      request,
      startedAtMs,
      resolvedAt: new Date().toISOString(),
      snapshots: [],
      coverage: exactVersionCoverage(periodKey, false),
      retrievalDeterminismHash: `invalid_exact_version:${periodKey}`,
      warnings: [{ code: "invalid_request", message: "periodKey and positive exactVersion are required for exact version retrieval.", periodKey }],
    });
  }

  const resolved = resolveSnapshotVersion({
    snapshots: input.snapshots,
    companyId: request.companyId,
    sourceSystem: request.sourceSystem,
    tenantId: request.tenantId,
    periodKey: request.periodKey,
    exactVersion: request.exactVersion,
    retrievalConsumer: request.retrievalConsumer,
    includeSuperseded: request.includeSuperseded,
  });
  const warnings: SyntheticSnapshotRetrievalWarning[] =
    resolved.status === "missing_version"
      ? [{ code: "missing_version", message: `Snapshot version ${request.exactVersion} was not found for ${request.periodKey}.`, periodKey: request.periodKey }]
      : resolved.status === "ambiguous"
        ? [{ code: "version_conflict", message: `Multiple snapshots matched version ${request.exactVersion} for ${request.periodKey}; failing closed.`, periodKey: request.periodKey }]
        : [];

  return buildSnapshotRetrievalResult({
    request,
    startedAtMs,
    resolvedAt: new Date().toISOString(),
    snapshots: resolved.snapshot ? [resolved.snapshot] : [],
    coverage: resolved.coverage,
    retrievalDeterminismHash: resolved.retrievalDeterminismHash,
    warnings,
  });
}
