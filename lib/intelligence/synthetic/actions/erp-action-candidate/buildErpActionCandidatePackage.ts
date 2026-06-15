import { stableSnapshotHash } from "../../../core/hash";
import type {
  SyntheticActionDerivationMethod,
  SyntheticActionReversibilityClass,
  SyntheticPhase38StaleMarker,
} from "../contracts";
import type { SyntheticActionCandidate, SyntheticPhase37ActionHandoffArtifact } from "../action-candidate";
import type { SyntheticWorkflowCandidate } from "../workflow-candidate";
import type { SyntheticApprovalGovernance } from "../approval-package";
import type { SyntheticAutomationGovernancePackage } from "../automation-governance-package";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";

export type SyntheticErpTargetSystem =
  | "quickbooks"
  | "netsuite"
  | "xero"
  | "sage"
  | "dynamics"
  | "csv"
  | "xls"
  | "xml"
  | "generic_import";

export type SyntheticErpActionCandidateStatus = "candidate" | "review_ready" | "approved" | "rejected" | "withdrawn";

export const SYNTHETIC_ERP_TARGET_SYSTEMS: SyntheticErpTargetSystem[] = [
  "quickbooks",
  "netsuite",
  "xero",
  "sage",
  "dynamics",
  "csv",
  "xls",
  "xml",
  "generic_import",
];

export const SYNTHETIC_ERP_ACTION_CANDIDATE_STATUSES: SyntheticErpActionCandidateStatus[] = [
  "candidate",
  "review_ready",
  "approved",
  "rejected",
  "withdrawn",
];

export const SYNTHETIC_ERP_REVERSIBILITY_CLASSES: SyntheticActionReversibilityClass[] = [
  "reversible",
  "compensatable",
  "irreversible",
];

export interface BuildErpActionCandidatePackageInput {
  phase37Handoff: SyntheticPhase37ActionHandoffArtifact | null;
  actionCandidates?: SyntheticActionCandidate[];
  workflowCandidates?: SyntheticWorkflowCandidate[];
  approvalGovernancePackages?: SyntheticApprovalGovernance[];
  automationGovernancePackages?: SyntheticAutomationGovernancePackage[];
  erpTargetSystem: SyntheticErpTargetSystem;
  erpActionType: string;
  erpActionCandidateStatus?: SyntheticErpActionCandidateStatus;
  erpActionCandidateIds?: string[];
  actionCandidateIds?: string[];
  workflowCandidateIds?: string[];
  approvalGovernanceIds?: string[];
  erpEntityReferenceIds?: string[];
  erpAccountReferenceIds?: string[];
  erpDimensionReferenceIds?: string[];
  erpPeriodReferenceIds?: string[];
  erpValidationReferenceIds?: string[];
  erpImportTemplateReferenceIds?: string[];
  erpApiPayloadReferenceIds?: string[];
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalErpActionCandidateIds?: string[];
  compensationErpActionCandidateIds?: string[];
  rejectionReasonReferenceIds?: string[];
  withdrawalReasonReferenceIds?: string[];
  rejectionAuthorityReferenceIds?: string[];
  withdrawalAuthorityReferenceIds?: string[];
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

export interface SyntheticErpActionCandidatePackage {
  erpActionCandidatePackageId: string;
  erpActionCandidatePackageKey: string;
  erpTargetSystem: SyntheticErpTargetSystem;
  erpActionType: string;
  erpActionCandidateStatus: SyntheticErpActionCandidateStatus;
  erpActionCandidateIds: string[];
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  erpEntityReferenceIds: string[];
  erpAccountReferenceIds: string[];
  erpDimensionReferenceIds: string[];
  erpPeriodReferenceIds: string[];
  erpValidationReferenceIds: string[];
  erpImportTemplateReferenceIds: string[];
  erpApiPayloadReferenceIds: string[];
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalErpActionCandidateIds: string[];
  compensationErpActionCandidateIds: string[];
  rejectionReasonReferenceIds: string[];
  withdrawalReasonReferenceIds: string[];
  rejectionAuthorityReferenceIds: string[];
  withdrawalAuthorityReferenceIds: string[];
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

export interface BuildErpActionCandidatePackageResult {
  erpActionCandidatePackage: SyntheticErpActionCandidatePackage | null;
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

function isSupportedErpTargetSystem(erpTargetSystem: SyntheticErpTargetSystem): boolean {
  return SYNTHETIC_ERP_TARGET_SYSTEMS.includes(erpTargetSystem);
}

function getErpActionCandidateStatus(input: BuildErpActionCandidatePackageInput): SyntheticErpActionCandidateStatus {
  return input.erpActionCandidateStatus ?? "candidate";
}

function isSupportedReversibilityClass(reversibilityClass: SyntheticActionReversibilityClass): boolean {
  return SYNTHETIC_ERP_REVERSIBILITY_CLASSES.includes(reversibilityClass);
}

function getPhase37Handoff(input: BuildErpActionCandidatePackageInput): SyntheticPhase37ActionHandoffArtifact | null {
  return input.phase37Handoff;
}

function getActionCandidates(input: BuildErpActionCandidatePackageInput): SyntheticActionCandidate[] {
  return getInputArray(input.actionCandidates);
}

function getWorkflowCandidates(input: BuildErpActionCandidatePackageInput): SyntheticWorkflowCandidate[] {
  return getInputArray(input.workflowCandidates);
}

function getApprovalGovernancePackages(input: BuildErpActionCandidatePackageInput): SyntheticApprovalGovernance[] {
  return getInputArray(input.approvalGovernancePackages);
}

function getAutomationGovernancePackages(input: BuildErpActionCandidatePackageInput): SyntheticAutomationGovernancePackage[] {
  return getInputArray(input.automationGovernancePackages);
}

function getErpActionCandidateIds(input: BuildErpActionCandidatePackageInput): string[] {
  return getInputArray(input.erpActionCandidateIds);
}

function getActionCandidateIds(input: BuildErpActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.actionCandidateIds),
    ...getActionCandidates(input).map((actionCandidate) => actionCandidate.actionCandidateId),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.actionCandidateIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.actionCandidateIds),
  ];
}

