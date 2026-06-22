import type { ControlSpineIsolationScope } from "../isolation";
import {
  classifyConfigAttributeReach,
  evaluateIndustryConfigIsolation,
  type IndustryConfigRecordDescriptor,
} from "./evaluateIndustryConfigIsolation";

export interface TenantAttributeStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
}

export interface TenantAttributeStaticConstructionCaseResult {
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

function buildConfigRecord(input: {
  recordId: string;
  storeId: string;
  industryClassificationRef: string;
  scope: ControlSpineIsolationScope;
  configScopeParseable?: boolean;
}): IndustryConfigRecordDescriptor {
  return {
    industryConfigRecordReferenceId: input.recordId,
    tenantAttributeStoreReferenceId: input.storeId,
    industryClassificationReferenceId: input.industryClassificationRef,
    visibilityScope: "client_scoped",
    isolationScope: input.scope,
    configScopeParseable: input.configScopeParseable ?? true,
  };
}

export const TENANT_ATTRIBUTE_STATIC_CONSTRUCTION_CASES: TenantAttributeStaticConstructionCase[] = [
  {
    caseId: "SC-ALLOW-SAME-BOUNDARY",
    poisonCaseIds: [],
    description: "Same-boundary config read => allowed (tenant reads its own industry config)",
  },
  {
    caseId: "SC-DENY-CROSS-TENANT",
    poisonCaseIds: [],
    description: "Cross-tenant config read => DENY (config inherits isolation)",
  },
  {
    caseId: "SC-DENY-CROSS-FIRM-STAFF",
    poisonCaseIds: ["PC-16-config-layer"],
    description: "Cross-firm-staff config read => DENY (mirrors PC-16 at config layer)",
  },
  {
    caseId: "SC-COMPOSITION-ISOLATION-DENY",
    poisonCaseIds: [],
    description: "Isolation DENY on config record => overall DENY (config never broader than data)",
  },
  {
    caseId: "SC-FAIL-CLOSED",
    poisonCaseIds: [],
    description: "Ambiguous config scope => DENY (fail-closed)",
  },
  {
    caseId: "SC-INVARIANT-NO-VERTICAL-LOGIC",
    poisonCaseIds: [],
    description: "Evaluator isolates config STORAGE without containing industry compliance LOGIC",
  },
];

function runCase(caseDefinition: TenantAttributeStaticConstructionCase): TenantAttributeStaticConstructionCaseResult {
  const scopeTenantA = buildScope({
    customerTenantId: "tenant-a",
    firmTenantId: "firm-a",
    clientTenantId: "client-a1",
    isolationScopeReferenceId: "scope-config-a",
  });

  const scopeTenantB = buildScope({
    customerTenantId: "tenant-b",
    firmTenantId: "firm-b",
    clientTenantId: "client-b1",
    isolationScopeReferenceId: "scope-config-b",
  });

  const scopeFirmBClient = buildScope({
    customerTenantId: "customer-shared",
    firmTenantId: "firm-b",
    clientTenantId: "client-b-hosted",
    isolationScopeReferenceId: "scope-config-firm-b",
  });

  const scopeFirmAStaff = buildScope({
    customerTenantId: "customer-shared",
    firmTenantId: "firm-a",
    clientTenantId: "client-a-hosted",
    isolationScopeReferenceId: "scope-config-firm-a-staff",
  });

  switch (caseDefinition.caseId) {
    case "SC-ALLOW-SAME-BOUNDARY": {
      const configRecord = buildConfigRecord({
        recordId: "industry-config:tenant-a-client-a1",
        storeId: "tenant-attribute-store:tenant-a",
        industryClassificationRef: "industry-classification:healthcare-provider",
        scope: scopeTenantA,
      });

      const result = evaluateIndustryConfigIsolation({
        requesterPersonaKey: "firm_staff",
        requesterPersonaReferenceId: "persona:firm-staff-a",
        requesterScope: scopeTenantA,
        targetConfigRecord: configRecord,
        actorReferenceId: "actor:config-read-allow",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T14:00:00.000Z",
      });

      const passed =
        result.configReachOutcome === "allowed" &&
        result.composedOutcome === "allowed" &&
        result.isolationAccessOutcome === "allowed" &&
        result.commandCenterInvariantMarker.configStorageInheritsIsolation === true &&
        result.auditEvent.eventOutcome === "success";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: result.evaluationTrace,
        details: {
          configReachOutcome: result.configReachOutcome,
          industryClassificationRef: configRecord.industryClassificationReferenceId,
        },
      };
    }

    case "SC-DENY-CROSS-TENANT": {
      const configRecord = buildConfigRecord({
        recordId: "industry-config:tenant-b-client-b1",
        storeId: "tenant-attribute-store:tenant-b",
        industryClassificationRef: "industry-classification:retail",
        scope: scopeTenantB,
      });

      const result = evaluateIndustryConfigIsolation({
        requesterPersonaKey: "firm_staff",
        requesterPersonaReferenceId: "persona:firm-staff-tenant-a",
        requesterScope: scopeTenantA,
        targetConfigRecord: configRecord,
        actorReferenceId: "actor:config-cross-tenant",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T14:01:00.000Z",
      });

      const passed =
        result.configReachOutcome === "denied" &&
        result.composedOutcome === "denied" &&
        result.denyReason === "cross_customer_tenant" &&
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

    case "SC-DENY-CROSS-FIRM-STAFF": {
      const configRecord = buildConfigRecord({
        recordId: "industry-config:firm-b-client-b-hosted",
        storeId: "tenant-attribute-store:firm-b",
        industryClassificationRef: "industry-classification:manufacturing",
        scope: scopeFirmBClient,
      });

      const result = evaluateIndustryConfigIsolation({
        requesterPersonaKey: "firm_staff",
        requesterPersonaReferenceId: "persona:firm-a-staff",
        requesterScope: scopeFirmAStaff,
        targetConfigRecord: configRecord,
        actorReferenceId: "actor:config-cross-firm-staff",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T14:02:00.000Z",
      });

      const passed =
        result.configReachOutcome === "denied" &&
        result.denyReason === "cross_firm_staff_reach" &&
        result.evaluationTrace.includes("compose:config_never_broader_than_data");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: result.evaluationTrace,
        details: {
          denyReason: result.denyReason,
        },
      };
    }

    case "SC-COMPOSITION-ISOLATION-DENY": {
      const configRecord = buildConfigRecord({
        recordId: "industry-config:composition-deny",
        storeId: "tenant-attribute-store:tenant-b",
        industryClassificationRef: "industry-classification:generic",
        scope: scopeTenantB,
      });

      const classification = classifyConfigAttributeReach({
        requesterPersonaKey: "client_controller",
        requesterPersonaReferenceId: "persona:client-controller-a",
        requesterScope: scopeTenantA,
        targetConfigRecord: configRecord,
      });

      const passed =
        classification.configReachOutcome === "denied" &&
        classification.isolationAccessOutcome === "denied" &&
        classification.evaluationTrace.includes("compose:config_through_isolation") &&
        classification.evaluationTrace.includes("compose:config_never_broader_than_data");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: classification.evaluationTrace,
        details: {
          configReachOutcome: classification.configReachOutcome,
          isolationAccessOutcome: classification.isolationAccessOutcome,
        },
      };
    }

