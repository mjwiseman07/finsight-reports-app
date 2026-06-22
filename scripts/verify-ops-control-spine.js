/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5O — Control-Spine Verifier
 * LOCK mode for probe: PHASE_42_5_LOCK_MODE=true node scripts/probe-ops-control-spine.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const opsRoot = path.join(root, "ops");
const mandatoryPoisonCases = require("./MANDATORY_POISON_CASES.json");
const fixtures = require("./probe-fixtures/phi-tagged-fixtures.js");

const WAVE1_MODULES = [
  { id: "42.5A", dir: "control-spine/contracts", barrel: "index.ts" },
  { id: "42.5B", dir: "control-spine/isolation", barrel: "index.ts" },
  { id: "42.5C", dir: "control-spine/rbac", barrel: "index.ts" },
  { id: "42.5D", dir: "control-spine/audit", barrel: "index.ts" },
  { id: "42.5E", dir: "control-spine/encryption", barrel: "index.ts" },
  { id: "42.5F", dir: "control-spine/auth", barrel: "index.ts" },
  { id: "42.5G", dir: "control-spine/tenant-attributes", barrel: "index.ts" },
];

const WAVE2_MODULES = [
  { id: "42.5H", dir: "compliance/overlay-discipline", barrel: "index.ts" },
  { id: "42.5I", dir: "compliance/overlay-attachment", barrel: "index.ts" },
  { id: "42.5J", dir: "compliance/overlays/hipaa/contracts", barrel: "index.ts" },
  { id: "42.5K", dir: "compliance/overlays/hipaa/safeguards", barrel: "index.ts" },
  { id: "42.5L", dir: "compliance/overlays/hipaa/integration", barrel: "index.ts" },
];

const WAVE3_MODULES = [
  { id: "42.5M", dir: "control-spine/phi-ingestion-gate", barrel: "index.ts" },
  { id: "42.5N", dir: "control-spine/verification/phi-boundary", barrel: "index.ts" },
  { id: "42.5P", dir: "control-spine/verification/panel-data-paths", barrel: "index.ts" },
];

const SPINE_SCAN_DIRS = [
  "control-spine/contracts",
  "control-spine/isolation",
  "control-spine/rbac",
  "control-spine/audit",
  "control-spine/encryption",
  "control-spine/auth",
  "control-spine/tenant-attributes",
  "control-spine/phi-ingestion-gate",
  "control-spine/verification/phi-boundary",
  "control-spine/verification/panel-data-paths",
];

const HIPAA_OVERLAY_DIRS = [
  "compliance/overlays/hipaa/contracts",
  "compliance/overlays/hipaa/safeguards",
  "compliance/overlays/hipaa/integration",
];

let typeScriptLoaderRegistered = false;
let cachedModules = null;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function listFiles(directory, predicate = () => true) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(relative, predicate);
    return predicate(relative) ? [relative] : [];
  });
}

function ensureTypeScriptLoader() {
  if (typeScriptLoaderRegistered) return;
  require.extensions[".ts"] = function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
  typeScriptLoaderRegistered = true;
}

function loadOpsModule(relativePathFromOps) {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, relativePathFromOps));
}

function loadSpineModules() {
  if (cachedModules) return cachedModules;
  cachedModules = {
    isolation: loadOpsModule("control-spine/isolation/index.ts"),
    rbac: loadOpsModule("control-spine/rbac/index.ts"),
    audit: loadOpsModule("control-spine/audit/index.ts"),
    encryption: loadOpsModule("control-spine/encryption/index.ts"),
    auth: loadOpsModule("control-spine/auth/index.ts"),
    phiIngestionGate: loadOpsModule("control-spine/phi-ingestion-gate/index.ts"),
    phiBoundary: loadOpsModule("control-spine/verification/phi-boundary/index.ts"),
    panelDataPaths: loadOpsModule("control-spine/verification/panel-data-paths/index.ts"),
    overlayAttachment: loadOpsModule("compliance/overlay-attachment/index.ts"),
    socScopeBoundary: loadOpsModule("compliance/soc/soc1/index.ts"),
    tscScopeBoundary: loadOpsModule("compliance/soc/soc2/index.ts"),
    retention: loadOpsModule("compliance/retention/index.ts"),
    vendors: loadOpsModule("compliance/vendors/index.ts"),
    hipaaPack: loadOpsModule("compliance/overlays/hipaa/pack/index.ts"),
    hipaaPackStaticTests: loadOpsModule("compliance/overlays/hipaa/pack/hipaaPackScopeBoundary.staticTests.ts"),
    nprmRegister: loadOpsModule("compliance/overlays/hipaa/nprm/index.ts"),
    nprmRegisterStaticTests: loadOpsModule("compliance/overlays/hipaa/nprm/nprmGapRegister.staticTests.ts"),
    trustPackage: loadOpsModule("compliance/trust-package/index.ts"),
    trustPackageStaticTests: loadOpsModule("compliance/trust-package/trustPackagePublishGate.staticTests.ts"),
    overlayDiscipline: loadOpsModule("compliance/overlay-discipline/index.ts"),
    hipaaIntegration: loadOpsModule("compliance/overlays/hipaa/integration/index.ts"),
    hipaaSafeguards: loadOpsModule("compliance/overlays/hipaa/safeguards/index.ts"),
    hipaaContracts: loadOpsModule("compliance/overlays/hipaa/contracts/index.ts"),
    tenantAttributes: loadOpsModule("control-spine/tenant-attributes/index.ts"),
  };
  return cachedModules;
}

function buildIntegrationBinding(modules) {
  const dim = (tenantScopeKey, suffix) => ({
    isolationDimensionReferenceId: `dim-ref:${suffix}`,
    tenantScopeKey,
    boundaryReferenceIds: [`boundary:${suffix}`],
  });
  return modules.hipaaIntegration.buildPhase42HipaaIntegrationBinding({
    boundPhase42SnapshotHash: "phase42-snapshot:b11adcd",
    sensitivityTaggingConsumptionReferenceId: "phase42h:sensitivity-tagging-consumption",
    customerIsolation: dim("tenant-probe", "customer:probe"),
    firmIsolation: dim("firm-probe", "firm:probe"),
    clientIsolation: dim("client-probe", "client:probe"),
  });
}

function buildPhiIngestionInput(modules, input) {
  const registry =
    input.overlayActivationRegistry ??
    modules.overlayAttachment.createOverlayActivationRegistry("registry:probe-empty");
  return {
    actorReferenceId: "actor:probe",
    retentionConfigurationReferenceId: "retention:spine-default",
    evaluationTimestampIso: "2026-06-18T20:00:00.000Z",
    ingestionAttempt: input.ingestionAttempt,
    overlayActivationRegistry: registry,
    hipaaOverlayRegistryKey: modules.phiIngestionGate.PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
  };
}