function getWorkflowCandidateIds(input: BuildErpActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.workflowCandidateIds),
    ...getWorkflowCandidates(input).map((workflowCandidate) => workflowCandidate.workflowCandidateId),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.workflowCandidateIds),
  ];
}

function getApprovalGovernanceIds(input: BuildErpActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.approvalGovernanceIds),
    ...getApprovalGovernancePackages(input).map((approvalGovernance) => approvalGovernance.approvalGovernanceId),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.approvalGovernanceIds),
  ];
}

function getBoundPhase37SnapshotHash(input: BuildErpActionCandidatePackageInput): string {
  return input.boundPhase37SnapshotHash ?? getPhase37Handoff(input)?.boundPhase37SnapshotHash ?? "";
}

function getPhase38StaleMarker(input: BuildErpActionCandidatePackageInput): SyntheticPhase38StaleMarker {
  return input.phase38StaleMarker ?? getPhase37Handoff(input)?.phase38StaleMarker ?? "current";
}

function getDerivationMethod(input: BuildErpActionCandidatePackageInput): SyntheticActionDerivationMethod {
  return input.derivationMethod ?? "methodology_derived";
}

function getExecutionReady(input: BuildErpActionCandidatePackageInput): boolean {
  return input.executionReady === true && getApprovalGovernanceIds(input).length > 0;
}

function getPhase37SupersessionReferenceIds(input: BuildErpActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37SupersessionReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37SupersessionReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37SupersessionReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37SupersessionReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.phase37SupersessionReferenceIds),
    ...getInputArray(input.phase37SupersessionReferenceIds),
  ];
}

function getPhase37StalenessReasonReferenceIds(input: BuildErpActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(handoff?.phase37StalenessReasonReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.phase37StalenessReasonReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.phase37StalenessReasonReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.phase37StalenessReasonReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.phase37StalenessReasonReferenceIds),
    ...getInputArray(input.phase37StalenessReasonReferenceIds),
  ];
}

