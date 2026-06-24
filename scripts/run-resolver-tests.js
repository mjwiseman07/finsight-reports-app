/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

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

function runTest(absolutePath, exportName) {
  ensureTypeScriptLoader();
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const moduleExports = require(absolutePath);
  const runner = moduleExports[exportName];
  if (typeof runner !== "function") {
    throw new Error(`Missing export ${exportName} in ${absolutePath}`);
  }
  return runner();
}

function main() {
  const args = process.argv.slice(2);
  if (args.length > 0 && !args.includes("resolver")) {
    console.log("No matching test suite for args:", args.join(" "));
    process.exit(0);
  }

  const resolverTestsRoot = path.join(
    root,
    "lib/intelligence/synthetic/standards/resolver/__tests__",
  );

  const suites = [
    {
      absolutePath: path.join(resolverTestsRoot, "resolveTreatmentPure.golden.test.ts"),
      exportName: "runResolveTreatmentPureGoldenTests",
      label: "resolveTreatmentPure.golden",
      countGolden: true,
    },
    {
      absolutePath: path.join(resolverTestsRoot, "treatmentDeterminismHash.test.ts"),
      exportName: "runTreatmentDeterminismHashTests",
      label: "treatmentDeterminismHash",
      countGolden: true,
    },
    {
      absolutePath: path.join(resolverTestsRoot, "citationHandles.test.ts"),
      exportName: "runCitationHandlesTests",
      label: "citationHandles",
      countGolden: false,
    },
  ];

  let failures = 0;
  let goldenAndHashTests = 0;

  for (const suite of suites) {
    try {
      const count = runTest(suite.absolutePath, suite.exportName);
      if (suite.countGolden) {
        goldenAndHashTests += count;
      }
      console.log(`PASS ${suite.label} (${count} tests)`);
    } catch (error) {
      console.error(`FAIL ${suite.label}:`, error);
      failures += 1;
    }
  }

  try {
    const shimCtx = runTest(
      path.join(resolverTestsRoot, "shimContextBuilder.test.ts"),
      "runShimContextBuilderTests",
    );
    const mfgShim = runTest(
      path.join(
        root,
        "lib/intelligence/synthetic/industry/manufacturing/composition/__tests__/resolveReportingFramework.shim.test.ts",
      ),
      "runMfgShimTests",
    );
    const rtlShim = runTest(
      path.join(
        root,
        "lib/intelligence/synthetic/industry/retail/composition/__tests__/resolveReportingFramework.shim.test.ts",
      ),
      "runRtlShimTests",
    );

    const shimPassed = shimCtx.passed + mfgShim.passed + rtlShim.passed;
    const shimFailed = shimCtx.failed + mfgShim.failed + rtlShim.failed;
    goldenAndHashTests += shimPassed;

    console.log(
      `PASS shim conversion (${shimPassed} tests) ` +
        `(builder=${shimCtx.passed}/${shimCtx.passed + shimCtx.failed}, ` +
        `mfg=${mfgShim.passed}/${mfgShim.passed + mfgShim.failed}, ` +
        `rtl=${rtlShim.passed}/${rtlShim.passed + rtlShim.failed})`,
    );

    if (shimFailed > 0) {
      failures += 1;
    }
  } catch (error) {
    console.error("FAIL shim conversion:", error);
    failures += 1;
  }

  try {
    const electionReg = runTest(
      path.join(resolverTestsRoot, "syncElectionRegistry.test.ts"),
      "runSyncElectionRegistryTests",
    );
    goldenAndHashTests += electionReg.passed;
    console.log(
      `PASS sync election registry (${electionReg.passed} tests) ` +
        `(${electionReg.passed}/${electionReg.passed + electionReg.failed})`,
    );
    if (electionReg.failed > 0) {
      failures += 1;
    }
  } catch (error) {
    console.error("FAIL sync election registry:", error);
    failures += 1;
  }

  try {
    const roleAdapterRoot = path.join(root, "lib/intelligence/synthetic/role-adapter/__tests__");
    const escalation = runTest(
      path.join(roleAdapterRoot, "escalationRegistry.test.ts"),
      "runEscalationRegistryTests",
    );
    const adapter = runTest(
      path.join(roleAdapterRoot, "treatmentRoleAdapter.test.ts"),
      "runTreatmentRoleAdapterTests",
    );
    const adapterPassed = escalation.passed + adapter.passed;
    const adapterFailed = escalation.failed + adapter.failed;
    goldenAndHashTests += adapterPassed;

    console.log(
      `PASS role adapter (${adapterPassed} tests) ` +
        `(escalation=${escalation.passed}/${escalation.passed + escalation.failed}, ` +
        `adapter=${adapter.passed}/${adapter.passed + adapter.failed})`,
    );

    if (adapterFailed > 0) {
      failures += 1;
    }
  } catch (error) {
    console.error("FAIL role adapter:", error);
    failures += 1;
  }

  if (failures > 0) {
    process.exit(1);
  }
  console.log(`All ${goldenAndHashTests} resolver tests passed.`);
}

main();
