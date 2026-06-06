import { stableSnapshotHash } from "../../historical-snapshots";
import {
  SYNTHETIC_FLUX_CATEGORIES,
  SYNTHETIC_FLUX_COMPARISON_TYPES,
  SYNTHETIC_FLUX_OBSERVATION_TYPES,
} from "../constants";
import type {
  SyntheticFluxCategory,
  SyntheticFluxComparisonType,
  SyntheticFluxDriverAttribution,
  SyntheticFluxGovernanceStatus,
  SyntheticFluxLineage,
  SyntheticFluxObservation,
  SyntheticFluxObservationType,
  SyntheticFluxRefreshStatus,
  SyntheticFluxScope,
  SyntheticFluxSourceReference,
} from "../types";

export interface BuildFluxObservationInput {
  companyId: string;
  scope: SyntheticFluxScope;
  fluxCategory: SyntheticFluxCategory;
  observationType: SyntheticFluxObservationType;
  comparisonType?: SyntheticFluxComparisonType;
  currentPeriod: string;
  comparisonPeriod: string;
  currentValue: number;
  comparisonValue: number;
  drivers: SyntheticFluxDriverAttribution[];
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  sourceReferences: SyntheticFluxSourceReference[];
  lineage: SyntheticFluxLineage;
  governanceStatus: SyntheticFluxGovernanceStatus;
  refreshStatus: SyntheticFluxRefreshStatus;
}

export interface BuildFluxObservationResult {
  observation: SyntheticFluxObservation | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function buildObservationId(input: BuildFluxObservationInput): string {
  return `flux-observation:${stableSnapshotHash({
    companyId: input.companyId,
    scope: input.scope,
    fluxCategory: input.fluxCategory,
    observationType: input.observationType,
    currentPeriod: input.currentPeriod,
    comparisonPeriod: input.comparisonPeriod,
    sourceReferenceIds: input.sourceReferences.map((sourceReference) => sourceReference.sourceId).sort(),
  })}`;
}

function validateInput(input: BuildFluxObservationInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.scope || !hasValue(input.scope.companyId)) {
    warnings.push("scope with companyId is required.");
  }
  if (input.scope?.companyId && input.companyId && input.scope.companyId !== input.companyId) {
    warnings.push("scope companyId must match input companyId.");
  }
  if (!SYNTHETIC_FLUX_CATEGORIES.includes(input.fluxCategory)) {
    warnings.push("fluxCategory is not supported.");
  }
  if (
    input.comparisonType !== undefined &&
    !SYNTHETIC_FLUX_COMPARISON_TYPES.includes(input.comparisonType)
  ) {
    warnings.push("comparisonType is not supported.");
  }
  if (!SYNTHETIC_FLUX_OBSERVATION_TYPES.includes(input.observationType)) {
    warnings.push("observationType is not supported.");
  }
  if (!hasValue(input.currentPeriod)) warnings.push("currentPeriod is required.");
  if (!hasValue(input.comparisonPeriod)) warnings.push("comparisonPeriod is required.");
  if (typeof input.currentValue !== "number" || Number.isNaN(input.currentValue)) {
    warnings.push("currentValue must be a number.");
  }
  if (typeof input.comparisonValue !== "number" || Number.isNaN(input.comparisonValue)) {
    warnings.push("comparisonValue must be a number.");
  }
  if (!Array.isArray(input.drivers)) warnings.push("drivers must be an array.");
  if (typeof input.confidenceScore !== "number" || Number.isNaN(input.confidenceScore)) {
    warnings.push("confidenceScore must be a number.");
  }
  if (!hasValue(input.confidenceReason)) warnings.push("confidenceReason is required.");
  if (typeof input.dataCompletenessScore !== "number" || Number.isNaN(input.dataCompletenessScore)) {
    warnings.push("dataCompletenessScore must be a number.");
  }
  if (!input.sourceReferences?.length) warnings.push("at least one source reference is required.");
  if (!input.lineage) warnings.push("lineage is required.");
  if (!hasValue(input.governanceStatus)) warnings.push("governanceStatus is required.");
  if (!hasValue(input.refreshStatus)) warnings.push("refreshStatus is required.");

  return warnings;
}

export function buildFluxObservation(input: BuildFluxObservationInput): BuildFluxObservationResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      observation: null,
      skipped: true,
      warnings,
    };
  }

  const absoluteVariance = input.currentValue - input.comparisonValue;
  const percentVariance =
    input.comparisonValue === 0 ? undefined : absoluteVariance / input.comparisonValue;

  return {
    observation: {
      observationId: buildObservationId(input),
      observationType: input.observationType,
      fluxCategory: input.fluxCategory,
      comparisonType: input.comparisonType ?? "custom_comparison_period",
      scope: input.scope,
      currentPeriodKey: input.currentPeriod,
      comparisonPeriodKey: input.comparisonPeriod,
      currentValue: input.currentValue,
      comparisonValue: input.comparisonValue,
      absoluteVariance,
      percentVariance,
      drivers: input.drivers,
      confidenceScore: input.confidenceScore,
      confidenceReason: input.confidenceReason,
      evidenceStrength: input.evidenceStrength,
      dataCompletenessScore: input.dataCompletenessScore,
      governanceStatus: input.governanceStatus,
      refreshStatus: input.refreshStatus,
      sourceReferences: input.sourceReferences,
      lineage: input.lineage,
    },
    skipped: false,
    warnings: [],
  };
}
