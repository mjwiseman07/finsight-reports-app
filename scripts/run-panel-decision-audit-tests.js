/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(root, "panel-decision-audit-evidence.json");

let typeScriptLoaderRegistered = false;

function ensureTypeScriptLoader() {
  if (typeScriptLoaderRegistered) {
    return;
  }
  require.extensions[".ts"] = function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        strict: true,
        resolveJsonModule: true,
      },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
  require.extensions[".json"] = function loadJson(module, filename) {
    module.exports = JSON.parse(fs.readFileSync(filename, "utf8"));
  };
  typeScriptLoaderRegistered = true;
}

async function main() {
  ensureTypeScriptLoader();
  const testModulePath = path.join(
    root,
    "lib/intelligence/synthetic/panel-consumer/__tests__/panelDecisionAudit.test.ts",
  );
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { runPanelDecisionAuditTests } = require(testModulePath);
  if (typeof runPanelDecisionAuditTests !== "function") {
    throw new Error("Missing export runPanelDecisionAuditTests");
  }

  const result = await runPanelDecisionAuditTests();
  fs.writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`);

  console.log(
    `Panel decision audit tests: ${result.passCount}/${result.totalCases} passed, ${result.failCount} failed`,
  );
  console.log(`Evidence written to ${evidencePath}`);

  if (result.failCount > 0) {
    process.exit(1);
  }
  if (result.totalCases < 40) {
    console.error(`Expected totalCases >= 40, got ${result.totalCases}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
