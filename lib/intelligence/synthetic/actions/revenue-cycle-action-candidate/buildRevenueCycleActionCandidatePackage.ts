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

export type SyntheticRevenueCycleActionType =
  | "insurance_follow_up"
  | "denial_analysis"
  | "denial_appeal"
  | "prior_auth_follow_up"
  | "payment_posting_review"
  | "ar_review"
  | "dso_analysis"
  | "collection_prioritization"
  | "patient_responsibility"
  | "revenue_leakage_detection"
  | "ccr_analysis"
  | "payer_contract_review"
  | "underpayment_analysis"
  | "credit_balance_review"
  | "refund_candidate";

export type SyntheticRevenueCycleActionStatus = "candidate" | "review_ready" | "approved" | "rejected" | "withdrawn";

export const SYNTHETIC_REVENUE_CYCLE_ACTION_TYPES: SyntheticRevenueCycleActionType[] = [
  "insurance_follow_up",
  "denial_analysis",
  "denial_appeal",
  "prior_auth_follow_up",
  "payment_posting_review",
  "ar_review",
  "dso_analysis",
  "collection_prioritization",
  "patient_responsibility",
  "revenue_leakage_detection",
  "ccr_analysis",
  "payer_contract_review",
  "underpayment_analysis",
  "credit_balance_review",
  "refund_candidate",
];

export const SYNTHETIC_REVENUE_CYCLE_ACTION_STATUSES: SyntheticRevenueCycleActionStatus[] = [
  "candidate",
  "review_ready",
  "approved",
  "rejected",
  "withdrawn",
];

export const SYNTHETIC_REVENUE_CYCLE_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildRevenueCycleActionCandidatePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  accountingActionCandidatePackages?: SyntheticAccountingActionCandidatePackage[];
  erpActionCandidatePackages?: SyntheticErpActionCandidatePackage[];
  revenueCycleActionType: SyntheticRevenueCycleActionType;
  revenueCycleActionStatus?: SyntheticRevenueCycleActionStatus;
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  accountingActionCandidatePackageIds?: string[];
  erpActionCandidatePackageIds?: string[];
  payerReferenceIds?: string[];
  claimReferenceIds?: string[];
  denialReferenceIds?: string[];
  appealReferenceIds?: string[];
  priorAuthReferenceIds?: string[];
  arAgingReferenceIds?: string[];
  dsoReferenceIds?: string[];
  collectionReferenceIds?: string[];
  patientReferenceIds?: string[];
  contractReferenceIds?: string[];
  underpaymentReferenceIds?: string[];
  creditBalanceReferenceIds?: string[];
  refundReferenceIds?: string[];
  materialityThresholdReferenceIds?: string[];
  materialityGatePassed?: boolean;
  approvalQuorumRequired?: boolean;
  approvalQuorumSatisfied?: boolean;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalRevenueCycleActionCandidateIds?: string[];
  compensationRevenueCycleActionCandidateIds?: string[];
  alternativeRevenueCycleActionCandidateIds?: string[];
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

