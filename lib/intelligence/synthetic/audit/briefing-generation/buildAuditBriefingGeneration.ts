import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticSurfacingObservation } from "../surfacing";
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

export type SyntheticAuditBriefingGenerationCategory =
  | "controller_briefing"
  | "accounting_manager_briefing"
  | "firm_briefing"
  | "fractional_cfo_briefing"
  | "cfo_briefing"
  | "business_owner_briefing"
  | "executive_summary_briefing"
  | "audit_readiness_briefing";

export const SYNTHETIC_AUDIT_BRIEFING_GENERATION_CATEGORIES: SyntheticAuditBriefingGenerationCategory[] = [
  "controller_briefing",
  "accounting_manager_briefing",
  "firm_briefing",
  "fractional_cfo_briefing",
  "cfo_briefing",
  "business_owner_briefing",
  "executive_summary_briefing",
  "audit_readiness_briefing",
];

export interface BuildAuditBriefingGenerationInput {
  surfacingObservations: SyntheticSurfacingObservation[];
  auditBriefingGenerationKey: string;
  briefingCategory: SyntheticAuditBriefingGenerationCategory;
}

export interface SyntheticAuditBriefingGeneration {
  auditBriefingGenerationId: string;
  auditBriefingGenerationKey: string;
  briefingCategory: SyntheticAuditBriefingGenerationCategory;
  companyId: string;
  auditCategories: SyntheticAuditCategory[];
  scope: SyntheticAuditScope;
  surfacingObservationIds: string[];
  surfacingObservationKeys: string[];
  surfacingCategories: string[];
  materialityObservationIds: string[];
  missingActivityObservationIds: string[];
  expectedActivityObservationIds: string[];
  recurringPatternObservationIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditEvidencePackageIds: string[];
  auditCandidateIds: string[];
  auditContractReferenceIds: string[];
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
  surfacingObservations: SyntheticSurfacingObservation[];
  warnings: string[];
}

export interface BuildAuditBriefingGenerationResult {
  auditBriefingGeneration: SyntheticAuditBriefingGeneration | null;
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

function isSupportedBriefingCategory(category: SyntheticAuditBriefingGenerationCategory): boolean {
  return SYNTHETIC_AUDIT_BRIEFING_GENERATION_CATEGORIES.includes(category);
}

function getSurfacingObservations(input: BuildAuditBriefingGenerationInput): SyntheticSurfacingObservation[] {
  return input.surfacingObservations ?? [];
}

function getFirstSurfacingObservation(
  input: BuildAuditBriefingGenerationInput,
): SyntheticSurfacingObservation | undefined {
  return getSurfacingObservations(input)[0];
}

function buildAuditBriefingGenerationId(input: BuildAuditBriefingGenerationInput): string {
  return `synthetic-audit-briefing-generation:${stableSnapshotHash({
    auditBriefingGenerationKey: input.auditBriefingGenerationKey,
    briefingCategory: input.briefingCategory,
    companyId: getFirstSurfacingObservation(input)?.companyId ?? null,
    surfacingObservationIds: getSurfacingObservations(input).map((observation) => observation.surfacingObservationId),
    surfacingCategories: getSurfacingObservations(input).map((observation) => observation.surfacingCategory),
    materialityObservationIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.materialityObservationIds),
    ),
    missingActivityObservationIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.missingActivityObservationIds),
    ),
    expectedActivityObservationIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.expectedActivityObservationIds),
    ),
    recurringPatternObservationIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.recurringPatternObservationIds),
    ),
    auditFindingArtifactIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.auditFindingArtifactIds),
    ),
    auditConfidenceIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.auditConfidenceIds),
    ),
    auditEvidencePackageIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.auditEvidencePackageIds),
    ),
    auditCandidateIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.auditCandidateIds),
    ),
    auditContractReferenceIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.auditContractReferenceIds),
    ),
    evidenceReferenceIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.evidenceReferenceIds),
    ),
    sourceReferenceIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.sourceReferenceIds),
    ),
    lineageReferenceIds: uniqueStable(
      getSurfacingObservations(input).flatMap((observation) => observation.lineageReferenceIds),
    ),
    isolationBoundaryIds: getFirstSurfacingObservation(input)?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateInput(input: BuildAuditBriefingGenerationInput): string[] {
  const warnings: string[] = [];
  const surfacingObservations = getSurfacingObservations(input);
  const firstObservation = getFirstSurfacingObservation(input);

  if (!hasValue(input.auditBriefingGenerationKey)) warnings.push("auditBriefingGenerationKey is required.");
  if (!hasValue(input.briefingCategory)) warnings.push("briefingCategory is required.");
  if (!isSupportedBriefingCategory(input.briefingCategory)) {
    warnings.push("briefingCategory must be a supported audit briefing generation category.");
  }
  if (!Array.isArray(input.surfacingObservations)) {
    warnings.push("surfacingObservations must be an array.");
    return warnings;
  }
  if (surfacingObservations.length === 0) {
    warnings.push("surfacingObservations must include at least one value.");
    return warnings;
  }
  if (!firstObservation) return warnings;

  surfacingObservations.forEach((observation, index) => {
    if (!hasValue(observation.surfacingObservationId)) {
      warnings.push(`surfacingObservations[${index}].surfacingObservationId is required.`);
    }
    if (!hasValue(observation.surfacingObservationKey)) {
      warnings.push(`surfacingObservations[${index}].surfacingObservationKey is required.`);
    }
    if (!hasValue(observation.surfacingCategory)) {
      warnings.push(`surfacingObservations[${index}].surfacingCategory is required.`);
    }
    if (!hasValue(observation.companyId)) warnings.push(`surfacingObservations[${index}].companyId is required.`);
    if (observation.companyId !== firstObservation.companyId) {
      warnings.push(`surfacingObservations[${index}].companyId must match the first surfacing companyId.`);
    }
    if (!observation.scope) {
      warnings.push(`surfacingObservations[${index}].scope is required.`);
      return;
    }
    if (!hasValue(observation.scope.companyId)) {
      warnings.push(`surfacingObservations[${index}].scope.companyId is required.`);
    }
    if (observation.scope.companyId !== observation.companyId) {
      warnings.push(`surfacingObservations[${index}].scope.companyId must match companyId.`);
    }
    if (!hasArrayValue(observation.scope.isolationBoundaryIds)) {
      warnings.push(`surfacingObservations[${index}].scope.isolationBoundaryIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.evidenceReferenceIds)) {
      warnings.push(`surfacingObservations[${index}].evidenceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.sourceReferenceIds)) {
      warnings.push(`surfacingObservations[${index}].sourceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.lineageReferenceIds)) {
      warnings.push(`surfacingObservations[${index}].lineageReferenceIds must include at least one value.`);
    }
  });

  return warnings;
}

