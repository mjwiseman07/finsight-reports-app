import { stableSnapshotHash } from "../../../../core/hash";
import type { SyntheticAuditScope } from "../../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../../organizational-memory/memory-object";
import type { SyntheticRoleCapabilityReviewLevel } from "../../../roles/role-capability";
import type { SyntheticRoleCapability } from "../../../roles/role-capability/buildRoleCapability";
import type { SyntheticRoleGovernance } from "../../../roles/role-governance/buildRoleGovernance";
import type {
  SyntheticRoleRestriction,
  SyntheticRoleRestrictionEscalationTargetRoleType,
} from "../../../roles/role-restriction/buildRoleRestriction";
import type { SyntheticRoleType } from "../../../roles/contracts";
import type {
  AuthorityEvaluationResult,
  RoleAuthorityTierConfig,
  SyntheticAuthorityOutcome,
  SyntheticPhase39RoleHandoffConsumptionContract,
  SyntheticRoleAuthorityTierMaxReviewLevelByRoleType,
} from "../../contracts";
import {
  buildDefaultRoleAuthorityTierConfig,
  DEFAULT_ROLE_AUTHORITY_TIER_MAX_REVIEW_LEVEL_BY_ROLE_TYPE,
} from "../authority-tier-config";

export type SyntheticAuthorityEvaluationFlagStatus = "passed" | "flagged" | "not_run";

export interface BuildAuthorityEvaluationInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  taskFamily?: string;
  capabilityReferenceId?: string;
  fraudStatus?: SyntheticAuthorityEvaluationFlagStatus;
  reasonablenessStatus?: SyntheticAuthorityEvaluationFlagStatus;
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  roleRestriction?: SyntheticRoleRestriction | null;
  roleCapability?: SyntheticRoleCapability | null;
  roleGovernance?: SyntheticRoleGovernance | null;
  roleAuthorityTierConfig?: RoleAuthorityTierConfig | null;
}

export interface BuildAuthorityEvaluationResult {
  authorityEvaluationResult: AuthorityEvaluationResult | null;
  skipped: boolean;
  warnings: string[];
}

export interface AuthorityClassificationCore {
  authorityOutcome: SyntheticAuthorityOutcome;
  escalationTargetRoleType: string;
  restrictionCheckResult: boolean;
  capabilityMatch: boolean;
  approvalRoutingTargetRoleType: string;
}

const REVIEW_LEVEL_RANK: Record<SyntheticRoleCapabilityReviewLevel, number> = {
  none: 0,
  self: 1,
  senior: 2,
  manager: 3,
  controller: 4,
  partner: 5,
  cfo: 6,
  human_required: 7,
};

function resolveMaxReviewLevelByRoleType(
  input: BuildAuthorityEvaluationInput,
): SyntheticRoleAuthorityTierMaxReviewLevelByRoleType {
  if (input.roleAuthorityTierConfig) {
    return input.roleAuthorityTierConfig.maxReviewLevelByRoleType;
  }

  const defaultConfigResult = buildDefaultRoleAuthorityTierConfig(input);

  if (defaultConfigResult.roleAuthorityTierConfig) {
    return defaultConfigResult.roleAuthorityTierConfig.maxReviewLevelByRoleType;
  }

  // Bare classifyAuthority calls without handoff envelope: same map buildDefault would stamp.
  return DEFAULT_ROLE_AUTHORITY_TIER_MAX_REVIEW_LEVEL_BY_ROLE_TYPE;
}

/**
 * Fail-closed default: missing or ambiguous required classification inputs never resolve to
 * in_lane. Unknown task families, missing restriction artifacts, or missing capability review
 * data classify as forbidden unless fraud/reasonableness flags force requires_human first.
 */
export function classifyAuthority(input: BuildAuthorityEvaluationInput): AuthorityClassificationCore {
  const maxReviewLevelByRoleType = resolveMaxReviewLevelByRoleType(input);
  const approvalRoutingTargetRoleType = input.roleGovernance?.approvalRoutingTargetRoleType ?? "";

  if (input.fraudStatus === "flagged" || input.reasonablenessStatus === "flagged") {
    return {
      authorityOutcome: "requires_human",
      escalationTargetRoleType: "human_controller",
      restrictionCheckResult: false,
      capabilityMatch: false,
      approvalRoutingTargetRoleType,
    };
  }

  const taskFamily = input.taskFamily?.trim() ?? "";
  const roleRestriction = input.roleRestriction;

  if (!hasValue(taskFamily) || !roleRestriction) {
    return failClosedForbidden(approvalRoutingTargetRoleType);
  }

  if (roleRestriction.forbiddenTaskFamilies.includes(taskFamily)) {
    return {
      authorityOutcome: "forbidden",
      escalationTargetRoleType: "",
      restrictionCheckResult: false,
      capabilityMatch: false,
      approvalRoutingTargetRoleType,
    };
  }

  if (!roleRestriction.allowedTaskFamilies.includes(taskFamily)) {
    return failClosedForbidden(approvalRoutingTargetRoleType);
  }

  const restrictionCheckResult = true;
  const roleCapability = input.roleCapability;

  if (!roleCapability) {
    return {
      authorityOutcome: "forbidden",
      escalationTargetRoleType: "",
      restrictionCheckResult,
      capabilityMatch: false,
      approvalRoutingTargetRoleType,
    };
  }

  if (roleCapability.taskFamily !== taskFamily) {
    return failClosedForbidden(approvalRoutingTargetRoleType);
  }

  const actingRoleType = input.roleType;

  if (!actingRoleType || !roleCapability.roleApplicability.includes(actingRoleType)) {
    return {
      authorityOutcome: "forbidden",
      escalationTargetRoleType: "",
      restrictionCheckResult,
      capabilityMatch: false,
      approvalRoutingTargetRoleType,
    };
  }

  if (
    reviewLevelExceedsActingRoleTier(
      actingRoleType,
      roleCapability.reviewLevel,
      maxReviewLevelByRoleType,
    )
  ) {
    return {
      authorityOutcome: "above_authority",
      escalationTargetRoleType: roleRestriction.escalationTargetRoleType,
      restrictionCheckResult,
      capabilityMatch: false,
      approvalRoutingTargetRoleType,
    };
  }

  return {
    authorityOutcome: "in_lane",
    escalationTargetRoleType: "",
    restrictionCheckResult,
    capabilityMatch: true,
    approvalRoutingTargetRoleType,
  };
}

