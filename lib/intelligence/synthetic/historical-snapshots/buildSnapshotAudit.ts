import type {
  SyntheticSnapshotAudit,
  SyntheticSnapshotAvailabilitySummary,
  SyntheticSnapshotIndustryContext,
  SyntheticSnapshotPayload,
} from "../types/snapshot-storage";
import { scoreSnapshotQuality } from "./scoreSnapshotQuality";
import { stableSnapshotHash } from "./stableSnapshotHash";

export function buildSnapshotAudit({
  snapshotId,
  snapshotVersion,
  createdAt,
  createdByProcess,
  sourceSyncId,
  normalizedDataHash,
  payload,
  validationWarnings,
  availabilitySummary,
  snapshotIndustryContext,
  supersedesSnapshotId,
  supersededBySnapshotId,
}: {
  snapshotId: string;
  snapshotVersion: number;
  createdAt: string;
  createdByProcess: SyntheticSnapshotAudit["createdByProcess"];
  sourceSyncId: string;
  normalizedDataHash: string;
  payload: SyntheticSnapshotPayload;
  validationWarnings: string[];
  availabilitySummary: SyntheticSnapshotAvailabilitySummary;
  snapshotIndustryContext: SyntheticSnapshotIndustryContext;
  supersedesSnapshotId?: string;
  supersededBySnapshotId?: string;
}): SyntheticSnapshotAudit {
  const quality = scoreSnapshotQuality({
    availabilitySummary,
    validationWarningCount: validationWarnings.length,
  });
  return {
    snapshotId,
    snapshotVersion,
    createdAt,
    createdByProcess,
    sourceSyncId,
    normalizedDataHash,
    payloadHash: stableSnapshotHash(payload),
    validationWarnings,
    availabilitySummary,
    snapshotIndustryContext,
    snapshotQualityScore: quality.snapshotQualityScore,
    snapshotQualityFactors: quality.snapshotQualityFactors,
    supersedesSnapshotId,
    supersededBySnapshotId,
  };
}
