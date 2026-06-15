import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionConfidenceFloorMetadata,
  SyntheticActionDerivationMethod,
  SyntheticActionReversibilityClass,
  SyntheticPhase38StaleMarker,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type { SyntheticApprovalGovernance } from "../approval-package";
import type { SyntheticRevenueCycleActionCandidatePackage } from "../revenue-cycle-action-candidate";
import type { SyntheticAccountingActionCandidatePackage } from "../accounting-action-candidate";
import type { SyntheticErpActionCandidatePackage } from "../erp-action-candidate";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export type SyntheticHealthcarePpdActionType =
  | "dme_claim_follow_up"
  | "op_claim_follow_up"
  | "prosthetics_claim_follow_up"
  | "prior_auth_follow_up"
  | "denial_analysis"
  | "denial_appeal"
  | "medical_necessity_review"
  | "documentation_review"
  | "cmn_follow_up"
  | "lmn_follow_up"
  | "eligibility_review"
  | "secondary_payer_review"
  | "coordination_of_benefits"
  | "patient_responsibility_review"
  | "refund_candidate"
  | "overpayment_review"
  | "modifier_review"
  | "billing_compliance_review";

export type SyntheticHealthcarePpdActionStatus = "candidate" | "review_ready" | "approved" | "rejected" | "withdrawn";

export const SYNTHETIC_HEALTHCARE_PPD_ACTION_TYPES: SyntheticHealthcarePpdActionType[] = [
  "dme_claim_follow_up",
  "op_claim_follow_up",
  "prosthetics_claim_follow_up",
  "prior_auth_follow_up",
  "denial_analysis",
  "denial_appeal",
  "medical_necessity_review",
  "documentation_review",
  "cmn_follow_up",
  "lmn_follow_up",
  "eligibility_review",
  "secondary_payer_review",
  "coordination_of_benefits",
  "patient_responsibility_review",
  "refund_candidate",
  "overpayment_review",
  "modifier_review",
  "billing_compliance_review",
];

export const SYNTHETIC_HEALTHCARE_PPD_ACTION_STATUSES: SyntheticHealthcarePpdActionStatus[] = [
  "candidate",
  "review_ready",
  "approved",
  "rejected",
  "withdrawn",
];

