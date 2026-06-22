import type { ControlSpineIsolationScope } from "../../control-spine/isolation";
import {
  buildOverlayAttachmentContract,
  classifyOverlayAttachment,
  detectOverlayDisciplineViolation,
  detectOverlayIsolationBypassAttempt,
  evaluateOverlayDiscipline,
  SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS,
  type OverlayAttachmentAttemptDescriptor,
  type OverlaySpineGuaranteeLooseningFlags,
} from "./evaluateOverlayDiscipline";

export interface OverlayDisciplineStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  expectedOutcome: "disciplined" | "violation";
  expectedViolationReason?: string;
}

export interface OverlayDisciplineStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  disciplineOutcome: string;
  violationReason: string | null;
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

function buildAttachmentContract(overlayRegistryKey: string) {
  return buildOverlayAttachmentContract({
    overlayRegistryKey,
    overlayAttachmentReferenceId: `attachment:${overlayRegistryKey}`,
    activationScopeReferenceId: "scope:activation:tenant-a",
    regulatoryScopeStatementReferenceId: "scope:regulatory-statement:opaque",
    precedenceConfigurationReferenceId: "scope:precedence:default-most-restrictive",
    overlayInterfaceSlotReferenceIds: [
      "slot:audit_logging_event_interface",
      "slot:regulated_compliant_audit_store_interface",
    ],
    customerTenantId: "tenant-a",
    firmTenantId: "firm-a",
    clientTenantId: "client-a1",
  });
}

function buildBaseAttempt(
  overlayRegistryKey: string,
  overrides: Partial<OverlayAttachmentAttemptDescriptor> = {},
): OverlayAttachmentAttemptDescriptor {
  const contract = buildAttachmentContract(overlayRegistryKey);

  return {
    overlayAttachmentAttemptReferenceId: "overlay-attempt:base",
    attachmentContract: contract,
    attemptedActionKind: "configure_opaque_through_slot",
    targetSlotReferenceId: "slot:audit_logging_event_interface",
    actionScopeBoundaryReferenceId: contract.activationScopeReferenceId,
    actionDescriptorParseable: true,
    ...overrides,
  };
}

export const OVERLAY_DISCIPLINE_STATIC_CONSTRUCTION_CASES: OverlayDisciplineStaticConstructionCase[] = [
  {
    caseId: "SC-DISCIPLINED-FM1-RETENTION-FLOOR",
    poisonCaseIds: [],
    description: "Disciplined attachment: overlay contributes retention floor via slot (FM-1 MAX-merge)",
    expectedOutcome: "disciplined",
  },
  {
    caseId: "SC-VIOLATION-FM1-LOOSEN-BASELINE",
    poisonCaseIds: [],
    description: "FM-1 violation: overlay tries to LOOSEN a spine baseline",
    expectedOutcome: "violation",
    expectedViolationReason: "fm1_replace_or_loosen_baseline",
  },
  {
    caseId: "SC-VIOLATION-FM2-OFF-SLOT",
    poisonCaseIds: [],
    description: "FM-2 violation: overlay attaches off declared slot",
    expectedOutcome: "violation",
    expectedViolationReason: "fm2_off_slot_attachment",
  },
  {
    caseId: "SC-VIOLATION-FM2-SPINE-INTERNAL",
    poisonCaseIds: [],
    description: "FM-2 violation: overlay references spine internals directly",
    expectedOutcome: "violation",
    expectedViolationReason: "fm2_spine_internal_reference",
  },
  {
    caseId: "SC-VIOLATION-FM3-SCOPE-EXCEEDANCE",
    poisonCaseIds: [],
    description: "FM-3 violation: overlay reaches beyond declared scope",
    expectedOutcome: "violation",
    expectedViolationReason: "fm3_scope_exceedance",
  },
  {
    caseId: "SC-VIOLATION-PC-08-ISOLATION-BYPASS",
    poisonCaseIds: ["PC-08"],
    description: "PC-08: overlay configures a path that would bypass isolation",
    expectedOutcome: "violation",
    expectedViolationReason: "pc08_overlay_isolation_bypass_attempt",
  },
  {
    caseId: "SC-VIOLATION-SPINE-LOOSEN-DISABLE-AUDIT",
    poisonCaseIds: [],
    description: "Spine guarantee loosening: overlay attachment with disablesAudit:true => violation",
    expectedOutcome: "violation",
    expectedViolationReason: "spine_guarantee_loosening",
  },
  {
    caseId: "SC-VIOLATION-SPINE-LOOSEN-WIDEN-ISOLATION",
    poisonCaseIds: [],
    description: "Spine guarantee loosening: overlay attachment with widensIsolation:true => violation",
    expectedOutcome: "violation",
    expectedViolationReason: "spine_guarantee_loosening",
  },
  {
    caseId: "SC-VIOLATION-SPINE-LOOSEN-GRANT-RBAC",
    poisonCaseIds: [],
    description: "Spine guarantee loosening: overlay attachment with grantsRbacSpineDenies:true => violation",
    expectedOutcome: "violation",
    expectedViolationReason: "spine_guarantee_loosening",
  },
  {
    caseId: "SC-VIOLATION-SPINE-LOOSEN-BROADEN-KEY-SCOPE",
    poisonCaseIds: [],
    description: "Spine guarantee loosening: overlay attachment with broadensKeyScope:true => violation",
    expectedOutcome: "violation",
    expectedViolationReason: "spine_guarantee_loosening",
  },
  {
    caseId: "SC-FAIL-CLOSED-UNRECOGNIZED",
    poisonCaseIds: [],
    description: "Fail-closed: unrecognized/ambiguous overlay action => VIOLATION",
    expectedOutcome: "violation",
    expectedViolationReason: "unrecognized_ambiguous_action",
  },
  {
    caseId: "SC-OVERLAY-BLIND-IDENTICAL-CLASSIFICATION",
    poisonCaseIds: [],
    description: "Overlay-blind: identical classification regardless of overlay registry key",
    expectedOutcome: "disciplined",
  },
];

