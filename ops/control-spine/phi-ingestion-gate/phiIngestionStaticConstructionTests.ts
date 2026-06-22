import type { OverlayAttachmentContract } from "../../control-spine/contracts";
import {
  buildOverlayAttachmentContract,
  type OverlayAttachmentAttemptDescriptor,
} from "../../compliance/overlay-discipline";
import {
  appendOverlayActivationRecord,
  buildOverlayActivationRecord,
  createOverlayActivationRegistry,
  tenantActivationScopeFromContract,
  type OverlayActivationRegistry,
  type OverlayTenantActivationScope,
} from "../../compliance/overlay-attachment";
import {
  classifyPhiIngestionAttempt,
  detectPc14PhiIngestionOverlayBypass,
  evaluatePhiIngestion,
  PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
  type ClassifyPhiIngestionAttemptCore,
  type PhiDataClassMarkerDescriptor,
  type PhiIngestionAttemptDescriptor,
} from "./evaluatePhiIngestion";

export interface PhiIngestionStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  expectedOutcome: "allowed" | "refused";
  expectedRefuseReason?: string;
}

export interface PhiIngestionStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  ingestionOutcome: string;
  refuseReason: string | null;
  evaluationTrace: string[];
  details: Record<string, unknown>;
}

const STATIC_EVALUATION_TIMESTAMP = "2026-06-18T17:00:00.000Z";
const STATIC_RETENTION_REFERENCE = "retention:spine-default";

function buildHipaaAttachmentContract(input: {
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  activationScopeReferenceId: string;
}): OverlayAttachmentContract {
  return buildOverlayAttachmentContract({
    overlayRegistryKey: PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
    overlayAttachmentReferenceId: `attachment:${PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY}`,
    activationScopeReferenceId: input.activationScopeReferenceId,
    regulatoryScopeStatementReferenceId: "scope:regulatory-statement:opaque",
    precedenceConfigurationReferenceId: "scope:precedence:default-most-restrictive",
    overlayInterfaceSlotReferenceIds: [
      "slot:audit_logging_event_interface",
      "slot:regulated_compliant_audit_store_interface",
    ],
    customerTenantId: input.customerTenantId,
    firmTenantId: input.firmTenantId,
    clientTenantId: input.clientTenantId,
  });
}

function buildDisciplinedAttempt(
  contract: OverlayAttachmentContract,
  attemptReferenceId: string,
): OverlayAttachmentAttemptDescriptor {
  return {
    overlayAttachmentAttemptReferenceId: attemptReferenceId,
    attachmentContract: contract,
    attemptedActionKind: "configure_opaque_through_slot",
    targetSlotReferenceId: "slot:audit_logging_event_interface",
    actionScopeBoundaryReferenceId: contract.activationScopeReferenceId,
    actionDescriptorParseable: true,
  };
}

function buildActiveHipaaRegistry(input: {
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  activationScopeReferenceId: string;
  actorReferenceId: string;
}): { registry: OverlayActivationRegistry; scope: OverlayTenantActivationScope } {
  const contract = buildHipaaAttachmentContract(input);
  const attempt = buildDisciplinedAttempt(contract, "overlay-attempt:hipaa-active");
  const scope = tenantActivationScopeFromContract(contract);
  const buildResult = buildOverlayActivationRecord({
    actorReferenceId: input.actorReferenceId,
    attachmentAttempt: attempt,
    tenantActivationScope: scope,
    evaluationTimestampIso: STATIC_EVALUATION_TIMESTAMP,
    retentionConfigurationReferenceId: STATIC_RETENTION_REFERENCE,
  });

  return {
    registry: appendOverlayActivationRecord(
      createOverlayActivationRegistry("registry:phi-ingestion-active"),
      buildResult.activationRecord,
    ),
    scope,
  };
}

function phiMarker(
  phiDataClassKey: PhiDataClassMarkerDescriptor["phiDataClassKey"],
  referenceSuffix: string,
): PhiDataClassMarkerDescriptor {
  return {
    phiDataClassReferenceId: `marker-ref:phi-class:${referenceSuffix}`,
    phiDataClassKey,
    markerParseable: true,
  };
}

