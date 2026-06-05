import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticHistoricalSnapshotRecord } from "../../types/snapshot-storage";
import type { SyntheticMemorySourceReference } from "../types";

export interface BuildSnapshotSourceReferenceInput {
  companyId: string;
  snapshot: SyntheticHistoricalSnapshotRecord;
  retrievalLineageId: string;
  retrievalDeterminismHash: string;
}

export interface BuildSnapshotSourceReferenceResult {
  sourceReference?: SyntheticMemorySourceReference;
  warnings: string[];
}

export function buildSnapshotSourceReference(
  input: BuildSnapshotSourceReferenceInput,
): BuildSnapshotSourceReferenceResult {
  const warnings: string[] = [];
  const { snapshot } = input;

  if (!input.companyId) warnings.push("companyId is required to build a snapshot source reference.");
  if (snapshot.companyId !== input.companyId) {
    warnings.push(`Snapshot ${snapshot.snapshotId} does not belong to ingestion company ${input.companyId}.`);
  }
  if (!snapshot.snapshotAudit.payloadHash) warnings.push(`Snapshot ${snapshot.snapshotId} is missing payloadHash.`);
  if (!snapshot.snapshotAudit.normalizedDataHash) {
    warnings.push(`Snapshot ${snapshot.snapshotId} is missing normalizedDataHash.`);
  }
  if (!input.retrievalLineageId) warnings.push("retrievalLineageId is required.");
  if (!input.retrievalDeterminismHash) warnings.push("retrievalDeterminismHash is required.");
  if (warnings.length) return { warnings };

  return {
    warnings,
    sourceReference: {
      sourceType: "historical_snapshot",
      sourceId: stableSnapshotHash({
        sourceType: "historical_snapshot",
        snapshotId: snapshot.snapshotId,
        retrievalLineageId: input.retrievalLineageId,
        retrievalDeterminismHash: input.retrievalDeterminismHash,
      }),
      snapshotId: snapshot.snapshotId,
      companyId: input.companyId,
      periodKey: snapshot.periodKey,
      sourceSystem: snapshot.sourceSystem,
      tenantId: snapshot.tenantId,
      snapshotVersion: snapshot.snapshotVersion,
      payloadHash: snapshot.snapshotAudit.payloadHash,
      normalizedDataHash: snapshot.snapshotAudit.normalizedDataHash,
      retrievalLineageId: input.retrievalLineageId,
      retrievalDeterminismHash: input.retrievalDeterminismHash,
    },
  };
}
