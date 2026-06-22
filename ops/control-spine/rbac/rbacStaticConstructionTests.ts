import type {
  ControlSpineIsolationDimension,
  PersonaRbacMatrixContract,
} from "../contracts";
import type { ControlSpineIsolationScope } from "../isolation";
import {
  classifyPersonaPermission,
  evaluateRbacAccess,
  type ClassifyPersonaPermissionCore,
} from "./evaluateRbacAccess";

export interface RbacStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  expectedRbacOutcome: "allowed" | "denied";
  expectedComposedOutcome?: "allowed" | "denied";
  expectedDenyReason?: string;
}

export interface RbacStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  rbacOutcome: string;
  composedOutcome: string | null;
  denyReason: string | null;
  evaluationTrace: string[];
}

function dimension(
  tenantScopeKey: string,
  referenceSuffix: string,
): ControlSpineIsolationDimension {
  return {
    isolationDimensionReferenceId: `dim-ref:${referenceSuffix}`,
    tenantScopeKey,
    boundaryReferenceIds: [`boundary:${referenceSuffix}`],
  };
}

function buildMatrixIsolationFields(scopeReferenceId: string): Pick<
  PersonaRbacMatrixContract,
  "customerIsolation" | "firmIsolation" | "clientIsolation"
> {
  return {
    customerIsolation: dimension("customer-1", `customer:${scopeReferenceId}`),
    firmIsolation: dimension("firm-a", `firm:${scopeReferenceId}`),
    clientIsolation: dimension("client-x", `client:${scopeReferenceId}`),
  };
}

