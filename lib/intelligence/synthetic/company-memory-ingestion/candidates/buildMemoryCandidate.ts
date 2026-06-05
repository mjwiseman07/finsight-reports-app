import { stableSnapshotHash } from "../../historical-snapshots";
import type {
  SyntheticCompanyMemoryConfidence,
  SyntheticCompanyMemoryFreshness,
  SyntheticCompanyMemoryType,
} from "../../types/company-memory";
import {
  SYNTHETIC_MEMORY_SOURCE_AUTHORITY,
  SYNTHETIC_MEMORY_STABILITY_SCORE_MAX,
  SYNTHETIC_MEMORY_STABILITY_SCORE_MIN,
} from "../constants";
import type {
  SyntheticMemoryCandidate,
  SyntheticMemoryCandidateKind,
  SyntheticMemoryCandidateObservationStrength,
  SyntheticMemoryCandidateStatus,
  SyntheticMemoryCoverage,
  SyntheticMemorySourceReference,
} from "../types";

export interface BuildMemoryCandidateInput {
  companyId: string;
  memoryType: SyntheticCompanyMemoryType;
  candidateKind: SyntheticMemoryCandidateKind;
  sourceReferences: SyntheticMemorySourceReference[];
  memoryConfidence: SyntheticCompanyMemoryConfidence;
  memoryFreshness: SyntheticCompanyMemoryFreshness;
  memoryCoverage: SyntheticMemoryCoverage;
  candidateObservationStrength: SyntheticMemoryCandidateObservationStrength;
  candidateStabilityScore: number;
  candidateStatus?: SyntheticMemoryCandidateStatus;
}

export interface BuildMemoryCandidateResult {
  candidate?: SyntheticMemoryCandidate;
  warnings: string[];
}

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function buildMemoryCandidate(input: BuildMemoryCandidateInput): BuildMemoryCandidateResult {
  const warnings: string[] = [];

  if (!input.companyId) warnings.push("companyId is required to build a memory candidate.");
  if (!input.sourceReferences.length) warnings.push("At least one source reference is required to build a memory candidate.");
  if (input.sourceReferences.some((sourceReference) => sourceReference.companyId !== input.companyId)) {
    warnings.push(`Source references must all belong to ingestion company ${input.companyId}.`);
  }
  if (
    input.candidateStabilityScore < SYNTHETIC_MEMORY_STABILITY_SCORE_MIN ||
    input.candidateStabilityScore > SYNTHETIC_MEMORY_STABILITY_SCORE_MAX
  ) {
    warnings.push("candidateStabilityScore must be between 0 and 1.");
  }
  if (warnings.length) return { warnings };

  const observedPeriodKeys = uniqueSorted(input.sourceReferences.map((sourceReference) => sourceReference.periodKey));
  const sourceReferenceIds = uniqueSorted(input.sourceReferences.map((sourceReference) => sourceReference.sourceId));
  const snapshotIds = uniqueSorted(input.sourceReferences.map((sourceReference) => sourceReference.snapshotId));
  const candidateId = stableSnapshotHash({
    companyId: input.companyId,
    candidateKind: input.candidateKind,
    observedPeriodKeys,
    sourceReferenceIds,
  });
  const retrievalLineageId = input.sourceReferences[0]?.retrievalLineageId || "";
  const retrievalDeterminismHash = input.sourceReferences[0]?.retrievalDeterminismHash || "";

  return {
    warnings,
    candidate: {
      candidateId,
      companyId: input.companyId,
      memoryType: input.memoryType,
      candidateStatus: input.candidateStatus || "candidate",
      candidateKind: input.candidateKind,
      sourceReferences: input.sourceReferences,
      observedPeriodKeys,
      memoryConfidence: input.memoryConfidence,
      memoryFreshness: input.memoryFreshness,
      memorySourceAuthority: SYNTHETIC_MEMORY_SOURCE_AUTHORITY,
      memoryCoverage: input.memoryCoverage,
      candidateObservationStrength: input.candidateObservationStrength,
      candidateStabilityScore: input.candidateStabilityScore,
      lineage: {
        ingestionId: stableSnapshotHash({
          companyId: input.companyId,
          candidateKind: input.candidateKind,
          sourceReferenceIds,
        }),
        candidateId,
        retrievalId: retrievalLineageId,
        retrievalLineageId,
        retrievalDeterminismHash,
        snapshotIds,
        sourceReferenceIds,
        observedPeriodKeys,
        candidateDeterminismHash: candidateId,
      },
    },
  };
}
