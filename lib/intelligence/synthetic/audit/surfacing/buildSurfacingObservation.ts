import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticMaterialityObservation } from "../materiality";
import type {
  SyntheticAuditCategory,
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditContract,
  SyntheticAuditEvidenceReferences,
  SyntheticAuditExceptionMetadata,
  SyntheticAuditFindingMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditLearningCompatibility,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditMemoryCompatibility,
  SyntheticAuditObservationMetadata,
  SyntheticAuditPackageCompatibility,
  SyntheticAuditPersonaCompatibility,
  SyntheticAuditRiskMetadata,
  SyntheticAuditScope,
  SyntheticAuditSurfaceCompatibility,
  SyntheticAuditTrustMetadata,
} from "../types";

export type SyntheticSurfacingCategory =
  | "command_center_eligible"
  | "watchlist_eligible"
  | "briefing_eligible"
  | "decision_queue_eligible"
  | "executive_summary_eligible"
  | "pulse_only"
  | "background_only"
  | "role_specific"
  | "package_specific";

export const SYNTHETIC_SURFACING_CATEGORIES: SyntheticSurfacingCategory[] = [
  "command_center_eligible",
  "watchlist_eligible",
  "briefing_eligible",
  "decision_queue_eligible",
  "executive_summary_eligible",
  "pulse_only",
  "background_only",
  "role_specific",
  "package_specific",
];

export interface BuildSurfacingObservationInput {
  materialityObservations: SyntheticMaterialityObservation[];
  surfacingObservationKey: string;
  surfacingCategory: SyntheticSurfacingCategory;
}

export interface SyntheticSurfacingObservation {
  surfacingObservationId: string;
  surfacingObservationKey: string;
  surfacingCategory: SyntheticSurfacingCategory;
  companyId: string;
  auditCategories: SyntheticAuditCategory[];
  scope: SyntheticAuditScope;
  materialityObservationIds: string[];
  materialityObservationKeys: string[];
  materialityCategories: string[];
  recurringPatternObservationIds: string[];
  expectedActivityObservationIds: string[];
  missingActivityObservationIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditEvidencePackageIds: string[];
  auditCandidateIds: string[];
  auditContractReferenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  evidence: SyntheticAuditEvidenceReferences[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  observationMetadata: SyntheticAuditObservationMetadata[];
  findingMetadata: SyntheticAuditFindingMetadata[];
  exceptionMetadata: SyntheticAuditExceptionMetadata[];
  riskMetadata: SyntheticAuditRiskMetadata[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityCompatibility: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility: SyntheticAuditPersonaCompatibility[];
  packageCompatibility: SyntheticAuditPackageCompatibility[];
  memoryCompatibility: SyntheticAuditMemoryCompatibility[];
  learningCompatibility: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility: SyntheticAuditSurfaceCompatibility[];
  auditContracts: SyntheticAuditContract[];
  materialityObservations: SyntheticMaterialityObservation[];
  warnings: string[];
}

export interface BuildSurfacingObservationResult {
  surfacingObservation: SyntheticSurfacingObservation | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(hasValue))];
}

function isSupportedSurfacingCategory(category: SyntheticSurfacingCategory): boolean {
  return SYNTHETIC_SURFACING_CATEGORIES.includes(category);
}

function getMaterialityObservations(input: BuildSurfacingObservationInput): SyntheticMaterialityObservation[] {
  return input.materialityObservations ?? [];
}

function getFirstMaterialityObservation(
  input: BuildSurfacingObservationInput,
): SyntheticMaterialityObservation | undefined {
  return getMaterialityObservations(input)[0];
}

