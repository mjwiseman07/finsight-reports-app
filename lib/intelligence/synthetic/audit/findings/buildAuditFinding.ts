import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditEvidencePackage } from "../evidence";
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

export interface BuildAuditFindingInput {
  auditEvidencePackage: SyntheticAuditEvidencePackage | null;
}

export interface SyntheticAuditFinding {
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
  confidenceMetadata?: SyntheticAuditConfidenceMetadata;
  governanceMetadata?: SyntheticAuditGovernanceMetadata;
  materialityCompatibility?: SyntheticAuditMaterialityCompatibility;
  personaCompatibility?: SyntheticAuditPersonaCompatibility;
  packageCompatibility?: SyntheticAuditPackageCompatibility;
  memoryCompatibility?: SyntheticAuditMemoryCompatibility;
  learningCompatibility?: SyntheticAuditLearningCompatibility;
  surfaceCompatibility?: SyntheticAuditSurfaceCompatibility;
  auditEvidencePackage: SyntheticAuditEvidencePackage;
  warnings: string[];
}

export interface BuildAuditFindingResult {
  auditFinding: SyntheticAuditFinding | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function buildAuditFindingArtifactId(auditEvidencePackage: SyntheticAuditEvidencePackage): string {
  return `synthetic-audit-finding:${stableSnapshotHash({
    auditFindingId: auditEvidencePackage.findingMetadata?.auditFindingId ?? null,
    auditEvidencePackageId: auditEvidencePackage.auditEvidencePackageId,
    auditCandidateId: auditEvidencePackage.auditCandidateId,
    auditCandidateKey: auditEvidencePackage.auditCandidateKey,
    companyId: auditEvidencePackage.companyId,
    auditCategory: auditEvidencePackage.auditCategory ?? null,
    evidenceReferenceIds: auditEvidencePackage.evidenceReferenceIds,
    sourceReferenceIds: auditEvidencePackage.sourceReferenceIds,
    lineageReferenceIds: auditEvidencePackage.lineageReferenceIds,
    trustEvidenceIds: auditEvidencePackage.trustMetadata?.trustEvidenceIds ?? [],
    confidenceEvidenceIds: auditEvidencePackage.confidenceMetadata?.confidenceEvidenceIds ?? [],
    governanceEvidenceIds: auditEvidencePackage.governanceMetadata?.governanceEvidenceIds ?? [],
    materialityEvidenceIds: auditEvidencePackage.materialityCompatibility?.materialityEvidenceIds ?? [],
    personaEvidenceIds: auditEvidencePackage.personaCompatibility?.personaEvidenceIds ?? [],
    packageEvidenceIds: auditEvidencePackage.packageCompatibility?.packageEvidenceIds ?? [],
    memoryReferenceIds: auditEvidencePackage.memoryCompatibility?.memoryReferenceIds ?? [],
    learningReferenceIds: auditEvidencePackage.learningCompatibility?.learningReferenceIds ?? [],
    surfaceTargets: auditEvidencePackage.surfaceCompatibility?.surfaceTargets ?? [],
    isolationBoundaryIds: auditEvidencePackage.scope.isolationBoundaryIds,
  })}`;
}

function validateAuditEvidencePackage(auditEvidencePackage: SyntheticAuditEvidencePackage | null): string[] {
  const warnings: string[] = [];

  if (!auditEvidencePackage) {
    warnings.push("auditEvidencePackage is required.");
    return warnings;
  }

  if (!hasValue(auditEvidencePackage.auditEvidencePackageId)) warnings.push("auditEvidencePackageId is required.");
  if (!hasValue(auditEvidencePackage.auditCandidateId)) warnings.push("auditCandidateId is required.");
  if (!hasValue(auditEvidencePackage.auditCandidateKey)) warnings.push("auditCandidateKey is required.");
  if (!hasValue(auditEvidencePackage.companyId)) warnings.push("companyId is required.");
  if (!auditEvidencePackage.findingMetadata) {
    warnings.push("findingMetadata is required.");
  } else if (!hasValue(auditEvidencePackage.findingMetadata.auditFindingId)) {
    warnings.push("findingMetadata.auditFindingId is required.");
  }
  if (!auditEvidencePackage.scope) {
    warnings.push("scope is required.");
    return warnings;
  }
  if (!hasValue(auditEvidencePackage.scope.companyId)) warnings.push("scope.companyId is required.");
  if (auditEvidencePackage.scope.companyId !== auditEvidencePackage.companyId) {
    warnings.push("scope.companyId must match companyId.");
  }
  if (!hasArrayValue(auditEvidencePackage.scope.isolationBoundaryIds)) {
    warnings.push("scope.isolationBoundaryIds must include at least one value.");
  }
  if (!hasArrayValue(auditEvidencePackage.evidenceReferenceIds)) {
    warnings.push("evidenceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditEvidencePackage.sourceReferenceIds)) {
    warnings.push("sourceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditEvidencePackage.lineageReferenceIds)) {
    warnings.push("lineageReferenceIds must include at least one value.");
  }

  return warnings;
}

export function buildAuditFinding(input: BuildAuditFindingInput): BuildAuditFindingResult {
  const warnings = validateAuditEvidencePackage(input.auditEvidencePackage);
  if (warnings.length > 0 || !input.auditEvidencePackage || !input.auditEvidencePackage.findingMetadata) {
    return {
      auditFinding: null,
      skipped: true,
      warnings,
    };
  }

  const auditEvidencePackage = input.auditEvidencePackage;
  const findingMetadata = auditEvidencePackage.findingMetadata;
  if (!findingMetadata) {
    return {
      auditFinding: null,
      skipped: true,
      warnings: ["findingMetadata is required."],
    };
  }

  return {
    auditFinding: {
      auditFindingArtifactId: buildAuditFindingArtifactId(auditEvidencePackage),
      auditFindingId: findingMetadata.auditFindingId,
      auditEvidencePackageId: auditEvidencePackage.auditEvidencePackageId,
      auditCandidateId: auditEvidencePackage.auditCandidateId,
      auditCandidateKey: auditEvidencePackage.auditCandidateKey,
      companyId: auditEvidencePackage.companyId,
      auditCategory: auditEvidencePackage.auditCategory,
      scope: auditEvidencePackage.scope,
      observationMetadata: auditEvidencePackage.observationMetadata,
      findingMetadata,
      exceptionMetadata: auditEvidencePackage.exceptionMetadata,
      riskMetadata: auditEvidencePackage.riskMetadata,
      evidence: auditEvidencePackage.evidence,
      evidenceReferenceIds: auditEvidencePackage.evidenceReferenceIds,
      sourceReferenceIds: auditEvidencePackage.sourceReferenceIds,
      lineageReferenceIds: auditEvidencePackage.lineageReferenceIds,
      trustMetadata: auditEvidencePackage.trustMetadata,
      confidenceMetadata: auditEvidencePackage.confidenceMetadata,
      governanceMetadata: auditEvidencePackage.governanceMetadata,
      materialityCompatibility: auditEvidencePackage.materialityCompatibility,
      personaCompatibility: auditEvidencePackage.personaCompatibility,
      packageCompatibility: auditEvidencePackage.packageCompatibility,
      memoryCompatibility: auditEvidencePackage.memoryCompatibility,
      learningCompatibility: auditEvidencePackage.learningCompatibility,
      surfaceCompatibility: auditEvidencePackage.surfaceCompatibility,
      auditEvidencePackage,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
