import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditConfidence } from "../confidence";
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

export interface BuildAuditSurfaceInput {
  auditConfidence: SyntheticAuditConfidence | null;
}

export interface SyntheticAuditSurface {
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
  auditConfidence: SyntheticAuditConfidence;
  warnings: string[];
}

export interface BuildAuditSurfaceResult {
  auditSurface: SyntheticAuditSurface | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function buildAuditSurfaceId(auditConfidence: SyntheticAuditConfidence): string {
  return `synthetic-audit-surface:${stableSnapshotHash({
    auditConfidenceId: auditConfidence.auditConfidenceId,
    auditFindingArtifactId: auditConfidence.auditFindingArtifactId,
    auditFindingId: auditConfidence.auditFindingId,
    auditEvidencePackageId: auditConfidence.auditEvidencePackageId,
    auditCandidateId: auditConfidence.auditCandidateId,
    auditCandidateKey: auditConfidence.auditCandidateKey,
    companyId: auditConfidence.companyId,
    auditCategory: auditConfidence.auditCategory ?? null,
    evidenceReferenceIds: auditConfidence.evidenceReferenceIds,
    sourceReferenceIds: auditConfidence.sourceReferenceIds,
    lineageReferenceIds: auditConfidence.lineageReferenceIds,
    confidenceCategory: auditConfidence.confidenceMetadata.confidenceCategory,
    confidenceEvidenceIds: auditConfidence.confidenceMetadata.confidenceEvidenceIds,
    confidenceSourceReferenceIds: auditConfidence.confidenceMetadata.confidenceSourceReferenceIds,
    surfaceTargets: auditConfidence.surfaceCompatibility?.surfaceTargets ?? [],
    commandCenterReferenceIds: auditConfidence.surfaceCompatibility?.commandCenterReferenceIds ?? [],
    executiveSummaryReferenceIds: auditConfidence.surfaceCompatibility?.executiveSummaryReferenceIds ?? [],
    decisionQueueReferenceIds: auditConfidence.surfaceCompatibility?.decisionQueueReferenceIds ?? [],
    watchlistReferenceIds: auditConfidence.surfaceCompatibility?.watchlistReferenceIds ?? [],
    briefingReferenceIds: auditConfidence.surfaceCompatibility?.briefingReferenceIds ?? [],
    pulseReferenceIds: auditConfidence.surfaceCompatibility?.pulseReferenceIds ?? [],
    surfaceEvidenceIds: auditConfidence.surfaceCompatibility?.surfaceEvidenceIds ?? [],
    trustEvidenceIds: auditConfidence.trustMetadata?.trustEvidenceIds ?? [],
    governanceEvidenceIds: auditConfidence.governanceMetadata?.governanceEvidenceIds ?? [],
    materialityEvidenceIds: auditConfidence.materialityCompatibility?.materialityEvidenceIds ?? [],
    personaEvidenceIds: auditConfidence.personaCompatibility?.personaEvidenceIds ?? [],
    packageEvidenceIds: auditConfidence.packageCompatibility?.packageEvidenceIds ?? [],
    memoryReferenceIds: auditConfidence.memoryCompatibility?.memoryReferenceIds ?? [],
    learningReferenceIds: auditConfidence.learningCompatibility?.learningReferenceIds ?? [],
    isolationBoundaryIds: auditConfidence.scope.isolationBoundaryIds,
  })}`;
}

function validateAuditConfidence(auditConfidence: SyntheticAuditConfidence | null): string[] {
  const warnings: string[] = [];

  if (!auditConfidence) {
    warnings.push("auditConfidence is required.");
    return warnings;
  }

  if (!hasValue(auditConfidence.auditConfidenceId)) warnings.push("auditConfidenceId is required.");
  if (!hasValue(auditConfidence.auditFindingArtifactId)) warnings.push("auditFindingArtifactId is required.");
  if (!hasValue(auditConfidence.auditFindingId)) warnings.push("auditFindingId is required.");
  if (!hasValue(auditConfidence.auditEvidencePackageId)) warnings.push("auditEvidencePackageId is required.");
  if (!hasValue(auditConfidence.auditCandidateId)) warnings.push("auditCandidateId is required.");
  if (!hasValue(auditConfidence.auditCandidateKey)) warnings.push("auditCandidateKey is required.");
  if (!hasValue(auditConfidence.companyId)) warnings.push("companyId is required.");
  if (!auditConfidence.confidenceMetadata) {
    warnings.push("confidenceMetadata is required.");
  } else if (!hasValue(auditConfidence.confidenceMetadata.confidenceCategory)) {
    warnings.push("confidenceMetadata.confidenceCategory is required.");
  }
  if (!auditConfidence.surfaceCompatibility) {
    warnings.push("surfaceCompatibility is required.");
  } else if (!hasArrayValue(auditConfidence.surfaceCompatibility.surfaceTargets)) {
    warnings.push("surfaceCompatibility.surfaceTargets must include at least one value.");
  }
  if (!auditConfidence.scope) {
    warnings.push("scope is required.");
    return warnings;
  }
  if (!hasValue(auditConfidence.scope.companyId)) warnings.push("scope.companyId is required.");
  if (auditConfidence.scope.companyId !== auditConfidence.companyId) {
    warnings.push("scope.companyId must match companyId.");
  }
  if (!hasArrayValue(auditConfidence.scope.isolationBoundaryIds)) {
    warnings.push("scope.isolationBoundaryIds must include at least one value.");
  }
  if (!hasArrayValue(auditConfidence.evidenceReferenceIds)) {
    warnings.push("evidenceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditConfidence.sourceReferenceIds)) {
    warnings.push("sourceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditConfidence.lineageReferenceIds)) {
    warnings.push("lineageReferenceIds must include at least one value.");
  }

  return warnings;
}

export function buildAuditSurface(input: BuildAuditSurfaceInput): BuildAuditSurfaceResult {
  const warnings = validateAuditConfidence(input.auditConfidence);
  if (warnings.length > 0 || !input.auditConfidence || !input.auditConfidence.surfaceCompatibility) {
    return {
      auditSurface: null,
      skipped: true,
      warnings,
    };
  }

  const auditConfidence = input.auditConfidence;
  const surfaceCompatibility = auditConfidence.surfaceCompatibility;
  if (!surfaceCompatibility) {
    return {
      auditSurface: null,
      skipped: true,
      warnings: ["surfaceCompatibility is required."],
    };
  }

  return {
    auditSurface: {
      auditSurfaceId: buildAuditSurfaceId(auditConfidence),
      auditConfidenceId: auditConfidence.auditConfidenceId,
      auditFindingArtifactId: auditConfidence.auditFindingArtifactId,
      auditFindingId: auditConfidence.auditFindingId,
      auditEvidencePackageId: auditConfidence.auditEvidencePackageId,
      auditCandidateId: auditConfidence.auditCandidateId,
      auditCandidateKey: auditConfidence.auditCandidateKey,
      companyId: auditConfidence.companyId,
      auditCategory: auditConfidence.auditCategory,
      scope: auditConfidence.scope,
      observationMetadata: auditConfidence.observationMetadata,
      findingMetadata: auditConfidence.findingMetadata,
      exceptionMetadata: auditConfidence.exceptionMetadata,
      riskMetadata: auditConfidence.riskMetadata,
      evidence: auditConfidence.evidence,
      evidenceReferenceIds: auditConfidence.evidenceReferenceIds,
      sourceReferenceIds: auditConfidence.sourceReferenceIds,
      lineageReferenceIds: auditConfidence.lineageReferenceIds,
      trustMetadata: auditConfidence.trustMetadata,
      confidenceMetadata: auditConfidence.confidenceMetadata,
      governanceMetadata: auditConfidence.governanceMetadata,
      materialityCompatibility: auditConfidence.materialityCompatibility,
      personaCompatibility: auditConfidence.personaCompatibility,
      packageCompatibility: auditConfidence.packageCompatibility,
      memoryCompatibility: auditConfidence.memoryCompatibility,
      learningCompatibility: auditConfidence.learningCompatibility,
      surfaceCompatibility,
      auditConfidence,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
