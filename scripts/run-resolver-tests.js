/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const resolverTestsRoot = path.join(
  root,
  "lib/intelligence/synthetic/standards/resolver/__tests__",
);

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
      },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
  typeScriptLoaderRegistered = true;
}

function runTest(relativePath, exportName) {
  ensureTypeScriptLoader();
  const absolutePath = path.join(resolverTestsRoot, relativePath);
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const moduleExports = require(absolutePath);
  const runner = moduleExports[exportName];
  if (typeof runner !== "function") {
    throw new Error(`Missing export ${exportName} in ${relativePath}`);
  }
  return runner();
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 0 && !args.includes("resolver")) {
    console.log("No matching test suite for args:", args.join(" "));
    process.exit(0);
  }

  const suites = [
    {
      file: "resolveTreatmentPure.golden.test.ts",
      exportName: "runResolveTreatmentPureGoldenTests",
      label: "resolveTreatmentPure.golden",
    },
    {
      file: "treatmentDeterminismHash.test.ts",
      exportName: "runTreatmentDeterminismHashTests",
      label: "treatmentDeterminismHash",
    },
  ];

  let failures = 0;
  for (const suite of suites) {
    try {
      const pass = runTest(suite.file, suite.exportName);
      if (pass) {
        console.log(`PASS ${suite.label}`);
      } else {
        console.error(`FAIL ${suite.label}`);
        failures += 1;
      }
    } catch (error) {
      console.error(`FAIL ${suite.label}:`, error);
      failures += 1;
    }
  }

  if (failures > 0) {
    process.exit(1);
  }
  console.log(`All ${suites.length} resolver test suites passed.`);
}

main();
