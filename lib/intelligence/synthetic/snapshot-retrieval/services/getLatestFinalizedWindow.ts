import { normalizeSnapshotRetrievalRequest } from "../requests";
import { resolveSnapshotWindow } from "../resolution";
import type { SyntheticSnapshotRetrievalResult } from "../types";
import {
  buildSnapshotRetrievalResult,
  requireCompanyScopedRequest,
  type SnapshotRetrievalServiceInput,
} from "./getSnapshotWindow";

export function getLatestFinalizedWindow(input: SnapshotRetrievalServiceInput): SyntheticSnapshotRetrievalResult {
  const startedAtMs = Date.now();
  requireCompanyScopedRequest(input.request);
  const request = normalizeSnapshotRetrievalRequest({
    ...input.request,
    mode: "latest_finalized_window",
    versionPolicy: "latest_finalized",
    includeSuperseded: false,
  });
  const resolved = resolveSnapshotWindow({
    snapshots: input.snapshots,
    companyId: request.companyId,
    sourceSystem: request.sourceSystem,
    tenantId: request.tenantId,
    endPeriodKey: request.endPeriodKey || "",
    window: request.window || 12,
    versionPolicy: "latest_finalized",
    retrievalConsumer: request.retrievalConsumer,
    includeSuperseded: false,
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
      message: `No latest finalized snapshot resolved for requested period ${periodKey}.`,
      periodKey,
    })),
  });
}