function buildSurfacingObservationId(input: BuildSurfacingObservationInput): string {
  return `synthetic-surfacing-observation:${stableSnapshotHash({
    surfacingObservationKey: input.surfacingObservationKey,
    surfacingCategory: input.surfacingCategory,
    companyId: getFirstMaterialityObservation(input)?.companyId ?? null,
    materialityObservationIds: getMaterialityObservations(input).map(
      (observation) => observation.materialityObservationId,
    ),
    materialityCategories: getMaterialityObservations(input).map((observation) => observation.materialityCategory),
    recurringPatternObservationIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.recurringPatternObservationIds),
    ),
    expectedActivityObservationIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.expectedActivityObservationIds),
    ),
    missingActivityObservationIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.missingActivityObservationIds),
    ),
    auditFindingArtifactIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.auditFindingArtifactIds),
    ),
    auditConfidenceIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.auditConfidenceIds),
    ),
    auditEvidencePackageIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.auditEvidencePackageIds),
    ),
    auditCandidateIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.auditCandidateIds),
    ),
    auditContractReferenceIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.auditContractReferenceIds),
    ),
    auditSurfaceIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.auditSurfaceIds),
    ),
    auditWatchlistIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.auditWatchlistIds),
    ),
    auditBriefingIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.auditBriefingIds),
    ),
    evidenceReferenceIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.evidenceReferenceIds),
    ),
    sourceReferenceIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.sourceReferenceIds),
    ),
    lineageReferenceIds: uniqueStable(
      getMaterialityObservations(input).flatMap((observation) => observation.lineageReferenceIds),
    ),
    isolationBoundaryIds: getFirstMaterialityObservation(input)?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateInput(input: BuildSurfacingObservationInput): string[] {
  const warnings: string[] = [];
  const materialityObservations = getMaterialityObservations(input);
  const firstObservation = getFirstMaterialityObservation(input);

  if (!hasValue(input.surfacingObservationKey)) warnings.push("surfacingObservationKey is required.");
  if (!hasValue(input.surfacingCategory)) warnings.push("surfacingCategory is required.");
  if (!isSupportedSurfacingCategory(input.surfacingCategory)) {
    warnings.push("surfacingCategory must be a supported surfacing category.");
  }
  if (!Array.isArray(input.materialityObservations)) {
    warnings.push("materialityObservations must be an array.");
    return warnings;
  }
  if (materialityObservations.length === 0) {
    warnings.push("materialityObservations must include at least one value.");
    return warnings;
  }
  if (!firstObservation) return warnings;

  materialityObservations.forEach((observation, index) => {
    if (!hasValue(observation.materialityObservationId)) {
      warnings.push(`materialityObservations[${index}].materialityObservationId is required.`);
    }
    if (!hasValue(observation.materialityObservationKey)) {
      warnings.push(`materialityObservations[${index}].materialityObservationKey is required.`);
    }
    if (!hasValue(observation.materialityCategory)) {
      warnings.push(`materialityObservations[${index}].materialityCategory is required.`);
    }
    if (!hasValue(observation.companyId)) warnings.push(`materialityObservations[${index}].companyId is required.`);
    if (observation.companyId !== firstObservation.companyId) {
      warnings.push(`materialityObservations[${index}].companyId must match the first materiality companyId.`);
    }
    if (!observation.scope) {
      warnings.push(`materialityObservations[${index}].scope is required.`);
      return;
    }
    if (!hasValue(observation.scope.companyId)) {
      warnings.push(`materialityObservations[${index}].scope.companyId is required.`);
    }
    if (observation.scope.companyId !== observation.companyId) {
      warnings.push(`materialityObservations[${index}].scope.companyId must match companyId.`);
    }
    if (!hasArrayValue(observation.scope.isolationBoundaryIds)) {
      warnings.push(`materialityObservations[${index}].scope.isolationBoundaryIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.evidenceReferenceIds)) {
      warnings.push(`materialityObservations[${index}].evidenceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.sourceReferenceIds)) {
      warnings.push(`materialityObservations[${index}].sourceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.lineageReferenceIds)) {
      warnings.push(`materialityObservations[${index}].lineageReferenceIds must include at least one value.`);
    }
  });

  return warnings;
}

