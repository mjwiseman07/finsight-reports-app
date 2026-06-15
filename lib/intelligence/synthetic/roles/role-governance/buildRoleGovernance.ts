import { stableSnapshotHash } from "../../../core/hash";
import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type { SyntheticActionHandoffPackage } from "../../actions/action-handoff-package";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticRoleType } from "../contracts";

export type SyntheticRoleGovernanceApprovalRoutingTargetRoleType =
  | SyntheticRoleType
  | "human_controller"
  | "human_cfo"
  | "human_audit_manager"
  | "human_partner";

export type SyntheticRoleGovernanceGate =
  | "gate_1_evidence_present"
  | "gate_2_support_package_complete"
  | "gate_3_validation_passed"
  | "gate_4_fraud_detection_passed"
  | "gate_5_reasonableness_passed"
  | "gate_6_approval_satisfied_or_override_documented"
  | "gate_7_audit_log_recorded";

interface RoleGovernanceDefinition {
  evidenceRequirements: string[];
  evidenceSufficiencyStandard: string;
  workpaperRequired: boolean;
  leadSheetRequired: boolean;
  supportPackageRequired: boolean;
  approvalRequired: boolean;
  approvalRoutingTargetRoleType: SyntheticRoleGovernanceApprovalRoutingTargetRoleType;
  materialityGateRequired: boolean;
  humanDecisionRequired: boolean;
  segregationOfDutiesRequired: boolean;
  fraudDetectionRequired: boolean;
  reasonablenessCheckRequired: boolean;
  declineAndWarnRequired: boolean;
}

