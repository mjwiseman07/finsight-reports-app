import type {
  SyntheticMemoryCandidateObservationStrength,
  SyntheticMemoryCoverage,
} from "../company-memory-ingestion";
import type {
  SyntheticMemoryPromotionCandidate,
  SyntheticMemoryPromotionEvidenceStrength,
  SyntheticMemoryPromotionMetadata,
  SyntheticMemoryPromotionReviewComplexity,
} from "../company-memory-promotion";
import type {
  SyntheticCompanyMemoryConfidence,
  SyntheticCompanyMemoryFreshness,
  SyntheticCompanyMemoryLineage,
  SyntheticCompanyMemorySourceAuthority,
  SyntheticCompanyMemorySourceRef,
  SyntheticCompanyMemoryStatus,
  SyntheticCompanyMemoryType,
} from "../types/company-memory";

export type SyntheticCompanyMemoryRecordInputReadinessStatus =
  | "ready"
  | "skipped"
  | "blocked";

export interface SyntheticCompanyMemoryRecordInputRequest {
  companyId: string;
  promotionCandidates: SyntheticMemoryPromotionCandidate[];
  requestedAt: string;
}

export interface SyntheticCompanyMemoryRecordInputLineage {
  inputId: string;
  promotionId: string;
  candidateId: string;
  ingestionId: string;
  retrievalId: string;
  retrievalLineageId: string;
  retrievalDeterminismHash: string;
  promotionDeterminismHash: string;
  sourceReferenceIds: string[];
  snapshotIds: string[];
  observedPeriodKeys: string[];
}

export interface SyntheticCompanyMemoryRecordInput {
  inputId: string;
  companyId: string;
  memoryType: SyntheticCompanyMemoryType;
  memoryStatus: SyntheticCompanyMemoryStatus;
  memorySourceAuthority: SyntheticCompanyMemorySourceAuthority;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
  observedPeriodKeys: string[];
  confidence: SyntheticCompanyMemoryConfidence;
  freshness: SyntheticCompanyMemoryFreshness;
  asOfPeriodKey: string;
  memoryCoverage: SyntheticMemoryCoverage;
  candidateObservationStrength: SyntheticMemoryCandidateObservationStrength;
  candidateStabilityScore: number;
  promotionEvidenceStrength: SyntheticMemoryPromotionEvidenceStrength;
  promotionReviewComplexity: SyntheticMemoryPromotionReviewComplexity;
  promotionMetadata: SyntheticMemoryPromotionMetadata;
  memoryLineage: Omit<SyntheticCompanyMemoryLineage, "memoryId">;
  recordInputLineage: SyntheticCompanyMemoryRecordInputLineage;
  recordInputDeterminismHash: string;
  recordInputReadinessStatus: SyntheticCompanyMemoryRecordInputReadinessStatus;
}

export interface SyntheticCompanyMemoryRecordInputMetadata {
  requestId: string;
  companyId: string;
  requestedAt: string;
  completedAt: string;
  inputCount: number;
  skippedCount: number;
  blockedCount: number;
  recordInputDeterminismHashes: string[];
}

export interface SyntheticCompanyMemoryRecordInputValidation {
  valid: boolean;
  recordInputReadinessStatus: SyntheticCompanyMemoryRecordInputReadinessStatus;
  errors: string[];
  warnings: string[];
  skippedCandidateIds: string[];
  blockedCandidateIds: string[];
  readyInputIds: string[];
}

export interface SyntheticCompanyMemoryRecordInputResult {
  request: SyntheticCompanyMemoryRecordInputRequest;
  metadata: SyntheticCompanyMemoryRecordInputMetadata;
  recordInputs: SyntheticCompanyMemoryRecordInput[];
  skippedCandidateIds: string[];
  validation: SyntheticCompanyMemoryRecordInputValidation;
  warnings: string[];
}
