import type { SyntheticMemoryPromotionCandidate } from "../../company-memory-promotion";
import { mapPromotionCandidateToRecordInput } from "../mapping";

export function buildCompanyMemoryRecordInput(input: {
  companyId: string;
  promotionCandidate: SyntheticMemoryPromotionCandidate;
}) {
  return mapPromotionCandidateToRecordInput(input);
}
