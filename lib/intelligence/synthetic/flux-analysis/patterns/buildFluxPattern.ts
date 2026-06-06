import { stableSnapshotHash } from "../../historical-snapshots";
import { SYNTHETIC_FLUX_CATEGORIES, SYNTHETIC_FLUX_PATTERN_TYPES } from "../constants";
import type {
  SyntheticFluxCategory,
  SyntheticFluxDriverCategory,
  SyntheticFluxGovernanceStatus,
  SyntheticFluxLineage,
  SyntheticFluxObservation,
  SyntheticFluxPattern,
  SyntheticFluxPatternType,
  SyntheticFluxRefreshStatus,
  SyntheticFluxScope,
  SyntheticFluxSourceReference,
} from "../types";

export interface BuildFluxPatternInput {
  companyId: string;
  scope: SyntheticFluxScope;
  patternType: SyntheticFluxPatternType;
  fluxCategory?: SyntheticFluxCategory;
  observationWindow: string;
  supportingObservations: SyntheticFluxObservation[];
  minimumPeriodCount?: number;
  patternStrength: "weak" | "moderate" | "strong" | "persistent";
  stabilityScore: number;
  confidenceScore: number;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  sourceReferences: SyntheticFluxSourceReference[];
  lineage: SyntheticFluxLineage;
  governanceStatus: SyntheticFluxGovernanceStatus;
  refreshStatus: SyntheticFluxRefreshStatus;
}

export interface BuildFluxPatternResult {
  pattern: SyntheticFluxPattern | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueInOrder<T extends string>(values: T[]): T[] {
  const seen = new Set<T>();
  return values.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function getSupportingObservationIds(input: BuildFluxPatternInput): string[] {
  return uniqueInOrder(
    (input.supportingObservations ?? []).map((observation) => observation.observationId),
  );
}

function getSupportingPeriodKeys(input: BuildFluxPatternInput): string[] {
  return uniqueInOrder(
    (input.supportingObservations ?? []).map((observation) => observation.currentPeriodKey),
  );
}

function getDriverCategories(input: BuildFluxPatternInput): SyntheticFluxDriverCategory[] {
  return uniqueInOrder(
    (input.supportingObservations ?? []).flatMap((observation) =>
      (observation.drivers ?? []).map((driver) => driver.driverCategory),
    ),
  ) as SyntheticFluxDriverCategory[];
}

function getFluxCategory(input: BuildFluxPatternInput): SyntheticFluxCategory | null {
  if (input.fluxCategory) return input.fluxCategory;

  const categories = uniqueInOrder(
    (input.supportingObservations ?? []).map((observation) => observation.fluxCategory),
  );

  return categories.length === 1 ? categories[0] : null;
}

function getSourceReferences(input: BuildFluxPatternInput): SyntheticFluxSourceReference[] {
  const sourceReferencesById = new Map<string, SyntheticFluxSourceReference>();

  for (const sourceReference of input.sourceReferences ?? []) {
    if (sourceReference.sourceId) sourceReferencesById.set(sourceReference.sourceId, sourceReference);
  }

  for (const observation of input.supportingObservations ?? []) {
    for (const sourceReference of observation.sourceReferences ?? []) {
      if (sourceReference.sourceId) sourceReferencesById.set(sourceReference.sourceId, sourceReference);
    }
  }

  return [...sourceReferencesById.values()];
}

function buildPatternId(input: BuildFluxPatternInput, fluxCategory: SyntheticFluxCategory): string {
  return `flux-pattern:${stableSnapshotHash({
    companyId: input.companyId,
    scope: input.scope,
    patternType: input.patternType,
    fluxCategory,
    observationWindow: input.observationWindow,
    supportingObservationIds: uniqueSorted(getSupportingObservationIds(input)),
    sourceReferenceIds: uniqueSorted(getSourceReferences(input).map((sourceReference) => sourceReference.sourceId)),
  })}`;
}

function validateInput(input: BuildFluxPatternInput): string[] {
  const warnings: string[] = [];
  const minimumPeriodCount = input.minimumPeriodCount ?? 2;
  const supportingObservationIds = getSupportingObservationIds(input);
  const supportingPeriodKeys = getSupportingPeriodKeys(input);
  const fluxCategory = getFluxCategory(input);

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.scope || !hasValue(input.scope.companyId)) {
    warnings.push("scope with companyId is required.");
  }
  if (input.scope?.companyId && input.companyId && input.scope.companyId !== input.companyId) {
    warnings.push("scope companyId must match input companyId.");
  }
  if (!SYNTHETIC_FLUX_PATTERN_TYPES.includes(input.patternType)) {
    warnings.push("patternType is not supported.");
  }
  if (input.fluxCategory !== undefined && !SYNTHETIC_FLUX_CATEGORIES.includes(input.fluxCategory)) {
    warnings.push("fluxCategory is not supported.");
  }
  if (!fluxCategory) {
    warnings.push("fluxCategory is required or must be derivable from one supporting category.");
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
  if (!hasValue(input.governanceStatus)) warnings.push("governanceStatus is required.");
  if (!hasValue(input.refreshStatus)) warnings.push("refreshStatus is required.");

  return warnings;
}

export function buildFluxPattern(input: BuildFluxPatternInput): BuildFluxPatternResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      pattern: null,
      skipped: true,
      warnings,
    };
  }

  const fluxCategory = getFluxCategory(input)!;
  const supportingObservationIds = getSupportingObservationIds(input);
  const supportingPeriodKeys = getSupportingPeriodKeys(input);
  const driverCategories = getDriverCategories(input);
  const sourceReferences = getSourceReferences(input);
  const sourceReferenceIds = uniqueSorted(
    sourceReferences.map((sourceReference) => sourceReference.sourceId),
  );

  return {
    pattern: {
      patternId: buildPatternId(input, fluxCategory),
      patternType: input.patternType,
      fluxCategory,
      scope: input.scope,
      observationWindow: input.observationWindow,
      supportingObservationIds,
      supportingPeriodKeys,
      driverCategories,
      patternStrength: input.patternStrength,
      stabilityScore: input.stabilityScore,
      confidenceScore: input.confidenceScore,
      evidenceStrength: input.evidenceStrength,
      dataCompletenessScore: input.dataCompletenessScore,
      governanceStatus: input.governanceStatus,
      refreshStatus: input.refreshStatus,
      sourceReferences,
      lineage: {
        ...input.lineage,
        observationIds: uniqueSorted([...input.lineage.observationIds, ...supportingObservationIds]),
        sourceReferenceIds: uniqueSorted([...input.lineage.sourceReferenceIds, ...sourceReferenceIds]),
        driverIds: uniqueSorted([
          ...input.lineage.driverIds,
          ...input.supportingObservations.flatMap((observation) =>
            (observation.drivers ?? []).map((driver) => driver.driverId),
          ),
        ]),
      },
    },
    skipped: false,
    warnings: [],
  };
}
