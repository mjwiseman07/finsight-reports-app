import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditSurface } from "../surfaces";
import type {
  SyntheticAuditCategory,
  SyntheticAuditConfidenceMetadata,
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

export interface BuildAuditBriefingInput {
  auditSurface: SyntheticAuditSurface | null;
}

export interface SyntheticAuditBriefing {
  auditBriefingId: string;
  auditSurfaceId: string;
  auditConfidenceId: string;
  auditFindingArtifactId: string;
  auditFindingId: string;
  auditEvidencePackageId: string;
  auditCandidateId: string;
  auditCandidateKey: string;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  observationMetadata?: SyntheticAuditObservationMetadata;
  findingMetadata: SyntheticAuditFindingMetadata;
  exceptionMetadata?: SyntheticAuditExceptionMetadata;
  riskMetadata?: SyntheticAuditRiskMetadata;
  evidence: SyntheticAuditEvidenceReferences;
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata?: SyntheticAuditTrustMetadata;
  confidenceMetadata: SyntheticAuditConfidenceMetadata;
  governanceMetadata?: SyntheticAuditGovernanceMetadata;
  materialityCompatibility?: SyntheticAuditMaterialityCompatibility;
  personaCompatibility?: SyntheticAuditPersonaCompatibility;
  packageCompatibility?: SyntheticAuditPackageCompatibility;
  memoryCompatibility?: SyntheticAuditMemoryCompatibility;
  learningCompatibility?: SyntheticAuditLearningCompatibility;
  surfaceCompatibility: SyntheticAuditSurfaceCompatibility;
  briefingCompatibility: SyntheticAuditSurfaceCompatibility;
  auditSurface: SyntheticAuditSurface;
  warnings: string[];
}

export interface BuildAuditBriefingResult {
  auditBriefing: SyntheticAuditBriefing | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function hasBriefingTarget(surfaceCompatibility: SyntheticAuditSurfaceCompatibility | undefined): boolean {
  return surfaceCompatibility?.surfaceTargets.includes("briefing") === true;
}

function buildAuditBriefingId(auditSurface: SyntheticAuditSurface): string {
  return `synthetic-audit-briefing:${stableSnapshotHash({
    auditSurfaceId: auditSurface.auditSurfaceId,
    auditConfidenceId: auditSurface.auditConfidenceId,
    auditFindingArtifactId: auditSurface.auditFindingArtifactId,
    auditFindingId: auditSurface.auditFindingId,
    auditEvidencePackageId: auditSurface.auditEvidencePackageId,
    auditCandidateId: auditSurface.auditCandidateId,
    auditCandidateKey: auditSurface.auditCandidateKey,
    companyId: auditSurface.companyId,
    auditCategory: auditSurface.auditCategory ?? null,
    evidenceReferenceIds: auditSurface.evidenceReferenceIds,
    sourceReferenceIds: auditSurface.sourceReferenceIds,
    lineageReferenceIds: auditSurface.lineageReferenceIds,
    confidenceCategory: auditSurface.confidenceMetadata.confidenceCategory,
    confidenceEvidenceIds: auditSurface.confidenceMetadata.confidenceEvidenceIds,
    confidenceSourceReferenceIds: auditSurface.confidenceMetadata.confidenceSourceReferenceIds,
    surfaceTargets: auditSurface.surfaceCompatibility.surfaceTargets,
    briefingReferenceIds: auditSurface.surfaceCompatibility.briefingReferenceIds,
    surfaceEvidenceIds: auditSurface.surfaceCompatibility.surfaceEvidenceIds,
    trustEvidenceIds: auditSurface.trustMetadata?.trustEvidenceIds ?? [],
    governanceEvidenceIds: auditSurface.governanceMetadata?.governanceEvidenceIds ?? [],
    materialityEvidenceIds: auditSurface.materialityCompatibility?.materialityEvidenceIds ?? [],
    personaEvidenceIds: auditSurface.personaCompatibility?.personaEvidenceIds ?? [],
    packageEvidenceIds: auditSurface.packageCompatibility?.packageEvidenceIds ?? [],
    memoryReferenceIds: auditSurface.memoryCompatibility?.memoryReferenceIds ?? [],
    learningReferenceIds: auditSurface.learningCompatibility?.learningReferenceIds ?? [],
    isolationBoundaryIds: auditSurface.scope.isolationBoundaryIds,
  })}`;
}

function validateAuditSurface(auditSurface: SyntheticAuditSurface | null): string[] {
  const warnings: string[] = [];

  if (!auditSurface) {
    warnings.push("auditSurface is required.");
    return warnings;
  }

  if (!hasValue(auditSurface.auditSurfaceId)) warnings.push("auditSurfaceId is required.");
  if (!hasValue(auditSurface.auditConfidenceId)) warnings.push("auditConfidenceId is required.");
  if (!hasValue(auditSurface.auditFindingArtifactId)) warnings.push("auditFindingArtifactId is required.");
  if (!hasValue(auditSurface.auditFindingId)) warnings.push("auditFindingId is required.");
  if (!hasValue(auditSurface.auditEvidencePackageId)) warnings.push("auditEvidencePackageId is required.");
  if (!hasValue(auditSurface.auditCandidateId)) warnings.push("auditCandidateId is required.");
  if (!hasValue(auditSurface.auditCandidateKey)) warnings.push("auditCandidateKey is required.");
  if (!hasValue(auditSurface.companyId)) warnings.push("companyId is required.");
  if (!auditSurface.confidenceMetadata) {
    warnings.push("confidenceMetadata is required.");
  } else if (!hasValue(auditSurface.confidenceMetadata.confidenceCategory)) {
    warnings.push("confidenceMetadata.confidenceCategory is required.");
  }
  if (!auditSurface.surfaceCompatibility) {
    warnings.push("surfaceCompatibility is required.");
  } else {
    if (!hasArrayValue(auditSurface.surfaceCompatibility.surfaceTargets)) {
      warnings.push("surfaceCompatibility.surfaceTargets must include at least one value.");
    }
    if (!hasBriefingTarget(auditSurface.surfaceCompatibility)) {
      warnings.push('surfaceCompatibility.surfaceTargets must include "briefing".');
    }
  }
  if (!auditSurface.scope) {
    warnings.push("scope is required.");
    return warnings;
  }
  if (!hasValue(auditSurface.scope.companyId)) warnings.push("scope.companyId is required.");
  if (auditSurface.scope.companyId !== auditSurface.companyId) {
    warnings.push("scope.companyId must match companyId.");
  }
  if (!hasArrayValue(auditSurface.scope.isolationBoundaryIds)) {
    warnings.push("scope.isolationBoundaryIds must include at least one value.");
  }
  if (!hasArrayValue(auditSurface.evidenceReferenceIds)) {
    warnings.push("evidenceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditSurface.sourceReferenceIds)) {
    warnings.push("sourceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditSurface.lineageReferenceIds)) {
    warnings.push("lineageReferenceIds must include at least one value.");
  }

  return warnings;
}

export function buildAuditBriefing(input: BuildAuditBriefingInput): BuildAuditBriefingResult {
  const warnings = validateAuditSurface(input.auditSurface);
  if (
    warnings.length > 0 ||
    !input.auditSurface ||
    !input.auditSurface.surfaceCompatibility ||
    !hasBriefingTarget(input.auditSurface.surfaceCompatibility)
  ) {
    return {
      auditBriefing: null,
      skipped: true,
      warnings,
    };
  }

  const auditSurface = input.auditSurface;
  const briefingCompatibility = auditSurface.surfaceCompatibility;

  return {
    auditBriefing: {
      auditBriefingId: buildAuditBriefingId(auditSurface),
      auditSurfaceId: auditSurface.auditSurfaceId,
      auditConfidenceId: auditSurface.auditConfidenceId,
      auditFindingArtifactId: auditSurface.auditFindingArtifactId,
      auditFindingId: auditSurface.auditFindingId,
      auditEvidencePackageId: auditSurface.auditEvidencePackageId,
      auditCandidateId: auditSurface.auditCandidateId,
      auditCandidateKey: auditSurface.auditCandidateKey,
      companyId: auditSurface.companyId,
      auditCategory: auditSurface.auditCategory,
      scope: auditSurface.scope,
      observationMetadata: auditSurface.observationMetadata,
      findingMetadata: auditSurface.findingMetadata,
      exceptionMetadata: auditSurface.exceptionMetadata,
      riskMetadata: auditSurface.riskMetadata,
      evidence: auditSurface.evidence,
      evidenceReferenceIds: auditSurface.evidenceReferenceIds,
      sourceReferenceIds: auditSurface.sourceReferenceIds,
      lineageReferenceIds: auditSurface.lineageReferenceIds,
      trustMetadata: auditSurface.trustMetadata,
      confidenceMetadata: auditSurface.confidenceMetadata,
      governanceMetadata: auditSurface.governanceMetadata,
      materialityCompatibility: auditSurface.materialityCompatibility,
      personaCompatibility: auditSurface.personaCompatibility,
      packageCompatibility: auditSurface.packageCompatibility,
      memoryCompatibility: auditSurface.memoryCompatibility,
      learningCompatibility: auditSurface.learningCompatibility,
      surfaceCompatibility: auditSurface.surfaceCompatibility,
      briefingCompatibility,
      auditSurface,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
