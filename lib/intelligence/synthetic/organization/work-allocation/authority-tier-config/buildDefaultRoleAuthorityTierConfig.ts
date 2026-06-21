import { stableSnapshotHash } from "../../../../core/hash";
import type { SyntheticAuditScope } from "../../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../../organizational-memory/memory-object";
import type { SyntheticRoleCapabilityReviewLevel } from "../../../roles/role-capability";
import type { SyntheticRoleType } from "../../../roles/contracts";
import type {
  RoleAuthorityTierConfig,
  SyntheticPhase39RoleHandoffConsumptionContract,
  SyntheticRoleAuthorityTierMaxReviewLevelByRoleType,
} from "../../contracts";

export interface BuildDefaultRoleAuthorityTierConfigInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {}

export interface BuildDefaultRoleAuthorityTierConfigResult {
  roleAuthorityTierConfig: RoleAuthorityTierConfig | null;
  skipped: boolean;
  warnings: string[];
}

/**
 * NON-CONFIGURABLE FLOOR: fraud/reasonableness flagged tasks always route to human_controller
 * in the authority evaluator (40E-EXT-A), independent of this tier config. That bright line
 * is not representable as a reviewLevel value here and cannot be widened by customer_override.
 * RoleAuthorityTierConfig governs ONLY the in_lane vs above_authority review-level boundary.
 */
export const DEFAULT_ROLE_AUTHORITY_TIER_MAX_REVIEW_LEVEL_BY_ROLE_TYPE: SyntheticRoleAuthorityTierMaxReviewLevelByRoleType =
  {
    staff_accountant: "senior",
    staff_auditor: "senior",
    senior_accountant: "manager",
    senior_auditor: "manager",
    accounting_manager: "controller",
    controller_helper: "partner",
    audit_manager_helper: "partner",
    cfo_helper: "cfo",
    partner_helper: "human_required",
  };

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function collectMissingRequiredIdentifiers(input: BuildDefaultRoleAuthorityTierConfigInput): string[] {
  const missing: string[] = [];

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

function buildDefaultRoleAuthorityTierConfigDerivationHash(
  maxReviewLevelByRoleType: SyntheticRoleAuthorityTierMaxReviewLevelByRoleType,
): string {
  const orderedRoleTypes = Object.keys(maxReviewLevelByRoleType).sort() as SyntheticRoleType[];

  return stableSnapshotHash({
    configSource: "default",
    maxReviewLevelByRoleType: orderedRoleTypes.map((roleType) => ({
      roleType,
      maxReviewLevel: maxReviewLevelByRoleType[roleType],
    })),
  });
}

export function buildDefaultRoleAuthorityTierConfig(
  input: BuildDefaultRoleAuthorityTierConfigInput,
): BuildDefaultRoleAuthorityTierConfigResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      roleAuthorityTierConfig: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const maxReviewLevelByRoleType = {
    ...DEFAULT_ROLE_AUTHORITY_TIER_MAX_REVIEW_LEVEL_BY_ROLE_TYPE,
  };
  const containsPHI = getContainsPHI(input.containsPHI);
  const derivationHash = buildDefaultRoleAuthorityTierConfigDerivationHash(maxReviewLevelByRoleType);
  const roleAuthorityTierConfigKey = stableSnapshotHash({
    configSource: "default",
    maxReviewLevelByRoleType,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const roleAuthorityTierConfigId = stableSnapshotHash({
    roleAuthorityTierConfigKey,
    artifactType: "RoleAuthorityTierConfig",
  });

  return {
    roleAuthorityTierConfig: {
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
      roleAuthorityTierConfigId,
      roleAuthorityTierConfigKey,
      configSource: "default",
      maxReviewLevelByRoleType,
    },
    skipped: false,
    warnings,
  };
}

export type { SyntheticRoleCapabilityReviewLevel };
