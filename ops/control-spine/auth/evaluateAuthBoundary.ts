import type {
  AuditEventContract,
  AuthBoundaryContract,
  ControlSpineAuthenticationMethodCategory,
  ControlSpineIsolationDimension,
  ControlSpinePersonaKey,
} from "../contracts";
import {
  classifyIsolationReach,
  type ClassifyIsolationReachInput,
  type ControlSpineIsolationAccessOutcome,
  type ControlSpineIsolationScope,
  type ControlSpineResourceVisibilityScope,
} from "../isolation";

export type ControlSpineAuthAccessOutcome = "allowed" | "denied";

export type ControlSpineSessionLifecycleStatus = "active" | "expired" | "missing" | "ambiguous";

export type ControlSpineAuthBoundaryDenyReason =
  | "auth_bypass"
  | "missing_session"
  | "expired_session"
  | "ambiguous_session"
  | "unparseable_credential_context"
  | "multi_scope_binding"
  | "missing_bound_scope"
  | "ambiguous_bound_scope"
  | "session_scope_mismatch"
  | "isolation_denied_after_auth"
  | "deny_by_default";

/** MFA posture documented only — not asserted satisfied pending auditor/counsel guidance. */
export const MFA_POSTURE_AUDITOR_GUIDANCE_PENDING = "AUDITOR_GUIDANCE_PENDING" as const;

export type MfaPostureStatus = typeof MFA_POSTURE_AUDITOR_GUIDANCE_PENDING;

export interface ControlSpineMfaPostureMarker {
  mfaPostureMarkerId: string;
  mfaPostureMarkerKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  mfaPostureStatus: MfaPostureStatus;
  postureDocumentedOnly: true;
  assertsMfaSatisfied: false;
}

export interface ClassifySessionBindingInput {
  sessionReferenceId: string | null | undefined;
  authenticatedPrincipalReferenceId: string | null | undefined;
  authenticationMethodCategory: ControlSpineAuthenticationMethodCategory | null | undefined;
  sessionLifecycleStatus: ControlSpineSessionLifecycleStatus | null | undefined;
  credentialContextParseable: boolean | null | undefined;
  /** Session-declared isolation scope bindings — exactly one required for allow. */
  declaredBoundScopes: ControlSpineIsolationScope[] | null | undefined;
  /** Resource target scope — mismatch against bound session scope => DENY. */
  targetIsolationScope?: ControlSpineIsolationScope | null | undefined;
}

export interface ClassifySessionBindingCore {
  accessOutcome: ControlSpineAuthAccessOutcome;
  denyReason: ControlSpineAuthBoundaryDenyReason | null;
  boundIsolationScope: ControlSpineIsolationScope | null;
  evaluationTrace: string[];
}

export interface EvaluateAuthBoundaryInput extends ClassifySessionBindingInput {
  requesterPersonaKey: ControlSpinePersonaKey;
  requesterPersonaReferenceId: string;
  targetResourceReferenceId: string;
  targetResourceVisibilityScope: ControlSpineResourceVisibilityScope;
  actorReferenceId: string;
  retentionConfigurationReferenceId: string;
  evaluationTimestampIso: string;
  /** When true, composes bound session scope with 42.5B isolation reach check. */
  composeWithIsolation?: boolean;
}

