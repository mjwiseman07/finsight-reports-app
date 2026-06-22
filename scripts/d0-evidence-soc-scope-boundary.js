/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5Q — D0 SOC scope boundary evidence generator (executable).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const opsRoot = path.join(root, "ops");
const INPUT_PATH = path.join(root, "docs/trust/soc1/BOUNDARY_DIAGRAM_INPUT.json");
const OUTPUT_PATH = path.join(root, "ops/compliance/soc/soc1/D0_EVIDENCE.json");

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

function loadSocScopeModule() {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, "compliance/soc/soc1/index.ts"));
}

function generateD0Evidence() {
  const { socScopeBoundary } = loadSocScopeModule();
  const input = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
  const assertion = socScopeBoundary.assertPhiFlagged(input);
  const unflaggedCount = assertion.evidence.unflaggedPhiNodes.length;

  return {
    generatedAtIso: "2026-06-20T14:00:00.000Z",
    module: "42.5Q",
    diagramId: input.diagramId,
    decision: assertion.decision,
    reason: assertion.reason,
    totalNodes: input.nodes.length,
    unflaggedCount,
    unflaggedPhiNodes: assertion.evidence.unflaggedPhiNodes,
    pass: assertion.decision === "ALLOW" && unflaggedCount === 0,
  };
}

module.exports = { generateD0Evidence, INPUT_PATH, OUTPUT_PATH };

if (require.main === module) {
  const result = generateD0Evidence();
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    `D0_SOC_SCOPE_EVIDENCE:${result.decision === "ALLOW" ? 0 : 1}  nodes=${result.totalNodes} unflagged=${result.unflaggedCount}`,
  );
  process.exit(result.decision === "ALLOW" ? 0 : 1);
}
