/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5Y — D0 overlay-extensibility spec-gate evidence generator (executable).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const opsRoot = path.join(root, "ops");
const OUTPUT_PATH = path.join(
  opsRoot,
  "compliance/overlay-extensibility/D0_OVERLAY_EXTENSIBILITY_EVIDENCE.json",
);

let typeScriptLoaderRegistered = false;

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

function loadOverlayExtensibilityModule() {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, "compliance/overlay-extensibility/index.ts"));
}

function baseSpec(overrides = {}) {
  return {
    overlayRegistryKey: "overlay:test:d0",
    targetSlotReferenceId: "slot:audit_logging_event_interface",
    activationScopeReferenceId: "scope:test:activation",
    regulatoryScopeStatementReferenceId: "scope-statement:test",
    precedenceConfigurationReferenceId: "scope:precedence:default-most-restrictive",
    overlayNamespace: "ops/compliance/overlays/test/",
    spineModificationAttempted: false,
    verticalComplianceLogicInSpine: false,
    citedD0EvidencePaths: ["ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json"],
    illustrationStatus: "spec_only",
    ...overrides,
  };
}

function runCase(id, runFn, expected) {
  const outcome = runFn();
  const pass = outcome.decision === expected && outcome.mutationRejected !== false;
  return {
    id,
    decision: outcome.decision,
    expected,
    outcome: pass ? "PASS" : "FAIL",
    reason: outcome.reason ?? "",
    ...(outcome.mutationRejected !== undefined ? { mutationRejected: outcome.mutationRejected } : {}),
  };
}

function generateD0Evidence() {
  const { overlayExtensibilitySpecGate } = loadOverlayExtensibilityModule();
  const cases = [];

  cases.push(
    runCase("OESE-01", () => overlayExtensibilitySpecGate.assertAttachmentSpecValid(baseSpec()), "ALLOW"),
  );
  cases.push(
    runCase(
      "OESE-02",
      () =>
        overlayExtensibilitySpecGate.assertAttachmentSpecValid(
          baseSpec({ spineModificationAttempted: true }),
        ),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "OESE-03",
      () =>
        overlayExtensibilitySpecGate.assertAttachmentSpecValid(
          baseSpec({ verticalComplianceLogicInSpine: true }),
        ),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "OESE-04",
      () =>
        overlayExtensibilitySpecGate.assertAttachmentSpecValid(
          baseSpec({ overlayNamespace: "ops/control-spine/bad/" }),
        ),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "OESE-05",
      () =>
        overlayExtensibilitySpecGate.assertAttachmentSpecValid(
          baseSpec({ citedD0EvidencePaths: ["ops/compliance/missing/D0.json"] }),
        ),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "OESE-06",
      () =>
        overlayExtensibilitySpecGate.assertSecondOverlayFm2Gate({
          activeOverlayRegistryKeys: ["overlay:hipaa:42.5J"],
          proposedOverlay: baseSpec({
            overlayRegistryKey: "overlay:pci-dss:illustration-42.5Y",
            overlayNamespace: "ops/compliance/overlays/pci-dss/",
          }),
          fm2PrecedenceGateDeclared: false,
          precedencePolicy: "most_restrictive_wins",
        }),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "OESE-07",
      () =>
        overlayExtensibilitySpecGate.assertSecondOverlayFm2Gate({
          activeOverlayRegistryKeys: ["overlay:hipaa:42.5J"],
          proposedOverlay: baseSpec({
            overlayRegistryKey: "overlay:pci-dss:illustration-42.5Y",
            overlayNamespace: "ops/compliance/overlays/pci-dss/",
          }),
          fm2PrecedenceGateDeclared: true,
          precedencePolicy: "most_restrictive_wins",
        }),
      "ALLOW",
    ),
  );
  cases.push(
    runCase("OESE-08", () => {
      const catalog = overlayExtensibilitySpecGate.getDeclaredOverlayCatalog();
      const hipaa = catalog.find((entry) => entry.overlayRegistryKey.includes("hipaa"));
      const pci = catalog.find((entry) => entry.overlayRegistryKey.includes("pci-dss"));
      const ok =
        hipaa?.illustrationStatus === "built" &&
        pci?.illustrationStatus === "spec_only";
      return {
        decision: ok ? "ALLOW" : "DENY",
        reason: ok ? "catalog_built_vs_spec_only" : "catalog_status_mismatch",
      };
    }, "ALLOW"),
  );
  cases.push(
    runCase("OESE-09", () => {
      const catalog = overlayExtensibilitySpecGate.getDeclaredOverlayCatalog();
      const mutationRejected = !Reflect.set(catalog, "length", 0);
      return {
        decision: mutationRejected ? "ALLOW" : "DENY",
        reason: mutationRejected ? "declared_catalog_frozen" : "mutation_allowed",
        mutationRejected,
      };
    }, "ALLOW"),
  );
  cases.push(
    runCase(
      "OESE-10",
      () =>
        overlayExtensibilitySpecGate.assertAttachmentSpecValid({
          overlayRegistryKey: "overlay:hipaa:42.5J-test-missing-ref",
          targetSlotReferenceId: "",
          activationScopeReferenceId: "scope:hipaa:tenant-activation",
          regulatoryScopeStatementReferenceId: "hipaa-scope-coverage:42.5J",
          precedenceConfigurationReferenceId: "scope:precedence:default-most-restrictive",
          overlayNamespace: "ops/compliance/overlays/hipaa/",
          spineModificationAttempted: false,
          verticalComplianceLogicInSpine: false,
          citedD0EvidencePaths: ["ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json"],
          illustrationStatus: "built",
        }),
      "DENY",
    ),
  );

  const passCount = cases.filter((entry) => entry.outcome === "PASS").length;
  const failCount = cases.filter((entry) => entry.outcome === "FAIL").length;

  return {
    evidenceVersion: "42.5Y-2",
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    passCount,
    failCount,
    cases,
  };
}

module.exports = { generateD0Evidence, OUTPUT_PATH };

if (require.main === module) {
  const result = generateD0Evidence();
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`D0_OVERLAY_EXTENSIBILITY_EVIDENCE:${result.failCount === 0 ? 0 : 1}`);
  process.exit(result.failCount === 0 ? 0 : 1);
}
