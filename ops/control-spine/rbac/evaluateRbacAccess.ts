import type {
  AuditEventContract,
  ControlSpineIsolationDimension,
  ControlSpinePersonaKey,
  PersonaRbacMatrixContract,
} from "../contracts";
import {
  classifyIsolationReach,
  type ClassifyIsolationReachCore,
  type ClassifyIsolationReachInput,
  type ControlSpineIsolationAccessOutcome,
} from "../isolation";

export type ControlSpineRbacAccessOutcome = "allowed" | "denied";

export type ControlSpineRbacDenyReason =
  | "missing_matrix"
  | "unparseable_matrix"
  | "missing_persona"
  | "ambiguous_persona"
  | "persona_not_in_matrix"
  | "missing_action"
  | "ambiguous_action"
  | "missing_resource"
  | "ambiguous_resource"
  | "permission_not_granted"
  | "rbac_scope_gap"
  | "deny_by_default"
  | "isolation_denied_overrides_rbac_grant";

export interface ControlSpineRbacRequestedAction {
  actionReferenceId: string;
  requestedGrantScopeReferenceId: string;
}

export interface ControlSpineRbacResourceDescriptor {
  resourceReferenceId: string;
  authorizedSurfaceReferenceId: string;
  requiredGrantScopeReferenceId: string;
}

export interface ClassifyPersonaPermissionInput {
  personaKey: ControlSpinePersonaKey | null | undefined;
  personaReferenceId: string | null | undefined;
  rbacMatrix: PersonaRbacMatrixContract | null | undefined;
  requestedAction: ControlSpineRbacRequestedAction | null | undefined;
  targetResource: ControlSpineRbacResourceDescriptor | null | undefined;
}

export interface ClassifyPersonaPermissionCore {
  accessOutcome: ControlSpineRbacAccessOutcome;
  denyReason: ControlSpineRbacDenyReason | null;
  evaluationTrace: string[];
}

export interface EvaluateRbacAccessInput extends ClassifyPersonaPermissionInput {
  actorReferenceId: string;
  retentionConfigurationReferenceId: string;
  evaluationTimestampIso: string;
  /** When provided, composes RBAC with 42.5B isolation — isolation DENY overrides RBAC grant. */
  isolationInput?: ClassifyIsolationReachInput | null;
}

