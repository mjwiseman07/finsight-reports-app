import { stableSnapshotHash } from "../../historical-snapshots";
import type {
  SyntheticFteGovernanceStatus,
  SyntheticFteLineage,
  SyntheticFtePattern,
  SyntheticFtePatternType,
  SyntheticFteRefreshStatus,
  SyntheticFteScope,
  SyntheticFteSourceReference,
} from "../types";

export type SyntheticFteMemoryKey =
  | "sustained_employee_fte_growth"
  | "sustained_employee_fte_decline"
  | "recurring_overtime_dependency"
  | "recurring_contractor_reliance"
  | "recurring_agency_labor_reliance"
  | "sustained_staffing_shortage"
  | "recurring_capacity_gap"
  | "low_fte_utilization"
  | "workforce_mix_shift"
  | "seasonal_staffing_pattern";

export interface SyntheticFteMemoryCandidate {
  candidateId: string;
  companyId: string;
  scope: SyntheticFteScope;
  patternId: string;
  patternType: SyntheticFtePatternType;
  memoryKey: SyntheticFteMemoryKey;
  supportingObservationIds: string[];
  supportingPeriodKeys: string[];
  confidenceScore: number;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  stabilityScore: number;
  governanceStatus: SyntheticFteGovernanceStatus;
  refreshStatus: SyntheticFteRefreshStatus;
  sourceReferences: SyntheticFteSourceReference[];
  lineage: SyntheticFteLineage;
}

export interface BuildFteMemoryCandidateInput {
  companyId: string;
  scope: SyntheticFteScope;
  pattern: SyntheticFtePattern;
  sourceReferences: SyntheticFteSourceReference[];
}

export interface BuildFteMemoryCandidateResult {
  candidate: SyntheticFteMemoryCandidate | null;
  skipped: boolean;
  warnings: string[];
}

export const FTE_PATTERN_MEMORY_KEY_MAP: Record<SyntheticFtePatternType, SyntheticFteMemoryKey> = {
  sustained_fte_growth: "sustained_employee_fte_growth",
  sustained_fte_decline: "sustained_employee_fte_decline",
  recurring_overtime_dependency: "recurring_overtime_dependency",
  recurring_contractor_reliance: "recurring_contractor_reliance",
  recurring_agency_labor_reliance: "recurring_agency_labor_reliance",
  staffing_shortage_pattern: "sustained_staffing_shortage",
  recurring_capacity_gap: "recurring_capacity_gap",
  low_fte_utilization_pattern: "low_fte_utilization",
  workforce_mix_shift_pattern: "workforce_mix_shift",
  seasonal_staffing_pattern: "seasonal_staffing_pattern",
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function buildCandidateId(input: BuildFteMemoryCandidateInput): string {
  return `fte-memory-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    scope: input.scope,
    patternId: input.pattern.patternId,
    patternType: input.pattern.patternType,
    sourceReferenceIds: input.sourceReferences.map((sourceReference) => sourceReference.sourceId).sort(),
    supportingObservationIds: [...input.pattern.supportingObservationIds].sort(),
  })}`;
}

function validateInput(input: BuildFteMemoryCandidateInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.scope || !hasValue(input.scope.companyId) || !hasValue(input.scope.scopeType)) {
    warnings.push("scope with companyId and scopeType is required.");
  }
  if (input.scope?.companyId && input.companyId && input.scope.companyId !== input.companyId) {
    warnings.push("scope companyId must match input companyId.");
  }
  if (!input.pattern) {
    warnings.push("pattern is required.");
    return warnings;
  }
  if (!hasValue(input.pattern.patternId)) warnings.push("patternId is required.");
  if (!hasValue(input.pattern.patternType)) warnings.push("patternType is required.");
  if (!input.pattern.supportingObservationIds?.length) {
    warnings.push("supporting observation IDs are required.");
  }
  if (!input.sourceReferences?.length) warnings.push("at least one source reference is required.");
  if (!input.pattern.lineage) warnings.push("lineage is required.");
  if (!FTE_PATTERN_MEMORY_KEY_MAP[input.pattern.patternType]) {
    warnings.push("patternType cannot be mapped to an FTE memory key.");
  }

  return warnings;
}

export function buildFteMemoryCandidate(
  input: BuildFteMemoryCandidateInput,
): BuildFteMemoryCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const sourceReferenceIds = input.sourceReferences.map((sourceReference) => sourceReference.sourceId);

  return {
    candidate: {
      candidateId: buildCandidateId(input),
      companyId: input.companyId,
      scope: input.scope,
      patternId: input.pattern.patternId,
      patternType: input.pattern.patternType,
      memoryKey: FTE_PATTERN_MEMORY_KEY_MAP[input.pattern.patternType],
      supportingObservationIds: input.pattern.supportingObservationIds,
      supportingPeriodKeys: input.pattern.supportingPeriodKeys,
      confidenceScore: input.pattern.confidenceScore,
      evidenceStrength: input.pattern.evidenceStrength,
      dataCompletenessScore: input.pattern.dataCompletenessScore,
      stabilityScore: input.pattern.stabilityScore,
      governanceStatus: input.pattern.governanceStatus,
      refreshStatus: input.pattern.refreshStatus,
      sourceReferences: input.sourceReferences,
      lineage: {
        ...input.pattern.lineage,
        patternIds: uniqueSorted([...input.pattern.lineage.patternIds, input.pattern.patternId]),
        observationIds: uniqueSorted([
          ...input.pattern.lineage.observationIds,
          ...input.pattern.supportingObservationIds,
        ]),
        sourceReferenceIds: uniqueSorted([...input.pattern.lineage.sourceReferenceIds, ...sourceReferenceIds]),
      },
    },
    skipped: false,
    warnings: [],
  };
}
