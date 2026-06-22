import type {
  ControlSpineIsolationDimension,
  ControlSpineOverlayInterfaceSlotKey,
  ControlSpinePhase42HandoffMarkers,
  ControlSpinePhase42OverlayInterfaceSlotBinding,
} from "../../../../control-spine/contracts";
import {
  AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID_SLOT,
  declareAuditLoggingInterfaceIntegrationPoint,
  SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS,
  type AuditLoggingInterfaceIntegrationPoint,
} from "../../../../control-spine/audit/buildAuditEvent";
import type { HipaaIntegrationPoints } from "../../../../../lib/intelligence/synthetic/industry/phi-healthcare/buildHealthcarePHIDiscipline";

/** Authoritative canonical interface IDs — single source of truth for 42.5L bind layer. */
export const PHASE_42_5_AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID =
  "phase-42-5-audit-logging-event-interface" as const;

export const PHASE_42_5_BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID =
  "phase-42-5-breach-detection-signal-interface" as const;

/**
 * Adopted verbatim from existing 42H default in buildPHITag.ts — founder decision, no competing literal.
 * @see lib/intelligence/synthetic/industry/phi-tagging/buildPHITag.ts
 */
export const PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID =
  "phase-42-5-hipaa-compliant-audit-store-interface" as const;

export const EXISTING_42H_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID =
  PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID;

export const BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID_SLOT =
  "breach_detection_signal_interface" as const;

export const HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID_SLOT =
  "regulated_compliant_audit_store_interface" as const;

export const CANONICAL_INTERFACE_ID_BY_SLOT_KEY: Readonly<
  Record<ControlSpineOverlayInterfaceSlotKey, string>
> = {
  audit_logging_event_interface: PHASE_42_5_AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID,
  breach_detection_signal_interface: PHASE_42_5_BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID,
  regulated_compliant_audit_store_interface: PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID,
};

export const SLOT_KEY_PREFIX = "slot:" as const;

export type Phase42HipaaIntegrationPointsBinding = Pick<
  HipaaIntegrationPoints,
  | "auditLoggingEventInterfaceReferenceId"
  | "breachDetectionSignalInterfaceReferenceId"
  | "hipaaCompliantAuditStoreInterfaceReferenceId"
>;

export interface BreachDetectionSignalInterfaceIntegrationPoint {
  integrationPointId: string;
  integrationPointKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  interfaceReferenceIdSlot: typeof BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID_SLOT;
  boundInterfaceReferenceId: string;
  implementationOwnerModuleReferenceId: "42.5L";
}

export interface HipaaCompliantAuditStoreInterfaceIntegrationPoint {
  integrationPointId: string;
  integrationPointKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  interfaceReferenceIdSlot: typeof HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID_SLOT;
  boundInterfaceReferenceId: string;
  implementationOwnerModuleReferenceId: "42.5L";
}

export interface PhiTaggedAuditRoutingDeclaration {
  phiTaggedAuditRoutingDeclarationId: string;
  phiTaggedAuditRoutingDeclarationKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  regulatoryBasisStatus: "current_final_rule";
  phiTaggedAuditEventRoutesOverlayOnly: true;
  routesToSpineGenericSystemLog: false;
  overlayAuditStoreInterfaceReferenceId: typeof PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID;
  spineGenericSystemLogRetentionTierReferenceId: string;
  buildTrace: string[];
}

export interface PhiTaggedAuditRetentionBindingDeclaration {
  phiTaggedAuditRetentionBindingDeclarationId: string;
  phiTaggedAuditRetentionBindingDeclarationKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  regulatoryBasisStatus: "current_final_rule";
  retentionHookPointsAtOverlayTier: true;
  overlayRetentionTierReferenceId: string;
  spineBaselineRetentionTierReferenceId: string;
  overlayRetentionDurationFloorReferenceId: string;
  buildTrace: string[];
}

export interface BuildPhase42HipaaIntegrationBindingInput {
  boundPhase42SnapshotHash: string;
  sensitivityTaggingConsumptionReferenceId: string;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
}

