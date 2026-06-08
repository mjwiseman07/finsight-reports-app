import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticStructuredCommandCenterSurfaceCandidate } from "../surface-candidates";
import type {
  SyntheticCommandCenterAttentionMetadata,
  SyntheticCommandCenterConfidenceMetadata,
  SyntheticCommandCenterDecisionQueueCompatibility,
  SyntheticCommandCenterDegradationMetadata,
  SyntheticCommandCenterGovernanceMetadata,
  SyntheticCommandCenterRecoveryMetadata,
  SyntheticCommandCenterRoleCategory,
  SyntheticCommandCenterRoleVisibilityDescriptor,
  SyntheticCommandCenterTrustMetadata,
} from "../types";

export type SyntheticCommandCenterDecisionCategory =
  | "cash_decision"
  | "workforce_decision"
  | "forecast_decision"
  | "scenario_decision"
  | "board_decision"
  | "close_decision"
  | "portfolio_decision";

export interface BuildCommandCenterDecisionQueueInput {
  companyId: string;
  decisionQueueKey: string;
  decisionCategory: SyntheticCommandCenterDecisionCategory;
  surfaceCandidates: SyntheticStructuredCommandCenterSurfaceCandidate[];
}

export interface SyntheticCommandCenterDecisionQueue {
  decisionQueueId: string;
  companyId: string;
  decisionQueueKey: string;
  decisionCategory: SyntheticCommandCenterDecisionCategory;
  surfaceCandidates: SyntheticStructuredCommandCenterSurfaceCandidate[];
  surfaceCandidateIds: string[];
  prioritizationPackageIds: string[];
  evidencePackageIds: string[];
  commandCenterCandidateIds: string[];
  evidenceReferenceIds: string[];
  trustMetadata: SyntheticCommandCenterTrustMetadata[];
  trustReferenceIds: string[];
  confidenceMetadata: SyntheticCommandCenterConfidenceMetadata[];
  confidenceReferenceIds: string[];
  degradationMetadata: SyntheticCommandCenterDegradationMetadata[];
  degradationReferenceIds: string[];
  recoveryMetadata: SyntheticCommandCenterRecoveryMetadata[];
  recoveryReferenceIds: string[];
  governanceMetadata: SyntheticCommandCenterGovernanceMetadata[];
  governanceReferenceIds: string[];
  memoryReferenceIds: string[];
  outcomeReferenceIds: string[];
  whyNowReferenceIds: string[];
  attentionMetadata: SyntheticCommandCenterAttentionMetadata[];
  attentionReferenceIds: string[];
  decisionQueueCompatibilityMetadata: SyntheticCommandCenterDecisionQueueCompatibility[];
  roleVisibilityDescriptors: SyntheticCommandCenterRoleVisibilityDescriptor[];
  roleVisibilityCategories: SyntheticCommandCenterRoleCategory[];
  roleVisibilityReferenceIds: string[];
  warnings: string[];
}

export interface BuildCommandCenterDecisionQueueResult {
  decisionQueue: SyntheticCommandCenterDecisionQueue | null;
  skipped: boolean;
  warnings: string[];
}

const DECISION_CATEGORIES: SyntheticCommandCenterDecisionCategory[] = [
  "cash_decision",
  "workforce_decision",
  "forecast_decision",
  "scenario_decision",
  "board_decision",
  "close_decision",
  "portfolio_decision",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function compactDefined<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function buildDecisionQueueId(input: BuildCommandCenterDecisionQueueInput): string {
  return `command-center-decision-queue:${stableSnapshotHash({
    companyId: input.companyId,
    decisionQueueKey: input.decisionQueueKey,
    decisionCategory: input.decisionCategory,
    surfaceCandidateIds: input.surfaceCandidates.map((candidate) => candidate.surfaceCandidateId),
    prioritizationPackageIds: input.surfaceCandidates.map((candidate) => candidate.prioritizationPackageId),
    evidencePackageIds: input.surfaceCandidates.map((candidate) => candidate.evidencePackageId),
    commandCenterCandidateIds: input.surfaceCandidates.map((candidate) => candidate.commandCenterCandidateId),
  })}`;
}

function getEvidenceReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(candidates.flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.evidence.evidenceIds));
}

function getTrustReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.trustMetadata?.trustEvidenceIds ?? []),
  );
}

function getConfidenceReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap(
      (candidate) => candidate.prioritizationPackage.evidencePackage.confidenceMetadata?.confidenceEvidenceIds ?? [],
    ),
  );
}

function getDegradationReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap(
      (candidate) => candidate.prioritizationPackage.evidencePackage.degradationMetadata?.degradationEvidenceIds ?? [],
    ),
  );
}

function getRecoveryReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.recoveryMetadata?.recoveryEvidenceIds ?? []),
  );
}

function getGovernanceReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap(
      (candidate) => candidate.prioritizationPackage.evidencePackage.governanceMetadata?.governanceBoundaryIds ?? [],
    ),
  );
}

function getAttentionReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => candidate.prioritizationPackage.attentionMetadata?.attentionEvidenceIds ?? []),
  );
}

function getRoleVisibilityCategories(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): SyntheticCommandCenterRoleCategory[] {
  return [
    ...new Set(
      candidates.flatMap((candidate) => [
        ...candidate.visibleRoleCategories,
        ...(candidate.prioritizationPackage.roleVisibilityDescriptor?.visibleRoleCategories ?? []),
      ]),
    ),
  ];
}

function getRoleVisibilityReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => {
      const descriptor = candidate.prioritizationPackage.roleVisibilityDescriptor;
      return [...(descriptor?.visibilitySourceReferenceIds ?? []), ...(descriptor?.visibilityEvidenceIds ?? [])];
    }),
  );
}

function validateInput(input: BuildCommandCenterDecisionQueueInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!hasValue(input.decisionQueueKey)) warnings.push("decisionQueueKey is required.");
  if (!DECISION_CATEGORIES.includes(input.decisionCategory)) {
    warnings.push("decisionCategory is not supported.");
  }
  if (!Array.isArray(input.surfaceCandidates)) {
    warnings.push("surfaceCandidates must be an array.");
    return warnings;
  }
  if (input.surfaceCandidates.length === 0) {
    warnings.push("surfaceCandidates must include at least one candidate.");
  }

  for (const candidate of input.surfaceCandidates) {
    if (!hasValue(candidate.surfaceCandidateId)) warnings.push("surfaceCandidateId is required.");
    if (!hasValue(candidate.prioritizationPackageId)) warnings.push("prioritizationPackageId is required.");
    if (!hasValue(candidate.evidencePackageId)) warnings.push("evidencePackageId is required.");
    if (!hasValue(candidate.commandCenterCandidateId)) warnings.push("commandCenterCandidateId is required.");
    if (candidate.companyId !== input.companyId) {
      warnings.push("surface candidate companyId must match input companyId.");
    }
    if (!candidate.prioritizationPackage?.decisionQueueCompatibility) {
      warnings.push("decisionQueueCompatibility is required.");
    }
  }

  return warnings;
}

export function buildCommandCenterDecisionQueue(
  input: BuildCommandCenterDecisionQueueInput,
): BuildCommandCenterDecisionQueueResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      decisionQueue: null,
      skipped: true,
      warnings,
    };
  }

  return {
    decisionQueue: {
      decisionQueueId: buildDecisionQueueId(input),
      companyId: input.companyId,
      decisionQueueKey: input.decisionQueueKey,
      decisionCategory: input.decisionCategory,
      surfaceCandidates: input.surfaceCandidates,
      surfaceCandidateIds: input.surfaceCandidates.map((candidate) => candidate.surfaceCandidateId),
      prioritizationPackageIds: input.surfaceCandidates.map((candidate) => candidate.prioritizationPackageId),
      evidencePackageIds: input.surfaceCandidates.map((candidate) => candidate.evidencePackageId),
      commandCenterCandidateIds: input.surfaceCandidates.map((candidate) => candidate.commandCenterCandidateId),
      evidenceReferenceIds: getEvidenceReferenceIds(input.surfaceCandidates),
      trustMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.trustMetadata),
      ),
      trustReferenceIds: getTrustReferenceIds(input.surfaceCandidates),
      confidenceMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.confidenceMetadata),
      ),
      confidenceReferenceIds: getConfidenceReferenceIds(input.surfaceCandidates),
      degradationMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.degradationMetadata),
      ),
      degradationReferenceIds: getDegradationReferenceIds(input.surfaceCandidates),
      recoveryMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.recoveryMetadata),
      ),
      recoveryReferenceIds: getRecoveryReferenceIds(input.surfaceCandidates),
      governanceMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.governanceMetadata),
      ),
      governanceReferenceIds: getGovernanceReferenceIds(input.surfaceCandidates),
      memoryReferenceIds: uniqueStable(input.surfaceCandidates.flatMap((candidate) => candidate.memoryReferenceIds)),
      outcomeReferenceIds: uniqueStable(input.surfaceCandidates.flatMap((candidate) => candidate.outcomeReferenceIds)),
      whyNowReferenceIds: uniqueStable(input.surfaceCandidates.flatMap((candidate) => candidate.whyNowReasons)),
      attentionMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.attentionMetadata),
      ),
      attentionReferenceIds: getAttentionReferenceIds(input.surfaceCandidates),
      decisionQueueCompatibilityMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.decisionQueueCompatibility),
      ),
      roleVisibilityDescriptors: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.roleVisibilityDescriptor),
      ),
      roleVisibilityCategories: getRoleVisibilityCategories(input.surfaceCandidates),
      roleVisibilityReferenceIds: getRoleVisibilityReferenceIds(input.surfaceCandidates),
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
