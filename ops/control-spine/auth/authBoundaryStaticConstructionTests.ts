import type { ControlSpineIsolationScope } from "../isolation";
import {
  classifySessionBinding,
  evaluateAuthBoundary,
  MFA_POSTURE_AUDITOR_GUIDANCE_PENDING,
} from "./evaluateAuthBoundary";

export interface AuthBoundaryStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
}

export interface AuthBoundaryStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  evaluationTrace: string[];
  details: Record<string, unknown>;
}

function dimension(
  tenantScopeKey: string,
  referenceSuffix: string,
): ControlSpineIsolationScope["customerIsolation"] {
  return {
    isolationDimensionReferenceId: `dim-ref:${referenceSuffix}`,
    tenantScopeKey,
    boundaryReferenceIds: [`boundary:${referenceSuffix}`],
  };
}

function buildScope(input: {
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  isolationScopeReferenceId: string;
}): ControlSpineIsolationScope {
  return {
    customerTenantId: input.customerTenantId,
    firmTenantId: input.firmTenantId,
    clientTenantId: input.clientTenantId,
    isolationScopeReferenceId: input.isolationScopeReferenceId,
    customerIsolation: dimension(input.customerTenantId, `customer:${input.isolationScopeReferenceId}`),
    firmIsolation: dimension(input.firmTenantId, `firm:${input.isolationScopeReferenceId}`),
    clientIsolation: dimension(input.clientTenantId, `client:${input.isolationScopeReferenceId}`),
  };
}

export const AUTH_BOUNDARY_STATIC_CONSTRUCTION_CASES: AuthBoundaryStaticConstructionCase[] = [
  {
    caseId: "SC-ALLOW-01",
    poisonCaseIds: [],
    description: "Valid session bound to exactly one scope => allowed, bound scope emitted",
  },
  {
    caseId: "SC-PC-14-AUTH-BYPASS",
    poisonCaseIds: ["PC-14"],
    description: "No valid session => DENY (auth_bypass / missing_session)",
  },
  {
    caseId: "SC-SESSION-SCOPE-MISMATCH",
    poisonCaseIds: ["PC-14"],
    description: "Session bound to scope A, target scope B => DENY (session_scope_mismatch)",
  },
  {
    caseId: "SC-FAIL-CLOSED",
    poisonCaseIds: [],
    description: "Expired session and multi-scope binding => DENY (fail-closed)",
  },
  {
    caseId: "SC-MFA-PENDING",
    poisonCaseIds: [],
    description: "MFA posture marker documented as auditor-guidance-pending (not faked satisfied)",
  },
];

