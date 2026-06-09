import { stableSnapshotHash } from "../../historical-snapshots";
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

export interface BuildAuditCandidateInput {
  auditContract: SyntheticAuditContract | null;
  auditCandidateKey: string;
}

export interface SyntheticAuditCandidate {
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
  trustMetadata?: SyntheticAuditTrustMetadata;
  confidenceMetadata?: SyntheticAuditConfidenceMetadata;
  governanceMetadata?: SyntheticAuditGovernanceMetadata;
  materialityCompatibility?: SyntheticAuditMaterialityCompatibility;
  personaCompatibility?: SyntheticAuditPersonaCompatibility;
  packageCompatibility?: SyntheticAuditPackageCompatibility;
  memoryCompatibility?: SyntheticAuditMemoryCompatibility;
  learningCompatibility?: SyntheticAuditLearningCompatibility;
  surfaceCompatibility?: SyntheticAuditSurfaceCompatibility;
  auditContract: SyntheticAuditContract;
  warnings: string[];
}

export interface BuildAuditCandidateResult {
  auditCandidate: SyntheticAuditCandidate | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function getAuditCategory(auditContract: SyntheticAuditContract | null): SyntheticAuditCategory | undefined {
  return (
    auditContract?.observationMetadata?.auditCategory ??
    auditContract?.findingMetadata?.auditCategory ??
    auditContract?.exceptionMetadata?.auditCategory ??
    auditContract?.riskMetadata?.auditCategory
  );
}

function buildAuditCandidateId(input: BuildAuditCandidateInput): string {
  const auditContract = input.auditContract;

  return `synthetic-audit-candidate:${stableSnapshotHash({
    auditCandidateKey: input.auditCandidateKey,
    companyId: auditContract?.scope.companyId ?? null,
    auditCategory: getAuditCategory(auditContract) ?? null,
    auditObservationId: auditContract?.observationMetadata?.auditObservationId ?? null,
    auditFindingId: auditContract?.findingMetadata?.auditFindingId ?? null,
    auditExceptionId: auditContract?.exceptionMetadata?.auditExceptionId ?? null,
    auditRiskId: auditContract?.riskMetadata?.auditRiskId ?? null,
    evidenceIds: auditContract?.evidence.evidenceIds ?? [],
    sourceReferenceIds: auditContract?.evidence.sourceReferenceIds ?? [],
    lineageReferenceIds: auditContract?.evidence.lineageReferenceIds ?? [],
    isolationBoundaryIds: auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateCompanyAlignment(input: BuildAuditCandidateInput, warnings: string[]): void {
  const auditContract = input.auditContract;
  if (!auditContract) return;

  for (const [fieldName, companyId] of [
    ["observationMetadata.companyId", auditContract.observationMetadata?.companyId],
    ["findingMetadata.companyId", auditContract.findingMetadata?.companyId],
    ["exceptionMetadata.companyId", auditContract.exceptionMetadata?.companyId],
    ["riskMetadata.companyId", auditContract.riskMetadata?.companyId],
  ] as const) {
    if (companyId !== undefined && companyId !== auditContract.scope.companyId) {
      warnings.push(`${fieldName} must match scope.companyId.`);
    }
  }
}

function validateInput(input: BuildAuditCandidateInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.auditCandidateKey)) warnings.push("auditCandidateKey is required.");
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (!hasArrayValue(auditContract.scope.isolationBoundaryIds)) {
    warnings.push("scope.isolationBoundaryIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.evidenceIds)) {
    warnings.push("evidence.evidenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.sourceReferenceIds)) {
    warnings.push("evidence.sourceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.lineageReferenceIds)) {
    warnings.push("evidence.lineageReferenceIds must include at least one value.");
  }
  if (
    !auditContract.observationMetadata &&
    !auditContract.findingMetadata &&
    !auditContract.exceptionMetadata &&
    !auditContract.riskMetadata
  ) {
    warnings.push("at least one audit observation, finding, exception, or risk metadata object is required.");
  }

  validateCompanyAlignment(input, warnings);
  return warnings;
}

export function buildAuditCandidate(input: BuildAuditCandidateInput): BuildAuditCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.auditContract) {
    return {
      auditCandidate: null,
      skipped: true,
      warnings,
    };
  }

  const auditContract = input.auditContract;

  return {
    auditCandidate: {
      auditCandidateId: buildAuditCandidateId(input),
      auditCandidateKey: input.auditCandidateKey,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      observationMetadata: auditContract.observationMetadata,
      findingMetadata: auditContract.findingMetadata,
      exceptionMetadata: auditContract.exceptionMetadata,
      riskMetadata: auditContract.riskMetadata,
      evidence: auditContract.evidence,
      trustMetadata: auditContract.trustMetadata,
      confidenceMetadata: auditContract.confidenceMetadata,
      governanceMetadata: auditContract.governanceMetadata,
      materialityCompatibility: auditContract.materialityCompatibility,
      personaCompatibility: auditContract.personaCompatibility,
      packageCompatibility: auditContract.packageCompatibility,
      memoryCompatibility: auditContract.memoryCompatibility,
      learningCompatibility: auditContract.learningCompatibility,
      surfaceCompatibility: auditContract.surfaceCompatibility,
      auditContract,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
