import { stableSnapshotHash } from "../../../../core/hash";
import type { SyntheticRoleType } from "../../../roles/contracts";
import type { AdviseToDeployNotification, AuthorityRoutingPackage } from "../../contracts";

export interface BuildAdviseToDeployNotificationInput {
  authorityRoutingPackage?: AuthorityRoutingPackage | null;
  triggeringTaskRef?: string;
  warnings?: string[];
}

export interface BuildAdviseToDeployNotificationResult {
  adviseToDeployNotification: AdviseToDeployNotification | null;
  skipped: boolean;
  warnings: string[];
}

const SYNTHETIC_ROLE_TYPES: SyntheticRoleType[] = [
  "staff_accountant",
  "senior_accountant",
  "accounting_manager",
  "controller_helper",
  "cfo_helper",
  "staff_auditor",
  "senior_auditor",
  "audit_manager_helper",
  "partner_helper",
];

/**
 * Wired but PRODUCTION-DORMANT under option 3: the routing orchestrator yields
 * advise_to_deploy_required only when resolveRoleDeployment returns not_deployed, and the
 * live deployment index + writers are deferred post-42.5. Until then this fires only in
 * tests with explicit not-deployed records.
 *
 * Bright line: advise-to-deploy and human_escalation are mutually exclusive. This module
 * never emits on human_escalation (fraud/reasonableness -> human_controller).
 */
export function buildAdviseToDeployNotification(
  input: BuildAdviseToDeployNotificationInput,
): BuildAdviseToDeployNotificationResult {
  const warnings = [...(input.warnings ?? [])];
  const authorityRoutingPackage = input.authorityRoutingPackage;

  if (!authorityRoutingPackage) {
    return {
      adviseToDeployNotification: null,
      skipped: true,
      warnings: [...warnings, "missing authority routing package"],
    };
  }

  if (authorityRoutingPackage.routingOutcome !== "advise_to_deploy_required") {
    return {
      adviseToDeployNotification: null,
      skipped: true,
      warnings: [
        ...warnings,
        `routing outcome does not require advise-to-deploy notification: ${authorityRoutingPackage.routingOutcome}`,
      ],
    };
  }

  if (!hasValue(input.triggeringTaskRef)) {
    return {
      adviseToDeployNotification: null,
      skipped: true,
      warnings: [...warnings, "missing triggering task reference"],
    };
  }

  const requiredRoleType = authorityRoutingPackage.escalationTargetRoleType;

  if (!isSyntheticRoleType(requiredRoleType)) {
    return {
      adviseToDeployNotification: null,
      skipped: true,
      warnings: [...warnings, "missing or invalid required role type on routing package"],
    };
  }

  const adviseReason = buildAdviseReason(requiredRoleType);
  const triggeringTaskRef = input.triggeringTaskRef as string;
  const derivationHash = stableSnapshotHash({
    authorityRoutingPackageId: authorityRoutingPackage.authorityRoutingPackageId,
    requiredRoleType,
    triggeringTaskRef,
    adviseReason,
  });
  const adviseToDeployNotificationKey = stableSnapshotHash({
    authorityRoutingPackageId: authorityRoutingPackage.authorityRoutingPackageId,
    requiredRoleType,
    triggeringTaskRef,
    boundPhase39SnapshotHash: authorityRoutingPackage.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: authorityRoutingPackage.boundPhase38SnapshotHash,
    derivationHash,
  });
  const adviseToDeployNotificationId = stableSnapshotHash({
    adviseToDeployNotificationKey,
    artifactType: "AdviseToDeployNotification",
  });

  return {
    adviseToDeployNotification: {
      boundPhase39SnapshotHash: authorityRoutingPackage.boundPhase39SnapshotHash,
      boundPhase38SnapshotHash: authorityRoutingPackage.boundPhase38SnapshotHash,
      phase40StaleMarker: authorityRoutingPackage.phase40StaleMarker,
      executable: false,
      executionReady: authorityRoutingPackage.executionReady,
      scope: authorityRoutingPackage.scope,
      customerIsolation: authorityRoutingPackage.customerIsolation,
      firmIsolation: authorityRoutingPackage.firmIsolation,
      clientIsolation: authorityRoutingPackage.clientIsolation,
      containsPHI: authorityRoutingPackage.containsPHI,
      derivationLineageIds: authorityRoutingPackage.derivationLineageIds,
      derivationMethod: authorityRoutingPackage.derivationMethod,
      derivationHash,
      confidenceFloorMetadata: authorityRoutingPackage.confidenceFloorMetadata,
      sourceConfidenceReferenceIds: authorityRoutingPackage.sourceConfidenceReferenceIds,
      evidenceReferenceIds: authorityRoutingPackage.evidenceReferenceIds,
      lineageReferenceIds: authorityRoutingPackage.lineageReferenceIds,
      trustMetadata: authorityRoutingPackage.trustMetadata,
      confidenceMetadata: authorityRoutingPackage.confidenceMetadata,
      governanceMetadata: authorityRoutingPackage.governanceMetadata,
      warnings,
      skippedIndexes: authorityRoutingPackage.skippedIndexes,
      phase39RoleHandoffHandle: authorityRoutingPackage.phase39RoleHandoffHandle,
      phase39RoleInstanceReferenceIds: authorityRoutingPackage.phase39RoleInstanceReferenceIds,
      adviseToDeployNotificationId,
      adviseToDeployNotificationKey,
      requiredRoleType,
      triggeringTaskRef,
      adviseReason,
    },
    skipped: false,
    warnings,
  };
}

function buildAdviseReason(requiredRoleType: SyntheticRoleType): string {
  return (
    `This task requires ${requiredRoleType}-level authority and could not be routed because that role is not deployed. ` +
    `Deploying the ${requiredRoleType} AI role would allow the task to be routed and completed under existing human gates.`
  );
}

function isSyntheticRoleType(value: string): value is SyntheticRoleType {
  return SYNTHETIC_ROLE_TYPES.includes(value as SyntheticRoleType);
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}
