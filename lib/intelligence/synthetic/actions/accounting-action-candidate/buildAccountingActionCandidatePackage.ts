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

export type SyntheticAccountingActionType =
  | "reconciliation"
  | "journal_entry"
  | "accrual"
  | "prepaid"
  | "fixed_asset"
  | "depreciation"
  | "close_checklist"
  | "audit_support"
  | "workpaper"
  | "flux_analysis"
  | "revenue_review"
  | "margin_review"
  | "exception_escalation"
  | "missing_support_notice"
  | "reclassification"
  | "allocation"
  | "intercompany";

export const SYNTHETIC_ACCOUNTING_ACTION_TYPES: SyntheticAccountingActionType[] = [
  "reconciliation",
  "journal_entry",
  "accrual",
  "prepaid",
  "fixed_asset",
  "depreciation",
  "close_checklist",
  "audit_support",
  "workpaper",
  "flux_analysis",
  "revenue_review",
  "margin_review",
  "exception_escalation",
  "missing_support_notice",
  "reclassification",
  "allocation",
  "intercompany",
];

export const SYNTHETIC_ACCOUNTING_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildAccountingActionCandidatePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  erpActionCandidatePackages?: SyntheticErpActionCandidatePackage[];
  accountingActionType: SyntheticAccountingActionType;
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  erpActionCandidatePackageIds?: string[];
  accountReferenceIds?: string[];
  periodReferenceIds?: string[];
  entityReferenceIds?: string[];
  departmentReferenceIds?: string[];
  evidenceReferenceIds?: string[];
  supportDocumentReferenceIds?: string[];
  reconciliationReferenceIds?: string[];
  workpaperReferenceIds?: string[];
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalAccountingActionCandidateIds?: string[];
  compensationAccountingActionCandidateIds?: string[];
  alternativeAccountingActionCandidateIds?: string[];
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
  lineageReferenceIds?: string[];
  skippedIndexes?: number[];
}

export interface SyntheticAccountingActionCandidatePackage {
  accountingActionCandidatePackageId: string;
  accountingActionCandidatePackageKey: string;
  accountingActionType: SyntheticAccountingActionType;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  erpActionCandidatePackageIds: string[];
  accountReferenceIds: string[];
  periodReferenceIds: string[];
  entityReferenceIds: string[];
  departmentReferenceIds: string[];
  evidenceReferenceIds: string[];
  supportDocumentReferenceIds: string[];
  reconciliationReferenceIds: string[];
  workpaperReferenceIds: string[];
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalAccountingActionCandidateIds: string[];
  compensationAccountingActionCandidateIds: string[];
  alternativeAccountingActionCandidateIds: string[];
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
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface BuildAccountingActionCandidatePackageResult {
  accountingActionCandidatePackage: SyntheticAccountingActionCandidatePackage | null;
  skipped: boolean;
  warnings: string[];
}

type ReferenceRecord = Record<string, unknown>;

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

function isSupportedAccountingActionType(accountingActionType: SyntheticAccountingActionType): boolean {
  return SYNTHETIC_ACCOUNTING_ACTION_TYPES.includes(accountingActionType);
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_ACCOUNTING_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildAccountingActionCandidatePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildAccountingActionCandidatePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildAccountingActionCandidatePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildAccountingActionCandidatePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getErpActionCandidatePackages(input: BuildAccountingActionCandidatePackageInput): SyntheticErpActionCandidatePackage[] {
  return getInputArray(input.erpActionCandidatePackages);
}

function getActionCandidateIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.actionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.workflowCandidateIds),
  ];
}

function getApprovalGovernanceIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.approvalGovernanceIds),
  ];
}

function getErpActionCandidatePackageIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.erpActionCandidatePackageIds),
    ...getErpActionCandidatePackages(input).map((erpActionCandidatePackage) => erpActionCandidatePackage.erpActionCandidatePackageId),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildAccountingActionCandidatePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildAccountingActionCandidatePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildAccountingActionCandidatePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getExecutionReady(input: BuildAccountingActionCandidatePackageInput): boolean {
  return input.executionReady === true && getApprovalGovernanceIds(input).length > 0;
}

function getActionConfidenceFloorMetadata(input: BuildAccountingActionCandidatePackageInput): SyntheticActionConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.actionConfidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.actionConfidenceFloorMetadata),
  ];
}

function getSourceKnowledgeConfidenceReferenceIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceKnowledgeConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceKnowledgeConfidenceReferenceIds),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceKnowledgeConfidenceReferenceIds),
  ];
}

function getSourceMethodologyConfidenceReferenceIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceMethodologyConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceMethodologyConfidenceReferenceIds),
    ...getActionConfidenceFloorMetadata(input).flatMap((metadata) => metadata.sourceMethodologyConfidenceReferenceIds),
  ];
}

