import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts/knowledgeContracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";

export type SyntheticActionTriggerCategory =
  | "methodology_derived"
  | "knowledge_pattern_derived"
  | "memory_continuity_derived"
  | "user_request_derived"
  | "cross_period_derived"
  | "cross_entity_derived"
  | "cross_function_derived";

export type SyntheticWorkflowTriggerCategory = SyntheticActionTriggerCategory;

export type SyntheticActionReversibilityClass = "reversible" | "compensatable" | "irreversible";

export type SyntheticPhase38StaleMarker = "current" | "stale" | "superseded" | "withdrawn" | "rejected";

export type SyntheticApprovalStatus =
  | "approval_not_required"
  | "approval_required"
  | "approval_pending"
  | "approval_satisfied"
  | "approval_rejected"
  | "approval_withdrawn"
  | "approval_invalidated";

export type SyntheticActionDerivationMethod =
  | "methodology_derived"
  | "knowledge_pattern_derived"
  | "memory_continuity_derived"
  | "user_request_derived"
  | "cross_period_derived"
  | "cross_entity_derived"
  | "cross_function_derived"
  | "approval_governance_preservation"
  | "execution_readiness_preservation"
  | "simulation_metadata_preservation"
  | "bundle_metadata_preservation"
  | "handoff_metadata_preservation";

export interface SyntheticActionConfidenceFloorMetadata {
  actionConfidenceFloorReferenceIds: string[];
  sourceKnowledgeConfidenceReferenceIds: string[];
  sourceMethodologyConfidenceReferenceIds: string[];
  confidenceFloorBasis: "minimum_source_knowledge_methodology_confidence" | "unknown_preserved";
}

export interface SyntheticPhase38SnapshotBindingContract {
  boundPhase37SnapshotHash: string;
  boundPhase37KnowledgeGraphSnapshotHash: string;
  boundPhase37MethodologySnapshotHash: string;
  phase37SupersessionReferenceIds: string[];
  phase37StalenessReasonReferenceIds: string[];
  phase38StaleMarker: SyntheticPhase38StaleMarker;
}

export interface SyntheticPhase38IsolationContract {
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
}

export interface SyntheticPhase38NonExecutionContract {
  executable: false;
  executionReady: boolean;
  executionReadyIsExecutionAuthority: false;
  phase38Executes: false;
  phase39RequiredForExecution: true;
}

export interface SyntheticPhase38DeterminismContract {
  hashFunction: "stableSnapshotHash";
  hashImportPath: "lib/intelligence/core/hash";
  identicalInputsProduceIdenticalIds: true;
  identicalInputsProduceIdenticalKeys: true;
  identicalInputsProduceIdenticalHashes: true;
  identicalInputsProduceIdenticalOrdering: true;
  runtimeDependentOutputsAllowed: false;
}

export interface SyntheticPhase38InvalidInputContract {
  artifact: null;
  skipped: true;
  warnings: string[];
  failClosed: true;
}

export interface SyntheticPhase38CollectionContract {
  skippedIndexes: number[];
  warnings: string[];
  preservesInputOrder: true;
}

export interface SyntheticPhase38GovernanceRuleContract {
  selfApprovalPermitted: false;
  quorumBypassPermitted: false;
  liveAuthorityValidationPermitted: false;
  liveSystemCallsPermitted: false;
  confidenceScoringPermitted: false;
  riskScoringPermitted: false;
  materialityCalculationPermitted: false;
  supersessionMode: "additive_metadata_only";
  rejectionAndWithdrawalHistoryMode: "additive_metadata_only";
  executionReadyRequiresAllGovernanceGates: true;
}

