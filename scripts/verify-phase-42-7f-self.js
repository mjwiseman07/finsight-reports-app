/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7F / VC-5a meta-verifier runner.
 */
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

let typeScriptLoaderRegistered = false;

function ensureTypeScriptLoader() {
  if (typeScriptLoaderRegistered) {
    return;
  }
  require.extensions[".ts"] = function loadTypeScript(module, filename) {
    const source = require("fs").readFileSync(filename, "utf8");
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
  typeScriptLoaderRegistered = true;
}

function main() {
  ensureTypeScriptLoader();
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { runMetaVerifier } = require(
    path.join(root, "architecture-lane/verifier-42-7f/meta-verifier.ts"),
  );
  const result = runMetaVerifier();
  for (const entry of result.steps) {
    if (entry.status === "PASS") {
      console.log(`PASS ${entry.id} ${entry.name} — ${entry.detail}`);
    } else {
      console.error(`FAIL ${entry.id} ${entry.name}:`, entry.detail);
    }
  }
  if (result.failCount > 0) {
    console.error(`Phase 42.7F meta-verifier failed (${result.failCount}/${result.totalSteps} steps).`);
    process.exit(1);
  }
  console.log(`Phase 42.7F meta-verifier passed (${result.passCount}/${result.totalSteps} steps).`);
}

main();