export interface Phase42HipaaIntegrationBindingBuildResult {
  phase42HipaaIntegrationBindingBuildResultId: string;
  phase42HipaaIntegrationBindingBuildResultKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  regulatoryBasisStatus: "current_final_rule";
  buildTrace: string[];
  phase42HandoffMarkers: ControlSpinePhase42HandoffMarkers;
  hipaaIntegrationPointsBinding: Phase42HipaaIntegrationPointsBinding;
  overlayInterfaceSlotBindings: ControlSpinePhase42OverlayInterfaceSlotBinding[];
  auditLoggingIntegrationPoint: AuditLoggingInterfaceIntegrationPoint;
  breachDetectionIntegrationPoint: BreachDetectionSignalInterfaceIntegrationPoint;
  hipaaCompliantAuditStoreIntegrationPoint: HipaaCompliantAuditStoreInterfaceIntegrationPoint;
  phiTaggedAuditRoutingDeclaration: PhiTaggedAuditRoutingDeclaration;
  phiTaggedAuditRetentionBindingDeclaration: PhiTaggedAuditRetentionBindingDeclaration;
}

function buildDeterministicId(prefix: string, parts: string[]): string {
  return `${prefix}:${parts.filter(Boolean).join(":")}`;
}

/**
 * Normalizes bare and slot:-prefixed slot keys to canonical ControlSpineOverlayInterfaceSlotKey.
 * Silent-break guard — bind comparisons must use this helper.
 */
export function normalizeSlotKey(
  rawSlotKey: string,
): ControlSpineOverlayInterfaceSlotKey | null {
  const trimmed = rawSlotKey.trim();
  const withoutPrefix = trimmed.startsWith(SLOT_KEY_PREFIX)
    ? trimmed.slice(SLOT_KEY_PREFIX.length)
    : trimmed;

  switch (withoutPrefix) {
    case "audit_logging_event_interface":
    case AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID_SLOT:
      return "audit_logging_event_interface";
    case "breach_detection_signal_interface":
    case BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID_SLOT:
      return "breach_detection_signal_interface";
    case "regulated_compliant_audit_store_interface":
    case HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID_SLOT:
      return "regulated_compliant_audit_store_interface";
    default:
      return null;
  }
}

export function resolveCanonicalInterfaceReferenceId(
  rawSlotKey: string,
): { slotKey: ControlSpineOverlayInterfaceSlotKey; interfaceReferenceId: string } | null {
  const slotKey = normalizeSlotKey(rawSlotKey);
  if (!slotKey) {
    return null;
  }

  return {
    slotKey,
    interfaceReferenceId: CANONICAL_INTERFACE_ID_BY_SLOT_KEY[slotKey],
  };
}

export function buildHipaaIntegrationPointsBinding(): Phase42HipaaIntegrationPointsBinding {
  return {
    auditLoggingEventInterfaceReferenceId: PHASE_42_5_AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID,
    breachDetectionSignalInterfaceReferenceId:
      PHASE_42_5_BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID,
    hipaaCompliantAuditStoreInterfaceReferenceId:
      PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID,
  };
}

export function declareBreachDetectionSignalInterfaceIntegrationPoint(
  boundInterfaceReferenceId: string = PHASE_42_5_BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID,
): BreachDetectionSignalInterfaceIntegrationPoint {
  return {
    integrationPointId: buildDeterministicId("breach-interface-integration", ["42q-slot"]),
    integrationPointKey: "breach-detection-signal-interface-slot",
    containsVerticalComplianceLogic: false,
    executable: false,
    interfaceReferenceIdSlot: BREACH_DETECTION_SIGNAL_INTERFACE_REFERENCE_ID_SLOT,
    boundInterfaceReferenceId,
    implementationOwnerModuleReferenceId: "42.5L",
  };
}

