/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5X — D0 trust package publish-gate evidence generator (executable).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const opsRoot = path.join(root, "ops");
const OUTPUT_PATH = path.join(opsRoot, "compliance/trust-package/D0_TRUST_PACKAGE_EVIDENCE.json");

const ALL_D0_PATHS = [
  "ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json",
  "ops/compliance/soc/soc1/D0_EVIDENCE.json",
  "ops/compliance/soc/soc2/D0_EVIDENCE.json",
  "ops/compliance/vendors/D0_EVIDENCE.json",
  "ops/compliance/overlays/hipaa/pack/D0_HIPAA_PACK_EVIDENCE.json",
  "ops/compliance/overlays/hipaa/nprm/D0_NPRM_REGISTER_EVIDENCE.json",
];

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

function loadTrustPackageModule() {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, "compliance/trust-package/index.ts"));
}

function baseArtifact(overrides = {}) {
  return {
    artifactId: "trust-d0-artifact",
    draftPath: "docs/trust/public-drafts/TRUST_PAGE_DRAFT.md",
    citedD0EvidencePaths: ["ops/compliance/soc/soc1/D0_EVIDENCE.json"],
    benchmarkClaimsCount: 0,
    publishReadyFlag: false,
    ...overrides,
  };
}

function runCase(id, runFn, expected) {
  const outcome = runFn();
  const pass = outcome.decision === expected && outcome.mutationRejected !== false;
  return {
    id,
    decision: outcome.decision,
    expected,
    outcome: pass ? "PASS" : "FAIL",
    reason: outcome.reason ?? "",
    ...(outcome.mutationRejected !== undefined ? { mutationRejected: outcome.mutationRejected } : {}),
  };
}

function generateD0Evidence() {
  const { trustPackagePublishGate } = loadTrustPackageModule();
  const cases = [];

  cases.push(
    runCase("TPSE-01", () => trustPackagePublishGate.assertDraftIntegrity(baseArtifact()), "ALLOW"),
  );
  cases.push(
    runCase(
      "TPSE-02",
      () =>
        trustPackagePublishGate.assertDraftIntegrity(
          baseArtifact({ draftPath: "docs/trust/public/sig-lite.md", artifactId: "tpse-02" }),
        ),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "TPSE-03",
      () =>
        trustPackagePublishGate.assertDraftIntegrity(
          baseArtifact({ draftPath: "public/trust-page.html", artifactId: "tpse-03" }),
        ),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "TPSE-04",
      () =>
        trustPackagePublishGate.assertDraftIntegrity({
          ...baseArtifact({ artifactId: "tpse-04" }),
          publishReadyFlag: 1,
        }),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "TPSE-05",
      () =>
        trustPackagePublishGate.assertDraftIntegrity({
          ...baseArtifact({ artifactId: "tpse-05" }),
          publishReadyFlag: "false",
        }),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "TPSE-06",
      () =>
        trustPackagePublishGate.assertDraftIntegrity(
          baseArtifact({
            artifactId: "tpse-06",
            citedD0EvidencePaths: ["ops/compliance/nonexistent/D0.json"],
          }),
        ),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "TPSE-07",
      () =>
        trustPackagePublishGate.assertArtifactsIntegrityBatch([
          baseArtifact({ artifactId: "tpse-07-a" }),
          baseArtifact({ artifactId: "tpse-07-a" }),
        ]),
      "DENY",
    ),
  );
  cases.push(
    runCase(
      "TPSE-08",
      () =>
        trustPackagePublishGate.assertDraftIntegrity(
          baseArtifact({
            artifactId: "tpse-08-composition",
            citedD0EvidencePaths: ALL_D0_PATHS,
          }),
        ),
      "ALLOW",
    ),
  );
  cases.push(
    runCase("TPSE-09", () => {
      const artifacts = trustPackagePublishGate.getDeclaredArtifacts();
      const mutationRejected = !Reflect.set(artifacts, "length", 0);
      return {
        decision: mutationRejected ? "ALLOW" : "DENY",
        reason: mutationRejected ? "declared_artifacts_frozen" : "mutation_allowed",
        mutationRejected,
      };
    }, "ALLOW"),
  );

  const passCount = cases.filter((entry) => entry.outcome === "PASS").length;
  const failCount = cases.filter((entry) => entry.outcome === "FAIL").length;

  return {
    evidenceVersion: "42.5X-1",
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
  console.log(`D0_TRUST_PACKAGE_EVIDENCE:${result.failCount === 0 ? 0 : 1}`);
  process.exit(result.failCount === 0 ? 0 : 1);
}
