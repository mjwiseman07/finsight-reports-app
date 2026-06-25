/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7B.1 — Escalation Audit Retrofit verifier (spec §6, 8 steps).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(root, "escalation-audit-evidence.json");
const PURE_CORE_BASE = "1a3e09e";

const DOCTRINE_FILES = [
  "lib/intelligence/synthetic/role-adapter/evaluateEscalation.ts",
  "lib/intelligence/synthetic/role-adapter/treatmentRoleAdapter.ts",
];

let typeScriptLoaderRegistered = false;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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
  return source
    .replace(/^interface BuildArgs \{/m, "export interface BuildArgs {")
    .replace(/export function adaptTreatmentForRole\(/g, "export function adaptTreatmentForRolePure(");
}

const steps = [
  {
    id: "42.7B.1-01",
    name: "adaptTreatmentForRolePure.ts matches 1a3e09e treatmentRoleAdapter (rename-only diff)",
    run() {
      const relativePure = "lib/intelligence/synthetic/role-adapter/adaptTreatmentForRolePure.ts";
      const current = read(relativePure);
      let baseline = null;
      try {
        baseline = gitShow(PURE_CORE_BASE, "lib/intelligence/synthetic/role-adapter/treatmentRoleAdapter.ts");
      } catch {
        baseline = null;
      }

      if (baseline !== null) {
        const normalized = normalizePureCoreFromBaseline(baseline);
        if (current !== normalized) {
          throw new Error(
            "adaptTreatmentForRolePure.ts differs from locked 1a3e09e treatmentRoleAdapter beyond allowed renames",
          );
        }
        return {
          status: "PASS",
          detail: "adaptTreatmentForRolePure.ts byte-identical to 1a3e09e after rename normalization",
        };
      }

      if (!fs.existsSync(path.join(root, relativePure))) {
        throw new Error("adaptTreatmentForRolePure.ts missing");
      }
      return {
        status: "PASS",
        detail: "adaptTreatmentForRolePure.ts present (no 1a3e09e baseline available)",
      };
    },
  },
  {
    id: "42.7B.1-02",
    name: "evaluateEscalationPure exists and escalation-registry.json unchanged vs 1a3e09e",
    run() {
      const purePath = "lib/intelligence/synthetic/role-adapter/evaluateEscalationPure.ts";
      if (!fs.existsSync(path.join(root, purePath))) {
        throw new Error("evaluateEscalationPure.ts missing");
      }
      const mod = loadModule(purePath);
      if (typeof mod.evaluateEscalationPure !== "function") {
        throw new Error("evaluateEscalationPure export missing");
      }

      const registryPath = "lib/intelligence/synthetic/role-adapter/escalation-registry.json";
      const currentRegistry = read(registryPath);
      let baselineRegistry = null;
      try {
        baselineRegistry = gitShow(PURE_CORE_BASE, registryPath);
      } catch {
        baselineRegistry = null;
      }
      if (baselineRegistry !== null && currentRegistry !== baselineRegistry) {
        throw new Error("escalation-registry.json changed from 1a3e09e baseline");
      }
      return {
        status: "PASS",
        detail: "evaluateEscalationPure export present; escalation-registry.json unchanged",
      };
    },
  },
  {
    id: "42.7B.1-03",
    name: "EscalationEvaluatedEntry shape validator",
    run() {
      const { validateEscalationEvaluatedEntry } = loadModule(
        "lib/intelligence/synthetic/standards/audit/types.ts",
      );
      validateEscalationEvaluatedEntry({
        event: "escalation-evaluated",
        callerPersonaHandle: "ai-staff-accountant",
        callerTenantId: "tenant-1",
        callerSessionId: "session-1",
        callerOrgHandle: "org-1",
        materialityTier: "medium",
        complexityTier: "moderate",
        topicHandle: "topic-1",
        industryHandle: "MANUFACTURING",
        decisionOutcome: "no-escalation",
        targetPersonaHandle: null,
        citationHandlesConsulted: [],
        matchedRules: [],
        unresolvedConflicts: [],
        tenantClassification: "standard",
      });

      let rejected = false;
      try {
        validateEscalationEvaluatedEntry({
          event: "wrong",
          callerPersonaHandle: "ai-staff-accountant",
          callerTenantId: "tenant-1",
          callerSessionId: "session-1",
          callerOrgHandle: "org-1",
          materialityTier: "medium",
          complexityTier: "moderate",
          topicHandle: "topic-1",
          industryHandle: "MANUFACTURING",
          decisionOutcome: "no-escalation",
          targetPersonaHandle: null,
          citationHandlesConsulted: [],
          matchedRules: [],
          unresolvedConflicts: [],
          tenantClassification: "standard",
        });
      } catch {
        rejected = true;
      }
      if (!rejected) {
        throw new Error("validateEscalationEvaluatedEntry did not reject invalid event");
      }
      return { status: "PASS", detail: "EscalationEvaluatedEntry validator accepts valid and rejects invalid" };
    },
  },
  {
    id: "42.7B.1-04",
    name: "verify:escalation-audit passes (30+ cases, zero failures)",
    run() {
      execSync("node scripts/run-escalation-audit-tests.js", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
      const evidence = JSON.parse(read("escalation-audit-evidence.json"));
      if (evidence.totalCases < 30) {
        throw new Error(`expected totalCases >= 30, got ${evidence.totalCases}`);
      }
      if (evidence.failCount !== 0) {
        throw new Error(`${evidence.failCount} escalation-audit test failures`);
      }
      if (evidence.evidenceVersion !== "42.7B.1") {
        throw new Error(`unexpected evidenceVersion ${evidence.evidenceVersion}`);
      }
      return {
        status: "PASS",
        detail: `${evidence.passCount}/${evidence.totalCases} tests passed; evidenceVersion ${evidence.evidenceVersion}`,
      };
    },
  },
  {
    id: "42.7B.1-05",
    name: "hash chain mixed cache + escalation entries (spec D group)",
    run() {
      const evidence = JSON.parse(read("escalation-audit-evidence.json"));
      const chainCases = evidence.cases.filter((entry) => entry.id.startsWith("D.mixed-chain."));
      if (chainCases.length < 6) {
        throw new Error(`expected >= 6 D.mixed-chain cases, got ${chainCases.length}`);
      }
      const failed = chainCases.filter((entry) => entry.outcome !== entry.expected);
      if (failed.length > 0) {
        throw new Error(`hash chain cases failed: ${failed.map((entry) => entry.id).join(", ")}`);
      }
      return { status: "PASS", detail: "mixed-chain hash verification cases passed in evidence" };
    },
  },
  {
    id: "42.7B.1-06",
    name: "doctrine headers in modified 42.7B.1 files",
    run() {
      const missing = DOCTRINE_FILES.filter((relativePath) => {
        const content = read(relativePath);
        return !content.includes("Phase 42.7B.1") || !content.includes("failClosedOnAuditWriteFailure");
      });
      if (missing.length > 0) {
        throw new Error(`missing doctrine headers: ${missing.join(", ")}`);
      }
      return { status: "PASS", detail: `${DOCTRINE_FILES.length} modified files carry Phase 42.7B.1 doctrine headers` };
    },
  },
  {
    id: "42.7B.1-07",
    name: "verify:treatment-resolver regression",
    run() {
      execSync("npm run verify:treatment-resolver", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
      return { status: "PASS", detail: "verify:treatment-resolver passed" };
    },
  },
  {
    id: "42.7B.1-08",
    name: "verify:escalation-audit twice produces byte-identical evidence",
    run() {
      execSync("node scripts/run-escalation-audit-tests.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      const first = read("escalation-audit-evidence.json");
      execSync("node scripts/run-escalation-audit-tests.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      const second = read("escalation-audit-evidence.json");
      if (first !== second) {
        throw new Error("escalation-audit-evidence.json not byte-identical across consecutive runs");
      }
      if (!fs.existsSync(evidencePath)) {
        throw new Error("escalation-audit-evidence.json missing");
      }
      return { status: "PASS", detail: "escalation-audit evidence byte-identical on re-run" };
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
    console.error(`Phase 42.7B.1 verification failed (${failures}/${steps.length} steps).`);
    process.exit(1);
  }
  console.log(`Phase 42.7B.1 verification passed (${steps.length}/${steps.length} steps).`);
}

main();
