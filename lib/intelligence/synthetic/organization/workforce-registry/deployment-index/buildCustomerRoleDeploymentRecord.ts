import { stableSnapshotHash } from "../../../../core/hash";
import type { SyntheticAuditScope } from "../../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../../organizational-memory/memory-object";
import type { SyntheticRoleType } from "../../../roles/contracts";
import type {
  CustomerRoleDeploymentRecord,
  SyntheticCustomerRoleDeploymentStatus,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../../contracts";

export interface BuildCustomerRoleDeploymentRecordInput
  extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  companyId?: string;
  roleType?: SyntheticRoleType;
  deploymentStatus?: SyntheticCustomerRoleDeploymentStatus;
  roleInstanceId?: string;
  roleActivationReferenceId?: string;
  workforceMemberReferenceId?: string;
  taskQueueReferenceId?: string;
  deploymentResolvedAt?: string;
}

export interface BuildCustomerRoleDeploymentRecordResult {
  customerRoleDeploymentRecord: CustomerRoleDeploymentRecord | null;
  skipped: boolean;
  warnings: string[];
}

export interface ResolveRoleDeploymentScope {
  companyId: string;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  scope?: SyntheticAuditScope;
}

export interface ResolveRoleDeploymentResult {
  deploymentStatus: SyntheticCustomerRoleDeploymentStatus;
  roleInstanceId: string;
  roleActivationReferenceId: string;
  workforceMemberReferenceId: string;
  taskQueueReferenceId: string;
  customerRoleDeploymentRecordId: string;
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

function collectMissingRequiredIdentifiers(input: BuildCustomerRoleDeploymentRecordInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.companyId)) {
    missing.push("companyId");
  }

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
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

function buildCustomerRoleDeploymentRecordDerivationHash(
  input: BuildCustomerRoleDeploymentRecordInput,
): string {
  return stableSnapshotHash({
    companyId: input.companyId ?? "",
    roleType: input.roleType ?? "",
    deploymentStatus: input.deploymentStatus ?? "not_deployed",
    roleInstanceId: input.roleInstanceId ?? "",
    roleActivationReferenceId: input.roleActivationReferenceId ?? "",
    workforceMemberReferenceId: input.workforceMemberReferenceId ?? "",
    taskQueueReferenceId: input.taskQueueReferenceId ?? "",
    deploymentResolvedAt: input.deploymentResolvedAt ?? "",
  });
}

export function satisfiesCustomerRoleDeploymentDeployedPredicate(
  record: CustomerRoleDeploymentRecord,
): boolean {
  return (
    record.deploymentStatus === "deployed" &&
    hasValue(record.roleActivationReferenceId) &&
    hasValue(record.workforceMemberReferenceId)
  );
}

function buildNotDeployedResult(): ResolveRoleDeploymentResult {
  return {
    deploymentStatus: "not_deployed",
    roleInstanceId: "",
    roleActivationReferenceId: "",
    workforceMemberReferenceId: "",
    taskQueueReferenceId: "",
    customerRoleDeploymentRecordId: "",
  };
}

/**
 * STUB resolver (Phase 40 addendum option 3): fail-closed only.
 * Live tenant-scoped lookup, isolation enforcement, and activation/workforce writers
 * are deferred until after Phase 42.5 D0. Replace this stub with the live resolver
 * without changing the exported result shape.
 */
export function resolveRoleDeployment(
  scope: ResolveRoleDeploymentScope,
  roleType: SyntheticRoleType,
  explicitRecord?: CustomerRoleDeploymentRecord | null,
): ResolveRoleDeploymentResult {
  void scope;

  if (!explicitRecord) {
    return buildNotDeployedResult();
  }

  if (explicitRecord.roleType !== roleType) {
    return buildNotDeployedResult();
  }

  if (explicitRecord.companyId !== scope.companyId) {
    return buildNotDeployedResult();
  }

  if (!satisfiesCustomerRoleDeploymentDeployedPredicate(explicitRecord)) {
    return buildNotDeployedResult();
  }

  return {
    deploymentStatus: "deployed",
    roleInstanceId: explicitRecord.roleInstanceId,
    roleActivationReferenceId: explicitRecord.roleActivationReferenceId,
    workforceMemberReferenceId: explicitRecord.workforceMemberReferenceId,
    taskQueueReferenceId: explicitRecord.taskQueueReferenceId,
    customerRoleDeploymentRecordId: explicitRecord.customerRoleDeploymentRecordId,
  };
}

export function buildCustomerRoleDeploymentRecord(
  input: BuildCustomerRoleDeploymentRecordInput,
): BuildCustomerRoleDeploymentRecordResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      customerRoleDeploymentRecord: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const companyId = input.companyId as string;
  const roleType = input.roleType as SyntheticRoleType;
  const containsPHI = getContainsPHI(input.containsPHI);
  const derivationHash = buildCustomerRoleDeploymentRecordDerivationHash(input);
  const customerRoleDeploymentRecordKey = stableSnapshotHash({
    companyId,
    roleType,
    deploymentStatus: input.deploymentStatus ?? "not_deployed",
    roleInstanceId: input.roleInstanceId ?? "",
    roleActivationReferenceId: input.roleActivationReferenceId ?? "",
    workforceMemberReferenceId: input.workforceMemberReferenceId ?? "",
    taskQueueReferenceId: input.taskQueueReferenceId ?? "",
    deploymentResolvedAt: input.deploymentResolvedAt ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const customerRoleDeploymentRecordId = stableSnapshotHash({
    customerRoleDeploymentRecordKey,
    artifactType: "CustomerRoleDeploymentRecord",
  });

  return {
    customerRoleDeploymentRecord: {
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
      customerRoleDeploymentRecordId,
      customerRoleDeploymentRecordKey,
      companyId,
      roleType,
      deploymentStatus: input.deploymentStatus ?? "not_deployed",
      roleInstanceId: input.roleInstanceId ?? "",
      roleActivationReferenceId: input.roleActivationReferenceId ?? "",
      workforceMemberReferenceId: input.workforceMemberReferenceId ?? "",
      taskQueueReferenceId: input.taskQueueReferenceId ?? "",
      deploymentResolvedAt: input.deploymentResolvedAt ?? "",
    },
    skipped: false,
    warnings,
  };
}