    case "SC-FAIL-CLOSED": {
      const ambiguousRecord = buildConfigRecord({
        recordId: "industry-config:ambiguous-scope",
        storeId: "tenant-attribute-store:ambiguous",
        industryClassificationRef: "industry-classification:unknown",
        scope: scopeTenantA,
        configScopeParseable: false,
      });

      const result = classifyConfigAttributeReach({
        requesterPersonaKey: "firm_admin",
        requesterPersonaReferenceId: "persona:firm-admin",
        requesterScope: scopeTenantA,
        targetConfigRecord: ambiguousRecord,
      });

      const passed =
        result.configReachOutcome === "denied" &&
        result.denyReason === "ambiguous_config_scope";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: result.evaluationTrace,
        details: {
          denyReason: result.denyReason,
        },
      };
    }

    case "SC-INVARIANT-NO-VERTICAL-LOGIC": {
      const healthcareConfig = buildConfigRecord({
        recordId: "industry-config:healthcare-classification-ref",
        storeId: "tenant-attribute-store:invariant-check",
        industryClassificationRef: "industry-classification:healthcare-provider",
        scope: scopeTenantA,
      });

      const result = evaluateIndustryConfigIsolation({
        requesterPersonaKey: "firm_admin",
        requesterPersonaReferenceId: "persona:firm-admin-invariant",
        requesterScope: scopeTenantA,
        targetConfigRecord: healthcareConfig,
        actorReferenceId: "actor:invariant-check",
        retentionConfigurationReferenceId: "retention:spine-default",
        evaluationTimestampIso: "2026-06-18T14:03:00.000Z",
      });

      const evaluatorSource = `
        ${result.containsVerticalComplianceLogic}
        ${result.commandCenterInvariantMarker.isolatesConfigStorageOnly}
        ${result.evaluationTrace.join(" ")}
      `.toLowerCase();

      const passed =
        result.containsVerticalComplianceLogic === false &&
        result.executable === false &&
        result.commandCenterInvariantMarker.containsVerticalComplianceLogic === false &&
        result.commandCenterInvariantMarker.isolatesConfigStorageOnly === true &&
        result.commandCenterInvariantMarker.panelSelectionNotEvaluatedHere === true &&
        !evaluatorSource.includes("hipaa") &&
        !evaluatorSource.includes("phi ") &&
        result.configReachOutcome === "allowed";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        evaluationTrace: result.evaluationTrace,
        details: {
          containsVerticalComplianceLogic: result.containsVerticalComplianceLogic,
          isolatesConfigStorageOnly: result.commandCenterInvariantMarker.isolatesConfigStorageOnly,
          industryClassificationRef: healthcareConfig.industryClassificationReferenceId,
        },
      };
    }

    default:
      throw new Error(`Unknown tenant-attribute static construction case: ${caseDefinition.caseId}`);
  }
}

