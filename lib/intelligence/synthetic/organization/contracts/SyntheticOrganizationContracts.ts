import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { SyntheticRoleCapabilityReviewLevel } from "../../roles/role-capability";
import type { SyntheticRoleType } from "../../roles/contracts";

export type SyntheticOrganizationUnitType =
  | "finance"
  | "accounting"
  | "audit"
  | "revenue_cycle"
  | "payroll"
  | "compliance"
  | "operations"
  | "other";

export type SyntheticOrganizationTeamType = "human" | "ai" | "hybrid";

export type SyntheticOrganizationWorkforceMemberType =
  | "human"
  | "ai_worker"
  | "contractor"
  | "shared_service";

export type SyntheticOrganizationWorkforceTypeFilter =
  | "human"
  | "ai"
  | "contractor"
  | "shared_service"
  | "all";

export type SyntheticOrganizationAssignmentStatus = "active" | "inactive" | "pending";

export type SyntheticOrganizationCapacityStatus =
  | "available"
  | "at_capacity"
  | "overloaded"
  | "not_evaluated";

export type SyntheticOrganizationRecommendationType =
  | "allocation"
  | "escalation"
  | "capacity_flag";

export interface SyntheticOrganizationBaseContract {
  boundPhase39SnapshotHash: string;
  boundPhase38SnapshotHash: string;
  phase40StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  // Fail closed: if PHI cannot be determined at construction, default containsPHI to true.
  // Phase 40 classifies and isolates only; HIPAA controls live in Phase 42.5.
  containsPHI: boolean;
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
  warnings: string[];
  skippedIndexes: number[];
}

export interface SyntheticPhase39RoleHandoffConsumptionContract extends SyntheticOrganizationBaseContract {
  phase39RoleHandoffHandle: string;
  phase39RoleInstanceReferenceIds: string[];
}

export interface OrganizationalUnitContract extends SyntheticPhase39RoleHandoffConsumptionContract {
  organizationalUnitId: string;
  organizationalUnitKey: string;
  unitType: SyntheticOrganizationUnitType;
  unitName: string;
  parentUnitId: string;
  hierarchyLevel: number;
  reportingStructureReferenceIds: string[];
  ownershipReferenceId: string;
  governanceReferenceId: string;
  configuredEscalationChainReferenceId: string;
  isHealthcareUnit: boolean;
}

export interface TeamContract extends SyntheticPhase39RoleHandoffConsumptionContract {
  teamId: string;
  teamKey: string;
  teamName: string;
  parentUnitId: string;
  teamLeadReferenceId: string;
  memberReferenceIds: string[];
  teamType: SyntheticOrganizationTeamType;
}

export interface WorkforceAssignmentContract extends SyntheticPhase39RoleHandoffConsumptionContract {
  assignmentId: string;
  assignmentKey: string;
  workforceMemberId: string;
  workforceMemberType: SyntheticOrganizationWorkforceMemberType;
  assignedUnitId: string;
  assignedTeamId: string;
  assignedCapabilityReferenceIds: string[];
  assignmentStatus: SyntheticOrganizationAssignmentStatus;
  isRecommendationOnly: true;
  noAutomaticAssignment: true;
}

export interface CapacityContract extends SyntheticPhase39RoleHandoffConsumptionContract {
  capacityId: string;
  capacityKey: string;
  workforceMemberId: string;
  assignedWorkReferenceIds: string[];
  availableCapacityMetadata: Record<string, unknown>;
  estimatedEffortMetadata: Record<string, unknown>;
  workloadTrendMetadata: Record<string, unknown>;
  capacityStatus: SyntheticOrganizationCapacityStatus;
  isObservationalOnly: true;
}

export interface EscalationContract extends SyntheticPhase39RoleHandoffConsumptionContract {
  escalationId: string;
  escalationKey: string;
  configuredChainReferenceId: string;
  escalationChainReferenceIds: string[];
  escalationFromRoleType: string;
  escalationToRoleType: string;
  escalationReason: string;
  escalationTrigger: string;
  requiresHumanDecision: boolean;
  isRecommendationOnly: true;
}

export interface WorkforceHealthContract extends SyntheticPhase39RoleHandoffConsumptionContract {
  workforceHealthId: string;
  workforceHealthKey: string;
  workforceTypeFilter: SyntheticOrganizationWorkforceTypeFilter;
  teamHealthMetadata: Record<string, unknown>;
  departmentHealthMetadata: Record<string, unknown>;
  capacityHealthMetadata: Record<string, unknown>;
  workloadHealthMetadata: Record<string, unknown>;
  escalationHealthMetadata: Record<string, unknown>;
  isOperationalMetricsOnly: true;
  noEmployeeRanking: true;
  noEmployeeScoring: true;
  noHrEvaluation: true;
  excludesSimulationOutputs: true;
}

