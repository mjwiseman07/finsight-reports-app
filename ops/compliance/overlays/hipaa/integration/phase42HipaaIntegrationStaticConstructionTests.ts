import type { ControlSpineIsolationDimension } from "../../../../control-spine/contracts";
import {
  BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID_SLOT,
  buildHipaaIntegrationPointsBinding,
  buildPhase42HipaaIntegrationBinding,
  CANONICAL_INTERFACE_ID_BY_SLOT_KEY,
  detectPc03PhiAuditRoutesOverlayOnly,
  detectPc09PhiAuditBindsOverlayRetentionTier,
  EXISTING_42H_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID,
  HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID_SLOT,
  normalizeSlotKey,
  PHASE_42_5_AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID,
  PHASE_42_5_BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID,
  PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID,
  resolveCanonicalInterfaceReferenceId,
  slotBindingMatchesNormalizedKey,
} from "./buildPhase42HipaaIntegrationBinding";

export interface Phase42HipaaIntegrationStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
}

export interface Phase42HipaaIntegrationStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  buildTrace: string[];
  details: Record<string, unknown>;
}

const EXISTING_42H_STORE_LITERAL = "phase-42-5-hipaa-compliant-audit-store-interface";

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

function buildBindingInput() {
  return {
    boundPhase42SnapshotHash: "phase42-snapshot:b11adcd",
    sensitivityTaggingConsumptionReferenceId: "phase42h:sensitivity-tagging-consumption",
    customerIsolation: dimension("tenant-healthcare", "customer:integration"),
    firmIsolation: dimension("firm-healthcare", "firm:integration"),
    clientIsolation: dimension("client-healthcare", "client:integration"),
  };
}

export const PHASE_42_HIPAA_INTEGRATION_STATIC_CONSTRUCTION_CASES: Phase42HipaaIntegrationStaticConstructionCase[] =
  [
    {
      caseId: "SC-ALL-SLOTS-BIND-CANONICAL-IDS",
      poisonCaseIds: [],
      description: "All three slots bind to canonical IDs; store matches existing 42H literal exactly",
    },
    {
      caseId: "SC-NORMALIZE-SLOT-KEY-BARE-PREFIXED",
      poisonCaseIds: [],
      description: "normalizeSlotKey: bare and slot:-prefixed forms resolve to the same binding",
    },
    {
      caseId: "SC-PC-03-OVERLAY-ONLY-ROUTING",
      poisonCaseIds: ["PC-03"],
      description: "PC-03: PHI-tagged audit routes overlay-only, not spine generic system log",
    },
    {
      caseId: "SC-PC-09-OVERLAY-RETENTION-BINDING",
      poisonCaseIds: ["PC-09"],
      description: "PC-09: PHI-tagged audit binds overlay store + overlay-tier retention hook",
    },
    {
      caseId: "SC-CONSUMER-SIDE-HIPAA-INTEGRATION-POINTS",
      poisonCaseIds: [],
      description: "Maps onto Phase 42 HipaaIntegrationPoints field names without phi-healthcare mutation",
    },
    {
      caseId: "SC-OVERLAY-SIDE-NO-SPINE-IMPORT",
      poisonCaseIds: [],
      description: "Overlay-side artifacts carry overlayContract true",
    },
  ];

