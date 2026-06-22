import type { ControlSpineIsolationDimension } from "../../contracts";
import { buildPhase42HipaaIntegrationBinding } from "../../../compliance/overlays/hipaa/integration";
import { createOverlayActivationRegistry } from "../../../compliance/overlay-attachment";
import {
  buildD0PhiBoundaryEvidencePackageStructure,
  buildPhiBoundaryProbeCase,
  detectPc20PhiDerivedLearningBoundaryViolation,
  detectPhiBoundaryViolation,
  runPhiBoundaryHarness,
  type PhiBoundaryProbeCase,
  type PhiBoundaryTenantScope,
  type PhiDerivedArtifactDescriptor,
} from "./runPhiBoundaryHarness";

export interface PhiBoundaryStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
}

export interface PhiBoundaryStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  boundaryViolationDetected: boolean;
  violationKind: string | null;
  evaluationTrace: string[];
  details: Record<string, unknown>;
}

const STATIC_BOUNDARY_TIMESTAMP = "2026-06-18T18:00:00.000Z";

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

function buildTenantScope(input: {
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  boundaryScopeReferenceId: string;
}): PhiBoundaryTenantScope {
  return {
    customerTenantId: input.customerTenantId,
    firmTenantId: input.firmTenantId,
    clientTenantId: input.clientTenantId,
    boundaryScopeReferenceId: input.boundaryScopeReferenceId,
    customerIsolation: dimension(input.customerTenantId, `customer:${input.boundaryScopeReferenceId}`),
    firmIsolation: dimension(input.firmTenantId, `firm:${input.boundaryScopeReferenceId}`),
    clientIsolation: dimension(input.clientTenantId, `client:${input.boundaryScopeReferenceId}`),
  };
}

function buildDerivedArtifact(input: {
  artifactReferenceId: string;
  artifactSurfaceKind: PhiDerivedArtifactDescriptor["artifactSurfaceKind"];
  sourceScope: PhiBoundaryTenantScope;
  derivationLineageStatus: PhiDerivedArtifactDescriptor["derivationLineageStatus"];
  phiDataClassKey?: PhiDerivedArtifactDescriptor["phiDataClassKey"];
  lineageParseable?: boolean;
  sourcePhiLineageReferenceIds?: string[];
}): PhiDerivedArtifactDescriptor {
  return {
    artifactReferenceId: input.artifactReferenceId,
    artifactSurfaceKind: input.artifactSurfaceKind,
    phiDataClassKey: input.phiDataClassKey ?? "phi_derived_learning_boundary",
    phiDataClassReferenceId: `marker-ref:derived-artifact:${input.artifactReferenceId}`,
    derivationLineageStatus: input.derivationLineageStatus,
    lineageParseable: input.lineageParseable ?? true,
    sourcePhiLineageReferenceIds:
      input.sourcePhiLineageReferenceIds ?? [`lineage-ref:phi-source:${input.sourceScope.customerTenantId}`],
    sourceTenantScope: input.sourceScope,
  };
}

function buildHipaaIntegrationBinding() {
  const customerIsolation = dimension("tenant-healthcare-boundary", "customer:phi-boundary");
  const firmIsolation = dimension("firm-healthcare-boundary", "firm:phi-boundary");
  const clientIsolation = dimension("client-healthcare-boundary", "client:phi-boundary");

  return buildPhase42HipaaIntegrationBinding({
    boundPhase42SnapshotHash: "phase42-snapshot:b11adcd",
    sensitivityTaggingConsumptionReferenceId: "phase42h:sensitivity-tagging-consumption",
    customerIsolation,
    firmIsolation,
    clientIsolation,
  });
}

