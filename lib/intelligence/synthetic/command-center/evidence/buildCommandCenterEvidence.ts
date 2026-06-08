import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticStructuredCommandCenterCandidate } from "../candidates";
import type {
  SyntheticCommandCenterAttentionMetadata,
  SyntheticCommandCenterCashReconciliationAgingCompatibility,
  SyntheticCommandCenterConfidenceMetadata,
  SyntheticCommandCenterDecisionQueueCompatibility,
  SyntheticCommandCenterDegradationMetadata,
  SyntheticCommandCenterEvidence,
  SyntheticCommandCenterFirmCompatibility,
  SyntheticCommandCenterGovernanceMetadata,
  SyntheticCommandCenterLineage,
  SyntheticCommandCenterMemoryCompatibility,
  SyntheticCommandCenterOnboardingCompatibility,
  SyntheticCommandCenterPortfolioCompatibility,
  SyntheticCommandCenterRecoveryMetadata,
  SyntheticCommandCenterRoleVisibilityDescriptor,
  SyntheticCommandCenterRoutingDescriptor,
  SyntheticCommandCenterTrustMetadata,
  SyntheticCommandCenterValidationMetadata,
  SyntheticCommandCenterValidationStatusMetadata,
  SyntheticCommandCenterWatchlistCompatibility,
} from "../types";

export interface SyntheticCommandCenterEvidencePackage {
  evidencePackageId: string;
  commandCenterCandidateId: string;
  companyId: string;
  commandCenterItemId: string;
  evidence: SyntheticCommandCenterEvidence;
  lineage: SyntheticCommandCenterLineage;
  trustMetadata?: SyntheticCommandCenterTrustMetadata;
  confidenceMetadata?: SyntheticCommandCenterConfidenceMetadata;
  degradationMetadata?: SyntheticCommandCenterDegradationMetadata;
  recoveryMetadata?: SyntheticCommandCenterRecoveryMetadata;
  attentionMetadata?: SyntheticCommandCenterAttentionMetadata;
  routingDescriptors: SyntheticCommandCenterRoutingDescriptor[];
  validationMetadata: SyntheticCommandCenterValidationMetadata;
  validationStatusMetadata?: SyntheticCommandCenterValidationStatusMetadata;
  governanceMetadata?: SyntheticCommandCenterGovernanceMetadata;
  memoryCompatibility?: SyntheticCommandCenterMemoryCompatibility;
  onboardingCompatibility?: SyntheticCommandCenterOnboardingCompatibility;
  portfolioCompatibility?: SyntheticCommandCenterPortfolioCompatibility;
  firmCompatibility?: SyntheticCommandCenterFirmCompatibility;
  roleVisibilityDescriptor?: SyntheticCommandCenterRoleVisibilityDescriptor;
  watchlistCompatibility?: SyntheticCommandCenterWatchlistCompatibility;
  decisionQueueCompatibility?: SyntheticCommandCenterDecisionQueueCompatibility;
  cashReconciliationAgingCompatibility?: SyntheticCommandCenterCashReconciliationAgingCompatibility;
  supportingMemoryIds: string[];
  supportingCommentaryIds: string[];
  supportingForecastIds: string[];
  supportingScenarioIds: string[];
  supportingRecommendationIds: string[];
  supportingOutcomeIds: string[];
  supportingRiskIds: string[];
  supportingSourceReferenceIds: string[];
  supportingControllerIds: string[];
  supportingCloseIds: string[];
  supportingPortfolioIds: string[];
  supportingFirmIds: string[];
  warnings: string[];
}

export interface BuildCommandCenterEvidenceInput {
  candidate: SyntheticStructuredCommandCenterCandidate | null;
}