function buildIngestionAttempt(input: {
  ingestionAttemptReferenceId: string;
  scope: OverlayTenantActivationScope | null | undefined;
  markers: PhiDataClassMarkerDescriptor[];
  claimsOverlayBypassPath?: boolean;
  ingestionDescriptorParseable?: boolean;
}): PhiIngestionAttemptDescriptor {
  return {
    ingestionAttemptReferenceId: input.ingestionAttemptReferenceId,
    targetTenantActivationScope: input.scope,
    phiDataClassMarkers: input.markers,
    claimsOverlayBypassPath: input.claimsOverlayBypassPath,
    ingestionDescriptorParseable: input.ingestionDescriptorParseable ?? true,
  };
}

export const PHI_INGESTION_STATIC_CONSTRUCTION_CASES: PhiIngestionStaticConstructionCase[] = [
  {
    caseId: "SC-01-PHI-ACTIVE-OVERLAY",
    poisonCaseIds: [],
    description: "PHI ingestion + tenant has active HIPAA overlay (42.5I active) => allowed",
    expectedOutcome: "allowed",
  },
  {
    caseId: "SC-02-PHI-NOT-ACTIVE",
    poisonCaseIds: ["PC-14"],
    description: "PHI ingestion + tenant NOT overlay-active (42.5I not_active) => REFUSE",
    expectedOutcome: "refused",
    expectedRefuseReason: "phi_to_non_overlay_tenant",
  },
  {
    caseId: "SC-03-FAIL-CLOSED",
    poisonCaseIds: [],
    description: "Fail-closed: ambiguous PHI classification OR ambiguous activation => REFUSE",
    expectedOutcome: "refused",
  },
  {
    caseId: "SC-04-PC-14-BYPASS",
    poisonCaseIds: ["PC-14"],
    description: "PC-14: PHI via overlay-bypass path => REFUSE; detector exported",
    expectedOutcome: "refused",
    expectedRefuseReason: "pc14_overlay_bypass_path",
  },
  {
    caseId: "SC-05-NON-PHI",
    poisonCaseIds: [],
    description: "Non-PHI ingestion => not refused by this gate (allow)",
    expectedOutcome: "allowed",
  },
  {
    caseId: "SC-06-MARKERS-ONLY",
    poisonCaseIds: [],
    description: "No actual PHI in artifacts (markers/refs only)",
    expectedOutcome: "allowed",
  },
  {
    caseId: "SC-AMBIGUOUS-TENANT-SCOPE",
    poisonCaseIds: [],
    description: "PHI ingestion with missing/invalid tenant scope => REFUSE (ambiguous_tenant_scope)",
    expectedOutcome: "refused",
    expectedRefuseReason: "ambiguous_tenant_scope",
  },
  {
    caseId: "SC-PC14-FULL-EVALUATE-TAG",
    poisonCaseIds: ["PC-14"],
    description:
      "PHI to non-overlay tenant via full evaluatePhiIngestion() => REFUSE + PC-14 poison tag",
    expectedOutcome: "refused",
    expectedRefuseReason: "phi_to_non_overlay_tenant",
  },
];

