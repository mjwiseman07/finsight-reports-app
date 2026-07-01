/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(root, "wiring-verifier-evidence.json");

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
  // Import the pure runner directly — the sibling .test.ts file imports vitest
  // which cannot be loaded from a CommonJS require() chain.
  const testModulePath = path.join(
    root,
    "architecture-lane/verifier-42-7f/wiringVerifierRunner.ts",
  );
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { runWiringVerifierTests } = require(testModulePath);
  const result = await runWiringVerifierTests();
  fs.writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`);
  console.log(
    `Wiring verifier: ${result.passCount}/${result.totalCases} assertions passed, ${result.failCount} failed`,
  );
  console.log(`Matrix cases: ${require(path.join(root, "architecture-lane/verifier-42-7f/caseMatrix.ts")).WIRING_CASES.length}`);
  console.log(`Evidence written to ${evidencePath}`);
  if (result.failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
