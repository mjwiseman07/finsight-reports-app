import type { ReportingBasis } from "../../standards/contracts/ReportingBasis";
import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticCommandCenterPrioritizationPackage } from "../prioritization";
import type {
  SyntheticCommandCenterBriefingCategory,
  SyntheticCommandCenterDecisionSurfaceCategory,
  SyntheticCommandCenterRoleCategory,
  SyntheticCommandCenterSurfaceCategory,
  SyntheticCommandCenterValidationStatus,
} from "../types";

export const DEFAULT_COMMAND_CENTER_APPLICABLE_BASIS: ReportingBasis[] = ["US_GAAP", "IFRS"];

export type SyntheticCommandCenterSurfaceArtifactCategory =
  | "executive_summary"
  | "attention_item"
  | "risk_item"
  | "recommendation_item"
  | "forecast_item"
  | "scenario_item"
  | "cash_item"
  | "health_item"
  | "close_item"
  | "portfolio_item"
  | "firm_item"
  | "controller_item"
  | "workforce_item"
  | "industry_item"
  | "govcon_item"
  | "construction_item"
  /** prof_services_item — routed via PS-2 industry kernel (LOCK-PS-2). */
  | "prof_services_item"
  /** saas_item — routed via SAAS-2 industry kernel (LOCK-SAAS-2). */
  | "saas_item"
  | "healthcare_item"
  | "inventory_item";

export type SyntheticCommandCenterSurfacePlacement =
  | "primary_surface"
  | "secondary_surface"
  | "deep_surface"
  | "pulse_only";

export type SyntheticCommandCenterConsumptionChannel =
  | "executive_summary"
  | "decision_queue"
  | "watchlist"
  | "briefing"
  | "board_surface"
  | "firm_surface"
  | "company_surface"
  | "mobile_surface"
  | "pulse";

export interface BuildCommandCenterSurfaceCandidateInput {
  prioritizationPackage: SyntheticCommandCenterPrioritizationPackage | null;
  surfaceArtifactCategory: SyntheticCommandCenterSurfaceArtifactCategory;
  surfacePlacement: SyntheticCommandCenterSurfacePlacement;
  consumptionChannels: SyntheticCommandCenterConsumptionChannel[];
  decisionSurfaceCategory: SyntheticCommandCenterDecisionSurfaceCategory;
  surfaceCategory: SyntheticCommandCenterSurfaceCategory;
  visibleRoleCategories: SyntheticCommandCenterRoleCategory[];
  executiveQuestions: string[];
  whyNowReasons: string[];
  memoryReferenceIds?: string[];
  outcomeReferenceIds?: string[];
  briefingCategory?: SyntheticCommandCenterBriefingCategory;
  validationStatus?: SyntheticCommandCenterValidationStatus;
  applicableBasis?: ReportingBasis[];
}

export interface SyntheticStructuredCommandCenterSurfaceCandidate {
  surfaceCandidateId: string;
  prioritizationPackageId: string;
  evidencePackageId: string;
  commandCenterCandidateId: string;
  companyId: string;
  commandCenterItemId: string;
  surfaceArtifactCategory: SyntheticCommandCenterSurfaceArtifactCategory;
  surfacePlacement: SyntheticCommandCenterSurfacePlacement;
  consumptionChannels: SyntheticCommandCenterConsumptionChannel[];
  decisionSurfaceCategory: SyntheticCommandCenterDecisionSurfaceCategory;
  surfaceCategory: SyntheticCommandCenterSurfaceCategory;
  visibleRoleCategories: SyntheticCommandCenterRoleCategory[];
  executiveQuestions: string[];
  whyNowReasons: string[];
  memoryReferenceIds: string[];
  outcomeReferenceIds: string[];
  briefingCategory?: SyntheticCommandCenterBriefingCategory;
  validationStatus?: SyntheticCommandCenterValidationStatus;
  applicableBasis: ReportingBasis[];
  prioritizationPackage: SyntheticCommandCenterPrioritizationPackage;
  warnings: string[];
}