export interface BuildRoleGovernanceInput {
  roleType?: SyntheticRoleType;
  roleInstanceId?: string;
  phase38Handoff: SyntheticActionHandoffPackage | null;
  evidenceRequirements?: string[];
  evidenceSufficiencyStandard?: string;
  workpaperRequired?: boolean;
  leadSheetRequired?: boolean;
  supportPackageRequired?: boolean;
  approvalRequired?: boolean;
  approvalRoutingTargetRoleType?: SyntheticRoleGovernanceApprovalRoutingTargetRoleType;
  approvalThresholdReferenceIds?: string[];
  materialityGateRequired?: boolean;
  humanDecisionRequired?: boolean;
  segregationOfDutiesRequired?: boolean;
  auditLogReferenceId?: string;
  fraudDetectionRequired?: boolean;
  reasonablenessCheckRequired?: boolean;
  declineAndWarnRequired?: boolean;
  governanceGates?: SyntheticRoleGovernanceGate[];
  gateSequence?: SyntheticRoleGovernanceGate[];
  boundPhase38SnapshotHash?: string;
  boundPhase37SnapshotHash?: string;
  phase39StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
  companyId?: string;
  scope?: SyntheticAuditScope;
  customerIsolation?: SyntheticMemoryObjectIsolationDimension;
  firmIsolation?: SyntheticMemoryObjectIsolationDimension;
  clientIsolation?: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  trustMetadata?: SyntheticAuditTrustMetadata[];
  confidenceMetadata?: SyntheticAuditConfidenceMetadata[];
  governanceMetadata?: SyntheticAuditGovernanceMetadata[];
  materialityMetadata?: SyntheticAuditMaterialityCompatibility[];
  warnings?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticRoleGovernance {
  governanceId: string;
  governanceKey: string;
  roleType: SyntheticRoleType;
  roleInstanceId: string;
  evidenceRequirements: string[];
  evidenceSufficiencyStandard: string;
  workpaperRequired: boolean;
  leadSheetRequired: boolean;
  supportPackageRequired: boolean;
  approvalRequired: boolean;
  approvalRoutingTargetRoleType: SyntheticRoleGovernanceApprovalRoutingTargetRoleType;
  approvalThresholdReferenceIds: string[];
  materialityGateRequired: boolean;
  humanDecisionRequired: boolean;
  segregationOfDutiesRequired: boolean;
  auditLogRequired: true;
  auditLogReferenceId: string;
  fraudDetectionRequired: boolean;
  reasonablenessCheckRequired: boolean;
  declineAndWarnRequired: boolean;
  overrideRequiresDocumentedReason: true;
  overrideReasonPreservedPermanently: true;
  declineReasonPreservedPermanently: true;
  governanceGates: SyntheticRoleGovernanceGate[];
  gateSequence: SyntheticRoleGovernanceGate[];
  failClosedOnGateFailure: true;
  nonExecutionMarkerRequired: true;
  boundPhase38SnapshotHash: string;
  boundPhase37SnapshotHash: string;
  phase39StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildRoleGovernanceResult {
  roleGovernance: SyntheticRoleGovernance | null;
  skipped: boolean;
  warnings: string[];
}

const DEFAULT_GATE_SEQUENCE: SyntheticRoleGovernanceGate[] = [
  "gate_1_evidence_present",
  "gate_2_support_package_complete",
  "gate_3_validation_passed",
  "gate_4_fraud_detection_passed",
  "gate_5_reasonableness_passed",
  "gate_6_approval_satisfied_or_override_documented",
  "gate_7_audit_log_recorded",
];

const ROLE_GOVERNANCE_DEFINITIONS: Record<SyntheticRoleType, RoleGovernanceDefinition> = {
  staff_accountant: {
    evidenceRequirements: ["workpaper", "lead_sheet_for_journal_entries", "support_package", "approval_reference"],
    evidenceSufficiencyStandard: "required",
    workpaperRequired: true,
    leadSheetRequired: true,
    supportPackageRequired: true,
    approvalRequired: true,
    approvalRoutingTargetRoleType: "senior_accountant",
    materialityGateRequired: true,
    humanDecisionRequired: true,
    segregationOfDutiesRequired: true,
    fraudDetectionRequired: true,
    reasonablenessCheckRequired: true,
    declineAndWarnRequired: true,
  },
  senior_accountant: {
    evidenceRequirements: ["workpaper", "approval_reference", "fraud_detection_reference", "reasonableness_reference"],
    evidenceSufficiencyStandard: "required",
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: true,
    approvalRequired: true,
    approvalRoutingTargetRoleType: "controller_helper",
    materialityGateRequired: true,
    humanDecisionRequired: true,
    segregationOfDutiesRequired: true,
    fraudDetectionRequired: true,
    reasonablenessCheckRequired: true,
    declineAndWarnRequired: true,
  },
  accounting_manager: {
    evidenceRequirements: ["workpaper", "management_review_reference", "materiality_gate_reference"],
    evidenceSufficiencyStandard: "required",
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    approvalRequired: true,
    approvalRoutingTargetRoleType: "controller_helper",
    materialityGateRequired: true,
    humanDecisionRequired: true,
    segregationOfDutiesRequired: true,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
    declineAndWarnRequired: true,
  },
  controller_helper: {
    evidenceRequirements: ["workpaper", "fraud_detection_reference", "reasonableness_reference", "human_controller_reference"],
    evidenceSufficiencyStandard: "required",
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    approvalRequired: true,
    approvalRoutingTargetRoleType: "human_controller",
    materialityGateRequired: true,
    humanDecisionRequired: true,
    segregationOfDutiesRequired: true,
    fraudDetectionRequired: true,
    reasonablenessCheckRequired: true,
    declineAndWarnRequired: true,
  },
  cfo_helper: {
    evidenceRequirements: ["workpaper", "human_cfo_reference", "materiality_gate_reference"],
    evidenceSufficiencyStandard: "required",
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    approvalRequired: true,
    approvalRoutingTargetRoleType: "human_cfo",
    materialityGateRequired: true,
    humanDecisionRequired: true,
    segregationOfDutiesRequired: true,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
    declineAndWarnRequired: true,
  },
  staff_auditor: {
    evidenceRequirements: ["workpaper", "evidence_sufficiency_reference", "non_execution_marker"],
    evidenceSufficiencyStandard: "required",
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    approvalRequired: true,
    approvalRoutingTargetRoleType: "senior_auditor",
    materialityGateRequired: true,
    humanDecisionRequired: true,
    segregationOfDutiesRequired: true,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
    declineAndWarnRequired: true,
  },
  senior_auditor: {
    evidenceRequirements: ["workpaper", "review_note_reference", "audit_manager_reference"],
    evidenceSufficiencyStandard: "required",
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    approvalRequired: true,
    approvalRoutingTargetRoleType: "audit_manager_helper",
    materialityGateRequired: true,
    humanDecisionRequired: true,
    segregationOfDutiesRequired: true,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
    declineAndWarnRequired: true,
  },
  audit_manager_helper: {
    evidenceRequirements: ["workpaper", "human_audit_manager_reference", "materiality_gate_reference"],
    evidenceSufficiencyStandard: "required",
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    approvalRequired: true,
    approvalRoutingTargetRoleType: "human_audit_manager",
    materialityGateRequired: true,
    humanDecisionRequired: true,
    segregationOfDutiesRequired: true,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
    declineAndWarnRequired: true,
  },
  partner_helper: {
    evidenceRequirements: ["workpaper", "human_partner_reference", "engagement_governance_reference"],
    evidenceSufficiencyStandard: "required",
    workpaperRequired: true,
    leadSheetRequired: false,
    supportPackageRequired: false,
    approvalRequired: true,
    approvalRoutingTargetRoleType: "human_partner",
    materialityGateRequired: true,
    humanDecisionRequired: true,
    segregationOfDutiesRequired: true,
    fraudDetectionRequired: false,
    reasonablenessCheckRequired: true,
    declineAndWarnRequired: true,
  },
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getDefinition(roleType: SyntheticRoleType | undefined): RoleGovernanceDefinition | null {
  return roleType ? ROLE_GOVERNANCE_DEFINITIONS[roleType] ?? null : null;
}

function getBoundPhase38SnapshotHash(input: BuildRoleGovernanceInput): string {
  return input.boundPhase38SnapshotHash ?? input.phase38Handoff?.phase38SnapshotHash ?? "";
}

function getBoundPhase37SnapshotHash(input: BuildRoleGovernanceInput): string {
  return input.boundPhase37SnapshotHash ?? input.phase38Handoff?.boundPhase37SnapshotHash ?? "";
}

function getCompanyId(input: BuildRoleGovernanceInput): string {
  return input.companyId ?? input.phase38Handoff?.companyId ?? "";
}

function getScope(input: BuildRoleGovernanceInput): SyntheticAuditScope | undefined {
  return input.scope ?? input.phase38Handoff?.scope;
}

function getCustomerIsolation(input: BuildRoleGovernanceInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.customerIsolation ?? input.phase38Handoff?.customerIsolation;
}

function getFirmIsolation(input: BuildRoleGovernanceInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.firmIsolation ?? input.phase38Handoff?.firmIsolation;
}

function getClientIsolation(input: BuildRoleGovernanceInput): SyntheticMemoryObjectIsolationDimension | undefined {
  return input.clientIsolation ?? input.phase38Handoff?.clientIsolation;
}

function getPhase39StaleMarker(input: BuildRoleGovernanceInput): SyntheticPhase38StaleMarker {
  return input.phase39StaleMarker ?? input.phase38Handoff?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildRoleGovernanceInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? input.phase38Handoff?.derivationMethod ?? "handoff_metadata_preservation";
}

function collectMissingRequiredIdentifiers(input: BuildRoleGovernanceInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.roleType)) {
    missing.push("roleType");
  }

  if (!hasValue(input.roleInstanceId)) {
    missing.push("roleInstanceId");
  }

  if (!hasValue(getBoundPhase38SnapshotHash(input))) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!hasValue(getBoundPhase37SnapshotHash(input))) {
    missing.push("boundPhase37SnapshotHash");
  }

