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
    overlayAttachment: loadOpsModule("compliance/overlay-attachment/index.ts"),
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

  const panelDataPathHarness = {
    assertNoPhiOutsideOverlay() {
      return { awaitingModule: "42.5P" };
    },
    assertPanelOverlayScope() {
      return { awaitingModule: "42.5P" };
    },
    assertTenantScope() {
      return { awaitingModule: "42.5P" };
    },
  };

  const subprocessorRegistry = {
    assertBaaOnFile() {
      return { awaitingModule: "42.5U" };
    },
  };

  const socScopeBoundary = {
    assertPhiFlagged() {
      return { awaitingModule: "42.5Q" };
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
  const allowedSubpaths = ["phi-ingestion-gate", "verification/phi-boundary"];
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
  const allowedComplianceImportPaths = ["phi-ingestion-gate", "verification/phi-boundary"];
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
        ? { status: "PASS", detail: "42.5M and 42.5N present", evidence: { count: WAVE3_MODULES.length } }
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
};

if (require.main === module) {
  const { passed, failed, results } = runAllChecks();
  results.forEach((r) => {
    console.log(`${r.status}  ${r.id}  ${r.name}${r.status === "FAIL" ? `\n        ${r.detail}` : ""}`);
  });
  console.log(`\nVERIFY_EXIT:${failed === 0 ? 0 : 1}  passed=${passed} failed=${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}