function runCase(
  caseDefinition: Phase42HipaaIntegrationStaticConstructionCase,
): Phase42HipaaIntegrationStaticConstructionCaseResult {
  const binding = buildPhase42HipaaIntegrationBinding(buildBindingInput());

  switch (caseDefinition.caseId) {
    case "SC-ALL-SLOTS-BIND-CANONICAL-IDS": {
      const bindings = binding.overlayInterfaceSlotBindings;
      const auditBinding = bindings.find((entry) => entry.slotKey === "audit_logging_event_interface");
      const breachBinding = bindings.find((entry) => entry.slotKey === "breach_detection_signal_interface");
      const storeBinding = bindings.find(
        (entry) => entry.slotKey === "regulated_compliant_audit_store_interface",
      );

      const passed =
        bindings.length === 3 &&
        auditBinding?.interfaceReferenceId === PHASE_42_5_AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID &&
        breachBinding?.interfaceReferenceId === PHASE_42_5_BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID &&
        storeBinding?.interfaceReferenceId === PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID &&
        PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID === EXISTING_42H_STORE_LITERAL &&
        EXISTING_42H_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID === EXISTING_42H_STORE_LITERAL &&
        binding.auditLoggingIntegrationPoint.boundInterfaceReferenceId ===
          PHASE_42_5_AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID &&
        binding.breachDetectionIntegrationPoint.boundInterfaceReferenceId ===
          PHASE_42_5_BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID &&
        binding.hipaaCompliantAuditStoreIntegrationPoint.boundInterfaceReferenceId ===
          EXISTING_42H_STORE_LITERAL;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: binding.buildTrace,
        details: {
          storeLiteral: storeBinding?.interfaceReferenceId,
          existing42hLiteral: EXISTING_42H_STORE_LITERAL,
        },
      };
    }

    case "SC-NORMALIZE-SLOT-KEY-BARE-PREFIXED": {
      const bareAudit = normalizeSlotKey("audit_logging_event_interface");
      const prefixedAudit = normalizeSlotKey("slot:audit_logging_event_interface");
      const bareBreach = normalizeSlotKey(BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID_SLOT);
      const prefixedBreach = normalizeSlotKey(`slot:${BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID_SLOT}`);
      const bareStore = normalizeSlotKey(HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID_SLOT);
      const prefixedStore = normalizeSlotKey(
        `slot:${HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID_SLOT}`,
      );

      const auditBinding = binding.overlayInterfaceSlotBindings.find(
        (entry) => entry.slotKey === "audit_logging_event_interface",
      ) as (typeof binding.overlayInterfaceSlotBindings)[number];

      const passed =
        bareAudit === prefixedAudit &&
        bareBreach === prefixedBreach &&
        bareStore === prefixedStore &&
        slotBindingMatchesNormalizedKey(auditBinding, "audit_logging_event_interface") &&
        slotBindingMatchesNormalizedKey(auditBinding, "slot:audit_logging_event_interface") &&
        resolveCanonicalInterfaceReferenceId("slot:breach_detection_signal_interface")
          ?.interfaceReferenceId === CANONICAL_INTERFACE_ID_BY_SLOT_KEY.breach_detection_signal_interface &&
        resolveCanonicalInterfaceReferenceId("regulated_compliant_audit_store_interface")
          ?.interfaceReferenceId === CANONICAL_INTERFACE_ID_BY_SLOT_KEY.regulated_compliant_audit_store_interface;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: binding.buildTrace,
        details: {
          bareAudit,
          prefixedAudit,
        },
      };
    }

    case "SC-PC-03-OVERLAY-ONLY-ROUTING": {
      const detector = detectPc03PhiAuditRoutesOverlayOnly(binding);

      const passed =
        detector &&
        binding.phiTaggedAuditRoutingDeclaration.phiTaggedAuditEventRoutesOverlayOnly === true &&
        binding.phiTaggedAuditRoutingDeclaration.routesToSpineGenericSystemLog === false;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: binding.phiTaggedAuditRoutingDeclaration.buildTrace,
        details: { detector },
      };
    }

    case "SC-PC-09-OVERLAY-RETENTION-BINDING": {
      const detector = detectPc09PhiAuditBindsOverlayRetentionTier(binding);

      const passed =
        detector &&
        binding.phiTaggedAuditRetentionBindingDeclaration.retentionHookPointsAtOverlayTier === true &&
        binding.phiTaggedAuditRetentionBindingDeclaration.overlayRetentionDurationFloorReferenceId.includes(
          "42.5T",
        );

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: binding.phiTaggedAuditRetentionBindingDeclaration.buildTrace,
        details: { detector },
      };
    }

    case "SC-CONSUMER-SIDE-HIPAA-INTEGRATION-POINTS": {
      const pointsBinding = buildHipaaIntegrationPointsBinding();
      const fieldNames = Object.keys(pointsBinding);

      const passed =
        fieldNames.includes("auditLoggingEventInterfaceReferenceId") &&
        fieldNames.includes("breachDetectionSignalInterfaceReferenceId") &&
        fieldNames.includes("hipaaCompliantAuditStoreInterfaceReferenceId") &&
        binding.hipaaIntegrationPointsBinding.auditLoggingEventInterfaceReferenceId ===
          pointsBinding.auditLoggingEventInterfaceReferenceId &&
        binding.hipaaIntegrationPointsBinding.breachDetectionSignalInterfaceReferenceId ===
          pointsBinding.breachDetectionSignalInterfaceReferenceId &&
        binding.hipaaIntegrationPointsBinding.hipaaCompliantAuditStoreInterfaceReferenceId ===
          pointsBinding.hipaaCompliantAuditStoreInterfaceReferenceId;

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: binding.buildTrace.filter((line) => line.startsWith("hipaa_integration_points:")),
        details: { fieldNames },
      };
    }

    case "SC-OVERLAY-SIDE-NO-SPINE-IMPORT": {
      const artifacts = [
        binding,
        binding.phiTaggedAuditRoutingDeclaration,
        binding.phiTaggedAuditRetentionBindingDeclaration,
      ];

      const passed = artifacts.every(
        (artifact) =>
          artifact.overlayContract === true &&
          artifact.containsVerticalComplianceLogic === true &&
          artifact.executable === false,
      );

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: binding.buildTrace,
        details: {},
      };
    }

    default:
      throw new Error(`Unknown Phase 42 HIPAA integration static construction case: ${caseDefinition.caseId}`);
  }
}

export function executePhase42HipaaIntegrationStaticConstructionTests(): {
  pass: boolean;
  results: Phase42HipaaIntegrationStaticConstructionCaseResult[];
} {
  const results = PHASE_42_HIPAA_INTEGRATION_STATIC_CONSTRUCTION_CASES.map(runCase);

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

export function executePhase42HipaaIntegrationBuildArtifactSmokeTest(): boolean {
  const binding = buildPhase42HipaaIntegrationBinding(buildBindingInput());

  return (
    binding.overlayInterfaceSlotBindings.length === 3 &&
    binding.hipaaIntegrationPointsBinding.hipaaCompliantAuditStoreInterfaceReferenceId ===
      EXISTING_42H_STORE_LITERAL
  );
}