export interface SyntheticActionCandidateContract extends SyntheticPhase38NonExecutionContract, SyntheticPhase38SnapshotBindingContract {
  actionCandidateId: string;
  actionCandidateKey: string;
  actionTriggerCategory: SyntheticActionTriggerCategory;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalActionCandidateIds: string[];
  compensationActionCandidateIds: string[];
  alternativeActionCandidateIds: string[];
  counterfactualActionCandidateIds: string[];
  mutuallyExclusiveActionCandidateIds: string[];
  riskReferenceIds: string[];
  riskMetadataReferenceIds: string[];
  rejectionReasonReferenceIds: string[];
  withdrawalReasonReferenceIds: string[];
  rejectionAuthorityReferenceIds: string[];
  withdrawalAuthorityReferenceIds: string[];
  actionConfidenceFloorMetadata: SyntheticActionConfidenceFloorMetadata[];
  sourceKnowledgeConfidenceReferenceIds: string[];
  sourceMethodologyConfidenceReferenceIds: string[];
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

export interface SyntheticWorkflowCandidateContract extends SyntheticPhase38NonExecutionContract {
  workflowCandidateId: string;
  workflowCandidateKey: string;
  actionCandidateIds: string[];
  workflowTriggerCategory: SyntheticWorkflowTriggerCategory;
  reversibilityClass: SyntheticActionReversibilityClass;
  reversalWorkflowCandidateIds: string[];
  compensationWorkflowCandidateIds: string[];
  alternativeWorkflowCandidateIds: string[];
  riskReferenceIds: string[];
  rejectionReasonReferenceIds: string[];
  withdrawalReasonReferenceIds: string[];
  boundPhase37SnapshotHash: string;
  boundPhase37MethodologySnapshotHash: string;
  phase38StaleMarker: SyntheticPhase38StaleMarker;
  companyId: string;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationLineageIds: string[];
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface SyntheticApprovalGovernanceContract {
  approvalGovernanceId: string;
  approvalGovernanceKey: string;
  approvalRequired: boolean;
  approvalStatus: SyntheticApprovalStatus;
  approvalQuorumRequired: boolean;
  approvalQuorumSatisfied: boolean;
  segregationOfDutiesRequired: boolean;
  segregationOfDutiesSatisfied: boolean;
  conflictOfInterestCheckRequired: boolean;
  conflictOfInterestCheckSatisfied: boolean;
  materialityThresholdReferenceIds: string[];
  materialityGatePassed: boolean;
  approvalAuthorityHierarchyReferenceIds: string[];
  approvalDelegationChainReferenceIds: string[];
  approvalDelegationSnapshotHash: string;
  approvalAuthoritySnapshotHash: string;
  approvalValidForSnapshotHash: string;
  approvalInvalidated: boolean;
  approvalInvalidationReasonReferenceIds: string[];
  approvalAuthorityReferenceIds: string[];
  approvalPolicyReferenceIds: string[];
  approvalLineageIds: string[];
  boundPhase37SnapshotHash: string;
  phase38StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  companyId: string;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  warnings: string[];
  skippedIndexes: number[];
}

export interface SyntheticExecutionReadinessContract {
  executionReadinessId: string;
  executionReadinessKey: string;
  executionReady: boolean;
  readinessGatesPassed: boolean;
  approvalGatePassed: boolean;
  quorumGatePassed: boolean;
  segregationOfDutiesGatePassed: boolean;
  conflictCheckGatePassed: boolean;
  materialityGatePassed: boolean;
  governanceGatePassed: boolean;
  actionCandidateIds: string[];
  workflowCandidateIds: string[];
  approvalGovernanceIds: string[];
  boundPhase37SnapshotHash: string;
  boundPhase37KnowledgeGraphSnapshotHash: string;
  boundPhase37MethodologySnapshotHash: string;
  phase38StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  companyId: string;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationHash: string;
  warnings: string[];
  skippedIndexes: number[];
}

export interface SyntheticSimulationPackageContract {
  simulationPackageId: string;
  simulationPackageKey: string;
  simulatedActionCandidateIds: string[];
  simulatedWorkflowCandidateIds: string[];
  simulationLineageIds: string[];
  simulationEvidenceReferenceIds: string[];
  simulationKnowledgeReferenceIds: string[];
  simulationMethodologyReferenceIds: string[];
  simulationDeterminismHash: string;
  simulationInputReferenceIds: string[];
  simulationAssumptionReferenceIds: string[];
  simulationOutputReferenceIds: string[];
  boundPhase37SnapshotHash: string;
  phase38StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: false;
  companyId: string;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationHash: string;
  warnings: string[];
  skippedIndexes: number[];
}

export interface SyntheticActionBundlePackageContract extends SyntheticPhase38NonExecutionContract {
  actionBundlePackageId: string;
  actionBundlePackageKey: string;
  bundleActionCandidateIds: string[];
  bundleWorkflowCandidateIds: string[];
  bundleApprovalAtomicityRequired: boolean;
  bundleAtomicityRequired: boolean;
  bundleRollbackPolicyReferenceIds: string[];
  approvalGovernanceIds: string[];
  boundPhase37SnapshotHash: string;
  phase38StaleMarker: SyntheticPhase38StaleMarker;
  companyId: string;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  derivationHash: string;
  warnings: string[];
  skippedIndexes: number[];
}

export interface Phase39ExecutionHandoff {
  handoffId: string;
  handoffKey: string;
  actionHandoffHandle: string;
  executionHandoffHandle: string;
  approvedActionCandidateIds: string[];
  approvedWorkflowCandidateIds: string[];
  approvedErpActionCandidateIds: string[];
  approvedJournalEntryCandidateIds: string[];
  approvalPackageIds: string[];
  automationGovernancePackageIds: string[];
  actionControlPackageIds: string[];
  boundPhase37SnapshotHash: string;
  boundPhase38SnapshotHash: string;
  executable: false;
  executionReady: boolean;
  companyId: string;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  handoffCreatedAt: string;
  warnings: string[];
  skippedIndexes: number[];
}