export function declareHipaaCompliantAuditStoreInterfaceIntegrationPoint(
  boundInterfaceReferenceId: string = PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID,
): HipaaCompliantAuditStoreInterfaceIntegrationPoint {
  return {
    integrationPointId: buildDeterministicId("hipaa-audit-store-interface-integration", ["42q-slot"]),
    integrationPointKey: "hipaa-compliant-audit-store-interface-slot",
    containsVerticalComplianceLogic: false,
    executable: false,
    interfaceReferenceIdSlot: HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID_SLOT,
    boundInterfaceReferenceId,
    implementationOwnerModuleReferenceId: "42.5L",
  };
}

function buildOverlayInterfaceSlotBindings(): ControlSpinePhase42OverlayInterfaceSlotBinding[] {
  return (Object.keys(CANONICAL_INTERFACE_ID_BY_SLOT_KEY) as ControlSpineOverlayInterfaceSlotKey[]).map(
    (slotKey) => ({
      slotKey,
      interfaceReferenceId: CANONICAL_INTERFACE_ID_BY_SLOT_KEY[slotKey],
    }),
  );
}

function buildPhiTaggedAuditRoutingDeclaration(): PhiTaggedAuditRoutingDeclaration {
  return {
    phiTaggedAuditRoutingDeclarationId: buildDeterministicId("phi-audit-routing", ["overlay-only"]),
    phiTaggedAuditRoutingDeclarationKey: "phi-audit-routing:overlay-only",
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    regulatoryBasisStatus: "current_final_rule",
    phiTaggedAuditEventRoutesOverlayOnly: true,
    routesToSpineGenericSystemLog: false,
    overlayAuditStoreInterfaceReferenceId: PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID,
    spineGenericSystemLogRetentionTierReferenceId: buildDeterministicId("retention-tier", [
      "spine-application-system",
      String(SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS),
    ]),
    buildTrace: [
      "phi_tagged_audit:routes_overlay_only",
      "phi_tagged_audit:does_not_route_spine_generic_system_log",
      `overlay_store:${PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID}`,
    ],
  };
}

function buildPhiTaggedAuditRetentionBindingDeclaration(): PhiTaggedAuditRetentionBindingDeclaration {
  return {
    phiTaggedAuditRetentionBindingDeclarationId: buildDeterministicId("phi-audit-retention-binding", [
      "overlay-tier",
    ]),
    phiTaggedAuditRetentionBindingDeclarationKey: "phi-audit-retention-binding:overlay-tier",
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    regulatoryBasisStatus: "current_final_rule",
    retentionHookPointsAtOverlayTier: true,
    overlayRetentionTierReferenceId: buildDeterministicId("retention-tier", ["overlay-hipaa-audit"]),
    spineBaselineRetentionTierReferenceId: buildDeterministicId("retention-tier", [
      "spine-application-system",
      String(SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS),
    ]),
    overlayRetentionDurationFloorReferenceId: "retention-floor:hipaa-documentation-6y-deferred-to-42.5T",
    buildTrace: [
      "retention_hook:points_at_overlay_tier",
      "retention_floor_value:owned_by_42.5T_not_here",
      "nprm:not_asserted_as_law",
    ],
  };
}

/**
 * Authors canonical Phase 42.5 interface IDs and binds spine generic slots consumer-side.
 * No Phase 42 source mutation — closes slot->Phase-42-ID mapping debt from 42.5A pre-build gate.
 */
