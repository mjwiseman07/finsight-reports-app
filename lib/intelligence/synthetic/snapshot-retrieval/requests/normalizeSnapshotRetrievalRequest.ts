import type {
  NormalizedSyntheticSnapshotRetrievalRequest,
  SyntheticSnapshotRetrievalRequest,
} from "../types";

export function normalizeSnapshotRetrievalRequest(
  request: SyntheticSnapshotRetrievalRequest,
): NormalizedSyntheticSnapshotRetrievalRequest {
  return {
    ...request,
    companyId: request.companyId.trim(),
    tenantId: request.tenantId?.trim() || null,
    periodKey: request.periodKey?.trim(),
    endPeriodKey: request.endPeriodKey?.trim(),
    requestedBy: request.requestedBy?.trim(),
    requestedByRole: request.requestedByRole?.trim(),
    includeSuperseded: request.includeSuperseded || request.versionPolicy === "include_superseded",
    requestedAt: request.requestedAt || new Date().toISOString(),
  };
}