function runCase(caseDefinition: AuthBoundaryStaticConstructionCase): AuthBoundaryStaticConstructionCaseResult {
  const scopeA = buildScope({
    customerTenantId: "tenant-a",
    firmTenantId: "firm-a",
    clientTenantId: "client-a1",
    isolationScopeReferenceId: "scope-session-a",
  });

  const scopeB = buildScope({
    customerTenantId: "tenant-b",
    firmTenantId: "firm-b",
    clientTenantId: "client-b1",
    isolationScopeReferenceId: "scope-session-b",
  });

  switch (caseDefinition.caseId) {
    case "SC-ALLOW-01": {
      const result = evaluateAuthBoundary({
        sessionReferenceId: "session:valid-001",
        authenticatedPrincipalReferenceId: "principal:user-a",
        authenticationMethodCategory: "session_cookie",
        sessionLifecycleStatus: "active",
        credentialContextParseable: true,
        declaredBoundScopes: [scopeA],
        targetIsolationScope: scopeA,
        requesterPersonaKey: "firm_staff",
        requesterPersonaReferenceId: "persona:firm-staff-a",
        targetResourceReferenceId: "resource:opaque-ref:client-data-a",
        targetResourceVisibilityScope: "client_scoped",
        actorReferenceId: "actor:session-valid",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T13:00:00.000Z",
      });

      const passed =
        result.authOutcome === "allowed" &&
        result.composedOutcome === "allowed" &&
        result.boundIsolationScope?.isolationScopeReferenceId === "scope-session-a" &&
        result.authBoundaryContract?.boundIsolationScopeReferenceId === "scope-session-a" &&
        result.auditEvent.eventOutcome === "success";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: result.evaluationTrace,
        details: {
          authOutcome: result.authOutcome,
          boundScope: result.boundIsolationScope?.isolationScopeReferenceId,
        },
      };
    }

    case "SC-PC-14-AUTH-BYPASS": {
      const classification = classifySessionBinding({
        sessionReferenceId: null,
        authenticatedPrincipalReferenceId: null,
        authenticationMethodCategory: null,
        sessionLifecycleStatus: "missing",
        credentialContextParseable: true,
        declaredBoundScopes: [],
        targetIsolationScope: scopeA,
      });

      const evaluation = evaluateAuthBoundary({
        sessionReferenceId: null,
        authenticatedPrincipalReferenceId: null,
        authenticationMethodCategory: null,
        sessionLifecycleStatus: "missing",
        credentialContextParseable: true,
        declaredBoundScopes: [],
        targetIsolationScope: scopeA,
        requesterPersonaKey: "firm_staff",
        requesterPersonaReferenceId: "persona:unauthenticated",
        targetResourceReferenceId: "resource:opaque-ref:protected",
        targetResourceVisibilityScope: "client_scoped",
        actorReferenceId: "actor:auth-bypass",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T13:01:00.000Z",
      });

      const passed =
        classification.accessOutcome === "denied" &&
        (classification.denyReason === "missing_session" || classification.denyReason === "auth_bypass") &&
        evaluation.authOutcome === "denied" &&
        evaluation.auditEvent.eventOutcome === "denied";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: evaluation.evaluationTrace,
        details: {
          denyReason: evaluation.denyReason,
          auditOutcome: evaluation.auditEvent.eventOutcome,
        },
      };
    }

    case "SC-SESSION-SCOPE-MISMATCH": {
      const result = evaluateAuthBoundary({
        sessionReferenceId: "session:scope-a",
        authenticatedPrincipalReferenceId: "principal:user-a",
        authenticationMethodCategory: "api_token",
        sessionLifecycleStatus: "active",
        credentialContextParseable: true,
        declaredBoundScopes: [scopeA],
        targetIsolationScope: scopeB,
        requesterPersonaKey: "firm_staff",
        requesterPersonaReferenceId: "persona:firm-staff-a",
        targetResourceReferenceId: "resource:opaque-ref:tenant-b-data",
        targetResourceVisibilityScope: "client_scoped",
        actorReferenceId: "actor:scope-mismatch",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T13:02:00.000Z",
      });

      const passed =
        result.authOutcome === "denied" &&
        result.denyReason === "session_scope_mismatch" &&
        result.boundIsolationScope === null &&
        result.auditEvent.eventOutcome === "denied";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: result.evaluationTrace,
        details: {
          denyReason: result.denyReason,
          auditOutcome: result.auditEvent.eventOutcome,
        },
      };
    }

    case "SC-FAIL-CLOSED": {
      const expired = classifySessionBinding({
        sessionReferenceId: "session:expired",
        authenticatedPrincipalReferenceId: "principal:user-a",
        authenticationMethodCategory: "password",
        sessionLifecycleStatus: "expired",
        credentialContextParseable: true,
        declaredBoundScopes: [scopeA],
      });

      const multiScope = classifySessionBinding({
        sessionReferenceId: "session:multi-scope",
        authenticatedPrincipalReferenceId: "principal:user-a",
        authenticationMethodCategory: "sso",
        sessionLifecycleStatus: "active",
        credentialContextParseable: true,
        declaredBoundScopes: [scopeA, scopeB],
      });

      const ambiguous = classifySessionBinding({
        sessionReferenceId: "session:ambiguous",
        authenticatedPrincipalReferenceId: "principal:user-a",
        authenticationMethodCategory: "session_cookie",
        sessionLifecycleStatus: "ambiguous",
        credentialContextParseable: true,
        declaredBoundScopes: [scopeA],
      });

      const passed =
        expired.accessOutcome === "denied" &&
        expired.denyReason === "expired_session" &&
        multiScope.accessOutcome === "denied" &&
        multiScope.denyReason === "multi_scope_binding" &&
        ambiguous.accessOutcome === "denied" &&
        ambiguous.denyReason === "ambiguous_session";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: [
          ...expired.evaluationTrace,
          ...multiScope.evaluationTrace,
          ...ambiguous.evaluationTrace,
        ],
        details: {
          expiredDenyReason: expired.denyReason,
          multiScopeDenyReason: multiScope.denyReason,
          ambiguousDenyReason: ambiguous.denyReason,
        },
      };
    }

    case "SC-MFA-PENDING": {
      const result = evaluateAuthBoundary({
        sessionReferenceId: "session:mfa-check",
        authenticatedPrincipalReferenceId: "principal:user-a",
        authenticationMethodCategory: "session_cookie",
        sessionLifecycleStatus: "active",
        credentialContextParseable: true,
        declaredBoundScopes: [scopeA],
        targetIsolationScope: scopeA,
        requesterPersonaKey: "firm_admin",
        requesterPersonaReferenceId: "persona:firm-admin-a",
        targetResourceReferenceId: "resource:opaque-ref:mfa-check",
        targetResourceVisibilityScope: "firm_internal",
        actorReferenceId: "actor:mfa-check",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T13:03:00.000Z",
      });

      const marker = result.mfaPostureMarker;
      const passed =
        marker.mfaPostureStatus === MFA_POSTURE_AUDITOR_GUIDANCE_PENDING &&
        marker.assertsMfaSatisfied === false &&
        marker.postureDocumentedOnly === true &&
        result.evaluationTrace.some((entry) => entry.includes(MFA_POSTURE_AUDITOR_GUIDANCE_PENDING));

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: result.evaluationTrace,
        details: {
          mfaPostureStatus: marker.mfaPostureStatus,
          assertsMfaSatisfied: marker.assertsMfaSatisfied,
        },
      };
    }

    default:
      throw new Error(`Unknown auth boundary static construction case: ${caseDefinition.caseId}`);
  }
}