function getDerivationLineageIds(input: BuildErpActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.derivationLineageIds),
    ...getErpActionCandidateIds(input),
    ...getActionCandidateIds(input),
    ...getWorkflowCandidateIds(input),
    ...getApprovalGovernanceIds(input),
    ...getInputArray(input.erpEntityReferenceIds),
    ...getInputArray(input.erpAccountReferenceIds),
    ...getInputArray(input.erpDimensionReferenceIds),
    ...getInputArray(input.erpPeriodReferenceIds),
    ...getInputArray(input.erpValidationReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getConfidenceFloorMetadata(input: BuildErpActionCandidatePackageInput): SyntheticKnowledgeConfidenceFloorMetadata[] {
  return [
    ...getInputArray(input.confidenceFloorMetadata),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceFloorMetadata),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceFloorMetadata),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceFloorMetadata),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.confidenceFloorMetadata),
    ...getInputArray(getPhase37Handoff(input)?.confidenceFloorMetadata),
  ];
}

function getSourceConfidenceReferenceIds(input: BuildErpActionCandidatePackageInput): string[] {
  return [
    ...getInputArray(input.sourceConfidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.sourceConfidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.sourceConfidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.sourceConfidenceReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.sourceConfidenceReferenceIds),
  ];
}

function getEvidenceReferenceIds(input: BuildErpActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.evidenceReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.evidenceReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.evidenceReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.evidenceReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.evidenceReferenceIds),
    ...getInputArray(handoff?.sourceEvidenceLineageGraphIds),
  ];
}

function getLineageReferenceIds(input: BuildErpActionCandidatePackageInput): string[] {
  const handoff = getPhase37Handoff(input);
  return [
    ...getInputArray(input.lineageReferenceIds),
    ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.lineageReferenceIds),
    ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.lineageReferenceIds),
    ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.lineageReferenceIds),
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.lineageReferenceIds),
    ...getInputArray(handoff?.sourceKnowledgeObjectIds),
    ...getInputArray(handoff?.sourceMethodologyObjectIds),
    ...getInputArray(handoff?.sourceMemoryObjectIds),
  ];
}