export const SYNTHETIC_HEALTHCARE_PPD_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildHealthcarePpdActionCandidatePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  revenueCycleActionCandidatePackages?: SyntheticRevenueCycleActionCandidatePackage[];
  accountingActionCandidatePackages?: SyntheticAccountingActionCandidatePackage[];
  erpActionCandidatePackages?: SyntheticErpActionCandidatePackage[];
  healthcarePpdActionType: SyntheticHealthcarePpdActionType;
  healthcarePpdActionStatus?: SyntheticHealthcarePpdActionStatus;
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  revenueCycleActionCandidatePackageIds?: string[];
  accountingActionCandidatePackageIds?: string[];
  erpActionCandidatePackageIds?: string[];
  payerReferenceIds?: string[];
  claimReferenceIds?: string[];
  denialReferenceIds?: string[];
  appealReferenceIds?: string[];
  priorAuthReferenceIds?: string[];
  cmnReferenceIds?: string[];
  lmnReferenceIds?: string[];
  eligibilityReferenceIds?: string[];
  secondaryPayerReferenceIds?: string[];
  cobReferenceIds?: string[];
  patientReferenceIds?: string[];
  modifierReferenceIds?: string[];
  billingComplianceReferenceIds?: string[];
  medicalNecessityReferenceIds?: string[];
  documentationReferenceIds?: string[];
  materialityThresholdReferenceIds?: string[];
  materialityGatePassed?: boolean;
  approvalQuorumRequired?: boolean;
  approvalQuorumSatisfied?: boolean;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalHealthcarePpdActionCandidateIds?: string[];
  compensationHealthcarePpdActionCandidateIds?: string[];
  alternativeHealthcarePpdActionCandidateIds?: string[];
  rejectionReasonReferenceIds?: string[];
  withdrawalReasonReferenceIds?: string[];
  rejectionAuthorityReferenceIds?: string[];
  withdrawalAuthorityReferenceIds?: string[];
  riskReferenceIds?: string[];
  riskMetadataReferenceIds?: string[];
  actionConfidenceFloorMetadata?: SyntheticActionConfidenceFloorMetadata[];
  sourceKnowledgeConfidenceReferenceIds?: string[];
  sourceMethodologyConfidenceReferenceIds?: string[];
  boundPhase37SnapshotHash?: string;
  phase37SupersessionReferenceIds?: string[];
  phase37StalenessReasonReferenceIds?: string[];
  phase38StaleMarker?: SyntheticPhase38StaleMarker;
  executionReady?: boolean;
  derivationLineageIds?: string[];
  derivationMethod?: SyntheticActionDerivationMethod;
  confidenceFloorMetadata?: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  lineageReferenceIds?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticHealthcarePpdActionCandidatePackage {
  healthcarePpdActionCandidatePackageId: string;
  healthcarePpdActionCandidatePackageKey: string;
  healthcarePpdActionType: SyntheticHealthcarePpdActionType;
  healthcarePpdActionStatus: SyntheticHealthcarePpdActionStatus;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  revenueCycleActionCandidatePackageIds: string[];
  accountingActionCandidatePackageIds: string[];
  erpActionCandidatePackageIds: string[];
  payerReferenceIds: string[];
  claimReferenceIds: string[];
  denialReferenceIds: string[];
  appealReferenceIds: string[];
  priorAuthReferenceIds: string[];
  cmnReferenceIds: string[];
  lmnReferenceIds: string[];
  eligibilityReferenceIds: string[];
  secondaryPayerReferenceIds: string[];
  cobReferenceIds: string[];
  patientReferenceIds: string[];
  modifierReferenceIds: string[];
  billingComplianceReferenceIds: string[];
  medicalNecessityReferenceIds: string[];
  documentationReferenceIds: string[];
  materialityThresholdReferenceIds: string[];
  materialityGatePassed: boolean;
  approvalQuorumRequired: boolean;
  approvalQuorumSatisfied: boolean;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalHealthcarePpdActionCandidateIds: string[];
  compensationHealthcarePpdActionCandidateIds: string[];
  alternativeHealthcarePpdActionCandidateIds: string[];
  rejectionReasonReferenceIds: string[];
  withdrawalReasonReferenceIds: string[];
  rejectionAuthorityReferenceIds: string[];
  withdrawalAuthorityReferenceIds: string[];
  riskReferenceIds: string[];
  riskMetadataReferenceIds: string[];
  actionConfidenceFloorMetadata: SyntheticActionConfidenceFloorMetadata[];
  sourceKnowledgeConfidenceReferenceIds: string[];
  sourceMethodologyConfidenceReferenceIds: string[];
  boundPhase37SnapshotHash: string;
  boundPhase37KnowledgeGraphSnapshotHash: string;
  boundPhase37MethodologySnapshotHash: string;
  phase37SupersessionReferenceIds: string[];
  phase37StalenessReasonReferenceIds: string[];
  phase38StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  executionReadyIsExecutionAuthority: false;
  phase38Executes: false;
  phase39RequiredForExecution: true;
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

export interface BuildHealthcarePpdActionCandidatePackageResult {
  healthcarePpdActionCandidatePackage: SyntheticHealthcarePpdActionCandidatePackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

interface ResolvedHealthcarePpdActionStatus {
  healthcarePpdActionStatus: SyntheticHealthcarePpdActionStatus;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as ReferenceRecord)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function isSupportedHealthcarePpdActionType(healthcarePpdActionType: SyntheticHealthcarePpdActionType): boolean {
  return SYNTHETIC_HEALTHCARE_PPD_ACTION_TYPES.includes(healthcarePpdActionType);
}

function isSupportedHealthcarePpdActionStatus(healthcarePpdActionStatus: SyntheticHealthcarePpdActionStatus): boolean {
  return SYNTHETIC_HEALTHCARE_PPD_ACTION_STATUSES.includes(healthcarePpdActionStatus);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_HEALTHCARE_PPD_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildHealthcarePpdActionCandidatePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildHealthcarePpdActionCandidatePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildHealthcarePpdActionCandidatePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildHealthcarePpdActionCandidatePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getRevenueCycleActionCandidatePackages(
  input: BuildHealthcarePpdActionCandidatePackageInput,
): SyntheticRevenueCycleActionCandidatePackage[] {
  return getInputArray(input.revenueCycleActionCandidatePackages);
}

function getAccountingActionCandidatePackages(
  input: BuildHealthcarePpdActionCandidatePackageInput,
): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getErpActionCandidatePackages(input: BuildHealthcarePpdActionCandidatePackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getActionCandidateIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.actionCandidateIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionCandidateIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.actionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.workflowCandidateIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.workflowCandidateIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.workflowCandidateIds),
  ];
}

function getApprovalGovernanceIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.approvalGovernanceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.approvalGovernanceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.approvalGovernanceIds),
  ];
}

function getRevenueCycleActionCandidatePackageIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.revenueCycleActionCandidatePackageIds),
    ...getRevenueCycleActionCandidatePackages(input).map(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.revenueCycleActionCandidatePackageId,
    ),
  ];
}

function getAccountingActionCandidatePackageIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.accountingActionCandidatePackageIds),
    ...getAccountingActionCandidatePackages(input).map(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.accountingActionCandidatePackageId,
    ),
  ];
}

function getErpActionCandidatePackageIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.erpActionCandidatePackageIds),
    ...getErpActionCandidatePackages(input).map((erpActionCandidatePackage) => erpActionCandidatePackage.erpActionCandidatePackageId),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildHealthcarePpdActionCandidatePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildHealthcarePpdActionCandidatePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildHealthcarePpdActionCandidatePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getMaterialityGatePassed(input: BuildHealthcarePpdActionCandidatePackageInput): boolean {
  return input.materialityGatePassed === true;
}

function getApprovalQuorumRequired(input: BuildHealthcarePpdActionCandidatePackageInput): boolean {
  return input.approvalQuorumRequired === true;
}

function getApprovalQuorumSatisfied(input: BuildHealthcarePpdActionCandidatePackageInput): boolean {
  return input.approvalQuorumSatisfied === true;
}

function getHealthcarePpdGovernanceSatisfied(input: BuildHealthcarePpdActionCandidatePackageInput): boolean {
  const materialitySatisfied = getInputArray(input.materialityThresholdReferenceIds).length === 0 || getMaterialityGatePassed(input);
  const quorumSatisfied = !getApprovalQuorumRequired(input) || getApprovalQuorumSatisfied(input);
  return materialitySatisfied && quorumSatisfied;
}

function resolveHealthcarePpdActionStatus(input: BuildHealthcarePpdActionCandidatePackageInput): ResolvedHealthcarePpdActionStatus {
  const requestedStatus = input.healthcarePpdActionStatus ?? "candidate";
  const warnings: string[] = [];

  if (!isSupportedHealthcarePpdActionStatus(requestedStatus)) {
    return {
      healthcarePpdActionStatus: "candidate",
      warnings: ["healthcarePpdActionStatus must be supported; defaulted to candidate."],
    };
  }

  if (requestedStatus === "approved" && !getHealthcarePpdGovernanceSatisfied(input)) {
    warnings.push("healthcarePpdActionStatus defaulted to candidate because preserved healthcare PPD governance gates were not satisfied.");
    return {
      healthcarePpdActionStatus: "candidate",
      warnings,
    };
  }

  return {
    healthcarePpdActionStatus: requestedStatus,
    warnings,
  };
}

function getExecutionReady(input: BuildHealthcarePpdActionCandidatePackageInput): boolean {
  return input.executionReady === true && resolveHealthcarePpdActionStatus(input).healthcarePpdActionStatus === "approved";
}

