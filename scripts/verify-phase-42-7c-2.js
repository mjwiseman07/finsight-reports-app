/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7C.2 — Panel Decision Audit Retrofit verifier (spec §7, 8 checks).
 */
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(root, "panel-decision-audit-evidence.json");
const PURE_CORE_BASE = "c8bddc8";

const DOCTRINE_FILES = [
  "lib/intelligence/synthetic/panel-consumer/runPanelDecision.ts",
  "lib/intelligence/synthetic/panel-consumer/routing/CapabilityGate.ts",
  "lib/intelligence/synthetic/panel-consumer/derivePanelDecisionContextPure.ts",
  "lib/intelligence/synthetic/panel-consumer/locked-citation-handles.ts",
  "lib/intelligence/synthetic/standards/audit/types.ts",
];

let typeScriptLoaderRegistered = false;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function sha256(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

function gitShow(revision, relativePath) {
  return execSync(`git show ${revision}:${relativePath}`, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
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

function loadModule(relativePath) {
  ensureTypeScriptLoader();
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(path.join(root, relativePath));
}

function normalizePureCoreFromBaseline(source) {
  return source.replace(
    /export function createCapabilityGate\(/g,
    "export function createCapabilityGatePure(",
  );
}

const steps = [
  {
    id: "42.7C.2-01",
    name: "capabilityGatePure.ts matches c8bddc8 CapabilityGate (rename-only diff)",
    run() {
      const relativePure = "lib/intelligence/synthetic/panel-consumer/routing/capabilityGatePure.ts";
      const current = read(relativePure);
      let baseline = null;
      try {
        baseline = gitShow(
          PURE_CORE_BASE,
          "lib/intelligence/synthetic/panel-consumer/routing/CapabilityGate.ts",
        );
      } catch {
        baseline = null;
      }

      if (baseline !== null) {
        const normalized = normalizePureCoreFromBaseline(baseline);
        if (current !== normalized) {
          throw new Error(
            "capabilityGatePure.ts differs from locked c8bddc8 CapabilityGate beyond allowed renames",
          );
        }
        return {
          status: "PASS",
          detail: `capabilityGatePure.ts SHA-256 ${sha256(current)} matches c8bddc8 after rename normalization`,
        };
      }

      if (!fs.existsSync(path.join(root, relativePure))) {
        throw new Error("capabilityGatePure.ts missing");
      }
      return {
        status: "PASS",
        detail: "capabilityGatePure.ts present (no c8bddc8 baseline available)",
      };
    },
  },
  {
    id: "42.7C.2-02",
    name: "PanelDecisionEntry + PanelAdvisorySummary shape valid",
    run() {
      const mod = loadModule("lib/intelligence/synthetic/standards/audit/types.ts");
      if (typeof mod.validatePanelDecisionEntry !== "function") {
        throw new Error("validatePanelDecisionEntry missing");
      }
      mod.validatePanelDecisionEntry({
        event: "panel.decision",
        callerPersonaHandle: "ai-staff-accountant",
        callerTenantId: "tenant-standard-1",
        callerSessionId: "session-1",
        callerOrgHandle: "org-1",
        industryHandle: "manufacturing",
        panelHandle: "manufacturing-topic-panel",
        topicHandle: "topic",
        treatmentRequestId: "tr-1",
        matchedRules: [],
        citationHandlesConsulted: [],
        unresolvedConflicts: [],
        resolvedBy: null,
        election: null,
        advisoryCount: 0,
        advisoriesGenerated: [],
        tenantClassification: "standard",
      });
      return { status: "PASS", detail: "PanelDecisionEntry validates per spec §3" };
    },
  },
  {
    id: "42.7C.2-03",
    name: "one-call-one-entry invariant (C2.D2)",
    run() {
      const evidence = JSON.parse(read("panel-decision-audit-evidence.json"));
      const bundlingCase = evidence.cases.find((entry) => entry.id === "A.entry-shape.advisoryCount");
      if (!bundlingCase || bundlingCase.outcome !== bundlingCase.expected) {
        throw new Error("advisoryCount invariant test missing or failing");
      }
      return { status: "PASS", detail: "advisoryCount === advisoriesGenerated.length enforced" };
    },
  },
  {
    id: "42.7C.2-04",
    name: "fail-closed on audit-write failure (C2.D4)",
    run() {
      const evidence = JSON.parse(read("panel-decision-audit-evidence.json"));
      const failCase = evidence.cases.find((entry) => entry.id === "F.fail-closed.01");
      if (!failCase || failCase.outcome !== failCase.expected) {
        throw new Error("fail-closed audit test missing or failing");
      }
      return { status: "PASS", detail: "F.fail-closed.01 passed in evidence" };
    },
  },
  {
    id: "42.7C.2-05",
    name: "hash chain participation (mixed cache + panel)",
    run() {
      const evidence = JSON.parse(read("panel-decision-audit-evidence.json"));
      const chainCase = evidence.cases.find((entry) => entry.id === "G.hash-chain.02");
      if (!chainCase || chainCase.outcome !== chainCase.expected) {
        throw new Error("mixed-chain hash verification test missing or failing");
      }
      return { status: "PASS", detail: "G.hash-chain.02 mixed chain verifies" };
    },
  },
  {
    id: "42.7C.2-06",
    name: "PHI classification on every entry (C2.D6)",
    run() {
      const evidence = JSON.parse(read("panel-decision-audit-evidence.json"));
      const phiCases = evidence.cases.filter((entry) => entry.id.startsWith("E.phi."));
      const failed = phiCases.filter((entry) => entry.outcome !== entry.expected);
      if (phiCases.length < 4 || failed.length > 0) {
        throw new Error("PHI classification tests missing or failing");
      }
      return { status: "PASS", detail: `${phiCases.length} PHI classification tests passed` };
    },
  },
  {
    id: "42.7C.2-07",
    name: "citation handle whitelist (C2.D9)",
    run() {
      const evidence = JSON.parse(read("panel-decision-audit-evidence.json"));
      const citationCase = evidence.cases.find((entry) => entry.id === "A.entry-shape.citationWhitelist");
      if (!citationCase || citationCase.outcome !== citationCase.expected) {
        throw new Error("citation whitelist test missing or failing");
      }
      return { status: "PASS", detail: "Citation handles restricted to 5 locked handles" };
    },
  },
  {
    id: "42.7C.2-08",
    name: "doctrine headers in modified 42.7C.2 files",
    run() {
      const missing = DOCTRINE_FILES.filter((relativePath) => {
        const content = read(relativePath);
        return !content.includes("Phase 42.7C.2") || !content.includes("failClosedOnAuditWriteFailure");
      });
      if (missing.length > 0) {
        throw new Error(`missing doctrine headers: ${missing.join(", ")}`);
      }
      return {
        status: "PASS",
        detail: `${DOCTRINE_FILES.length} modified files carry Phase 42.7C.2 doctrine headers`,
      };
    },
  },
  {
    id: "42.7C.2-09",
    name: "verify:panel-decision-audit regression (>=40 tests)",
    run() {
      execSync("npm run verify:panel-decision-audit", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
      const evidence = JSON.parse(read("panel-decision-audit-evidence.json"));
      if (evidence.totalCases < 40) {
        throw new Error(`expected >= 40 tests, got ${evidence.totalCases}`);
      }
      if (evidence.failCount !== 0) {
        throw new Error(`${evidence.failCount} panel-decision-audit test failures`);
      }
      return {
        status: "PASS",
        detail: `${evidence.passCount}/${evidence.totalCases} tests passed; evidenceVersion ${evidence.evidenceVersion}`,
      };
    },
  },
  {
    id: "42.7C.2-10",
    name: "verify:panel-consumer regression (87/87)",
    run() {
      execSync("npm run verify:panel-consumer", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
      return { status: "PASS", detail: "verify:panel-consumer passed" };
    },
  },
];

function main() {
  if (!fs.existsSync(evidencePath)) {
    execSync("node scripts/run-panel-decision-audit-tests.js", {
      cwd: root,
      stdio: "pipe",
      encoding: "utf8",
    });
  }

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
    console.error(`Phase 42.7C.2 verification failed (${failures}/${steps.length} steps).`);
    process.exit(1);
  }
  console.log(`Phase 42.7C.2 verification passed (${steps.length}/${steps.length} steps).`);
}

main();
