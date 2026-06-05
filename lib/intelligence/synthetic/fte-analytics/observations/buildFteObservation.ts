import { stableSnapshotHash } from "../../historical-snapshots";
import { SYNTHETIC_FTE_OBSERVATION_TYPES } from "../constants";
import type {
  SyntheticFteGovernanceStatus,
  SyntheticFteLineage,
  SyntheticFteMetricName,
  SyntheticFteObservation,
  SyntheticFteObservationType,
  SyntheticFteRefreshStatus,
  SyntheticFteScope,
  SyntheticFteSourceReference,
} from "../types";

export interface BuildFteObservationInput {
  companyId: string;
  scope: SyntheticFteScope;
  observationType: SyntheticFteObservationType;
  metricName: SyntheticFteMetricName;
  periodKey: string;
  comparisonPeriodKey?: string;
  currentValue: number;
  comparisonValue?: number;
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  sourceReferences: SyntheticFteSourceReference[];
  lineage: SyntheticFteLineage;
  governanceStatus: SyntheticFteGovernanceStatus;
  refreshStatus: SyntheticFteRefreshStatus;
}

export interface BuildFteObservationResult {
  observation: SyntheticFteObservation | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function buildObservationId(input: BuildFteObservationInput): string {
  return `fte-observation:${stableSnapshotHash({
    companyId: input.companyId,
    scope: input.scope,
    observationType: input.observationType,
    metricName: input.metricName,
    periodKey: input.periodKey,
    comparisonPeriodKey: input.comparisonPeriodKey || null,
    sourceReferenceIds: input.sourceReferences.map((sourceReference) => sourceReference.sourceId).sort(),
  })}`;
}

function validateInput(input: BuildFteObservationInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.scope || !hasValue(input.scope.companyId) || !hasValue(input.scope.scopeType)) {
    warnings.push("scope with companyId and scopeType is required.");
  }
  if (input.scope?.companyId && input.companyId && input.scope.companyId !== input.companyId) {
    warnings.push("scope companyId must match input companyId.");
  }
  if (!SYNTHETIC_FTE_OBSERVATION_TYPES.includes(input.observationType)) {
    warnings.push("observationType is not supported.");
  }
  if (!hasValue(input.metricName)) warnings.push("metricName is required.");
  if (!hasValue(input.periodKey)) warnings.push("periodKey is required.");
  if (typeof input.currentValue !== "number" || Number.isNaN(input.currentValue)) {
    warnings.push("currentValue must be a number.");
  }
  if (
    input.comparisonValue !== undefined &&
    (typeof input.comparisonValue !== "number" || Number.isNaN(input.comparisonValue))
  ) {
    warnings.push("comparisonValue must be a number when provided.");
  }
  if (typeof input.confidenceScore !== "number" || Number.isNaN(input.confidenceScore)) {
    warnings.push("confidenceScore must be a number.");
  }
  if (!hasValue(input.confidenceReason)) warnings.push("confidenceReason is required.");
  if (typeof input.dataCompletenessScore !== "number" || Number.isNaN(input.dataCompletenessScore)) {
    warnings.push("dataCompletenessScore must be a number.");
  }
  if (!input.sourceReferences?.length) warnings.push("at least one source reference is required.");
  if (!input.lineage) warnings.push("lineage is required.");

  return warnings;
}

export function buildFteObservation(input: BuildFteObservationInput): BuildFteObservationResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      observation: null,
      skipped: true,
      warnings,
    };
  }

  const absoluteChange =
    input.comparisonValue === undefined ? undefined : input.currentValue - input.comparisonValue;
  const percentChange =
    input.comparisonValue === undefined || input.comparisonValue === 0
      ? undefined
      : absoluteChange! / input.comparisonValue;

  return {
    observation: {
      observationId: buildObservationId(input),
      observationType: input.observationType,
      scope: input.scope,
      periodKey: input.periodKey,
      comparisonPeriodKey: input.comparisonPeriodKey,
      metricName: input.metricName,
      currentValue: input.currentValue,
      comparisonValue: input.comparisonValue,
      absoluteChange,
      percentChange,
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