function runCase(caseDefinition: PhiIngestionStaticConstructionCase): {
  classification: ClassifyPhiIngestionAttemptCore;
  caseDefinition: PhiIngestionStaticConstructionCase;
  details: Record<string, unknown>;
} {
  switch (caseDefinition.caseId) {
    case "SC-01-PHI-ACTIVE-OVERLAY": {
      const { registry, scope } = buildActiveHipaaRegistry({
        customerTenantId: "tenant-phi-active",
        firmTenantId: "firm-phi-active",
        clientTenantId: "client-phi-active",
        activationScopeReferenceId: "scope:activation:phi-active",
        actorReferenceId: "actor:hipaa-active",
      });

      return {
        caseDefinition,
        classification: classifyPhiIngestionAttempt({
          ingestionAttempt: buildIngestionAttempt({
            ingestionAttemptReferenceId: "ingestion:phi-active-overlay",
            scope,
            markers: [phiMarker("electronic_phi", "e-phi-001")],
          }),
          overlayActivationRegistry: registry,
        }),
        details: { overlayActivationExpected: "active" },
      };
    }

    case "SC-02-PHI-NOT-ACTIVE": {
      const { scope } = buildActiveHipaaRegistry({
        customerTenantId: "tenant-phi-refuse",
        firmTenantId: "firm-phi-refuse",
        clientTenantId: "client-phi-refuse",
        activationScopeReferenceId: "scope:activation:phi-refuse",
        actorReferenceId: "actor:hipaa-unused",
      });
      const emptyRegistry = createOverlayActivationRegistry("registry:phi-ingestion-empty");

      return {
        caseDefinition,
        classification: classifyPhiIngestionAttempt({
          ingestionAttempt: buildIngestionAttempt({
            ingestionAttemptReferenceId: "ingestion:phi-non-overlay-tenant",
            scope,
            markers: [phiMarker("phi", "phi-001")],
          }),
          overlayActivationRegistry: emptyRegistry,
        }),
        details: { overlayActivationExpected: "not_active" },
      };
    }

    case "SC-03-FAIL-CLOSED": {
      const { registry, scope } = buildActiveHipaaRegistry({
        customerTenantId: "tenant-fail-closed",
        firmTenantId: "firm-fail-closed",
        clientTenantId: "client-fail-closed",
        activationScopeReferenceId: "scope:activation:fail-closed",
        actorReferenceId: "actor:fail-closed",
      });

      const ambiguousPhi = classifyPhiIngestionAttempt({
        ingestionAttempt: buildIngestionAttempt({
          ingestionAttemptReferenceId: "ingestion:ambiguous-phi-marker",
          scope,
          markers: [
            {
              phiDataClassReferenceId: "marker-ref:unparseable",
              phiDataClassKey: "phi",
              markerParseable: false,
            },
          ],
        }),
        overlayActivationRegistry: registry,
      });

      const ambiguousActivation = classifyPhiIngestionAttempt({
        ingestionAttempt: buildIngestionAttempt({
          ingestionAttemptReferenceId: "ingestion:ambiguous-activation",
          scope,
          markers: [phiMarker("phi", "phi-ambiguous-activation")],
        }),
        overlayActivationRegistry: registry,
        hipaaOverlayRegistryKey: "",
      });

      return {
        caseDefinition,
        classification: ambiguousPhi,
        details: {
          ambiguousPhiOutcome: ambiguousPhi.ingestionOutcome,
          ambiguousPhiRefuseReason: ambiguousPhi.refuseReason,
          ambiguousActivationOutcome: ambiguousActivation.ingestionOutcome,
          ambiguousActivationRefuseReason: ambiguousActivation.refuseReason,
        },
      };
    }

    case "SC-04-PC-14-BYPASS": {
      const { scope } = buildActiveHipaaRegistry({
        customerTenantId: "tenant-pc14",
        firmTenantId: "firm-pc14",
        clientTenantId: "client-pc14",
        activationScopeReferenceId: "scope:activation:pc14",
        actorReferenceId: "actor:pc14-unused",
      });
      const emptyRegistry = createOverlayActivationRegistry("registry:pc14-empty");

      const evaluationInput = {
        actorReferenceId: "actor:pc14-probe",
        retentionConfigurationReferenceId: STATIC_RETENTION_REFERENCE,
        evaluationTimestampIso: STATIC_EVALUATION_TIMESTAMP,
        ingestionAttempt: buildIngestionAttempt({
          ingestionAttemptReferenceId: "ingestion:pc14-bypass-path",
          scope,
          markers: [phiMarker("phi_derived_learning_boundary", "pdlb-001")],
          claimsOverlayBypassPath: true,
        }),
        overlayActivationRegistry: emptyRegistry,
      };

      const evaluation = evaluatePhiIngestion(evaluationInput);
      const detector = detectPc14PhiIngestionOverlayBypass(evaluationInput);

      return {
        caseDefinition,
        classification: {
          ingestionOutcome: evaluation.ingestionOutcome,
          refuseReason: evaluation.refuseReason,
          carriesPhiMarkers: evaluation.carriesPhiMarkers,
          overlayActivationOutcome: evaluation.overlayActivationOutcome,
          evaluationTrace: evaluation.evaluationTrace,
        },
        details: {
          poisonCaseIds: evaluation.poisonCaseIds,
          pc14Detector: detector,
        },
      };
    }

    case "SC-05-NON-PHI": {
      const { registry, scope } = buildActiveHipaaRegistry({
        customerTenantId: "tenant-non-phi",
        firmTenantId: "firm-non-phi",
        clientTenantId: "client-non-phi",
        activationScopeReferenceId: "scope:activation:non-phi",
        actorReferenceId: "actor:non-phi-unused",
      });

      return {
        caseDefinition,
        classification: classifyPhiIngestionAttempt({
          ingestionAttempt: buildIngestionAttempt({
            ingestionAttemptReferenceId: "ingestion:non-phi-payload",
            scope,
            markers: [
              {
                phiDataClassReferenceId: "marker-ref:operational-metric:001",
                phiDataClassKey: null,
                markerParseable: true,
              },
            ],
          }),
          overlayActivationRegistry: registry,
        }),
        details: { gateApplied: false },
      };
    }

    case "SC-06-MARKERS-ONLY": {
      const { registry, scope } = buildActiveHipaaRegistry({
        customerTenantId: "tenant-markers-only",
        firmTenantId: "firm-markers-only",
        clientTenantId: "client-markers-only",
        activationScopeReferenceId: "scope:activation:markers-only",
        actorReferenceId: "actor:markers-only",
      });

      const evaluation = evaluatePhiIngestion({
        actorReferenceId: "actor:markers-only-audit",
        retentionConfigurationReferenceId: STATIC_RETENTION_REFERENCE,
        evaluationTimestampIso: STATIC_EVALUATION_TIMESTAMP,
        ingestionAttempt: buildIngestionAttempt({
          ingestionAttemptReferenceId: "ingestion:markers-only",
          scope,
          markers: [phiMarker("electronic_phi", "opaque-marker-only")],
        }),
        overlayActivationRegistry: registry,
      });

      const serialized = JSON.stringify(evaluation);
      const forbiddenPhiValuePatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/,
        /\bpatient@/i,
        /\bJohn\s+Doe\b/i,
        /\bSSN\b/i,
        /\bMRN\b/i,
      ];
      const containsForbiddenPhiValues = forbiddenPhiValuePatterns.some((pattern) => pattern.test(serialized));

      return {
        caseDefinition,
        classification: {
          ingestionOutcome: evaluation.ingestionOutcome,
          refuseReason: evaluation.refuseReason,
          carriesPhiMarkers: evaluation.carriesPhiMarkers,
          overlayActivationOutcome: evaluation.overlayActivationOutcome,
          evaluationTrace: evaluation.evaluationTrace,
        },
        details: {
          containsVerticalComplianceLogic: evaluation.containsVerticalComplianceLogic,
          executable: evaluation.executable,
          auditEventExecutable: evaluation.auditEvent.executable,
          containsForbiddenPhiValues,
          markerReferenceOnly: evaluation.evaluationTrace.some((line) => line.includes("marker-ref:")),
        },
      };
    }

    case "SC-AMBIGUOUS-TENANT-SCOPE": {
      const emptyRegistry = createOverlayActivationRegistry("registry:ambiguous-tenant-scope");

      const evaluation = evaluatePhiIngestion({
        actorReferenceId: "actor:ambiguous-tenant-scope",
        retentionConfigurationReferenceId: STATIC_RETENTION_REFERENCE,
        evaluationTimestampIso: STATIC_EVALUATION_TIMESTAMP,
        ingestionAttempt: buildIngestionAttempt({
          ingestionAttemptReferenceId: "ingestion:ambiguous-tenant-scope",
          scope: null,
          markers: [phiMarker("phi", "ambiguous-scope-phi")],
        }),
        overlayActivationRegistry: emptyRegistry,
      });

      return {
        caseDefinition,
        classification: {
          ingestionOutcome: evaluation.ingestionOutcome,
          refuseReason: evaluation.refuseReason,
          carriesPhiMarkers: evaluation.carriesPhiMarkers,
          overlayActivationOutcome: evaluation.overlayActivationOutcome,
          evaluationTrace: evaluation.evaluationTrace,
        },
        details: {
          containsVerticalComplianceLogic: evaluation.containsVerticalComplianceLogic,
          executable: evaluation.executable,
          auditEventContainsVerticalComplianceLogic: evaluation.auditEvent.containsVerticalComplianceLogic,
          auditEventExecutable: evaluation.auditEvent.executable,
        },
      };
    }

    case "SC-PC14-FULL-EVALUATE-TAG": {
      const { scope } = buildActiveHipaaRegistry({
        customerTenantId: "tenant-pc14-full-eval",
        firmTenantId: "firm-pc14-full-eval",
        clientTenantId: "client-pc14-full-eval",
        activationScopeReferenceId: "scope:activation:pc14-full-eval",
        actorReferenceId: "actor:pc14-full-eval-unused",
      });
      const emptyRegistry = createOverlayActivationRegistry("registry:pc14-full-eval-empty");

      const evaluation = evaluatePhiIngestion({
        actorReferenceId: "actor:pc14-full-evaluate",
        retentionConfigurationReferenceId: STATIC_RETENTION_REFERENCE,
        evaluationTimestampIso: STATIC_EVALUATION_TIMESTAMP,
        ingestionAttempt: buildIngestionAttempt({
          ingestionAttemptReferenceId: "ingestion:pc14-full-evaluate-tag",
          scope,
          markers: [phiMarker("phi", "pc14-full-eval-marker")],
        }),
        overlayActivationRegistry: emptyRegistry,
      });

      return {
        caseDefinition,
        classification: {
          ingestionOutcome: evaluation.ingestionOutcome,
          refuseReason: evaluation.refuseReason,
          carriesPhiMarkers: evaluation.carriesPhiMarkers,
          overlayActivationOutcome: evaluation.overlayActivationOutcome,
          evaluationTrace: evaluation.evaluationTrace,
        },
        details: {
          poisonCaseIds: evaluation.poisonCaseIds,
          containsVerticalComplianceLogic: evaluation.containsVerticalComplianceLogic,
          executable: evaluation.executable,
          auditEventContainsVerticalComplianceLogic: evaluation.auditEvent.containsVerticalComplianceLogic,
          auditEventExecutable: evaluation.auditEvent.executable,
        },
      };
    }

    default:
      throw new Error(`Unknown static construction case: ${caseDefinition.caseId}`);
  }
}

