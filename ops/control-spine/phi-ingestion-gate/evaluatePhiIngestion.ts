import type {
  AuditEventContract,
  ControlSpineIsolationDimension,
} from "../contracts";
import type { HipaaPhiDataClassReferenceKey } from "../../compliance/overlays/hipaa/contracts";
import {
  resolveOverlayActivation,
  type OverlayActivationRegistry,
  type OverlayActivationResolutionOutcome,
  type OverlayTenantActivationScope,
} from "../../compliance/overlay-attachment";

/** Default HIPAA overlay registry key — opaque; gate does not embed HIPAA semantics. */
export const PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY = "overlay:hipaa" as const;

const PHI_BEARING_DATA_CLASS_KEYS: ReadonlySet<HipaaPhiDataClassReferenceKey> = new Set([
  "phi",
  "electronic_phi",
  "phi_derived_learning_boundary",
]);

export type PhiIngestionAccessOutcome = "allowed" | "refused";

export type PhiIngestionRefuseReason =
  | "phi_to_non_overlay_tenant"
  | "ambiguous_phi_classification"
  | "ambiguous_tenant_scope"
  | "ambiguous_activation_state"
  | "overlay_coverage_not_active"
  | "pc14_overlay_bypass_path"
  | "refuse_by_default";

export interface PhiDataClassMarkerDescriptor {
  phiDataClassReferenceId: string;
  phiDataClassKey: HipaaPhiDataClassReferenceKey | null;
  markerParseable: boolean;
}

export interface PhiIngestionAttemptDescriptor {
  ingestionAttemptReferenceId: string;
  targetTenantActivationScope: OverlayTenantActivationScope | null | undefined;
  phiDataClassMarkers: PhiDataClassMarkerDescriptor[];
  /** Explicit overlay-bypass claim on the ingestion path (PC-14 vector). */
  claimsOverlayBypassPath?: boolean;
  ingestionDescriptorParseable: boolean;
}

export interface ClassifyPhiIngestionAttemptInput {
  ingestionAttempt: PhiIngestionAttemptDescriptor;
  overlayActivationRegistry: OverlayActivationRegistry;
  hipaaOverlayRegistryKey?: string;
}

export interface ClassifyPhiIngestionAttemptCore {
  ingestionOutcome: PhiIngestionAccessOutcome;
  refuseReason: PhiIngestionRefuseReason | null;
  carriesPhiMarkers: boolean;
  overlayActivationOutcome: OverlayActivationResolutionOutcome | "ambiguous" | "not_evaluated";
  evaluationTrace: string[];
}

export interface EvaluatePhiIngestionInput extends ClassifyPhiIngestionAttemptInput {
  actorReferenceId: string;
  retentionConfigurationReferenceId: string;
  evaluationTimestampIso: string;
}

