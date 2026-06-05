import type { SyntheticMemoryPromotionCandidate } from "../../company-memory-promotion";
import type { SyntheticCompanyMemoryLineage } from "../../types/company-memory";
import type { SyntheticCompanyMemoryRecordInputLineage } from "../types";

export function mapPromotionLineageToMemoryLineage(
  promotionCandidate: SyntheticMemoryPromotionCandidate,
): Omit<SyntheticCompanyMemoryLineage, "memoryId"> {
  return {
    recommendationIds: [],
    signalIds: [],
    metricIds: [],
    evidenceIds: promotionCandidate.lineage.sourceReferenceIds,
    snapshotIds: promotionCandidate.lineage.snapshotIds,
  };
}

export function mapPromotionLineageToRecordInputLineage(input: {
  inputId: string;
  promotionCandidate: SyntheticMemoryPromotionCandidate;
}): SyntheticCompanyMemoryRecordInputLineage {
  const { promotionCandidate } = input;

  return {
    inputId: input.inputId,
    promotionId: promotionCandidate.metadata.promotionId,
    candidateId: promotionCandidate.candidateId,
    ingestionId: promotionCandidate.lineage.ingestionId,
    retrievalId: promotionCandidate.lineage.retrievalId,
    retrievalLineageId: promotionCandidate.lineage.retrievalLineageId,
    retrievalDeterminismHash: promotionCandidate.lineage.retrievalDeterminismHash,
    promotionDeterminismHash: promotionCandidate.metadata.promotionDeterminismHash,
    sourceReferenceIds: promotionCandidate.lineage.sourceReferenceIds,
    snapshotIds: promotionCandidate.lineage.snapshotIds,
    observedPeriodKeys: promotionCandidate.lineage.observedPeriodKeys,
  };
}
