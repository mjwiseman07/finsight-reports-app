import type {
  AuditEventContract,
  ControlSpineIsolationDimension,
  ControlSpinePersonaKey,
} from "../contracts";

export type ControlSpineResourceVisibilityScope = "client_scoped" | "firm_internal" | "customer_shared";

export type ControlSpineIsolationAccessOutcome = "allowed" | "denied";

export type ControlSpineIsolationDenyReason =
  | "missing_requester_scope"
  | "missing_target_scope"
  | "ambiguous_requester_scope"
  | "ambiguous_target_scope"
  | "cross_customer_tenant"
  | "cross_firm_tenant"
  | "cross_client_tenant"
  | "cross_firm_staff_reach"
  | "client_side_firm_internal_reach"
  | "isolation_dimension_mismatch"
  | "deny_by_default";

export interface ControlSpineIsolationScope {
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
  isolationScopeReferenceId: string;
}

export interface ClassifyIsolationReachInput {
  requesterPersonaKey: ControlSpinePersonaKey;
  requesterPersonaReferenceId: string;
  requesterScope: ControlSpineIsolationScope | null | undefined;
  targetResourceReferenceId: string;
  targetResourceVisibilityScope: ControlSpineResourceVisibilityScope;
  targetScope: ControlSpineIsolationScope | null | undefined;
}

export interface ClassifyIsolationReachCore {
  accessOutcome: ControlSpineIsolationAccessOutcome;
  denyReason: ControlSpineIsolationDenyReason | null;
  evaluationTrace: string[];
}

export interface EvaluateIsolationBoundaryInput extends ClassifyIsolationReachInput {
  actorReferenceId: string;
  retentionConfigurationReferenceId: string;
  evaluationTimestampIso: string;
}

export interface ControlSpineIsolationEvaluationResult {
  isolationEvaluationResultId: string;
  isolationEvaluationResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  accessOutcome: ControlSpineIsolationAccessOutcome;
  denyReason: ControlSpineIsolationDenyReason | null;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
  evaluationTrace: string[];
  auditEvent: AuditEventContract;
}

const CLIENT_SIDE_PERSONA_KEYS: ReadonlySet<ControlSpinePersonaKey> = new Set([
  "client_controller",
  "client_owner",
]);

const FIRM_STAFF_PERSONA_KEYS: ReadonlySet<ControlSpinePersonaKey> = new Set(["firm_staff"]);

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicEvaluationId(parts: string[]): string {
  return `isolation-eval:${parts.filter(Boolean).join(":")}`;
}

function validateIsolationScope(
  scope: ControlSpineIsolationScope | null | undefined,
  side: "requester" | "target",
  visibilityScope: ControlSpineResourceVisibilityScope,
): { valid: true } | { valid: false; reason: ControlSpineIsolationDenyReason } {
  if (!scope) {
    return {
      valid: false,
      reason: side === "requester" ? "missing_requester_scope" : "missing_target_scope",
    };
  }

  if (
    !hasValue(scope.customerTenantId) ||
    !hasValue(scope.firmTenantId) ||
    !hasValue(scope.isolationScopeReferenceId)
  ) {
    return {
      valid: false,
      reason: side === "requester" ? "ambiguous_requester_scope" : "ambiguous_target_scope",
    };
  }

  const dimensions: Array<{ label: string; dimension: ControlSpineIsolationDimension }> = [
    { label: "customer", dimension: scope.customerIsolation },
    { label: "firm", dimension: scope.firmIsolation },
    { label: "client", dimension: scope.clientIsolation },
  ];

  for (const { label, dimension } of dimensions) {
    if (!hasValue(dimension.isolationDimensionReferenceId) || !hasValue(dimension.tenantScopeKey)) {
      return {
        valid: false,
        reason: side === "requester" ? "ambiguous_requester_scope" : "ambiguous_target_scope",
      };
    }

    if (!Array.isArray(dimension.boundaryReferenceIds)) {
      return {
        valid: false,
        reason: side === "requester" ? "ambiguous_requester_scope" : "ambiguous_target_scope",
      };
    }
  }

  if (visibilityScope === "client_scoped" && !hasValue(scope.clientTenantId)) {
    return {
      valid: false,
      reason: side === "requester" ? "ambiguous_requester_scope" : "ambiguous_target_scope",
    };
  }

  if (scope.customerIsolation.tenantScopeKey !== scope.customerTenantId) {
    return {
      valid: false,
      reason: side === "requester" ? "ambiguous_requester_scope" : "ambiguous_target_scope",
    };
  }

  if (scope.firmIsolation.tenantScopeKey !== scope.firmTenantId) {
    return {
      valid: false,
      reason: side === "requester" ? "ambiguous_requester_scope" : "ambiguous_target_scope",
    };
  }

  if (hasValue(scope.clientTenantId) && scope.clientIsolation.tenantScopeKey !== scope.clientTenantId) {
    return {
      valid: false,
      reason: side === "requester" ? "ambiguous_requester_scope" : "ambiguous_target_scope",
    };
  }

  return { valid: true };
}

function dimensionPairMatches(
  requesterDimension: ControlSpineIsolationDimension,
  targetDimension: ControlSpineIsolationDimension,
): boolean {
  return requesterDimension.tenantScopeKey === targetDimension.tenantScopeKey;
}

function deny(
  denyReason: ControlSpineIsolationDenyReason,
  evaluationTrace: string[],
): ClassifyIsolationReachCore {
  return {
    accessOutcome: "denied",
    denyReason,
    evaluationTrace: [...evaluationTrace, `deny:${denyReason}`],
  };
}

