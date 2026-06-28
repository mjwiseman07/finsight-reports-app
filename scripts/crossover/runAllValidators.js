#!/usr/bin/env node
const path = require("path");
const ts = require("typescript");
const fs = require("fs");

const root = path.resolve(__dirname, "../..");

require.extensions[".ts"] = function loadTs(module, filename) {
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

const crossover = require(path.join(root, "lib/router/crossover/index.ts"));
const ctx = crossover.loadDefaultCrossoverContext(root);
const results = crossover.runAllCrossoverValidators(ctx);

let failed = false;
for (const result of results) {
  if (!result.passed) {
    failed = true;
    console.error(`FAIL ${result.validator}: ${result.detail}`);
    continue;
  }
  const warn = result.warnings?.length ? ` (warnings: ${result.warnings.join("; ")})` : "";
  console.log(`PASS ${result.validator}: ${result.detail}${warn}`);
}

if (failed) {
  process.exit(1);
}
console.log(`All ${results.length} crossover validators passed`);
process.exit(0);
