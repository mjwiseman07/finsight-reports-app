import type { SyntheticMemoryPromotionCandidate } from "../../company-memory-promotion";
import type { SyntheticCompanyMemoryRecordInputValidation } from "../types";

export function validateRecordInputCompanyScope(input: {
  companyId: string;
  promotionCandidate: SyntheticMemoryPromotionCandidate;
}): SyntheticCompanyMemoryRecordInputValidation {
  const errors: string[] = [];
  const { promotionCandidate } = input;

  if (promotionCandidate.companyId !== input.companyId) {
    errors.push("Promotion candidate companyId does not match request companyId.");
  }
  if (promotionCandidate.sourceCandidate.sourceReferences.some((sourceReference) => sourceReference.companyId !== input.companyId)) {
    errors.push("One or more source references do not match request companyId.");
  }

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