function buildTestMatrix(): PersonaRbacMatrixContract {
  const scopeReferenceId = "rbac-matrix-scope";
  return {
    rbacMatrixContractId: "rbac-matrix:42-5c-test",
    rbacMatrixContractKey: "rbac-matrix:42-5c-test",
    containsVerticalComplianceLogic: false,
    executable: false,
    ...buildMatrixIsolationFields(scopeReferenceId),
    matrixEntries: [
      {
        personaKey: "firm_admin",
        personaReferenceId: "persona:firm-admin-1",
        denyByDefault: true,
        permissionGrants: [
          {
            permissionGrantReferenceId: "grant:firm-admin-settings-write",
            authorizedSurfaceReferenceId: "surface:firm-admin-settings",
            grantScopeReferenceId: "scope:write:firm_config",
          },
        ],
      },
      {
        personaKey: "firm_staff",
        personaReferenceId: "persona:firm-staff-1",
        denyByDefault: true,
        permissionGrants: [
          {
            permissionGrantReferenceId: "grant:staff-client-ledger-read",
            authorizedSurfaceReferenceId: "surface:client-ledger",
            grantScopeReferenceId: "scope:read:assigned_client",
          },
        ],
      },
    ],
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

export const RBAC_STATIC_CONSTRUCTION_CASES: RbacStaticConstructionCase[] = [
  {
    caseId: "SC-ALLOW-01",
    poisonCaseIds: [],
    description: "firm_admin with matching grant on firm-admin surface (RBAC-only allow)",
    expectedRbacOutcome: "allowed",
  },
  {
    caseId: "SC-DENY-PC-18",
    poisonCaseIds: ["PC-18"],
    description: "firm_staff requests firm-admin-only surface within same firm (isolation allows, RBAC denies)",
    expectedRbacOutcome: "denied",
    expectedComposedOutcome: "denied",
    expectedDenyReason: "permission_not_granted",
  },
  {
    caseId: "SC-DENY-PC-11",
    poisonCaseIds: ["PC-11"],
    description: "firm_staff reaches client-ledger via RBAC scope gap (broader scope than granted)",
    expectedRbacOutcome: "denied",
    expectedDenyReason: "rbac_scope_gap",
  },
  {
    caseId: "SC-DENY-FAIL-CLOSED",
    poisonCaseIds: [],
    description: "missing persona key (fail-closed)",
    expectedRbacOutcome: "denied",
    expectedDenyReason: "missing_persona",
  },
  {
    caseId: "SC-ALLOW-COMPOSED",
    poisonCaseIds: [],
    description: "firm_admin with RBAC grant and same-firm isolation both allow (composed allow)",
    expectedRbacOutcome: "allowed",
    expectedComposedOutcome: "allowed",
  },
  {
    caseId: "SC-DENY-ISOLATION-OVERRIDE",
    poisonCaseIds: [],
    description: "firm_admin RBAC grant present but cross-tenant isolation denies (composition override)",
    expectedRbacOutcome: "allowed",
    expectedComposedOutcome: "denied",
    expectedDenyReason: "isolation_denied_overrides_rbac_grant",
  },
];

function runRbacOnlyCase(caseDefinition: RbacStaticConstructionCase): ClassifyPersonaPermissionCore {
  const matrix = buildTestMatrix();

  switch (caseDefinition.caseId) {
    case "SC-ALLOW-01":
      return classifyPersonaPermission({
        personaKey: "firm_admin",
        personaReferenceId: "persona:firm-admin-1",
        rbacMatrix: matrix,
        requestedAction: {
          actionReferenceId: "action:write-firm-config",
          requestedGrantScopeReferenceId: "scope:write:firm_config",
        },
        targetResource: {
          resourceReferenceId: "resource:firm-admin-settings",
          authorizedSurfaceReferenceId: "surface:firm-admin-settings",
          requiredGrantScopeReferenceId: "scope:write:firm_config",
        },
      });

    case "SC-DENY-PC-18":
      return classifyPersonaPermission({
        personaKey: "firm_staff",
        personaReferenceId: "persona:firm-staff-1",
        rbacMatrix: matrix,
        requestedAction: {
          actionReferenceId: "action:write-firm-config",
          requestedGrantScopeReferenceId: "scope:write:firm_config",
        },
        targetResource: {
          resourceReferenceId: "resource:firm-admin-settings",
          authorizedSurfaceReferenceId: "surface:firm-admin-settings",
          requiredGrantScopeReferenceId: "scope:write:firm_config",
        },
      });

    case "SC-DENY-PC-11":
      return classifyPersonaPermission({
        personaKey: "firm_staff",
        personaReferenceId: "persona:firm-staff-1",
        rbacMatrix: matrix,
        requestedAction: {
          actionReferenceId: "action:read-all-clients",
          requestedGrantScopeReferenceId: "scope:read:all_clients",
        },
        targetResource: {
          resourceReferenceId: "resource:client-ledger-all",
          authorizedSurfaceReferenceId: "surface:client-ledger",
          requiredGrantScopeReferenceId: "scope:read:all_clients",
        },
      });

    case "SC-DENY-FAIL-CLOSED":
      return classifyPersonaPermission({
        personaKey: null,
        personaReferenceId: "persona:missing-key",
        rbacMatrix: matrix,
        requestedAction: {
          actionReferenceId: "action:any",
          requestedGrantScopeReferenceId: "scope:any",
        },
        targetResource: {
          resourceReferenceId: "resource:any",
          authorizedSurfaceReferenceId: "surface:any",
          requiredGrantScopeReferenceId: "scope:any",
        },
      });

    default:
      throw new Error(`RBAC-only case not handled: ${caseDefinition.caseId}`);
  }
}

export function executeRbacStaticConstructionTests(): {
  pass: boolean;
  results: RbacStaticConstructionCaseResult[];
} {
  const matrix = buildTestMatrix();

  const results: RbacStaticConstructionCaseResult[] = RBAC_STATIC_CONSTRUCTION_CASES.map((caseDefinition) => {
    if (caseDefinition.caseId === "SC-ALLOW-COMPOSED") {
      const evaluation = evaluateRbacAccess({
        personaKey: "firm_admin",
        personaReferenceId: "persona:firm-admin-1",
        rbacMatrix: matrix,
        requestedAction: {
          actionReferenceId: "action:write-firm-config",
          requestedGrantScopeReferenceId: "scope:write:firm_config",
        },
        targetResource: {
          resourceReferenceId: "resource:firm-admin-settings",
          authorizedSurfaceReferenceId: "surface:firm-admin-settings",
          requiredGrantScopeReferenceId: "scope:write:firm_config",
        },
        actorReferenceId: "actor:composed-allow",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T00:00:00.000Z",
        isolationInput: {
          requesterPersonaKey: "firm_admin",
          requesterPersonaReferenceId: "persona:firm-admin-1",
          requesterScope: buildScope({
            customerTenantId: "customer-1",
            firmTenantId: "firm-a",
            clientTenantId: "client-x",
            isolationScopeReferenceId: "scope-requester-composed-allow",
          }),
          targetResourceReferenceId: "resource:firm-admin-settings",
          targetResourceVisibilityScope: "firm_internal",
          targetScope: buildScope({
            customerTenantId: "customer-1",
            firmTenantId: "firm-a",
            clientTenantId: "client-x",
            isolationScopeReferenceId: "scope-target-composed-allow",
          }),
        },
      });

      const rbacMatches = evaluation.rbacOutcome === caseDefinition.expectedRbacOutcome;
      const composedMatches =
        caseDefinition.expectedComposedOutcome === undefined ||
        evaluation.composedOutcome === caseDefinition.expectedComposedOutcome;
      const passed =
        rbacMatches &&
        composedMatches &&
        evaluation.isolationAccessOutcome === "allowed" &&
        evaluation.denyReason === null;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        rbacOutcome: evaluation.rbacOutcome,
        composedOutcome: evaluation.composedOutcome,
        denyReason: evaluation.denyReason,
        evaluationTrace: evaluation.evaluationTrace,
      };
    }

    if (caseDefinition.caseId === "SC-DENY-ISOLATION-OVERRIDE") {
      const evaluation = evaluateRbacAccess({
        personaKey: "firm_admin",
        personaReferenceId: "persona:firm-admin-1",
        rbacMatrix: matrix,
        requestedAction: {
          actionReferenceId: "action:write-firm-config",
          requestedGrantScopeReferenceId: "scope:write:firm_config",
        },
        targetResource: {
          resourceReferenceId: "resource:firm-admin-settings",
          authorizedSurfaceReferenceId: "surface:firm-admin-settings",
          requiredGrantScopeReferenceId: "scope:write:firm_config",
        },
        actorReferenceId: "actor:composition-override",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T00:00:00.000Z",
        isolationInput: {
          requesterPersonaKey: "firm_admin",
          requesterPersonaReferenceId: "persona:firm-admin-1",
          requesterScope: buildScope({
            customerTenantId: "tenant-a",
            firmTenantId: "firm-a",
            clientTenantId: "client-a1",
            isolationScopeReferenceId: "scope-requester-tenant-a",
          }),
          targetResourceReferenceId: "resource:firm-admin-settings",
          targetResourceVisibilityScope: "firm_internal",
          targetScope: buildScope({
            customerTenantId: "tenant-b",
            firmTenantId: "firm-b",
            clientTenantId: "client-b1",
            isolationScopeReferenceId: "scope-target-tenant-b",
          }),
        },
      });

      const denyReasonMatches =
        caseDefinition.expectedDenyReason === undefined ||
        evaluation.denyReason === caseDefinition.expectedDenyReason;
      const rbacMatches = evaluation.rbacOutcome === caseDefinition.expectedRbacOutcome;
      const composedMatches =
        caseDefinition.expectedComposedOutcome === undefined ||
        evaluation.composedOutcome === caseDefinition.expectedComposedOutcome;
      const passed = rbacMatches && composedMatches && denyReasonMatches;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        rbacOutcome: evaluation.rbacOutcome,
        composedOutcome: evaluation.composedOutcome,
        denyReason: evaluation.denyReason,
        evaluationTrace: evaluation.evaluationTrace,
      };
    }

    if (caseDefinition.caseId === "SC-DENY-PC-18") {
      const evaluation = evaluateRbacAccess({
        personaKey: "firm_staff",
        personaReferenceId: "persona:firm-staff-1",
        rbacMatrix: matrix,
        requestedAction: {
          actionReferenceId: "action:write-firm-config",
          requestedGrantScopeReferenceId: "scope:write:firm_config",
        },
        targetResource: {
          resourceReferenceId: "resource:firm-admin-settings",
          authorizedSurfaceReferenceId: "surface:firm-admin-settings",
          requiredGrantScopeReferenceId: "scope:write:firm_config",
        },
        actorReferenceId: "actor:pc-18",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T00:00:00.000Z",
        isolationInput: {
          requesterPersonaKey: "firm_staff",
          requesterPersonaReferenceId: "persona:firm-staff-1",
          requesterScope: buildScope({
            customerTenantId: "customer-1",
            firmTenantId: "firm-a",
            clientTenantId: "client-x",
            isolationScopeReferenceId: "scope-requester-pc18",
          }),
          targetResourceReferenceId: "resource:firm-admin-settings",
          targetResourceVisibilityScope: "firm_internal",
          targetScope: buildScope({
            customerTenantId: "customer-1",
            firmTenantId: "firm-a",
            clientTenantId: "client-x",
            isolationScopeReferenceId: "scope-target-pc18",
          }),
        },
      });

      const denyReasonMatches =
        caseDefinition.expectedDenyReason === undefined ||
        evaluation.denyReason === caseDefinition.expectedDenyReason;
      const rbacMatches = evaluation.rbacOutcome === caseDefinition.expectedRbacOutcome;
      const composedMatches =
        caseDefinition.expectedComposedOutcome === undefined ||
        evaluation.composedOutcome === caseDefinition.expectedComposedOutcome;
      const isolationAllowed = evaluation.isolationAccessOutcome === "allowed";
      const passed =
        rbacMatches && composedMatches && denyReasonMatches && isolationAllowed;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        rbacOutcome: evaluation.rbacOutcome,
        composedOutcome: evaluation.composedOutcome,
        denyReason: evaluation.denyReason,
        evaluationTrace: evaluation.evaluationTrace,
      };
    }

    const classification = runRbacOnlyCase(caseDefinition);
    const denyReasonMatches =
      caseDefinition.expectedDenyReason === undefined ||
      classification.denyReason === caseDefinition.expectedDenyReason;
    const passed = classification.accessOutcome === caseDefinition.expectedRbacOutcome && denyReasonMatches;

    return {
      caseId: caseDefinition.caseId,
      poisonCaseIds: caseDefinition.poisonCaseIds,
      description: caseDefinition.description,
      passed,
      rbacOutcome: classification.accessOutcome,
      composedOutcome: null,
      denyReason: classification.denyReason,
      evaluationTrace: classification.evaluationTrace,
    };
  });

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