export interface ControlSpinePhiIngestionEvaluationResult {
  phiIngestionEvaluationResultId: string;
  phiIngestionEvaluationResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  ingestionOutcome: PhiIngestionAccessOutcome;
  refuseReason: PhiIngestionRefuseReason | null;
  carriesPhiMarkers: boolean;
  overlayActivationOutcome: OverlayActivationResolutionOutcome | "ambiguous" | "not_evaluated";
  poisonCaseIds: string[];
  evaluationTrace: string[];
  auditEvent: AuditEventContract;
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicEvaluationId(parts: string[]): string {
  return `phi-ingestion-eval:${parts.filter(Boolean).join(":")}`;
}

function validateTenantActivationScope(
  scope: OverlayTenantActivationScope | null | undefined,
): { valid: true; scope: OverlayTenantActivationScope } | { valid: false } {
  if (!scope) {
    return { valid: false };
  }

  if (
    !hasValue(scope.customerTenantId) ||
    !hasValue(scope.firmTenantId) ||
    !hasValue(scope.clientTenantId) ||
    !hasValue(scope.activationScopeReferenceId)
  ) {
    return { valid: false };
  }

  const dimensions: ControlSpineIsolationDimension[] = [
    scope.customerIsolation,
    scope.firmIsolation,
    scope.clientIsolation,
  ];

  for (const dimension of dimensions) {
    if (
      !hasValue(dimension.isolationDimensionReferenceId) ||
      !hasValue(dimension.tenantScopeKey) ||
      !Array.isArray(dimension.boundaryReferenceIds)
    ) {
      return { valid: false };
    }
  }

  return { valid: true, scope };
}

function classifyPhiMarkerPresence(
  markers: PhiDataClassMarkerDescriptor[],
  evaluationTrace: string[],
): { carriesPhiMarkers: boolean } | { refuseReason: PhiIngestionRefuseReason } {
  if (markers.length === 0) {
    evaluationTrace.push("phi_markers:none");
    return { carriesPhiMarkers: false };
  }

  let sawPhiMarker = false;

  for (const marker of markers) {
    if (!marker.markerParseable || !hasValue(marker.phiDataClassReferenceId)) {
      evaluationTrace.push(`phi_marker:ambiguous:${marker.phiDataClassReferenceId ?? "missing"}`);
      return { refuseReason: "ambiguous_phi_classification" };
    }

    if (marker.phiDataClassKey && PHI_BEARING_DATA_CLASS_KEYS.has(marker.phiDataClassKey)) {
      sawPhiMarker = true;
      evaluationTrace.push(`phi_marker:present:${marker.phiDataClassKey}:${marker.phiDataClassReferenceId}`);
    } else {
      evaluationTrace.push(`phi_marker:non_phi_class:${marker.phiDataClassKey ?? "none"}`);
    }
  }

  return { carriesPhiMarkers: sawPhiMarker };
}

/**
 * Pure PHI ingestion classifier. Refuse-by-default for PHI without active overlay;
 * fail-closed on ambiguous PHI classification, tenant scope, or activation state.
 */
export function classifyPhiIngestionAttempt(
  input: ClassifyPhiIngestionAttemptInput,
): ClassifyPhiIngestionAttemptCore {
  const evaluationTrace: string[] = [
    "classifyPhiIngestionAttempt:start",
    "policy:refuse_by_default_for_phi",
    "invariant:non_phi_not_gate_concern",
  ];

  const attempt = input.ingestionAttempt;
  const hipaaOverlayRegistryKey = input.hipaaOverlayRegistryKey ?? PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY;

  if (!attempt.ingestionDescriptorParseable) {
    evaluationTrace.push("descriptor:unparseable");
    return {
      ingestionOutcome: "refused",
      refuseReason: "ambiguous_phi_classification",
      carriesPhiMarkers: false,
      overlayActivationOutcome: "ambiguous",
      evaluationTrace: [...evaluationTrace, "refuse:ambiguous_phi_classification"],
    };
  }

  if (attempt.claimsOverlayBypassPath) {
    evaluationTrace.push("pc14:overlay_bypass_path_claimed");
    return {
      ingestionOutcome: "refused",
      refuseReason: "pc14_overlay_bypass_path",
      carriesPhiMarkers: true,
      overlayActivationOutcome: "ambiguous",
      evaluationTrace: [...evaluationTrace, "refuse:pc14_overlay_bypass_path"],
    };
  }

  const scopeValidation = validateTenantActivationScope(attempt.targetTenantActivationScope);
  if (!scopeValidation.valid) {
    evaluationTrace.push("tenant_scope:ambiguous_or_missing");
    return {
      ingestionOutcome: "refused",
      refuseReason: "ambiguous_tenant_scope",
      carriesPhiMarkers: false,
      overlayActivationOutcome: "ambiguous",
      evaluationTrace: [...evaluationTrace, "refuse:ambiguous_tenant_scope"],
    };
  }

  const markerClassification = classifyPhiMarkerPresence(attempt.phiDataClassMarkers, evaluationTrace);
  if ("refuseReason" in markerClassification) {
    return {
      ingestionOutcome: "refused",
      refuseReason: markerClassification.refuseReason,
      carriesPhiMarkers: false,
      overlayActivationOutcome: "ambiguous",
      evaluationTrace: [...evaluationTrace, `refuse:${markerClassification.refuseReason}`],
    };
  }

  if (!markerClassification.carriesPhiMarkers) {
    evaluationTrace.push("gate:not_applied_non_phi");
    return {
      ingestionOutcome: "allowed",
      refuseReason: null,
      carriesPhiMarkers: false,
      overlayActivationOutcome: "not_evaluated",
      evaluationTrace: [...evaluationTrace, "ingestion:allowed"],
    };
  }

  evaluationTrace.push("compose:resolve_overlay_activation");

  const activationResolution = resolveOverlayActivation({
    registry: input.overlayActivationRegistry,
    tenantActivationScope: scopeValidation.scope,
    overlayRegistryKey: hipaaOverlayRegistryKey,
  });

  evaluationTrace.push(
    ...activationResolution.evaluationTrace.map((line) => `activation:${line}`),
    `activation:outcome:${activationResolution.resolutionOutcome}`,
  );

  if (activationResolution.resolutionReason === "ambiguous_activation_scope") {
    return {
      ingestionOutcome: "refused",
      refuseReason: "ambiguous_activation_state",
      carriesPhiMarkers: true,
      overlayActivationOutcome: "ambiguous",
      evaluationTrace: [...evaluationTrace, "refuse:ambiguous_activation_state"],
    };
  }

  if (activationResolution.resolutionOutcome !== "active") {
    return {
      ingestionOutcome: "refused",
      refuseReason: "phi_to_non_overlay_tenant",
      carriesPhiMarkers: true,
      overlayActivationOutcome: "not_active",
      evaluationTrace: [...evaluationTrace, "refuse:phi_to_non_overlay_tenant"],
    };
  }

  return {
    ingestionOutcome: "allowed",
    refuseReason: null,
    carriesPhiMarkers: true,
    overlayActivationOutcome: "active",
    evaluationTrace: [...evaluationTrace, "ingestion:allowed"],
  };
}

function buildAuditEventFromEvaluation(
  input: EvaluatePhiIngestionInput,
  classification: ClassifyPhiIngestionAttemptCore,
  isolationFields: {
    customerIsolation: ControlSpineIsolationDimension;
    firmIsolation: ControlSpineIsolationDimension;
    clientIsolation: ControlSpineIsolationDimension;
  },
): AuditEventContract {
  return {
    auditEventContractId: buildDeterministicEvaluationId([
      "audit",
      input.actorReferenceId,
      input.ingestionAttempt.ingestionAttemptReferenceId,
      classification.ingestionOutcome,
    ]),
    auditEventKey: `phi-ingestion-gate:${classification.ingestionOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    customerIsolation: isolationFields.customerIsolation,
    firmIsolation: isolationFields.firmIsolation,
    clientIsolation: isolationFields.clientIsolation,
    eventCategory: "access",
    eventOutcome: classification.ingestionOutcome === "allowed" ? "success" : "denied",
    actorReferenceId: input.actorReferenceId,
    targetResourceReferenceId: input.ingestionAttempt.ingestionAttemptReferenceId,
    eventTimestampIso: input.evaluationTimestampIso,
    retentionConfigurationReferenceId: input.retentionConfigurationReferenceId,
    auditTrailReferenceIds: [...classification.evaluationTrace],
  };
}

function fallbackIsolationDimension(suffix: string): ControlSpineIsolationDimension {
  return {
    isolationDimensionReferenceId: buildDeterministicEvaluationId([`dim-ref:fallback:${suffix}`]),
    tenantScopeKey: buildDeterministicEvaluationId([`fallback:${suffix}`]),
    boundaryReferenceIds: [buildDeterministicEvaluationId([`boundary:fallback:${suffix}`])],
  };
}

export function evaluatePhiIngestion(
  input: EvaluatePhiIngestionInput,
): ControlSpinePhiIngestionEvaluationResult {
  const classification = classifyPhiIngestionAttempt(input);

  const scope = input.ingestionAttempt.targetTenantActivationScope;
  const isolationFields = scope ?? {
    customerIsolation: fallbackIsolationDimension("customer"),
    firmIsolation: fallbackIsolationDimension("firm"),
    clientIsolation: fallbackIsolationDimension("client"),
  };

  const poisonCaseIds: string[] = [];
  if (classification.refuseReason === "pc14_overlay_bypass_path") {
    poisonCaseIds.push("PC-14");
  }
  if (
    classification.refuseReason === "phi_to_non_overlay_tenant" ||
    classification.refuseReason === "overlay_coverage_not_active"
  ) {
    poisonCaseIds.push("PC-14");
  }

  const phiIngestionEvaluationResultId = buildDeterministicEvaluationId([
    input.ingestionAttempt.ingestionAttemptReferenceId,
    classification.ingestionOutcome,
    classification.refuseReason ?? "none",
    classification.overlayActivationOutcome,
  ]);

  return {
    phiIngestionEvaluationResultId,
    phiIngestionEvaluationResultKey: `phi-ingestion-gate:${classification.ingestionOutcome}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    ingestionOutcome: classification.ingestionOutcome,
    refuseReason: classification.refuseReason,
    carriesPhiMarkers: classification.carriesPhiMarkers,
    overlayActivationOutcome: classification.overlayActivationOutcome,
    poisonCaseIds,
    evaluationTrace: classification.evaluationTrace,
    auditEvent: buildAuditEventFromEvaluation(input, classification, {
      customerIsolation: isolationFields.customerIsolation,
      firmIsolation: isolationFields.firmIsolation,
      clientIsolation: isolationFields.clientIsolation,
    }),
  };
}

/** 42.5O probe export — PC-14 ingestion-half: PHI ingested without overlay coverage. */
export function detectPc14PhiIngestionOverlayBypass(input: EvaluatePhiIngestionInput): boolean {
  const result = evaluatePhiIngestion(input);
  return (
    result.ingestionOutcome === "refused" &&
    (result.refuseReason === "pc14_overlay_bypass_path" ||
      result.refuseReason === "phi_to_non_overlay_tenant") &&
    result.poisonCaseIds.includes("PC-14")
  );
}

/** 42.5O probe export — any PHI ingestion refusal at the gate. */
export function detectPhiIngestionRefusal(input: EvaluatePhiIngestionInput): boolean {
  return evaluatePhiIngestion(input).ingestionOutcome === "refused";
}