function runSpineGuaranteeLooseningCase(
  caseDefinition: OverlayDisciplineStaticConstructionCase,
  spineGuaranteeLoosening: OverlaySpineGuaranteeLooseningFlags,
  overlayAttachmentAttemptReferenceId: string,
  overlayRegistryKey: string,
): OverlayDisciplineStaticConstructionCaseResult {
  const attempt = buildBaseAttempt(overlayRegistryKey, {
    overlayAttachmentAttemptReferenceId,
    spineGuaranteeLoosening,
  });

  const result = evaluateOverlayDiscipline({
    actorReferenceId: `actor:${overlayAttachmentAttemptReferenceId}`,
    attachmentAttempt: attempt,
    evaluationTimestampIso: "2026-06-18T15:02:00.000Z",
    retentionConfigurationReferenceId: "retention:spine-default",
  });

  const passed =
    result.disciplineOutcome === "violation" &&
    result.violationReason === "spine_guarantee_loosening" &&
    result.containsVerticalComplianceLogic === false &&
    result.executable === false &&
    result.auditEvent.containsVerticalComplianceLogic === false &&
    result.auditEvent.executable === false &&
    result.evaluationTrace.includes("check:spine_guarantee_loosening");

  return {
    caseId: caseDefinition.caseId,
    poisonCaseIds: caseDefinition.poisonCaseIds,
    description: caseDefinition.description,
    passed,
    disciplineOutcome: result.disciplineOutcome,
    violationReason: result.violationReason,
    evaluationTrace: result.evaluationTrace,
    details: {
      spineGuaranteeLoosening,
      resultContainsVerticalComplianceLogic: result.containsVerticalComplianceLogic,
      resultExecutable: result.executable,
      auditContainsVerticalComplianceLogic: result.auditEvent.containsVerticalComplianceLogic,
      auditExecutable: result.auditEvent.executable,
    },
  };
}

