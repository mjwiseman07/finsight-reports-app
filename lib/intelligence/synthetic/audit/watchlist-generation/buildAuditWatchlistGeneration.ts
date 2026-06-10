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

export type SyntheticAuditWatchlistGenerationCategory =
  | "audit_risk_watchlist"
  | "audit_exception_watchlist"
  | "missing_activity_watchlist"
  | "reconciliation_watchlist"
  | "tax_watchlist"
  | "cash_watchlist"
  | "covenant_watchlist"
  | "journal_watchlist"
  | "readiness_watchlist";

export const SYNTHETIC_AUDIT_WATCHLIST_GENERATION_CATEGORIES: SyntheticAuditWatchlistGenerationCategory[] = [
  "audit_risk_watchlist",
  "audit_exception_watchlist",
  "missing_activity_watchlist",
  "reconciliation_watchlist",
  "tax_watchlist",
  "cash_watchlist",
  "covenant_watchlist",
  "journal_watchlist",
  "readiness_watchlist",
];

export interface BuildAuditWatchlistGenerationInput {
  surfacingObservations: SyntheticSurfacingObservation[];
  auditWatchlistGenerationKey: string;
  watchlistCategory: SyntheticAuditWatchlistGenerationCategory;
}

export interface SyntheticAuditWatchlistGeneration {
  auditWatchlistGenerationId: string;
  auditWatchlistGenerationKey: string;
  watchlistCategory: SyntheticAuditWatchlistGenerationCategory;
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

export interface BuildAuditWatchlistGenerationResult {
  auditWatchlistGeneration: SyntheticAuditWatchlistGeneration | null;
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

function isSupportedWatchlistCategory(category: SyntheticAuditWatchlistGenerationCategory): boolean {
  return SYNTHETIC_AUDIT_WATCHLIST_GENERATION_CATEGORIES.includes(category);
}

function getSurfacingObservations(input: BuildAuditWatchlistGenerationInput): SyntheticSurfacingObservation[] {
  return input.surfacingObservations ?? [];
}

function getFirstSurfacingObservation(
  input: BuildAuditWatchlistGenerationInput,
): SyntheticSurfacingObservation | undefined {
  return getSurfacingObservations(input)[0];
}

function buildAuditWatchlistGenerationId(input: BuildAuditWatchlistGenerationInput): string {
  return `synthetic-audit-watchlist-generation:${stableSnapshotHash({
    auditWatchlistGenerationKey: input.auditWatchlistGenerationKey,
    watchlistCategory: input.watchlistCategory,
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

function validateInput(input: BuildAuditWatchlistGenerationInput): string[] {
  const warnings: string[] = [];
  const surfacingObservations = getSurfacingObservations(input);
  const firstObservation = getFirstSurfacingObservation(input);

  if (!hasValue(input.auditWatchlistGenerationKey)) warnings.push("auditWatchlistGenerationKey is required.");
  if (!hasValue(input.watchlistCategory)) warnings.push("watchlistCategory is required.");
  if (!isSupportedWatchlistCategory(input.watchlistCategory)) {
    warnings.push("watchlistCategory must be a supported audit watchlist generation category.");
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

export function buildAuditWatchlistGeneration(
  input: BuildAuditWatchlistGenerationInput,
): BuildAuditWatchlistGenerationResult {
  const warnings = validateInput(input);
  const firstObservation = getFirstSurfacingObservation(input);
  if (warnings.length > 0 || !firstObservation) {
    return {
      auditWatchlistGeneration: null,
      skipped: true,
      warnings,
    };
  }

  const surfacingObservations = getSurfacingObservations(input);

  return {
    auditWatchlistGeneration: {
      auditWatchlistGenerationId: buildAuditWatchlistGenerationId(input),
      auditWatchlistGenerationKey: input.auditWatchlistGenerationKey,
      watchlistCategory: input.watchlistCategory,
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
