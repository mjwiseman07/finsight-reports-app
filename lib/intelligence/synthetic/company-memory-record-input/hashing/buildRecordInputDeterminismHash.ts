import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticMemoryPromotionCandidate } from "../../company-memory-promotion";

export function buildRecordInputDeterminismHash(promotionCandidate: SyntheticMemoryPromotionCandidate): string {
  return stableSnapshotHash({
    companyId: promotionCandidate.companyId,
    memoryType: promotionCandidate.memoryType,
    candidateId: promotionCandidate.candidateId,
    promotionId: promotionCandidate.metadata.promotionId,
    sourceReferenceIds: [...promotionCandidate.lineage.sourceReferenceIds].sort(),
    snapshotIds: [...promotionCandidate.lineage.snapshotIds].sort(),
    retrievalDeterminismHash: promotionCandidate.lineage.retrievalDeterminismHash,
    promotionDeterminismHash: promotionCandidate.metadata.promotionDeterminismHash,
  });
}