function runCase(
  caseDefinition: OverlayDisciplineStaticConstructionCase,
): OverlayDisciplineStaticConstructionCaseResult {
  const scopeTenantA = buildScope({
    customerTenantId: "tenant-a",
    firmTenantId: "firm-a",
    clientTenantId: "client-a1",
    isolationScopeReferenceId: "scope-overlay-a",
  });

  const scopeTenantB = buildScope({
    customerTenantId: "tenant-b",
    firmTenantId: "firm-b",
    clientTenantId: "client-b1",
    isolationScopeReferenceId: "scope-overlay-b",
  });

  switch (caseDefinition.caseId) {
    case "SC-DISCIPLINED-FM1-RETENTION-FLOOR": {
      const contract = buildAttachmentContract("overlay:generic-regime-a");
      const attempt = buildBaseAttempt("overlay:generic-regime-a", {
        overlayAttachmentAttemptReferenceId: "overlay-attempt:fm1-floor",
        attachmentContract: contract,
        attemptedActionKind: "contribute_retention_floor_via_slot",
        targetSlotReferenceId: "slot:regulated_compliant_audit_store_interface",
        actionScopeBoundaryReferenceId: contract.regulatoryScopeStatementReferenceId,
        retentionContribution: {
          contributedRetentionDurationDays: SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS + 1795,
          contributionMode: "max_merge_contribution",
          spineBaselineRetentionDurationDays: SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS,
        },
      });

      const result = evaluateOverlayDiscipline({
        actorReferenceId: "actor:overlay-fm1-floor",
        attachmentAttempt: attempt,
        evaluationTimestampIso: "2026-06-18T15:00:00.000Z",
        retentionConfigurationReferenceId: "retention:max-of-overlays",
      });

      const passed =
        result.disciplineOutcome === "disciplined" &&
        result.auditEvent.eventOutcome === "success" &&
        result.evaluationTrace.includes("fm1:max_merge_contribution_allowed");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        disciplineOutcome: result.disciplineOutcome,
        violationReason: result.violationReason,
        evaluationTrace: result.evaluationTrace,
        details: {
          auditEventKey: result.auditEvent.auditEventKey,
        },
      };
    }

    case "SC-VIOLATION-FM1-LOOSEN-BASELINE": {
      const contract = buildAttachmentContract("overlay:generic-regime-b");
      const attempt = buildBaseAttempt("overlay:generic-regime-b", {
        overlayAttachmentAttemptReferenceId: "overlay-attempt:fm1-loosen",
        attachmentContract: contract,
        attemptedActionKind: "contribute_retention_floor_via_slot",
        targetSlotReferenceId: "slot:audit_logging_event_interface",
        actionScopeBoundaryReferenceId: contract.activationScopeReferenceId,
        retentionContribution: {
          contributedRetentionDurationDays: SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS - 30,
          contributionMode: "loosen_baseline",
          spineBaselineRetentionDurationDays: SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS,
        },
      });

      const classification = classifyOverlayAttachment(attempt);

      const passed =
        classification.disciplineOutcome === "violation" &&
        classification.violationReason === "fm1_replace_or_loosen_baseline";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        disciplineOutcome: classification.disciplineOutcome,
        violationReason: classification.violationReason,
        evaluationTrace: classification.evaluationTrace,
        details: {
          violatedFmDisciplineIds: classification.violatedFmDisciplineIds,
        },
      };
    }

    case "SC-VIOLATION-FM2-OFF-SLOT": {
      const attempt = buildBaseAttempt("overlay:generic-regime-c", {
        overlayAttachmentAttemptReferenceId: "overlay-attempt:fm2-off-slot",
        attemptedActionKind: "attach_off_slot",
        targetSlotReferenceId: "slot:undeclared:spine-internal-hook",
        actionScopeBoundaryReferenceId: "scope:activation:tenant-a",
      });

      const classification = classifyOverlayAttachment(attempt);

      const passed =
        classification.disciplineOutcome === "violation" &&
        classification.violationReason === "fm2_off_slot_attachment";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        disciplineOutcome: classification.disciplineOutcome,
        violationReason: classification.violationReason,
        evaluationTrace: classification.evaluationTrace,
        details: {},
      };
    }

    case "SC-VIOLATION-FM2-SPINE-INTERNAL": {
      const attempt = buildBaseAttempt("overlay:generic-regime-d", {
        overlayAttachmentAttemptReferenceId: "overlay-attempt:fm2-internal",
        attemptedActionKind: "reference_spine_internals",
        referencesSpineInternalDirectly: true,
      });

      const classification = classifyOverlayAttachment(attempt);

      const passed =
        classification.disciplineOutcome === "violation" &&
        classification.violationReason === "fm2_spine_internal_reference";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        disciplineOutcome: classification.disciplineOutcome,
        violationReason: classification.violationReason,
        evaluationTrace: classification.evaluationTrace,
        details: {},
      };
    }

    case "SC-VIOLATION-FM3-SCOPE-EXCEEDANCE": {
      const attempt = buildBaseAttempt("overlay:generic-regime-e", {
        overlayAttachmentAttemptReferenceId: "overlay-attempt:fm3-scope",
        attemptedActionKind: "exceed_declared_scope",
        actionScopeBoundaryReferenceId: "scope:outside-declared-boundary",
      });

      const classification = classifyOverlayAttachment(attempt);

      const passed =
        classification.disciplineOutcome === "violation" &&
        classification.violationReason === "fm3_scope_exceedance";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        disciplineOutcome: classification.disciplineOutcome,
        violationReason: classification.violationReason,
        evaluationTrace: classification.evaluationTrace,
        details: {},
      };
    }

    case "SC-VIOLATION-PC-08-ISOLATION-BYPASS": {
      const contract = buildAttachmentContract("overlay:generic-regime-f");
      const attempt = buildBaseAttempt("overlay:generic-regime-f", {
        overlayAttachmentAttemptReferenceId: "overlay-attempt:pc08-bypass",
        attachmentContract: contract,
        attemptedActionKind: "configure_isolation_bypass_path",
        targetSlotReferenceId: "slot:audit_logging_event_interface",
        actionScopeBoundaryReferenceId: contract.activationScopeReferenceId,
        isolationBypassProbe: {
          requesterPersonaKey: "client_controller",
          requesterPersonaReferenceId: "persona:client-controller-a",
          requesterScope: scopeTenantA,
          targetResourceReferenceId: "panel-path:cross-tenant-leak",
          targetResourceVisibilityScope: "client_scoped",
          targetScope: scopeTenantB,
          claimsBypassWhenIsolationDenied: true,
        },
      });

      const classification = classifyOverlayAttachment(attempt);
      const detector = detectOverlayIsolationBypassAttempt(attempt);
      const violationDetector = detectOverlayDisciplineViolation(attempt);

      const passed =
        classification.disciplineOutcome === "violation" &&
        classification.violationReason === "pc08_overlay_isolation_bypass_attempt" &&
        classification.poisonCaseIds.includes("PC-08") &&
        detector &&
        violationDetector &&
        classification.evaluationTrace.some((line) => line.startsWith("pc08:"));

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        disciplineOutcome: classification.disciplineOutcome,
        violationReason: classification.violationReason,
        evaluationTrace: classification.evaluationTrace,
        details: {
          detector,
          violationDetector,
        },
      };
    }

    case "SC-VIOLATION-SPINE-LOOSEN-DISABLE-AUDIT":
      return runSpineGuaranteeLooseningCase(
        caseDefinition,
        {
          widensIsolation: false,
          grantsRbacSpineDenies: false,
          disablesAudit: true,
          broadensKeyScope: false,
        },
        "overlay-attempt:spine-loosen-disable-audit",
        "overlay:spine-loosen-disable-audit",
      );

    case "SC-VIOLATION-SPINE-LOOSEN-WIDEN-ISOLATION":
      return runSpineGuaranteeLooseningCase(
        caseDefinition,
        {
          widensIsolation: true,
          grantsRbacSpineDenies: false,
          disablesAudit: false,
          broadensKeyScope: false,
        },
        "overlay-attempt:spine-loosen-widen-isolation",
        "overlay:spine-loosen-widen-isolation",
      );

    case "SC-VIOLATION-SPINE-LOOSEN-GRANT-RBAC":
      return runSpineGuaranteeLooseningCase(
        caseDefinition,
        {
          widensIsolation: false,
          grantsRbacSpineDenies: true,
          disablesAudit: false,
          broadensKeyScope: false,
        },
        "overlay-attempt:spine-loosen-grant-rbac",
        "overlay:spine-loosen-grant-rbac",
      );

    case "SC-VIOLATION-SPINE-LOOSEN-BROADEN-KEY-SCOPE":
      return runSpineGuaranteeLooseningCase(
        caseDefinition,
        {
          widensIsolation: false,
          grantsRbacSpineDenies: false,
          disablesAudit: false,
          broadensKeyScope: true,
        },
        "overlay-attempt:spine-loosen-broaden-key-scope",
        "overlay:spine-loosen-broaden-key-scope",
      );

    case "SC-FAIL-CLOSED-UNRECOGNIZED": {
      const attempt = buildBaseAttempt("overlay:generic-regime-g", {
        overlayAttachmentAttemptReferenceId: "overlay-attempt:unrecognized",
        attemptedActionKind: "unrecognized",
        actionDescriptorParseable: false,
      });

      const classification = classifyOverlayAttachment(attempt);

      const passed =
        classification.disciplineOutcome === "violation" &&
        classification.violationReason === "unrecognized_ambiguous_action";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        disciplineOutcome: classification.disciplineOutcome,
        violationReason: classification.violationReason,
        evaluationTrace: classification.evaluationTrace,
        details: {},
      };
    }

    case "SC-OVERLAY-BLIND-IDENTICAL-CLASSIFICATION": {
      const attemptRegimeA = buildBaseAttempt("overlay:regime-alpha", {
        overlayAttachmentAttemptReferenceId: "overlay-attempt:blind-a",
        attemptedActionKind: "configure_opaque_through_slot",
      });

      const attemptRegimeB = buildBaseAttempt("overlay:regime-beta", {
        overlayAttachmentAttemptReferenceId: "overlay-attempt:blind-b",
        attemptedActionKind: "configure_opaque_through_slot",
      });

      const classificationA = classifyOverlayAttachment(attemptRegimeA);
      const classificationB = classifyOverlayAttachment(attemptRegimeB);

      const passed =
        classificationA.disciplineOutcome === "disciplined" &&
        classificationB.disciplineOutcome === "disciplined" &&
        classificationA.violationReason === classificationB.violationReason &&
        classificationA.evaluationTrace.filter((line) => !line.includes("overlay:")).join("|") ===
          classificationB.evaluationTrace.filter((line) => !line.includes("overlay:")).join("|");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        disciplineOutcome: classificationA.disciplineOutcome,
        violationReason: classificationA.violationReason,
        evaluationTrace: classificationA.evaluationTrace,
        details: {
          regimeAlphaOutcome: classificationA.disciplineOutcome,
          regimeBetaOutcome: classificationB.disciplineOutcome,
        },
      };
    }

    default:
      throw new Error(`Unknown overlay-discipline static construction case: ${caseDefinition.caseId}`);
  }
}

