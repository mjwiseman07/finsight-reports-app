import type { SyntheticSnapshotRetrievalResult } from "../../snapshot-retrieval";
import type { SyntheticMemorySourceReference } from "../types";
import { buildSnapshotSourceReference } from "./buildSnapshotSourceReference";

export interface BuildSnapshotSourceReferencesInput {
  companyId: string;
  retrievalResult: SyntheticSnapshotRetrievalResult;
}

export interface BuildSnapshotSourceReferencesResult {
  sourceReferences: SyntheticMemorySourceReference[];
  warnings: string[];
  skippedSnapshotIds: string[];
}

export function buildSnapshotSourceReferences(
  input: BuildSnapshotSourceReferencesInput,
): BuildSnapshotSourceReferencesResult {
  const warnings: string[] = [];
  const skippedSnapshotIds: string[] = [];
  const retrievalLineageId = input.retrievalResult.metadata.lineage.retrievalId;
  const retrievalDeterminismHash = input.retrievalResult.metadata.retrievalDeterminismHash;
  const sourceReferences: SyntheticMemorySourceReference[] = [];

  for (const snapshot of input.retrievalResult.snapshots) {
    const result = buildSnapshotSourceReference({
      companyId: input.companyId,
      snapshot,
      retrievalLineageId,
      retrievalDeterminismHash,
    });

    if (result.sourceReference) {
      sourceReferences.push(result.sourceReference);
    } else {
      skippedSnapshotIds.push(snapshot.snapshotId);
    }

    warnings.push(...result.warnings);
  }

  return {
    sourceReferences,
    warnings,
    skippedSnapshotIds,
  };
}