function buildStandardProbeCases(): PhiBoundaryProbeCase[] {
  const tenantAScope = buildTenantScope({
    customerTenantId: "tenant-a-derived-source",
    firmTenantId: "firm-a-derived",
    clientTenantId: "client-a-derived",
    boundaryScopeReferenceId: "scope:tenant-a-derived",
  });
  const tenantBScope = buildTenantScope({
    customerTenantId: "tenant-b-derived-target",
    firmTenantId: "firm-b-derived",
    clientTenantId: "client-b-derived",
    boundaryScopeReferenceId: "scope:tenant-b-derived",
  });
  const nonOverlayScope = buildTenantScope({
    customerTenantId: "tenant-non-overlay",
    firmTenantId: "firm-non-overlay",
    clientTenantId: "client-non-overlay",
    boundaryScopeReferenceId: "scope:tenant-non-overlay",
  });

  const overlayEscapeScope = buildTenantScope({
    customerTenantId: "tenant-overlay-escape",
    firmTenantId: "firm-overlay-escape",
    clientTenantId: "client-overlay-escape",
    boundaryScopeReferenceId: "scope:tenant-overlay-escape",
  });

  return [
    buildPhiBoundaryProbeCase({
      probeCaseId: "PROBE-PC20-CROSS-TENANT-DERIVED",
      poisonCaseIds: ["PC-20"],
      description: "Cross-tenant derived-learning: PHI-derived aggregate from Tenant A surfacing for Tenant B",
      expectBoundaryViolationDetected: true,
      surfacingAttempt: {
        surfacingAttemptReferenceId: "surfacing:cross-tenant-derived-learning",
        artifact: buildDerivedArtifact({
          artifactReferenceId: "artifact:derived-aggregate-tenant-a",
          artifactSurfaceKind: "phi_derived_aggregate",
          sourceScope: tenantAScope,
          derivationLineageStatus: "phi_derived",
        }),
        surfacingTargetTenantScope: tenantBScope,
        surfacingContext: "hipaa_overlay_active",
        surfacingDescriptorParseable: true,
      },
    }),
    buildPhiBoundaryProbeCase({
      probeCaseId: "PROBE-PC20-OVERLAY-ESCAPE",
      poisonCaseIds: ["PC-20"],
      description: "Overlay-escape: PHI-derived embedding to non-overlay context",
      expectBoundaryViolationDetected: true,
      surfacingAttempt: {
        surfacingAttemptReferenceId: "surfacing:overlay-escape-derived-embedding",
        artifact: buildDerivedArtifact({
          artifactReferenceId: "artifact:derived-embedding-overlay-escape",
          artifactSurfaceKind: "phi_derived_embedding",
          sourceScope: overlayEscapeScope,
          derivationLineageStatus: "phi_derived",
        }),
        surfacingTargetTenantScope: overlayEscapeScope,
        surfacingContext: "non_overlay",
        surfacingDescriptorParseable: true,
      },
    }),
    buildPhiBoundaryProbeCase({
      probeCaseId: "PROBE-PC20-DERIVATION-LAUNDERING",
      poisonCaseIds: ["PC-20"],
      description:
        "Derivation-does-not-launder: derived feature explicitly not raw PHI, claimed non-PHI, still caught",
      expectBoundaryViolationDetected: true,
      surfacingAttempt: {
        surfacingAttemptReferenceId: "surfacing:derivation-laundering-attempt",
        artifact: {
          artifactReferenceId: "artifact:derived-feature-laundering",
          artifactSurfaceKind: "phi_derived_feature",
          phiDataClassKey: null,
          phiDataClassReferenceId: "marker-ref:claimed-non-phi-derived-feature",
          derivationLineageStatus: "claimed_non_phi_laundered",
          lineageParseable: true,
          sourcePhiLineageReferenceIds: ["lineage-ref:phi-training-batch:opaque-001"],
          sourceTenantScope: tenantAScope,
        },
        surfacingTargetTenantScope: nonOverlayScope,
        surfacingContext: "non_overlay",
        surfacingDescriptorParseable: true,
      },
    }),
    buildPhiBoundaryProbeCase({
      probeCaseId: "PROBE-PC20-FAIL-CLOSED-AMBIGUOUS",
      poisonCaseIds: ["PC-20"],
      description: "Fail-closed: ambiguous derivation status crossing boundary => treated as PHI-derived",
      expectBoundaryViolationDetected: true,
      surfacingAttempt: {
        surfacingAttemptReferenceId: "surfacing:ambiguous-derivation-cross-tenant",
        artifact: {
          artifactReferenceId: "artifact:ambiguous-derivation-summary",
          artifactSurfaceKind: "phi_derived_summary",
          phiDataClassKey: null,
          phiDataClassReferenceId: "marker-ref:ambiguous-derivation-summary",
          derivationLineageStatus: "ambiguous",
          lineageParseable: true,
          sourcePhiLineageReferenceIds: [],
          sourceTenantScope: tenantAScope,
        },
        surfacingTargetTenantScope: tenantBScope,
        surfacingContext: "non_overlay",
        surfacingDescriptorParseable: true,
      },
    }),
  ];
}

