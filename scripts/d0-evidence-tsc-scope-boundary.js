/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5R — D0 TSC scope boundary evidence generator (executable).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const opsRoot = path.join(root, "ops");
const INPUT_PATH = path.join(root, "docs/trust/soc2/TSC_SCOPE_DECLARATION.json");
const OUTPUT_PATH = path.join(root, "ops/compliance/soc/soc2/D0_EVIDENCE.json");

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

function loadTscScopeModule() {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, "compliance/soc/soc2/index.ts"));
}

function generateD0Evidence() {
  const { tscScopeBoundary } = loadTscScopeModule();
  const input = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
  const assertion = tscScopeBoundary.assertTscBoundaryAligned(input);
  const namespacesOutsideCount = assertion.evidence.namespacesOutsideSoc1.length;

  return {
    generatedAtIso: "2026-06-20T16:00:00.000Z",
    module: "42.5R",
    scopeId: input.scopeId,
    decision: assertion.decision,
    reason: assertion.reason,
    criteriaCount: input.criteriaInScope.length,
    criteriaInScope: input.criteriaInScope,
    namespacesInScopeCount: input.namespacesInScope.length,
    namespacesOutsideCount,
    namespacesOutsideSoc1: assertion.evidence.namespacesOutsideSoc1,
    pass: assertion.decision === "ALLOW" && namespacesOutsideCount === 0,
  };
}

module.exports = { generateD0Evidence, INPUT_PATH, OUTPUT_PATH };

if (require.main === module) {
  const result = generateD0Evidence();
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    `D0_TSC_SCOPE_EVIDENCE:${result.decision === "ALLOW" ? 0 : 1}  criteria=${result.criteriaCount} outside=${result.namespacesOutsideCount}`,
  );
  process.exit(result.decision === "ALLOW" ? 0 : 1);
}