export interface BuildCommandCenterSurfaceCandidateResult {
  surfaceCandidate: SyntheticStructuredCommandCenterSurfaceCandidate | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function buildSurfaceCandidateId(input: BuildCommandCenterSurfaceCandidateInput): string {
  const prioritizationPackage = input.prioritizationPackage;

  return `command-center-surface-candidate:${stableSnapshotHash({
    prioritizationPackageId: prioritizationPackage?.prioritizationPackageId ?? null,
    evidencePackageId: prioritizationPackage?.evidencePackageId ?? null,
    commandCenterCandidateId: prioritizationPackage?.commandCenterCandidateId ?? null,
    companyId: prioritizationPackage?.companyId ?? null,
    commandCenterItemId: prioritizationPackage?.commandCenterItemId ?? null,
    surfaceArtifactCategory: input.surfaceArtifactCategory,
    surfacePlacement: input.surfacePlacement,
    consumptionChannels: input.consumptionChannels,
    decisionSurfaceCategory: input.decisionSurfaceCategory,
    surfaceCategory: input.surfaceCategory,
    visibleRoleCategories: input.visibleRoleCategories,
    executiveQuestions: input.executiveQuestions,
    whyNowReasons: input.whyNowReasons,
    memoryReferenceIds: input.memoryReferenceIds ?? [],
    outcomeReferenceIds: input.outcomeReferenceIds ?? [],
    briefingCategory: input.briefingCategory ?? null,
    validationStatus:
      input.validationStatus ?? prioritizationPackage?.validationStatusMetadata?.validationStatus ?? null,
    applicableBasis: input.applicableBasis ?? DEFAULT_COMMAND_CENTER_APPLICABLE_BASIS,
  })}`;
}

function validateInput(input: BuildCommandCenterSurfaceCandidateInput): string[] {
  const warnings: string[] = [];
  const prioritizationPackage = input.prioritizationPackage;

  if (!prioritizationPackage) {
    warnings.push("prioritizationPackage is required.");
    return warnings;
  }

  if (!hasValue(prioritizationPackage.prioritizationPackageId)) {
    warnings.push("prioritizationPackage.prioritizationPackageId is required.");
  }
  if (!hasValue(prioritizationPackage.evidencePackageId)) {
    warnings.push("prioritizationPackage.evidencePackageId is required.");
  }
  if (!hasValue(prioritizationPackage.commandCenterCandidateId)) {
    warnings.push("prioritizationPackage.commandCenterCandidateId is required.");
  }
  if (!hasValue(prioritizationPackage.companyId)) {
    warnings.push("prioritizationPackage.companyId is required.");
  }
  if (!hasValue(prioritizationPackage.commandCenterItemId)) {
    warnings.push("prioritizationPackage.commandCenterItemId is required.");
  }
  if (!prioritizationPackage.evidencePackage) {
    warnings.push("prioritizationPackage.evidencePackage is required.");
  }
  if (!prioritizationPackage.priorityMetadata) {
    warnings.push("prioritizationPackage.priorityMetadata is required.");
  }
  if (!prioritizationPackage.surfaceCompatibility) {
    warnings.push("prioritizationPackage.surfaceCompatibility is required.");
  }
  if (!hasValue(input.surfaceArtifactCategory)) {
    warnings.push("surfaceArtifactCategory is required.");
  }
  if (!hasValue(input.surfacePlacement)) {
    warnings.push("surfacePlacement is required.");
  }
  if (!hasArrayValue(input.consumptionChannels)) {
    warnings.push("consumptionChannels must include at least one value.");
  }
  if (!hasValue(input.decisionSurfaceCategory)) {
    warnings.push("decisionSurfaceCategory is required.");
  }
  if (!hasValue(input.surfaceCategory)) {
    warnings.push("surfaceCategory is required.");
  }
  if (!hasArrayValue(input.visibleRoleCategories)) {
    warnings.push("visibleRoleCategories must include at least one value.");
  }
  if (!hasArrayValue(input.executiveQuestions)) {
    warnings.push("executiveQuestions must include at least one value.");
  }

  return warnings;
}

export function buildCommandCenterSurfaceCandidate(
  input: BuildCommandCenterSurfaceCandidateInput,
): BuildCommandCenterSurfaceCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.prioritizationPackage) {
    return {
      surfaceCandidate: null,
      skipped: true,
      warnings,
    };
  }

  const prioritizationPackage = input.prioritizationPackage;

  return {
    surfaceCandidate: {
      surfaceCandidateId: buildSurfaceCandidateId(input),
      prioritizationPackageId: prioritizationPackage.prioritizationPackageId,
      evidencePackageId: prioritizationPackage.evidencePackageId,
      commandCenterCandidateId: prioritizationPackage.commandCenterCandidateId,
      companyId: prioritizationPackage.companyId,
      commandCenterItemId: prioritizationPackage.commandCenterItemId,
      surfaceArtifactCategory: input.surfaceArtifactCategory,
      surfacePlacement: input.surfacePlacement,
      consumptionChannels: input.consumptionChannels,
      decisionSurfaceCategory: input.decisionSurfaceCategory,
      surfaceCategory: input.surfaceCategory,
      visibleRoleCategories: input.visibleRoleCategories,
      executiveQuestions: input.executiveQuestions,
      whyNowReasons: input.whyNowReasons,
      memoryReferenceIds: input.memoryReferenceIds ?? [],
      outcomeReferenceIds: input.outcomeReferenceIds ?? [],
      briefingCategory: input.briefingCategory,
      validationStatus: input.validationStatus ?? prioritizationPackage.validationStatusMetadata?.validationStatus,
      applicableBasis: input.applicableBasis ?? DEFAULT_COMMAND_CENTER_APPLICABLE_BASIS,
      prioritizationPackage,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
