import type { SyntheticHistoricalSnapshotRecord } from "../types/snapshot-storage";
import { buildAvailabilitySummary } from "./buildAvailabilitySummary";
import { buildSnapshotAudit } from "./buildSnapshotAudit";
import { buildSnapshotIndustryContext } from "./buildSnapshotIndustryContext";
import { buildSnapshotLineage } from "./buildSnapshotLineage";
import { buildSnapshotPayload } from "./buildSnapshotPayload";
import type { BuildHistoricalSnapshotRecordInput } from "./types";

function periodKey(endDate: string) {
  return endDate.slice(0, 7);
}

function snapshotId(input: BuildHistoricalSnapshotRecordInput, key: string) {
  const data = input.normalizedData;
  return [data.companyId || "company", data.sourceSystem, data.tenantId || "tenant", key, `v${input.snapshotVersion}`].join(":");
}

export function buildHistoricalSnapshotRecord(input: BuildHistoricalSnapshotRecordInput): SyntheticHistoricalSnapshotRecord {
  const key = periodKey(input.normalizedData.reportPeriod.endDate);
  const id = snapshotId(input, key);
  const snapshotPayload = buildSnapshotPayload(input);
  const availabilitySummary = buildAvailabilitySummary(snapshotPayload);
  const snapshotLineage = buildSnapshotLineage({
    snapshotId: id,
    normalizedData: input.normalizedData,
    payload: snapshotPayload,
  });
  const snapshotIndustryContext = buildSnapshotIndustryContext(input.snapshotIndustryContext);
  const snapshotAudit = buildSnapshotAudit({
    snapshotId: id,
    snapshotVersion: input.snapshotVersion,
    createdAt: input.createdAt,
    createdByProcess: input.createdByProcess || "sync",
    sourceSyncId: input.normalizedData.syncId,
    normalizedDataHash: snapshotLineage.createdFromNormalizedDataHash,
    payload: snapshotPayload,
    validationWarnings: input.normalizedData.validation.warnings,
    availabilitySummary,
    snapshotIndustryContext,
    supersedesSnapshotId: input.supersedesSnapshotId,
    supersededBySnapshotId: input.supersededBySnapshotId,
  });
  return {
    snapshotId: id,
    companyId: input.normalizedData.companyId,
    sourceSystem: input.normalizedData.sourceSystem,
    tenantId: input.normalizedData.tenantId,
    tenantName: input.normalizedData.tenantName,
    connectionId: input.normalizedData.connectionId,
    syncId: input.normalizedData.syncId,
    reportPeriod: input.normalizedData.reportPeriod,
    periodKey: key,
    snapshotVersion: input.snapshotVersion,
    snapshotStatus: input.snapshotStatus || "finalized",
    sourceSyncStatus: input.normalizedData.syncStatus,
    createdAt: input.createdAt,
    finalizedAt: input.finalizedAt || input.createdAt,
    supersededBySnapshotId: input.supersededBySnapshotId,
    snapshotLineage,
    snapshotIndustryContext,
    snapshotPayload,
    snapshotAudit,
  };
}