function getActionConfidenceFloorMetadata(input: BuildHealthcarePpdActionCandidatePackageInput): SyntheticActionConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.actionConfidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.actionConfidenceFloorMetadata),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.actionConfidenceFloorMetadata,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionConfidenceFloorMetadata,
    ),
  ];
}

function getSourceKnowledgeConfidenceReferenceIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceKnowledgeConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceKnowledgeConfidenceReferenceIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceKnowledgeConfidenceReferenceIds),
  ];
}

function getSourceMethodologyConfidenceReferenceIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceMethodologyConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceMethodologyConfidenceReferenceIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceMethodologyConfidenceReferenceIds),
  ];
}

function getPpdReferenceIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.payerReferenceIds),
    ...getInputArray(input.claimReferenceIds),
    ...getInputArray(input.denialReferenceIds),
    ...getInputArray(input.appealReferenceIds),
    ...getInputArray(input.priorAuthReferenceIds),
    ...getInputArray(input.cmnReferenceIds),
    ...getInputArray(input.lmnReferenceIds),
    ...getInputArray(input.eligibilityReferenceIds),
    ...getInputArray(input.secondaryPayerReferenceIds),
    ...getInputArray(input.cobReferenceIds),
    ...getInputArray(input.patientReferenceIds),
    ...getInputArray(input.modifierReferenceIds),
    ...getInputArray(input.billingComplianceReferenceIds),
    ...getInputArray(input.medicalNecessityReferenceIds),
    ...getInputArray(input.documentationReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getPpdReferenceIds(input),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.evidenceReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.evidenceReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.lineageReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.lineageReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildHealthcarePpdActionCandidatePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.confidenceFloorMetadata,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceFloorMetadata,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.sourceConfidenceReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceConfidenceReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.sourceConfidenceReferenceIds),
  ];
}

function getPhase37SupersessionReferenceIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.phase37SupersessionReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37SupersessionReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getRevenueCycleActionCandidatePackages(input).flatMap(
      (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.phase37StalenessReasonReferenceIds,
    ),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37StalenessReasonReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getRevenueCycleActionCandidatePackageIds(input),
    ...getAccountingActionCandidatePackageIds(input),
    ...getErpActionCandidatePackageIds(input),
    ...getPpdReferenceIds(input),
    ...getInputArray(input.materialityThresholdReferenceIds),
    ...getInputArray(input.riskReferenceIds),
    ...getInputArray(input.riskMetadataReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function buildHealthcarePpdActionCandidatePackageKey(input: BuildHealthcarePpdActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    healthcarePpdActionType: input.healthcarePpdActionType,
    healthcarePpdActionStatus: resolveHealthcarePpdActionStatus(input).healthcarePpdActionStatus,
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    revenueCycleActionCandidatePackageIds: getRevenueCycleActionCandidatePackageIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    payerReferenceIds: getInputArray(input.payerReferenceIds),
    claimReferenceIds: getInputArray(input.claimReferenceIds),
    denialReferenceIds: getInputArray(input.denialReferenceIds),
    appealReferenceIds: getInputArray(input.appealReferenceIds),
    priorAuthReferenceIds: getInputArray(input.priorAuthReferenceIds),
    cmnReferenceIds: getInputArray(input.cmnReferenceIds),
    lmnReferenceIds: getInputArray(input.lmnReferenceIds),
    eligibilityReferenceIds: getInputArray(input.eligibilityReferenceIds),
    secondaryPayerReferenceIds: getInputArray(input.secondaryPayerReferenceIds),
    cobReferenceIds: getInputArray(input.cobReferenceIds),
    patientReferenceIds: getInputArray(input.patientReferenceIds),
    modifierReferenceIds: getInputArray(input.modifierReferenceIds),
    billingComplianceReferenceIds: getInputArray(input.billingComplianceReferenceIds),
    medicalNecessityReferenceIds: getInputArray(input.medicalNecessityReferenceIds),
    documentationReferenceIds: getInputArray(input.documentationReferenceIds),
    materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
    materialityGatePassed: getMaterialityGatePassed(input),
    approvalQuorumRequired: getApprovalQuorumRequired(input),
    approvalQuorumSatisfied: getApprovalQuorumSatisfied(input),
    reversibilityClass: input.reversibilityClass,
    riskReferenceIds: getInputArray(input.riskReferenceIds),
    riskMetadataReferenceIds: getInputArray(input.riskMetadataReferenceIds),
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
    boundPhase37KnowledgeGraphSnapshotHash: handoff?.knowledgeGraphSnapshotHash ?? null,
    boundPhase37MethodologySnapshotHash: handoff?.methodologySnapshotHash ?? null,
    companyId: handoff?.companyId ?? null,
    scope: handoff?.scope ?? null,
    customerIsolation: handoff?.customerIsolation ?? null,
    firmIsolation: handoff?.firmIsolation ?? null,
    clientIsolation: handoff?.clientIsolation ?? null,
  });
}

