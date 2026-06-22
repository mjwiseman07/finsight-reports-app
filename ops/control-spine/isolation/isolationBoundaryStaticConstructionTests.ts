import type { ControlSpineIsolationScope } from "./evaluateIsolationBoundary";
import {
  classifyIsolationReach,
  evaluateIsolationBoundary,
  type ClassifyIsolationReachCore,
} from "./evaluateIsolationBoundary";

export interface IsolationBoundaryStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  expectedOutcome: "allowed" | "denied";
  expectedDenyReason?: string;
}

export interface IsolationBoundaryStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  accessOutcome: string;
  denyReason: string | null;
  evaluationTrace: string[];
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

export const ISOLATION_BOUNDARY_STATIC_CONSTRUCTION_CASES: IsolationBoundaryStaticConstructionCase[] = [
  {
    caseId: "SC-ALLOW-01",
    poisonCaseIds: [],
    description: "firm_staff accessing client_scoped resource within same customer/firm/client boundary",
    expectedOutcome: "allowed",
  },
  {
    caseId: "SC-DENY-CROSS-TENANT",
    poisonCaseIds: ["PC-01", "PC-04", "PC-19"],
    description: "Tenant A persona requesting Tenant B client_scoped resource",
    expectedOutcome: "denied",
    expectedDenyReason: "cross_customer_tenant",
  },
  {
    caseId: "SC-DENY-PC-16",
    poisonCaseIds: ["PC-16"],
    description: "Firm A firm_staff requesting Firm B client_scoped resource under same customer",
    expectedOutcome: "denied",
    expectedDenyReason: "cross_firm_staff_reach",
  },
  {
    caseId: "SC-DENY-PC-17",
    poisonCaseIds: ["PC-17"],
    description: "client-side persona requesting firm_internal resource at hosting firm",
    expectedOutcome: "denied",
    expectedDenyReason: "client_side_firm_internal_reach",
  },
  {
    caseId: "SC-DENY-AMBIGUOUS",
    poisonCaseIds: [],
    description: "missing requester isolation scope (fail-closed)",
    expectedOutcome: "denied",
    expectedDenyReason: "missing_requester_scope",
  },
];

function runCase(caseDefinition: IsolationBoundaryStaticConstructionCase): {
  classification: ClassifyIsolationReachCore;
  caseDefinition: IsolationBoundaryStaticConstructionCase;
} {
  switch (caseDefinition.caseId) {
    case "SC-ALLOW-01":
      return {
        caseDefinition,
        classification: classifyIsolationReach({
          requesterPersonaKey: "firm_staff",
          requesterPersonaReferenceId: "persona:firm-staff-1",
          requesterScope: buildScope({
            customerTenantId: "customer-1",
            firmTenantId: "firm-a",
            clientTenantId: "client-x",
            isolationScopeReferenceId: "scope-requester-allow",
          }),
          targetResourceReferenceId: "resource:client-x-ledger",
          targetResourceVisibilityScope: "client_scoped",
          targetScope: buildScope({
            customerTenantId: "customer-1",
            firmTenantId: "firm-a",
            clientTenantId: "client-x",
            isolationScopeReferenceId: "scope-target-allow",
          }),
        }),
      };

    case "SC-DENY-CROSS-TENANT":
      return {
        caseDefinition,
        classification: classifyIsolationReach({
          requesterPersonaKey: "firm_staff",
          requesterPersonaReferenceId: "persona:firm-staff-tenant-a",
          requesterScope: buildScope({
            customerTenantId: "tenant-a",
            firmTenantId: "firm-a",
            clientTenantId: "client-a1",
            isolationScopeReferenceId: "scope-requester-tenant-a",
          }),
          targetResourceReferenceId: "resource:tenant-b-client-data",
          targetResourceVisibilityScope: "client_scoped",
          targetScope: buildScope({
            customerTenantId: "tenant-b",
            firmTenantId: "firm-b",
            clientTenantId: "client-b1",
            isolationScopeReferenceId: "scope-target-tenant-b",
          }),
        }),
      };

    case "SC-DENY-PC-16":
      return {
        caseDefinition,
        classification: classifyIsolationReach({
          requesterPersonaKey: "firm_staff",
          requesterPersonaReferenceId: "persona:firm-a-staff",
          requesterScope: buildScope({
            customerTenantId: "customer-shared",
            firmTenantId: "firm-a",
            clientTenantId: "client-a-hosted",
            isolationScopeReferenceId: "scope-requester-firm-a",
          }),
          targetResourceReferenceId: "resource:firm-b-client-record",
          targetResourceVisibilityScope: "client_scoped",
          targetScope: buildScope({
            customerTenantId: "customer-shared",
            firmTenantId: "firm-b",
            clientTenantId: "client-b-hosted",
            isolationScopeReferenceId: "scope-target-firm-b-client",
          }),
        }),
      };

    case "SC-DENY-PC-17":
      return {
        caseDefinition,
        classification: classifyIsolationReach({
          requesterPersonaKey: "client_controller",
          requesterPersonaReferenceId: "persona:client-controller-x",
          requesterScope: buildScope({
            customerTenantId: "customer-1",
            firmTenantId: "firm-a",
            clientTenantId: "client-x",
            isolationScopeReferenceId: "scope-requester-client-side",
          }),
          targetResourceReferenceId: "resource:firm-internal-client-list",
          targetResourceVisibilityScope: "firm_internal",
          targetScope: buildScope({
            customerTenantId: "customer-1",
            firmTenantId: "firm-a",
            clientTenantId: "client-x",
            isolationScopeReferenceId: "scope-target-firm-internal",
          }),
        }),
      };

    case "SC-DENY-AMBIGUOUS":
      return {
        caseDefinition,
        classification: classifyIsolationReach({
          requesterPersonaKey: "firm_staff",
          requesterPersonaReferenceId: "persona:missing-scope",
          requesterScope: null,
          targetResourceReferenceId: "resource:any",
          targetResourceVisibilityScope: "client_scoped",
          targetScope: buildScope({
            customerTenantId: "customer-1",
            firmTenantId: "firm-a",
            clientTenantId: "client-x",
            isolationScopeReferenceId: "scope-target-only",
          }),
        }),
      };

    default:
      throw new Error(`Unknown static construction case: ${caseDefinition.caseId}`);
  }
}

