import { stableSnapshotHash } from "../../historical-snapshots";
import type {
  SyntheticFluxDriverCategory,
  SyntheticFluxGovernanceStatus,
  SyntheticFluxLineage,
  SyntheticFluxPattern,
  SyntheticFluxPatternType,
  SyntheticFluxRefreshStatus,
  SyntheticFluxScope,
  SyntheticFluxSourceReference,
} from "../types";

export type SyntheticFluxMemoryKey =
  | "sustained_margin_pressure"
  | "recurring_overtime_dependency"
  | "recurring_cash_pressure"
  | "recurring_working_capital_pressure"
  | "sustained_revenue_growth"
  | "sustained_revenue_decline"
  | "recurring_payroll_pressure"
  | "recurring_expense_growth"
  | "sustained_capacity_gap_pressure"
  | "recurring_contractor_labor_substitution";

export interface SyntheticFluxMemoryCandidate {
  candidateId: string;
  companyId: string;
  scope: SyntheticFluxScope;
  patternId: string;
  patternType: SyntheticFluxPatternType;
  memoryKey: SyntheticFluxMemoryKey;
  supportingObservationIds: string[];
  supportingPeriodKeys: string[];
  driverCategories: SyntheticFluxDriverCategory[];
  confidenceScore: number;
  evidenceStrength: "weak" | "moderate" | "strong" | "compelling";
  dataCompletenessScore: number;
  stabilityScore: number;
  governanceStatus: SyntheticFluxGovernanceStatus;
  refreshStatus: SyntheticFluxRefreshStatus;
  sourceReferences: SyntheticFluxSourceReference[];
  lineage: SyntheticFluxLineage;
}

export interface BuildFluxMemoryCandidateInput {
  companyId: string;
  scope: SyntheticFluxScope;
  pattern: SyntheticFluxPattern | null;
}

export interface BuildFluxMemoryCandidateResult {
  candidate: SyntheticFluxMemoryCandidate | null;
  skipped: boolean;
  warnings: string[];
}

export const FLUX_PATTERN_MEMORY_KEY_MAP: Record<SyntheticFluxPatternType, SyntheticFluxMemoryKey> = {
  sustained_margin_pressure: "sustained_margin_pressure",
  recurring_overtime_dependency: "recurring_overtime_dependency",
  recurring_cash_pressure: "recurring_cash_pressure",
  recurring_working_capital_pressure: "recurring_working_capital_pressure",
  sustained_revenue_growth: "sustained_revenue_growth",
  sustained_revenue_decline: "sustained_revenue_decline",
  recurring_payroll_pressure: "recurring_payroll_pressure",
  recurring_expense_growth: "recurring_expense_growth",
  sustained_capacity_gap_pressure: "sustained_capacity_gap_pressure",
  recurring_contractor_labor_substitution: "recurring_contractor_labor_substitution",
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function buildCandidateId(input: BuildFluxMemoryCandidateInput, pattern: SyntheticFluxPattern): string {
  return `flux-memory-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    scope: input.scope,
    patternId: pattern.patternId,
    patternType: pattern.patternType,
    sourceReferenceIds: uniqueSorted(
      pattern.sourceReferences.map((sourceReference) => sourceReference.sourceId),
    ),
    supportingObservationIds: uniqueSorted(pattern.supportingObservationIds),
    driverCategories: uniqueSorted(pattern.driverCategories),
  })}`;
}

function validateInput(input: BuildFluxMemoryCandidateInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.scope || !hasValue(input.scope.companyId)) {
    warnings.push("scope with companyId is required.");
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
  if (!input.pattern.sourceReferences?.length) warnings.push("at least one source reference is required.");
  if (!input.pattern.lineage) warnings.push("lineage is required.");
  if (!input.pattern.driverCategories?.length) warnings.push("driver categories are required.");
  if (!FLUX_PATTERN_MEMORY_KEY_MAP[input.pattern.patternType]) {
    warnings.push("patternType cannot be mapped to a Flux memory key.");
  }

  return warnings;
}

export function buildFluxMemoryCandidate(
  input: BuildFluxMemoryCandidateInput,
): BuildFluxMemoryCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.pattern) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const pattern = input.pattern;
  const sourceReferenceIds = pattern.sourceReferences.map((sourceReference) => sourceReference.sourceId);

  return {
    candidate: {
      candidateId: buildCandidateId(input, pattern),
      companyId: input.companyId,
      scope: input.scope,
      patternId: pattern.patternId,
      patternType: pattern.patternType,
      memoryKey: FLUX_PATTERN_MEMORY_KEY_MAP[pattern.patternType],
      supportingObservationIds: pattern.supportingObservationIds,
      supportingPeriodKeys: pattern.supportingPeriodKeys,
      driverCategories: pattern.driverCategories,
      confidenceScore: pattern.confidenceScore,
      evidenceStrength: pattern.evidenceStrength,
      dataCompletenessScore: pattern.dataCompletenessScore,
      stabilityScore: pattern.stabilityScore,
      governanceStatus: pattern.governanceStatus,
      refreshStatus: pattern.refreshStatus,
      sourceReferences: pattern.sourceReferences,
      lineage: {
        ...pattern.lineage,
        patternIds: uniqueSorted([...pattern.lineage.patternIds, pattern.patternId]),
        observationIds: uniqueSorted([
          ...pattern.lineage.observationIds,
          ...pattern.supportingObservationIds,
        ]),
        sourceReferenceIds: uniqueSorted([...pattern.lineage.sourceReferenceIds, ...sourceReferenceIds]),
      },
    },
    skipped: false,
    warnings: [],
  };
}