export interface RecommendationAuditEntry extends SyntheticPhase39RoleHandoffConsumptionContract {
  recommendationAuditEntryId: string;
  recommendationAuditEntryKey: string;
  recommendationType: SyntheticOrganizationRecommendationType;
  recommenderModule: string;
  recipientReferenceId: string;
  payloadHash: string;
  inputSnapshotHash: string;
  isStale: boolean;
  recommendationTimestamp: string;
  humanDecisionOutcome: string;
  priorEntryReferenceId: string;
  appendOnly: true;
  immutableRecord: true;
}

export type SyntheticAuthorityOutcome =
  | "in_lane"
  | "above_authority"
  | "forbidden"
  | "requires_human";

export type SyntheticAuthorityRoutingOutcome =
  | "routed_to_target"
  | "held_in_source"
  | "advise_to_deploy"
  | "human_escalation"
  | "forbidden";

export type SyntheticCustomerRoleDeploymentStatus =
  | "not_deployed"
  | "activating"
  | "deployed"
  | "deactivated";

export interface AuthorityEvaluationResult extends SyntheticPhase39RoleHandoffConsumptionContract {
  authorityEvaluationResultId: string;
  authorityEvaluationResultKey: string;
  authorityOutcome: SyntheticAuthorityOutcome;
  escalationTargetRoleType: string;
  restrictionCheckResult: boolean;
  capabilityMatch: boolean;
  approvalRoutingTargetRoleType: string;
}

export interface AuthorityRoutingPackage extends SyntheticPhase39RoleHandoffConsumptionContract {
  authorityRoutingPackageId: string;
  authorityRoutingPackageKey: string;
  routingOutcome: SyntheticAuthorityRoutingOutcome;
  sourceQueueRef: string;
  targetQueueRef: string;
  handoffRefs: string[];
  escalationTargetRoleType: string;
}

export interface CustomerRoleDeploymentRecord extends SyntheticPhase39RoleHandoffConsumptionContract {
  customerRoleDeploymentRecordId: string;
  customerRoleDeploymentRecordKey: string;
  companyId: string;
  roleType: SyntheticRoleType;
  deploymentStatus: SyntheticCustomerRoleDeploymentStatus;
  roleInstanceId: string;
  roleActivationReferenceId: string;
  workforceMemberReferenceId: string;
  taskQueueReferenceId: string;
  deploymentResolvedAt: string;
}

export interface AdviseToDeployNotification extends SyntheticPhase39RoleHandoffConsumptionContract {
  adviseToDeployNotificationId: string;
  adviseToDeployNotificationKey: string;
  requiredRoleType: SyntheticRoleType;
  triggeringTaskRef: string;
  adviseReason: string;
}

export type SyntheticRoleAuthorityTierConfigSource = "default" | "customer_override";

export type SyntheticRoleAuthorityTierMaxReviewLevelByRoleType = Record<
  SyntheticRoleType,
  SyntheticRoleCapabilityReviewLevel
>;

export interface RoleAuthorityTierConfig extends SyntheticPhase39RoleHandoffConsumptionContract {
  roleAuthorityTierConfigId: string;
  roleAuthorityTierConfigKey: string;
  configSource: SyntheticRoleAuthorityTierConfigSource;
  maxReviewLevelByRoleType: SyntheticRoleAuthorityTierMaxReviewLevelByRoleType;
}

export type SyntheticTierWideningGateOutcome = "auto_allowed" | "requires_ticket";

export interface TierWideningRequest extends SyntheticPhase39RoleHandoffConsumptionContract {
  tierWideningRequestId: string;
  tierWideningRequestKey: string;
  companyId: string;
  roleType: SyntheticRoleType;
  currentMaxReviewLevel: SyntheticRoleCapabilityReviewLevel;
  requestedMaxReviewLevel: SyntheticRoleCapabilityReviewLevel;
  requestReason: string;
}

export interface TierWideningGateResult extends SyntheticPhase39RoleHandoffConsumptionContract {
  tierWideningGateResultId: string;
  tierWideningGateResultKey: string;
  tierWideningRequestId: string;
  gateOutcome: SyntheticTierWideningGateOutcome;
  gateReason: string;
}
