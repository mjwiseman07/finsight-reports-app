/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5V — D0 HIPAA pack scope boundary evidence generator (executable).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const opsRoot = path.join(root, "ops");
const OUTPUT_PATH = path.join(opsRoot, "compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json");

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

function loadHipaaPackModule() {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, "compliance/overlays/hipaa/pack/index.ts"));
}

const VALID_NAMESPACES = [
  "ops/control-spine/",
  "ops/compliance/overlays/hipaa/",
  "ops/compliance/overlays/hipaa/pack/",
];

function baseInput(overrides = {}) {
  return {
    packScopeId: "hipaa-pack-d0-evidence",
    subpartsInScope: ["A", "C", "D-incident-only"],
    subpartsExplicitlyOutOfScope: ["B", "D-full", "E"],
    safeguardCategoriesInScope: [
      "administrative-164.308",
      "physical-164.310",
      "technical-164.312",
      "organizational-164.314",
      "documentation-164.316",
    ],
    namespacesInScope: [...VALID_NAMESPACES],
    excludesNprmAnticipation: true,
    ...overrides,
  };
}

function runCase(id, runFn, expected) {
  const outcome = runFn();
  const decision = outcome.decision;
  const reason = outcome.reason ?? "";
  const pass = decision === expected && outcome.mutationRejected !== false;
  return {
    id,
    decision,
    expected,
    outcome: pass ? "PASS" : "FAIL",
    reason,
    ...(outcome.mutationRejected !== undefined ? { mutationRejected: outcome.mutationRejected } : {}),
  };
}

function generateD0Evidence() {
  const { hipaaPackScopeBoundary } = loadHipaaPackModule();
  const cases = [];

  cases.push(
    runCase("HPSE-01", () => {
      const assertion = hipaaPackScopeBoundary.assertPackScopeAligned(baseInput());
      return { decision: assertion.decision, reason: assertion.reason };
    }, "ALLOW"),
  );

  cases.push(
    runCase("HPSE-02", () => {
      const assertion = hipaaPackScopeBoundary.assertPackScopeAligned(
        baseInput({ subpartsInScope: ["A", "C", "B"] }),
      );
      return { decision: assertion.decision, reason: assertion.reason };
    }, "DENY"),
  );

  cases.push(
    runCase("HPSE-03", () => {
      const assertion = hipaaPackScopeBoundary.assertPackScopeAligned(
        baseInput({ subpartsInScope: ["A", "C", "E"] }),
      );
      return { decision: assertion.decision, reason: assertion.reason };
    }, "DENY"),
  );

  cases.push(
    runCase("HPSE-04", () => {
      const assertion = hipaaPackScopeBoundary.assertPackScopeAligned(
        baseInput({ subpartsInScope: ["A", "C", "D-full"] }),
      );
      return { decision: assertion.decision, reason: assertion.reason };
    }, "DENY"),
  );

  cases.push(
    runCase("HPSE-05", () => {
      const assertion = hipaaPackScopeBoundary.assertPackScopeAligned(
        baseInput({ subpartsExplicitlyOutOfScope: ["D-full", "E"] }),
      );
      return { decision: assertion.decision, reason: assertion.reason };
    }, "DENY"),
  );

  cases.push(
    runCase("HPSE-06", () => {
      const assertion = hipaaPackScopeBoundary.assertPackScopeAligned(
        baseInput({ namespacesInScope: ["ops/control-spine/", "lib/intelligence/clinical/"] }),
      );
      return { decision: assertion.decision, reason: assertion.reason };
    }, "DENY"),
  );

  cases.push(
    runCase("HPSE-07", () => {
      const assertion = hipaaPackScopeBoundary.assertPackScopeAligned(
        baseInput({ packScopeId: "hipaa-pack-scope-with-NPRM-metadata" }),
      );
      return { decision: assertion.decision, reason: assertion.reason };
    }, "DENY"),
  );

  cases.push(
    runCase("HPSE-08", () => {
      const assertion = hipaaPackScopeBoundary.assertPackScopeAligned({
        ...baseInput(),
        excludesNprmAnticipation: {},
      });
      return { decision: assertion.decision, reason: assertion.reason };
    }, "DENY"),
  );

  cases.push(
    runCase("HPSE-09", () => {
      const first = hipaaPackScopeBoundary.assertPackScopeAligned(baseInput());
      const scope = hipaaPackScopeBoundary.getDeclaredPackScope();
      const mutationRejected = !Reflect.set(scope, "counselReviewStatus", "executed");
      return {
        decision: first.decision,
        reason: first.reason,
        mutationRejected,
      };
    }, "ALLOW"),
  );

  const passCount = cases.filter((entry) => entry.outcome === "PASS").length;
  const failCount = cases.filter((entry) => entry.outcome === "FAIL").length;

  return {
    evidenceVersion: "42.5V-1",
    generatedAt: new Date().toISOString(),
    totalCases: cases.length,
    passCount,
    failCount,
    cases,
  };
}

module.exports = { generateD0Evidence, OUTPUT_PATH };

if (require.main === module) {
  const result = generateD0Evidence();
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(`D0_HIPAA_PACK_EVIDENCE:${result.failCount === 0 ? 0 : 1}`);
  process.exit(result.failCount === 0 ? 0 : 1);
}