export interface ControlSpineAuthBoundaryEvaluationResult {
  authBoundaryEvaluationResultId: string;
  authBoundaryEvaluationResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  authOutcome: ControlSpineAuthAccessOutcome;
  composedOutcome: ControlSpineAuthAccessOutcome;
  denyReason: ControlSpineAuthBoundaryDenyReason | null;
  boundIsolationScope: ControlSpineIsolationScope | null;
  mfaPostureMarker: ControlSpineMfaPostureMarker;
  authBoundaryContract: AuthBoundaryContract | null;
  isolationAccessOutcome: ControlSpineIsolationAccessOutcome | null;
  evaluationTrace: string[];
  auditEvent: AuditEventContract;
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicEvaluationId(parts: string[]): string {
  return `auth-eval:${parts.filter(Boolean).join(":")}`;
}

function createMfaPostureMarker(): ControlSpineMfaPostureMarker {
  return {
    mfaPostureMarkerId: "mfa-posture:auditor-guidance-pending",
    mfaPostureMarkerKey: "mfa-posture:auditor-guidance-pending",
    containsVerticalComplianceLogic: false,
    executable: false,
    mfaPostureStatus: MFA_POSTURE_AUDITOR_GUIDANCE_PENDING,
    postureDocumentedOnly: true,
    assertsMfaSatisfied: false,
  };
}

function deny(
  denyReason: ControlSpineAuthBoundaryDenyReason,
  evaluationTrace: string[],
): ClassifySessionBindingCore {
  return {
    accessOutcome: "denied",
    denyReason,
    boundIsolationScope: null,
    evaluationTrace: [...evaluationTrace, `deny:${denyReason}`],
  };
}

function validateBoundIsolationScope(
  scope: ControlSpineIsolationScope,
  evaluationTrace: string[],
): { valid: true; scope: ControlSpineIsolationScope } | {
  valid: false;
  reason: ControlSpineAuthBoundaryDenyReason;
} {
  if (
    !hasValue(scope.customerTenantId) ||
    !hasValue(scope.firmTenantId) ||
    !hasValue(scope.isolationScopeReferenceId)
  ) {
    evaluationTrace.push("bound_scope:ambiguous");
    return { valid: false, reason: "ambiguous_bound_scope" };
  }

  const dimensions: ControlSpineIsolationDimension[] = [
    scope.customerIsolation,
    scope.firmIsolation,
    scope.clientIsolation,
  ];

  for (const dimension of dimensions) {
    if (
      !hasValue(dimension.isolationDimensionReferenceId) ||
      !hasValue(dimension.tenantScopeKey) ||
      !Array.isArray(dimension.boundaryReferenceIds)
    ) {
      evaluationTrace.push("bound_scope:dimension_ambiguous");
      return { valid: false, reason: "ambiguous_bound_scope" };
    }
  }

  if (scope.customerIsolation.tenantScopeKey !== scope.customerTenantId) {
    evaluationTrace.push("bound_scope:customer_dimension_mismatch");
    return { valid: false, reason: "ambiguous_bound_scope" };
  }

  if (scope.firmIsolation.tenantScopeKey !== scope.firmTenantId) {
    evaluationTrace.push("bound_scope:firm_dimension_mismatch");
    return { valid: false, reason: "ambiguous_bound_scope" };
  }

  if (
    hasValue(scope.clientTenantId) &&
    scope.clientIsolation.tenantScopeKey !== scope.clientTenantId
  ) {
    evaluationTrace.push("bound_scope:client_dimension_mismatch");
    return { valid: false, reason: "ambiguous_bound_scope" };
  }

  evaluationTrace.push(`bound_scope:valid:${scope.isolationScopeReferenceId}`);
  return { valid: true, scope };
}

function scopesMatch(sessionScope: ControlSpineIsolationScope, targetScope: ControlSpineIsolationScope): boolean {
  if (sessionScope.customerTenantId !== targetScope.customerTenantId) {
    return false;
  }

  if (sessionScope.firmTenantId !== targetScope.firmTenantId) {
    return false;
  }

  const sessionClient = sessionScope.clientTenantId ?? "";
  const targetClient = targetScope.clientTenantId ?? "";

  if (sessionClient !== targetClient) {
    return false;
  }

  return sessionScope.isolationScopeReferenceId === targetScope.isolationScopeReferenceId;
}

/**
 * Pure session-binding classifier. Deny-by-default; fail-closed on missing, expired, ambiguous,
 * unparseable credential context, or multi-scope binding.
 */
export function classifySessionBinding(input: ClassifySessionBindingInput): ClassifySessionBindingCore {
  const evaluationTrace: string[] = ["classifySessionBinding:start", "policy:deny_by_default"];

  if (input.credentialContextParseable === false) {
    return deny("unparseable_credential_context", evaluationTrace);
  }

  const lifecycle = input.sessionLifecycleStatus ?? "missing";

  if (lifecycle === "missing" || !hasValue(input.sessionReferenceId)) {
    return deny("missing_session", evaluationTrace);
  }

  if (lifecycle === "expired") {
    return deny("expired_session", evaluationTrace);
  }

  if (lifecycle === "ambiguous") {
    return deny("ambiguous_session", evaluationTrace);
  }

  if (!hasValue(input.authenticatedPrincipalReferenceId)) {
    return deny("auth_bypass", evaluationTrace);
  }

  if (!input.authenticationMethodCategory) {
    return deny("unparseable_credential_context", evaluationTrace);
  }

  evaluationTrace.push("session:authenticated_context_present");

  const declaredScopes = input.declaredBoundScopes ?? [];

  if (declaredScopes.length === 0) {
    return deny("missing_bound_scope", evaluationTrace);
  }

  if (declaredScopes.length > 1) {
    return deny("multi_scope_binding", evaluationTrace);
  }

  const boundScopeValidation = validateBoundIsolationScope(declaredScopes[0], evaluationTrace);
  if (!boundScopeValidation.valid) {
    return deny(boundScopeValidation.reason, evaluationTrace);
  }

  const boundIsolationScope = boundScopeValidation.scope;

  if (input.targetIsolationScope) {
    const targetValidation = validateBoundIsolationScope(input.targetIsolationScope, evaluationTrace);
    if (!targetValidation.valid) {
      return deny("session_scope_mismatch", evaluationTrace);
    }

    if (!scopesMatch(boundIsolationScope, targetValidation.scope)) {
      return deny("session_scope_mismatch", [...evaluationTrace, "scope:session_target_mismatch"]);
    }

    evaluationTrace.push("scope:session_target_match");
  }

  evaluationTrace.push("session:single_scope_binding_allowed");

  return {
    accessOutcome: "allowed",
    denyReason: null,
    boundIsolationScope,
    evaluationTrace,
  };
}

function buildAuthBoundaryContract(input: {
  sessionReferenceId: string;
  authenticatedPrincipalReferenceId: string;
  authenticationMethodCategory: ControlSpineAuthenticationMethodCategory;
  boundIsolationScope: ControlSpineIsolationScope;
}): AuthBoundaryContract {
  return {
    authBoundaryContractId: buildDeterministicEvaluationId([
      "auth-boundary",
      input.sessionReferenceId,
      input.boundIsolationScope.isolationScopeReferenceId,
    ]),
    authBoundaryContractKey: "auth-boundary:session-bound",
    containsVerticalComplianceLogic: false,
    executable: false,
    sessionReferenceId: input.sessionReferenceId,
    authenticatedPrincipalReferenceId: input.authenticatedPrincipalReferenceId,
    boundIsolationScopeReferenceId: input.boundIsolationScope.isolationScopeReferenceId,
    authenticationMethodCategory: input.authenticationMethodCategory,
    failClosedOnAmbiguity: true,
    noAnonymousCrossTenantPaths: true,
    customerIsolation: input.boundIsolationScope.customerIsolation,
    firmIsolation: input.boundIsolationScope.firmIsolation,
    clientIsolation: input.boundIsolationScope.clientIsolation,
  };
}

function buildAuditEventFromEvaluation(
  input: EvaluateAuthBoundaryInput,
  classification: ClassifySessionBindingCore,
  composedOutcome: ControlSpineAuthAccessOutcome,
  isolationFields: {
    customerIsolation: ControlSpineIsolationDimension;
    firmIsolation: ControlSpineIsolationDimension;
    clientIsolation: ControlSpineIsolationDimension;
  },
): AuditEventContract {
  return {
    auditEventContractId: buildDeterministicEvaluationId([
      "audit",
      input.actorReferenceId,
      input.targetResourceReferenceId,
      composedOutcome,
    ]),
    auditEventKey: `auth-boundary:${composedOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    customerIsolation: isolationFields.customerIsolation,
    firmIsolation: isolationFields.firmIsolation,
    clientIsolation: isolationFields.clientIsolation,
    eventCategory: "authentication",
    eventOutcome: composedOutcome === "allowed" ? "success" : "denied",
    actorReferenceId: input.actorReferenceId,
    targetResourceReferenceId: input.targetResourceReferenceId,
    eventTimestampIso: input.evaluationTimestampIso,
    retentionConfigurationReferenceId: input.retentionConfigurationReferenceId,
    auditTrailReferenceIds: [...classification.evaluationTrace],
  };
}

function fallbackIsolationDimension(suffix: string): ControlSpineIsolationDimension {
  return {
    isolationDimensionReferenceId: buildDeterministicEvaluationId([`dim-ref:auth-fallback:${suffix}`]),
    tenantScopeKey: buildDeterministicEvaluationId([`fallback:${suffix}`]),
    boundaryReferenceIds: [buildDeterministicEvaluationId([`boundary:auth-fallback:${suffix}`])],
  };
}

/**
 * Auth boundary evaluator with optional 42.5B isolation composition.
 * Valid session binding is necessary-but-not-sufficient — isolation + RBAC still apply downstream.
 */
export function evaluateAuthBoundary(
  input: EvaluateAuthBoundaryInput,
): ControlSpineAuthBoundaryEvaluationResult {
  const classification = classifySessionBinding(input);
  const mfaPostureMarker = createMfaPostureMarker();

  let composedOutcome: ControlSpineAuthAccessOutcome = classification.accessOutcome;
  let denyReason: ControlSpineAuthBoundaryDenyReason | null = classification.denyReason;
  let evaluationTrace = [...classification.evaluationTrace, `mfa:${mfaPostureMarker.mfaPostureStatus}`];
  let isolationAccessOutcome: ControlSpineIsolationAccessOutcome | null = null;

  if (
    classification.accessOutcome === "allowed" &&
    classification.boundIsolationScope &&
    input.composeWithIsolation === true
  ) {
    const isolationInput: ClassifyIsolationReachInput = {
      requesterPersonaKey: input.requesterPersonaKey,
      requesterPersonaReferenceId: input.requesterPersonaReferenceId,
      requesterScope: classification.boundIsolationScope,
      targetResourceReferenceId: input.targetResourceReferenceId,
      targetResourceVisibilityScope: input.targetResourceVisibilityScope,
      targetScope: input.targetIsolationScope ?? classification.boundIsolationScope,
    };

    const isolationClassification = classifyIsolationReach(isolationInput);
    isolationAccessOutcome = isolationClassification.accessOutcome;

    evaluationTrace = [
      ...evaluationTrace,
      "compose:auth_then_isolation",
      `isolation:${isolationClassification.accessOutcome}`,
    ];

    if (isolationClassification.accessOutcome === "denied") {
      composedOutcome = "denied";
      denyReason = "isolation_denied_after_auth";
      evaluationTrace.push("compose:isolation_denied_after_valid_auth");
    }
  }

  const isolationFields = classification.boundIsolationScope ?? {
    customerIsolation: fallbackIsolationDimension("customer"),
    firmIsolation: fallbackIsolationDimension("firm"),
    clientIsolation: fallbackIsolationDimension("client"),
  };

  const authBoundaryContract =
    classification.accessOutcome === "allowed" &&
    classification.boundIsolationScope &&
    hasValue(input.sessionReferenceId) &&
    hasValue(input.authenticatedPrincipalReferenceId) &&
    input.authenticationMethodCategory
      ? buildAuthBoundaryContract({
          sessionReferenceId: input.sessionReferenceId,
          authenticatedPrincipalReferenceId: input.authenticatedPrincipalReferenceId,
          authenticationMethodCategory: input.authenticationMethodCategory,
          boundIsolationScope: classification.boundIsolationScope,
        })
      : null;

  const authBoundaryEvaluationResultId = buildDeterministicEvaluationId([
    input.sessionReferenceId ?? "session:unknown",
    input.targetResourceReferenceId,
    classification.accessOutcome,
    composedOutcome,
    denyReason ?? "none",
  ]);

  return {
    authBoundaryEvaluationResultId,
    authBoundaryEvaluationResultKey: `auth-boundary:${composedOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    authOutcome: classification.accessOutcome,
    composedOutcome,
    denyReason,
    boundIsolationScope: classification.boundIsolationScope,
    mfaPostureMarker,
    authBoundaryContract,
    isolationAccessOutcome,
    evaluationTrace,
    auditEvent: buildAuditEventFromEvaluation(input, classification, composedOutcome, {
      customerIsolation: isolationFields.customerIsolation,
      firmIsolation: isolationFields.firmIsolation,
      clientIsolation: isolationFields.clientIsolation,
    }),
  };
}
