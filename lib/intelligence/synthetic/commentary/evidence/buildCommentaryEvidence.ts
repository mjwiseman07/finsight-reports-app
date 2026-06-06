import { stableSnapshotHash } from "../../historical-snapshots";
import { SYNTHETIC_COMMENTARY_AUDIENCES, SYNTHETIC_COMMENTARY_CATEGORIES } from "../constants";
import type {
  SyntheticCommentaryAudience,
  SyntheticCommentaryCategory,
  SyntheticCommentaryDriverReference,
  SyntheticCommentaryEvidence,
  SyntheticCommentaryEvidenceStrength,
  SyntheticCommentaryGovernanceStatus,
  SyntheticCommentaryLineage,
  SyntheticCommentaryMemoryAlignmentStatus,
  SyntheticCommentaryMemoryReference,
  SyntheticCommentaryNarrativeHorizon,
  SyntheticCommentaryObservationReference,
  SyntheticCommentaryPatternReference,
  SyntheticCommentaryRefreshStatus,
  SyntheticCommentarySourceReference,
} from "../types";

export type SyntheticCommentaryEvidenceDepth = "summary" | "standard" | "detailed";
export type SyntheticCommentaryAudienceDepth = "board" | "executive" | "operator" | "controller";

export interface SyntheticCommentaryEvidencePackage {
  evidenceId: string;
  companyId: string;
  commentaryCategory: SyntheticCommentaryCategory;
  audience: SyntheticCommentaryAudience;
  periodKey: string;
  comparisonPeriodKey: string;
  evidence: SyntheticCommentaryEvidence[];
  observationReferences: SyntheticCommentaryObservationReference[];
  patternReferences: SyntheticCommentaryPatternReference[];
  memoryReferences: SyntheticCommentaryMemoryReference[];
  sourceReferences: SyntheticCommentarySourceReference[];
  driverReferences: SyntheticCommentaryDriverReference[];
  supportingObservationIds: string[];
  supportingPatternIds: string[];
  supportingMemoryIds: string[];
  supportingSourceReferenceIds: string[];
  driverReferenceIds: string[];
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: SyntheticCommentaryEvidenceStrength;
  dataCompletenessScore: number;
  evidencePriorityRank: number;
  evidencePriorityReason: string;
  missingDataFlags: string[];
  staleSourceFlags: string[];
  memoryAlignmentStatus: SyntheticCommentaryMemoryAlignmentStatus;
  narrativeDriftDetected: boolean;
  historicalPatternConflict: boolean;
  narrativeHorizon: SyntheticCommentaryNarrativeHorizon;
  evidenceDepth: SyntheticCommentaryEvidenceDepth;
  audienceDepth: SyntheticCommentaryAudienceDepth;
  lineage: SyntheticCommentaryLineage;
  governanceStatus: SyntheticCommentaryGovernanceStatus;
  refreshStatus: SyntheticCommentaryRefreshStatus;
}

export interface BuildCommentaryEvidenceInput {
  companyId: string;
  commentaryCategory: SyntheticCommentaryCategory;
  audience: SyntheticCommentaryAudience;
  periodKey: string;
  comparisonPeriodKey: string;
  observationReferences?: SyntheticCommentaryObservationReference[];
  patternReferences?: SyntheticCommentaryPatternReference[];
  memoryReferences?: SyntheticCommentaryMemoryReference[];
  sourceReferences?: SyntheticCommentarySourceReference[];
  driverReferences?: SyntheticCommentaryDriverReference[];
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: SyntheticCommentaryEvidenceStrength;
  dataCompletenessScore: number;
  evidencePriorityRank: number;
  evidencePriorityReason: string;
  missingDataFlags?: string[];
  staleSourceFlags?: string[];
  memoryAlignmentStatus: SyntheticCommentaryMemoryAlignmentStatus;
  narrativeDriftDetected: boolean;
  historicalPatternConflict: boolean;
  narrativeHorizon: SyntheticCommentaryNarrativeHorizon;
  evidenceDepth: SyntheticCommentaryEvidenceDepth;
  audienceDepth: SyntheticCommentaryAudienceDepth;
  lineage: SyntheticCommentaryLineage;
  governanceStatus: SyntheticCommentaryGovernanceStatus;
  refreshStatus: SyntheticCommentaryRefreshStatus;
}

