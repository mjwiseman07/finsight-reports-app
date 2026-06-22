import type { ControlSpineIsolationDimension } from "../contracts";
import {
  buildAuditEvent,
  createSpineRetentionBaselineConfiguration,
  mergeRetentionWithOverlayContributions,
  SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS,
} from "./buildAuditEvent";

export interface AuditStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
}

export interface AuditStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  buildTrace: string[];
  details: Record<string, unknown>;
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

function buildIsolationFields(scopeReferenceId: string): {
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
} {
  return {
    customerIsolation: dimension("customer-1", `customer:${scopeReferenceId}`),
    firmIsolation: dimension("firm-a", `firm:${scopeReferenceId}`),
    clientIsolation: dimension("client-x", `client:${scopeReferenceId}`),
  };
}

export const AUDIT_STATIC_CONSTRUCTION_CASES: AuditStaticConstructionCase[] = [
  {
    caseId: "SC-DENY-AUDIT",
    poisonCaseIds: ["PC-03-partial"],
    description: "DENY audit event constructed with outcome denied and retention ref present",
  },
  {
    caseId: "SC-SUCCESS-AUDIT",
    poisonCaseIds: [],
    description: "SUCCESS audit event constructed with outcome success",
  },
  {
    caseId: "SC-INCOMPLETE-NO-DROP",
    poisonCaseIds: [],
    description: "Incomplete inputs produce incomplete_anomalous record — never silent no-record",
  },
  {
    caseId: "SC-RETENTION-MAX-MERGE",
    poisonCaseIds: ["PC-03-partial"],
    description: "Retention MAX-merge takes larger of spine baseline vs overlay-contributed duration",
  },
  {
    caseId: "SC-NO-PHI-EMBED",
    poisonCaseIds: [],
    description: "Audit references resource by opaque ref only — no sensitive content embedded",
  },
];

