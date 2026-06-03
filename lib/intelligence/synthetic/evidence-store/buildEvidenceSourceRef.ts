import type { SyntheticEvidenceSourceRef } from "../types/evidence";

export function buildEvidenceSourceRef(input: SyntheticEvidenceSourceRef): SyntheticEvidenceSourceRef {
  return {
    snapshotId: input.snapshotId,
    syncId: input.syncId,
    sourceSystem: input.sourceSystem,
    sourceReport: input.sourceReport,
    externalEntityId: input.externalEntityId,
    externalRecordId: input.externalRecordId,
    rowLabel: input.rowLabel,
    rowSection: input.rowSection,
  };
}
