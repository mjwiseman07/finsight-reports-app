import { stableSnapshotHash } from "../../historical-snapshots";
import type {
  SyntheticCommandCenterAttentionMetadata,
  SyntheticCommandCenterCashReconciliationAgingCompatibility,
  SyntheticCommandCenterConfidenceMetadata,
  SyntheticCommandCenterDecisionQueueCompatibility,
  SyntheticCommandCenterDegradationMetadata,
  SyntheticCommandCenterDeepSurfaceCompatibility,
  SyntheticCommandCenterEvidence,
  SyntheticCommandCenterFirmCompatibility,
  SyntheticCommandCenterGovernanceMetadata,
  SyntheticCommandCenterLineage,
  SyntheticCommandCenterMemoryCompatibility,
  SyntheticCommandCenterMetadata,
  SyntheticCommandCenterOnboardingCompatibility,
  SyntheticCommandCenterPortfolioCompatibility,
  SyntheticCommandCenterPrimarySurfaceCompatibility,
  SyntheticCommandCenterPriority,
  SyntheticCommandCenterRecoveryMetadata,
  SyntheticCommandCenterRoleCompatibility,
  SyntheticCommandCenterRoleVisibilityDescriptor,
  SyntheticCommandCenterRoutingDescriptor,
  SyntheticCommandCenterScope,
  SyntheticCommandCenterSecondarySurfaceCompatibility,
  SyntheticCommandCenterSurface,
  SyntheticCommandCenterTrustMetadata,
  SyntheticCommandCenterValidationMetadata,
  SyntheticCommandCenterValidationStatusMetadata,
  SyntheticCommandCenterWatchlistCompatibility,
} from "../types";

export interface BuildCommandCenterCandidateInput {
  companyId: string;
  metadata: SyntheticCommandCenterMetadata;
  scope: SyntheticCommandCenterScope;
  priority: SyntheticCommandCenterPriority;
  surfaceCompatibility: SyntheticCommandCenterSurface;
  validationMetadata: SyntheticCommandCenterValidationMetadata;
  roleCompatibility?: SyntheticCommandCenterRoleCompatibility;
  evidence?: SyntheticCommandCenterEvidence;
  lineage?: SyntheticCommandCenterLineage;
  trustMetadata?: SyntheticCommandCenterTrustMetadata;
  confidenceMetadata?: SyntheticCommandCenterConfidenceMetadata;
  degradationMetadata?: SyntheticCommandCenterDegradationMetadata;
  recoveryMetadata?: SyntheticCommandCenterRecoveryMetadata;
  attentionMetadata?: SyntheticCommandCenterAttentionMetadata;
  routingDescriptors?: SyntheticCommandCenterRoutingDescriptor[];
  primarySurfaceCompatibility?: SyntheticCommandCenterPrimarySurfaceCompatibility;
  secondarySurfaceCompatibility?: SyntheticCommandCenterSecondarySurfaceCompatibility;
  deepSurfaceCompatibility?: SyntheticCommandCenterDeepSurfaceCompatibility;
  validationStatusMetadata?: SyntheticCommandCenterValidationStatusMetadata;
  decisionQueueCompatibility?: SyntheticCommandCenterDecisionQueueCompatibility;
  watchlistCompatibility?: SyntheticCommandCenterWatchlistCompatibility;
  roleVisibilityDescriptor?: SyntheticCommandCenterRoleVisibilityDescriptor;
  memoryCompatibility?: SyntheticCommandCenterMemoryCompatibility;
  onboardingCompatibility?: SyntheticCommandCenterOnboardingCompatibility;
  portfolioCompatibility?: SyntheticCommandCenterPortfolioCompatibility;
  firmCompatibility?: SyntheticCommandCenterFirmCompatibility;
  governanceMetadata?: SyntheticCommandCenterGovernanceMetadata;
  cashReconciliationAgingCompatibility?: SyntheticCommandCenterCashReconciliationAgingCompatibility;
}