export interface SyntheticRevenueCycleActionCandidatePackage {
  revenueCycleActionCandidatePackageId: string;
  revenueCycleActionCandidatePackageKey: string;
  revenueCycleActionType: SyntheticRevenueCycleActionType;
  revenueCycleActionStatus: SyntheticRevenueCycleActionStatus;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  accountingActionCandidatePackageIds: string[];
  erpActionCandidatePackageIds: string[];
  payerReferenceIds: string[];
  claimReferenceIds: string[];
  denialReferenceIds: string[];
  appealReferenceIds: string[];
  priorAuthReferenceIds: string[];
  arAgingReferenceIds: string[];
  dsoReferenceIds: string[];
  collectionReferenceIds: string[];
  patientReferenceIds: string[];
  contractReferenceIds: string[];
  underpaymentReferenceIds: string[];
  creditBalanceReferenceIds: string[];
  refundReferenceIds: string[];
  materialityThresholdReferenceIds: string[];
  materialityGatePassed: boolean;
  approvalQuorumRequired: boolean;
  approvalQuorumSatisfied: boolean;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalRevenueCycleActionCandidateIds: string[];
  compensationRevenueCycleActionCandidateIds: string[];
  alternativeRevenueCycleActionCandidateIds: string[];
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

export interface BuildRevenueCycleActionCandidatePackageResult {
  revenueCycleActionCandidatePackage: SyntheticRevenueCycleActionCandidatePackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

interface ResolvedRevenueCycleActionStatus {
  revenueCycleActionStatus: SyntheticRevenueCycleActionStatus;
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

function isSupportedRevenueCycleActionType(revenueCycleActionType: SyntheticRevenueCycleActionType): boolean {
  return SYNTHETIC_REVENUE_CYCLE_ACTION_TYPES.includes(revenueCycleActionType);
}

function isSupportedRevenueCycleActionStatus(revenueCycleActionStatus: SyntheticRevenueCycleActionStatus): boolean {
  return SYNTHETIC_REVENUE_CYCLE_ACTION_STATUSES.includes(revenueCycleActionStatus);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_REVENUE_CYCLE_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildRevenueCycleActionCandidatePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildRevenueCycleActionCandidatePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildRevenueCycleActionCandidatePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildRevenueCycleActionCandidatePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getAccountingActionCandidatePackages(
  input: BuildRevenueCycleActionCandidatePackageInput,
): SyntheticAccountingActionCandidatePackage[] {
  return getInputArray(input.accountingActionCandidatePackages);
}

function getErpActionCandidatePackages(input: BuildRevenueCycleActionCandidatePackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getActionCandidateIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionCandidateIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.actionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.workflowCandidateIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.workflowCandidateIds),
  ];
}

function getApprovalGovernanceIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.approvalGovernanceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.approvalGovernanceIds),
  ];
}

function getAccountingActionCandidatePackageIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.accountingActionCandidatePackageIds),
    ...getAccountingActionCandidatePackages(input).map(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.accountingActionCandidatePackageId,
    ),
  ];
}

function getErpActionCandidatePackageIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.erpActionCandidatePackageIds),
    ...getErpActionCandidatePackages(input).map((erpActionCandidatePackage) => erpActionCandidatePackage.erpActionCandidatePackageId),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildRevenueCycleActionCandidatePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildRevenueCycleActionCandidatePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildRevenueCycleActionCandidatePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getMaterialityGatePassed(input: BuildRevenueCycleActionCandidatePackageInput): boolean {
  return input.materialityGatePassed === true;
}

function getApprovalQuorumRequired(input: BuildRevenueCycleActionCandidatePackageInput): boolean {
  return input.approvalQuorumRequired === true;
}

function getApprovalQuorumSatisfied(input: BuildRevenueCycleActionCandidatePackageInput): boolean {
  return input.approvalQuorumSatisfied === true;
}

function getRevenueCycleGovernanceSatisfied(input: BuildRevenueCycleActionCandidatePackageInput): boolean {
  const materialitySatisfied = getInputArray(input.materialityThresholdReferenceIds).length === 0 || getMaterialityGatePassed(input);
  const quorumSatisfied = !getApprovalQuorumRequired(input) || getApprovalQuorumSatisfied(input);
  return materialitySatisfied && quorumSatisfied;
}

function resolveRevenueCycleActionStatus(input: BuildRevenueCycleActionCandidatePackageInput): ResolvedRevenueCycleActionStatus {
  const requestedStatus = input.revenueCycleActionStatus ?? "candidate";
  const warnings: string[] = [];

  if (!isSupportedRevenueCycleActionStatus(requestedStatus)) {
    return {
      revenueCycleActionStatus: "candidate",
      warnings: ["revenueCycleActionStatus must be supported; defaulted to candidate."],
    };
  }

  if (requestedStatus === "approved" && !getRevenueCycleGovernanceSatisfied(input)) {
    warnings.push("revenueCycleActionStatus defaulted to candidate because preserved revenue cycle governance gates were not satisfied.");
    return {
      revenueCycleActionStatus: "candidate",
      warnings,
    };
  }

  return {
    revenueCycleActionStatus: requestedStatus,
    warnings,
  };
}

function getExecutionReady(input: BuildRevenueCycleActionCandidatePackageInput): boolean {
  return input.executionReady === true && resolveRevenueCycleActionStatus(input).revenueCycleActionStatus === "approved";
}

function getActionConfidenceFloorMetadata(input: BuildRevenueCycleActionCandidatePackageInput): SyntheticActionConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.actionConfidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.actionConfidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.actionConfidenceFloorMetadata,
    ),
  ];
}

function getSourceKnowledgeConfidenceReferenceIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceKnowledgeConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceKnowledgeConfidenceReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceKnowledgeConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceKnowledgeConfidenceReferenceIds),
  ];
}

function getSourceMethodologyConfidenceReferenceIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceMethodologyConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceMethodologyConfidenceReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceMethodologyConfidenceReferenceIds,
    ),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceMethodologyConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getInputArray(input.payerReferenceIds),
    ...getInputArray(input.claimReferenceIds),
    ...getInputArray(input.denialReferenceIds),
    ...getInputArray(input.appealReferenceIds),
    ...getInputArray(input.priorAuthReferenceIds),
    ...getInputArray(input.arAgingReferenceIds),
    ...getInputArray(input.dsoReferenceIds),
    ...getInputArray(input.collectionReferenceIds),
    ...getInputArray(input.patientReferenceIds),
    ...getInputArray(input.contractReferenceIds),
    ...getInputArray(input.underpaymentReferenceIds),
    ...getInputArray(input.creditBalanceReferenceIds),
    ...getInputArray(input.refundReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.evidenceReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.lineageReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildRevenueCycleActionCandidatePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceFloorMetadata,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.sourceConfidenceReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.sourceConfidenceReferenceIds),
  ];
}

