import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticHistoricalSnapshotRecord } from "../../types/snapshot-storage";
import { normalizeSnapshotRetrievalRequest } from "../requests";
import { compareLatestFinalizedSnapshots, resolveSupersededChain } from "../resolution";
import type { SyntheticSnapshotCoverage, SyntheticSnapshotRetrievalResult, SyntheticSnapshotRetrievalWarning } from "../types";
import {
  buildSnapshotRetrievalResult,
  requireCompanyScopedRequest,
  type SnapshotRetrievalServiceInput,
} from "./getSnapshotWindow";

function auditHistoryCoverage(snapshots: SyntheticHistoricalSnapshotRecord[], requestedPeriods: string[]): SyntheticSnapshotCoverage {
  const retrievedPeriods = [...new Set(snapshots.map((snapshot) => snapshot.periodKey))].sort();
  const missingPeriods = requestedPeriods.filter((periodKey) => !retrievedPeriods.includes(periodKey));

  return {
    requestedPeriods,
    retrievedPeriods,
    missingPeriods,
    requestedCount: requestedPeriods.length,
    retrievedCount: retrievedPeriods.length,
    missingCount: missingPeriods.length,
    coveragePercent: requestedPeriods.length ? (retrievedPeriods.length / requestedPeriods.length) * 100 : 0,
  };
}

export function getAuditSnapshotHistory(input: SnapshotRetrievalServiceInput): SyntheticSnapshotRetrievalResult {
  const startedAtMs = Date.now();
  requireCompanyScopedRequest(input.request);
  const request = normalizeSnapshotRetrievalRequest({
    ...input.request,
    mode: "audit_history",
    versionPolicy: "include_superseded",
    includeSuperseded: true,
  });
  const scoped = input.snapshots
    .filter((snapshot) => snapshot.companyId === request.companyId)
    .filter((snapshot) => snapshot.sourceSystem === request.sourceSystem)
    .filter((snapshot) => snapshot.tenantId === request.tenantId)
    .filter((snapshot) => !request.periodKey || snapshot.periodKey === request.periodKey)
    .filter((snapshot) => !request.endPeriodKey || snapshot.periodKey <= request.endPeriodKey)
    .sort((left, right) => left.periodKey.localeCompare(right.periodKey) || compareLatestFinalizedSnapshots(left, right));
  const requestedPeriods = request.periodKey ? [request.periodKey] : request.endPeriodKey ? [request.endPeriodKey] : [];
  const chainResults = scoped.map((snapshot) =>
    resolveSupersededChain({
      snapshots: input.snapshots,
      companyId: request.companyId,
      snapshotId: snapshot.snapshotId,
      retrievalConsumer: request.retrievalConsumer,
    }),
  );
  const supersededSnapshotIds = [...new Set(chainResults.flatMap((result) => result.supersededSnapshotIds))].sort();
  const warnings: SyntheticSnapshotRetrievalWarning[] = chainResults
    .filter((result) => result.status === "company_scope_violation" || result.status === "cycle_detected")
    .map((result) => ({
      code: result.status === "company_scope_violation" ? "company_scope_violation" : "version_conflict",
      message: `Superseded chain traversal returned ${result.status}.`,
      snapshotId: result.startSnapshot?.snapshotId,
    }));
  const coverage = auditHistoryCoverage(scoped, requestedPeriods);

  return buildSnapshotRetrievalResult({
    request,
    startedAtMs,
    resolvedAt: new Date().toISOString(),
    snapshots: scoped,
    coverage,
    retrievalDeterminismHash: stableSnapshotHash({
      resolver: "getAuditSnapshotHistory",
      companyId: request.companyId,
      sourceSystem: request.sourceSystem,
      tenantId: request.tenantId,
      retrievalConsumer: request.retrievalConsumer,
      periodKey: request.periodKey,
      endPeriodKey: request.endPeriodKey,
      snapshotIds: scoped.map((snapshot) => snapshot.snapshotId),
      supersededSnapshotIds,
    }),
    warnings,
    supersededSnapshotIds,
  });
}