function evaluateCasePass(
  caseDefinition: PhiIngestionStaticConstructionCase,
  classification: ClassifyPhiIngestionAttemptCore,
  details: Record<string, unknown>,
): boolean {
  const outcomeMatches = classification.ingestionOutcome === caseDefinition.expectedOutcome;
  const refuseReasonMatches =
    caseDefinition.expectedRefuseReason === undefined ||
    classification.refuseReason === caseDefinition.expectedRefuseReason;

  switch (caseDefinition.caseId) {
    case "SC-03-FAIL-CLOSED":
      return (
        classification.refuseReason === "ambiguous_phi_classification" &&
        details.ambiguousActivationOutcome === "refused" &&
        details.ambiguousActivationRefuseReason === "ambiguous_activation_state"
      );

    case "SC-04-PC-14-BYPASS":
      return (
        outcomeMatches &&
        refuseReasonMatches &&
        details.pc14Detector === true &&
        Array.isArray(details.poisonCaseIds) &&
        (details.poisonCaseIds as string[]).includes("PC-14")
      );

    case "SC-06-MARKERS-ONLY":
      return (
        outcomeMatches &&
        details.containsVerticalComplianceLogic === false &&
        details.executable === false &&
        details.auditEventExecutable === false &&
        details.containsForbiddenPhiValues === false &&
        details.markerReferenceOnly === true
      );

    case "SC-AMBIGUOUS-TENANT-SCOPE":
    case "SC-PC14-FULL-EVALUATE-TAG":
      return (
        outcomeMatches &&
        refuseReasonMatches &&
        details.containsVerticalComplianceLogic === false &&
        details.executable === false &&
        details.auditEventContainsVerticalComplianceLogic === false &&
        details.auditEventExecutable === false &&
        (caseDefinition.caseId !== "SC-PC14-FULL-EVALUATE-TAG" ||
          (Array.isArray(details.poisonCaseIds) && (details.poisonCaseIds as string[]).includes("PC-14")))
      );

    default:
      return outcomeMatches && refuseReasonMatches;
  }
}

