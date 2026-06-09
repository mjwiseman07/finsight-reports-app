import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticOutcomeCandidate } from "../candidates";
import type {
  SyntheticOutcomeCategory,
  SyntheticOutcomeConfidenceMetadata,
  SyntheticOutcomeEvidenceReferences,
  SyntheticOutcomeGovernanceMetadata,
  SyntheticOutcomeLearningCompatibility,
  SyntheticOutcomeMemoryCompatibility,
  SyntheticOutcomeStatus,
  SyntheticOutcomeTrustMetadata,
} from "../types";

export interface BuildOutcomeEvidenceInput {
  outcomeCandidate: SyntheticOutcomeCandidate | null;
}

export interface SyntheticOutcomeEvidencePackage {
  outcomeEvidencePackageId: string;
  outcomeCandidateId: string;
  outcomeId: string;
  companyId: string;
  outcomeCategory: SyntheticOutcomeCategory;
  outcomeType: string;
  outcomeStatus: SyntheticOutcomeStatus;
  evidence: SyntheticOutcomeEvidenceReferences;
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata?: SyntheticOutcomeTrustMetadata;
  confidenceMetadata?: SyntheticOutcomeConfidenceMetadata;
  governanceMetadata?: SyntheticOutcomeGovernanceMetadata;
  memoryCompatibility?: SyntheticOutcomeMemoryCompatibility;
  learningCompatibility?: SyntheticOutcomeLearningCompatibility;
  outcomeCandidate: SyntheticOutcomeCandidate;
  warnings: string[];
}

export interface BuildOutcomeEvidenceResult {
  outcomeEvidencePackage: SyntheticOutcomeEvidencePackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function buildOutcomeEvidencePackageId(outcomeCandidate: SyntheticOutcomeCandidate): string {
  return `synthetic-outcome-evidence:${stableSnapshotHash({
    outcomeCandidateId: outcomeCandidate.outcomeCandidateId,
    outcomeId: outcomeCandidate.outcomeId,
    companyId: outcomeCandidate.companyId,
    outcomeCategory: outcomeCandidate.outcomeCategory,
    outcomeType: outcomeCandidate.outcomeType,
    outcomeStatus: outcomeCandidate.outcomeStatus,
    evidenceIds: outcomeCandidate.evidence.evidenceIds,
    sourceReferenceIds: outcomeCandidate.evidence.sourceReferenceIds,
    lineageReferenceIds: outcomeCandidate.evidence.lineageReferenceIds,
    trustEvidenceIds: outcomeCandidate.trustMetadata?.trustEvidenceIds ?? [],
    confidenceEvidenceIds: outcomeCandidate.confidenceMetadata?.confidenceEvidenceIds ?? [],
    governanceBoundaryIds: outcomeCandidate.governanceMetadata?.governanceBoundaryIds ?? [],
    memoryReferenceIds: outcomeCandidate.memoryCompatibility?.memoryReferenceIds ?? [],
    learningReferenceIds: outcomeCandidate.learningCompatibility?.learningReferenceIds ?? [],
  })}`;
}

function validateOutcomeCandidate(outcomeCandidate: SyntheticOutcomeCandidate | null): string[] {
  const warnings: string[] = [];

  if (!outcomeCandidate) {
    warnings.push("outcomeCandidate is required.");
    return warnings;
  }

  if (!hasValue(outcomeCandidate.outcomeCandidateId)) warnings.push("outcomeCandidateId is required.");
  if (!hasValue(outcomeCandidate.outcomeId)) warnings.push("outcomeId is required.");
  if (!hasValue(outcomeCandidate.companyId)) warnings.push("companyId is required.");
  if (!hasValue(outcomeCandidate.outcomeCategory)) warnings.push("outcomeCategory is required.");
  if (!hasValue(outcomeCandidate.outcomeType)) warnings.push("outcomeType is required.");
  if (!hasValue(outcomeCandidate.outcomeStatus)) warnings.push("outcomeStatus is required.");
  if (!outcomeCandidate.evidence) {
    warnings.push("evidence is required.");
    return warnings;
  }
  if (!hasArrayValue(outcomeCandidate.evidence.evidenceIds)) {
    warnings.push("evidence.evidenceIds must include at least one value.");
  }
  if (!hasArrayValue(outcomeCandidate.evidence.sourceReferenceIds)) {
    warnings.push("evidence.sourceReferenceIds must include at least one value.");
  }

  return warnings;
}

export function buildOutcomeEvidence(input: BuildOutcomeEvidenceInput): BuildOutcomeEvidenceResult {
  const warnings = validateOutcomeCandidate(input.outcomeCandidate);
  if (warnings.length > 0 || !input.outcomeCandidate) {
    return {
      outcomeEvidencePackage: null,
      skipped: true,
      warnings,
    };
  }

  const outcomeCandidate = input.outcomeCandidate;

  return {
    outcomeEvidencePackage: {
      outcomeEvidencePackageId: buildOutcomeEvidencePackageId(outcomeCandidate),
      outcomeCandidateId: outcomeCandidate.outcomeCandidateId,
      outcomeId: outcomeCandidate.outcomeId,
      companyId: outcomeCandidate.companyId,
      outcomeCategory: outcomeCandidate.outcomeCategory,
      outcomeType: outcomeCandidate.outcomeType,
      outcomeStatus: outcomeCandidate.outcomeStatus,
      evidence: outcomeCandidate.evidence,
      evidenceReferenceIds: outcomeCandidate.evidence.evidenceIds,
      sourceReferenceIds: outcomeCandidate.evidence.sourceReferenceIds,
      lineageReferenceIds: outcomeCandidate.evidence.lineageReferenceIds,
      trustMetadata: outcomeCandidate.trustMetadata,
      confidenceMetadata: outcomeCandidate.confidenceMetadata,
      governanceMetadata: outcomeCandidate.governanceMetadata,
      memoryCompatibility: outcomeCandidate.memoryCompatibility,
      learningCompatibility: outcomeCandidate.learningCompatibility,
      outcomeCandidate,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