export interface ControlSpineRbacEvaluationResult {
  rbacEvaluationResultId: string;
  rbacEvaluationResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  rbacOutcome: ControlSpineRbacAccessOutcome;
  composedOutcome: ControlSpineRbacAccessOutcome;
  denyReason: ControlSpineRbacDenyReason | null;
  isolationAccessOutcome: ControlSpineIsolationAccessOutcome | null;
  evaluationTrace: string[];
  auditEvent: AuditEventContract;
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicEvaluationId(parts: string[]): string {
  return `rbac-eval:${parts.filter(Boolean).join(":")}`;
}

function deny(
  denyReason: ControlSpineRbacDenyReason,
  evaluationTrace: string[],
): ClassifyPersonaPermissionCore {
  return {
    accessOutcome: "denied",
    denyReason,
    evaluationTrace: [...evaluationTrace, `deny:${denyReason}`],
  };
}

function validateMatrix(
  matrix: PersonaRbacMatrixContract | null | undefined,
  evaluationTrace: string[],
): { valid: true; matrix: PersonaRbacMatrixContract } | { valid: false; core: ClassifyPersonaPermissionCore } {
  if (!matrix) {
    return { valid: false, core: deny("missing_matrix", evaluationTrace) };
  }

  if (
    !hasValue(matrix.rbacMatrixContractId) ||
    !hasValue(matrix.rbacMatrixContractKey) ||
    matrix.containsVerticalComplianceLogic !== false ||
    matrix.executable !== false
  ) {
    return { valid: false, core: deny("unparseable_matrix", evaluationTrace) };
  }

  if (!Array.isArray(matrix.matrixEntries)) {
    return { valid: false, core: deny("unparseable_matrix", evaluationTrace) };
  }

  for (const entry of matrix.matrixEntries) {
    if (!hasValue(entry.personaReferenceId) || entry.denyByDefault !== true) {
      return { valid: false, core: deny("unparseable_matrix", evaluationTrace) };
    }

    if (!Array.isArray(entry.permissionGrants)) {
      return { valid: false, core: deny("unparseable_matrix", evaluationTrace) };
    }

    for (const grant of entry.permissionGrants) {
      if (
        !hasValue(grant.permissionGrantReferenceId) ||
        !hasValue(grant.authorizedSurfaceReferenceId) ||
        !hasValue(grant.grantScopeReferenceId)
      ) {
        return { valid: false, core: deny("unparseable_matrix", evaluationTrace) };
      }
    }
  }

  evaluationTrace.push("matrix:valid");
  return { valid: true, matrix };
}

function grantCoversRequest(
  grantScopeReferenceId: string,
  requestedScopeReferenceId: string,
  requiredScopeReferenceId: string,
): boolean {
  return (
    grantScopeReferenceId === requestedScopeReferenceId &&
    grantScopeReferenceId === requiredScopeReferenceId
  );
}

/**
 * Pure RBAC classifier. Deny-by-default; fail-closed on missing, ambiguous, or unparseable matrix.
 * Does not evaluate isolation — use evaluateRbacAccess() for composition with 42.5B.
 */
export function classifyPersonaPermission(
  input: ClassifyPersonaPermissionInput,
): ClassifyPersonaPermissionCore {
  const evaluationTrace: string[] = ["classifyPersonaPermission:start", "policy:deny_by_default"];

  const matrixValidation = validateMatrix(input.rbacMatrix, evaluationTrace);
  if (!matrixValidation.valid) {
    return matrixValidation.core;
  }

  const matrix = matrixValidation.matrix;

  if (!hasValue(input.personaKey) || !hasValue(input.personaReferenceId)) {
    return deny("missing_persona", evaluationTrace);
  }

  if (!input.requestedAction || !hasValue(input.requestedAction.actionReferenceId)) {
    return deny("missing_action", evaluationTrace);
  }

  if (!hasValue(input.requestedAction.requestedGrantScopeReferenceId)) {
    return deny("ambiguous_action", evaluationTrace);
  }

  if (!input.targetResource || !hasValue(input.targetResource.resourceReferenceId)) {
    return deny("missing_resource", evaluationTrace);
  }

  if (
    !hasValue(input.targetResource.authorizedSurfaceReferenceId) ||
    !hasValue(input.targetResource.requiredGrantScopeReferenceId)
  ) {
    return deny("ambiguous_resource", evaluationTrace);
  }

  evaluationTrace.push("input:persona_action_resource_valid");

  const matrixEntry = matrix.matrixEntries.find((entry) => entry.personaKey === input.personaKey);
  if (!matrixEntry) {
    return deny("persona_not_in_matrix", evaluationTrace);
  }

  if (matrixEntry.personaReferenceId !== input.personaReferenceId) {
    return deny("ambiguous_persona", evaluationTrace);
  }

  evaluationTrace.push(`persona:resolved:${input.personaKey}`);

  const { requestedAction, targetResource } = input;
  const matchingSurfaceGrants = matrixEntry.permissionGrants.filter(
    (grant) => grant.authorizedSurfaceReferenceId === targetResource.authorizedSurfaceReferenceId,
  );

  if (matchingSurfaceGrants.length === 0) {
    return deny("permission_not_granted", [...evaluationTrace, "grant:no_surface_match"]);
  }

  evaluationTrace.push("grant:surface_candidates_found");

  const scopeAlignedGrant = matchingSurfaceGrants.find((grant) =>
    grantCoversRequest(
      grant.grantScopeReferenceId,
      requestedAction.requestedGrantScopeReferenceId,
      targetResource.requiredGrantScopeReferenceId,
    ),
  );

  if (!scopeAlignedGrant) {
    const hasScopeGapCandidate = matchingSurfaceGrants.some(
      (grant) => grant.grantScopeReferenceId !== targetResource.requiredGrantScopeReferenceId,
    );

    if (hasScopeGapCandidate) {
      return deny("rbac_scope_gap", [...evaluationTrace, "grant:scope_gap"]);
    }

    return deny("permission_not_granted", [...evaluationTrace, "grant:scope_mismatch"]);
  }

  evaluationTrace.push(`grant:matched:${scopeAlignedGrant.permissionGrantReferenceId}`, "access:rbac_allowed");

  return {
    accessOutcome: "allowed",
    denyReason: null,
    evaluationTrace,
  };
}

function composeWithIsolation(
  rbacClassification: ClassifyPersonaPermissionCore,
  isolationClassification: ClassifyIsolationReachCore,
  evaluationTrace: string[],
): {
  composedOutcome: ControlSpineRbacAccessOutcome;
  denyReason: ControlSpineRbacDenyReason | null;
  evaluationTrace: string[];
} {
  const trace = [
    ...evaluationTrace,
    "compose:isolation_then_rbac",
    `isolation:${isolationClassification.accessOutcome}`,
    `rbac:${rbacClassification.accessOutcome}`,
  ];

  if (isolationClassification.accessOutcome === "denied") {
    return {
      composedOutcome: "denied",
      denyReason: "isolation_denied_overrides_rbac_grant",
      evaluationTrace: [...trace, "compose:isolation_denied_overrides"],
    };
  }

  if (rbacClassification.accessOutcome === "denied") {
    return {
      composedOutcome: "denied",
      denyReason: rbacClassification.denyReason,
      evaluationTrace: trace,
    };
  }

  return {
    composedOutcome: "allowed",
    denyReason: null,
    evaluationTrace: [...trace, "compose:both_allowed"],
  };
}

function buildAuditEventFromEvaluation(
  input: EvaluateRbacAccessInput,
  rbacClassification: ClassifyPersonaPermissionCore,
  composedOutcome: ControlSpineRbacAccessOutcome,
  matrix: PersonaRbacMatrixContract,
): AuditEventContract {
  return {
    auditEventContractId: buildDeterministicEvaluationId([
      "audit",
      input.actorReferenceId,
      input.targetResource?.resourceReferenceId ?? "resource:unknown",
      composedOutcome,
    ]),
    auditEventKey: `rbac-access:${composedOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    customerIsolation: matrix.customerIsolation,
    firmIsolation: matrix.firmIsolation,
    clientIsolation: matrix.clientIsolation,
    eventCategory: "authorization",
    eventOutcome: composedOutcome === "allowed" ? "success" : "denied",
    actorReferenceId: input.actorReferenceId,
    targetResourceReferenceId: input.targetResource?.resourceReferenceId ?? "resource:unknown",
    eventTimestampIso: input.evaluationTimestampIso,
    retentionConfigurationReferenceId: input.retentionConfigurationReferenceId,
    auditTrailReferenceIds: [...rbacClassification.evaluationTrace],
  };
}

function fallbackIsolationDimensions(): {
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
} {
  const emptyDimension = (suffix: string): ControlSpineIsolationDimension => ({
    isolationDimensionReferenceId: `dim-ref:rbac-fallback:${suffix}`,
    tenantScopeKey: `fallback:${suffix}`,
    boundaryReferenceIds: [`boundary:rbac-fallback:${suffix}`],
  });

  return {
    customerIsolation: emptyDimension("customer"),
    firmIsolation: emptyDimension("firm"),
    clientIsolation: emptyDimension("client"),
  };
}

/**
 * RBAC evaluator with optional 42.5B isolation composition.
 * RBAC allow is necessary-but-not-sufficient — composed allow requires BOTH isolation and RBAC.
 */
export function evaluateRbacAccess(input: EvaluateRbacAccessInput): ControlSpineRbacEvaluationResult {
  const rbacClassification = classifyPersonaPermission(input);
  const matrixValidation = validateMatrix(input.rbacMatrix, ["evaluateRbacAccess:start"]);
  const matrix = matrixValidation.valid
    ? matrixValidation.matrix
    : {
        rbacMatrixContractId: "rbac-matrix:invalid",
        rbacMatrixContractKey: "rbac-matrix:invalid",
        containsVerticalComplianceLogic: false as const,
        executable: false as const,
        matrixEntries: [],
        ...fallbackIsolationDimensions(),
      };

  let composedOutcome: ControlSpineRbacAccessOutcome = rbacClassification.accessOutcome;
  let denyReason: ControlSpineRbacDenyReason | null = rbacClassification.denyReason;
  let evaluationTrace = [...rbacClassification.evaluationTrace];
  let isolationAccessOutcome: ControlSpineIsolationAccessOutcome | null = null;

  if (input.isolationInput) {
    const isolationClassification = classifyIsolationReach(input.isolationInput);
    isolationAccessOutcome = isolationClassification.accessOutcome;
    const composition = composeWithIsolation(rbacClassification, isolationClassification, evaluationTrace);
    composedOutcome = composition.composedOutcome;
    denyReason = composition.denyReason;
    evaluationTrace = composition.evaluationTrace;
  }

  const rbacEvaluationResultId = buildDeterministicEvaluationId([
    input.personaReferenceId ?? "persona:unknown",
    input.targetResource?.resourceReferenceId ?? "resource:unknown",
    rbacClassification.accessOutcome,
    composedOutcome,
    denyReason ?? "none",
  ]);

  return {
    rbacEvaluationResultId,
    rbacEvaluationResultKey: `rbac-access:${composedOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    rbacOutcome: rbacClassification.accessOutcome,
    composedOutcome,
    denyReason,
    isolationAccessOutcome,
    evaluationTrace,
    auditEvent: buildAuditEventFromEvaluation(input, rbacClassification, composedOutcome, matrix),
  };
}
