import type { SyntheticMemoryPromotionCandidate } from "../../company-memory-promotion";
import type { SyntheticCompanyMemoryRecordInputValidation } from "../types";

export function validateRecordInputLineage(
  promotionCandidate: SyntheticMemoryPromotionCandidate,
): SyntheticCompanyMemoryRecordInputValidation {
  const errors: string[] = [];

  if (!promotionCandidate.candidateId) errors.push("candidateId is required.");
  if (!promotionCandidate.metadata.promotionId) errors.push("promotionId is required.");
  if (!promotionCandidate.lineage.retrievalLineageId) errors.push("retrievalLineageId is required.");
  if (!promotionCandidate.lineage.retrievalDeterminismHash) errors.push("retrievalDeterminismHash is required.");
  if (!promotionCandidate.metadata.promotionDeterminismHash) errors.push("promotionDeterminismHash is required.");
  if (!promotionCandidate.lineage.sourceReferenceIds.length) errors.push("sourceReferenceIds are required.");
  if (!promotionCandidate.lineage.snapshotIds.length) errors.push("snapshotIds are required.");

  return {
    valid: errors.length === 0,
    recordInputReadinessStatus: errors.length ? "blocked" : "ready",
    errors,
    warnings: [],
    skippedCandidateIds: [],
    blockedCandidateIds: errors.length ? [promotionCandidate.candidateId] : [],
    readyInputIds: errors.length ? [] : [promotionCandidate.candidateId],
  };
}
