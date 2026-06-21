import { stableSnapshotHash } from "../../../../core/hash";
import type { SyntheticAuditScope } from "../../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../../organizational-memory/memory-object";
import type { SyntheticRoleType } from "../../../roles/contracts";
import type {
  AuthorityEvaluationResult,
  AuthorityRoutingPackage,
  CustomerRoleDeploymentRecord,
  SyntheticAuthorityRoutingOutcome,
} from "../../contracts";
import {
  resolveRoleDeployment,
  type ResolveRoleDeploymentScope,
} from "../../workforce-registry/deployment-index/buildCustomerRoleDeploymentRecord";

export interface BuildAuthorityRoutingPackageInput {
  authorityEvaluationResult?: AuthorityEvaluationResult | null;
  sourceQueueRef?: string;
  companyId?: string;
  customerRoleDeploymentRecord?: CustomerRoleDeploymentRecord | null;
  handoffRefs?: string[];
  warnings?: string[];
}

export interface BuildAuthorityRoutingPackageResult {
  authorityRoutingPackage: AuthorityRoutingPackage | null;
  skipped: boolean;
  warnings: string[];
}

export interface AuthorityRoutingClassificationCore {
  routingOutcome: SyntheticAuthorityRoutingOutcome;
  sourceQueueRef: string;
  targetQueueRef: string;
  escalationTargetRoleType: string;
  routingReason: string;
}

const SYNTHETIC_ROLE_TYPES: SyntheticRoleType[] = [
  "staff_accountant",
  "senior_accountant",
  "accounting_manager",
  "controller_helper",
  "cfo_helper",
  "staff_auditor",
  "senior_auditor",
  "audit_manager_helper",
  "partner_helper",
];

/**
 * Pure routing artifact builder (Path A): emits AuthorityRoutingPackage only.
 * Does NOT mutate queues, task state, or notifications. Does NOT set executable: true.
 * advise_to_deploy_required holds the task in source pending 40E-EXT-C notification — this
 * module does NOT build AdviseToDeployNotification artifacts.
 * Escalation packages (separate modules) retain noAutonomousEscalation: true; this module
 * does not emit escalation packages.
 */
export function classifyAuthorityRouting(input: {
  authorityEvaluationResult?: AuthorityEvaluationResult | null;
  sourceQueueRef?: string;
  companyId?: string;
  customerRoleDeploymentRecord?: CustomerRoleDeploymentRecord | null;
  deploymentScope?: ResolveRoleDeploymentScope | null;
}): AuthorityRoutingClassificationCore {
  const authorityEvaluationResult = input.authorityEvaluationResult;
  const sourceQueueRef = input.sourceQueueRef ?? "";

  if (!authorityEvaluationResult) {
    return failClosedHold(sourceQueueRef, "missing_authority_evaluation_result");
  }

  const authorityOutcome = authorityEvaluationResult.authorityOutcome;

  if (authorityOutcome === "requires_human") {
    return {
      routingOutcome: "human_escalation",
      sourceQueueRef,
      targetQueueRef: "",
      escalationTargetRoleType: "human_controller",
      routingReason: "requires_human_hard_stop",
    };
  }

  if (authorityOutcome === "forbidden") {
    return {
      routingOutcome: "forbidden",
      sourceQueueRef,
      targetQueueRef: "",
      escalationTargetRoleType: "",
      routingReason: "forbidden_task_family_or_capability",
    };
  }

  if (authorityOutcome === "in_lane") {
    return {
      routingOutcome: "routed_to_source",
      sourceQueueRef,
      targetQueueRef: "",
      escalationTargetRoleType: "",
      routingReason: "in_lane_source_queue",
    };
  }

  if (authorityOutcome === "above_authority") {
    const escalationTargetRoleType = authorityEvaluationResult.escalationTargetRoleType;

    if (!isSyntheticRoleType(escalationTargetRoleType)) {
      return failClosedHold(sourceQueueRef, "missing_or_invalid_escalation_target_role_type");
    }

    const deploymentScope = input.deploymentScope;

    if (!deploymentScope || !hasValue(input.companyId)) {
      return failClosedHold(sourceQueueRef, "missing_deployment_scope");
    }

    const deploymentResult = resolveRoleDeployment(
      deploymentScope,
      escalationTargetRoleType,
      input.customerRoleDeploymentRecord,
    );

    if (deploymentResult.deploymentStatus === "deployed") {
      if (!hasValue(deploymentResult.taskQueueReferenceId)) {
        return failClosedHold(sourceQueueRef, "ambiguous_deployed_target_queue");
      }

      return {
        routingOutcome: "routed_to_target",
        sourceQueueRef,
        targetQueueRef: deploymentResult.taskQueueReferenceId,
        escalationTargetRoleType,
        routingReason: "above_authority_target_deployed",
      };
    }

    if (deploymentResult.deploymentStatus === "not_deployed") {
      return {
        routingOutcome: "advise_to_deploy_required",
        sourceQueueRef,
        targetQueueRef: "",
        escalationTargetRoleType,
        routingReason: "above_authority_target_not_deployed",
      };
    }

    return failClosedHold(sourceQueueRef, "ambiguous_deployment_status");
  }

  return failClosedHold(sourceQueueRef, "unknown_authority_outcome");
}

function failClosedHold(sourceQueueRef: string, routingReason: string): AuthorityRoutingClassificationCore {
  return {
    routingOutcome: "held_in_source",
    sourceQueueRef,
    targetQueueRef: "",
    escalationTargetRoleType: "",
    routingReason,
  };
}