function createProbeHelpers() {
  const modules = loadSpineModules();
  const integrationBinding = buildIntegrationBinding(modules);
  const emptyRegistry = modules.overlayAttachment.createOverlayActivationRegistry("registry:probe-empty");

  const isolationEvaluator = {
    evaluate(scenario) {
      const requesterScope = fixtures.buildIsolationScope(scenario.requester ?? fixtures.TENANT_A);
      const targetScope = fixtures.buildIsolationScope(scenario.target ?? fixtures.TENANT_B);
      const result = modules.isolation.classifyIsolationReach({
        requesterPersonaKey: scenario.personaKey ?? "firm_staff",
        requesterPersonaReferenceId: scenario.personaReferenceId ?? "persona:probe-requester",
        requesterScope,
        targetResourceReferenceId: scenario.targetResourceReferenceId ?? "resource:probe-target",
        targetResourceVisibilityScope: scenario.visibilityScope ?? "client_scoped",
        targetScope,
      });
      return {
        outcome: result.accessOutcome,
        denyReason: result.denyReason,
        denied: result.accessOutcome === "denied",
      };
    },
  };

  const rbacEvaluator = {
    evaluate(scenario) {
      const personaKey = scenario.personaKey ?? "firm_staff";
      const result = modules.rbac.classifyPersonaPermission({
        personaKey,
        personaReferenceId: scenario.personaReferenceId ?? `persona:${personaKey}-probe`,
        rbacMatrix: {
          rbacMatrixContractId: "rbac-matrix:probe",
          rbacMatrixContractKey: "rbac-matrix:probe",
          containsVerticalComplianceLogic: false,
          executable: false,
          customerIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).customerIsolation,
          firmIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).firmIsolation,
          clientIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).clientIsolation,
          matrixEntries: [
            {
              personaKey: "firm_admin",
              personaReferenceId: "persona:firm-admin-probe",
              denyByDefault: true,
              permissionGrants: [
                {
                  permissionGrantReferenceId: "grant:firm-admin",
                  authorizedSurfaceReferenceId: "surface:firm-admin-settings",
                  grantScopeReferenceId: "scope:write:firm_config",
                },
              ],
            },
            {
              personaKey: "firm_staff",
              personaReferenceId: "persona:firm-staff-probe",
              denyByDefault: true,
              permissionGrants: [
                {
                  permissionGrantReferenceId: "grant:client-read",
                  authorizedSurfaceReferenceId: "surface:client-ledger",
                  grantScopeReferenceId: "scope:read:assigned_clients",
                },
              ],
            },
          ],
        },
        requestedAction: {
          actionReferenceId: scenario.actionReferenceId ?? "action:probe",
          requestedGrantScopeReferenceId:
            scenario.requestedGrantScopeReferenceId ?? "scope:write:firm_config",
        },
        targetResource: {
          resourceReferenceId: scenario.resourceReferenceId ?? "resource:firm-admin-settings",
          authorizedSurfaceReferenceId:
            scenario.authorizedSurfaceReferenceId ?? "surface:firm-admin-settings",
          requiredGrantScopeReferenceId:
            scenario.requiredGrantScopeReferenceId ?? "scope:write:firm_config",
        },
      });
      return {
        outcome: result.accessOutcome,
        denyReason: result.denyReason,
        denied: result.accessOutcome === "denied",
      };
    },
  };

  const phiIngestionGate = {
    evaluate(input) {
      const evaluationInput = buildPhiIngestionInput(modules, {
        ingestionAttempt: {
          ingestionAttemptReferenceId: input?.ingestionAttemptReferenceId ?? "ingestion:probe",
          targetTenantActivationScope: fixtures.buildActivationScope(
            input?.targetTenant ?? fixtures.NON_OVERLAY_TENANT,
          ),
          phiDataClassMarkers: [fixtures.buildPhiMarkerDescriptor()],
          claimsOverlayBypassPath: input?.overlayBypass === true,
          ingestionDescriptorParseable: true,
        },
        overlayActivationRegistry: emptyRegistry,
      });
      const result = modules.phiIngestionGate.evaluatePhiIngestion(evaluationInput);
      return {
        outcome: result.ingestionOutcome,
        refuseReason: result.refuseReason,
        refused: result.ingestionOutcome === "refused",
        poisonCaseIds: result.poisonCaseIds,
      };
    },
  };

  const phiBoundaryHarness = {
    assertDerivedLearningBrightLine() {
      const tenantAScope = {
        customerTenantId: fixtures.TENANT_A.customerTenantId,
        firmTenantId: fixtures.TENANT_A.firmTenantId,
        clientTenantId: fixtures.TENANT_A.clientTenantId,
        boundaryScopeReferenceId: fixtures.TENANT_A.isolationScopeReferenceId,
        customerIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).customerIsolation,
        firmIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).firmIsolation,
        clientIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).clientIsolation,
      };
      const tenantBScope = {
        customerTenantId: fixtures.TENANT_B.customerTenantId,
        firmTenantId: fixtures.TENANT_B.firmTenantId,
        clientTenantId: fixtures.TENANT_B.clientTenantId,
        boundaryScopeReferenceId: fixtures.TENANT_B.isolationScopeReferenceId,
        customerIsolation: fixtures.buildIsolationScope(fixtures.TENANT_B).customerIsolation,
        firmIsolation: fixtures.buildIsolationScope(fixtures.TENANT_B).firmIsolation,
        clientIsolation: fixtures.buildIsolationScope(fixtures.TENANT_B).clientIsolation,
      };
      const probeCase = modules.phiBoundary.buildPhiBoundaryProbeCase({
        probeCaseId: "PROBE-PC20-RUNTIME",
        poisonCaseIds: ["PC-20"],
        description: "Runtime PC-20 derived-learning bright line",
        expectBoundaryViolationDetected: true,
        surfacingAttempt: {
          surfacingAttemptReferenceId: "surfacing:probe-pc20",
          artifact: {
            artifactReferenceId: "artifact:derived-aggregate-probe",
            artifactSurfaceKind: "phi_derived_aggregate",
            phiDataClassKey: "phi_derived_learning_boundary",
            phiDataClassReferenceId: "marker-ref:derived:probe-pc20",
            derivationLineageStatus: "phi_derived",
            lineageParseable: true,
            sourcePhiLineageReferenceIds: ["lineage-ref:phi-source:probe"],
            sourceTenantScope: tenantAScope,
          },
          surfacingTargetTenantScope: tenantBScope,
          surfacingContext: "hipaa_overlay_active",
          surfacingDescriptorParseable: true,
        },
      });
      const harness = modules.phiBoundary.runPhiBoundaryHarness({
        probeCases: [probeCase],
        hipaaIntegrationBinding: integrationBinding,
        overlayActivationRegistry: emptyRegistry,
      });
      const detected = modules.phiBoundary.detectPc20PhiDerivedLearningBoundaryViolation({
        surfacingAttempt: probeCase.surfacingAttempt,
        hipaaIntegrationBinding: integrationBinding,
        overlayActivationRegistry: emptyRegistry,
      });
      return {
        blocked: harness.pass && detected,
        violationKind: harness.probeCaseResults[0]?.violationKind ?? null,
      };
    },
    assertGuardEnforced() {
      const tenantAScope = {
        customerTenantId: fixtures.TENANT_A.customerTenantId,
        firmTenantId: fixtures.TENANT_A.firmTenantId,
        clientTenantId: fixtures.TENANT_A.clientTenantId,
        boundaryScopeReferenceId: fixtures.TENANT_A.isolationScopeReferenceId,
        customerIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).customerIsolation,
        firmIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).firmIsolation,
        clientIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).clientIsolation,
      };
      const nonOverlayScope = {
        customerTenantId: fixtures.NON_OVERLAY_TENANT.customerTenantId,
        firmTenantId: fixtures.NON_OVERLAY_TENANT.firmTenantId,
        clientTenantId: fixtures.NON_OVERLAY_TENANT.clientTenantId,
        boundaryScopeReferenceId: fixtures.NON_OVERLAY_TENANT.isolationScopeReferenceId,
        customerIsolation: fixtures.buildIsolationScope(fixtures.NON_OVERLAY_TENANT).customerIsolation,
        firmIsolation: fixtures.buildIsolationScope(fixtures.NON_OVERLAY_TENANT).firmIsolation,
        clientIsolation: fixtures.buildIsolationScope(fixtures.NON_OVERLAY_TENANT).clientIsolation,
      };
      const result = modules.phiBoundary.evaluatePhiBoundaryProbe({
        surfacingAttempt: {
          surfacingAttemptReferenceId: "surfacing:probe-pc06",
          artifact: {
            artifactReferenceId: "artifact:claimed-clean-derived",
            artifactSurfaceKind: "phi_derived_feature",
            phiDataClassKey: null,
            phiDataClassReferenceId: "marker-ref:claimed-non-phi",
            derivationLineageStatus: "claimed_non_phi_laundered",
            lineageParseable: true,
            sourcePhiLineageReferenceIds: ["lineage-ref:llm-output:probe"],
            sourceTenantScope: tenantAScope,
          },
          surfacingTargetTenantScope: nonOverlayScope,
          surfacingContext: "non_overlay",
          surfacingDescriptorParseable: true,
        },
        hipaaIntegrationBinding: integrationBinding,
        overlayActivationRegistry: emptyRegistry,
      });
      return {
        blocked: result.boundaryViolationDetected,
        violationKind: result.violationKind,
      };
    },
  };

  const overlayActivationRegistry = {
    assertAttachmentInterfaceScope() {
      const scope = fixtures.buildActivationScope(fixtures.NON_OVERLAY_TENANT);
      const detected = modules.overlayAttachment.detectNonOverlayAttachmentCoverage({
        registry: emptyRegistry,
        tenantActivationScope: scope,
        overlayRegistryKey: modules.phiIngestionGate.PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
      });
      const resolution = modules.overlayAttachment.resolveOverlayActivation({
        registry: emptyRegistry,
        tenantActivationScope: scope,
        overlayRegistryKey: modules.phiIngestionGate.PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
      });
      return {
        denied: detected && resolution.resolutionOutcome === "not_active",
        resolutionOutcome: resolution.resolutionOutcome,
      };
    },
  };

  const auditSpine = {
    assertRetentionTier() {
      const spineDays = modules.audit.SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS;
      const routing = integrationBinding.phiTaggedAuditRoutingDeclaration;
      const routesOverlayOnly =
        routing.phiTaggedAuditEventRoutesOverlayOnly === true &&
        routing.routesToSpineGenericSystemLog === false;
      return {
        denied: routesOverlayOnly && spineDays < 2190,
        spineRetentionDays: spineDays,
        routesOverlayOnly,
      };
    },
    assertPhiRetentionFloor() {
      const detected = modules.hipaaIntegration.detectPc09PhiAuditBindsOverlayRetentionTier(integrationBinding);
      const spineDays = modules.audit.SPINE_BASELINE_APPLICATION_SYSTEM_RETENTION_DAYS;
      return {
        denied: detected && spineDays < 2190,
        overlayRetentionHook: detected,
        spineRetentionDays: spineDays,
      };
    },
  };

  const hipaaOverlay = {
    assertPhiWriteTarget() {
      const result = phiIngestionGate.evaluate({});
      return { refused: result.refused, refuseReason: result.refuseReason };
    },
    assertLlmCallGuard() {
      const result = phiIngestionGate.evaluate({
        targetTenant: fixtures.NON_OVERLAY_TENANT,
        ingestionAttemptReferenceId: "ingestion:llm-path-probe",
      });
      return { refused: result.refused, refuseReason: result.refuseReason };
    },
    assertReplicationTargetBaa() {
      const escape = phiBoundaryHarness.assertGuardEnforced();
      return { denied: escape.blocked, violationKind: escape.violationKind };
    },
  };

  const encryption = {
    assertPhiKeyScope() {
      const tenantAKeyScope = {
        keyScopeReferenceId: "key-scope:tenant-a",
        customerTenantScopeKey: fixtures.TENANT_A.customerTenantId,
        firmTenantScopeKey: fixtures.TENANT_A.firmTenantId,
        clientTenantScopeKey: fixtures.TENANT_A.clientTenantId,
        customerIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).customerIsolation,
        firmIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).firmIsolation,
        clientIsolation: fixtures.buildIsolationScope(fixtures.TENANT_A).clientIsolation,
      };
      const result = modules.encryption.classifyKeyScopeSeparation({
        boundKeyScope: tenantAKeyScope,
        attemptedUsageScopeKeys: [
          {
            customerTenantScopeKey: fixtures.TENANT_B.customerTenantId,
            firmTenantScopeKey: fixtures.TENANT_B.firmTenantId,
            clientTenantScopeKey: fixtures.TENANT_B.clientTenantId,
          },
        ],
      });
      return {
        denied: result.scopeValidationOutcome === "violation",
        violationReason: result.scopeViolationReason,
      };
    },
  };

  function mapPanelHarnessResult(result) {
    return {
      decision: result.decision,
      denied: result.decision === "DENY",
      reason: result.reason,
      evidence: result.evidence,
    };
  }

  function wrapPanelHarnessMethod(methodName) {
    return (input) => {
      try {
        const result = modules.panelDataPaths.panelDataPathHarness[methodName](input);
        return mapPanelHarnessResult(result);
      } catch {
        return {
          decision: "DENY",
          denied: true,
          reason: "harness_error_fail_closed",
          evidence: { panelId: input?.panelId ?? "unknown", deniedFields: [] },
        };
      }
    };
  }

  const panelDataPathHarness = {
    assertNoPhiOutsideOverlay: wrapPanelHarnessMethod("assertNoPhiOutsideOverlay"),
    assertPanelOverlayScope: wrapPanelHarnessMethod("assertPanelOverlayScope"),
    assertTenantScope: wrapPanelHarnessMethod("assertTenantScope"),
    proveRenderedPanelBoundary(input) {
      return modules.panelDataPaths.panelDataPathHarness.proveRenderedPanelBoundary(input);
    },
  };

  const subprocessorRegistry = {
    assertBaaOnFile(input) {
      try {
        const result = modules.vendors.subprocessorRegistry.assertBaaOnFile(input);
        return {
          decision: result.decision,
          denied: result.decision === "DENY",
          reason: result.reason,
          evidence: result.evidence,
        };
      } catch {
        return {
          decision: "DENY",
          denied: true,
          reason: "harness_error_fail_closed",
          evidence: {
            subprocessorId: input?.subprocessorId ?? "unknown",
            baaStatus: "unknown",
            phiInPayload: false,
            spineEnforcedNonPhiPath: false,
          },
        };
      }
    },
    getSubprocessor(subprocessorId) {
      return modules.vendors.subprocessorRegistry.getSubprocessor(subprocessorId);
    },
    listAllSubprocessors() {
      return modules.vendors.subprocessorRegistry.listAllSubprocessors();
    },
    listPhiAuthorizedSubprocessors() {
      return modules.vendors.subprocessorRegistry.listPhiAuthorizedSubprocessors();
    },
    proveOutboundPhiBoundary(flows) {
      return modules.vendors.subprocessorRegistry.proveOutboundPhiBoundary(flows);
    },
  };

  const socScopeBoundary = {
    assertPhiFlagged(input) {
      try {
        const result = modules.socScopeBoundary.socScopeBoundary.assertPhiFlagged(input);
        return {
          decision: result.decision,
          denied: result.decision === "DENY",
          reason: result.reason,
          evidence: result.evidence,
        };
      } catch {
        return {
          decision: "DENY",
          denied: true,
          reason: "harness_error_fail_closed",
          evidence: { diagramId: input?.diagramId ?? "unknown", unflaggedPhiNodes: [] },
        };
      }
    },
    getDeclaredBoundary() {
      return modules.socScopeBoundary.socScopeBoundary.getDeclaredBoundary();
    },
  };

  const tscScopeBoundary = {
    assertTscBoundaryAligned(input) {
      try {
        const result = modules.tscScopeBoundary.tscScopeBoundary.assertTscBoundaryAligned(input);
        return {
          decision: result.decision,
          denied: result.decision === "DENY",
          reason: result.reason,
          evidence: result.evidence,
        };
      } catch {
        return {
          decision: "DENY",
          denied: true,
          reason: "harness_error_fail_closed",
          evidence: {
            scopeId: input?.scopeId ?? "unknown",
            soc1DeclaredBoundary: modules.socScopeBoundary.socScopeBoundary.getDeclaredBoundary(),
            namespacesOutsideSoc1: [],
          },
        };
      }
    },
    getDeclaredTscScope() {
      return modules.tscScopeBoundary.tscScopeBoundary.getDeclaredTscScope();
    },
  };

  const retentionBaseline = {
    get RETENTION_BASELINE() {
      return modules.retention.RETENTION_BASELINE;
    },
    get retentionBaselineLookup() {
      return modules.retention.retentionBaselineLookup;
    },
  };

  const hipaaPackScopeBoundary = {
    assertPackScopeAligned(input) {
      try {
        const result = modules.hipaaPack.hipaaPackScopeBoundary.assertPackScopeAligned(input);
        return {
          decision: result.decision,
          denied: result.decision === "DENY",
          reason: result.reason,
          evidence: result.evidence,
        };
      } catch {
        return {
          decision: "DENY",
          denied: true,
          reason: "harness_error_fail_closed",
          evidence: {
            packScopeId: input?.packScopeId ?? "unknown",
            soc1DeclaredBoundary: modules.socScopeBoundary.socScopeBoundary.getDeclaredBoundary(),
            hipaaOverlayScopeContract: null,
            subpartsOutOfBoundsAttempted: [],
            namespacesOutsideSoc1: [],
            nprmAnticipationDetected: false,
          },
        };
      }
    },
    getDeclaredPackScope() {
      return modules.hipaaPack.hipaaPackScopeBoundary.getDeclaredPackScope();
    },
  };

  const nprmGapRegister = {
    assertRegisterSchemaValid(rows) {
      try {
        const result = modules.nprmRegister.nprmGapRegister.assertRegisterSchemaValid(rows);
        return {
          decision: result.decision,
          denied: result.decision === "DENY",
          reason: result.reason,
          violations: result.violations,
        };
      } catch {
        return {
          decision: "DENY",
          denied: true,
          reason: "harness_error_fail_closed",
          violations: [{ rowId: "unknown", violation: "harness_error" }],
        };
      }
    },
    getLockTimeStatus() {
      return modules.nprmRegister.nprmGapRegister.getLockTimeStatus();
    },
  };

  const trustPackagePublishGate = {
    assertDraftIntegrity(input) {
      try {
        const result = modules.trustPackage.trustPackagePublishGate.assertDraftIntegrity(input);
        return {
          decision: result.decision,
          denied: result.decision === "DENY",
          reason: result.reason,
          evidence: result.evidence,
        };
      } catch {
        return {
          decision: "DENY",
          denied: true,
          reason: "harness_error_fail_closed",
          evidence: {
            artifactId: input?.artifactId ?? "unknown",
            pathNamespaceValid: false,
            d0PathsResolvedCount: 0,
            d0PathsUnresolved: [],
            publishReadyFlagDetected: false,
          },
        };
      }
    },
    getDeclaredArtifacts() {
      return modules.trustPackage.trustPackagePublishGate.getDeclaredArtifacts();
    },
  };

  return {
    isolationEvaluator,
    rbacEvaluator,
    phiBoundaryHarness,
    panelDataPathHarness,
    phiIngestionGate,
    overlayActivationRegistry,
    hipaaOverlay,
    auditSpine,
    encryption,
    subprocessorRegistry,
    socScopeBoundary,
    tscScopeBoundary,
    retentionBaseline,
    hipaaPackScopeBoundary,
    nprmGapRegister,
    trustPackagePublishGate,
    modules,
    integrationBinding,
    emptyRegistry,
  };
}

