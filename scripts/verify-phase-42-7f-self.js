/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7F meta-verifier — matrix coverage self-checks.
 */
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
  typeScriptLoaderRegistered = true;
}

function loadMatrix() {
  ensureTypeScriptLoader();
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(path.join(root, "architecture-lane/verifier-42-7f/caseMatrix.ts")).WIRING_CASES;
}

const PERSONAS = [
  "ai-staff-accountant",
  "ai-senior-accountant",
  "ai-accounting-manager",
  "ai-controller-helper",
  "ai-cfo-helper",
  "ai-staff-auditor",
];

const steps = [
  {
    id: "42.7F-self-01",
    name: "case matrix contains >= 40 cases",
    run() {
      const cases = loadMatrix();
      if (cases.length < 40) {
        throw new Error(`expected >= 40 cases, got ${cases.length}`);
      }
      return { status: "PASS", detail: `${cases.length} cases in matrix` };
    },
  },
  {
    id: "42.7F-self-02",
    name: "every persona appears at least once",
    run() {
      const cases = loadMatrix();
      const missing = PERSONAS.filter(
        (persona) => !cases.some((entry) => entry.input.persona === persona),
      );
      if (missing.length > 0) {
        throw new Error(`missing personas: ${missing.join(", ")}`);
      }
      return { status: "PASS", detail: "all 6 personas covered" };
    },
  },
  {
    id: "42.7F-self-03",
    name: "every tenant x industry combination appears",
    run() {
      const cases = loadMatrix();
      const industries = ["healthcare", "manufacturing", "fund-accounting"];
      const missing = [];
      for (const tenantClassification of ["standard", "phi-covered"]) {
        for (const industry of industries) {
          const found = cases.some(
            (entry) =>
              entry.input.tenantClassification === tenantClassification &&
              entry.input.industry === industry,
          );
          if (!found) {
            missing.push(`${tenantClassification}:${industry}`);
          }
        }
      }
      if (missing.length > 0) {
        throw new Error(`missing tenant×industry combos: ${missing.join(", ")}`);
      }
      return { status: "PASS", detail: "6 tenant×industry combinations covered" };
    },
  },
  {
    id: "42.7F-self-04",
    name: "every election x escalation combination appears",
    run() {
      const cases = loadMatrix();
      const elections = ["no-election", "agreement-with-panel", "override-applied"];
      const escalations = ["no-escalation", "escalated", "gate-blocked", "degraded-confidence"];
      const missing = [];
      for (const orgElectionState of elections) {
        for (const escalationOutcome of escalations) {
          const found = cases.some(
            (entry) =>
              entry.input.orgElectionState === orgElectionState &&
              entry.input.escalationOutcome === escalationOutcome,
          );
          if (!found) {
            missing.push(`${orgElectionState}:${escalationOutcome}`);
          }
        }
      }
      if (missing.length > 0) {
        throw new Error(`missing election×escalation combos: ${missing.join(", ")}`);
      }
      return { status: "PASS", detail: "12 election×escalation combinations covered" };
    },
  },
  {
    id: "42.7F-self-05",
    name: "exactly 3 fail-closed cases exist",
    run() {
      const cases = loadMatrix();
      const fc = cases.filter((entry) => entry.isFailClosed);
      if (fc.length !== 3) {
        throw new Error(`expected 3 FC cases, got ${fc.length}`);
      }
      const hops = fc.map((entry) => entry.input.failClosedHop).sort().join(",");
      if (!hops.includes("escalation") || !hops.includes("panel") || !hops.includes("org-edge")) {
        throw new Error("FC cases must cover escalation, panel, and org-edge hops");
      }
      return { status: "PASS", detail: "FC1/FC2/FC3 present" };
    },
  },
  {
    id: "42.7F-self-06",
    name: "every case has at least one expected hop",
    run() {
      const cases = loadMatrix();
      const empty = cases.filter((entry) => entry.expectedHops.length === 0);
      if (empty.length > 0) {
        throw new Error(`cases missing expected hops: ${empty.map((e) => e.id).join(", ")}`);
      }
      return { status: "PASS", detail: "all cases have expected-hop manifests" };
    },
  },
];

function main() {
  let failures = 0;
  for (const step of steps) {
    try {
      const result = step.run();
      console.log(`PASS ${step.id} ${step.name} — ${result.detail}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${step.id} ${step.name}:`, error.message || error);
    }
  }
  if (failures > 0) {
    console.error(`Phase 42.7F meta-verifier failed (${failures}/${steps.length} steps).`);
    process.exit(1);
  }
  console.log(`Phase 42.7F meta-verifier passed (${steps.length}/${steps.length} steps).`);
}

main();
