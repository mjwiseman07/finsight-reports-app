import type { SyntheticMemoryPromotionCandidate } from "../../company-memory-promotion";
import type {
  SyntheticCompanyMemoryRecordInput,
  SyntheticCompanyMemoryRecordInputResult,
  SyntheticCompanyMemoryRecordInputValidation,
} from "../types";
import { buildCompanyMemoryRecordInput } from "./buildCompanyMemoryRecordInput";

export function buildCompanyMemoryRecordInputs(input: {
  companyId: string;
  promotionCandidates: SyntheticMemoryPromotionCandidate[];
  requestedAt: string;
}): SyntheticCompanyMemoryRecordInputResult {
  const recordInputs: SyntheticCompanyMemoryRecordInput[] = [];
  const validations: SyntheticCompanyMemoryRecordInputValidation[] = [];

  for (const promotionCandidate of input.promotionCandidates) {
    const result = buildCompanyMemoryRecordInput({
      companyId: input.companyId,
      promotionCandidate,
    });
    if (result.recordInput) recordInputs.push(result.recordInput);
    validations.push(result.validation);
  }

  const skippedCandidateIds = [...new Set(validations.flatMap((validation) => validation.skippedCandidateIds))];
  const blockedCandidateIds = [...new Set(validations.flatMap((validation) => validation.blockedCandidateIds))];
  const readyInputIds = recordInputs.map((recordInput) => recordInput.inputId);
  const errors = validations.flatMap((validation) => validation.errors);
  const warnings = validations.flatMap((validation) => validation.warnings);

  return {
    request: {
      companyId: input.companyId,
      promotionCandidates: input.promotionCandidates,
      requestedAt: input.requestedAt,
    },
    metadata: {
      requestId: `record-input-request:${input.companyId}:${input.requestedAt}`,
      companyId: input.companyId,
      requestedAt: input.requestedAt,
      completedAt: input.requestedAt,
      inputCount: recordInputs.length,
      skippedCount: skippedCandidateIds.length,
      blockedCount: blockedCandidateIds.length,
      recordInputDeterminismHashes: recordInputs.map((recordInput) => recordInput.recordInputDeterminismHash),
    },
    recordInputs,
    skippedCandidateIds,
    validation: {
      valid: errors.length === 0,
      recordInputReadinessStatus: blockedCandidateIds.length ? "blocked" : skippedCandidateIds.length ? "skipped" : "ready",
      errors,
      warnings,
      skippedCandidateIds,
      blockedCandidateIds,
      readyInputIds,
    },
    warnings,
  };
}