function buildHealthcarePpdActionCandidatePackageId(input: BuildHealthcarePpdActionCandidatePackageInput): string {
  return `synthetic-healthcare-ppd-action-candidate-package:${stableSnapshotHash({
    healthcarePpdActionCandidatePackageKey: buildHealthcarePpdActionCandidatePackageKey(input),
    healthcarePpdActionType: input.healthcarePpdActionType,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildHealthcarePpdActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    healthcarePpdActionType: input.healthcarePpdActionType,
    healthcarePpdActionStatus: resolveHealthcarePpdActionStatus(input).healthcarePpdActionStatus,
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateHealthcarePpdActionCandidatePackageInput(input: BuildHealthcarePpdActionCandidatePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!hasValue(input.healthcarePpdActionType)) warnings.push("healthcarePpdActionType is required.");
  if (!isSupportedHealthcarePpdActionType(input.healthcarePpdActionType)) warnings.push("healthcarePpdActionType must be supported.");
  if (!hasValue(input.reversibilityClass)) warnings.push("reversibilityClass is required.");
  if (!isSupportedReversibilityClass(input.reversibilityClass)) warnings.push("reversibilityClass must be supported.");
  if (!handoff) return warnings;

  if (!hasValue(handoff.companyId)) warnings.push("phase37Handoff.companyId is required.");
  if (!handoff.scope) warnings.push("phase37Handoff.scope is required.");
  if (!hasValue(handoff.knowledgeGraphSnapshotHash)) warnings.push("phase37Handoff.knowledgeGraphSnapshotHash is required.");
  if (!hasValue(handoff.methodologySnapshotHash)) warnings.push("phase37Handoff.methodologySnapshotHash is required.");
  if (handoff.phase38MayConsume !== true) warnings.push("phase37Handoff.phase38MayConsume must be true.");
  if (handoff.phase38MayMutate !== false) warnings.push("phase37Handoff.phase38MayMutate must be false.");
  if (handoff.phase38MayWriteBack !== false) warnings.push("phase37Handoff.phase38MayWriteBack must be false.");

  getActionCandidates(input).forEach((actionCandidate, index) => {
    if (!hasValue(actionCandidate.actionCandidateId)) warnings.push(`actionCandidates[${index}].actionCandidateId is required.`);
    if (actionCandidate.executable !== false) warnings.push(`actionCandidates[${index}].executable must be false.`);
    if (actionCandidate.companyId !== handoff.companyId) warnings.push(`actionCandidates[${index}].companyId must equal phase37Handoff.companyId.`);
  });

  getWorkflowCandidates(input).forEach((workflowCandidate, index) => {
    if (!hasValue(workflowCandidate.workflowCandidateId)) warnings.push(`workflowCandidates[${index}].workflowCandidateId is required.`);
    if (workflowCandidate.executable !== false) warnings.push(`workflowCandidates[${index}].executable must be false.`);
    if (workflowCandidate.companyId !== handoff.companyId) warnings.push(`workflowCandidates[${index}].companyId must equal phase37Handoff.companyId.`);
  });

  return warnings;
}

export function buildHealthcarePpdActionCandidatePackage(
  input: BuildHealthcarePpdActionCandidatePackageInput,
): BuildHealthcarePpdActionCandidatePackageResult {
  const fatalWarnings = validateHealthcarePpdActionCandidatePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      healthcarePpdActionCandidatePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const statusResolution = resolveHealthcarePpdActionStatus(input);
  const warnings = [
    ...statusResolution.warnings,
    ...getStringArrayProperty(handoff, "warnings").map((warning) => `phase37Handoff: ${warning}`),
    ...getActionCandidates(input).flatMap((actionCandidate, index) =>
      actionCandidate.warnings.map((warning) => `actionCandidates[${index}]: ${warning}`),
    ),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate, index) =>
      workflowCandidate.warnings.map((warning) => `workflowCandidates[${index}]: ${warning}`),
    ),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance, index) =>
      approvalGovernance.warnings.map((warning) => `approvalGovernancePackages[${index}]: ${warning}`),
    ),
    ...getRevenueCycleActionCandidatePackages(input).flatMap((revenueCycleActionCandidatePackage, index) =>
      revenueCycleActionCandidatePackage.warnings.map((warning) => `revenueCycleActionCandidatePackages[${index}]: ${warning}`),
    ),
    ...getAccountingActionCandidatePackages(input).flatMap((accountingActionCandidatePackage, index) =>
      accountingActionCandidatePackage.warnings.map((warning) => `accountingActionCandidatePackages[${index}]: ${warning}`),
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage, index) =>
      erpActionCandidatePackage.warnings.map((warning) => `erpActionCandidatePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    healthcarePpdActionCandidatePackage: {
      healthcarePpdActionCandidatePackageId: buildHealthcarePpdActionCandidatePackageId(input),
      healthcarePpdActionCandidatePackageKey: buildHealthcarePpdActionCandidatePackageKey(input),
      healthcarePpdActionType: input.healthcarePpdActionType,
      healthcarePpdActionStatus: statusResolution.healthcarePpdActionStatus,
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      revenueCycleActionCandidatePackageIds: getRevenueCycleActionCandidatePackageIds(input),
      accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
      erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
      payerReferenceIds: getInputArray(input.payerReferenceIds),
      claimReferenceIds: getInputArray(input.claimReferenceIds),
      denialReferenceIds: getInputArray(input.denialReferenceIds),
      appealReferenceIds: getInputArray(input.appealReferenceIds),
      priorAuthReferenceIds: getInputArray(input.priorAuthReferenceIds),
      cmnReferenceIds: getInputArray(input.cmnReferenceIds),
      lmnReferenceIds: getInputArray(input.lmnReferenceIds),
      eligibilityReferenceIds: getInputArray(input.eligibilityReferenceIds),
      secondaryPayerReferenceIds: getInputArray(input.secondaryPayerReferenceIds),
      cobReferenceIds: getInputArray(input.cobReferenceIds),
      patientReferenceIds: getInputArray(input.patientReferenceIds),
      modifierReferenceIds: getInputArray(input.modifierReferenceIds),
      billingComplianceReferenceIds: getInputArray(input.billingComplianceReferenceIds),
      medicalNecessityReferenceIds: getInputArray(input.medicalNecessityReferenceIds),
      documentationReferenceIds: getInputArray(input.documentationReferenceIds),
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      materialityGatePassed: getMaterialityGatePassed(input),
      approvalQuorumRequired: getApprovalQuorumRequired(input),
      approvalQuorumSatisfied: getApprovalQuorumSatisfied(input),
      reversibilityClass: input.reversibilityClass,
      reversalHealthcarePpdActionCandidateIds: getInputArray(input.reversalHealthcarePpdActionCandidateIds),
      compensationHealthcarePpdActionCandidateIds: getInputArray(input.compensationHealthcarePpdActionCandidateIds),
      alternativeHealthcarePpdActionCandidateIds: getInputArray(input.alternativeHealthcarePpdActionCandidateIds),
      rejectionReasonReferenceIds: [
        ...getInputArray(input.rejectionReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionReasonReferenceIds),
        ...getRevenueCycleActionCandidatePackages(input).flatMap(
          (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.rejectionReasonReferenceIds,
        ),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionReasonReferenceIds,
        ),
      ],
      withdrawalReasonReferenceIds: [
        ...getInputArray(input.withdrawalReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalReasonReferenceIds),
        ...getRevenueCycleActionCandidatePackages(input).flatMap(
          (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.withdrawalReasonReferenceIds,
        ),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.withdrawalReasonReferenceIds,
        ),
      ],
      rejectionAuthorityReferenceIds: [
        ...getInputArray(input.rejectionAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionAuthorityReferenceIds),
        ...getRevenueCycleActionCandidatePackages(input).flatMap(
          (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.rejectionAuthorityReferenceIds,
        ),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionAuthorityReferenceIds,
        ),
      ],
      withdrawalAuthorityReferenceIds: [
        ...getInputArray(input.withdrawalAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalAuthorityReferenceIds),
        ...getRevenueCycleActionCandidatePackages(input).flatMap(
          (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.withdrawalAuthorityReferenceIds,
        ),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.withdrawalAuthorityReferenceIds,
        ),
      ],
      riskReferenceIds: getInputArray(input.riskReferenceIds),
      riskMetadataReferenceIds: getInputArray(input.riskMetadataReferenceIds),
      actionConfidenceFloorMetadata: getActionConfidenceFloorMetadata(input),
      sourceKnowledgeConfidenceReferenceIds: getSourceKnowledgeConfidenceReferenceIds(input),
      sourceMethodologyConfidenceReferenceIds: getSourceMethodologyConfidenceReferenceIds(input),
      boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
      boundPhase37KnowledgeGraphSnapshotHash: handoff.knowledgeGraphSnapshotHash,
      boundPhase37MethodologySnapshotHash: handoff.methodologySnapshotHash,
      phase37SupersessionReferenceIds: getPhase37SupersessionReferenceIds(input),
      phase37StalenessReasonReferenceIds: getPhase37StalenessReasonReferenceIds(input),
      phase38StaleMarker: getPhase38StaleMarker(input),
      executable: false,
      executionReady: getExecutionReady(input),
      executionReadyIsExecutionAuthority: false,
      phase38Executes: false,
      phase39RequiredForExecution: true,
      companyId: handoff.companyId,
      scope: handoff.scope,
      customerIsolation: handoff.customerIsolation,
      firmIsolation: handoff.firmIsolation,
      clientIsolation: handoff.clientIsolation,
      derivationLineageIds: getDerivationLineageIds(input),
      derivationMethod: getDerivationMethod(input),
      derivationHash: buildDerivationHash(input),
      confidenceFloorMetadata: getConfidenceFloorMetadata(input),
      sourceConfidenceReferenceIds: getSourceConfidenceReferenceIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      trustMetadata: [
        ...handoff.trustMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.trustMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.trustMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.trustMetadata),
        ...getRevenueCycleActionCandidatePackages(input).flatMap(
          (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.trustMetadata,
        ),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.trustMetadata,
        ),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.trustMetadata),
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceMetadata),
        ...getRevenueCycleActionCandidatePackages(input).flatMap(
          (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.confidenceMetadata,
        ),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceMetadata,
        ),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
        ...getRevenueCycleActionCandidatePackages(input).flatMap(
          (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.governanceMetadata,
        ),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.governanceMetadata,
        ),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.governanceMetadata),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.materialityMetadata),
        ...getRevenueCycleActionCandidatePackages(input).flatMap(
          (revenueCycleActionCandidatePackage) => revenueCycleActionCandidatePackage.materialityMetadata,
        ),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.materialityMetadata,
        ),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
