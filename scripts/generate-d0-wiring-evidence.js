/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7G — D0 wiring evidence generator (G4).
 * Fail-closed: exits non-zero and does not write partial evidence on any failure.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const EVIDENCE_VERSION = "42.7.G1.0";
const GENERATED_AT = "2026-06-24T23:59:00Z";
const OUTPUT_PATH = path.join(root, "architecture-lane/d0-evidence/D0_WIRING_EVIDENCE.json");

const PER_CASE_KEYS = ["id", "decision", "expected", "outcome", "reason"];
const TOP_LEVEL_KEYS = [
  "evidenceVersion",
  "generatedAt",
  "totalCases",
  "passCount",
  "failCount",
  "cases",
];

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
  typeScriptLoaderRegistered = true;
}

function loadMatrixCases() {
  ensureTypeScriptLoader();
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(path.join(root, "architecture-lane/verifier-42-7f/caseMatrix.ts")).WIRING_CASES;
}

async function loadWiringEvidence() {
  ensureTypeScriptLoader();
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const { runWiringVerifierTests } = require(
    path.join(root, "architecture-lane/verifier-42-7f/__tests__/wiringVerifier.test.ts"),
  );
  return runWiringVerifierTests();
}

function compareCaseIds(left, right) {
  return left.localeCompare(right, "en", { numeric: true, sensitivity: "base" });
}

function rollupCase(wiringCase, assertionRecords) {
  const related = assertionRecords.filter(
    (record) => record.id === wiringCase.id || record.id.startsWith(`${wiringCase.id}.`),
  );
  if (related.length === 0) {
    throw new Error(`no assertion records for matrix case ${wiringCase.id}`);
  }

  const firstFailure = related.find((record) => {
    if (record.expected === "threw") {
      return record.outcome !== "threw";
    }
    return record.outcome !== "pass";
  });

  const decision = wiringCase.isFailClosed
    ? `fail-closed:${wiringCase.input.failClosedHop}`
    : wiringCase.input.escalationOutcome;
  const expected = wiringCase.isFailClosed ? "fail-closed-threw" : "cross-phase-pass";

  return {
    id: wiringCase.id,
    decision,
    expected,
    outcome: firstFailure ? "fail" : "pass",
    reason: firstFailure
      ? `${firstFailure.id}: ${firstFailure.reason}`
      : "all wiring assertions passed",
  };
}

function buildOrderedEvidence(rollupCases) {
  const passCount = rollupCases.filter((entry) => entry.outcome === "pass").length;
  const failCount = rollupCases.length - passCount;
  return {
    evidenceVersion: EVIDENCE_VERSION,
    generatedAt: GENERATED_AT,
    totalCases: rollupCases.length,
    passCount,
    failCount,
    cases: rollupCases,
  };
}

function assertShape(evidence) {
  const topKeys = Object.keys(evidence);
  if (topKeys.join(",") !== TOP_LEVEL_KEYS.join(",")) {
    throw new Error(`top-level key order mismatch: ${topKeys.join(",")}`);
  }
  if (evidence.totalCases !== evidence.passCount + evidence.failCount) {
    throw new Error("totalCases must equal passCount + failCount");
  }
  for (const entry of evidence.cases) {
    const caseKeys = Object.keys(entry);
    if (caseKeys.join(",") !== PER_CASE_KEYS.join(",")) {
      throw new Error(`per-case key order mismatch for ${entry.id}: ${caseKeys.join(",")}`);
    }
    if (!["pass", "fail"].includes(entry.outcome)) {
      throw new Error(`invalid outcome for ${entry.id}: ${entry.outcome}`);
    }
  }
}

async function main() {
  execSync("npm run verify:phase-42-7f:all", { cwd: root, stdio: "inherit" });

  const matrixCases = loadMatrixCases();
  const wiringEvidence = await loadWiringEvidence();
  if (wiringEvidence.failCount !== 0) {
    throw new Error(`42.7F wiring verifier reported ${wiringEvidence.failCount} failures`);
  }

  const rollupCases = matrixCases
    .map((wiringCase) => rollupCase(wiringCase, wiringEvidence.cases))
    .sort((left, right) => compareCaseIds(left.id, right.id));

  const evidence = buildOrderedEvidence(rollupCases);
  assertShape(evidence);

  if (evidence.totalCases !== 48 || evidence.passCount !== 48 || evidence.failCount !== 0) {
    throw new Error(
      `expected 48/48/0 cases, got total=${evidence.totalCases} pass=${evidence.passCount} fail=${evidence.failCount}`,
    );
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`D0 wiring evidence written to ${OUTPUT_PATH}`);
  console.log(
    `D0 rollup: ${evidence.passCount}/${evidence.totalCases} pass, evidenceVersion=${evidence.evidenceVersion}`,
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
