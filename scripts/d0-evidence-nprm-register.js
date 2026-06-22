/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5W — D0 NPRM gap register evidence generator (executable).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const opsRoot = path.join(root, "ops");
const OUTPUT_PATH = path.join(opsRoot, "compliance/overlays/hipaa/nprm/D0_NPRM_REGISTER_EVIDENCE.json");

const FEDERAL_REGISTER_URL =
  "https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule-to-strengthen-the-cybersecurity-of-electronic-protected-health-information";
const REGINFO_RIN_URL =
  "https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=&RIN=0945-AA22";

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

function loadNprmModule() {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, "compliance/overlays/hipaa/nprm/index.ts"));
}

function loadNprmRegisterModule() {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, "compliance/overlays/hipaa/nprm/nprmGapRegister.ts"));
}

function loadStaticTestsModule() {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, "compliance/overlays/hipaa/nprm/nprmGapRegister.staticTests.ts"));
}

function baseRow(overrides = {}) {
  return {
    rowId: "NGR-D0-01",
    nprmProvisionId: "164.312(f)-mfa",
    currentRuleReference: "docs/trust/hipaa/POLICY_SET.md §164.312(d)",
    nprmTargetState: "Would require multi-factor authentication for ePHI access if finalized as proposed.",
    primarySourceUrl: FEDERAL_REGISTER_URL,
    primarySourceVerifiedAt: "2026-06-22T00:00:00.000Z",
    gapSize: "M",
    founderEffortEstimate: "2 weeks founder (founder-estimated)",
    owner: "Matthew Wiseman",
    triggerDate: null,
    status: "open",
    notes: "D0 fixture row.",
    ...overrides,
  };
}

function happyPathRows() {
  const owners = ["Matthew Wiseman", "Janice"];
  const rows = [
    ["NGR-D0-01", "164.312(f)-mfa", "M"],
    ["NGR-D0-02", "164.312(b)-encryption-at-rest", "M"],
    ["NGR-D0-03", "164.312(e)-encryption-in-transit", "S"],
    ["NGR-D0-04", "164.312-addressable-required-removal", "L"],
    ["NGR-D0-05", "164.308(a)(8)-vulnerability-scans-6mo", "S"],
    ["NGR-D0-06", "164.308(a)(8)-penetration-testing-12mo", "M"],
    ["NGR-D0-07", "164.308(a)(1)-asset-inventory-network-map", "M"],
    ["NGR-D0-08", "164.308(a)(8)-annual-compliance-audit", "M"],
  ];
  return rows.map(([rowId, provisionId, gapSize], index) =>
    baseRow({ rowId, nprmProvisionId: provisionId, gapSize, owner: owners[index % 2] }),
  );
}

function runCase(id, runFn, expected) {
  const outcome = runFn();
  const decision = outcome.decision;
  const pass = decision === expected;
  return {
    id,
    decision,
    expected,
    outcome: pass ? "PASS" : "FAIL",
    reason: outcome.reason ?? "",
    violations: outcome.violations ?? [],
  };
}

function generateD0Evidence() {
  const { nprmGapRegister } = loadNprmModule();
  const registerMod = loadNprmRegisterModule();
  const staticModule = loadStaticTestsModule();
  const cases = [];

  cases.push(
    runCase("NGRE-01", () => nprmGapRegister.assertRegisterSchemaValid(happyPathRows()), "ALLOW"),
  );
  cases.push(
    runCase(
      "NGRE-02",
      () => nprmGapRegister.assertRegisterSchemaValid([baseRow({ owner: "" })]),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "NGRE-03",
      () => nprmGapRegister.assertRegisterSchemaValid([baseRow({ owner: "   " })]),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "NGRE-04",
      () =>
        nprmGapRegister.assertRegisterSchemaValid([
          baseRow({ primarySourceUrl: "https://example-lawfirm.com/summary" }),
        ]),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "NGRE-05",
      () =>
        nprmGapRegister.assertRegisterSchemaValid([
          baseRow({ primarySourceUrl: REGINFO_RIN_URL }),
        ]),
      "ALLOW",
    ),
  );
  cases.push(
    runCase(
      "NGRE-06",
      () => nprmGapRegister.assertRegisterSchemaValid([baseRow({ gapSize: "XL" })]),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "NGRE-07",
      () =>
        nprmGapRegister.assertRegisterSchemaValid([
          baseRow({
            status: "mitigated-via-existing-control",
            currentRuleReference: "not-currently-required",
          }),
        ]),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "NGRE-08",
      () => nprmGapRegister.assertRegisterSchemaValid([baseRow(), baseRow()]),
      "DENY",
    ),
  );

  cases.push(runCase("NGRE-09", () => registerMod.assertNprmNotFinalInvariant(true), "DENY"));

  const passCount = cases.filter((entry) => entry.outcome === "PASS").length;
  const failCount = cases.filter((entry) => entry.outcome === "FAIL").length;
  const staticResult = staticModule.executeNprmGapRegisterStaticConstructionTests();

  return {
    evidenceVersion: "42.5W-1",
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    passCount,
    failCount,
    staticTestsPass: staticResult.pass,
    cases,
  };
}

module.exports = { generateD0Evidence, OUTPUT_PATH };

if (require.main === module) {
  const result = generateD0Evidence();
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  const ok = result.failCount === 0 && result.staticTestsPass;
  console.log(`D0_NPRM_REGISTER_EVIDENCE:${ok ? 0 : 1}`);
  process.exit(ok ? 0 : 1);
}
