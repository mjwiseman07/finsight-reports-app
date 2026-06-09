import { stableSnapshotHash } from "../../historical-snapshots";
import type {
  SyntheticOutcomeCategory,
  SyntheticOutcomeConfidenceMetadata,
  SyntheticOutcomeContract,
  SyntheticOutcomeEvidenceReferences,
  SyntheticOutcomeGovernanceMetadata,
  SyntheticOutcomeLearningCompatibility,
  SyntheticOutcomeMemoryCompatibility,
  SyntheticOutcomeMetadata,
  SyntheticOutcomeResultCategory,
  SyntheticOutcomeStatus,
  SyntheticOutcomeTrustMetadata,
} from "../types";

export interface BuildOutcomeCandidateInput {
  outcomeContract: SyntheticOutcomeContract | null;
  outcomeType: string;
}

export interface SyntheticOutcomeCandidate {
  outcomeCandidateId: string;
  outcomeId: string;
  companyId: string;
  outcomeCategory: SyntheticOutcomeCategory;
  outcomeType: string;
  outcomeStatus: SyntheticOutcomeStatus;
  resultCategory: SyntheticOutcomeResultCategory;
  metadata: SyntheticOutcomeMetadata;
  evidence: SyntheticOutcomeEvidenceReferences;
  confidenceMetadata?: SyntheticOutcomeConfidenceMetadata;
  trustMetadata?: SyntheticOutcomeTrustMetadata;
  governanceMetadata?: SyntheticOutcomeGovernanceMetadata;
  memoryCompatibility?: SyntheticOutcomeMemoryCompatibility;
  learningCompatibility?: SyntheticOutcomeLearningCompatibility;
  outcomeContract: SyntheticOutcomeContract;
  warnings: string[];
}

export interface BuildOutcomeCandidateResult {
  outcomeCandidate: SyntheticOutcomeCandidate | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function buildOutcomeCandidateId(input: BuildOutcomeCandidateInput): string {
  const metadata = input.outcomeContract?.metadata;

  return `synthetic-outcome-candidate:${stableSnapshotHash({
    outcomeId: metadata?.outcomeId ?? null,
    companyId: metadata?.companyId ?? null,
    outcomeCategory: metadata?.outcomeCategory ?? null,
    outcomeType: input.outcomeType,
    outcomeStatus: metadata?.outcomeStatus ?? null,
    resultCategory: metadata?.resultCategory ?? null,
    evidenceIds: input.outcomeContract?.evidence.evidenceIds ?? [],
    sourceReferenceIds: input.outcomeContract?.evidence.sourceReferenceIds ?? [],
    lineageReferenceIds: input.outcomeContract?.evidence.lineageReferenceIds ?? [],
  })}`;
}

function validateInput(input: BuildOutcomeCandidateInput): string[] {
  const warnings: string[] = [];
  const outcomeContract = input.outcomeContract;

  if (!outcomeContract) {
    warnings.push("outcomeContract is required.");
    return warnings;
  }

  if (!hasValue(input.outcomeType)) warnings.push("outcomeType is required.");
  if (!outcomeContract.metadata) warnings.push("outcomeContract.metadata is required.");
  if (!outcomeContract.scope) warnings.push("outcomeContract.scope is required.");
  if (!outcomeContract.evidence) warnings.push("outcomeContract.evidence is required.");
  if (!outcomeContract.metadata || !outcomeContract.scope || !outcomeContract.evidence) return warnings;

  if (!hasValue(outcomeContract.metadata.outcomeId)) warnings.push("metadata.outcomeId is required.");
  if (!hasValue(outcomeContract.metadata.companyId)) warnings.push("metadata.companyId is required.");
  if (!hasValue(outcomeContract.metadata.outcomeCategory)) warnings.push("metadata.outcomeCategory is required.");
  if (!hasValue(outcomeContract.metadata.outcomeStatus)) warnings.push("metadata.outcomeStatus is required.");
  if (!hasValue(outcomeContract.metadata.resultCategory)) warnings.push("metadata.resultCategory is required.");
  if (!hasValue(outcomeContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (outcomeContract.scope.companyId !== outcomeContract.metadata.companyId) {
    warnings.push("scope.companyId must match metadata.companyId.");
  }
  if (!hasArrayValue(outcomeContract.evidence.evidenceIds)) {
    warnings.push("evidence.evidenceIds must include at least one value.");
  }
  if (!hasArrayValue(outcomeContract.evidence.sourceReferenceIds)) {
    warnings.push("evidence.sourceReferenceIds must include at least one value.");
  }

  return warnings;
}

export function buildOutcomeCandidate(input: BuildOutcomeCandidateInput): BuildOutcomeCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.outcomeContract) {
    return {
      outcomeCandidate: null,
      skipped: true,
      warnings,
    };
  }

  const outcomeContract = input.outcomeContract;

  return {
    outcomeCandidate: {
      outcomeCandidateId: buildOutcomeCandidateId(input),
      outcomeId: outcomeContract.metadata.outcomeId,
      companyId: outcomeContract.metadata.companyId,
      outcomeCategory: outcomeContract.metadata.outcomeCategory,
      outcomeType: input.outcomeType,
      outcomeStatus: outcomeContract.metadata.outcomeStatus,
      resultCategory: outcomeContract.metadata.resultCategory,
      metadata: outcomeContract.metadata,
      evidence: outcomeContract.evidence,
      confidenceMetadata: outcomeContract.confidenceMetadata,
      trustMetadata: outcomeContract.trustMetadata,
      governanceMetadata: outcomeContract.governanceMetadata,
      memoryCompatibility: outcomeContract.memoryCompatibility,
      learningCompatibility: outcomeContract.learningCompatibility,
      outcomeContract,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