/** Validates audit-shaped artifact emission for both ALLOW and DENY paths. */
export function executeRbacAuditArtifactSmokeTest(): boolean {
  const matrix = buildTestMatrix();

  const allowEvaluation = evaluateRbacAccess({
    personaKey: "firm_admin",
    personaReferenceId: "persona:firm-admin-1",
    rbacMatrix: matrix,
    requestedAction: {
      actionReferenceId: "action:write-firm-config",
      requestedGrantScopeReferenceId: "scope:write:firm_config",
    },
    targetResource: {
      resourceReferenceId: "resource:audit-allow",
      authorizedSurfaceReferenceId: "surface:firm-admin-settings",
      requiredGrantScopeReferenceId: "scope:write:firm_config",
    },
    actorReferenceId: "actor:audit-allow",
    retentionConfigurationReferenceId: "retention:spine-default",
    evaluationTimestampIso: "2026-06-18T00:00:00.000Z",
  });

  const denyEvaluation = evaluateRbacAccess({
    personaKey: "firm_staff",
    personaReferenceId: "persona:firm-staff-1",
    rbacMatrix: matrix,
    requestedAction: {
      actionReferenceId: "action:write-firm-config",
      requestedGrantScopeReferenceId: "scope:write:firm_config",
    },
    targetResource: {
      resourceReferenceId: "resource:audit-deny",
      authorizedSurfaceReferenceId: "surface:firm-admin-settings",
      requiredGrantScopeReferenceId: "scope:write:firm_config",
    },
    actorReferenceId: "actor:audit-deny",
    retentionConfigurationReferenceId: "retention:spine-default",
    evaluationTimestampIso: "2026-06-18T00:00:00.000Z",
  });

  return (
    allowEvaluation.containsVerticalComplianceLogic === false &&
    allowEvaluation.executable === false &&
    allowEvaluation.auditEvent.eventOutcome === "success" &&
    denyEvaluation.auditEvent.eventOutcome === "denied" &&
    denyEvaluation.auditEvent.containsVerticalComplianceLogic === false &&
    denyEvaluation.auditEvent.executable === false
  );
}