export function executeTenantAttributeStaticConstructionTests(): {
  pass: boolean;
  results: TenantAttributeStaticConstructionCaseResult[];
} {
  const results = TENANT_ATTRIBUTE_STATIC_CONSTRUCTION_CASES.map(runCase);

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

/** Validates allow/deny audit parity for industry-config isolation evaluations. */
export function executeTenantAttributeAuditParitySmokeTest(): boolean {
  const scope = buildScope({
    customerTenantId: "tenant-smoke",
    firmTenantId: "firm-smoke",
    clientTenantId: "client-smoke",
    isolationScopeReferenceId: "scope-smoke-config",
  });

  const configRecord = buildConfigRecord({
    recordId: "industry-config:smoke",
    storeId: "tenant-attribute-store:smoke",
    industryClassificationRef: "industry-classification:smoke",
    scope,
  });

  const allow = evaluateIndustryConfigIsolation({
    requesterPersonaKey: "firm_staff",
    requesterPersonaReferenceId: "persona:smoke-allow",
    requesterScope: scope,
    targetConfigRecord: configRecord,
    actorReferenceId: "actor:smoke-allow",
    retentionConfigurationReferenceId: "retention:spine-default",
    evaluationTimestampIso: "2026-06-18T14:04:00.000Z",
  });

  const denyScope = buildScope({
    customerTenantId: "tenant-other",
    firmTenantId: "firm-other",
    clientTenantId: "client-other",
    isolationScopeReferenceId: "scope-other-config",
  });

  const deny = evaluateIndustryConfigIsolation({
    requesterPersonaKey: "firm_staff",
    requesterPersonaReferenceId: "persona:smoke-deny",
    requesterScope: denyScope,
    targetConfigRecord: configRecord,
    actorReferenceId: "actor:smoke-deny",
    retentionConfigurationReferenceId: "retention:spine-default",
    evaluationTimestampIso: "2026-06-18T14:05:00.000Z",
  });

  return (
    allow.auditEvent.eventOutcome === "success" &&
    deny.auditEvent.eventOutcome === "denied" &&
    allow.auditEvent.containsVerticalComplianceLogic === false &&
    deny.executable === false
  );
}
