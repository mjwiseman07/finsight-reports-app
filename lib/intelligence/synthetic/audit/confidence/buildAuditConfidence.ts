import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditFinding } from "../findings";
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

export interface BuildAuditConfidenceInput {
  auditFinding: SyntheticAuditFinding | null;
}

export interface SyntheticAuditConfidence {
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
  surfaceCompatibility?: SyntheticAuditSurfaceCompatibility;
  auditFinding: SyntheticAuditFinding;
  warnings: string[];
}

export interface BuildAuditConfidenceResult {
  auditConfidence: SyntheticAuditConfidence | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function buildAuditConfidenceId(auditFinding: SyntheticAuditFinding): string {
  return `synthetic-audit-confidence:${stableSnapshotHash({
    auditFindingArtifactId: auditFinding.auditFindingArtifactId,
    auditFindingId: auditFinding.auditFindingId,
    auditEvidencePackageId: auditFinding.auditEvidencePackageId,
    auditCandidateId: auditFinding.auditCandidateId,
    auditCandidateKey: auditFinding.auditCandidateKey,
    companyId: auditFinding.companyId,
    auditCategory: auditFinding.auditCategory ?? null,
    evidenceReferenceIds: auditFinding.evidenceReferenceIds,
    sourceReferenceIds: auditFinding.sourceReferenceIds,
    lineageReferenceIds: auditFinding.lineageReferenceIds,
    confidenceCategory: auditFinding.confidenceMetadata?.confidenceCategory ?? null,
    confidenceEvidenceIds: auditFinding.confidenceMetadata?.confidenceEvidenceIds ?? [],
    confidenceSourceReferenceIds: auditFinding.confidenceMetadata?.confidenceSourceReferenceIds ?? [],
    trustEvidenceIds: auditFinding.trustMetadata?.trustEvidenceIds ?? [],
    governanceEvidenceIds: auditFinding.governanceMetadata?.governanceEvidenceIds ?? [],
    materialityEvidenceIds: auditFinding.materialityCompatibility?.materialityEvidenceIds ?? [],
    personaEvidenceIds: auditFinding.personaCompatibility?.personaEvidenceIds ?? [],
    packageEvidenceIds: auditFinding.packageCompatibility?.packageEvidenceIds ?? [],
    memoryReferenceIds: auditFinding.memoryCompatibility?.memoryReferenceIds ?? [],
    learningReferenceIds: auditFinding.learningCompatibility?.learningReferenceIds ?? [],
    surfaceTargets: auditFinding.surfaceCompatibility?.surfaceTargets ?? [],
    isolationBoundaryIds: auditFinding.scope.isolationBoundaryIds,
  })}`;
}

function validateAuditFinding(auditFinding: SyntheticAuditFinding | null): string[] {
  const warnings: string[] = [];

  if (!auditFinding) {
    warnings.push("auditFinding is required.");
    return warnings;
  }

  if (!hasValue(auditFinding.auditFindingArtifactId)) warnings.push("auditFindingArtifactId is required.");
  if (!hasValue(auditFinding.auditFindingId)) warnings.push("auditFindingId is required.");
  if (!hasValue(auditFinding.auditEvidencePackageId)) warnings.push("auditEvidencePackageId is required.");
  if (!hasValue(auditFinding.auditCandidateId)) warnings.push("auditCandidateId is required.");
  if (!hasValue(auditFinding.auditCandidateKey)) warnings.push("auditCandidateKey is required.");
  if (!hasValue(auditFinding.companyId)) warnings.push("companyId is required.");
  if (!auditFinding.confidenceMetadata) {
    warnings.push("confidenceMetadata is required.");
  } else if (!hasValue(auditFinding.confidenceMetadata.confidenceCategory)) {
    warnings.push("confidenceMetadata.confidenceCategory is required.");
  }
  if (!auditFinding.scope) {
    warnings.push("scope is required.");
    return warnings;
  }
  if (!hasValue(auditFinding.scope.companyId)) warnings.push("scope.companyId is required.");
  if (auditFinding.scope.companyId !== auditFinding.companyId) {
    warnings.push("scope.companyId must match companyId.");
  }
  if (!hasArrayValue(auditFinding.scope.isolationBoundaryIds)) {
    warnings.push("scope.isolationBoundaryIds must include at least one value.");
  }
  if (!hasArrayValue(auditFinding.evidenceReferenceIds)) {
    warnings.push("evidenceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditFinding.sourceReferenceIds)) {
    warnings.push("sourceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditFinding.lineageReferenceIds)) {
    warnings.push("lineageReferenceIds must include at least one value.");
  }

  return warnings;
}

export function buildAuditConfidence(input: BuildAuditConfidenceInput): BuildAuditConfidenceResult {
  const warnings = validateAuditFinding(input.auditFinding);
  if (warnings.length > 0 || !input.auditFinding || !input.auditFinding.confidenceMetadata) {
    return {
      auditConfidence: null,
      skipped: true,
      warnings,
    };
  }

  const auditFinding = input.auditFinding;
  const confidenceMetadata = auditFinding.confidenceMetadata;
  if (!confidenceMetadata) {
    return {
      auditConfidence: null,
      skipped: true,
      warnings: ["confidenceMetadata is required."],
    };
  }

  return {
    auditConfidence: {
      auditConfidenceId: buildAuditConfidenceId(auditFinding),
      auditFindingArtifactId: auditFinding.auditFindingArtifactId,
      auditFindingId: auditFinding.auditFindingId,
      auditEvidencePackageId: auditFinding.auditEvidencePackageId,
      auditCandidateId: auditFinding.auditCandidateId,
      auditCandidateKey: auditFinding.auditCandidateKey,
      companyId: auditFinding.companyId,
      auditCategory: auditFinding.auditCategory,
      scope: auditFinding.scope,
      observationMetadata: auditFinding.observationMetadata,
      findingMetadata: auditFinding.findingMetadata,
      exceptionMetadata: auditFinding.exceptionMetadata,
      riskMetadata: auditFinding.riskMetadata,
      evidence: auditFinding.evidence,
      evidenceReferenceIds: auditFinding.evidenceReferenceIds,
      sourceReferenceIds: auditFinding.sourceReferenceIds,
      lineageReferenceIds: auditFinding.lineageReferenceIds,
      trustMetadata: auditFinding.trustMetadata,
      confidenceMetadata,
      governanceMetadata: auditFinding.governanceMetadata,
      materialityCompatibility: auditFinding.materialityCompatibility,
      personaCompatibility: auditFinding.personaCompatibility,
      packageCompatibility: auditFinding.packageCompatibility,
      memoryCompatibility: auditFinding.memoryCompatibility,
      learningCompatibility: auditFinding.learningCompatibility,
      surfaceCompatibility: auditFinding.surfaceCompatibility,
      auditFinding,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