function buildErpActionCandidatePackageKey(input: BuildErpActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    erpTargetSystem: input.erpTargetSystem,
    erpActionType: input.erpActionType,
    erpActionCandidateIds: getErpActionCandidateIds(input),
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    erpEntityReferenceIds: getInputArray(input.erpEntityReferenceIds),
    erpAccountReferenceIds: getInputArray(input.erpAccountReferenceIds),
    erpDimensionReferenceIds: getInputArray(input.erpDimensionReferenceIds),
    erpPeriodReferenceIds: getInputArray(input.erpPeriodReferenceIds),
    erpValidationReferenceIds: getInputArray(input.erpValidationReferenceIds),
    erpImportTemplateReferenceIds: getInputArray(input.erpImportTemplateReferenceIds),
    erpApiPayloadReferenceIds: getInputArray(input.erpApiPayloadReferenceIds),
    reversibilityClass: input.reversibilityClass,
    reversalErpActionCandidateIds: getInputArray(input.reversalErpActionCandidateIds),
    compensationErpActionCandidateIds: getInputArray(input.compensationErpActionCandidateIds),
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

function buildErpActionCandidatePackageId(input: BuildErpActionCandidatePackageInput): string {
  return `synthetic-erp-action-candidate-package:${stableSnapshotHash({
    erpActionCandidatePackageKey: buildErpActionCandidatePackageKey(input),
    erpTargetSystem: input.erpTargetSystem,
    erpActionType: input.erpActionType,
    boundPhase37SnapshotHash: getBoundPhase37SnapshotHash(input),
  })}`;
}

function buildDerivationHash(input: BuildErpActionCandidatePackageInput): string {
  const handoff = getPhase37Handoff(input);
  return stableSnapshotHash({
    derivationMethod: getDerivationMethod(input),
    erpTargetSystem: input.erpTargetSystem,
    erpActionType: input.erpActionType,
    erpActionCandidateIds: getErpActionCandidateIds(input),
    actionCandidateIds: getActionCandidateIds(input),
    workflowCandidateIds: getWorkflowCandidateIds(input),
    approvalGovernanceIds: getApprovalGovernanceIds(input),
    knowledgePackageHandle: handoff?.knowledgePackageHandle ?? null,
    methodologyPackageHandle: handoff?.methodologyPackageHandle ?? null,
    derivationLineageIds: getDerivationLineageIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
  });
}

function validateErpActionCandidatePackageInput(input: BuildErpActionCandidatePackageInput): string[] {
  const warnings: string[] = [];
  const handoff = getPhase37Handoff(input);

  if (!handoff) warnings.push("phase37Handoff is required.");
  if (!hasValue(getBoundPhase37SnapshotHash(input))) warnings.push("boundPhase37SnapshotHash is required.");
  if (!hasValue(input.erpTargetSystem)) warnings.push("erpTargetSystem is required.");
  if (!isSupportedErpTargetSystem(input.erpTargetSystem)) warnings.push("erpTargetSystem must be supported.");
  if (!hasValue(input.erpActionType)) warnings.push("erpActionType is required.");
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

export function buildErpActionCandidatePackage(
  input: BuildErpActionCandidatePackageInput,
): BuildErpActionCandidatePackageResult {
  const fatalWarnings = validateErpActionCandidatePackageInput(input);
  const handoff = getPhase37Handoff(input);

  if (fatalWarnings.length > 0 || !handoff) {
    return {
      erpActionCandidatePackage: null,
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
    ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage, index) =>
      automationGovernancePackage.warnings.map((warning) => `automationGovernancePackages[${index}]: ${warning}`),
    ),
  ];

  return {
    erpActionCandidatePackage: {
      erpActionCandidatePackageId: buildErpActionCandidatePackageId(input),
      erpActionCandidatePackageKey: buildErpActionCandidatePackageKey(input),
      erpTargetSystem: input.erpTargetSystem,
      erpActionType: input.erpActionType,
      erpActionCandidateStatus: getErpActionCandidateStatus(input),
      erpActionCandidateIds: getErpActionCandidateIds(input),
      actionCandidateIds: getActionCandidateIds(input),
      workflowCandidateIds: getWorkflowCandidateIds(input),
      approvalGovernanceIds: getApprovalGovernanceIds(input),
      erpEntityReferenceIds: getInputArray(input.erpEntityReferenceIds),
      erpAccountReferenceIds: getInputArray(input.erpAccountReferenceIds),
      erpDimensionReferenceIds: getInputArray(input.erpDimensionReferenceIds),
      erpPeriodReferenceIds: getInputArray(input.erpPeriodReferenceIds),
      erpValidationReferenceIds: getInputArray(input.erpValidationReferenceIds),
      erpImportTemplateReferenceIds: getInputArray(input.erpImportTemplateReferenceIds),
      erpApiPayloadReferenceIds: getInputArray(input.erpApiPayloadReferenceIds),
      reversibilityClass: input.reversibilityClass,
      reversalErpActionCandidateIds: getInputArray(input.reversalErpActionCandidateIds),
      compensationErpActionCandidateIds: getInputArray(input.compensationErpActionCandidateIds),
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
        ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.trustMetadata),
      ],
      confidenceMetadata: [
        ...getInputArray(handoff.confidenceMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.confidenceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.confidenceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.confidenceMetadata),
        ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.confidenceMetadata),
      ],
      governanceMetadata: [
        ...handoff.governanceMetadata,
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.governanceMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.governanceMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.governanceMetadata),
        ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.governanceMetadata),
      ],
      materialityMetadata: [
        ...getInputArray(handoff.materialityMetadata),
        ...getActionCandidates(input).flatMap((actionCandidate) => actionCandidate.materialityMetadata),
        ...getWorkflowCandidates(input).flatMap((workflowCandidate) => workflowCandidate.materialityMetadata),
        ...getApprovalGovernancePackages(input).flatMap((approvalGovernance) => approvalGovernance.materialityMetadata),
        ...getAutomationGovernancePackages(input).flatMap((automationGovernancePackage) => automationGovernancePackage.materialityMetadata),
      ],
      warnings,
      skippedIndexes: getInputArray(input.skippedIndexes),
    },
    skipped: false,
    warnings,
  };
}