function isSyntheticRoleType(value: string): value is SyntheticRoleType {
  return SYNTHETIC_ROLE_TYPES.includes(value as SyntheticRoleType);
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function buildDeploymentScope(
  authorityEvaluationResult: AuthorityEvaluationResult,
  companyId: string,
): ResolveRoleDeploymentScope {
  return {
    companyId,
    customerIsolation: authorityEvaluationResult.customerIsolation,
    firmIsolation: authorityEvaluationResult.firmIsolation,
    clientIsolation: authorityEvaluationResult.clientIsolation,
    scope: authorityEvaluationResult.scope,
  };
}

function buildAuthorityRoutingPackageDerivationHash(
  authorityEvaluationResult: AuthorityEvaluationResult,
  classification: AuthorityRoutingClassificationCore,
  handoffRefs: string[],
): string {
  return stableSnapshotHash({
    authorityEvaluationResultId: authorityEvaluationResult.authorityEvaluationResultId,
    authorityOutcome: authorityEvaluationResult.authorityOutcome,
    routingOutcome: classification.routingOutcome,
    sourceQueueRef: classification.sourceQueueRef,
    targetQueueRef: classification.targetQueueRef,
    escalationTargetRoleType: classification.escalationTargetRoleType,
    routingReason: classification.routingReason,
    handoffRefs,
  });
}

export function buildAuthorityRoutingPackage(
  input: BuildAuthorityRoutingPackageInput,
): BuildAuthorityRoutingPackageResult {
  const warnings = [...getInputArray(input.warnings)];
  const authorityEvaluationResult = input.authorityEvaluationResult;

  if (!authorityEvaluationResult) {
    return {
      authorityRoutingPackage: null,
      skipped: true,
      warnings: [...warnings, "missing authority evaluation result"],
    };
  }

  if (!hasValue(input.sourceQueueRef)) {
    return {
      authorityRoutingPackage: null,
      skipped: true,
      warnings: [...warnings, "missing source queue reference"],
    };
  }

  const deploymentScope = hasValue(input.companyId)
    ? buildDeploymentScope(authorityEvaluationResult, input.companyId as string)
    : null;

  const classification = classifyAuthorityRouting({
    authorityEvaluationResult,
    sourceQueueRef: input.sourceQueueRef,
    companyId: input.companyId,
    customerRoleDeploymentRecord: input.customerRoleDeploymentRecord,
    deploymentScope,
  });
  const handoffRefs = getInputArray(input.handoffRefs);
  const derivationHash = buildAuthorityRoutingPackageDerivationHash(
    authorityEvaluationResult,
    classification,
    handoffRefs,
  );
  const authorityRoutingPackageKey = stableSnapshotHash({
    authorityEvaluationResultId: authorityEvaluationResult.authorityEvaluationResultId,
    routingOutcome: classification.routingOutcome,
    sourceQueueRef: classification.sourceQueueRef,
    targetQueueRef: classification.targetQueueRef,
    boundPhase39SnapshotHash: authorityEvaluationResult.boundPhase39SnapshotHash,
    boundPhase38SnapshotHash: authorityEvaluationResult.boundPhase38SnapshotHash,
    derivationHash,
  });
  const authorityRoutingPackageId = stableSnapshotHash({
    authorityRoutingPackageKey,
    artifactType: "AuthorityRoutingPackage",
  });

  return {
    authorityRoutingPackage: {
      boundPhase39SnapshotHash: authorityEvaluationResult.boundPhase39SnapshotHash,
      boundPhase38SnapshotHash: authorityEvaluationResult.boundPhase38SnapshotHash,
      phase40StaleMarker: authorityEvaluationResult.phase40StaleMarker,
      executable: false,
      executionReady: authorityEvaluationResult.executionReady,
      scope: authorityEvaluationResult.scope,
      customerIsolation: authorityEvaluationResult.customerIsolation,
      firmIsolation: authorityEvaluationResult.firmIsolation,
      clientIsolation: authorityEvaluationResult.clientIsolation,
      containsPHI: authorityEvaluationResult.containsPHI,
      derivationLineageIds: authorityEvaluationResult.derivationLineageIds,
      derivationMethod: authorityEvaluationResult.derivationMethod,
      derivationHash,
      confidenceFloorMetadata: authorityEvaluationResult.confidenceFloorMetadata,
      sourceConfidenceReferenceIds: authorityEvaluationResult.sourceConfidenceReferenceIds,
      evidenceReferenceIds: authorityEvaluationResult.evidenceReferenceIds,
      lineageReferenceIds: authorityEvaluationResult.lineageReferenceIds,
      trustMetadata: authorityEvaluationResult.trustMetadata,
      confidenceMetadata: authorityEvaluationResult.confidenceMetadata,
      governanceMetadata: authorityEvaluationResult.governanceMetadata,
      warnings,
      skippedIndexes: authorityEvaluationResult.skippedIndexes,
      phase39RoleHandoffHandle: authorityEvaluationResult.phase39RoleHandoffHandle,
      phase39RoleInstanceReferenceIds: authorityEvaluationResult.phase39RoleInstanceReferenceIds,
      authorityRoutingPackageId,
      authorityRoutingPackageKey,
      routingOutcome: classification.routingOutcome,
      sourceQueueRef: classification.sourceQueueRef,
      targetQueueRef: classification.targetQueueRef,
      handoffRefs,
      escalationTargetRoleType: classification.escalationTargetRoleType,
    },
    skipped: false,
    warnings,
  };
}
