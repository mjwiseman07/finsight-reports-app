import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticOrganizationBaseContract,
  SyntheticPhase39RoleHandoffConsumptionContract,
} from "../contracts";

export interface BuildGovernancePackageInput extends Partial<SyntheticPhase39RoleHandoffConsumptionContract> {
  organizationalUnitId?: string;
  approvalHierarchyReferenceIds?: string[];
  escalationHierarchyReferenceIds?: string[];
  reportingHierarchyReferenceIds?: string[];
  humanApproverDesignationReferenceIds?: string[];
  recommendationAuditChainReferenceId?: string;
  containsPHI?: boolean;
  governancePackageComplete?: boolean;
}

export interface SyntheticGovernancePackage extends SyntheticPhase39RoleHandoffConsumptionContract {
  governancePackageId: string;
  governancePackageKey: string;
  organizationalUnitId: string;
  approvalHierarchyReferenceIds: string[];
  escalationHierarchyReferenceIds: string[];
  reportingHierarchyReferenceIds: string[];
  humanApproverDesignationReferenceIds: string[];
  recommendationAuditChainReferenceId: string;
  governancePackageComplete: boolean;
}

export interface BuildGovernancePackageResult {
  governancePackage: SyntheticGovernancePackage | null;
  skipped: boolean;
  warnings: string[];
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

function collectMissingRequiredIdentifiers(input: BuildGovernancePackageInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.organizationalUnitId)) {
    missing.push("organizationalUnitId");
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

function buildGovernancePackageDerivationHash(input: BuildGovernancePackageInput): string {
  return stableSnapshotHash({
    organizationalUnitId: input.organizationalUnitId ?? "",
    approvalHierarchyReferenceIds: getInputArray(input.approvalHierarchyReferenceIds),
    escalationHierarchyReferenceIds: getInputArray(input.escalationHierarchyReferenceIds),
    reportingHierarchyReferenceIds: getInputArray(input.reportingHierarchyReferenceIds),
    humanApproverDesignationReferenceIds: getInputArray(input.humanApproverDesignationReferenceIds),
    recommendationAuditChainReferenceId: input.recommendationAuditChainReferenceId ?? "",
    containsPHI: getContainsPHI(input.containsPHI),
    governancePackageComplete: input.governancePackageComplete === true,
    phase39RoleHandoffHandle: input.phase39RoleHandoffHandle ?? "",
    phase39RoleInstanceReferenceIds: getInputArray(input.phase39RoleInstanceReferenceIds),
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
  });
}

export function buildGovernancePackage(input: BuildGovernancePackageInput): BuildGovernancePackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      governancePackage: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const organizationalUnitId = input.organizationalUnitId as string;
  const containsPHI = getContainsPHI(input.containsPHI);
  const derivationHash = buildGovernancePackageDerivationHash(input);
  const governancePackageKey = stableSnapshotHash({
    organizationalUnitId,
    approvalHierarchyReferenceIds: getInputArray(input.approvalHierarchyReferenceIds),
    escalationHierarchyReferenceIds: getInputArray(input.escalationHierarchyReferenceIds),
    reportingHierarchyReferenceIds: getInputArray(input.reportingHierarchyReferenceIds),
    recommendationAuditChainReferenceId: input.recommendationAuditChainReferenceId ?? "",
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
    governancePackage: {
      ...base,
      governancePackageId: stableSnapshotHash({
        governancePackageKey,
        artifactType: "SyntheticGovernancePackage",
      }),
      governancePackageKey,
      organizationalUnitId,
      approvalHierarchyReferenceIds: getInputArray(input.approvalHierarchyReferenceIds),
      escalationHierarchyReferenceIds: getInputArray(input.escalationHierarchyReferenceIds),
      reportingHierarchyReferenceIds: getInputArray(input.reportingHierarchyReferenceIds),
      humanApproverDesignationReferenceIds: getInputArray(input.humanApproverDesignationReferenceIds),
      recommendationAuditChainReferenceId: input.recommendationAuditChainReferenceId ?? "",
      governancePackageComplete: input.governancePackageComplete === true,
      containsPHI,
      derivationHash,
    },
    skipped: false,
    warnings,
  };
}