export interface SyntheticStructuredCommandCenterCandidate {
  commandCenterCandidateId: string;
  companyId: string;
  metadata: SyntheticCommandCenterMetadata;
  scope: SyntheticCommandCenterScope;
  priority: SyntheticCommandCenterPriority;
  surfaceCompatibility: SyntheticCommandCenterSurface;
  validationMetadata: SyntheticCommandCenterValidationMetadata;
  roleCompatibility?: SyntheticCommandCenterRoleCompatibility;
  evidence?: SyntheticCommandCenterEvidence;
  lineage?: SyntheticCommandCenterLineage;
  trustMetadata?: SyntheticCommandCenterTrustMetadata;
  confidenceMetadata?: SyntheticCommandCenterConfidenceMetadata;
  degradationMetadata?: SyntheticCommandCenterDegradationMetadata;
  recoveryMetadata?: SyntheticCommandCenterRecoveryMetadata;
  attentionMetadata?: SyntheticCommandCenterAttentionMetadata;
  routingDescriptors: SyntheticCommandCenterRoutingDescriptor[];
  primarySurfaceCompatibility?: SyntheticCommandCenterPrimarySurfaceCompatibility;
  secondarySurfaceCompatibility?: SyntheticCommandCenterSecondarySurfaceCompatibility;
  deepSurfaceCompatibility?: SyntheticCommandCenterDeepSurfaceCompatibility;
  validationStatusMetadata?: SyntheticCommandCenterValidationStatusMetadata;
  decisionQueueCompatibility?: SyntheticCommandCenterDecisionQueueCompatibility;
  watchlistCompatibility?: SyntheticCommandCenterWatchlistCompatibility;
  roleVisibilityDescriptor?: SyntheticCommandCenterRoleVisibilityDescriptor;
  memoryCompatibility?: SyntheticCommandCenterMemoryCompatibility;
  onboardingCompatibility?: SyntheticCommandCenterOnboardingCompatibility;
  portfolioCompatibility?: SyntheticCommandCenterPortfolioCompatibility;
  firmCompatibility?: SyntheticCommandCenterFirmCompatibility;
  governanceMetadata?: SyntheticCommandCenterGovernanceMetadata;
  cashReconciliationAgingCompatibility?: SyntheticCommandCenterCashReconciliationAgingCompatibility;
  warnings: string[];
}

export interface BuildCommandCenterCandidateResult {
  candidate: SyntheticStructuredCommandCenterCandidate | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function buildCommandCenterCandidateId(input: BuildCommandCenterCandidateInput): string {
  return `command-center-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    metadataId: input.metadata?.commandCenterItemId ?? null,
    metadataCompanyId: input.metadata?.companyId ?? null,
    surfaceCategory: input.metadata?.surfaceCategory ?? null,
    intelligenceSourceCategory: input.metadata?.intelligenceSourceCategory ?? null,
    decisionSurfaceCategory: input.metadata?.decisionSurfaceCategory ?? null,
    scopeLevel: input.scope?.scopeLevel ?? null,
    firmId: input.scope?.firmId ?? null,
    clientId: input.scope?.clientId ?? null,
    entityId: input.scope?.entityId ?? null,
    userId: input.scope?.userId ?? null,
    roleCategory: input.scope?.roleCategory ?? null,
    priorityLevel: input.priority?.priorityLevel ?? null,
    attentionCategory: input.priority?.attentionCategory ?? null,
    primarySurfaceCategory: input.surfaceCompatibility?.primarySurfaceCategory ?? null,
    validationStatus: input.validationMetadata?.validationStatus ?? null,
    evidenceIds: input.evidence?.evidenceIds ?? [],
    sourceReferenceIds: input.evidence?.sourceReferenceIds ?? [],
    trustEvidenceIds: input.trustMetadata?.trustEvidenceIds ?? [],
    confidenceEvidenceIds: input.confidenceMetadata?.confidenceEvidenceIds ?? [],
    routingCategories: input.routingDescriptors?.map((descriptor) => descriptor.routingCategory) ?? [],
    memoryReferenceIds: input.memoryCompatibility?.memoryReferenceIds ?? [],
    onboardingReferenceIds: input.onboardingCompatibility?.onboardingReferenceIds ?? [],
    portfolioReferenceIds: input.portfolioCompatibility?.portfolioReferenceIds ?? [],
    governanceBoundaryIds: input.governanceMetadata?.governanceBoundaryIds ?? [],
    cashReconciliationEvidenceIds:
      input.cashReconciliationAgingCompatibility?.cashReconciliationEvidenceIds ?? [],
  })}`;
}

function validateInput(input: BuildCommandCenterCandidateInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.metadata) warnings.push("metadata is required.");
  if (!input.scope) warnings.push("scope is required.");
  if (!input.priority) warnings.push("priority is required.");
  if (!input.surfaceCompatibility) warnings.push("surfaceCompatibility is required.");
  if (!input.validationMetadata) warnings.push("validationMetadata is required.");

