/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(root, "audit-log-evidence.json");

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
    "lib/intelligence/synthetic/standards/audit/__tests__/auditLog.test.ts",
  );
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { runAuditLogTests } = require(testModulePath);
  if (typeof runAuditLogTests !== "function") {
    throw new Error("Missing export runAuditLogTests");
  }

  const result = await runAuditLogTests();
  fs.writeFileSync(evidencePath, `${JSON.stringify(result, null, 2)}\n`);

  console.log(
    `Audit log tests: ${result.passCount}/${result.totalCases} passed, ${result.failCount} failed`,
  );
  console.log(`Evidence written to ${evidencePath}`);

  if (result.failCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("FAIL audit log tests:", error);
  process.exit(1);
});
