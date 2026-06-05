import { stableSnapshotHash } from "../../historical-snapshots";
import { SYNTHETIC_FTE_PATTERN_TYPES } from "../constants";
import type {
  SyntheticFteGovernanceStatus,
  SyntheticFteLineage,
  SyntheticFteObservation,
  SyntheticFtePattern,
  SyntheticFtePatternType,
  SyntheticFteRefreshStatus,
  SyntheticFteScope,
  SyntheticFteSourceReference,
} from "../types";

export interface BuildFtePatternInput {
  companyId: string;
  scope: SyntheticFteScope;
  patternType: SyntheticFtePatternType;
  observationWindow: string;
  supportingObservations: SyntheticFteObservation[];
  minimumPeriodCount?: number;
  patternStrength: "weak" | "moderate" | "strong" | "persistent";
  stabilityScore: number;
  confidenceScore: number;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  sourceReferences: SyntheticFteSourceReference[];
  lineage: SyntheticFteLineage;
  governanceStatus: SyntheticFteGovernanceStatus;
  refreshStatus: SyntheticFteRefreshStatus;
}

export interface BuildFtePatternResult {
  pattern: SyntheticFtePattern | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function getSupportingObservationIds(input: BuildFtePatternInput): string[] {
  return uniqueSorted(input.supportingObservations.map((observation) => observation.observationId).filter(Boolean));
}

function getSupportingPeriodKeys(input: BuildFtePatternInput): string[] {
  return uniqueSorted(input.supportingObservations.map((observation) => observation.periodKey).filter(Boolean));
}

function buildPatternId(input: BuildFtePatternInput): string {
  return `fte-pattern:${stableSnapshotHash({
    companyId: input.companyId,
    scope: input.scope,
    patternType: input.patternType,
    observationWindow: input.observationWindow,
    supportingObservationIds: getSupportingObservationIds(input),
    sourceReferenceIds: input.sourceReferences.map((sourceReference) => sourceReference.sourceId).sort(),
  })}`;
}

function validateInput(input: BuildFtePatternInput): string[] {
  const warnings: string[] = [];
  const minimumPeriodCount = input.minimumPeriodCount ?? 2;
  const supportingObservationIds = getSupportingObservationIds(input);
  const supportingPeriodKeys = getSupportingPeriodKeys(input);

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.scope || !hasValue(input.scope.companyId) || !hasValue(input.scope.scopeType)) {
    warnings.push("scope with companyId and scopeType is required.");
  }
  if (input.scope?.companyId && input.companyId && input.scope.companyId !== input.companyId) {
    warnings.push("scope companyId must match input companyId.");
  }
  if (!SYNTHETIC_FTE_PATTERN_TYPES.includes(input.patternType)) {
    warnings.push("patternType is not supported.");
  }
  if (!hasValue(input.observationWindow)) warnings.push("observationWindow is required.");
  if (!input.supportingObservations?.length) warnings.push("supportingObservations are required.");
  if (supportingObservationIds.length === 0) warnings.push("supporting observation IDs are required.");
  if (supportingPeriodKeys.length < minimumPeriodCount) {
    warnings.push(`at least ${minimumPeriodCount} supporting periods are required.`);
  }
  if (typeof input.stabilityScore !== "number" || Number.isNaN(input.stabilityScore)) {
    warnings.push("stabilityScore must be a number.");
  }
  if (typeof input.confidenceScore !== "number" || Number.isNaN(input.confidenceScore)) {
    warnings.push("confidenceScore must be a number.");
  }
  if (typeof input.dataCompletenessScore !== "number" || Number.isNaN(input.dataCompletenessScore)) {
    warnings.push("dataCompletenessScore must be a number.");
  }
  if (!input.sourceReferences?.length) warnings.push("at least one source reference is required.");
  if (!input.lineage) warnings.push("lineage is required.");

  return warnings;
}

export function buildFtePattern(input: BuildFtePatternInput): BuildFtePatternResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      pattern: null,
      skipped: true,
      warnings,
    };
  }

  const supportingObservationIds = getSupportingObservationIds(input);
  const supportingPeriodKeys = getSupportingPeriodKeys(input);

  return {
    pattern: {
      patternId: buildPatternId(input),
      patternType: input.patternType,
      scope: input.scope,
      observationWindow: input.observationWindow,
      supportingObservationIds,
      supportingPeriodKeys,
      patternStrength: input.patternStrength,
      stabilityScore: input.stabilityScore,
      confidenceScore: input.confidenceScore,
      evidenceStrength: input.evidenceStrength,
      dataCompletenessScore: input.dataCompletenessScore,
      governanceStatus: input.governanceStatus,
      refreshStatus: input.refreshStatus,
      lineage: {
        ...input.lineage,
        observationIds: uniqueSorted([...input.lineage.observationIds, ...supportingObservationIds]),
        sourceReferenceIds: uniqueSorted([
          ...input.lineage.sourceReferenceIds,
          ...input.sourceReferences.map((sourceReference) => sourceReference.sourceId),
        ]),
      },
    },
    skipped: false,
    warnings: [],
  };
}
