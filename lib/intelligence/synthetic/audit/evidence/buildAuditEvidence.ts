import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditCandidate } from "../candidates";
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

export interface BuildAuditEvidenceInput {
  auditCandidate: SyntheticAuditCandidate | null;
}

export interface SyntheticAuditEvidencePackage {
  auditEvidencePackageId: string;
  auditCandidateId: string;
  auditCandidateKey: string;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  observationMetadata?: SyntheticAuditObservationMetadata;
  findingMetadata?: SyntheticAuditFindingMetadata;
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
  auditCandidate: SyntheticAuditCandidate;
  warnings: string[];
}

export interface BuildAuditEvidenceResult {
  auditEvidencePackage: SyntheticAuditEvidencePackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function buildAuditEvidencePackageId(auditCandidate: SyntheticAuditCandidate): string {
  return `synthetic-audit-evidence:${stableSnapshotHash({
    auditCandidateId: auditCandidate.auditCandidateId,
    auditCandidateKey: auditCandidate.auditCandidateKey,
    companyId: auditCandidate.companyId,
    auditCategory: auditCandidate.auditCategory ?? null,
    auditObservationId: auditCandidate.observationMetadata?.auditObservationId ?? null,
    auditFindingId: auditCandidate.findingMetadata?.auditFindingId ?? null,
    auditExceptionId: auditCandidate.exceptionMetadata?.auditExceptionId ?? null,
    auditRiskId: auditCandidate.riskMetadata?.auditRiskId ?? null,
    evidenceIds: auditCandidate.evidence.evidenceIds,
    sourceReferenceIds: auditCandidate.evidence.sourceReferenceIds,
    lineageReferenceIds: auditCandidate.evidence.lineageReferenceIds,
    trustEvidenceIds: auditCandidate.trustMetadata?.trustEvidenceIds ?? [],
    confidenceEvidenceIds: auditCandidate.confidenceMetadata?.confidenceEvidenceIds ?? [],
    governanceEvidenceIds: auditCandidate.governanceMetadata?.governanceEvidenceIds ?? [],
    materialityEvidenceIds: auditCandidate.materialityCompatibility?.materialityEvidenceIds ?? [],
    personaEvidenceIds: auditCandidate.personaCompatibility?.personaEvidenceIds ?? [],
    packageEvidenceIds: auditCandidate.packageCompatibility?.packageEvidenceIds ?? [],
    memoryReferenceIds: auditCandidate.memoryCompatibility?.memoryReferenceIds ?? [],
    learningReferenceIds: auditCandidate.learningCompatibility?.learningReferenceIds ?? [],
    surfaceTargets: auditCandidate.surfaceCompatibility?.surfaceTargets ?? [],
    isolationBoundaryIds: auditCandidate.scope.isolationBoundaryIds,
  })}`;
}

function validateAuditCandidate(auditCandidate: SyntheticAuditCandidate | null): string[] {
  const warnings: string[] = [];

  if (!auditCandidate) {
    warnings.push("auditCandidate is required.");
    return warnings;
  }

  if (!hasValue(auditCandidate.auditCandidateId)) warnings.push("auditCandidateId is required.");
  if (!hasValue(auditCandidate.auditCandidateKey)) warnings.push("auditCandidateKey is required.");
  if (!hasValue(auditCandidate.companyId)) warnings.push("companyId is required.");
  if (!auditCandidate.scope) {
    warnings.push("scope is required.");
    return warnings;
  }
  if (!hasValue(auditCandidate.scope.companyId)) warnings.push("scope.companyId is required.");
  if (auditCandidate.scope.companyId !== auditCandidate.companyId) {
    warnings.push("scope.companyId must match companyId.");
  }
  if (!hasArrayValue(auditCandidate.scope.isolationBoundaryIds)) {
    warnings.push("scope.isolationBoundaryIds must include at least one value.");
  }
  if (!auditCandidate.evidence) {
    warnings.push("evidence is required.");
    return warnings;
  }
  if (!hasArrayValue(auditCandidate.evidence.evidenceIds)) {
    warnings.push("evidence.evidenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditCandidate.evidence.sourceReferenceIds)) {
    warnings.push("evidence.sourceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditCandidate.evidence.lineageReferenceIds)) {
    warnings.push("evidence.lineageReferenceIds must include at least one value.");
  }

  return warnings;
}

export function buildAuditEvidence(input: BuildAuditEvidenceInput): BuildAuditEvidenceResult {
  const warnings = validateAuditCandidate(input.auditCandidate);
  if (warnings.length > 0 || !input.auditCandidate) {
    return {
      auditEvidencePackage: null,
      skipped: true,
      warnings,
    };
  }

  const auditCandidate = input.auditCandidate;

  return {
    auditEvidencePackage: {
      auditEvidencePackageId: buildAuditEvidencePackageId(auditCandidate),
      auditCandidateId: auditCandidate.auditCandidateId,
      auditCandidateKey: auditCandidate.auditCandidateKey,
      companyId: auditCandidate.companyId,
      auditCategory: auditCandidate.auditCategory,
      scope: auditCandidate.scope,
      observationMetadata: auditCandidate.observationMetadata,
      findingMetadata: auditCandidate.findingMetadata,
      exceptionMetadata: auditCandidate.exceptionMetadata,
      riskMetadata: auditCandidate.riskMetadata,
      evidence: auditCandidate.evidence,
      evidenceReferenceIds: auditCandidate.evidence.evidenceIds,
      sourceReferenceIds: auditCandidate.evidence.sourceReferenceIds,
      lineageReferenceIds: auditCandidate.evidence.lineageReferenceIds,
      trustMetadata: auditCandidate.trustMetadata,
      confidenceMetadata: auditCandidate.confidenceMetadata,
      governanceMetadata: auditCandidate.governanceMetadata,
      materialityCompatibility: auditCandidate.materialityCompatibility,
      personaCompatibility: auditCandidate.personaCompatibility,
      packageCompatibility: auditCandidate.packageCompatibility,
      memoryCompatibility: auditCandidate.memoryCompatibility,
      learningCompatibility: auditCandidate.learningCompatibility,
      surfaceCompatibility: auditCandidate.surfaceCompatibility,
      auditCandidate,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