function getPhase37SupersessionReferenceIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getErpActionCandidatePackageIds(input),
    ...getInputArray(input.accountReferenceIds),
    ...getInputArray(input.periodReferenceIds),
    ...getInputArray(input.entityReferenceIds),
    ...getInputArray(input.departmentReferenceIds),
    ...getInputArray(input.evidenceReferenceIds),
    ...getInputArray(input.supportDocumentReferenceIds),
    ...getInputArray(input.reconciliationReferenceIds),
    ...getInputArray(input.workpaperReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildAccountingActionCandidatePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.evidenceReferenceIds),
    ...getInputArray(getPhase37Handoff(input)?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildAccountingActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function buildAccountingActionCandidatePackageKey(input: BuildAccountingActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    accountingActionType: input.accountingActionType,
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    accountReferenceIds: getInputArray(input.accountReferenceIds),
    periodReferenceIds: getInputArray(input.periodReferenceIds),
    entityReferenceIds: getInputArray(input.entityReferenceIds),
    departmentReferenceIds: getInputArray(input.departmentReferenceIds),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    supportDocumentReferenceIds: getInputArray(input.supportDocumentReferenceIds),
    reconciliationReferenceIds: getInputArray(input.reconciliationReferenceIds),
    workpaperReferenceIds: getInputArray(input.workpaperReferenceIds),
    reversibilityClass: input.reversibilityClass,
    reversalAccountingActionCandidateIds: getInputArray(input.reversalAccountingActionCandidateIds),
    compensationAccountingActionCandidateIds: getInputArray(input.compensationAccountingActionCandidateIds),
    alternativeAccountingActionCandidateIds: getInputArray(input.alternativeAccountingActionCandidateIds),
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

function buildAccountingActionCandidatePackageId(input: BuildAccountingActionCandidatePackageInput): string {
  return `synthetic-accounting-action-candidate-package:${stableSnapshotHash({
    accountingActionCandidatePackageKey: buildAccountingActionCandidatePackageKey(input),
    accountingActionType: input.accountingActionType,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildAccountingActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    accountingActionType: input.accountingActionType,
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateAccountingActionCandidatePackageInput(input: BuildAccountingActionCandidatePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!hasValue(input.accountingActionType)) warnings.push("accountingActionType is required.");
  if (!isSupportedAccountingActionType(input.accountingActionType)) warnings.push("accountingActionType must be supported.");
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

export function buildAccountingActionCandidatePackage(
  input: BuildAccountingActionCandidatePackageInput,
): BuildAccountingActionCandidatePackageResult {
  const fatalWarnings = validateAccountingActionCandidatePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      accountingActionCandidatePackage: null,
      skipped: true,
      warnings: fatalWarnings,
    };
  }

  const warnings = [
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
    ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage, index) =>
      erpActionCandidatePackage.warnings.map((warning) => `erpActionCandidatePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    accountingActionCandidatePackage: {
      accountingActionCandidatePackageId: buildAccountingActionCandidatePackageId(input),
      accountingActionCandidatePackageKey: buildAccountingActionCandidatePackageKey(input),
      accountingActionType: input.accountingActionType,
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      erpActionCandidatePackageIds: getErpActionCandidatePackageIds(input),
      accountReferenceIds: getInputArray(input.accountReferenceIds),
      periodReferenceIds: getInputArray(input.periodReferenceIds),
      entityReferenceIds: getInputArray(input.entityReferenceIds),
      departmentReferenceIds: getInputArray(input.departmentReferenceIds),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      supportDocumentReferenceIds: getInputArray(input.supportDocumentReferenceIds),
      reconciliationReferenceIds: getInputArray(input.reconciliationReferenceIds),
      workpaperReferenceIds: getInputArray(input.workpaperReferenceIds),
      reversibilityClass: input.reversibilityClass,
      reversalAccountingActionCandidateIds: getInputArray(input.reversalAccountingActionCandidateIds),
      compensationAccountingActionCandidateIds: getInputArray(input.compensationAccountingActionCandidateIds),
      alternativeAccountingActionCandidateIds: getInputArray(input.alternativeAccountingActionCandidateIds),
      rejectionReasonReferenceIds: [
        ...getInputArray(input.rejectionReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionReasonReferenceIds),
      ],
      withdrawalReasonReferenceIds: [
        ...getInputArray(input.withdrawalReasonReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalReasonReferenceIds),
      ],
      rejectionAuthorityReferenceIds: [
        ...getInputArray(input.rejectionAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.rejectionAuthorityReferenceIds),
      ],
      withdrawalAuthorityReferenceIds: [
        ...getInputArray(input.withdrawalAuthorityReferenceIds),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.withdrawalAuthorityReferenceIds),
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
      lineageReferenceIds: getLineageReferenceIds(input),
      trustMetadata: [
        ...handoff.trustMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.trustMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.trustMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.trustMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.trustMetadata),
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.governanceMetadata),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.materialityMetadata),
        ...getErpActionCandidatePackages(input).flatMap((erpActionCandidatePackage) => erpActionCandidatePackage.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