export function executeAuthBoundaryStaticConstructionTests(): {
  pass: boolean;
  results: AuthBoundaryStaticConstructionCaseResult[];
} {
  const results = AUTH_BOUNDARY_STATIC_CONSTRUCTION_CASES.map(runCase);

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

/** Validates deny/success audit parity for auth boundary evaluations. */
export function executeAuthBoundaryAuditParitySmokeTest(): boolean {
  const scope = buildScope({
    customerTenantId: "tenant-smoke",
    firmTenantId: "firm-smoke",
    clientTenantId: "client-smoke",
    isolationScopeReferenceId: "scope-smoke",
  });

  const allow = evaluateAuthBoundary({
    sessionReferenceId: "session:smoke-allow",
    authenticatedPrincipalReferenceId: "principal:smoke",
    authenticationMethodCategory: "session_cookie",
    sessionLifecycleStatus: "active",
    credentialContextParseable: true,
    declaredBoundScopes: [scope],
    targetIsolationScope: scope,
    requesterPersonaKey: "firm_staff",
    requesterPersonaReferenceId: "persona:smoke",
    targetResourceReferenceId: "resource:opaque-ref:smoke-allow",
    targetResourceVisibilityScope: "client_scoped",
    actorReferenceId: "actor:smoke-allow",
    retentionConfigurationReferenceId: "retention:spine-default",
    evaluationTimestampIso: "2026-06-18T13:04:00.000Z",
  });

  const deny = evaluateAuthBoundary({
    sessionReferenceId: null,
    authenticatedPrincipalReferenceId: null,
    authenticationMethodCategory: null,
    sessionLifecycleStatus: "missing",
    credentialContextParseable: true,
    declaredBoundScopes: [],
    targetIsolationScope: scope,
    requesterPersonaKey: "firm_staff",
    requesterPersonaReferenceId: "persona:smoke-deny",
    targetResourceReferenceId: "resource:opaque-ref:smoke-deny",
    targetResourceVisibilityScope: "client_scoped",
    actorReferenceId: "actor:smoke-deny",
    retentionConfigurationReferenceId: "retention:spine-default",
    evaluationTimestampIso: "2026-06-18T13:05:00.000Z",
  });

  return (
    allow.auditEvent.eventOutcome === "success" &&
    deny.auditEvent.eventOutcome === "denied" &&
    allow.auditEvent.containsVerticalComplianceLogic === false &&
    deny.auditEvent.executable === false
  );
}
