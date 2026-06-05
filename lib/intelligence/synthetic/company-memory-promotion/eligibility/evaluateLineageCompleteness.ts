import type { SyntheticMemoryCandidate } from "../../company-memory-ingestion";
import type { SyntheticMemoryPromotionRejectionReason } from "../types";

export interface MemoryPromotionLineageCompletenessResult {
  lineageComplete: boolean;
  rejectionReasons: SyntheticMemoryPromotionRejectionReason[];
}

export function evaluateLineageCompleteness(candidate: SyntheticMemoryCandidate): MemoryPromotionLineageCompletenessResult {
  const sourceReferenceIds = candidate.sourceReferences.map((sourceReference) => sourceReference.sourceId).filter(Boolean);
  const snapshotIds = candidate.lineage.snapshotIds.filter(Boolean);
  const lineageComplete = Boolean(
    candidate.candidateId &&
      candidate.sourceReferences.length &&
      sourceReferenceIds.length === candidate.sourceReferences.length &&
      snapshotIds.length &&
      candidate.lineage.retrievalLineageId &&
      candidate.lineage.retrievalDeterminismHash &&
      candidate.lineage.candidateDeterminismHash,
  );

  return {
    lineageComplete,
    rejectionReasons: lineageComplete ? [] : ["incomplete_lineage"],
  };
}
