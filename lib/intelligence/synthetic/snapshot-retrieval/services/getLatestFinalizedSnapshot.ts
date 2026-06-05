import { normalizeSnapshotRetrievalRequest } from "../requests";
import { resolveLatestFinalizedSnapshot } from "../resolution";
import type { SyntheticSnapshotRetrievalResult, SyntheticSnapshotRetrievalWarning } from "../types";
import {
  buildSnapshotRetrievalResult,
  requireCompanyScopedRequest,
  type SnapshotRetrievalServiceInput,
} from "./getSnapshotWindow";

export function getLatestFinalizedSnapshot(input: SnapshotRetrievalServiceInput): SyntheticSnapshotRetrievalResult {
  const startedAtMs = Date.now();
  requireCompanyScopedRequest(input.request);
  const request = normalizeSnapshotRetrievalRequest({
    ...input.request,
    mode: "latest_finalized_snapshot",
    versionPolicy: "latest_finalized",
    includeSuperseded: false,
  });
  const resolved = resolveLatestFinalizedSnapshot({
    snapshots: input.snapshots,
    companyId: request.companyId,
    sourceSystem: request.sourceSystem,
    tenantId: request.tenantId,
    periodKey: request.periodKey,
    retrievalConsumer: request.retrievalConsumer,
  });
  const warnings: SyntheticSnapshotRetrievalWarning[] =
    resolved.status === "missing" && request.periodKey
      ? [{ code: "missing_period", message: `No finalized snapshot found for period ${request.periodKey}.`, periodKey: request.periodKey }]
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
