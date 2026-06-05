import type { SyntheticMemoryPromotionCandidate } from "../../company-memory-promotion";
import { buildRecordInputDeterminismHash } from "../hashing";
import {
  validateRecordInputCompanyScope,
  validateRecordInputEligibility,
  validateRecordInputLineage,
} from "../validation";
import type {
  SyntheticCompanyMemoryRecordInput,
  SyntheticCompanyMemoryRecordInputValidation,
} from "../types";
import { mapPromotionEvidenceToMemoryMetadata } from "./mapPromotionEvidenceToMemoryMetadata";
import {
  mapPromotionLineageToMemoryLineage,
  mapPromotionLineageToRecordInputLineage,
} from "./mapPromotionLineageToMemoryLineage";
import { mapSourceReferencesToMemorySourceRefs } from "./mapSourceReferencesToMemorySourceRefs";

export interface MapPromotionCandidateToRecordInputResult {
  recordInput?: SyntheticCompanyMemoryRecordInput;
  validation: SyntheticCompanyMemoryRecordInputValidation;
}

function mergeValidation(
  validations: SyntheticCompanyMemoryRecordInputValidation[],
): SyntheticCompanyMemoryRecordInputValidation {
  const errors = validations.flatMap((validation) => validation.errors);
  const warnings = validations.flatMap((validation) => validation.warnings);
  const skippedCandidateIds = [...new Set(validations.flatMap((validation) => validation.skippedCandidateIds))];
  const blockedCandidateIds = [...new Set(validations.flatMap((validation) => validation.blockedCandidateIds))];
  const blocked = blockedCandidateIds.length > 0;
  const skipped = skippedCandidateIds.length > 0;

  return {
    valid: errors.length === 0,
    recordInputReadinessStatus: blocked ? "blocked" : skipped ? "skipped" : "ready",
    errors,
    warnings,
    skippedCandidateIds,
    blockedCandidateIds,
    readyInputIds: errors.length ? [] : validations.flatMap((validation) => validation.readyInputIds),
  };
}

export function mapPromotionCandidateToRecordInput(input: {
  companyId: string;
  promotionCandidate: SyntheticMemoryPromotionCandidate;
}): MapPromotionCandidateToRecordInputResult {
  const validation = mergeValidation([
    validateRecordInputEligibility(input.promotionCandidate),
    validateRecordInputLineage(input.promotionCandidate),
    validateRecordInputCompanyScope(input),
  ]);

  if (!validation.valid) return { validation };

  const recordInputDeterminismHash = buildRecordInputDeterminismHash(input.promotionCandidate);
  const inputId = `record-input:${recordInputDeterminismHash}`;
  const evidence = mapPromotionEvidenceToMemoryMetadata(input.promotionCandidate);

  return {
    validation: {
      ...validation,
      readyInputIds: [inputId],
    },
    recordInput: {
      inputId,
      companyId: input.companyId,
      memoryType: input.promotionCandidate.memoryType,
      memoryStatus: "active",
      memorySourceAuthority: "historical_snapshot",
      sourceRefs: mapSourceReferencesToMemorySourceRefs(input.promotionCandidate.sourceCandidate.sourceReferences),
      observedPeriodKeys: input.promotionCandidate.lineage.observedPeriodKeys,
      confidence: input.promotionCandidate.memoryConfidence,
      freshness: input.promotionCandidate.memoryFreshness,
      asOfPeriodKey: input.promotionCandidate.lineage.observedPeriodKeys.slice(-1)[0] || "",
      memoryCoverage: input.promotionCandidate.sourceCandidate.memoryCoverage,
      candidateObservationStrength: evidence.candidateObservationStrength,
      candidateStabilityScore: evidence.candidateStabilityScore,
      promotionEvidenceStrength: evidence.promotionEvidenceStrength,
      promotionReviewComplexity: evidence.promotionReviewComplexity,
      promotionMetadata: evidence.promotionMetadata,
      memoryLineage: mapPromotionLineageToMemoryLineage(input.promotionCandidate),
      recordInputLineage: mapPromotionLineageToRecordInputLineage({
        inputId,
        promotionCandidate: input.promotionCandidate,
      }),
      recordInputDeterminismHash,
      recordInputReadinessStatus: validation.recordInputReadinessStatus,
    },
  };
}