function failClosedForbidden(approvalRoutingTargetRoleType: string): AuthorityClassificationCore {
  return {
    authorityOutcome: "forbidden",
    escalationTargetRoleType: "",
    restrictionCheckResult: false,
    capabilityMatch: false,
    approvalRoutingTargetRoleType,
  };
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function reviewLevelExceedsActingRoleTier(
  actingRoleType: SyntheticRoleType,
  requiredReviewLevel: SyntheticRoleCapabilityReviewLevel,
  maxReviewLevelByRoleType: SyntheticRoleAuthorityTierMaxReviewLevelByRoleType,
): boolean {
  const actingMaxLevel = maxReviewLevelByRoleType[actingRoleType];
  return REVIEW_LEVEL_RANK[requiredReviewLevel] > REVIEW_LEVEL_RANK[actingMaxLevel];
}

function collectMissingRequiredIdentifiers(input: BuildAuthorityEvaluationInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(input.phase39RoleHandoffHandle)) {
    missing.push("phase39RoleHandoffHandle");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!input.scope) {
    missing.push("scope");
  }

  if (!input.customerIsolation) {
    missing.push("customerIsolation");
  }

  if (!input.firmIsolation) {
    missing.push("firmIsolation");
  }

  if (!input.clientIsolation) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildAuthorityEvaluationDerivationHash(
  input: BuildAuthorityEvaluationInput,
  classification: AuthorityClassificationCore,
): string {
  return stableSnapshotHash({
    taskFamily: input.taskFamily ?? "",
    capabilityReferenceId: input.capabilityReferenceId ?? "",
    fraudStatus: input.fraudStatus ?? "not_run",
    reasonablenessStatus: input.reasonablenessStatus ?? "not_run",
    roleType: input.roleType ?? "",
    roleInstanceId: input.roleInstanceId ?? "",
    roleRestrictionId: input.roleRestriction?.restrictionId ?? "",
    roleCapabilityId: input.roleCapability?.capabilityId ?? "",
    roleGovernanceId: input.roleGovernance?.governanceId ?? "",
    authorityOutcome: classification.authorityOutcome,
    escalationTargetRoleType: classification.escalationTargetRoleType,
    restrictionCheckResult: classification.restrictionCheckResult,
    capabilityMatch: classification.capabilityMatch,
    approvalRoutingTargetRoleType: classification.approvalRoutingTargetRoleType,
  });
}

export function buildAuthorityEvaluation(
  input: BuildAuthorityEvaluationInput,
): BuildAuthorityEvaluationResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      authorityEvaluationResult: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  if (input.roleRestriction && input.roleType && input.roleRestriction.roleType !== input.roleType) {
    warnings.push("roleRestriction.roleType does not match acting roleType; classification uses fail-closed rules");
  }

  const classification = classifyAuthority(input);
  const roleType = input.roleType as SyntheticRoleType;
  const roleInstanceId = input.roleInstanceId as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const derivationHash = buildAuthorityEvaluationDerivationHash(input, classification);
  const authorityEvaluationResultKey = stableSnapshotHash({
    taskFamily: input.taskFamily ?? "",
    roleType,
    roleInstanceId,
    authorityOutcome: classification.authorityOutcome,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const authorityEvaluationResultId = stableSnapshotHash({
    authorityEvaluationResultKey,
    artifactType: "AuthorityEvaluationResult",
  });

  return {
    authorityEvaluationResult: {
      boundPhase39SnapshotHash: input.boundPhase39SnapshotHash as string,
      boundPhase38SnapshotHash: input.boundPhase38SnapshotHash as string,
      phase40StaleMarker: input.phase40StaleMarker ?? "current",
      executable: false,
      executionReady: input.executionReady === true,
      scope: input.scope as SyntheticAuditScope,
      customerIsolation: input.customerIsolation as SyntheticMemoryObjectIsolationDimension,
      firmIsolation: input.firmIsolation as SyntheticMemoryObjectIsolationDimension,
      clientIsolation: input.clientIsolation as SyntheticMemoryObjectIsolationDimension,
      containsPHI,
      derivationLineageIds: getInputArray(input.derivationLineageIds),
      derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
      derivationHash,
      confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
      sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      lineageReferenceIds: getInputArray(input.lineageReferenceIds),
      trustMetadata: getInputArray(input.trustMetadata),
      confidenceMetadata: getInputArray(input.confidenceMetadata),
      governanceMetadata: getInputArray(input.governanceMetadata),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
      phase39RoleHandoffHandle: input.phase39RoleHandoffHandle as string,
      phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
      authorityEvaluationResultId,
      authorityEvaluationResultKey,
      authorityOutcome: classification.authorityOutcome,
      escalationTargetRoleType: classification.escalationTargetRoleType,
      restrictionCheckResult: classification.restrictionCheckResult,
      capabilityMatch: classification.capabilityMatch,
      approvalRoutingTargetRoleType: classification.approvalRoutingTargetRoleType,
    },
    skipped: false,
    warnings,
  };
}

export type { SyntheticRoleRestrictionEscalationTargetRoleType };
