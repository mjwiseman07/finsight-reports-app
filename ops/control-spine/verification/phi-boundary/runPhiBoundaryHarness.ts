import type { ControlSpineIsolationDimension } from "../../contracts";
import type { HipaaPhiDataClassReferenceKey } from "../../../compliance/overlays/hipaa/contracts";
import type { Phase42HipaaIntegrationBindingBuildResult } from "../../../compliance/overlays/hipaa/integration";
import { detectPc03PhiAuditRoutesOverlayOnly } from "../../../compliance/overlays/hipaa/integration";
import {
  createOverlayActivationRegistry,
  type OverlayActivationRegistry,
  type OverlayTenantActivationScope,
} from "../../../compliance/overlay-attachment";
import {
  classifyIsolationReach,
  type ControlSpineIsolationScope,
} from "../../isolation";
import {
  classifyPhiIngestionAttempt,
  PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
  type PhiDataClassMarkerDescriptor,
} from "../../phi-ingestion-gate";

const PHI_BOUNDARY_BEARING_DATA_CLASS_KEYS: ReadonlySet<HipaaPhiDataClassReferenceKey> = new Set([
  "phi",
  "electronic_phi",
  "phi_derived_learning_boundary",
]);

const PHI_DERIVED_ARTIFACT_SURFACE_KINDS = [
  "phi_derived_aggregate",
  "phi_derived_embedding",
  "phi_derived_feature",
  "phi_derived_summary",
] as const;

export type PhiDerivedArtifactSurfaceKind = (typeof PHI_DERIVED_ARTIFACT_SURFACE_KINDS)[number];

export type PhiDerivationLineageStatus =
  | "phi_derived"
  | "ambiguous"
  | "claimed_non_phi_laundered";

export type PhiBoundarySurfacingContext = "hipaa_overlay_active" | "non_overlay";

export type PhiBoundaryViolationKind =
  | "cross_tenant_derived_learning_leak"
  | "overlay_escape_derived_learning"
  | "derivation_laundering_attempt"
  | "ambiguous_derivation_boundary_crossing";

export interface PhiBoundaryTenantScope {
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
  boundaryScopeReferenceId: string;
}

export interface PhiDerivedArtifactDescriptor {
  artifactReferenceId: string;
  /** Explicit surface kind — derived kinds are never raw PHI payloads. */
  artifactSurfaceKind: PhiDerivedArtifactSurfaceKind | "raw_phi";
  phiDataClassKey: HipaaPhiDataClassReferenceKey | null;
  phiDataClassReferenceId: string;
  derivationLineageStatus: PhiDerivationLineageStatus;
  lineageParseable: boolean;
  /** Opaque lineage refs only — no actual PHI values. */
  sourcePhiLineageReferenceIds: string[];
  sourceTenantScope: PhiBoundaryTenantScope;
}

export interface PhiBoundarySurfacingAttemptDescriptor {
  surfacingAttemptReferenceId: string;
  artifact: PhiDerivedArtifactDescriptor;
  surfacingTargetTenantScope: PhiBoundaryTenantScope;
  surfacingContext: PhiBoundarySurfacingContext;
  surfacingDescriptorParseable: boolean;
}

export interface PhiBoundaryProbeCaseDefinition {
  probeCaseId: string;
  poisonCaseIds: string[];
  description: string;
  surfacingAttempt: PhiBoundarySurfacingAttemptDescriptor;
  /** Adversarial harness expects violation attempts to be caught. */
  expectBoundaryViolationDetected: true;
}

export interface PhiBoundaryProbeCase extends PhiBoundaryProbeCaseDefinition {
  phiBoundaryProbeCaseId: string;
  phiBoundaryProbeCaseKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  buildTrace: string[];
}

export interface EvaluatePhiBoundaryProbeInput {
  surfacingAttempt: PhiBoundarySurfacingAttemptDescriptor;
  hipaaIntegrationBinding: Phase42HipaaIntegrationBindingBuildResult;
  overlayActivationRegistry: OverlayActivationRegistry;
}

export interface EvaluatePhiBoundaryProbeCore {
  boundaryViolationDetected: boolean;
  violationKind: PhiBoundaryViolationKind | null;
  effectiveBoundaryClass: "phi_bounded" | "not_bounded";
  poisonCaseIds: string[];
  evaluationTrace: string[];
}

