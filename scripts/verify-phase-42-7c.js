/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7C — Industry Panel Consumer verifier (spec §12, 7 steps).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(root, "panel-consumer-evidence.json");

let typeScriptLoaderRegistered = false;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

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

function loadPanelConsumerModule(relativePath) {
  ensureTypeScriptLoader();
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(path.join(root, relativePath));
}

const steps = [
  {
    id: "42.7C-01",
    name: "worker-job-descriptions.json schema and doctrine fields",
    run() {
      const mod = loadPanelConsumerModule(
        "lib/intelligence/synthetic/panel-consumer/job-descriptions/worker-job-descriptions.json",
      );
      const { validateWorkerJobDescriptionsDocument } = loadPanelConsumerModule(
        "lib/intelligence/synthetic/panel-consumer/verify/schema-validate.ts",
      );
      validateWorkerJobDescriptionsDocument(mod);
      return { status: "PASS", detail: "schemaVersion 42.7C.1 and doctrine fields valid" };
    },
  },
  {
    id: "42.7C-02",
    name: "loadBaseline returns 9 immutable founder JD personas",
    run() {
      const { loadBaseline } = loadPanelConsumerModule(
        "lib/intelligence/synthetic/panel-consumer/job-descriptions/load-baseline.ts",
      );
      const baselines = loadBaseline();
      if (baselines.length !== 9) {
        throw new Error(`expected 9 personas, got ${baselines.length}`);
      }
      return { status: "PASS", detail: "loadBaseline returned 9 personas" };
    },
  },
  {
    id: "42.7C-03",
    name: "parity-checklist.json matches derived checklist",
    run() {
      const { buildParityChecklist } = loadPanelConsumerModule(
        "lib/intelligence/synthetic/panel-consumer/job-descriptions/load-baseline.ts",
      );
      const checklistPath =
        "lib/intelligence/synthetic/panel-consumer/job-descriptions/parity-checklist.json";
      const committed = `${JSON.stringify(JSON.parse(read(checklistPath)), null, 2)}\n`;
      const generated = `${JSON.stringify(buildParityChecklist(), null, 2)}\n`;
      if (committed !== generated) {
        throw new Error("parity-checklist.json is out of sync with worker-job-descriptions.json");
      }
      return { status: "PASS", detail: "parity-checklist.json in sync" };
    },
  },
  {
    id: "42.7C-04",
    name: "87 deterministic panel-consumer tests (spec §10)",
    async run() {
      const { execSync } = require("child_process");
      execSync("node scripts/run-panel-consumer-tests.js", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
      const evidence = JSON.parse(read("panel-consumer-evidence.json"));
      if (evidence.totalCases !== 87) {
        throw new Error(`expected 87 cases, got ${evidence.totalCases}`);
      }
      if (evidence.failCount !== 0) {
        throw new Error(`${evidence.failCount} panel-consumer test failures`);
      }
      if (evidence.evidenceVersion !== "42.7C.1") {
        throw new Error(`unexpected evidenceVersion ${evidence.evidenceVersion}`);
      }
      return {
        status: "PASS",
        detail: `87/87 tests passed; evidenceVersion ${evidence.evidenceVersion}`,
      };
    },
  },
  {
    id: "42.7C-05",
    name: "Phase 39 LOCK import whitelist invariant",
    run() {
      const { assertPhase39LockImports } = loadPanelConsumerModule(
        "lib/intelligence/synthetic/panel-consumer/verify/invariants.ts",
      );
      const violations = assertPhase39LockImports();
      if (violations.length > 0) {
        throw new Error(violations.join("; "));
      }
      return { status: "PASS", detail: "no Phase 39 LOCK import violations" };
    },
  },
  {
    id: "42.7C-06",
    name: "Phase 38-only external I/O containment invariant",
    run() {
      const { assertPhase38OnlyExternalIO } = loadPanelConsumerModule(
        "lib/intelligence/synthetic/panel-consumer/verify/invariants.ts",
      );
      const violations = assertPhase38OnlyExternalIO();
      if (violations.length > 0) {
        throw new Error(violations.join("; "));
      }
      return { status: "PASS", detail: "no forbidden external I/O outside execution boundary" };
    },
  },
  {
    id: "42.7C-07",
    name: "role-adapter bridge singleton + locked paths + evidence artifact",
    run() {
      const { assertRoleAdapterBridgeSingleton, assertLockedPathsUntouched } = loadPanelConsumerModule(
        "lib/intelligence/synthetic/panel-consumer/verify/invariants.ts",
      );
      const bridgeViolations = assertRoleAdapterBridgeSingleton();
      if (bridgeViolations.length > 0) {
        throw new Error(bridgeViolations.join("; "));
      }
      const lockedViolations = assertLockedPathsUntouched(root);
      if (lockedViolations.length > 0) {
        throw new Error(lockedViolations.join("; "));
      }
      if (!fs.existsSync(evidencePath)) {
        throw new Error("panel-consumer-evidence.json missing (run step 42.7C-04 first)");
      }
      const doctrineBanner = read("lib/intelligence/synthetic/panel-consumer/doctrine-banner.ts");
      if (!doctrineBanner.includes("Phase 42.7C")) {
        throw new Error("doctrine-banner.ts missing Phase 42.7C marker");
      }
      return { status: "PASS", detail: "bridge singleton, locked paths, and evidence artifact OK" };
    },
  },
];

async function main() {
  let failures = 0;
  for (const step of steps) {
    try {
      const result = await step.run();
      console.log(`PASS ${step.id} ${step.name} — ${result.detail}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${step.id} ${step.name}:`, error.message || error);
    }
  }

  if (failures > 0) {
    console.error(`Phase 42.7C verification failed (${failures}/${steps.length} steps).`);
    process.exit(1);
  }
  console.log(`Phase 42.7C verification passed (${steps.length}/${steps.length} steps).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