/**
 * Pure isolation classifier. Deny-by-default; fail-closed on missing, ambiguous, or partial scope.
 * No live enforcement, no audit-store writes, no RBAC matrix evaluation (42.5C).
 */
export function classifyIsolationReach(input: ClassifyIsolationReachInput): ClassifyIsolationReachCore {
  const evaluationTrace: string[] = ["classifyIsolationReach:start", "policy:deny_by_default"];

  const requesterValidation = validateIsolationScope(
    input.requesterScope,
    "requester",
    input.targetResourceVisibilityScope,
  );
  if (!requesterValidation.valid) {
    return deny(requesterValidation.reason, evaluationTrace);
  }

  const targetValidation = validateIsolationScope(
    input.targetScope,
    "target",
    input.targetResourceVisibilityScope,
  );
  if (!targetValidation.valid) {
    return deny(targetValidation.reason, evaluationTrace);
  }

  const requesterScope = input.requesterScope as ControlSpineIsolationScope;
  const targetScope = input.targetScope as ControlSpineIsolationScope;

  evaluationTrace.push("scope:requester_valid", "scope:target_valid");

  if (requesterScope.customerTenantId !== targetScope.customerTenantId) {
    return deny("cross_customer_tenant", evaluationTrace);
  }

  if (!dimensionPairMatches(requesterScope.customerIsolation, targetScope.customerIsolation)) {
    return deny("isolation_dimension_mismatch", [...evaluationTrace, "dimension:customer_mismatch"]);
  }

  evaluationTrace.push("dimension:customer_match");

  if (
    CLIENT_SIDE_PERSONA_KEYS.has(input.requesterPersonaKey) &&
    input.targetResourceVisibilityScope === "firm_internal"
  ) {
    return deny("client_side_firm_internal_reach", evaluationTrace);
  }

  if (requesterScope.firmTenantId !== targetScope.firmTenantId) {
    if (FIRM_STAFF_PERSONA_KEYS.has(input.requesterPersonaKey)) {
      return deny("cross_firm_staff_reach", evaluationTrace);
    }

    return deny("cross_firm_tenant", evaluationTrace);
  }

  if (!dimensionPairMatches(requesterScope.firmIsolation, targetScope.firmIsolation)) {
    return deny("isolation_dimension_mismatch", [...evaluationTrace, "dimension:firm_mismatch"]);
  }

  evaluationTrace.push("dimension:firm_match");

  if (input.targetResourceVisibilityScope === "client_scoped") {
    if (!hasValue(requesterScope.clientTenantId) || !hasValue(targetScope.clientTenantId)) {
      return deny("ambiguous_requester_scope", evaluationTrace);
    }

    if (requesterScope.clientTenantId !== targetScope.clientTenantId) {
      return deny("cross_client_tenant", evaluationTrace);
    }

    if (!dimensionPairMatches(requesterScope.clientIsolation, targetScope.clientIsolation)) {
      return deny("isolation_dimension_mismatch", [...evaluationTrace, "dimension:client_mismatch"]);
    }

    evaluationTrace.push("dimension:client_match");
  }

  if (input.targetResourceVisibilityScope === "customer_shared") {
    evaluationTrace.push("visibility:customer_shared_within_customer_boundary");
  }

  if (input.targetResourceVisibilityScope === "firm_internal") {
    evaluationTrace.push("visibility:firm_internal_within_firm_boundary");
  }

  evaluationTrace.push("access:allowed_within_boundary");

  return {
    accessOutcome: "allowed",
    denyReason: null,
    evaluationTrace,
  };
}

function buildAuditEventFromEvaluation(
  input: EvaluateIsolationBoundaryInput,
  classification: ClassifyIsolationReachCore,
): AuditEventContract {
  const requesterScope = input.requesterScope as ControlSpineIsolationScope;

  return {
    auditEventContractId: buildDeterministicEvaluationId([
      "audit",
      input.actorReferenceId,
      input.targetResourceReferenceId,
      classification.accessOutcome,
    ]),
    auditEventKey: `isolation-boundary:${classification.accessOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    customerIsolation: requesterScope.customerIsolation,
    firmIsolation: requesterScope.firmIsolation,
    clientIsolation: requesterScope.clientIsolation,
    eventCategory: "access",
    eventOutcome: classification.accessOutcome === "allowed" ? "success" : "denied",
    actorReferenceId: input.actorReferenceId,
    targetResourceReferenceId: input.targetResourceReferenceId,
    eventTimestampIso: input.evaluationTimestampIso,
    retentionConfigurationReferenceId: input.retentionConfigurationReferenceId,
    auditTrailReferenceIds: [...classification.evaluationTrace],
  };
}

export function evaluateIsolationBoundary(
  input: EvaluateIsolationBoundaryInput,
): ControlSpineIsolationEvaluationResult {
  const classification = classifyIsolationReach(input);
  const requesterScope = input.requesterScope as ControlSpineIsolationScope;

  const isolationEvaluationResultId = buildDeterministicEvaluationId([
    requesterScope.isolationScopeReferenceId,
    input.targetResourceReferenceId,
    classification.accessOutcome,
    classification.denyReason ?? "none",
  ]);

  return {
    isolationEvaluationResultId,
    isolationEvaluationResultKey: `isolation-boundary:${classification.accessOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    accessOutcome: classification.accessOutcome,
    denyReason: classification.denyReason,
    customerIsolation: requesterScope.customerIsolation,
    firmIsolation: requesterScope.firmIsolation,
    clientIsolation: requesterScope.clientIsolation,
    evaluationTrace: classification.evaluationTrace,
    auditEvent: buildAuditEventFromEvaluation(input, classification),
  };
}