export function buildAuditBriefingGeneration(
  input: BuildAuditBriefingGenerationInput,
): BuildAuditBriefingGenerationResult {
  const warnings = validateInput(input);
  const firstObservation = getFirstSurfacingObservation(input);
  if (warnings.length > 0 || !firstObservation) {
    return {
      auditBriefingGeneration: null,
      skipped: true,
      warnings,
    };
  }

  const surfacingObservations = getSurfacingObservations(input);

  return {
    auditBriefingGeneration: {
      auditBriefingGenerationId: buildAuditBriefingGenerationId(input),
      auditBriefingGenerationKey: input.auditBriefingGenerationKey,
      briefingCategory: input.briefingCategory,
      companyId: firstObservation.companyId,
      auditCategories: surfacingObservations.flatMap((observation) => observation.auditCategories),
      scope: firstObservation.scope,
      surfacingObservationIds: surfacingObservations.map((observation) => observation.surfacingObservationId),
      surfacingObservationKeys: surfacingObservations.map((observation) => observation.surfacingObservationKey),
      surfacingCategories: surfacingObservations.map((observation) => observation.surfacingCategory),
      materialityObservationIds: uniqueStable(
        surfacingObservations.flatMap((observation) => observation.materialityObservationIds),
      ),
      missingActivityObservationIds: uniqueStable(
        surfacingObservations.flatMap((observation) => observation.missingActivityObservationIds),
      ),
      expectedActivityObservationIds: uniqueStable(
        surfacingObservations.flatMap((observation) => observation.expectedActivityObservationIds),
      ),
      recurringPatternObservationIds: uniqueStable(
        surfacingObservations.flatMap((observation) => observation.recurringPatternObservationIds),
      ),
      auditFindingArtifactIds: uniqueStable(
        surfacingObservations.flatMap((observation) => observation.auditFindingArtifactIds),
      ),
      auditFindingIds: uniqueStable(surfacingObservations.flatMap((observation) => observation.auditFindingIds)),
      auditConfidenceIds: uniqueStable(surfacingObservations.flatMap((observation) => observation.auditConfidenceIds)),
      auditEvidencePackageIds: uniqueStable(
        surfacingObservations.flatMap((observation) => observation.auditEvidencePackageIds),
      ),
      auditCandidateIds: uniqueStable(surfacingObservations.flatMap((observation) => observation.auditCandidateIds)),
      auditContractReferenceIds: uniqueStable(
        surfacingObservations.flatMap((observation) => observation.auditContractReferenceIds),
      ),
      evidence: surfacingObservations.flatMap((observation) => observation.evidence),
      evidenceReferenceIds: uniqueStable(surfacingObservations.flatMap((observation) => observation.evidenceReferenceIds)),
      sourceReferenceIds: uniqueStable(surfacingObservations.flatMap((observation) => observation.sourceReferenceIds)),
      lineageReferenceIds: uniqueStable(surfacingObservations.flatMap((observation) => observation.lineageReferenceIds)),
      observationMetadata: surfacingObservations.flatMap((observation) => observation.observationMetadata),
      findingMetadata: surfacingObservations.flatMap((observation) => observation.findingMetadata),
      exceptionMetadata: surfacingObservations.flatMap((observation) => observation.exceptionMetadata),
      riskMetadata: surfacingObservations.flatMap((observation) => observation.riskMetadata),
      trustMetadata: surfacingObservations.flatMap((observation) => observation.trustMetadata),
      confidenceMetadata: surfacingObservations.flatMap((observation) => observation.confidenceMetadata),
      governanceMetadata: surfacingObservations.flatMap((observation) => observation.governanceMetadata),
      materialityCompatibility: surfacingObservations.flatMap((observation) => observation.materialityCompatibility),
      personaCompatibility: surfacingObservations.flatMap((observation) => observation.personaCompatibility),
      packageCompatibility: surfacingObservations.flatMap((observation) => observation.packageCompatibility),
      memoryCompatibility: surfacingObservations.flatMap((observation) => observation.memoryCompatibility),
      learningCompatibility: surfacingObservations.flatMap((observation) => observation.learningCompatibility),
      surfaceCompatibility: surfacingObservations.flatMap((observation) => observation.surfaceCompatibility),
      auditContracts: surfacingObservations.flatMap((observation) => observation.auditContracts),
      surfacingObservations,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