export function executeIsolationBoundaryStaticConstructionTests(): {
  pass: boolean;
  results: IsolationBoundaryStaticConstructionCaseResult[];
} {
  const results: IsolationBoundaryStaticConstructionCaseResult[] = ISOLATION_BOUNDARY_STATIC_CONSTRUCTION_CASES.map(
    (caseDefinition) => {
      const { classification } = runCase(caseDefinition);
      const denyReasonMatches =
        caseDefinition.expectedDenyReason === undefined ||
        classification.denyReason === caseDefinition.expectedDenyReason;
      const passed =
        classification.accessOutcome === caseDefinition.expectedOutcome && denyReasonMatches;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        accessOutcome: classification.accessOutcome,
        denyReason: classification.denyReason,
        evaluationTrace: classification.evaluationTrace,
      };
    },
  );

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

/** Validates audit-shaped artifact emission for both ALLOW and DENY paths. */
export function executeIsolationBoundaryAuditArtifactSmokeTest(): boolean {
  const allowEvaluation = evaluateIsolationBoundary({
    requesterPersonaKey: "firm_staff",
    requesterPersonaReferenceId: "persona:firm-staff-1",
    requesterScope: buildScope({
      customerTenantId: "customer-1",
      firmTenantId: "firm-a",
      clientTenantId: "client-x",
      isolationScopeReferenceId: "scope-audit-allow",
    }),
    targetResourceReferenceId: "resource:audit-allow",
    targetResourceVisibilityScope: "client_scoped",
    targetScope: buildScope({
      customerTenantId: "customer-1",
      firmTenantId: "firm-a",
      clientTenantId: "client-x",
      isolationScopeReferenceId: "scope-audit-allow-target",
    }),
    actorReferenceId: "actor:audit-allow",
    retentionConfigurationReferenceId: "retention:spine-default",
    evaluationTimestampIso: "2026-06-18T00:00:00.000Z",
  });

  const denyEvaluation = evaluateIsolationBoundary({
    requesterPersonaKey: "client_controller",
    requesterPersonaReferenceId: "persona:client-controller",
    requesterScope: buildScope({
      customerTenantId: "customer-1",
      firmTenantId: "firm-a",
      clientTenantId: "client-x",
      isolationScopeReferenceId: "scope-audit-deny",
    }),
    targetResourceReferenceId: "resource:audit-deny",
    targetResourceVisibilityScope: "firm_internal",
    targetScope: buildScope({
      customerTenantId: "customer-1",
      firmTenantId: "firm-a",
      clientTenantId: "client-x",
      isolationScopeReferenceId: "scope-audit-deny-target",
    }),
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