export const PHI_BOUNDARY_STATIC_CONSTRUCTION_CASES: PhiBoundaryStaticConstructionCase[] = [
  {
    caseId: "SC-01-CROSS-TENANT-DERIVED-LEARNING",
    poisonCaseIds: ["PC-20"],
    description: "Cross-tenant derived-learning leak => VIOLATION caught",
  },
  {
    caseId: "SC-02-OVERLAY-ESCAPE-DERIVED-LEARNING",
    poisonCaseIds: ["PC-20"],
    description: "PHI-derived learning to non-overlay context => VIOLATION caught",
  },
  {
    caseId: "SC-03-DERIVATION-DOES-NOT-LAUNDER",
    poisonCaseIds: ["PC-20"],
    description: "DERIVED artifact treated as no longer PHI => VIOLATION caught (core PC-20)",
  },
  {
    caseId: "SC-04-FAIL-CLOSED-AMBIGUOUS-DERIVATION",
    poisonCaseIds: ["PC-20"],
    description: "Ambiguous derivation status => PHI-derived/bounded => violation if crosses",
  },
  {
    caseId: "SC-05-MARKERS-ONLY",
    poisonCaseIds: [],
    description: "No actual PHI in artifacts (markers/refs only)",
  },
  {
    caseId: "SC-06-HARNESS-EXPORTS-FOR-42.5O",
    poisonCaseIds: ["PC-20"],
    description: "Harness exports run cleanly for 42.5O consumption",
  },
];

