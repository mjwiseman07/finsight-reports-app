/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5P — D0 panel data path evidence generator (executable).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const opsRoot = path.join(root, "ops");
const OUTPUT_PATH = path.join(
  root,
  "ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json",
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

function loadPanelHarnessModule() {
  ensureTypeScriptLoader();
  return require(path.join(
    opsRoot,
    "control-spine/verification/panel-data-paths/index.ts",
  ));
}

const PANEL_MATRIX = [
  {
    panelId: "panel:command-center:healthcare-ppd",
    tenantId: "tenant-d0-healthcare-a",
    persona: "firm-staff",
    overlayActive: ["hipaa"],
    renderedFields: [
      {
        fieldId: "field:ppd-balance",
        taxonomy: "financial-summary",
        phi: false,
        sourceTenantId: "tenant-d0-healthcare-a",
      },
    ],
  },
  {
    panelId: "panel:command-center:generic-summary",
    tenantId: "tenant-d0-generic-b",
    persona: "firm-admin",
    overlayActive: [],
    renderedFields: [
      {
        fieldId: "field:revenue",
        taxonomy: "financial-summary",
        phi: false,
        sourceTenantId: "tenant-d0-generic-b",
      },
    ],
  },
  {
    panelId: "panel:command-center:client-ledger",
    tenantId: "tenant-d0-client-c",
    persona: "client-side",
    overlayActive: [],
    renderedFields: [
      {
        fieldId: "field:ledger-line",
        taxonomy: "client-ledger-line",
        phi: false,
        sourceTenantId: "tenant-d0-client-c",
      },
    ],
  },
];

function generateD0Evidence() {
  const { panelDataPathHarness } = loadPanelHarnessModule();
  const panelResults = PANEL_MATRIX.map((scenario) => {
    const proof = panelDataPathHarness.proveRenderedPanelBoundary(scenario);
    return {
      panelId: scenario.panelId,
      tenantId: scenario.tenantId,
      persona: scenario.persona,
      pass: proof.pass,
      violationCount: proof.violations.length,
      violations: proof.violations,
    };
  });

  const totalViolations = panelResults.reduce((sum, entry) => sum + entry.violationCount, 0);

  return {
    generatedAtIso: "2026-06-20T12:00:00.000Z",
    module: "42.5P",
    pass: totalViolations === 0,
    totalPanels: panelResults.length,
    totalViolations,
    panelResults,
  };
}

module.exports = { generateD0Evidence, OUTPUT_PATH, PANEL_MATRIX };

if (require.main === module) {
  const result = generateD0Evidence();
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    `D0_PANEL_EVIDENCE:${result.pass ? 0 : 1}  panels=${result.totalPanels} violations=${result.totalViolations}`,
  );
  process.exit(result.pass ? 0 : 1);
}
