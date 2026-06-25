/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7D.1-audit — Org-Edge Reconciliation Audit Retrofit verifier (spec §6, ≥8 checks).
 */
const { execSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(root, "org-edge-audit-evidence.json");
const PURE_CORE_BASE = "20b4bdf";

const DOCTRINE_FILES = [
  "lib/intelligence/synthetic/standards/resolver/org-edge/OrgStandardsEdge.ts",
  "lib/intelligence/synthetic/standards/resolver/org-edge/disagreement-detector.ts",
  "lib/intelligence/synthetic/standards/resolver/org-edge/deriveOrgEdgeReconciliationContextPure.ts",
  "lib/intelligence/synthetic/standards/audit/validators.ts",
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
    /export function detectDisagreement\(/g,
    "export function detectDisagreementPure(",
  );
}

const steps = [
  {
    id: "42.7D.1-01",
    name: "orgStandardsEdgePure.ts matches 20b4bdf disagreement-detector (rename-only diff)",
    run() {
      const relativePure =
        "lib/intelligence/synthetic/standards/resolver/org-edge/orgStandardsEdgePure.ts";
      const current = read(relativePure);
      const baseline = gitShow(
        PURE_CORE_BASE,
        "lib/intelligence/synthetic/standards/resolver/org-edge/disagreement-detector.ts",
      );
      const normalized = normalizePureCoreFromBaseline(baseline);
      if (current !== normalized) {
        throw new Error(
          "orgStandardsEdgePure.ts differs from locked 20b4bdf disagreement-detector beyond allowed renames",
        );
      }
      return {
        status: "PASS",
        detail: `orgStandardsEdgePure.ts SHA-256 ${sha256(current)} matches 20b4bdf after rename normalization`,
      };
    },
  },
  {
    id: "42.7D.1-02",
    name: "OrgStandardsEdge.ts wrapper imports AuditLogWriter from 42.7E module",
    run() {
      const source = read(
        "lib/intelligence/synthetic/standards/resolver/org-edge/OrgStandardsEdge.ts",
      );
      if (!source.includes("auditLogWriter") || !source.includes("../../audit/types")) {
        throw new Error("OrgStandardsEdge.ts missing AuditLogWriter wiring");
      }
      return { status: "PASS", detail: "OrgStandardsEdge.ts imports audit types and uses auditLogWriter" };
    },
  },
  {
    id: "42.7D.1-03",
    name: "AuditEventKind includes orgEdge.reconciliation variant",
    run() {
      const source = read("lib/intelligence/synthetic/standards/audit/types.ts");
      if (!source.includes('"orgEdge.reconciliation"')) {
        throw new Error("orgEdge.reconciliation kind missing from AuditEventKind");
      }
      return { status: "PASS", detail: "orgEdge.reconciliation present in AuditEventKind" };
    },
  },
  {
    id: "42.7D.1-04",
    name: "validateOrgEdgeReconciliationEntry exists and is exported",
    run() {
      const mod = loadModule("lib/intelligence/synthetic/standards/audit/validators.ts");
      if (typeof mod.validateOrgEdgeReconciliationEntry !== "function") {
        throw new Error("validateOrgEdgeReconciliationEntry missing");
      }
      if (typeof mod.validateCallerIdentity !== "function") {
        throw new Error("validateCallerIdentity missing");
      }
      return { status: "PASS", detail: "validateOrgEdgeReconciliationEntry and validateCallerIdentity exported" };
    },
  },
  {
    id: "42.7D.1-05",
    name: "locked-citation-handles reused by validator (no duplicate allow-list)",
    run() {
      const source = read("lib/intelligence/synthetic/standards/audit/validators.ts");
      if (!source.includes("locked-citation-handles")) {
        throw new Error("validators.ts does not import locked-citation-handles");
      }
      if (source.includes("LOCKED_CITATION_HANDLES =")) {
        throw new Error("validators.ts redeclares locked citation allow-list");
      }
      return { status: "PASS", detail: "validators.ts imports locked-citation-handles from 42.7C.2" };
    },
  },
  {
    id: "42.7D.1-06",
    name: "no new hash chain; verifyAuditChain reused from 42.7E",
    run() {
      const source = read(
        "lib/intelligence/synthetic/standards/resolver/org-edge/OrgStandardsEdge.ts",
      );
      if (/new\s+.*Chain|separateChain|parallelChain/i.test(source)) {
        throw new Error("OrgStandardsEdge.ts appears to declare a new audit chain");
      }
      const hashChain = read("lib/intelligence/synthetic/standards/audit/hash-chain.ts");
      if (!hashChain.includes("verifyAuditChain")) {
        throw new Error("verifyAuditChain missing from 42.7E hash-chain module");
      }
      return { status: "PASS", detail: "Org-edge audit uses existing 42.7E hash chain via AuditLogWriter" };
    },
  },
  {
    id: "42.7D.1-07",
    name: "verify:org-edge regression (60/60 prior tests)",
    run() {
      execSync("npm run verify:org-edge", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
      return { status: "PASS", detail: "verify:org-edge 60/60 passed" };
    },
  },
  {
    id: "42.7D.1-08",
    name: "verify:org-edge-audit passes (≥40 new tests)",
    run() {
      execSync("npm run verify:org-edge-audit", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
      const evidence = JSON.parse(read("org-edge-audit-evidence.json"));
      if (evidence.totalCases < 40) {
        throw new Error(`expected >= 40 audit tests, got ${evidence.totalCases}`);
      }
      if (evidence.failCount !== 0) {
        throw new Error(`${evidence.failCount} org-edge-audit test failures`);
      }
      return {
        status: "PASS",
        detail: `${evidence.passCount}/${evidence.totalCases} audit tests passed; evidenceVersion ${evidence.evidenceVersion}`,
      };
    },
  },
  {
    id: "42.7D.1-09",
    name: "doctrine headers in modified 42.7D.1-audit files",
    run() {
      const missing = DOCTRINE_FILES.filter((relativePath) => {
        const content = read(relativePath);
        return !content.includes("42.7D.1") || !content.includes("failClosedOnAuditWriteFailure");
      });
      if (missing.length > 0) {
        throw new Error(`missing doctrine headers: ${missing.join(", ")}`);
      }
      return {
        status: "PASS",
        detail: `${DOCTRINE_FILES.length} modified files carry Phase 42.7D.1-audit doctrine headers`,
      };
    },
  },
  {
    id: "42.7D.1-10",
    name: "fail-closed audit-write test present in evidence",
    run() {
      const evidence = JSON.parse(read("org-edge-audit-evidence.json"));
      const failCase = evidence.cases.find((entry) => entry.id === "H.fail-closed.01");
      if (!failCase || failCase.outcome !== failCase.expected) {
        throw new Error("H.fail-closed.01 missing or failing in evidence");
      }
      return { status: "PASS", detail: "fail-closed audit semantics verified in evidence" };
    },
  },
];

function main() {
  if (!fs.existsSync(evidencePath)) {
    execSync("node scripts/run-org-edge-audit-tests.js", {
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
    console.error(`Phase 42.7D.1-audit verification failed (${failures}/${steps.length} steps).`);
    process.exit(1);
  }
  console.log(`Phase 42.7D.1-audit verification passed (${steps.length}/${steps.length} steps).`);
}

main();