function runCase(caseDefinition: PhiBoundaryStaticConstructionCase): {
  passed: boolean;
  boundaryViolationDetected: boolean;
  violationKind: string | null;
  evaluationTrace: string[];
  details: Record<string, unknown>;
} {
  const hipaaIntegrationBinding = buildHipaaIntegrationBinding();
  const probeCases = buildStandardProbeCases();

  switch (caseDefinition.caseId) {
    case "SC-01-CROSS-TENANT-DERIVED-LEARNING": {
      const probeCase = probeCases.find((item) => item.probeCaseId === "PROBE-PC20-CROSS-TENANT-DERIVED");
      if (!probeCase) {
        throw new Error("Missing probe case PROBE-PC20-CROSS-TENANT-DERIVED");
      }

      const harness = runPhiBoundaryHarness({
        probeCases: [probeCase],
        hipaaIntegrationBinding,
      });
      const result = harness.probeCaseResults[0];

      return {
        passed:
          result.passed &&
          result.boundaryViolationDetected &&
          result.violationKind === "cross_tenant_derived_learning_leak" &&
          probeCase.surfacingAttempt.artifact.artifactSurfaceKind === "phi_derived_aggregate",
        boundaryViolationDetected: result.boundaryViolationDetected,
        violationKind: result.violationKind,
        evaluationTrace: result.evaluationTrace,
        details: {
          artifactSurfaceKind: probeCase.surfacingAttempt.artifact.artifactSurfaceKind,
          harnessPass: harness.pass,
        },
      };
    }

    case "SC-02-OVERLAY-ESCAPE-DERIVED-LEARNING": {
      const probeCase = probeCases.find((item) => item.probeCaseId === "PROBE-PC20-OVERLAY-ESCAPE");
      if (!probeCase) {
        throw new Error("Missing probe case PROBE-PC20-OVERLAY-ESCAPE");
      }

      const harness = runPhiBoundaryHarness({
        probeCases: [probeCase],
        hipaaIntegrationBinding,
      });
      const result = harness.probeCaseResults[0];

      return {
        passed:
          result.passed &&
          result.boundaryViolationDetected &&
          result.violationKind === "overlay_escape_derived_learning" &&
          probeCase.surfacingAttempt.artifact.artifactSurfaceKind === "phi_derived_embedding",
        boundaryViolationDetected: result.boundaryViolationDetected,
        violationKind: result.violationKind,
        evaluationTrace: result.evaluationTrace,
        details: {
          surfacingContext: probeCase.surfacingAttempt.surfacingContext,
        },
      };
    }

    case "SC-03-DERIVATION-DOES-NOT-LAUNDER": {
      const probeCase = probeCases.find((item) => item.probeCaseId === "PROBE-PC20-DERIVATION-LAUNDERING");
      if (!probeCase) {
        throw new Error("Missing probe case PROBE-PC20-DERIVATION-LAUNDERING");
      }

      const artifact = probeCase.surfacingAttempt.artifact;
      const harness = runPhiBoundaryHarness({
        probeCases: [probeCase],
        hipaaIntegrationBinding,
      });
      const result = harness.probeCaseResults[0];

      return {
        passed:
          result.passed &&
          result.boundaryViolationDetected &&
          result.violationKind === "derivation_laundering_attempt" &&
          artifact.artifactSurfaceKind === "phi_derived_feature" &&
          artifact.derivationLineageStatus === "claimed_non_phi_laundered" &&
          artifact.phiDataClassKey === null &&
          result.effectiveBoundaryClass === "phi_bounded",
        boundaryViolationDetected: result.boundaryViolationDetected,
        violationKind: result.violationKind,
        evaluationTrace: result.evaluationTrace,
        details: {
          artifactSurfaceKind: artifact.artifactSurfaceKind,
          derivationLineageStatus: artifact.derivationLineageStatus,
          effectiveBoundaryClass: result.effectiveBoundaryClass,
        },
      };
    }

    case "SC-04-FAIL-CLOSED-AMBIGUOUS-DERIVATION": {
      const probeCase = probeCases.find((item) => item.probeCaseId === "PROBE-PC20-FAIL-CLOSED-AMBIGUOUS");
      if (!probeCase) {
        throw new Error("Missing probe case PROBE-PC20-FAIL-CLOSED-AMBIGUOUS");
      }

      const harness = runPhiBoundaryHarness({
        probeCases: [probeCase],
        hipaaIntegrationBinding,
      });
      const result = harness.probeCaseResults[0];

      return {
        passed:
          result.passed &&
          result.boundaryViolationDetected &&
          result.violationKind === "ambiguous_derivation_boundary_crossing" &&
          result.effectiveBoundaryClass === "phi_bounded" &&
          probeCase.surfacingAttempt.artifact.derivationLineageStatus === "ambiguous",
        boundaryViolationDetected: result.boundaryViolationDetected,
        violationKind: result.violationKind,
        evaluationTrace: result.evaluationTrace,
        details: {
          effectiveBoundaryClass: result.effectiveBoundaryClass,
          derivationLineageStatus: probeCase.surfacingAttempt.artifact.derivationLineageStatus,
        },
      };
    }

    case "SC-05-MARKERS-ONLY": {
      const harness = runPhiBoundaryHarness({
        probeCases: buildStandardProbeCases(),
        hipaaIntegrationBinding,
      });
      const evidence = buildD0PhiBoundaryEvidencePackageStructure({
        probeCases: buildStandardProbeCases(),
        hipaaIntegrationBinding,
      });

      const serialized = JSON.stringify({ harness, evidence, probeCases: buildStandardProbeCases() });
      const forbiddenPhiValuePatterns = [
        /\b\d{3}-\d{2}-\d{4}\b/,
        /\bpatient@/i,
        /\bJohn\s+Doe\b/i,
        /\bSSN\b/i,
        /\bMRN\b/i,
        /\bembedding vector\b/i,
      ];
      const containsForbiddenPhiValues = forbiddenPhiValuePatterns.some((pattern) => pattern.test(serialized));
      const usesMarkerRefsOnly =
        serialized.includes("marker-ref:") &&
        serialized.includes("lineage-ref:") &&
        serialized.includes("artifact:derived");

      return {
        passed:
          harness.containsVerticalComplianceLogic === false &&
          harness.executable === false &&
          evidence.containsVerticalComplianceLogic === false &&
          evidence.executable === false &&
          !containsForbiddenPhiValues &&
          usesMarkerRefsOnly,
        boundaryViolationDetected: harness.pass,
        violationKind: null,
        evaluationTrace: harness.evaluationTrace,
        details: {
          containsForbiddenPhiValues,
          usesMarkerRefsOnly,
          harnessExecutable: harness.executable,
        },
      };
    }

    case "SC-06-HARNESS-EXPORTS-FOR-42.5O": {
      const probeCase = probeCases.find((item) => item.probeCaseId === "PROBE-PC20-CROSS-TENANT-DERIVED");
      if (!probeCase) {
        throw new Error("Missing probe case for 42.5O export smoke");
      }

      const evaluateInput = {
        surfacingAttempt: probeCase.surfacingAttempt,
        hipaaIntegrationBinding,
        overlayActivationRegistry: createOverlayActivationRegistry("registry:phi-boundary-export-smoke"),
      };

      const pc20Detector = detectPc20PhiDerivedLearningBoundaryViolation(evaluateInput);
      const boundaryDetector = detectPhiBoundaryViolation(evaluateInput);
      const harness = runPhiBoundaryHarness({
        probeCases: buildStandardProbeCases(),
        hipaaIntegrationBinding,
      });

      return {
        passed:
          pc20Detector === true &&
          boundaryDetector === true &&
          harness.pass === true &&
          harness.containsVerticalComplianceLogic === false &&
          harness.executable === false &&
          typeof detectPc20PhiDerivedLearningBoundaryViolation === "function" &&
          typeof detectPhiBoundaryViolation === "function" &&
          typeof runPhiBoundaryHarness === "function",
        boundaryViolationDetected: pc20Detector,
        violationKind: "cross_tenant_derived_learning_leak",
        evaluationTrace: [
          "harness_export:detectPc20PhiDerivedLearningBoundaryViolation",
          `pc20_detector:${pc20Detector}`,
          `boundary_detector:${boundaryDetector}`,
          `harness_pass:${harness.pass}`,
        ],
        details: {
          pc20Detector,
          boundaryDetector,
          harnessPass: harness.pass,
          staticTimestamp: STATIC_BOUNDARY_TIMESTAMP,
        },
      };
    }

    default:
      throw new Error(`Unknown static construction case: ${caseDefinition.caseId}`);
  }
}

