import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export type SyntheticDeploymentStatus =
  | "pending_human_approval"
  | "approved"
  | "deployed"
  | "rejected";

export interface BuildDeploymentArtifactInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  marketplaceListingReferenceId?: string;
  targetOrganizationalUnitId?: string;
  deploymentConfiguration?: Record<string, unknown>;
  humanApproverId?: string;
  humanApproverDesignationReferenceId?: string;
  deploymentStatus?: SyntheticDeploymentStatus;
  containsPHI?: boolean;
  deploymentArtifactComplete?: boolean;
}

export interface SyntheticDeploymentArtifact extends SyntheticPhase39RoleHandoffConsumptionContract {
  deploymentArtifactId: string;
  deploymentArtifactKey: string;
  marketplaceListingReferenceId: string;
  targetOrganizationalUnitId: string;
  deploymentConfiguration: Record<string, unknown>;
  humanApproverId: string;
  humanApproverDesignationReferenceId: string;
  deploymentStatus: SyntheticDeploymentStatus;
  requiresHumanApprover: true;
  noAutonomousDeployment: true;
  rejectedIfMissingHumanApprover: true;
  deploymentArtifactComplete: boolean;
}

export interface BuildDeploymentArtifactResult {
  deploymentArtifact: SyntheticDeploymentArtifact | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getInputRecord(value: Record<string, unknown> | undefined): Record<string, unknown> {
  return value ?? {};
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getDeploymentStatus(inputDeploymentStatus: SyntheticDeploymentStatus | undefined): SyntheticDeploymentStatus {
  return inputDeploymentStatus ?? "pending_human_approval";
}

function getSharedBase(
  input: Partial<SyntheticOrganizationBaseContract>,
  parent: Partial<SyntheticOrganizationBaseContract>,
): SyntheticOrganizationBaseContract {
  return {
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? parent.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? parent.boundPhase38SnapshotHash ?? "",
    phase40StaleMarker: input.phase40StaleMarker ?? parent.phase40StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope ?? parent.scope,
    customerIsolation: input.customerIsolation ?? parent.customerIsolation,
    firmIsolation: input.firmIsolation ?? parent.firmIsolation,
    clientIsolation: input.clientIsolation ?? parent.clientIsolation,
    containsPHI: getContainsPHI(input.containsPHI ?? parent.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds ?? parent.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? parent.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata ?? parent.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(
      input.sourceConfidenceReferenceIds ?? parent.sourceConfidenceReferenceIds,
    ),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds ?? parent.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds ?? parent.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata ?? parent.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata ?? parent.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata ?? parent.governanceMetadata),
    warnings: getInputArray(input.warnings ?? parent.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes ?? parent.skippedIndexes),
  } as SyntheticOrganizationBaseContract;
}

function getPhase39HandoffBase(
  input: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
  parent: Partial<SyntheticPhase39RoleHandoffConsumptionContract>,
): SyntheticPhase39RoleHandoffConsumptionContract {
  return {
    ...getSharedBase(input, parent),
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? parent.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(
      input.phase39RoleInstanceReferenceIds ?? parent.phase39RoleInstanceReferenceIds,
    ),
  };
}

function collectMissingRequiredIdentifiers(input: BuildDeploymentArtifactInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.marketplaceListingReferenceId)) {
    missing.push("marketplaceListingReferenceId");
  }

  if (!hasValue(input.targetOrganizationalUnitId)) {
    missing.push("targetOrganizationalUnitId");
  }

  if (!hasValue(input.humanApproverId)) {
    missing.push("humanApproverId");
  }

  if (!hasValue(input.humanApproverDesignationReferenceId)) {
    missing.push("humanApproverDesignationReferenceId");
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

function buildDeploymentArtifactDerivationHash(input: BuildDeploymentArtifactInput): string {
  return stableSnapshotHash({
    marketplaceListingReferenceId: input.marketplaceListingReferenceId ?? "",
    targetOrganizationalUnitId: input.targetOrganizationalUnitId ?? "",
    deploymentConfiguration: getInputRecord(input.deploymentConfiguration),
    humanApproverId: input.humanApproverId ?? "",
    humanApproverDesignationReferenceId: input.humanApproverDesignationReferenceId ?? "",
    deploymentStatus: getDeploymentStatus(input.deploymentStatus),
    requiresHumanApprover: true,
    noAutonomousDeployment: true,
    rejectedIfMissingHumanApprover: true,
    containsPHI: getContainsPHI(input.containsPHI),
    deploymentArtifactComplete: input.deploymentArtifactComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildDeploymentArtifact(input: BuildDeploymentArtifactInput): BuildDeploymentArtifactResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      deploymentArtifact: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const marketplaceListingReferenceId = input.marketplaceListingReferenceId as string;
  const targetOrganizationalUnitId = input.targetOrganizationalUnitId as string;
  const humanApproverId = input.humanApproverId as string;
  const humanApproverDesignationReferenceId = input.humanApproverDesignationReferenceId as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const deploymentStatus = getDeploymentStatus(input.deploymentStatus);
  const derivationHash = buildDeploymentArtifactDerivationHash(input);
  const deploymentArtifactKey = stableSnapshotHash({
    marketplaceListingReferenceId,
    targetOrganizationalUnitId,
    deploymentConfiguration: getInputRecord(input.deploymentConfiguration),
    humanApproverId,
    humanApproverDesignationReferenceId,
    deploymentStatus,
    containsPHI,
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash,
    derivationHash,
  });
  const base = getPhase39HandoffBase(
    {
      ...input,
      containsPHI,
      derivationHash,
    },
    {},
  );

  return {
    deploymentArtifact: {
      ...base,
      deploymentArtifactId: stableSnapshotHash({
        deploymentArtifactKey,
        artifactType: "SyntheticDeploymentArtifact",
      }),
      deploymentArtifactKey,
      marketplaceListingReferenceId,
      targetOrganizationalUnitId,
      deploymentConfiguration: getInputRecord(input.deploymentConfiguration),
      humanApproverId,
      humanApproverDesignationReferenceId,
      deploymentStatus,
      requiresHumanApprover: true,
      noAutonomousDeployment: true,
      rejectedIfMissingHumanApprover: true,
      deploymentArtifactComplete: input.deploymentArtifactComplete === true,
      containsPHI,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