export function buildSurfacingObservation(input: BuildSurfacingObservationInput): BuildSurfacingObservationResult {
  const warnings = validateInput(input);
  const firstObservation = getFirstMaterialityObservation(input);
  if (warnings.length > 0 || !firstObservation) {
    return {
      surfacingObservation: null,
      skipped: true,
      warnings,
    };
  }

  const materialityObservations = getMaterialityObservations(input);

  return {
    surfacingObservation: {
      surfacingObservationId: buildSurfacingObservationId(input),
      surfacingObservationKey: input.surfacingObservationKey,
      surfacingCategory: input.surfacingCategory,
      companyId: firstObservation.companyId,
      auditCategories: materialityObservations.flatMap((observation) => observation.auditCategories),
      scope: firstObservation.scope,
      materialityObservationIds: materialityObservations.map((observation) => observation.materialityObservationId),
      materialityObservationKeys: materialityObservations.map((observation) => observation.materialityObservationKey),
      materialityCategories: materialityObservations.map((observation) => observation.materialityCategory),
      recurringPatternObservationIds: uniqueStable(
        materialityObservations.flatMap((observation) => observation.recurringPatternObservationIds),
      ),
      expectedActivityObservationIds: uniqueStable(
        materialityObservations.flatMap((observation) => observation.expectedActivityObservationIds),
      ),
      missingActivityObservationIds: uniqueStable(
        materialityObservations.flatMap((observation) => observation.missingActivityObservationIds),
      ),
      auditFindingArtifactIds: uniqueStable(
        materialityObservations.flatMap((observation) => observation.auditFindingArtifactIds),
      ),
      auditFindingIds: uniqueStable(materialityObservations.flatMap((observation) => observation.auditFindingIds)),
      auditConfidenceIds: uniqueStable(materialityObservations.flatMap((observation) => observation.auditConfidenceIds)),
      auditEvidencePackageIds: uniqueStable(
        materialityObservations.flatMap((observation) => observation.auditEvidencePackageIds),
      ),
      auditCandidateIds: uniqueStable(materialityObservations.flatMap((observation) => observation.auditCandidateIds)),
      auditContractReferenceIds: uniqueStable(
        materialityObservations.flatMap((observation) => observation.auditContractReferenceIds),
      ),
      auditSurfaceIds: uniqueStable(materialityObservations.flatMap((observation) => observation.auditSurfaceIds)),
      auditWatchlistIds: uniqueStable(materialityObservations.flatMap((observation) => observation.auditWatchlistIds)),
      auditBriefingIds: uniqueStable(materialityObservations.flatMap((observation) => observation.auditBriefingIds)),
      evidence: materialityObservations.flatMap((observation) => observation.evidence),
      evidenceReferenceIds: uniqueStable(
        materialityObservations.flatMap((observation) => observation.evidenceReferenceIds),
      ),
      sourceReferenceIds: uniqueStable(materialityObservations.flatMap((observation) => observation.sourceReferenceIds)),
      lineageReferenceIds: uniqueStable(
        materialityObservations.flatMap((observation) => observation.lineageReferenceIds),
      ),
      observationMetadata: materialityObservations.flatMap((observation) => observation.observationMetadata),
      findingMetadata: materialityObservations.flatMap((observation) => observation.findingMetadata),
      exceptionMetadata: materialityObservations.flatMap((observation) => observation.exceptionMetadata),
      riskMetadata: materialityObservations.flatMap((observation) => observation.riskMetadata),
      trustMetadata: materialityObservations.flatMap((observation) => observation.trustMetadata),
      confidenceMetadata: materialityObservations.flatMap((observation) => observation.confidenceMetadata),
      governanceMetadata: materialityObservations.flatMap((observation) => observation.governanceMetadata),
      materialityCompatibility: materialityObservations.flatMap((observation) => observation.materialityCompatibility),
      personaCompatibility: materialityObservations.flatMap((observation) => observation.personaCompatibility),
      packageCompatibility: materialityObservations.flatMap((observation) => observation.packageCompatibility),
      memoryCompatibility: materialityObservations.flatMap((observation) => observation.memoryCompatibility),
      learningCompatibility: materialityObservations.flatMap((observation) => observation.learningCompatibility),
      surfaceCompatibility: materialityObservations.flatMap((observation) => observation.surfaceCompatibility),
      auditContracts: materialityObservations.flatMap((observation) => observation.auditContracts),
      materialityObservations,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