function runCase(caseDefinition: AuditStaticConstructionCase): AuditStaticConstructionCaseResult {
  const isolation = buildIsolationFields("audit-test-scope");
  const baseline = createSpineRetentionBaselineConfiguration({
    ...isolation,
  });

  switch (caseDefinition.caseId) {
    case "SC-DENY-AUDIT": {
      const result = buildAuditEvent({
        eventCategory: "access",
        actorReferenceId: "actor:isolation-deny",
        personaReferenceId: "persona:firm-staff-1",
        actionReferenceId: "action:read-resource",
        targetResourceReferenceId: "resource:opaque-ref:client-ledger-42",
        eventOutcome: "denied",
        ...isolation,
        eventTimestampIso: "2026-06-18T12:00:00.000Z",
        retentionConfigurationReferenceId: baseline.resolvedRetentionPolicyReferenceId,
        evaluationTrace: ["isolation:denied", "deny:cross_customer_tenant"],
        sequenceOrdinal: 101,
      });

      const passed =
        result.auditEvent !== undefined &&
        result.auditEvent.eventOutcome === "denied" &&
        result.auditEvent.retentionConfigurationReferenceId.length > 0 &&
        result.buildCompleteness === "complete" &&
        result.containsVerticalComplianceLogic === false &&
        result.executable === false;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: result.buildTrace,
        details: {
          eventOutcome: result.auditEvent.eventOutcome,
          retentionConfigurationReferenceId: result.auditEvent.retentionConfigurationReferenceId,
          tamperEvidentOrderingHint: result.tamperEvidentOrderingHint,
        },
      };
    }

    case "SC-SUCCESS-AUDIT": {
      const result = buildAuditEvent({
        eventCategory: "authorization",
        actorReferenceId: "actor:rbac-allow",
        personaReferenceId: "persona:firm-admin-1",
        actionReferenceId: "action:write-config",
        targetResourceReferenceId: "resource:opaque-ref:firm-settings-7",
        eventOutcome: "success",
        ...isolation,
        eventTimestampIso: "2026-06-18T12:01:00.000Z",
        retentionConfigurationReferenceId: baseline.resolvedRetentionPolicyReferenceId,
        evaluationTrace: ["rbac:allowed", "compose:both_allowed"],
        sequenceOrdinal: 102,
      });

      const passed =
        result.auditEvent.eventOutcome === "success" &&
        result.buildCompleteness === "complete" &&
        result.auditEvent.auditTrailReferenceIds.includes("rbac:allowed");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: result.buildTrace,
        details: {
          eventOutcome: result.auditEvent.eventOutcome,
          auditTrailReferenceIds: result.auditEvent.auditTrailReferenceIds,
        },
      };
    }

    case "SC-INCOMPLETE-NO-DROP": {
      const result = buildAuditEvent({
        eventCategory: "access",
        actorReferenceId: null,
        actionReferenceId: undefined,
        targetResourceReferenceId: "",
        eventOutcome: "denied",
        customerIsolation: null,
        firmIsolation: undefined,
        clientIsolation: isolation.clientIsolation,
        eventTimestampIso: null,
        retentionConfigurationReferenceId: undefined,
        sequenceOrdinal: 103,
      });

      const passed =
        result !== undefined &&
        result.auditEvent !== undefined &&
        result.buildCompleteness === "incomplete_anomalous" &&
        result.auditEvent.eventOutcome === "failure" &&
        result.auditEvent.actorReferenceId === "incomplete:anomalous" &&
        result.auditEvent.auditTrailReferenceIds.includes("build:incomplete_anomalous") &&
        result.auditEvent.auditTrailReferenceIds.includes("anomaly:never_silently_drop");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: result.buildTrace,
        details: {
          buildCompleteness: result.buildCompleteness,
          eventOutcome: result.auditEvent.eventOutcome,
          actorReferenceId: result.auditEvent.actorReferenceId,
        },
      };
    }

    case "SC-RETENTION-MAX-MERGE": {
      const overlayContributionDays = 2190;
      const mergeResult = mergeRetentionWithOverlayContributions({
        baselineConfiguration: baseline,
        overlayContributionDurationDays: [overlayContributionDays],
        logCategoryReferenceId: "log-category:application",
      });

      const denyAudit = buildAuditEvent({
        eventCategory: "access",
        actorReferenceId: "actor:retention-merge-test",
        actionReferenceId: "action:access",
        targetResourceReferenceId: "resource:opaque-ref:audit-retention-1",
        eventOutcome: "denied",
        ...isolation,
        eventTimestampIso: "2026-06-18T12:02:00.000Z",
        retentionConfigurationReferenceId: mergeResult.retentionConfiguration.resolvedRetentionPolicyReferenceId,
        evaluationTrace: mergeResult.mergeTrace,
      });

      const passed =
        mergeResult.mergedRetentionDurationDays === overlayContributionDays &&
        mergeResult.mergedRetentionDurationDays > SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS &&
        mergeResult.retentionConfiguration.policySource === "max_of_overlays" &&
        mergeResult.retentionConfiguration.overlayRetentionContributionReferenceIds.length === 1 &&
        denyAudit.auditEvent.retentionConfigurationReferenceId.startsWith("retention-policy:resolved:") &&
        mergeResult.containsVerticalComplianceLogic === false;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: [...mergeResult.mergeTrace, ...denyAudit.buildTrace],
        details: {
          baselineDays: SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS,
          overlayContributionDays,
          mergedRetentionDurationDays: mergeResult.mergedRetentionDurationDays,
          retentionConfigurationReferenceId: denyAudit.auditEvent.retentionConfigurationReferenceId,
        },
      };
    }

    case "SC-NO-PHI-EMBED": {
      const sensitiveLikePayload = "patient-name-ssn-diagnosis-12345";
      const opaqueResourceRef = "resource:opaque-ref:panel-render-target-9";

      const result = buildAuditEvent({
        eventCategory: "access",
        actorReferenceId: "actor:panel-consumer",
        actionReferenceId: "action:render-panel",
        targetResourceReferenceId: opaqueResourceRef,
        eventOutcome: "success",
        ...isolation,
        eventTimestampIso: "2026-06-18T12:03:00.000Z",
        retentionConfigurationReferenceId: baseline.resolvedRetentionPolicyReferenceId,
        evaluationTrace: [`probe:opaque-ref-only:${opaqueResourceRef}`],
      });

      const serialized = JSON.stringify(result.auditEvent);
      const passed =
        result.auditEvent.targetResourceReferenceId === opaqueResourceRef &&
        !serialized.includes(sensitiveLikePayload) &&
        !serialized.toLowerCase().includes("phi") &&
        !serialized.toLowerCase().includes("hipaa") &&
        !serialized.toLowerCase().includes("healthcare");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: result.buildTrace,
        details: {
          targetResourceReferenceId: result.auditEvent.targetResourceReferenceId,
          sensitivePayloadEmbedded: serialized.includes(sensitiveLikePayload),
        },
      };
    }

    default:
      throw new Error(`Unknown audit static construction case: ${caseDefinition.caseId}`);
  }
}

export function executeAuditStaticConstructionTests(): {
  pass: boolean;
  results: AuditStaticConstructionCaseResult[];
} {
  const results = AUDIT_STATIC_CONSTRUCTION_CASES.map(runCase);

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

/** Validates deny/success parity — both paths always produce audit records. */
export function executeAuditOutcomeParitySmokeTest(): boolean {
  const isolation = buildIsolationFields("parity-scope");
  const retentionRef = createSpineRetentionBaselineConfiguration({ ...isolation })
    .resolvedRetentionPolicyReferenceId;

  const deny = buildAuditEvent({
    eventCategory: "access",
    actorReferenceId: "actor:parity-deny",
    actionReferenceId: "action:read",
    targetResourceReferenceId: "resource:opaque-ref:parity-deny",
    eventOutcome: "denied",
    ...isolation,
    eventTimestampIso: "2026-06-18T12:04:00.000Z",
    retentionConfigurationReferenceId: retentionRef,
  });

  const success = buildAuditEvent({
    eventCategory: "access",
    actorReferenceId: "actor:parity-success",
    actionReferenceId: "action:read",
    targetResourceReferenceId: "resource:opaque-ref:parity-success",
    eventOutcome: "success",
    ...isolation,
    eventTimestampIso: "2026-06-18T12:05:00.000Z",
    retentionConfigurationReferenceId: retentionRef,
  });

  return (
    deny.auditEvent !== undefined &&
    success.auditEvent !== undefined &&
    deny.auditEvent.eventOutcome === "denied" &&
    success.auditEvent.eventOutcome === "success" &&
    deny.auditEvent.retentionConfigurationReferenceId.length > 0 &&
    success.auditEvent.retentionConfigurationReferenceId.length > 0
  );
}