  if (!input.metadata || !input.scope || !input.priority || !input.surfaceCompatibility || !input.validationMetadata) {
    return warnings;
  }

  if (!hasValue(input.metadata.commandCenterItemId)) {
    warnings.push("metadata.commandCenterItemId is required.");
  }
  if (!hasValue(input.metadata.companyId)) warnings.push("metadata.companyId is required.");
  if (input.metadata.companyId !== input.companyId) {
    warnings.push("metadata.companyId must match input companyId.");
  }
  if (!hasValue(input.scope.companyId)) warnings.push("scope.companyId is required.");
  if (input.scope.companyId !== input.companyId) {
    warnings.push("scope.companyId must match input companyId.");
  }
  if (!hasValue(input.scope.scopeLevel)) warnings.push("scope.scopeLevel is required.");
  if (!hasValue(input.priority.priorityLevel)) warnings.push("priority.priorityLevel is required.");
  if (!hasValue(input.priority.attentionCategory)) warnings.push("priority.attentionCategory is required.");
  if (!hasValue(input.surfaceCompatibility.primarySurfaceCategory)) {
    warnings.push("surfaceCompatibility.primarySurfaceCategory is required.");
  }
  if (!hasArrayValue(input.surfaceCompatibility.decisionSurfaceCategories)) {
    warnings.push("surfaceCompatibility.decisionSurfaceCategories must include at least one value.");
  }
  if (!hasValue(input.validationMetadata.validationStatus)) {
    warnings.push("validationMetadata.validationStatus is required.");
  }

  return warnings;
}

export function buildCommandCenterCandidate(
  input: BuildCommandCenterCandidateInput,
): BuildCommandCenterCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const candidate: SyntheticStructuredCommandCenterCandidate = {
    commandCenterCandidateId: buildCommandCenterCandidateId(input),
    companyId: input.companyId,
    metadata: input.metadata,
    scope: input.scope,
    priority: input.priority,
    surfaceCompatibility: input.surfaceCompatibility,
    validationMetadata: input.validationMetadata,
    roleCompatibility: input.roleCompatibility,
    evidence: input.evidence,
    lineage: input.lineage,
    trustMetadata: input.trustMetadata,
    confidenceMetadata: input.confidenceMetadata,
    degradationMetadata: input.degradationMetadata,
    recoveryMetadata: input.recoveryMetadata,
    attentionMetadata: input.attentionMetadata,
    routingDescriptors: input.routingDescriptors ?? [],
    primarySurfaceCompatibility: input.primarySurfaceCompatibility,
    secondarySurfaceCompatibility: input.secondarySurfaceCompatibility,
    deepSurfaceCompatibility: input.deepSurfaceCompatibility,
    validationStatusMetadata: input.validationStatusMetadata,
    decisionQueueCompatibility: input.decisionQueueCompatibility,
    watchlistCompatibility: input.watchlistCompatibility,
    roleVisibilityDescriptor: input.roleVisibilityDescriptor,
    memoryCompatibility: input.memoryCompatibility,
    onboardingCompatibility: input.onboardingCompatibility,
    portfolioCompatibility: input.portfolioCompatibility,
    firmCompatibility: input.firmCompatibility,
    governanceMetadata: input.governanceMetadata,
    cashReconciliationAgingCompatibility: input.cashReconciliationAgingCompatibility,
    warnings: [],
  };

  return {
    candidate,
    skipped: false,
    warnings: [],
  };
}