  if (!hasValue(getCompanyId(input))) {
    missing.push("companyId");
  }

  if (!getScope(input)) {
    missing.push("scope");
  }

  if (!getCustomerIsolation(input)) {
    missing.push("customerIsolation");
  }

  if (!getFirmIsolation(input)) {
    missing.push("firmIsolation");
  }

  if (!getClientIsolation(input)) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildDerivationHash(input: BuildRoleGovernanceInput, definition: RoleGovernanceDefinition): string {
  return stableSnapshotHash({
    roleType: input.roleType,
    roleInstanceId: input.roleInstanceId,
    evidenceRequirements: input.evidenceRequirements ?? definition.evidenceRequirements,
    evidenceSufficiencyStandard: input.evidenceSufficiencyStandard ?? definition.evidenceSufficiencyStandard,
    workpaperRequired: input.workpaperRequired ?? definition.workpaperRequired,
    leadSheetRequired: input.leadSheetRequired ?? definition.leadSheetRequired,
    supportPackageRequired: input.supportPackageRequired ?? definition.supportPackageRequired,
    approvalRequired: input.approvalRequired ?? definition.approvalRequired,
    approvalRoutingTargetRoleType: input.approvalRoutingTargetRoleType ?? definition.approvalRoutingTargetRoleType,
    approvalThresholdReferenceIds: getInputArray(input.approvalThresholdReferenceIds),
    materialityGateRequired: input.materialityGateRequired ?? definition.materialityGateRequired,
    humanDecisionRequired: input.humanDecisionRequired ?? definition.humanDecisionRequired,
    segregationOfDutiesRequired: input.segregationOfDutiesRequired ?? definition.segregationOfDutiesRequired,
    auditLogReferenceId: input.auditLogReferenceId ?? "",
    fraudDetectionRequired: input.fraudDetectionRequired ?? definition.fraudDetectionRequired,
    reasonablenessCheckRequired: input.reasonablenessCheckRequired ?? definition.reasonablenessCheckRequired,
    declineAndWarnRequired: input.declineAndWarnRequired ?? definition.declineAndWarnRequired,
    governanceGates: input.governanceGates ?? DEFAULT_GATE_SEQUENCE,
    gateSequence: input.gateSequence ?? DEFAULT_GATE_SEQUENCE,
    boundPhase38SnapshotHash: getBoundPhase38SnapshotHash(input),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: getDerivationMethod(input),
  });
}

export function buildRoleGovernance(input: BuildRoleGovernanceInput): BuildRoleGovernanceResult {
  const warnings = [...getInputArray(input.warnings)];
  const definition = getDefinition(input.roleType);

  if (!input.roleType || !definition) {
    return {
      roleGovernance: null,
      skipped: true,
      warnings: [...warnings, "missing roleType or unsupported roleType"],
    };
  }

  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      roleGovernance: null,
      skipped: true,
      warnings: [
        ...warnings,
        `missing required identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const roleType = input.roleType;
  const roleInstanceId = input.roleInstanceId as string;
  const boundPhase38SnapshotHash = getBoundPhase38SnapshotHash(input);
  const boundPhase37SnapshotHash = getBoundPhase37SnapshotHash(input);
  const companyId = getCompanyId(input);
  const scope = getScope(input);
  const customerIsolation = getCustomerIsolation(input);
  const firmIsolation = getFirmIsolation(input);
  const clientIsolation = getClientIsolation(input);
  const derivationHash = buildDerivationHash(input, definition);
  const governanceKey = stableSnapshotHash({
    roleType,
    roleInstanceId,
    companyId,
    boundPhase38SnapshotHash,
    boundPhase37SnapshotHash,
    derivationHash,
  });
  const governanceId = stableSnapshotHash({
    governanceKey,
    artifactType: "SyntheticRoleGovernance",
  });

  return {
    roleGovernance: {
      governanceId,
      governanceKey,
      roleType,
      roleInstanceId,
      evidenceRequirements: input.evidenceRequirements ?? definition.evidenceRequirements,
      evidenceSufficiencyStandard: input.evidenceSufficiencyStandard ?? definition.evidenceSufficiencyStandard,
      workpaperRequired: input.workpaperRequired ?? definition.workpaperRequired,
      leadSheetRequired: input.leadSheetRequired ?? definition.leadSheetRequired,
      supportPackageRequired: input.supportPackageRequired ?? definition.supportPackageRequired,
      approvalRequired: input.approvalRequired ?? definition.approvalRequired,
      approvalRoutingTargetRoleType: input.approvalRoutingTargetRoleType ?? definition.approvalRoutingTargetRoleType,
      approvalThresholdReferenceIds: getInputArray(input.approvalThresholdReferenceIds),
      materialityGateRequired: input.materialityGateRequired ?? definition.materialityGateRequired,
      humanDecisionRequired: input.humanDecisionRequired ?? definition.humanDecisionRequired,
      segregationOfDutiesRequired: input.segregationOfDutiesRequired ?? definition.segregationOfDutiesRequired,
      auditLogRequired: true,
      auditLogReferenceId: input.auditLogReferenceId ?? "",
      fraudDetectionRequired: input.fraudDetectionRequired ?? definition.fraudDetectionRequired,
      reasonablenessCheckRequired: input.reasonablenessCheckRequired ?? definition.reasonablenessCheckRequired,
      declineAndWarnRequired: input.declineAndWarnRequired ?? definition.declineAndWarnRequired,
      overrideRequiresDocumentedReason: true,
      overrideReasonPreservedPermanently: true,
      declineReasonPreservedPermanently: true,
      governanceGates: input.governanceGates ?? DEFAULT_GATE_SEQUENCE,
      gateSequence: input.gateSequence ?? DEFAULT_GATE_SEQUENCE,
      failClosedOnGateFailure: true,
      nonExecutionMarkerRequired: true,
      boundPhase38SnapshotHash,
      boundPhase37SnapshotHash,
      phase39StaleMarker: getPhase39StaleMarker(input),
      executable: false,
      executionReady: input.executionReady === true,
      companyId,
      scope: scope as SyntheticAuditScope,
      customerIsolation: customerIsolation as SyntheticMemoryObjectIsolationDimension,
      firmIsolation: firmIsolation as SyntheticMemoryObjectIsolationDimension,
      clientIsolation: clientIsolation as SyntheticMemoryObjectIsolationDimension,
      derivationLineageIds: getInputArray(input.derivationLineageIds),
      derivationMethod: getDerivationMethod(input),
      derivationHash,
      confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
      sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
      evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
      lineageReferenceIds: getInputArray(input.lineageReferenceIds),
      trustMetadata: getInputArray(input.trustMetadata),
      confidenceMetadata: getInputArray(input.confidenceMetadata),
      governanceMetadata: getInputArray(input.governanceMetadata),
      materialityMetadata: getInputArray(input.materialityMetadata),
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