const probeHelpers = createProbeHelpers();

function verifyModuleWave(modules, waveLabel) {
  const missing = [];
  for (const mod of modules) {
    const dirPath = path.join(opsRoot, mod.dir);
    const barrelPath = path.join(dirPath, mod.barrel);
    if (!fs.existsSync(barrelPath)) {
      missing.push(`${mod.id}:${mod.dir}/${mod.barrel}`);
    }
  }
  return { waveLabel, missing };
}

function scanSpineVerticalComplianceLogicFalse() {
  const violations = [];
  for (const dir of SPINE_SCAN_DIRS) {
    const files = listFiles(path.join("ops", dir), (file) =>
      file.endsWith(".ts") && !file.includes("StaticConstructionTests"),
    );
    for (const file of files) {
      const source = read(file);
      if (source.includes("containsVerticalComplianceLogic: true")) {
        violations.push(file);
      }
    }
  }
  return violations;
}

function scanSpineHipaaSymbols() {
  const pattern = /\b(HIPAA|45_cfr_164|Hipaa[A-Z][a-zA-Z]+Contract)\b/;
  const allowedSubpaths = ["phi-ingestion-gate", "verification/phi-boundary", "verification/panel-data-paths"];
  const hits = [];
  const spineFiles = listFiles("ops/control-spine", (file) =>
    file.endsWith(".ts") && !file.includes("StaticConstructionTests"),
  );
  for (const file of spineFiles) {
    if (allowedSubpaths.some((segment) => file.replace(/\\/g, "/").includes(segment))) continue;
    const source = read(file);
    if (pattern.test(source)) {
      hits.push(file);
    }
  }
  return hits;
}

function scanExecutableTrueDrift() {
  const hits = [];
  const files = listFiles("ops", (file) => file.endsWith(".ts"));
  for (const file of files) {
    const source = read(file);
    if (source.includes("executable: true")) hits.push(file);
  }
  return hits;
}