function getPhase37SupersessionReferenceIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37SupersessionReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getAccountingActionCandidatePackages(input).flatMap(
      (accountingActionCandidatePackage) => accountingActionCandidatePackage.phase37StalenessReasonReferenceIds,
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getAccountingActionCandidatePackageIds(input),
    ...getErpActionCandidatePackageIds(input),
    ...getInputArray(input.payerReferenceIds),
    ...getInputArray(input.claimReferenceIds),
    ...getInputArray(input.denialReferenceIds),
    ...getInputArray(input.appealReferenceIds),
    ...getInputArray(input.priorAuthReferenceIds),
    ...getInputArray(input.arAgingReferenceIds),
    ...getInputArray(input.dsoReferenceIds),
    ...getInputArray(input.collectionReferenceIds),
    ...getInputArray(input.patientReferenceIds),
    ...getInputArray(input.contractReferenceIds),
    ...getInputArray(input.underpaymentReferenceIds),
    ...getInputArray(input.creditBalanceReferenceIds),
    ...getInputArray(input.refundReferenceIds),
    ...getInputArray(input.materialityThresholdReferenceIds),
    ...getInputArray(input.riskReferenceIds),
    ...getInputArray(input.riskMetadataReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function buildRevenueCycleActionCandidatePackageKey(input: BuildRevenueCycleActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    revenueCycleActionType: input.revenueCycleActionType,
    revenueCycleActionStatus: resolveRevenueCycleActionStatus(input).revenueCycleActionStatus,
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    payerReferenceIds: getInputArray(input.payerReferenceIds),
    claimReferenceIds: getInputArray(input.claimReferenceIds),
    denialReferenceIds: getInputArray(input.denialReferenceIds),
    appealReferenceIds: getInputArray(input.appealReferenceIds),
    priorAuthReferenceIds: getInputArray(input.priorAuthReferenceIds),
    arAgingReferenceIds: getInputArray(input.arAgingReferenceIds),
    dsoReferenceIds: getInputArray(input.dsoReferenceIds),
    collectionReferenceIds: getInputArray(input.collectionReferenceIds),
    patientReferenceIds: getInputArray(input.patientReferenceIds),
    contractReferenceIds: getInputArray(input.contractReferenceIds),
    underpaymentReferenceIds: getInputArray(input.underpaymentReferenceIds),
    creditBalanceReferenceIds: getInputArray(input.creditBalanceReferenceIds),
    refundReferenceIds: getInputArray(input.refundReferenceIds),
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

function buildRevenueCycleActionCandidatePackageId(input: BuildRevenueCycleActionCandidatePackageInput): string {
  return `synthetic-revenue-cycle-action-candidate-package:${stableSnapshotHash({
    revenueCycleActionCandidatePackageKey: buildRevenueCycleActionCandidatePackageKey(input),
    revenueCycleActionType: input.revenueCycleActionType,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildRevenueCycleActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    revenueCycleActionType: input.revenueCycleActionType,
    revenueCycleActionStatus: resolveRevenueCycleActionStatus(input).revenueCycleActionStatus,
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateRevenueCycleActionCandidatePackageInput(input: BuildRevenueCycleActionCandidatePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!hasValue(input.revenueCycleActionType)) warnings.push("revenueCycleActionType is required.");
  if (!isSupportedRevenueCycleActionType(input.revenueCycleActionType)) warnings.push("revenueCycleActionType must be supported.");
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

export function buildRevenueCycleActionCandidatePackage(
  input: BuildRevenueCycleActionCandidatePackageInput,
): BuildRevenueCycleActionCandidatePackageResult {
  const fatalWarnings = validateRevenueCycleActionCandidatePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      revenueCycleActionCandidatePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const statusResolution = resolveRevenueCycleActionStatus(input);
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
    ...getAccountingActionCandidatePackages(input).flatMap((accountingActionCandidatePackage, index) =>
      accountingActionCandidatePackage.warnings.map((warning) => `accountingActionCandidatePackages[${index}]: ${warning}`),
    ),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage, index) =>
      erpActionCandidatePackage.warnings.map((warning) => `erpActionCandidatePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    revenueCycleActionCandidatePackage: {
      revenueCycleActionCandidatePackageId: buildRevenueCycleActionCandidatePackageId(input),
      revenueCycleActionCandidatePackageKey: buildRevenueCycleActionCandidatePackageKey(input),
      revenueCycleActionType: input.revenueCycleActionType,
      revenueCycleActionStatus: statusResolution.revenueCycleActionStatus,
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      accountingActionCandidatePackageIds: getAccountingActionCandidatePackageIds(input),
      erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
      payerReferenceIds: getInputArray(input.payerReferenceIds),
      claimReferenceIds: getInputArray(input.claimReferenceIds),
      denialReferenceIds: getInputArray(input.denialReferenceIds),
      appealReferenceIds: getInputArray(input.appealReferenceIds),
      priorAuthReferenceIds: getInputArray(input.priorAuthReferenceIds),
      arAgingReferenceIds: getInputArray(input.arAgingReferenceIds),
      dsoReferenceIds: getInputArray(input.dsoReferenceIds),
      collectionReferenceIds: getInputArray(input.collectionReferenceIds),
      patientReferenceIds: getInputArray(input.patientReferenceIds),
      contractReferenceIds: getInputArray(input.contractReferenceIds),
      underpaymentReferenceIds: getInputArray(input.underpaymentReferenceIds),
      creditBalanceReferenceIds: getInputArray(input.creditBalanceReferenceIds),
      refundReferenceIds: getInputArray(input.refundReferenceIds),
      materialityThresholdReferenceIds: getInputArray(input.materialityThresholdReferenceIds),
      materialityGatePassed: getMaterialityGatePassed(input),
      approvalQuorumRequired: getApprovalQuorumRequired(input),
      approvalQuorumSatisfied: getApprovalQuorumSatisfied(input),
      reversibilityClass: input.reversibilityClass,
      reversalRevenueCycleActionCandidateIds: getInputArray(input.reversalRevenueCycleActionCandidateIds),
      compensationRevenueCycleActionCandidateIds: getInputArray(input.compensationRevenueCycleActionCandidateIds),
      alternativeRevenueCycleActionCandidateIds: getInputArray(input.alternativeRevenueCycleActionCandidateIds),
      rejectionReasonReferenceIds: [
        ...getInputArray(input.rejectionReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionReasonReferenceIds,
        ),
      ],
      withdrawalReasonReferenceIds: [
        ...getInputArray(input.withdrawalReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalReasonReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.withdrawalReasonReferenceIds,
        ),
      ],
      rejectionAuthorityReferenceIds: [
        ...getInputArray(input.rejectionAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionAuthorityReferenceIds),
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.rejectionAuthorityReferenceIds,
        ),
      ],
      withdrawalAuthorityReferenceIds: [
        ...getInputArray(input.withdrawalAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalAuthorityReferenceIds),
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
        ...getAccountingActionCandidatePackages(input).flatMap(
          (accountingActionCandidatePackage) => accountingActionCandidatePackage.confidenceMetadata,
        ),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
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