export function executePhiIngestionStaticConstructionTests(): {
  pass: boolean;
  results: PhiIngestionStaticConstructionCaseResult[];
} {
  const results: PhiIngestionStaticConstructionCaseResult[] = PHI_INGESTION_STATIC_CONSTRUCTION_CASES.map(
    (caseDefinition) => {
      const { classification, details } = runCase(caseDefinition);
      const passed = evaluateCasePass(caseDefinition, classification, details);

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        ingestionOutcome: classification.ingestionOutcome,
        refuseReason: classification.refuseReason,
        evaluationTrace: classification.evaluationTrace,
        details,
      };
    },
  );

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

/** Validates audit-shaped artifact emission for ALLOW and REFUSE paths. */
export function executePhiIngestionAuditArtifactSmokeTest(): boolean {
  const { registry, scope } = buildActiveHipaaRegistry({
    customerTenantId: "tenant-audit-smoke",
    firmTenantId: "firm-audit-smoke",
    clientTenantId: "client-audit-smoke",
    activationScopeReferenceId: "scope:activation:audit-smoke",
    actorReferenceId: "actor:audit-smoke-active",
  });
  const emptyRegistry = createOverlayActivationRegistry("registry:audit-smoke-empty");

  const allowEvaluation = evaluatePhiIngestion({
    actorReferenceId: "actor:audit-allow",
    retentionConfigurationReferenceId: STATIC_RETENTION_REFERENCE,
    evaluationTimestampIso: STATIC_EVALUATION_TIMESTAMP,
    ingestionAttempt: buildIngestionAttempt({
      ingestionAttemptReferenceId: "ingestion:audit-allow",
      scope,
      markers: [phiMarker("phi", "audit-allow-marker")],
    }),
    overlayActivationRegistry: registry,
  });

  const refuseEvaluation = evaluatePhiIngestion({
    actorReferenceId: "actor:audit-refuse",
    retentionConfigurationReferenceId: STATIC_RETENTION_REFERENCE,
    evaluationTimestampIso: STATIC_EVALUATION_TIMESTAMP,
    ingestionAttempt: buildIngestionAttempt({
      ingestionAttemptReferenceId: "ingestion:audit-refuse",
      scope,
      markers: [phiMarker("phi", "audit-refuse-marker")],
    }),
    overlayActivationRegistry: emptyRegistry,
  });

  return (
    allowEvaluation.containsVerticalComplianceLogic === false &&
    allowEvaluation.executable === false &&
    allowEvaluation.auditEvent.eventOutcome === "success" &&
    allowEvaluation.auditEvent.containsVerticalComplianceLogic === false &&
    allowEvaluation.auditEvent.executable === false &&
    refuseEvaluation.ingestionOutcome === "refused" &&
    refuseEvaluation.auditEvent.eventOutcome === "denied" &&
    refuseEvaluation.auditEvent.containsVerticalComplianceLogic === false &&
    refuseEvaluation.auditEvent.executable === false
  );
}
