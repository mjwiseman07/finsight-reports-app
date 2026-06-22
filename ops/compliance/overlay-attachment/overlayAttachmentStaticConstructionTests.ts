import type { OverlayAttachmentContract } from "../../control-spine/contracts";
import {
  buildOverlayAttachmentContract,
  type OverlayAttachmentAttemptDescriptor,
} from "../overlay-discipline";
import {
  appendOverlayActivationRecord,
  buildOverlayActivationRecord,
  createOverlayActivationRegistry,
  detectNonOverlayAttachmentCoverage,
  resolveOverlayActivation,
  tenantActivationScopeFromContract,
  type OverlayActivationRegistry,
  type OverlayTenantActivationScope,
} from "./overlayActivationRegistry";

export interface OverlayAttachmentStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  expectedResolution: "active" | "not_active";
}

export interface OverlayAttachmentStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  resolutionOutcome: string;
  evaluationTrace: string[];
  details: Record<string, unknown>;
}

function buildAttachmentContract(input: {
  overlayRegistryKey: string;
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  activationScopeReferenceId: string;
}): OverlayAttachmentContract {
  return buildOverlayAttachmentContract({
    overlayRegistryKey: input.overlayRegistryKey,
    overlayAttachmentReferenceId: `attachment:${input.overlayRegistryKey}`,
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

function buildViolatingAttempt(
  contract: OverlayAttachmentContract,
  attemptReferenceId: string,
): OverlayAttachmentAttemptDescriptor {
  return {
    overlayAttachmentAttemptReferenceId: attemptReferenceId,
    attachmentContract: contract,
    attemptedActionKind: "attach_off_slot",
    targetSlotReferenceId: "slot:undeclared:spine-internal-hook",
    actionScopeBoundaryReferenceId: contract.activationScopeReferenceId,
    actionDescriptorParseable: true,
  };
}

function buildRegistryWithRecord(input: {
  contract: OverlayAttachmentContract;
  attempt: OverlayAttachmentAttemptDescriptor;
  actorReferenceId: string;
}): OverlayActivationRegistry {
  const scope = tenantActivationScopeFromContract(input.contract);
  const buildResult = buildOverlayActivationRecord({
    actorReferenceId: input.actorReferenceId,
    attachmentAttempt: input.attempt,
    tenantActivationScope: scope,
    evaluationTimestampIso: "2026-06-18T16:00:00.000Z",
    retentionConfigurationReferenceId: "retention:spine-default",
  });

  return appendOverlayActivationRecord(createOverlayActivationRegistry("registry:static"), buildResult.activationRecord);
}

export const OVERLAY_ATTACHMENT_STATIC_CONSTRUCTION_CASES: OverlayAttachmentStaticConstructionCase[] = [
  {
    caseId: "SC-ACTIVE-DISCIPLINED-ACTIVATION",
    poisonCaseIds: [],
    description: "Disciplined activation passes 42.5H => recorded active; resolver returns active",
    expectedResolution: "active",
  },
  {
    caseId: "SC-FAIL-CLOSED-NO-RECORD",
    poisonCaseIds: [],
    description: "No activation record for scope/overlay => resolver returns not_active",
    expectedResolution: "not_active",
  },
  {
    caseId: "SC-REJECTED-DISCIPLINE-FAILED",
    poisonCaseIds: [],
    description: "42.5H violation => rejected record; resolver returns not_active",
    expectedResolution: "not_active",
  },
  {
    caseId: "SC-PC-07-NO-DISCIPLINED-ACTIVATION",
    poisonCaseIds: ["PC-07"],
    description: "Tenant with no active disciplined activation => not_active (PC-07 vector)",
    expectedResolution: "not_active",
  },
  {
    caseId: "SC-CROSS-SCOPE-NOT-ACTIVE",
    poisonCaseIds: [],
    description: "Activation for Tenant A, resolve for Tenant B => not_active",
    expectedResolution: "not_active",
  },
  {
    caseId: "SC-REGIME-BLIND-IDENTICAL-MACHINERY",
    poisonCaseIds: [],
    description: "Two opaque overlay keys activate through identical registry machinery",
    expectedResolution: "active",
  },
];

function runCase(
  caseDefinition: OverlayAttachmentStaticConstructionCase,
): OverlayAttachmentStaticConstructionCaseResult {
  switch (caseDefinition.caseId) {
    case "SC-ACTIVE-DISCIPLINED-ACTIVATION": {
      const contract = buildAttachmentContract({
        overlayRegistryKey: "overlay:opaque-regime-one",
        customerTenantId: "tenant-a",
        firmTenantId: "firm-a",
        clientTenantId: "client-a1",
        activationScopeReferenceId: "scope:activation:tenant-a",
      });
      const attempt = buildDisciplinedAttempt(contract, "overlay-attempt:disciplined-active");
      const registry = buildRegistryWithRecord({
        contract,
        attempt,
        actorReferenceId: "actor:activation-disciplined",
      });
      const scope = tenantActivationScopeFromContract(contract);
      const resolution = resolveOverlayActivation({
        registry,
        tenantActivationScope: scope,
        overlayRegistryKey: contract.overlayRegistryKey,
      });
      const record = registry.activationRecords[0];

      const passed =
        record.activationRecordStatus === "active" &&
        record.disciplineOutcome === "disciplined" &&
        resolution.resolutionOutcome === "active" &&
        resolution.resolutionReason === "affirmative_disciplined_activation" &&
        record.containsVerticalComplianceLogic === false &&
        record.executable === false &&
        resolution.containsVerticalComplianceLogic === false &&
        resolution.executable === false;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        resolutionOutcome: resolution.resolutionOutcome,
        evaluationTrace: resolution.evaluationTrace,
        details: {
          activationRecordStatus: record.activationRecordStatus,
          disciplineResultReferenceId: record.disciplineResultReferenceId,
        },
      };
    }

    case "SC-FAIL-CLOSED-NO-RECORD": {
      const contract = buildAttachmentContract({
        overlayRegistryKey: "overlay:missing-record",
        customerTenantId: "tenant-missing",
        firmTenantId: "firm-missing",
        clientTenantId: "client-missing",
        activationScopeReferenceId: "scope:activation:tenant-missing",
      });
      const scope = tenantActivationScopeFromContract(contract);
      const registry = createOverlayActivationRegistry("registry:empty");
      const resolution = resolveOverlayActivation({
        registry,
        tenantActivationScope: scope,
        overlayRegistryKey: contract.overlayRegistryKey,
      });
      const detector = detectNonOverlayAttachmentCoverage({
        registry,
        tenantActivationScope: scope,
        overlayRegistryKey: contract.overlayRegistryKey,
      });

      const passed =
        resolution.resolutionOutcome === "not_active" &&
        resolution.resolutionReason === "no_matching_activation_record" &&
        detector &&
        resolution.evaluationTrace.includes("policy:fail_closed_not_active_by_default");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        resolutionOutcome: resolution.resolutionOutcome,
        evaluationTrace: resolution.evaluationTrace,
        details: {
          detector,
        },
      };
    }

    case "SC-REJECTED-DISCIPLINE-FAILED": {
      const contract = buildAttachmentContract({
        overlayRegistryKey: "overlay:discipline-failed",
        customerTenantId: "tenant-reject",
        firmTenantId: "firm-reject",
        clientTenantId: "client-reject",
        activationScopeReferenceId: "scope:activation:tenant-reject",
      });
      const attempt = buildViolatingAttempt(contract, "overlay-attempt:discipline-failed");
      const scope = tenantActivationScopeFromContract(contract);
      const buildResult = buildOverlayActivationRecord({
        actorReferenceId: "actor:activation-rejected",
        attachmentAttempt: attempt,
        tenantActivationScope: scope,
        evaluationTimestampIso: "2026-06-18T16:01:00.000Z",
        retentionConfigurationReferenceId: "retention:spine-default",
      });
      const registry = appendOverlayActivationRecord(
        createOverlayActivationRegistry("registry:rejected"),
        buildResult.activationRecord,
      );
      const resolution = resolveOverlayActivation({
        registry,
        tenantActivationScope: scope,
        overlayRegistryKey: contract.overlayRegistryKey,
      });

      const passed =
        buildResult.activationRecord.activationRecordStatus === "rejected" &&
        buildResult.activationRecord.disciplineOutcome === "violation" &&
        buildResult.activationRecord.activationResolution === "not_active" &&
        resolution.resolutionOutcome === "not_active" &&
        buildResult.buildTrace.includes("activation:rejected_discipline_violation");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        resolutionOutcome: resolution.resolutionOutcome,
        evaluationTrace: resolution.evaluationTrace,
        details: {
          activationRecordStatus: buildResult.activationRecord.activationRecordStatus,
          disciplineOutcome: buildResult.activationRecord.disciplineOutcome,
        },
      };
    }

    case "SC-PC-07-NO-DISCIPLINED-ACTIVATION": {
      const contract = buildAttachmentContract({
        overlayRegistryKey: "overlay:pc07-vector",
        customerTenantId: "tenant-pc07",
        firmTenantId: "firm-pc07",
        clientTenantId: "client-pc07",
        activationScopeReferenceId: "scope:activation:tenant-pc07",
      });
      const violatingAttempt = buildViolatingAttempt(contract, "overlay-attempt:pc07-rejected-only");
      const scope = tenantActivationScopeFromContract(contract);
      const rejectedBuild = buildOverlayActivationRecord({
        actorReferenceId: "actor:pc07-rejected",
        attachmentAttempt: violatingAttempt,
        tenantActivationScope: scope,
        evaluationTimestampIso: "2026-06-18T16:02:00.000Z",
        retentionConfigurationReferenceId: "retention:spine-default",
      });
      const registry = appendOverlayActivationRecord(
        createOverlayActivationRegistry("registry:pc07"),
        rejectedBuild.activationRecord,
      );
      const resolution = resolveOverlayActivation({
        registry,
        tenantActivationScope: scope,
        overlayRegistryKey: contract.overlayRegistryKey,
      });
      const pc07Detector = detectNonOverlayAttachmentCoverage({
        registry,
        tenantActivationScope: scope,
        overlayRegistryKey: contract.overlayRegistryKey,
      });

      const passed =
        resolution.resolutionOutcome === "not_active" &&
        pc07Detector &&
        rejectedBuild.activationRecord.activationRecordStatus === "rejected";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        resolutionOutcome: resolution.resolutionOutcome,
        evaluationTrace: resolution.evaluationTrace,
        details: {
          pc07Detector,
        },
      };
    }

    case "SC-CROSS-SCOPE-NOT-ACTIVE": {
      const contractTenantA = buildAttachmentContract({
        overlayRegistryKey: "overlay:cross-scope",
        customerTenantId: "tenant-a",
        firmTenantId: "firm-a",
        clientTenantId: "client-a1",
        activationScopeReferenceId: "scope:activation:tenant-a",
      });
      const contractTenantB = buildAttachmentContract({
        overlayRegistryKey: "overlay:cross-scope",
        customerTenantId: "tenant-b",
        firmTenantId: "firm-b",
        clientTenantId: "client-b1",
        activationScopeReferenceId: "scope:activation:tenant-b",
      });
      const attempt = buildDisciplinedAttempt(contractTenantA, "overlay-attempt:tenant-a-active");
      const registry = buildRegistryWithRecord({
        contract: contractTenantA,
        attempt,
        actorReferenceId: "actor:cross-scope-a",
      });
      const scopeTenantB = tenantActivationScopeFromContract(contractTenantB);
      const resolution = resolveOverlayActivation({
        registry,
        tenantActivationScope: scopeTenantB,
        overlayRegistryKey: contractTenantA.overlayRegistryKey,
      });

      const passed =
        resolution.resolutionOutcome === "not_active" &&
        resolution.resolutionReason === "no_matching_activation_record";

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        resolutionOutcome: resolution.resolutionOutcome,
        evaluationTrace: resolution.evaluationTrace,
        details: {},
      };
    }

    case "SC-REGIME-BLIND-IDENTICAL-MACHINERY": {
      const contractAlpha = buildAttachmentContract({
        overlayRegistryKey: "overlay:regime-alpha",
        customerTenantId: "tenant-alpha",
        firmTenantId: "firm-alpha",
        clientTenantId: "client-alpha",
        activationScopeReferenceId: "scope:activation:tenant-alpha",
      });
      const contractBeta = buildAttachmentContract({
        overlayRegistryKey: "overlay:regime-beta",
        customerTenantId: "tenant-beta",
        firmTenantId: "firm-beta",
        clientTenantId: "client-beta",
        activationScopeReferenceId: "scope:activation:tenant-beta",
      });

      const buildAlpha = buildOverlayActivationRecord({
        actorReferenceId: "actor:regime-alpha",
        attachmentAttempt: buildDisciplinedAttempt(contractAlpha, "overlay-attempt:regime-alpha"),
        tenantActivationScope: tenantActivationScopeFromContract(contractAlpha),
        evaluationTimestampIso: "2026-06-18T16:03:00.000Z",
        retentionConfigurationReferenceId: "retention:spine-default",
      });
      const buildBeta = buildOverlayActivationRecord({
        actorReferenceId: "actor:regime-beta",
        attachmentAttempt: buildDisciplinedAttempt(contractBeta, "overlay-attempt:regime-beta"),
        tenantActivationScope: tenantActivationScopeFromContract(contractBeta),
        evaluationTimestampIso: "2026-06-18T16:03:01.000Z",
        retentionConfigurationReferenceId: "retention:spine-default",
      });

      let registry = createOverlayActivationRegistry("registry:regime-blind");
      registry = appendOverlayActivationRecord(registry, buildAlpha.activationRecord);
      registry = appendOverlayActivationRecord(registry, buildBeta.activationRecord);

      const resolveAlpha = resolveOverlayActivation({
        registry,
        tenantActivationScope: tenantActivationScopeFromContract(contractAlpha),
        overlayRegistryKey: contractAlpha.overlayRegistryKey,
      });
      const resolveBeta = resolveOverlayActivation({
        registry,
        tenantActivationScope: tenantActivationScopeFromContract(contractBeta),
        overlayRegistryKey: contractBeta.overlayRegistryKey,
      });

      const sharedBuildPolicyLines = [
        "buildOverlayActivationRecord:start",
        "policy:discipline_gated_activation",
        "invariant:regime_blind_registry",
        "activation:recorded_active",
      ];
      const sharedResolvePolicyLines = [
        "resolveOverlayActivation:start",
        "policy:fail_closed_not_active_by_default",
        "invariant:regime_blind_registry",
        "resolution:active",
      ];

      const passed =
        buildAlpha.activationRecord.activationRecordStatus === "active" &&
        buildBeta.activationRecord.activationRecordStatus === "active" &&
        resolveAlpha.resolutionOutcome === "active" &&
        resolveBeta.resolutionOutcome === "active" &&
        resolveAlpha.resolutionReason === resolveBeta.resolutionReason &&
        sharedBuildPolicyLines.every(
          (line) => buildAlpha.buildTrace.includes(line) && buildBeta.buildTrace.includes(line),
        ) &&
        sharedResolvePolicyLines.every(
          (line) => resolveAlpha.evaluationTrace.includes(line) && resolveBeta.evaluationTrace.includes(line),
        );

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        resolutionOutcome: resolveAlpha.resolutionOutcome,
        evaluationTrace: resolveAlpha.evaluationTrace,
        details: {
          alphaOutcome: resolveAlpha.resolutionOutcome,
          betaOutcome: resolveBeta.resolutionOutcome,
        },
      };
    }

    default:
      throw new Error(`Unknown overlay-attachment static construction case: ${caseDefinition.caseId}`);
  }
}