export interface PhiBoundaryProbeEvaluationResult extends EvaluatePhiBoundaryProbeCore {
  phiBoundaryProbeEvaluationResultId: string;
  phiBoundaryProbeEvaluationResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
}

export interface PhiBoundaryHarnessRunResult {
  phiBoundaryHarnessRunResultId: string;
  phiBoundaryHarnessRunResultKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  pass: boolean;
  probeCaseResults: PhiBoundaryProbeCaseRunResult[];
  evaluationTrace: string[];
}

export interface PhiBoundaryProbeCaseRunResult {
  probeCaseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  boundaryViolationDetected: boolean;
  violationKind: PhiBoundaryViolationKind | null;
  effectiveBoundaryClass: "phi_bounded" | "not_bounded";
  evaluationTrace: string[];
}

export interface D0PhiBoundaryEvidencePackageStructure {
  evidencePackageStructureId: string;
  evidencePackageStructureKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  evidenceSections: string[];
  probeCaseReferenceIds: string[];
  integrationBindingReferenceId: string;
  buildTrace: string[];
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function buildDeterministicId(prefix: string, parts: string[]): string {
  return `${prefix}:${parts.filter(Boolean).join(":")}`;
}

function isDerivedArtifactSurfaceKind(
  kind: PhiDerivedArtifactDescriptor["artifactSurfaceKind"],
): kind is PhiDerivedArtifactSurfaceKind {
  return (PHI_DERIVED_ARTIFACT_SURFACE_KINDS as readonly string[]).includes(kind);
}

export function tenantScopeToIsolationScope(scope: PhiBoundaryTenantScope): ControlSpineIsolationScope {
  return {
    customerTenantId: scope.customerTenantId,
    firmTenantId: scope.firmTenantId,
    clientTenantId: scope.clientTenantId,
    customerIsolation: scope.customerIsolation,
    firmIsolation: scope.firmIsolation,
    clientIsolation: scope.clientIsolation,
    isolationScopeReferenceId: scope.boundaryScopeReferenceId,
  };
}

export function tenantScopeToActivationScope(scope: PhiBoundaryTenantScope): OverlayTenantActivationScope {
  return {
    customerTenantId: scope.customerTenantId,
    firmTenantId: scope.firmTenantId,
    clientTenantId: scope.clientTenantId,
    customerIsolation: scope.customerIsolation,
    firmIsolation: scope.firmIsolation,
    clientIsolation: scope.clientIsolation,
    activationScopeReferenceId: scope.boundaryScopeReferenceId,
  };
}

/**
 * Fail-closed: ambiguous/unknown derivation => PHI-bounded (tainted).
 * Derivation does not launder: derived surface kinds and lineage refs keep the boundary.
 */
export function resolveEffectivePhiBoundaryClass(
  artifact: PhiDerivedArtifactDescriptor,
  evaluationTrace: string[],
): "phi_bounded" | "not_bounded" {
  evaluationTrace.push("resolveEffectivePhiBoundaryClass:start", "policy:derivation_does_not_launder");

  if (!artifact.lineageParseable) {
    evaluationTrace.push("lineage:unparseable=>fail_closed_phi_bounded");
    return "phi_bounded";
  }

  if (artifact.derivationLineageStatus === "ambiguous") {
    evaluationTrace.push("lineage:ambiguous=>fail_closed_phi_bounded");
    return "phi_bounded";
  }

  if (isDerivedArtifactSurfaceKind(artifact.artifactSurfaceKind)) {
    evaluationTrace.push(`artifact_surface:derived:${artifact.artifactSurfaceKind}=>phi_bounded`);
    return "phi_bounded";
  }

  if (
    artifact.derivationLineageStatus === "claimed_non_phi_laundered" &&
    artifact.sourcePhiLineageReferenceIds.length > 0
  ) {
    evaluationTrace.push("laundering_attempt:lineage_refs_present=>still_phi_bounded");
    return "phi_bounded";
  }

  if (artifact.derivationLineageStatus === "phi_derived") {
    evaluationTrace.push("lineage:phi_derived=>phi_bounded");
    return "phi_bounded";
  }

  if (artifact.phiDataClassKey && PHI_BOUNDARY_BEARING_DATA_CLASS_KEYS.has(artifact.phiDataClassKey)) {
    evaluationTrace.push(`phi_marker:present:${artifact.phiDataClassKey}=>phi_bounded`);
    return "phi_bounded";
  }

  evaluationTrace.push("boundary_class:not_bounded");
  return "not_bounded";
}

function tenantScopesDifferForCrossTenantLeak(
  source: PhiBoundaryTenantScope,
  target: PhiBoundaryTenantScope,
): boolean {
  return (
    source.customerTenantId !== target.customerTenantId ||
    source.firmTenantId !== target.firmTenantId ||
    source.clientTenantId !== target.clientTenantId
  );
}

function buildPhiDataClassMarkers(artifact: PhiDerivedArtifactDescriptor): PhiDataClassMarkerDescriptor[] {
  return [
    {
      phiDataClassReferenceId: artifact.phiDataClassReferenceId,
      phiDataClassKey: artifact.phiDataClassKey,
      markerParseable: artifact.lineageParseable,
    },
  ];
}

export function evaluatePhiBoundaryProbe(input: EvaluatePhiBoundaryProbeInput): PhiBoundaryProbeEvaluationResult {
  const evaluationTrace: string[] = [
    "evaluatePhiBoundaryProbe:start",
    "invariant:derived_artifacts_inherit_phi_boundary",
    "invariant:fail_closed_on_ambiguous_derivation",
  ];

  const attempt = input.surfacingAttempt;
  const artifact = attempt.artifact;

  if (!attempt.surfacingDescriptorParseable) {
    evaluationTrace.push("surfacing_descriptor:unparseable=>fail_closed_violation");
    return {
      phiBoundaryProbeEvaluationResultId: buildDeterministicId("phi-boundary-probe", [
        attempt.surfacingAttemptReferenceId,
        "unparseable",
      ]),
      phiBoundaryProbeEvaluationResultKey: "phi-boundary-probe:violation",
      containsVerticalComplianceLogic: false,
      executable: false,
      boundaryViolationDetected: true,
      violationKind: "ambiguous_derivation_boundary_crossing",
      effectiveBoundaryClass: "phi_bounded",
      poisonCaseIds: ["PC-20"],
      evaluationTrace,
    };
  }

  const effectiveBoundaryClass = resolveEffectivePhiBoundaryClass(artifact, evaluationTrace);

  if (effectiveBoundaryClass !== "phi_bounded") {
    evaluationTrace.push("boundary_holds:not_phi_bounded_artifact");
    return {
      phiBoundaryProbeEvaluationResultId: buildDeterministicId("phi-boundary-probe", [
        attempt.surfacingAttemptReferenceId,
        "not_bounded",
      ]),
      phiBoundaryProbeEvaluationResultKey: "phi-boundary-probe:no_violation",
      containsVerticalComplianceLogic: false,
      executable: false,
      boundaryViolationDetected: false,
      violationKind: null,
      effectiveBoundaryClass,
      poisonCaseIds: [],
      evaluationTrace,
    };
  }

  let violationKind: PhiBoundaryViolationKind | null = null;

  if (
    artifact.derivationLineageStatus === "claimed_non_phi_laundered" &&
    isDerivedArtifactSurfaceKind(artifact.artifactSurfaceKind)
  ) {
    violationKind = "derivation_laundering_attempt";
    evaluationTrace.push("violation:derivation_laundering_attempt");
  }

  if (tenantScopesDifferForCrossTenantLeak(artifact.sourceTenantScope, attempt.surfacingTargetTenantScope)) {
    evaluationTrace.push("compose:isolation_boundary_cross_tenant_check");
    const isolation = classifyIsolationReach({
      requesterPersonaKey: "firm_staff",
      requesterPersonaReferenceId: buildDeterministicId("persona", [
        artifact.sourceTenantScope.customerTenantId,
        "firm-staff",
      ]),
      requesterScope: tenantScopeToIsolationScope(artifact.sourceTenantScope),
      targetResourceReferenceId: artifact.artifactReferenceId,
      targetResourceVisibilityScope: "client_scoped",
      targetScope: tenantScopeToIsolationScope(attempt.surfacingTargetTenantScope),
    });
    evaluationTrace.push(
      ...isolation.evaluationTrace.map((line) => `isolation:${line}`),
      `isolation:outcome:${isolation.accessOutcome}`,
    );

    if (isolation.accessOutcome === "denied") {
      violationKind = violationKind ?? "cross_tenant_derived_learning_leak";
      evaluationTrace.push("violation:cross_tenant_derived_learning_leak");
    }
  }

  if (attempt.surfacingContext === "non_overlay") {
    evaluationTrace.push("compose:phi_ingestion_gate_overlay_escape_check");
    const ingestion = classifyPhiIngestionAttempt({
      ingestionAttempt: {
        ingestionAttemptReferenceId: buildDeterministicId("ingestion", [
          attempt.surfacingAttemptReferenceId,
          "overlay-escape",
        ]),
        targetTenantActivationScope: tenantScopeToActivationScope(attempt.surfacingTargetTenantScope),
        phiDataClassMarkers: buildPhiDataClassMarkers(artifact),
        ingestionDescriptorParseable: true,
      },
      overlayActivationRegistry: input.overlayActivationRegistry,
      hipaaOverlayRegistryKey: PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
    });
    evaluationTrace.push(
      ...ingestion.evaluationTrace.map((line) => `ingestion:${line}`),
      `ingestion:outcome:${ingestion.ingestionOutcome}`,
    );

    if (ingestion.ingestionOutcome === "refused") {
      violationKind = violationKind ?? "overlay_escape_derived_learning";
      evaluationTrace.push("violation:overlay_escape_derived_learning");
    }
  }

  if (
    artifact.derivationLineageStatus === "ambiguous" &&
    tenantScopesDifferForCrossTenantLeak(artifact.sourceTenantScope, attempt.surfacingTargetTenantScope)
  ) {
    violationKind = "ambiguous_derivation_boundary_crossing";
    evaluationTrace.push("violation:ambiguous_derivation_boundary_crossing");
  }

  if (
    artifact.derivationLineageStatus === "ambiguous" &&
    attempt.surfacingContext === "non_overlay"
  ) {
    violationKind = "ambiguous_derivation_boundary_crossing";
    evaluationTrace.push("violation:ambiguous_derivation_non_overlay_fail_closed");
  }

  evaluationTrace.push("compose:hipaa_integration_binding_overlay_routing_check");
  const overlayRoutingHolds = detectPc03PhiAuditRoutesOverlayOnly(input.hipaaIntegrationBinding);
  evaluationTrace.push(`integration:pc03_overlay_only_routing:${overlayRoutingHolds}`);

  if (!overlayRoutingHolds && effectiveBoundaryClass === "phi_bounded") {
    violationKind = violationKind ?? "overlay_escape_derived_learning";
    evaluationTrace.push("violation:integration_routing_would_permit_overlay_escape");
  }

  const boundaryViolationDetected = violationKind !== null;
  const poisonCaseIds = boundaryViolationDetected ? ["PC-20"] : [];

  if (boundaryViolationDetected) {
    evaluationTrace.push(`violation_kind:${violationKind}`, "boundary:violation_detected");
  } else {
    evaluationTrace.push("boundary:holds_no_violation_detected");
  }

  return {
    phiBoundaryProbeEvaluationResultId: buildDeterministicId("phi-boundary-probe", [
      attempt.surfacingAttemptReferenceId,
      boundaryViolationDetected ? "violation" : "holds",
      violationKind ?? "none",
    ]),
    phiBoundaryProbeEvaluationResultKey: boundaryViolationDetected
      ? "phi-boundary-probe:violation"
      : "phi-boundary-probe:no_violation",
    containsVerticalComplianceLogic: false,
    executable: false,
    boundaryViolationDetected,
    violationKind,
    effectiveBoundaryClass,
    poisonCaseIds,
    evaluationTrace,
  };
}

export function buildPhiBoundaryProbeCase(
  definition: PhiBoundaryProbeCaseDefinition,
): PhiBoundaryProbeCase {
  const buildTrace = [
    "buildPhiBoundaryProbeCase:start",
    `probe_case:${definition.probeCaseId}`,
    `artifact:${definition.surfacingAttempt.artifact.artifactReferenceId}`,
    `artifact_surface:${definition.surfacingAttempt.artifact.artifactSurfaceKind}`,
    `derivation_lineage:${definition.surfacingAttempt.artifact.derivationLineageStatus}`,
    `surfacing_context:${definition.surfacingAttempt.surfacingContext}`,
    "markers_only:no_actual_phi_values",
  ];

  return {
    ...definition,
    phiBoundaryProbeCaseId: buildDeterministicId("phi-boundary-probe-case", [definition.probeCaseId]),
    phiBoundaryProbeCaseKey: `phi-boundary-probe:${definition.probeCaseId}`,
    containsVerticalComplianceLogic: false,
    executable: false,
    buildTrace,
  };
}

export function runPhiBoundaryHarness(input: {
  probeCases: PhiBoundaryProbeCase[];
  hipaaIntegrationBinding: Phase42HipaaIntegrationBindingBuildResult;
  overlayActivationRegistry?: OverlayActivationRegistry;
}): PhiBoundaryHarnessRunResult {
  const evaluationTrace: string[] = ["runPhiBoundaryHarness:start", "mode:adversarial_violation_detection"];
  const overlayActivationRegistry =
    input.overlayActivationRegistry ?? createOverlayActivationRegistry("registry:phi-boundary-harness-empty");

  const probeCaseResults: PhiBoundaryProbeCaseRunResult[] = input.probeCases.map((probeCase) => {
    const evaluation = evaluatePhiBoundaryProbe({
      surfacingAttempt: probeCase.surfacingAttempt,
      hipaaIntegrationBinding: input.hipaaIntegrationBinding,
      overlayActivationRegistry,
    });

    const passed =
      probeCase.expectBoundaryViolationDetected === true && evaluation.boundaryViolationDetected === true;

    evaluationTrace.push(
      `probe_case:${probeCase.probeCaseId}:passed:${passed}`,
      `probe_case:${probeCase.probeCaseId}:violation:${evaluation.violationKind ?? "none"}`,
    );

    return {
      probeCaseId: probeCase.probeCaseId,
      poisonCaseIds: probeCase.poisonCaseIds,
      description: probeCase.description,
      passed,
      boundaryViolationDetected: evaluation.boundaryViolationDetected,
      violationKind: evaluation.violationKind,
      effectiveBoundaryClass: evaluation.effectiveBoundaryClass,
      evaluationTrace: evaluation.evaluationTrace,
    };
  });

  const pass = probeCaseResults.every((result) => result.passed);

  return {
    phiBoundaryHarnessRunResultId: buildDeterministicId("phi-boundary-harness-run", [
      pass ? "pass" : "fail",
      String(probeCaseResults.length),
    ]),
    phiBoundaryHarnessRunResultKey: pass ? "phi-boundary-harness:pass" : "phi-boundary-harness:fail",
    containsVerticalComplianceLogic: false,
    executable: false,
    pass,
    probeCaseResults,
    evaluationTrace,
  };
}

export function buildD0PhiBoundaryEvidencePackageStructure(input: {
  probeCases: PhiBoundaryProbeCase[];
  hipaaIntegrationBinding: Phase42HipaaIntegrationBindingBuildResult;
}): D0PhiBoundaryEvidencePackageStructure {
  return {
    evidencePackageStructureId: buildDeterministicId("d0-phi-boundary-evidence", [
      input.hipaaIntegrationBinding.phase42HipaaIntegrationBindingBuildResultId,
    ]),
    evidencePackageStructureKey: "d0-phi-boundary-evidence:structure",
    containsVerticalComplianceLogic: false,
    executable: false,
    evidenceSections: [
      "phi_boundary_probe_matrix",
      "phi_derived_learning_bright_line_pc20",
      "overlay_routing_composition_42.5L",
      "ingestion_gate_composition_42.5M",
      "isolation_composition_42.5B",
    ],
    probeCaseReferenceIds: input.probeCases.map((probeCase) => probeCase.phiBoundaryProbeCaseId),
    integrationBindingReferenceId: input.hipaaIntegrationBinding.phase42HipaaIntegrationBindingBuildResultId,
    buildTrace: [
      "d0_evidence_package:structure_only",
      "no_live_phi:no_model_training",
      `probe_case_count:${input.probeCases.length}`,
    ],
  };
}

/** 42.5O probe export — PC-20 PHI-derived-learning bright-line violation detector. */
export function detectPc20PhiDerivedLearningBoundaryViolation(
  input: EvaluatePhiBoundaryProbeInput,
): boolean {
  const result = evaluatePhiBoundaryProbe(input);
  return result.boundaryViolationDetected && result.poisonCaseIds.includes("PC-20");
}

/** 42.5O probe export — any PHI-boundary probe violation. */
export function detectPhiBoundaryViolation(input: EvaluatePhiBoundaryProbeInput): boolean {
  return evaluatePhiBoundaryProbe(input).boundaryViolationDetected;
}