export function buildPhase42HipaaIntegrationBinding(
  input: BuildPhase42HipaaIntegrationBindingInput,
): Phase42HipaaIntegrationBindingBuildResult {
  const hipaaIntegrationPointsBinding = buildHipaaIntegrationPointsBinding();
  const overlayInterfaceSlotBindings = buildOverlayInterfaceSlotBindings();

  const auditLoggingIntegrationPoint = declareAuditLoggingInterfaceIntegrationPoint(
    PHASE_42_5_AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID,
  );
  const breachDetectionIntegrationPoint = declareBreachDetectionSignalInterfaceIntegrationPoint();
  const hipaaCompliantAuditStoreIntegrationPoint =
    declareHipaaCompliantAuditStoreInterfaceIntegrationPoint();

  const phiTaggedAuditRoutingDeclaration = buildPhiTaggedAuditRoutingDeclaration();
  const phiTaggedAuditRetentionBindingDeclaration = buildPhiTaggedAuditRetentionBindingDeclaration();

  const phase42HandoffMarkers: ControlSpinePhase42HandoffMarkers = {
    boundPhase42SnapshotHash: input.boundPhase42SnapshotHash,
    sensitivityTaggingConsumptionReferenceId: input.sensitivityTaggingConsumptionReferenceId,
    overlayInterfaceSlotBindings,
  };

  const buildTrace = [
    "buildPhase42HipaaIntegrationBinding:start",
    "regulatory_basis:current_final_rule",
    "consumer_side_only:no_phase_42_source_mutation",
    ...overlayInterfaceSlotBindings.map(
      (binding) => `slot_bind:${binding.slotKey}->${binding.interfaceReferenceId}`,
    ),
    `hipaa_integration_points:auditLoggingEventInterfaceReferenceId=${hipaaIntegrationPointsBinding.auditLoggingEventInterfaceReferenceId}`,
    `hipaa_integration_points:breachDetectionSignalInterfaceReferenceId=${hipaaIntegrationPointsBinding.breachDetectionSignalInterfaceReferenceId}`,
    `hipaa_integration_points:hipaaCompliantAuditStoreInterfaceReferenceId=${hipaaIntegrationPointsBinding.hipaaCompliantAuditStoreInterfaceReferenceId}`,
    ...phiTaggedAuditRoutingDeclaration.buildTrace,
    ...phiTaggedAuditRetentionBindingDeclaration.buildTrace,
  ];

  return {
    phase42HipaaIntegrationBindingBuildResultId: buildDeterministicId("phase42-hipaa-integration-binding", [
      input.boundPhase42SnapshotHash,
    ]),
    phase42HipaaIntegrationBindingBuildResultKey: "phase42-hipaa-integration-binding:bound",
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    regulatoryBasisStatus: "current_final_rule",
    buildTrace,
    phase42HandoffMarkers,
    hipaaIntegrationPointsBinding,
    overlayInterfaceSlotBindings,
    auditLoggingIntegrationPoint,
    breachDetectionIntegrationPoint,
    hipaaCompliantAuditStoreIntegrationPoint,
    phiTaggedAuditRoutingDeclaration,
    phiTaggedAuditRetentionBindingDeclaration,
  };
}

/** 42.5O probe export — PC-03: PHI-tagged audit routes overlay-only, not spine generic system log. */
export function detectPc03PhiAuditRoutesOverlayOnly(
  binding: Phase42HipaaIntegrationBindingBuildResult,
): boolean {
  return (
    binding.phiTaggedAuditRoutingDeclaration.phiTaggedAuditEventRoutesOverlayOnly === true &&
    binding.phiTaggedAuditRoutingDeclaration.routesToSpineGenericSystemLog === false &&
    binding.phiTaggedAuditRoutingDeclaration.overlayAuditStoreInterfaceReferenceId ===
      PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID
  );
}

/** 42.5O probe export — PC-09: PHI-tagged audit binds overlay store + overlay-tier retention hook. */
export function detectPc09PhiAuditBindsOverlayRetentionTier(
  binding: Phase42HipaaIntegrationBindingBuildResult,
): boolean {
  return (
    binding.phiTaggedAuditRetentionBindingDeclaration.retentionHookPointsAtOverlayTier === true &&
    binding.hipaaCompliantAuditStoreIntegrationPoint.boundInterfaceReferenceId ===
      PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID &&
    binding.phiTaggedAuditRetentionBindingDeclaration.overlayRetentionTierReferenceId !==
      binding.phiTaggedAuditRetentionBindingDeclaration.spineBaselineRetentionTierReferenceId
  );
}

export function slotBindingMatchesNormalizedKey(
  binding: ControlSpinePhase42OverlayInterfaceSlotBinding,
  rawSlotKey: string,
): boolean {
  const resolved = resolveCanonicalInterfaceReferenceId(rawSlotKey);
  if (!resolved) {
    return false;
  }

  return (
    binding.slotKey === resolved.slotKey &&
    binding.interfaceReferenceId === resolved.interfaceReferenceId
  );
}