export function executeOverlayAttachmentStaticConstructionTests(): {
  pass: boolean;
  results: OverlayAttachmentStaticConstructionCaseResult[];
} {
  const results = OVERLAY_ATTACHMENT_STATIC_CONSTRUCTION_CASES.map((caseDefinition) => {
    const result = runCase(caseDefinition);
    const outcomeMatches = result.resolutionOutcome === caseDefinition.expectedResolution;

    return {
      ...result,
      passed: result.passed && outcomeMatches,
    };
  });

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

/** Validates active/rejected build artifacts carry guardrail markers. */
export function executeOverlayAttachmentAuditArtifactSmokeTest(): boolean {
  const contract = buildAttachmentContract({
    overlayRegistryKey: "overlay:smoke",
    customerTenantId: "tenant-smoke",
    firmTenantId: "firm-smoke",
    clientTenantId: "client-smoke",
    activationScopeReferenceId: "scope:activation:tenant-smoke",
  });
  const scope = tenantActivationScopeFromContract(contract);

  const activeBuild = buildOverlayActivationRecord({
    actorReferenceId: "actor:smoke-active",
    attachmentAttempt: buildDisciplinedAttempt(contract, "overlay-attempt:smoke-active"),
    tenantActivationScope: scope,
    evaluationTimestampIso: "2026-06-18T16:04:00.000Z",
    retentionConfigurationReferenceId: "retention:spine-default",
  });

  const rejectedBuild = buildOverlayActivationRecord({
    actorReferenceId: "actor:smoke-rejected",
    attachmentAttempt: buildViolatingAttempt(contract, "overlay-attempt:smoke-rejected"),
    tenantActivationScope: scope,
    evaluationTimestampIso: "2026-06-18T16:04:01.000Z",
    retentionConfigurationReferenceId: "retention:spine-default",
  });

  return (
    activeBuild.containsVerticalComplianceLogic === false &&
    activeBuild.executable === false &&
    activeBuild.activationRecord.activationRecordStatus === "active" &&
    rejectedBuild.activationRecord.activationRecordStatus === "rejected" &&
    rejectedBuild.activationRecord.auditEvent.containsVerticalComplianceLogic === false
  );
}