export interface BuildCommentaryEvidenceResult {
  evidencePackage: SyntheticCommentaryEvidencePackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function getObservationIds(input: BuildCommentaryEvidenceInput): string[] {
  return uniqueSorted((input.observationReferences ?? []).map((reference) => reference.observationId));
}

function getPatternIds(input: BuildCommentaryEvidenceInput): string[] {
  return uniqueSorted((input.patternReferences ?? []).map((reference) => reference.patternId));
}

function getMemoryIds(input: BuildCommentaryEvidenceInput): string[] {
  return uniqueSorted((input.memoryReferences ?? []).map((reference) => reference.memoryId));
}

function getSourceReferenceIds(input: BuildCommentaryEvidenceInput): string[] {
  return uniqueSorted((input.sourceReferences ?? []).map((reference) => reference.sourceId));
}

function getDriverReferenceIds(input: BuildCommentaryEvidenceInput): string[] {
  return uniqueSorted((input.driverReferences ?? []).map((reference) => reference.driverReferenceId));
}

function hasSupportingEvidence(input: BuildCommentaryEvidenceInput): boolean {
  return (
    getObservationIds(input).length > 0 ||
    getPatternIds(input).length > 0 ||
    getMemoryIds(input).length > 0 ||
    getSourceReferenceIds(input).length > 0 ||
    getDriverReferenceIds(input).length > 0
  );
}

function buildEvidenceId(input: BuildCommentaryEvidenceInput): string {
  return `commentary-evidence:${stableSnapshotHash({
    companyId: input.companyId,
    commentaryCategory: input.commentaryCategory,
    audience: input.audience,
    periodKey: input.periodKey,
    comparisonPeriodKey: input.comparisonPeriodKey,
    observationIds: getObservationIds(input),
    patternIds: getPatternIds(input),
    memoryIds: getMemoryIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    driverReferenceIds: getDriverReferenceIds(input),
  })}`;
}

function buildEvidenceItems(
  input: BuildCommentaryEvidenceInput,
  evidenceId: string,
): SyntheticCommentaryEvidence[] {
  return [
    {
      evidenceId,
      evidenceType: "source_reference",
      evidencePriorityRank: input.evidencePriorityRank,
      evidencePriorityReason: input.evidencePriorityReason,
      sourceReferenceIds: getSourceReferenceIds(input),
      observationReferenceIds: getObservationIds(input),
      patternReferenceIds: getPatternIds(input),
      memoryReferenceIds: getMemoryIds(input),
      driverReferenceIds: getDriverReferenceIds(input),
    },
  ];
}

function validateInput(input: BuildCommentaryEvidenceInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!SYNTHETIC_COMMENTARY_CATEGORIES.includes(input.commentaryCategory)) {
    warnings.push("commentaryCategory is not supported.");
  }
  if (!SYNTHETIC_COMMENTARY_AUDIENCES.includes(input.audience)) {
    warnings.push("audience is not supported.");
  }
  if (!hasValue(input.periodKey)) warnings.push("periodKey is required.");
  if (!hasValue(input.comparisonPeriodKey)) warnings.push("comparisonPeriodKey is required.");
  if (!hasSupportingEvidence(input)) {
    warnings.push("at least one supporting observation, pattern, memory, source, or driver reference is required.");
  }
  if (typeof input.confidenceScore !== "number" || Number.isNaN(input.confidenceScore)) {
    warnings.push("confidenceScore must be a number.");
  }
  if (!hasValue(input.confidenceReason)) warnings.push("confidenceReason is required.");
  if (typeof input.dataCompletenessScore !== "number" || Number.isNaN(input.dataCompletenessScore)) {
    warnings.push("dataCompletenessScore must be a number.");
  }
  if (typeof input.evidencePriorityRank !== "number" || Number.isNaN(input.evidencePriorityRank)) {
    warnings.push("evidencePriorityRank must be a number.");
  }
  if (!hasValue(input.evidencePriorityReason)) warnings.push("evidencePriorityReason is required.");
  if (!input.lineage) warnings.push("lineage is required.");
  if (!hasValue(input.governanceStatus)) warnings.push("governanceStatus is required.");
  if (!hasValue(input.refreshStatus)) warnings.push("refreshStatus is required.");

  return warnings;
}

export function buildCommentaryEvidence(
  input: BuildCommentaryEvidenceInput,
): BuildCommentaryEvidenceResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      evidencePackage: null,
      skipped: true,
      warnings,
    };
  }

  const evidenceId = buildEvidenceId(input);
  const supportingObservationIds = getObservationIds(input);
  const supportingPatternIds = getPatternIds(input);
  const supportingMemoryIds = getMemoryIds(input);
  const supportingSourceReferenceIds = getSourceReferenceIds(input);
  const driverReferenceIds = getDriverReferenceIds(input);

  return {
    evidencePackage: {
      evidenceId,
      companyId: input.companyId,
      commentaryCategory: input.commentaryCategory,
      audience: input.audience,
      periodKey: input.periodKey,
      comparisonPeriodKey: input.comparisonPeriodKey,
      evidence: buildEvidenceItems(input, evidenceId),
      observationReferences: input.observationReferences ?? [],
      patternReferences: input.patternReferences ?? [],
      memoryReferences: input.memoryReferences ?? [],
      sourceReferences: input.sourceReferences ?? [],
      driverReferences: input.driverReferences ?? [],
      supportingObservationIds,
      supportingPatternIds,
      supportingMemoryIds,
      supportingSourceReferenceIds,
      driverReferenceIds,
      confidenceScore: input.confidenceScore,
      confidenceReason: input.confidenceReason,
      evidenceStrength: input.evidenceStrength,
      dataCompletenessScore: input.dataCompletenessScore,
      evidencePriorityRank: input.evidencePriorityRank,
      evidencePriorityReason: input.evidencePriorityReason,
      missingDataFlags: input.missingDataFlags ?? [],
      staleSourceFlags: input.staleSourceFlags ?? [],
      memoryAlignmentStatus: input.memoryAlignmentStatus,
      narrativeDriftDetected: input.narrativeDriftDetected,
      historicalPatternConflict: input.historicalPatternConflict,
      narrativeHorizon: input.narrativeHorizon,
      evidenceDepth: input.evidenceDepth,
      audienceDepth: input.audienceDepth,
      lineage: {
        ...input.lineage,
        sourceReferenceIds: uniqueSorted([...input.lineage.sourceReferenceIds, ...supportingSourceReferenceIds]),
        observationIds: uniqueSorted([...input.lineage.observationIds, ...supportingObservationIds]),
        patternIds: uniqueSorted([...input.lineage.patternIds, ...supportingPatternIds]),
        memoryIds: uniqueSorted([...input.lineage.memoryIds, ...supportingMemoryIds]),
        driverReferenceIds: uniqueSorted([...input.lineage.driverReferenceIds, ...driverReferenceIds]),
      },
      governanceStatus: input.governanceStatus,
      refreshStatus: input.refreshStatus,
    },
    skipped: false,
    warnings: [],
  };
}