function scanSpineContractImports() {
  const violations = [];
  const allowedComplianceImportPaths = ["phi-ingestion-gate", "verification/phi-boundary", "verification/panel-data-paths"];
  const spineFiles = listFiles("ops/control-spine", (file) =>
    file.endsWith(".ts") && !file.endsWith("index.ts") && !file.includes("StaticConstructionTests"),
  );
  for (const file of spineFiles) {
    if (file.includes("contracts/")) continue;
    const source = read(file);
    const importsContracts =
      source.includes("../contracts") ||
      source.includes("../../control-spine/contracts") ||
      source.includes('from "../contracts"') ||
      source.includes('from "../../contracts"') ||
      source.includes('from "../../../contracts"');
    const importsComplianceOverlay =
      /from ["']\.\.\/\.\.\/compliance\//.test(source) ||
      /from ["']\.\.\/\.\.\/\.\.\/compliance\//.test(source);
    if (!importsContracts && (file.includes("evaluate") || file.includes("build") || file.includes("runPhi"))) {
      violations.push(`${file} (no 42.5A contracts import)`);
    }
    if (
      importsComplianceOverlay &&
      !allowedComplianceImportPaths.some((segment) => file.replace(/\\/g, "/").includes(segment))
    ) {
      violations.push(`${file} (unexpected compliance import in spine evaluator)`);
    }
  }
  return violations;
}

const HIPAA_INTEGRATION_REFERENCE_ID_DECLARATION_DIR =
  "ops/compliance/overlays/hipaa/integration/";

const PHASE_42_5_INTERFACE_REFERENCE_ID_DECLARATION_PATTERN =
  /export const PHASE_42_5_[A-Z0-9_]*INTERFACE_REFERENCE_ID\b/g;

function scanHipaaIntegrationReferenceIdDeclarationSites() {
  const violations = [];
  const allowedPrefix = HIPAA_INTEGRATION_REFERENCE_ID_DECLARATION_DIR.replace(/\\/g, "/");
  const files = listFiles(".", (file) => /\.(ts|js|mts|cts)$/.test(file)).filter(
    (file) => !file.replace(/\\/g, "/").includes("node_modules/"),
  );

  for (const file of files) {
    const normalized = file.replace(/\\/g, "/");
    if (normalized.startsWith(allowedPrefix)) continue;

    const source = read(file);
    const matches = source.match(PHASE_42_5_INTERFACE_REFERENCE_ID_DECLARATION_PATTERN);
    if (matches && matches.length > 0) {
      violations.push(`${normalized}: ${matches.join(", ")}`);
    }
  }

  return violations;
}

const checks = [
  {
    id: "CHK-01",
    name: "Wave 1 modules (42.5A–G) present and barrel-exported",
    run() {
      const result = verifyModuleWave(WAVE1_MODULES, "Wave1");
      return result.missing.length === 0
        ? { status: "PASS", detail: "All Wave 1 modules present", evidence: { count: WAVE1_MODULES.length } }
        : { status: "FAIL", detail: `Missing: ${result.missing.join(", ")}`, evidence: { missing: result.missing } };
    },
  },
  {
    id: "CHK-02",
    name: "Wave 2 modules (42.5H–L) present and barrel-exported",
    run() {
      const result = verifyModuleWave(WAVE2_MODULES, "Wave2");
      return result.missing.length === 0
        ? { status: "PASS", detail: "All Wave 2 modules present", evidence: { count: WAVE2_MODULES.length } }
        : { status: "FAIL", detail: `Missing: ${result.missing.join(", ")}`, evidence: { missing: result.missing } };
    },
  },
  {
    id: "CHK-03",
    name: "Wave 3 modules so far (42.5M, 42.5N) present and barrel-exported",
    run() {
      const result = verifyModuleWave(WAVE3_MODULES, "Wave3");
      return result.missing.length === 0
        ? { status: "PASS", detail: "42.5M, 42.5N, and 42.5P present", evidence: { count: WAVE3_MODULES.length } }
        : { status: "FAIL", detail: `Missing: ${result.missing.join(", ")}`, evidence: { missing: result.missing } };
    },
  },
  {
    id: "CHK-04",
    name: "Spine modules assert containsVerticalComplianceLogic:false",
    run() {
      const violations = scanSpineVerticalComplianceLogicFalse();
      return violations.length === 0
        ? { status: "PASS", detail: "Spine scan clean", evidence: { scannedDirs: SPINE_SCAN_DIRS.length } }
        : { status: "FAIL", detail: violations.join("; "), evidence: { violations } };
    },
  },
  {
    id: "CHK-05",
    name: "HIPAA overlay is the only HIPAA-named module namespace outside Phase 42",
    run() {
      const spineHits = scanSpineHipaaSymbols();
      const overlayPresent = HIPAA_OVERLAY_DIRS.every((dir) => fs.existsSync(path.join(opsRoot, dir)));
      if (spineHits.length > 0) {
        return { status: "FAIL", detail: `Spine HIPAA symbols outside gate/harness: ${spineHits.join(", ")}`, evidence: { spineHits } };
      }
      return overlayPresent
        ? { status: "PASS", detail: "HIPAA symbols confined to overlay + allowed spine gates", evidence: { overlayDirs: HIPAA_OVERLAY_DIRS } }
        : { status: "FAIL", detail: "Missing HIPAA overlay dirs", evidence: { overlayPresent } };
    },
  },
  {
    id: "CHK-06",
    name: "42.5D audit interface ID is opaque Phase 42 handoff (no spine HIPAA semantics)",
    run() {
      const source = read("ops/control-spine/audit/buildAuditEvent.ts");
      const discipline = read("lib/intelligence/synthetic/industry/phi-healthcare/buildHealthcarePHIDiscipline.ts");
      const pass =
        source.includes("declareAuditLoggingInterfaceIntegrationPoint") &&
        source.includes("AUDIT_LOGGING_EVENT_INTERFACE_REFERENCE_ID_SLOT") &&
        discipline.includes("hipaaControlsImplementedByPhase42_5NotHere: true") &&
        !source.includes("45_cfr_164");
      return pass
        ? { status: "PASS", detail: "Audit spine declares opaque interface slot only", evidence: null }
        : { status: "FAIL", detail: "Audit spine HIPAA semantics drift detected", evidence: null };
    },
  },
  {
    id: "CHK-07",
    name: "42.5I overlay activation registry fail-closed default",
    run() {
      const modules = loadSpineModules();
      const scope = fixtures.buildActivationScope(fixtures.NON_OVERLAY_TENANT);
      const resolution = modules.overlayAttachment.resolveOverlayActivation({
        registry: modules.overlayAttachment.createOverlayActivationRegistry("registry:chk07"),
        tenantActivationScope: scope,
        overlayRegistryKey: modules.phiIngestionGate.PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
      });
      const pass = resolution.resolutionOutcome === "not_active";
      return pass
        ? { status: "PASS", detail: "Empty registry => not_active", evidence: { resolutionOutcome: resolution.resolutionOutcome } }
        : { status: "FAIL", detail: `Expected not_active got ${resolution.resolutionOutcome}`, evidence: { resolution } };
    },
  },
  {
    id: "CHK-08",
    name: "42.5L satisfies 42Q deferred assertion without mutating Phase 42 source",
    run() {
      const modules = loadSpineModules();
      const binding = buildIntegrationBinding(modules);
      const discipline = read("lib/intelligence/synthetic/industry/phi-healthcare/buildHealthcarePHIDiscipline.ts");
      const phase42Immutable = discipline.includes("hipaaControlsImplementedByPhase42_5NotHere: true");
      const satisfied =
        binding.hipaaIntegrationPointsBinding.auditLoggingEventInterfaceReferenceId.length > 0 &&
        modules.hipaaIntegration.detectPc03PhiAuditRoutesOverlayOnly(binding);
      return phase42Immutable && satisfied
        ? { status: "PASS", detail: "42.5L consumer-side binding satisfies 42Q deferral", evidence: { satisfied } }
        : { status: "FAIL", detail: "42Q deferral not satisfied or Phase 42 marker missing", evidence: { phase42Immutable, satisfied } };
    },
  },
  {
    id: "CHK-09",
    name: "RBAC composes on isolation (deny-dominant)",
    run() {
      const modules = loadSpineModules();
      const result = modules.rbac.executeRbacStaticConstructionTests();
      const isolationDenyCase = result.results.find((r) => r.caseId === "SC-DENY-ISOLATION-OVERRIDE");
      const pass = result.pass && isolationDenyCase && isolationDenyCase.passed;
      return pass
        ? { status: "PASS", detail: "RBAC static suite confirms isolation floor", evidence: { caseId: isolationDenyCase?.caseId } }
        : { status: "FAIL", detail: "RBAC/isolation composition not proven", evidence: { rbacPass: result.pass, isolationDenyCase } };
    },
  },
  {
    id: "CHK-10",
    name: "Audit events on boundary evaluation PASS and DENY (42.5B, 42.5C)",
    run() {
      const isolation = loadSpineModules().isolation.executeIsolationBoundaryAuditArtifactSmokeTest();
      const rbac = loadSpineModules().rbac.executeRbacAuditArtifactSmokeTest();
      const auth = loadSpineModules().auth.executeAuthBoundaryAuditParitySmokeTest();
      const pass = isolation === true && rbac === true && auth === true;
      return pass
        ? { status: "PASS", detail: "Isolation + RBAC + auth audit smoke pass", evidence: { isolation, rbac, auth } }
        : { status: "FAIL", detail: "Audit artifact smoke failed", evidence: { isolation, auth } };
    },
  },
  {
    id: "CHK-11",
    name: "No executable:true on spine/overlay contract modules",
    run() {
      const hits = scanExecutableTrueDrift();
      return hits.length === 0
        ? { status: "PASS", detail: "No executable:true drift in ops/", evidence: null }
        : { status: "FAIL", detail: hits.join(", "), evidence: { hits } };
    },
  },
  {
    id: "CHK-12",
    name: "Spine evaluators import 42.5A contracts (no drift)",
    run() {
      const violations = scanSpineContractImports();
      return violations.length === 0
        ? { status: "PASS", detail: "Spine contract import scan clean", evidence: null }
        : { status: "FAIL", detail: violations.slice(0, 5).join("; "), evidence: { violations } };
    },
  },
  {
    id: "CHK-13",
    name: "TypeScript clean across spine + HIPAA overlay",
    run() {
      try {
        execSync("npx tsc --noEmit --pretty false", { cwd: root, stdio: "pipe", encoding: "utf8" });
        return { status: "PASS", detail: "tsc --noEmit exit 0", evidence: null };
      } catch (error) {
        return { status: "FAIL", detail: error.stdout || error.message, evidence: { stderr: error.stderr } };
      }
    },
  },
  {
    id: "CHK-14",
    name: "Phase 42 industry verifier regression",
    run() {
      try {
        execSync("node scripts/verify-ii-industry-intelligence.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
        return { status: "PASS", detail: "verify-ii-industry-intelligence.js exit 0", evidence: null };
      } catch (error) {
        return { status: "FAIL", detail: (error.stdout || error.message || "").slice(0, 500), evidence: null };
      }
    },
  },
  {
    id: "CHK-15",
    name: "Mandatory PC count is exactly 20 (PC-01..PC-20)",
    run() {
      const ids = mandatoryPoisonCases.map((pc) => pc.id);
      const expected = Array.from({ length: 20 }, (_, i) => `PC-${String(i + 1).padStart(2, "0")}`);
      const pass = ids.length === 20 && expected.every((id, index) => ids[index] === id);
      return pass
        ? { status: "PASS", detail: "MANDATORY_POISON_CASES.json has 20 floor PCs", evidence: { ids } }
        : { status: "FAIL", detail: `Expected 20 IDs PC-01..PC-20, got ${ids.length}`, evidence: { ids } };
    },
  },
  {
    id: "CHK-16",
    name: "Each PC has a declared owning exporter",
    run() {
      const missing = mandatoryPoisonCases.filter((pc) => !pc.owner || !pc.helper);
      return missing.length === 0
        ? { status: "PASS", detail: "All PCs have owner + helper", evidence: { count: mandatoryPoisonCases.length } }
        : { status: "FAIL", detail: missing.map((pc) => pc.id).join(", "), evidence: { missing } };
    },
  },
  {
    id: "CHK-17",
    name: "42.5N PHI-derived-learning bright line harness fail-closed",
    run() {
      const modules = loadSpineModules();
      const staticResult = modules.phiBoundary.executePhiBoundaryStaticConstructionTests();
      const launderingCase = staticResult.results.find((r) => r.caseId === "SC-03-DERIVATION-DOES-NOT-LAUNDER");
      const pass = staticResult.pass && launderingCase && launderingCase.passed;
      return pass
        ? { status: "PASS", detail: "42.5N static harness proves derived-artifact boundary (SC-03)", evidence: { launderingCase: launderingCase?.violationKind } }
        : { status: "FAIL", detail: "42.5N bright-line harness failed", evidence: { staticResult } };
    },
  },
  {
    id: "CHK-18",
    name: "42.5K Q7a classification table present (INCOMPLETE marker allowed pre-LOCK)",
    run() {
      const modules = loadSpineModules();
      const phiDataClassReferences = modules.hipaaSafeguards.buildDefaultPhiDataClassReferences();
      const classification = modules.hipaaSafeguards.buildPhiAdjacentFieldClassification({
        classificationBuildKey: "chk18-q7a-structure",
        phiDataClassReferences,
      });
      const pass =
        classification.pendingInputMarker === modules.hipaaSafeguards.PHI_ADJACENT_FIELD_CLASSIFICATION_PENDING_Q7A &&
        classification.assertsFieldClassificationComplete === false &&
        Array.isArray(classification.fieldClassificationEntries);
      return pass
        ? { status: "PASS", detail: "Q7a table structure present with PENDING marker", evidence: { pendingInputMarker: classification.pendingInputMarker } }
        : { status: "FAIL", detail: "42.5K Q7a classification structure missing", evidence: { classification } };
    },
  },
  {
    id: "CHK-19",
    name: "42.5L is sole declaration site for HIPAA integration reference ID values",
    run() {
      const violations = scanHipaaIntegrationReferenceIdDeclarationSites();
      const soleSite = path.join(
        root,
        HIPAA_INTEGRATION_REFERENCE_ID_DECLARATION_DIR,
        "buildPhase42HipaaIntegrationBinding.ts",
      );
      const soleSiteExists = fs.existsSync(soleSite);
      const pass = violations.length === 0 && soleSiteExists;
      return pass
        ? {
            status: "PASS",
            detail: "PHASE_42_5_*_INTERFACE_REFERENCE_ID declared only in 42.5L integration bind layer",
            evidence: { soleDeclarationSite: HIPAA_INTEGRATION_REFERENCE_ID_DECLARATION_DIR },
          }
        : {
            status: "FAIL",
            detail:
              violations.length > 0
                ? `Duplicate declarations outside 42.5L: ${violations.join("; ")}`
                : "42.5L buildPhase42HipaaIntegrationBinding.ts missing",
            evidence: { violations, soleSiteExists },
          };
    },
  },
  {
    id: "CHK-20",
    name: "Phase 42 buildPHITag.ts inline literal matches 42.5L canonical audit-store ID",
    run() {
      const bindingModule = loadOpsModule(
        "compliance/overlays/hipaa/integration/buildPhase42HipaaIntegrationBinding.ts",
      );
      const canonical = bindingModule.PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID;
      if (typeof canonical !== "string" || canonical.length === 0) {
        return {
          status: "FAIL",
          detail:
            "42.5L canonical PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID is missing or empty",
          evidence: { canonical },
        };
      }

      const phitagPath = "lib/intelligence/synthetic/industry/phi-tagging/buildPHITag.ts";
      if (!fs.existsSync(path.join(root, phitagPath))) {
        return {
          status: "FAIL",
          detail: `Phase 42 source file not found: ${phitagPath}`,
          evidence: null,
        };
      }

      const phitagSrc = read(phitagPath);
      const hasCanonicalLiteral =
        phitagSrc.includes(`"${canonical}"`) || phitagSrc.includes(`'${canonical}'`);

      return hasCanonicalLiteral
        ? {
            status: "PASS",
            detail: `Phase 42 buildPHITag.ts fallback literal matches 42.5L canonical: "${canonical}".`,
            evidence: { canonical, phitagPath },
          }
        : {
            status: "FAIL",
            detail: `Phase 42 buildPHITag.ts does not contain canonical literal "${canonical}". Either Phase 42 fallback was renamed (would require Phase 42 lock amendment) OR 42.5L canonical was changed without coordinating Phase 42.`,
            evidence: { canonical, phitagPath },
          };
    },
  },
  {
    id: "CHK-21",
    name: "Static construction test EXISTING_42H_STORE_LITERAL matches 42.5L canonical audit-store ID",
    run() {
      const bindingModule = loadOpsModule(
        "compliance/overlays/hipaa/integration/buildPhase42HipaaIntegrationBinding.ts",
      );
      const canonical = bindingModule.PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID;
      if (typeof canonical !== "string" || canonical.length === 0) {
        return {
          status: "FAIL",
          detail:
            "42.5L canonical PHASE_42_5_HIPAA_COMPLIANT_AUDIT_STORE_INTERFACE_REFERENCE_ID is missing or empty",
          evidence: { canonical },
        };
      }

      const testPath = "ops/compliance/overlays/hipaa/integration/phase42HipaaIntegrationStaticConstructionTests.ts";
      if (!fs.existsSync(path.join(root, testPath))) {
        return {
          status: "FAIL",
          detail: `Test file not found: ${testPath}`,
          evidence: null,
        };
      }

      const testSrc = read(testPath);
      const match = testSrc.match(/const\s+EXISTING_42H_STORE_LITERAL\s*=\s*["']([^"']+)["']/);
      if (!match) {
        return {
          status: "FAIL",
          detail:
            "EXISTING_42H_STORE_LITERAL declaration not found in test file. Test fixture may have been refactored.",
          evidence: { testPath },
        };
      }

      const testLiteralValue = match[1];
      return testLiteralValue === canonical
        ? {
            status: "PASS",
            detail: `Test file EXISTING_42H_STORE_LITERAL matches 42.5L canonical: "${canonical}".`,
            evidence: { canonical, testPath, testLiteralValue },
          }
        : {
            status: "FAIL",
            detail: `EXISTING_42H_STORE_LITERAL in test file = "${testLiteralValue}", but 42.5L canonical = "${canonical}". Update test fixture.`,
            evidence: { canonical, testLiteralValue, testPath },
          };
    },
  },
  {
    id: "CHK-22",
    name: "42.5P panel-data-path harness exported via verification barrel and verifier re-export",
    run() {
      const moduleDir = path.join(opsRoot, "control-spine/verification/panel-data-paths");
      const barrelPath = path.join(moduleDir, "index.ts");
      const verificationBarrel = path.join(opsRoot, "control-spine/verification/index.ts");
      const harnessPresent = fs.existsSync(path.join(moduleDir, "panelDataPathHarness.ts"));
      const barrelPresent = fs.existsSync(barrelPath);
      const verificationBarrelExportsPanel =
        fs.existsSync(verificationBarrel) &&
        read("ops/control-spine/verification/index.ts").includes("panel-data-paths");
      const modules = loadSpineModules();
      const staticResult = modules.panelDataPaths.executePanelDataPathStaticConstructionTests();
      const exportedHarness = probeHelpers.panelDataPathHarness;
      const hasMethods =
        typeof exportedHarness?.assertNoPhiOutsideOverlay === "function" &&
        typeof exportedHarness?.assertPanelOverlayScope === "function" &&
        typeof exportedHarness?.assertTenantScope === "function";
      const pass =
        harnessPresent &&
        barrelPresent &&
        verificationBarrelExportsPanel &&
        hasMethods &&
        staticResult.pass;
      return pass
        ? {
            status: "PASS",
            detail: "42.5P panelDataPathHarness wired through verification barrel and 42.5O re-export",
            evidence: { staticCases: staticResult.results.length },
          }
        : {
            status: "FAIL",
            detail: "42.5P harness missing or static suite failed",
            evidence: { harnessPresent, barrelPresent, verificationBarrelExportsPanel, hasMethods, staticResult },
          };
    },
  },
  {
    id: "CHK-23",
    name: "42.5P containsVerticalComplianceLogic:false on every harness file",
    run() {
      const dir = path.join("ops", "control-spine/verification/panel-data-paths");
      const files = listFiles(dir, (file) => /\.ts$/.test(file) && !file.includes("StaticConstructionTests"));
      const violations = [];
      for (const file of files) {
        const source = read(file);
        if (!source.includes("containsVerticalComplianceLogic: false")) {
          violations.push(`${file} (missing containsVerticalComplianceLogic: false)`);
        }
      }
      return violations.length === 0
        ? { status: "PASS", detail: "42.5P namespace spine-side annotations present", evidence: { files: files.length } }
        : { status: "FAIL", detail: violations.join("; "), evidence: { violations } };
    },
  },
  {
    id: "CHK-24",
    name: "42.5P D0_EVIDENCE.json present, parses, and d0 generator exits 0",
    run() {
      const evidencePath = "ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json";
      const generatorPath = "scripts/d0-evidence-panel-data-paths.js";
      if (!fs.existsSync(path.join(root, generatorPath))) {
        return { status: "FAIL", detail: `Missing generator: ${generatorPath}`, evidence: null };
      }
      try {
        execSync("node scripts/d0-evidence-panel-data-paths.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      } catch (error) {
        return {
          status: "FAIL",
          detail: `d0 generator failed: ${(error.stdout || error.message || "").slice(0, 300)}`,
          evidence: null,
        };
      }
      if (!fs.existsSync(path.join(root, evidencePath))) {
        return { status: "FAIL", detail: `Missing artifact: ${evidencePath}`, evidence: null };
      }
      let parsed;
      try {
        parsed = JSON.parse(read(evidencePath));
      } catch (error) {
        return { status: "FAIL", detail: `D0_EVIDENCE.json parse error: ${error.message}`, evidence: null };
      }
      const pass = parsed.totalViolations === 0 && parsed.pass === true;
      return pass
        ? {
            status: "PASS",
            detail: `D0 panel evidence artifact valid (panels=${parsed.totalPanels}, violations=0)`,
            evidence: { totalPanels: parsed.totalPanels },
          }
        : {
            status: "FAIL",
            detail: `D0_EVIDENCE.json totalViolations=${parsed.totalViolations}`,
            evidence: { parsed },
          };
    },
  },
  {
    id: "CHK-25",
    name: "42.5Q socScopeBoundary exported via compliance barrel and 42.5O re-export",
    run() {
      const moduleDir = path.join(opsRoot, "compliance/soc/soc1");
      const complianceBarrel = path.join(opsRoot, "compliance/index.ts");
      const harnessPresent = fs.existsSync(path.join(moduleDir, "socScopeBoundary.ts"));
      const barrelPresent = fs.existsSync(path.join(moduleDir, "index.ts"));
      const complianceExportsSoc =
        fs.existsSync(complianceBarrel) && read("ops/compliance/index.ts").includes("soc/soc1");
      const modules = loadSpineModules();
      const staticResult = modules.socScopeBoundary.executeSocScopeBoundaryStaticConstructionTests();
      const exported = probeHelpers.socScopeBoundary;
      const hasMethods =
        typeof exported?.assertPhiFlagged === "function" &&
        typeof exported?.getDeclaredBoundary === "function";
      const pass =
        harnessPresent && barrelPresent && complianceExportsSoc && hasMethods && staticResult.pass;
      return pass
        ? {
            status: "PASS",
            detail: "42.5Q socScopeBoundary wired through compliance barrel and 42.5O re-export",
            evidence: { staticCases: staticResult.results.length },
          }
        : {
            status: "FAIL",
            detail: "42.5Q socScopeBoundary missing or static suite failed",
            evidence: { harnessPresent, barrelPresent, complianceExportsSoc, hasMethods, staticResult },
          };
    },
  },
  {
    id: "CHK-26",
    name: "42.5Q containsVerticalComplianceLogic:false on every .ts file in soc/soc1/",
    run() {
      const dir = path.join("ops", "compliance/soc/soc1");
      const files = listFiles(dir, (file) => /\.ts$/.test(file) && !file.includes("StaticConstructionTests"));
      const violations = [];
      for (const file of files) {
        const source = read(file);
        if (!source.includes("containsVerticalComplianceLogic: false")) {
          violations.push(`${file} (missing containsVerticalComplianceLogic: false)`);
        }
      }
      return violations.length === 0
        ? { status: "PASS", detail: "42.5Q namespace contract annotations present", evidence: { files: files.length } }
        : { status: "FAIL", detail: violations.join("; "), evidence: { violations } };
    },
  },
  {
    id: "CHK-27",
    name: "42.5Q D0_EVIDENCE.json present; boundary diagram parses; d0 generator exits 0",
    run() {
      const evidencePath = "ops/compliance/soc/soc1/D0_EVIDENCE.json";
      const diagramPath = "docs/trust/soc1/BOUNDARY_DIAGRAM_INPUT.json";
      const generatorPath = "scripts/d0-evidence-soc-scope-boundary.js";
      if (!fs.existsSync(path.join(root, generatorPath))) {
        return { status: "FAIL", detail: `Missing generator: ${generatorPath}`, evidence: null };
      }
      if (!fs.existsSync(path.join(root, diagramPath))) {
        return { status: "FAIL", detail: `Missing boundary diagram: ${diagramPath}`, evidence: null };
      }
      let diagramInput;
      try {
        diagramInput = JSON.parse(read(diagramPath));
      } catch (error) {
        return { status: "FAIL", detail: `BOUNDARY_DIAGRAM_INPUT.json parse error: ${error.message}`, evidence: null };
      }
      if (!diagramInput.diagramId || !Array.isArray(diagramInput.nodes)) {
        return { status: "FAIL", detail: "BOUNDARY_DIAGRAM_INPUT.json missing diagramId or nodes", evidence: null };
      }
      try {
        execSync("node scripts/d0-evidence-soc-scope-boundary.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      } catch (error) {
        return {
          status: "FAIL",
          detail: `d0 generator failed: ${(error.stdout || error.message || "").slice(0, 300)}`,
          evidence: null,
        };
      }
      if (!fs.existsSync(path.join(root, evidencePath))) {
        return { status: "FAIL", detail: `Missing artifact: ${evidencePath}`, evidence: null };
      }
      let parsed;
      try {
        parsed = JSON.parse(read(evidencePath));
      } catch (error) {
        return { status: "FAIL", detail: `D0_EVIDENCE.json parse error: ${error.message}`, evidence: null };
      }
      const pass = parsed.decision === "ALLOW" && parsed.unflaggedCount === 0;
      return pass
        ? {
            status: "PASS",
            detail: `SOC scope D0 evidence valid (nodes=${parsed.totalNodes}, unflagged=0)`,
            evidence: { totalNodes: parsed.totalNodes },
          }
        : {
            status: "FAIL",
            detail: `D0_EVIDENCE.json decision=${parsed.decision} unflagged=${parsed.unflaggedCount}`,
            evidence: { parsed },
          };
    },
  },
  {
    id: "CHK-28",
    name: "42.5R tscScopeBoundary exported via compliance barrel and 42.5O re-export",
    run() {
      const moduleDir = path.join(opsRoot, "compliance/soc/soc2");
      const complianceBarrel = path.join(opsRoot, "compliance/index.ts");
      const harnessPresent = fs.existsSync(path.join(moduleDir, "tscScopeBoundary.ts"));
      const barrelPresent = fs.existsSync(path.join(moduleDir, "index.ts"));
      const complianceExportsSoc2 =
        fs.existsSync(complianceBarrel) && read("ops/compliance/index.ts").includes("soc/soc2");
      const modules = loadSpineModules();
      const staticResult = modules.tscScopeBoundary.executeTscScopeBoundaryStaticConstructionTests();
      const exported = probeHelpers.tscScopeBoundary;
      const hasMethods =
        typeof exported?.assertTscBoundaryAligned === "function" &&
        typeof exported?.getDeclaredTscScope === "function";
      const pass =
        harnessPresent && barrelPresent && complianceExportsSoc2 && hasMethods && staticResult.pass;
      return pass
        ? {
            status: "PASS",
            detail: "42.5R tscScopeBoundary wired through compliance barrel and 42.5O re-export",
            evidence: { staticCases: staticResult.results.length },
          }
        : {
            status: "FAIL",
            detail: "42.5R tscScopeBoundary missing or static suite failed",
            evidence: { harnessPresent, barrelPresent, complianceExportsSoc2, hasMethods, staticResult },
          };
    },
  },
  {
    id: "CHK-29",
    name: "42.5R containsVerticalComplianceLogic:false on every .ts file in soc/soc2/",
    run() {
      const dir = path.join("ops", "compliance/soc/soc2");
      const files = listFiles(dir, (file) => /\.ts$/.test(file) && !file.includes("StaticConstructionTests"));
      const violations = [];
      for (const file of files) {
        const source = read(file);
        if (!source.includes("containsVerticalComplianceLogic: false")) {
          violations.push(`${file} (missing containsVerticalComplianceLogic: false)`);
        }
      }
      return violations.length === 0
        ? { status: "PASS", detail: "42.5R namespace contract annotations present", evidence: { files: files.length } }
        : { status: "FAIL", detail: violations.join("; "), evidence: { violations } };
    },
  },
  {
    id: "CHK-30",
    name: "42.5R D0_EVIDENCE.json present; TSC scope declaration parses; d0 generator exits 0; aligned with SOC 1 boundary",
    run() {
      const evidencePath = "ops/compliance/soc/soc2/D0_EVIDENCE.json";
      const declarationPath = "docs/trust/soc2/TSC_SCOPE_DECLARATION.json";
      const generatorPath = "scripts/d0-evidence-tsc-scope-boundary.js";
      if (!fs.existsSync(path.join(root, generatorPath))) {
        return { status: "FAIL", detail: `Missing generator: ${generatorPath}`, evidence: null };
      }
      if (!fs.existsSync(path.join(root, declarationPath))) {
        return { status: "FAIL", detail: `Missing TSC scope declaration: ${declarationPath}`, evidence: null };
      }
      let declarationInput;
      try {
        declarationInput = JSON.parse(read(declarationPath));
      } catch (error) {
        return { status: "FAIL", detail: `TSC_SCOPE_DECLARATION.json parse error: ${error.message}`, evidence: null };
      }
      if (
        !declarationInput.scopeId ||
        !Array.isArray(declarationInput.criteriaInScope) ||
        !Array.isArray(declarationInput.namespacesInScope)
      ) {
        return {
          status: "FAIL",
          detail: "TSC_SCOPE_DECLARATION.json missing scopeId, criteriaInScope, or namespacesInScope",
          evidence: null,
        };
      }
      try {
        execSync("node scripts/d0-evidence-tsc-scope-boundary.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      } catch (error) {
        return {
          status: "FAIL",
          detail: `d0 generator failed: ${(error.stdout || error.message || "").slice(0, 300)}`,
          evidence: null,
        };
      }
      if (!fs.existsSync(path.join(root, evidencePath))) {
        return { status: "FAIL", detail: `Missing artifact: ${evidencePath}`, evidence: null };
      }
      let parsed;
      try {
        parsed = JSON.parse(read(evidencePath));
      } catch (error) {
        return { status: "FAIL", detail: `D0_EVIDENCE.json parse error: ${error.message}`, evidence: null };
      }
      const liveAssertion = probeHelpers.tscScopeBoundary.assertTscBoundaryAligned(declarationInput);
      const aligned =
        parsed.decision === "ALLOW" &&
        parsed.namespacesOutsideCount === 0 &&
        liveAssertion.decision === "ALLOW" &&
        declarationInput.criteriaInScope.includes("security") &&
        !declarationInput.criteriaInScope.includes("processing-integrity") &&
        !declarationInput.criteriaInScope.includes("privacy");
      return aligned
        ? {
            status: "PASS",
            detail: `TSC scope D0 evidence valid (criteria=${parsed.criteriaCount}, outside=0, SOC1-aligned)`,
            evidence: { criteriaCount: parsed.criteriaCount },
          }
        : {
            status: "FAIL",
            detail: `D0_EVIDENCE.json decision=${parsed.decision} outside=${parsed.namespacesOutsideCount} live=${liveAssertion.decision}`,
            evidence: { parsed, liveAssertion },
          };
    },
  },
  {
    id: "CHK-31",
    name: "42.5T retention baseline present, barrel-exported, and 42.5O re-export wired",
    run() {
      const moduleDir = path.join(opsRoot, "compliance/retention");
      const complianceBarrel = path.join(opsRoot, "compliance/index.ts");
      const harnessPresent = fs.existsSync(path.join(moduleDir, "retentionBaseline.ts"));
      const barrelPresent = fs.existsSync(path.join(moduleDir, "index.ts"));
      const complianceExportsRetention =
        fs.existsSync(complianceBarrel) && read("ops/compliance/index.ts").includes("./retention");
      const modules = loadSpineModules();
      const categories = modules.retention.RETENTION_BASELINE.map((entry) => entry.category);
      const expected = [
        "hipaa-documentation",
        "soc2-evidence-logs",
        "security-incident-logs",
        "application-system-logs",
      ];
      const hasAllCategories = expected.every((category) => categories.includes(category));
      const exported = probeHelpers.retentionBaseline;
      const hasExports =
        Array.isArray(exported?.RETENTION_BASELINE) &&
        typeof exported?.retentionBaselineLookup?.getBaseline === "function" &&
        typeof exported?.retentionBaselineLookup?.getHipaaDocumentationFloorDays === "function";
      const pass =
        harnessPresent && barrelPresent && complianceExportsRetention && hasAllCategories && hasExports;
      return pass
        ? {
            status: "PASS",
            detail: "42.5T retention baseline wired through compliance barrel and 42.5O re-export",
            evidence: { categories: categories.length },
          }
        : {
            status: "FAIL",
            detail: "42.5T retention baseline missing or categories incomplete",
            evidence: { harnessPresent, barrelPresent, complianceExportsRetention, hasAllCategories, hasExports },
          };
    },
  },
  {
    id: "CHK-32",
    name: "42.5T FM-1 resolver binding tests pass against existing 42.5D + 42.5H resolver",
    run() {
      const modules = loadSpineModules();
      const bindingResult = modules.retention.executeRetentionBaselineFM1BindingTests();
      return bindingResult.pass
        ? {
            status: "PASS",
            detail: `FM-1 binding suite green (${bindingResult.results.length} cases)`,
            evidence: { cases: bindingResult.results.length },
          }
        : {
            status: "FAIL",
            detail: "FM-1 resolver binding tests failed",
            evidence: { bindingResult },
          };
    },
  },
  {
    id: "CHK-33",
    name: "42.5T HIPAA 6-year floor invariant (2191 days, regulatoryFloor, citation)",
    run() {
      const modules = loadSpineModules();
      const lookup = modules.retention.retentionBaselineLookup;
      const floorDays = lookup.getHipaaDocumentationFloorDays();
      const hipaaEntry = lookup.getBaseline("hipaa-documentation");
      const pass =
        floorDays === 2191 &&
        hipaaEntry.durationDays === 2191 &&
        hipaaEntry.regulatoryFloor === true &&
        hipaaEntry.regulatoryCitation === "45 CFR 164.316(b)(2)(i)";
      return pass
        ? {
            status: "PASS",
            detail: "HIPAA 6-year floor invariant holds (2191 days, 45 CFR 164.316(b)(2)(i))",
            evidence: { floorDays },
          }
        : {
            status: "FAIL",
            detail: `HIPAA floor invariant broken: floorDays=${floorDays} entry=${JSON.stringify(hipaaEntry)}`,
            evidence: { floorDays, hipaaEntry },
          };
    },
  },
  {
    id: "CHK-34",
    name: "42.5U subprocessorRegistry present, barrel-exported, inventory parses",
    run() {
      const moduleDir = path.join(opsRoot, "compliance/vendors");
      const complianceBarrel = path.join(opsRoot, "compliance/index.ts");
      const harnessPresent = fs.existsSync(path.join(moduleDir, "subprocessorRegistry.ts"));
      const inventoryPresent = fs.existsSync(path.join(moduleDir, "SUBPROCESSOR_INVENTORY.json"));
      const barrelPresent = fs.existsSync(path.join(moduleDir, "index.ts"));
      const complianceExportsVendors =
        fs.existsSync(complianceBarrel) && read("ops/compliance/index.ts").includes("./vendors");
      const modules = loadSpineModules();
      const staticResult = modules.vendors.executeSubprocessorRegistryStaticConstructionTests();
      const exported = probeHelpers.subprocessorRegistry;
      const hasMethods =
        typeof exported?.assertBaaOnFile === "function" &&
        typeof exported?.getSubprocessor === "function" &&
        typeof exported?.listAllSubprocessors === "function" &&
        typeof exported?.listPhiAuthorizedSubprocessors === "function" &&
        typeof exported?.proveOutboundPhiBoundary === "function";
      let inventory;
      try {
        inventory = JSON.parse(read("ops/compliance/vendors/SUBPROCESSOR_INVENTORY.json"));
      } catch (error) {
        return { status: "FAIL", detail: `Inventory parse error: ${error.message}`, evidence: null };
      }
      const categories = new Set(inventory.map((entry) => entry.category));
      const requiredCategories = [
        "cloud-hosting",
        "database",
        "authentication",
        "email",
        "monitoring",
        "error-tracking",
        "backup-dr",
        "llm-ai-endpoint",
        "other",
      ];
      const hasCategories = requiredCategories.every((category) => categories.has(category));
      const pass =
        harnessPresent &&
        inventoryPresent &&
        barrelPresent &&
        complianceExportsVendors &&
        hasMethods &&
        staticResult.pass &&
        Array.isArray(inventory) &&
        inventory.length > 0 &&
        hasCategories;
      return pass
        ? {
            status: "PASS",
            detail: `42.5U subprocessorRegistry wired (inventory=${inventory.length}, static=${staticResult.results.length})`,
            evidence: { inventoryCount: inventory.length },
          }
        : {
            status: "FAIL",
            detail: "42.5U subprocessorRegistry missing, inventory incomplete, or static suite failed",
            evidence: { harnessPresent, inventoryPresent, hasMethods, staticResult, hasCategories },
          };
    },
  },
  {
    id: "CHK-35",
    name: "42.5U containsVerticalComplianceLogic:false on every .ts file in vendors/",
    run() {
      const dir = path.join("ops", "compliance/vendors");
      const files = listFiles(dir, (file) => /\.ts$/.test(file) && !file.includes("StaticConstructionTests"));
      const violations = [];
      for (const file of files) {
        const source = read(file);
        if (!source.includes("containsVerticalComplianceLogic: false")) {
          violations.push(`${file} (missing containsVerticalComplianceLogic: false)`);
        }
      }
      return violations.length === 0
        ? { status: "PASS", detail: "42.5U namespace contract annotations present", evidence: { files: files.length } }
        : { status: "FAIL", detail: violations.join("; "), evidence: { violations } };
    },
  },
  {
    id: "CHK-36",
    name: "42.5U LLM rule invariant + D0 subprocessor boundary proof",
    run() {
      const modules = loadSpineModules();
      const llmValidation = modules.vendors.validateInventoryLlmRule();
      const generatorPath = "scripts/d0-evidence-subprocessor-boundary.js";
      if (!fs.existsSync(path.join(root, generatorPath))) {
        return { status: "FAIL", detail: `Missing generator: ${generatorPath}`, evidence: null };
      }
      try {
        execSync("node scripts/d0-evidence-subprocessor-boundary.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      } catch (error) {
        return {
          status: "FAIL",
          detail: `d0 generator failed: ${(error.stdout || error.message || "").slice(0, 300)}`,
          evidence: null,
        };
      }
      const evidencePath = "ops/compliance/vendors/D0_EVIDENCE.json";
      if (!fs.existsSync(path.join(root, evidencePath))) {
        return { status: "FAIL", detail: `Missing artifact: ${evidencePath}`, evidence: null };
      }
      let parsed;
      try {
        parsed = JSON.parse(read(evidencePath));
      } catch (error) {
        return { status: "FAIL", detail: `D0_EVIDENCE.json parse error: ${error.message}`, evidence: null };
      }
      const pass = llmValidation.pass && parsed.pass === true && parsed.violationCount === 0;
      return pass
        ? {
            status: "PASS",
            detail: `Subprocessor D0 evidence valid (flows=${parsed.totalFlows}, violations=0, LLM rule OK)`,
            evidence: { totalFlows: parsed.totalFlows },
          }
        : {
            status: "FAIL",
            detail: `LLM validation or D0 failed: llm=${llmValidation.pass} d0.pass=${parsed.pass}`,
            evidence: { llmValidation, parsed },
          };
    },
  },
  {
    id: "CHK-37",
    name: "42.5V HIPAA pack present; docs with DRAFT banners; RISK_ANALYSIS 42.5K-PENDING",
    run() {
      const packDir = path.join(opsRoot, "compliance/overlays/hipaa/pack");
      const docsDir = path.join(root, "docs/trust/hipaa");
      const requiredPackFiles = [
        "hipaaPackScopeBoundary.ts",
        "hipaaPackScopeBoundary.staticTests.ts",
        "index.ts",
      ];
      const requiredDocs = [
        "HIPAA_PACK_README.md",
        "RISK_ANALYSIS.md",
        "RISK_MANAGEMENT_PLAN.md",
        "POLICY_SET.md",
        "BAA_TEMPLATE_REFERENCE.md",
        "SUBCONTRACTOR_BAA_DRAFT.md",
        "TRAINING_ATTESTATION_LOG.md",
        "INCIDENT_RESPONSE_RUNBOOK.md",
        "SCOPE_STATEMENT.md",
      ];
      const draftHeader =
        "> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**";
      const draftFooter =
        "> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this document may be presented to a regulator, an auditor, a customer, a Business Associate, or any external party.";
      const packMissing = requiredPackFiles.filter((file) => !fs.existsSync(path.join(packDir, file)));
      const docsMissing = requiredDocs.filter((file) => !fs.existsSync(path.join(docsDir, file)));
      const bannerViolations = [];
      for (const doc of requiredDocs) {
        const content = read(`docs/trust/hipaa/${doc}`);
        if (!content.includes(draftHeader) || !content.includes(draftFooter)) {
          bannerViolations.push(`${doc} missing DRAFT banner header or footer`);
        }
      }
      const riskAnalysis = read("docs/trust/hipaa/RISK_ANALYSIS.md");
      const has42_5KPending = riskAnalysis.includes("42.5K-PENDING");
      const pass =
        packMissing.length === 0 && docsMissing.length === 0 && bannerViolations.length === 0 && has42_5KPending;
      return pass
        ? {
            status: "PASS",
            detail: "42.5V HIPAA pack and documentation present with DRAFT banners",
            evidence: { docCount: requiredDocs.length },
          }
        : {
            status: "FAIL",
            detail: `42.5V pack/docs incomplete: pack=${packMissing.join(",")} docs=${docsMissing.join(",")} banners=${bannerViolations.join("; ")} 42.5K-PENDING=${has42_5KPending}`,
            evidence: { packMissing, docsMissing, bannerViolations, has42_5KPending },
          };
    },
  },
  {
    id: "CHK-38",
    name: "42.5V hipaaPackScopeBoundary static tests + D0 evidence + annotations",
    run() {
      const modules = loadSpineModules();
      const staticResult = modules.hipaaPackStaticTests.executeHipaaPackScopeBoundaryStaticConstructionTests();
      const helperSource = read("ops/compliance/overlays/hipaa/pack/hipaaPackScopeBoundary.ts");
      const hasAnnotations =
        helperSource.includes("executable: false") &&
        helperSource.includes("containsVerticalComplianceLogic: false");
      const generatorPath = "scripts/d0-evidence-hipaa-pack.js";
      if (!fs.existsSync(path.join(root, generatorPath))) {
        return { status: "FAIL", detail: `Missing generator: ${generatorPath}`, evidence: null };
      }
      try {
        execSync("node scripts/d0-evidence-hipaa-pack.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      } catch (error) {
        return {
          status: "FAIL",
          detail: `d0 generator failed: ${(error.stdout || error.message || "").slice(0, 300)}`,
          evidence: null,
        };
      }
      const evidencePath = "ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json";
      if (!fs.existsSync(path.join(root, evidencePath))) {
        return { status: "FAIL", detail: `Missing artifact: ${evidencePath}`, evidence: null };
      }
      let parsed;
      try {
        parsed = JSON.parse(read(evidencePath));
      } catch (error) {
        return { status: "FAIL", detail: `D0 evidence parse error: ${error.message}`, evidence: null };
      }
      const pass =
        staticResult.pass &&
        hasAnnotations &&
        parsed.totalCases === 9 &&
        parsed.passCount === 9 &&
        parsed.failCount === 0;
      return pass
        ? {
            status: "PASS",
            detail: `HIPAA pack D0 evidence valid (cases=9, static=${staticResult.results.length})`,
            evidence: { passCount: parsed.passCount },
          }
        : {
            status: "FAIL",
            detail: `Static or D0 failed: static=${staticResult.pass} d0=${parsed.passCount}/${parsed.totalCases}`,
            evidence: { staticResult, parsed, hasAnnotations },
          };
    },
  },
  {
    id: "CHK-39",
    name: "42.5V scope-alignment invariant on getDeclaredPackScope",
    run() {
      const modules = loadSpineModules();
      const scope = modules.hipaaPack.hipaaPackScopeBoundary.getDeclaredPackScope();
      const soc1 = modules.socScopeBoundary.socScopeBoundary.getDeclaredBoundary();
      const expectedInScope = ["A", "C", "D-incident-only"];
      const expectedOutOfScope = ["B", "D-full", "E"];
      const subpartsOk =
        expectedInScope.every((subpart) => scope.subpartsInScope.includes(subpart)) &&
        scope.subpartsInScope.length === expectedInScope.length;
      const outOfScopeOk = expectedOutOfScope.every((subpart) => scope.subpartsOutOfScope.includes(subpart));
      const counselOk = scope.counselReviewStatus === "pending-42.6E";
      const allowedPrefixes = [...soc1.spineNamespaces, ...soc1.overlayNamespaces];
      const namespacesAligned = [...scope.spineNamespaces, ...scope.overlayNamespaces].every((namespace) =>
        allowedPrefixes.some((prefix) => namespace === prefix || namespace.startsWith(prefix)),
      );
      const pass = subpartsOk && outOfScopeOk && counselOk && namespacesAligned;
      return pass
        ? {
            status: "PASS",
            detail: "HIPAA pack declared scope aligned with SOC1 boundary and overlay contract",
            evidence: { subpartsInScope: scope.subpartsInScope },
          }
        : {
            status: "FAIL",
            detail: `Scope invariant broken: subparts=${subpartsOk} out=${outOfScopeOk} counsel=${counselOk} ns=${namespacesAligned}`,
            evidence: { scope, soc1 },
          };
    },
  },
  {
    id: "CHK-40",
    name: "42.5W NPRM register present; docs with DRAFT + NPRM STATUS banners; NGR-01..08",
    run() {
      const nprmDir = path.join(opsRoot, "compliance/overlays/hipaa/nprm");
      const docsDir = path.join(root, "docs/trust/hipaa/nprm");
      const requiredNprmFiles = [
        "nprmGapRegister.ts",
        "nprmGapRegister.staticTests.ts",
        "index.ts",
        "NPRM_LOCK_TIME_STATUS.json",
        "D0_NPRM_REGISTER_EVIDENCE.json",
      ];
      const requiredDocs = [
        "NPRM_GAP_REGISTER_README.md",
        "NPRM_GAP_REGISTER.md",
        "CONTINGENCY_TRIGGER_RUNBOOK.md",
        "SECONDARY_SOURCE_DISCARD_LOG.md",
      ];
      const draftHeader =
        "> **DRAFT — FOUNDER-AUTHORED. NOT COUNSEL-REVIEWED. NOT A CERTIFICATION.**";
      const draftFooter =
        "> **END DRAFT.** Counsel review and HIPAA legal sign-off required before this gap register may inform any external positioning, customer commitment, or compliance representation.";
      const nprmStatusBanner =
        "> **NPRM STATUS — NOT FINAL.** The HIPAA Security Rule Notice of Proposed Rulemaking (RIN 0945-AA22, 90 FR 800, published Jan 6 2025) is a PROPOSED rule.";
      const nprmMissing = requiredNprmFiles.filter((file) => !fs.existsSync(path.join(nprmDir, file)));
      const docsMissing = requiredDocs.filter((file) => !fs.existsSync(path.join(docsDir, file)));
      const bannerViolations = [];
      for (const doc of requiredDocs) {
        const content = read(`docs/trust/hipaa/nprm/${doc}`);
        if (!content.includes(draftHeader) || !content.includes(draftFooter) || !content.includes(nprmStatusBanner)) {
          bannerViolations.push(`${doc} missing DRAFT or NPRM STATUS banner`);
        }
      }
      const registerMd = read("docs/trust/hipaa/nprm/NPRM_GAP_REGISTER.md");
      const mandatoryRows = ["NGR-01", "NGR-02", "NGR-03", "NGR-04", "NGR-05", "NGR-06", "NGR-07", "NGR-08"];
      const missingRows = mandatoryRows.filter((rowId) => !registerMd.includes(rowId));
      const pass =
        nprmMissing.length === 0 && docsMissing.length === 0 && bannerViolations.length === 0 && missingRows.length === 0;
      return pass
        ? {
            status: "PASS",
            detail: "42.5W NPRM register and documentation present with banners and mandatory rows",
            evidence: { docCount: requiredDocs.length },
          }
        : {
            status: "FAIL",
            detail: `42.5W incomplete: nprm=${nprmMissing.join(",")} docs=${docsMissing.join(",")} banners=${bannerViolations.join("; ")} rows=${missingRows.join(",")}`,
            evidence: { nprmMissing, docsMissing, bannerViolations, missingRows },
          };
    },
  },
  {
    id: "CHK-41",
    name: "42.5W nprmGapRegister static tests + D0 evidence + annotations",
    run() {
      const modules = loadSpineModules();
      const staticResult = modules.nprmRegisterStaticTests.executeNprmGapRegisterStaticConstructionTests();
      const helperSource = read("ops/compliance/overlays/hipaa/nprm/nprmGapRegister.ts");
      const hasAnnotations =
        helperSource.includes("executable: false") &&
        helperSource.includes("containsVerticalComplianceLogic: false");
      const generatorPath = "scripts/d0-evidence-nprm-register.js";
      if (!fs.existsSync(path.join(root, generatorPath))) {
        return { status: "FAIL", detail: `Missing generator: ${generatorPath}`, evidence: null };
      }
      try {
        execSync("node scripts/d0-evidence-nprm-register.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      } catch (error) {
        return {
          status: "FAIL",
          detail: `d0 generator failed: ${(error.stdout || error.message || "").slice(0, 300)}`,
          evidence: null,
        };
      }
      const evidencePath = "ops/compliance/overlays/hipaa/nprm/D0_NPRM_REGISTER_EVIDENCE.json";
      if (!fs.existsSync(path.join(root, evidencePath))) {
        return { status: "FAIL", detail: `Missing artifact: ${evidencePath}`, evidence: null };
      }
      let parsed;
      try {
        parsed = JSON.parse(read(evidencePath));
      } catch (error) {
        return { status: "FAIL", detail: `D0 evidence parse error: ${error.message}`, evidence: null };
      }
      const pass =
        staticResult.pass &&
        hasAnnotations &&
        parsed.totalCases === 9 &&
        parsed.passCount === 9 &&
        parsed.failCount === 0;
      return pass
        ? {
            status: "PASS",
            detail: `NPRM register D0 evidence valid (cases=9, static=${staticResult.results.length})`,
            evidence: { passCount: parsed.passCount },
          }
        : {
            status: "FAIL",
            detail: `Static or D0 failed: static=${staticResult.pass} d0=${parsed.passCount}/${parsed.totalCases}`,
            evidence: { staticResult, parsed, hasAnnotations },
          };
    },
  },
  {
    id: "CHK-42",
    name: "42.5W NPRM not-final invariant + EXIT-54.5 ownership invariant",
    run() {
      const modules = loadSpineModules();
      const lockStatus = modules.nprmRegister.nprmGapRegister.getLockTimeStatus();
      const lockJson = JSON.parse(read("ops/compliance/overlays/hipaa/nprm/NPRM_LOCK_TIME_STATUS.json"));
      const expectedFrUrl =
        "https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule-to-strengthen-the-cybersecurity-of-electronic-protected-health-information";
      const isFinalOk = lockStatus.isFinal === false && lockJson.isFinal === false;
      const frUrlOk = lockJson.federalRegisterUrl === expectedFrUrl;
      const registerMd = read("docs/trust/hipaa/nprm/NPRM_GAP_REGISTER.md");
      const rowLines = registerMd.split("\n").filter((line) => /^\| NGR-\d{2} \|/.test(line.trim()));
      const ownershipViolations = [];
      const urlViolations = [];
      for (const line of rowLines) {
        const cells = line.split("|").map((cell) => cell.trim());
        const rowId = cells[1];
        const owner = cells[8] ?? "";
        const primarySourceUrl = cells[5] ?? "";
        if (!owner || owner.length === 0) {
          ownershipViolations.push(rowId);
        }
        const urlOk =
          primarySourceUrl.includes("federalregister.gov") ||
          primarySourceUrl.includes("reginfo.gov") ||
          /hhs\.gov\/hipaa/i.test(primarySourceUrl);
        if (!urlOk) {
          urlViolations.push(rowId);
        }
      }
      const pass =
        isFinalOk &&
        frUrlOk &&
        rowLines.length >= 8 &&
        ownershipViolations.length === 0 &&
        urlViolations.length === 0;
      return pass
        ? {
            status: "PASS",
            detail: `NPRM not-final invariant OK; ${rowLines.length} register rows all owned with primary URLs`,
            evidence: { rowCount: rowLines.length, verifiedAtBuildTime: lockJson.verifiedAtBuildTime },
          }
        : {
            status: "FAIL",
            detail: `NPRM invariant broken: isFinal=${isFinalOk} frUrl=${frUrlOk} rows=${rowLines.length} unowned=${ownershipViolations.join(",")} badUrl=${urlViolations.join(",")}`,
            evidence: { lockStatus, lockJson, ownershipViolations, urlViolations },
          };
    },
  },
  {
    id: "CHK-43",
    name: "42.5X trust-package present; public-drafts docs; no docs/trust/public/ content",
    run() {
      const packageDir = path.join(opsRoot, "compliance/trust-package");
      const docsDir = path.join(root, "docs/trust/public-drafts");
      const publicDir = path.join(root, "docs/trust/public");
      const requiredPackageFiles = [
        "trustPackagePublishGate.ts",
        "trustPackagePublishGate.staticTests.ts",
        "index.ts",
        "D0_TRUST_PACKAGE_EVIDENCE.json",
      ];
      const requiredDocs = [
        "README.md",
        "TRUST_PAGE_DRAFT.md",
        "SIG_LITE_ANSWERS_DRAFT.md",
        "CAIQ_ANSWERS_DRAFT.md",
        "DATA_RESIDENCY_STATEMENT_DRAFT.md",
        "HIPAA_ATTESTATION_LETTER_DRAFT.md",
      ];
      const draftHeader = "> **DRAFT — NOT PUBLISHED. PUBLISH PROHIBITED UNTIL PHASE 42.6J (GL-5).**";
      const draftFooter =
        "> **END DRAFT.** Trust package publication occurs ONLY at Phase 42.6J after (a) SOC reports issued at 42.6C, (b) HIPAA counsel sign-off at 42.6E, and (c) GL-5 full-launch gate satisfied.";
      const packageMissing = requiredPackageFiles.filter((file) => !fs.existsSync(path.join(packageDir, file)));
      const docsMissing = requiredDocs.filter((file) => !fs.existsSync(path.join(docsDir, file)));
      const bannerViolations = [];
      for (const doc of requiredDocs) {
        const content = read(`docs/trust/public-drafts/${doc}`);
        if (!content.includes(draftHeader) || !content.includes(draftFooter)) {
          bannerViolations.push(`${doc} missing DRAFT + PUBLISH-PROHIBITED banner`);
        }
      }
      let publicDirViolation = false;
      if (fs.existsSync(publicDir)) {
        const publicEntries = fs.readdirSync(publicDir);
        publicDirViolation = publicEntries.length > 0;
      }
      const pass =
        packageMissing.length === 0 &&
        docsMissing.length === 0 &&
        bannerViolations.length === 0 &&
        !publicDirViolation;
      return pass
        ? {
            status: "PASS",
            detail: "42.5X trust package drafts present; docs/trust/public/ empty or absent",
            evidence: { docCount: requiredDocs.length },
          }
        : {
            status: "FAIL",
            detail: `42.5X incomplete: pkg=${packageMissing.join(",")} docs=${docsMissing.join(",")} banners=${bannerViolations.join("; ")} public=${publicDirViolation}`,
            evidence: { packageMissing, docsMissing, bannerViolations, publicDirViolation },
          };
    },
  },
  {
    id: "CHK-44",
    name: "42.5X trustPackagePublishGate static tests + D0 evidence + annotations",
    run() {
      const modules = loadSpineModules();
      const staticResult = modules.trustPackageStaticTests.executeTrustPackagePublishGateStaticConstructionTests();
      const helperSource = read("ops/compliance/trust-package/trustPackagePublishGate.ts");
      const hasAnnotations =
        helperSource.includes("executable: false") &&
        helperSource.includes("containsVerticalComplianceLogic: false");
      const generatorPath = "scripts/d0-evidence-trust-package.js";
      if (!fs.existsSync(path.join(root, generatorPath))) {
        return { status: "FAIL", detail: `Missing generator: ${generatorPath}`, evidence: null };
      }
      try {
        execSync("node scripts/d0-evidence-trust-package.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      } catch (error) {
        return {
          status: "FAIL",
          detail: `d0 generator failed: ${(error.stdout || error.message || "").slice(0, 300)}`,
          evidence: null,
        };
      }
      const evidencePath = "ops/compliance/trust-package/D0_TRUST_PACKAGE_EVIDENCE.json";
      if (!fs.existsSync(path.join(root, evidencePath))) {
        return { status: "FAIL", detail: `Missing artifact: ${evidencePath}`, evidence: null };
      }
      let parsed;
      try {
        parsed = JSON.parse(read(evidencePath));
      } catch (error) {
        return { status: "FAIL", detail: `D0 evidence parse error: ${error.message}`, evidence: null };
      }
      const pass =
        staticResult.pass &&
        hasAnnotations &&
        parsed.totalCases === 9 &&
        parsed.passCount === 9 &&
        parsed.failCount === 0;
      return pass
        ? {
            status: "PASS",
            detail: `Trust package D0 evidence valid (cases=9, static=${staticResult.results.length})`,
            evidence: { passCount: parsed.passCount },
          }
        : {
            status: "FAIL",
            detail: `Static or D0 failed: static=${staticResult.pass} d0=${parsed.passCount}/${parsed.totalCases}`,
            evidence: { staticResult, parsed, hasAnnotations },
          };
    },
  },
  {
    id: "CHK-45",
    name: "42.5X benchmark-not-target invariant + placeholder gate whitelist (LOCK-42.5.9)",
    run() {
      const requiredDocs = [
        "README.md",
        "TRUST_PAGE_DRAFT.md",
        "SIG_LITE_ANSWERS_DRAFT.md",
        "CAIQ_ANSWERS_DRAFT.md",
        "DATA_RESIDENCY_STATEMENT_DRAFT.md",
        "HIPAA_ATTESTATION_LETTER_DRAFT.md",
      ];
      const forbiddenBenchmarkPhrases = [
        "target threshold",
        "pass/fail threshold",
        "compliance commitment",
        "guaranteed SLA",
        "we will achieve",
        "certified to",
      ];
      const forbiddenNprmPhrases = ["PROPOSED", "would require", "if finalized"];
      const allowedFillGates = new Set(["42.6C", "42.6E", "42.6J"]);
      const violations = [];
      for (const doc of requiredDocs) {
        const content = read(`docs/trust/public-drafts/${doc}`);
        for (const phrase of forbiddenBenchmarkPhrases) {
          if (content.toLowerCase().includes(phrase.toLowerCase())) {
            violations.push(`${doc}: forbidden phrase "${phrase}"`);
          }
        }
        for (const phrase of forbiddenNprmPhrases) {
          if (content.includes(phrase)) {
            violations.push(`${doc}: nprm-domain phrase "${phrase}"`);
          }
        }
        const placeholders = content.match(/\[([^\]]*FILL AT 42\.6[^\]]*)\]/g) ?? [];
        for (const token of placeholders) {
          const gateMatch = token.match(/FILL AT (42\.6[A-Z0-9]+)/);
          if (!gateMatch || !allowedFillGates.has(gateMatch[1])) {
            violations.push(`${doc}: invalid placeholder gate in ${token}`);
          }
        }
      }
      const trustPage = read("docs/trust/public-drafts/TRUST_PAGE_DRAFT.md");
      const requiredPlaceholders = [
        "[REPORT_ISSUANCE_DATE — FILL AT 42.6J]",
        "[OBSERVATION_WINDOW_START_DATE — FILL AT 42.6J]",
        "[OBSERVATION_WINDOW_END_DATE — FILL AT 42.6J]",
        "[ATTESTATION_LETTER_DATE — FILL AT 42.6E]",
        "[SECURITY_CONTACT — FILL AT 42.6J]",
      ];
      const missingPlaceholders = requiredPlaceholders.filter((token) => !trustPage.includes(token));
      if (missingPlaceholders.length > 0) {
        violations.push(`TRUST_PAGE missing placeholders: ${missingPlaceholders.join(", ")}`);
      }
      const pass = violations.length === 0;
      return pass
        ? {
            status: "PASS",
            detail: "Benchmark-not-target and placeholder invariants satisfied across public-drafts",
            evidence: { docCount: requiredDocs.length },
          }
        : {
            status: "FAIL",
            detail: violations.join("; "),
            evidence: { violations },
          };
    },
  },
];

function runAllChecks() {
  const results = checks.map((check) => {
    try {
      const outcome = check.run();
      return { id: check.id, name: check.name, ...outcome };
    } catch (error) {
      return {
        id: check.id,
        name: check.name,
        status: "FAIL",
        detail: error.message,
        evidence: { stack: error.stack },
      };
    }
  });
  const failed = results.filter((r) => r.status === "FAIL").length;
  const passed = results.filter((r) => r.status === "PASS").length;
  return { passed, failed, results };
}

module.exports = {
  checks,
  runAllChecks,
  loadSpineModules,
  createProbeHelpers,
  mandatoryPoisonCases,
  isolationEvaluator: probeHelpers.isolationEvaluator,
  rbacEvaluator: probeHelpers.rbacEvaluator,
  phiBoundaryHarness: probeHelpers.phiBoundaryHarness,
  panelDataPathHarness: probeHelpers.panelDataPathHarness,
  phiIngestionGate: probeHelpers.phiIngestionGate,
  overlayActivationRegistry: probeHelpers.overlayActivationRegistry,
  hipaaOverlay: probeHelpers.hipaaOverlay,
  auditSpine: probeHelpers.auditSpine,
  encryption: probeHelpers.encryption,
  subprocessorRegistry: probeHelpers.subprocessorRegistry,
  socScopeBoundary: probeHelpers.socScopeBoundary,
  tscScopeBoundary: probeHelpers.tscScopeBoundary,
  retentionBaseline: probeHelpers.retentionBaseline,
  hipaaPackScopeBoundary: probeHelpers.hipaaPackScopeBoundary,
  nprmGapRegister: probeHelpers.nprmGapRegister,
  trustPackagePublishGate: probeHelpers.trustPackagePublishGate,
};

if (require.main === module) {
  const { passed, failed, results } = runAllChecks();
  results.forEach((r) => {
    console.log(`${r.status}  ${r.id}  ${r.name}${r.status === "FAIL" ? `\n        ${r.detail}` : ""}`);
  });
  console.log(`\nVERIFY_EXIT:${failed === 0 ? 0 : 1}  passed=${passed} failed=${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}