export function executePhiBoundaryStaticConstructionTests(): {
  pass: boolean;
  results: PhiBoundaryStaticConstructionCaseResult[];
} {
  const results: PhiBoundaryStaticConstructionCaseResult[] = PHI_BOUNDARY_STATIC_CONSTRUCTION_CASES.map(
    (caseDefinition) => {
      const outcome = runCase(caseDefinition);

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed: outcome.passed,
        boundaryViolationDetected: outcome.boundaryViolationDetected,
        violationKind: outcome.violationKind,
        evaluationTrace: outcome.evaluationTrace,
        details: outcome.details,
      };
    },
  );

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

export function executePhiBoundaryHarnessArtifactSmokeTest(): boolean {
  const hipaaIntegrationBinding = buildHipaaIntegrationBinding();
  const probeCases = buildStandardProbeCases();
  const harness = runPhiBoundaryHarness({ probeCases, hipaaIntegrationBinding });
  const evidence = buildD0PhiBoundaryEvidencePackageStructure({ probeCases, hipaaIntegrationBinding });

  return (
    harness.pass &&
    harness.containsVerticalComplianceLogic === false &&
    harness.executable === false &&
    evidence.containsVerticalComplianceLogic === false &&
    evidence.executable === false &&
    harness.probeCaseResults.length === 4
  );
}