export interface BuildCommandCenterEvidenceResult {
  evidencePackage: SyntheticCommandCenterEvidencePackage | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function buildEvidencePackageId(candidate: SyntheticStructuredCommandCenterCandidate): string {
  return `command-center-evidence:${stableSnapshotHash({
    commandCenterCandidateId: candidate.commandCenterCandidateId,
    companyId: candidate.companyId,
    commandCenterItemId: candidate.metadata.commandCenterItemId,
    evidenceIds: candidate.evidence?.evidenceIds ?? [],
    lineageEvidenceIds: candidate.lineage?.evidenceIds ?? [],
    sourceReferenceIds: candidate.evidence?.sourceReferenceIds ?? [],
    lineageSourceReferenceIds: candidate.lineage?.sourceReferenceIds ?? [],
    trustEvidenceIds: candidate.trustMetadata?.trustEvidenceIds ?? [],
    confidenceEvidenceIds: candidate.confidenceMetadata?.confidenceEvidenceIds ?? [],
    degradationEvidenceIds: candidate.degradationMetadata?.degradationEvidenceIds ?? [],
    recoveryEvidenceIds: candidate.recoveryMetadata?.recoveryEvidenceIds ?? [],
    routingEvidenceIds: candidate.routingDescriptors.flatMap((descriptor) => descriptor.routingEvidenceIds),
    governanceBoundaryIds: candidate.governanceMetadata?.governanceBoundaryIds ?? [],
    memoryReferenceIds: candidate.memoryCompatibility?.memoryReferenceIds ?? [],
    onboardingReferenceIds: candidate.onboardingCompatibility?.onboardingReferenceIds ?? [],
    portfolioReferenceIds: candidate.portfolioCompatibility?.portfolioReferenceIds ?? [],
    cashReconciliationEvidenceIds:
      candidate.cashReconciliationAgingCompatibility?.cashReconciliationEvidenceIds ?? [],
  })}`;
}

function validateCandidate(candidate: SyntheticStructuredCommandCenterCandidate | null): string[] {
  const warnings: string[] = [];

  if (!candidate) {
    warnings.push("candidate is required.");
    return warnings;
  }

  if (!hasValue(candidate.commandCenterCandidateId)) {
    warnings.push("candidate.commandCenterCandidateId is required.");
  }
  if (!hasValue(candidate.companyId)) warnings.push("candidate.companyId is required.");
  if (!candidate.metadata) warnings.push("candidate.metadata is required.");
  if (!candidate.scope) warnings.push("candidate.scope is required.");
  if (!candidate.evidence) warnings.push("candidate.evidence is required.");
  if (!candidate.lineage) warnings.push("candidate.lineage is required.");
  if (!candidate.validationMetadata) warnings.push("candidate.validationMetadata is required.");

  if (!candidate.metadata || !candidate.scope || !candidate.evidence || !candidate.lineage) {
    return warnings;
  }

  if (!hasValue(candidate.metadata.commandCenterItemId)) {
    warnings.push("candidate.metadata.commandCenterItemId is required.");
  }
  if (candidate.metadata.companyId !== candidate.companyId) {
    warnings.push("candidate.metadata.companyId must match candidate.companyId.");
  }
  if (candidate.scope.companyId !== candidate.companyId) {
    warnings.push("candidate.scope.companyId must match candidate.companyId.");
  }
  if (!hasValue(candidate.lineage.commandCenterItemId)) {
    warnings.push("candidate.lineage.commandCenterItemId is required.");
  }
  if (candidate.lineage.commandCenterItemId !== candidate.metadata.commandCenterItemId) {
    warnings.push("candidate.lineage.commandCenterItemId must match candidate metadata.");
  }
  if (candidate.evidence.evidenceIds.length === 0 && candidate.lineage.evidenceIds.length === 0) {
    warnings.push("candidate evidence metadata must include at least one evidence reference.");
  }

  return warnings;
}

export function buildCommandCenterEvidence(
  input: BuildCommandCenterEvidenceInput,
): BuildCommandCenterEvidenceResult {
  const warnings = validateCandidate(input.candidate);
  if (warnings.length > 0 || !input.candidate || !input.candidate.evidence || !input.candidate.lineage) {
    return {
      evidencePackage: null,
      skipped: true,
      warnings,
    };
  }

  const candidate = input.candidate;
  const evidence = candidate.evidence!;
  const lineage = candidate.lineage!;

  return {
    evidencePackage: {
      evidencePackageId: buildEvidencePackageId(candidate),
      commandCenterCandidateId: candidate.commandCenterCandidateId,
      companyId: candidate.companyId,
      commandCenterItemId: candidate.metadata.commandCenterItemId,
      evidence,
      lineage,
      trustMetadata: candidate.trustMetadata,
      confidenceMetadata: candidate.confidenceMetadata,
      degradationMetadata: candidate.degradationMetadata,
      recoveryMetadata: candidate.recoveryMetadata,
      attentionMetadata: candidate.attentionMetadata,
      routingDescriptors: candidate.routingDescriptors,
      validationMetadata: candidate.validationMetadata,
      validationStatusMetadata: candidate.validationStatusMetadata,
      governanceMetadata: candidate.governanceMetadata,
      memoryCompatibility: candidate.memoryCompatibility,
      onboardingCompatibility: candidate.onboardingCompatibility,
      portfolioCompatibility: candidate.portfolioCompatibility,
      firmCompatibility: candidate.firmCompatibility,
      roleVisibilityDescriptor: candidate.roleVisibilityDescriptor,
      watchlistCompatibility: candidate.watchlistCompatibility,
      decisionQueueCompatibility: candidate.decisionQueueCompatibility,
      cashReconciliationAgingCompatibility: candidate.cashReconciliationAgingCompatibility,
      supportingMemoryIds: evidence.supportingMemoryIds,
      supportingCommentaryIds: evidence.supportingCommentaryIds,
      supportingForecastIds: evidence.supportingForecastIds,
      supportingScenarioIds: evidence.supportingScenarioIds,
      supportingRecommendationIds: evidence.supportingRecommendationIds,
      supportingOutcomeIds: [],
      supportingRiskIds: [],
      supportingSourceReferenceIds: evidence.sourceReferenceIds,
      supportingControllerIds: [],
      supportingCloseIds: [],
      supportingPortfolioIds: candidate.portfolioCompatibility?.portfolioReferenceIds ?? [],
      supportingFirmIds: candidate.firmCompatibility?.firmId ? [candidate.firmCompatibility.firmId] : [],
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