export function executeOverlayDisciplineStaticConstructionTests(): {
  pass: boolean;
  results: OverlayDisciplineStaticConstructionCaseResult[];
} {
  const results = OVERLAY_DISCIPLINE_STATIC_CONSTRUCTION_CASES.map((caseDefinition) => {
    const result = runCase(caseDefinition);
    const violationReasonMatches =
      caseDefinition.expectedViolationReason === undefined ||
      result.violationReason === caseDefinition.expectedViolationReason;
    const outcomeMatches = result.disciplineOutcome === caseDefinition.expectedOutcome;

    return {
      ...result,
      passed: result.passed && violationReasonMatches && outcomeMatches,
    };
  });

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

/** Validates disciplined/violation audit artifact emission parity. */
export function executeOverlayDisciplineAuditArtifactSmokeTest(): boolean {
  const contract = buildAttachmentContract("overlay:smoke-regime");
  const disciplined = evaluateOverlayDiscipline({
    actorReferenceId: "actor:smoke-disciplined",
    attachmentAttempt: buildBaseAttempt("overlay:smoke-regime", {
      overlayAttachmentAttemptReferenceId: "overlay-attempt:smoke-disciplined",
      attachmentContract: contract,
      attemptedActionKind: "configure_opaque_through_slot",
      actionScopeBoundaryReferenceId: contract.activationScopeReferenceId,
    }),
    evaluationTimestampIso: "2026-06-18T15:01:00.000Z",
    retentionConfigurationReferenceId: "retention:spine-default",
  });

  const violation = evaluateOverlayDiscipline({
    actorReferenceId: "actor:smoke-violation",
    attachmentAttempt: buildBaseAttempt("overlay:smoke-regime", {
      overlayAttachmentAttemptReferenceId: "overlay-attempt:smoke-violation",
      attachmentContract: contract,
      attemptedActionKind: "replace_spine_baseline",
      actionScopeBoundaryReferenceId: contract.activationScopeReferenceId,
    }),
    evaluationTimestampIso: "2026-06-18T15:01:01.000Z",
    retentionConfigurationReferenceId: "retention:spine-default",
  });

  return (
    disciplined.disciplineOutcome === "disciplined" &&
    disciplined.auditEvent.eventOutcome === "success" &&
    disciplined.auditEvent.containsVerticalComplianceLogic === false &&
    violation.disciplineOutcome === "violation" &&
    violation.auditEvent.eventOutcome === "denied" &&
    violation.auditEvent.containsVerticalComplianceLogic === false
  );
}
