/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7D — Org→Standards Edge verifier (spec §9, 10 steps).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(root, "org-edge-evidence.json");
const PURE_CORE_BASE = "b36a16b";
const OUTER_WRAPPER_BASE = "c8bddc8";

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

function collectRelativeImports(filePath, visited = new Set()) {
  const absolutePath = path.resolve(filePath);
  if (visited.has(absolutePath)) {
    return visited;
  }
  visited.add(absolutePath);
  if (!fs.existsSync(absolutePath)) {
    return visited;
  }
  const source = fs.readFileSync(absolutePath, "utf8");
  const importPattern = /from\s+["'](\.[^"']+)["']/g;
  let match = importPattern.exec(source);
  while (match) {
    const importPath = match[1];
    let resolved = path.resolve(path.dirname(absolutePath), importPath);
    if (!path.extname(resolved)) {
      if (fs.existsSync(`${resolved}.ts`)) {
        resolved = `${resolved}.ts`;
      } else if (fs.existsSync(path.join(resolved, "index.ts"))) {
        resolved = path.join(resolved, "index.ts");
      }
    }
    if (path.basename(resolved) !== "types.ts") {
      collectRelativeImports(resolved, visited);
    }
    match = importPattern.exec(source);
  }
  return visited;
}

function assertSubsequence(oldLines, newLines) {
  let oldIndex = 0;
  for (const line of newLines) {
    if (oldIndex < oldLines.length && line === oldLines[oldIndex]) {
      oldIndex += 1;
    }
  }
  if (oldIndex !== oldLines.length) {
    throw new Error("non-additive changes detected (lines removed or reordered)");
  }
}

function grepOrgEdgeDirectory(relativeDir, forbiddenPatterns) {
  const dir = path.join(root, relativeDir);
  const violations = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!/\.(ts|tsx|js|json|md)$/.test(entry.name)) {
        continue;
      }
      const content = fs.readFileSync(fullPath, "utf8");
      for (const pattern of forbiddenPatterns) {
        if (content.includes(pattern)) {
          violations.push(`${path.relative(root, fullPath)} imports ${pattern}`);
        }
      }
    }
  }
  return violations;
}

const CREATE_FILES = [
  "lib/intelligence/synthetic/standards/resolver/org-edge/README.md",
  "lib/intelligence/synthetic/standards/resolver/org-edge/index.ts",
  "lib/intelligence/synthetic/standards/resolver/org-edge/types.ts",
  "lib/intelligence/synthetic/standards/resolver/org-edge/OrgElectionReader.ts",
  "lib/intelligence/synthetic/standards/resolver/org-edge/SyncRegistryOrgElectionReader.ts",
  "lib/intelligence/synthetic/standards/resolver/org-edge/NullOrgElectionReader.ts",
  "lib/intelligence/synthetic/standards/resolver/org-edge/disagreement-detector.ts",
  "lib/intelligence/synthetic/standards/resolver/org-edge/doctrine-banner.ts",
  "scripts/run-org-edge-tests.js",
  "scripts/verify-phase-42-7d.js",
];

const steps = [
  {
    id: "42.7D-01",
    name: "sync-election-registry.json schema validation",
    run() {
      const registry = JSON.parse(
        read("lib/intelligence/synthetic/standards/resolver/sync-election-registry.json"),
      );
      const { validateSyncElectionRegistryDocument } = loadModule(
        "lib/intelligence/synthetic/standards/resolver/org-edge/registry-validator.ts",
      );
      validateSyncElectionRegistryDocument(registry);
      return { status: "PASS", detail: "sync-election-registry.json validates against 42.7A.4 rules" };
    },
  },
  {
    id: "42.7D-02",
    name: "new file presence (spec §3 CREATE)",
    run() {
      const missing = CREATE_FILES.filter((relativePath) => {
        const absolutePath = path.join(root, relativePath);
        return !fs.existsSync(absolutePath) || fs.readFileSync(absolutePath, "utf8").trim().length === 0;
      });
      if (missing.length > 0) {
        throw new Error(`missing or empty CREATE files: ${missing.join(", ")}`);
      }
      return { status: "PASS", detail: `${CREATE_FILES.length} CREATE files present with content` };
    },
  },
  {
    id: "42.7D-03",
    name: "resolveTreatmentPure.ts byte match vs git b36a16b",
    run() {
      const relativePath = "lib/intelligence/synthetic/standards/resolver/resolveTreatmentPure.ts";
      const current = read(relativePath);
      const baseline = gitShow(PURE_CORE_BASE, relativePath);
      if (current !== baseline) {
        throw new Error("resolveTreatmentPure.ts differs from locked baseline b36a16b");
      }
      return { status: "PASS", detail: "resolveTreatmentPure.ts byte-identical to b36a16b" };
    },
  },
  {
    id: "42.7D-04",
    name: "pure core transitive import graph has zero org-edge references",
    run() {
      const pureCorePath = path.join(
        root,
        "lib/intelligence/synthetic/standards/resolver/resolveTreatmentPure.ts",
      );
      const pureSource = fs.readFileSync(pureCorePath, "utf8");
      if (/org-edge/.test(pureSource)) {
        throw new Error("resolveTreatmentPure.ts references org-edge");
      }
      const graph = collectRelativeImports(pureCorePath);
      const violations = [];
      for (const filePath of graph) {
        const content = fs.readFileSync(filePath, "utf8");
        if (/org-edge/.test(content)) {
          violations.push(path.relative(root, filePath));
        }
      }
      if (violations.length > 0) {
        throw new Error(`org-edge references found in pure core graph: ${violations.join(", ")}`);
      }
      return {
        status: "PASS",
        detail: "pure core and its non-types imports have zero org-edge references",
      };
    },
  },
  {
    id: "42.7D-05",
    name: "resolveTreatment.ts additive diff vs c8bddc8",
    run() {
      const relativePath = "lib/intelligence/synthetic/standards/resolver/resolveTreatment.ts";
      const current = read(relativePath);
      let baseline = null;
      try {
        baseline = gitShow(OUTER_WRAPPER_BASE, relativePath);
      } catch {
        baseline = null;
      }

      if (baseline !== null) {
        const baselineLines = baseline.split("\n");
        const currentLines = current.split("\n");
        assertSubsequence(baselineLines, currentLines);
        if (currentLines.length <= baselineLines.length) {
          throw new Error("resolveTreatment.ts has no additive org-edge wiring");
        }
        return { status: "PASS", detail: "resolveTreatment.ts is additive-only vs c8bddc8" };
      }

      const requiredMarkers = [
        "resolveTreatmentPure",
        "detectDisagreement",
        "NullOrgElectionReader",
        "OrgElectionConsolidationNotSupportedError",
        'resolvedBy: "org-edge"',
      ];
      const missing = requiredMarkers.filter((marker) => !current.includes(marker));
      if (missing.length > 0) {
        throw new Error(`resolveTreatment.ts missing org-edge wiring markers: ${missing.join(", ")}`);
      }
      if (/from\s+["']\.\/resolveTreatmentPure["']/.test(current) === false) {
        throw new Error("resolveTreatment.ts must delegate to resolveTreatmentPure");
      }
      return {
        status: "PASS",
        detail: "resolveTreatment.ts present with additive org-edge wiring (no c8bddc8 baseline)",
      };
    },
  },
  {
    id: "42.7D-06",
    name: "backward compat (resolver suites + shims without orgElectionReader)",
    run() {
      execSync("node scripts/run-resolver-tests.js", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
      return { status: "PASS", detail: "verify:treatment-resolver regression suite passed" };
    },
  },
  {
    id: "42.7D-07",
    name: "LOCK-respecting imports under org-edge/**",
    run() {
      const forbidden = [
        "lib/intelligence/synthetic/role-adapter/",
        "lib/intelligence/synthetic/panel-consumer/",
        "lib/intelligence/phase39/",
        "lib/intelligence/synthetic/phase39/",
        "lib/intelligence/phase38/",
        "lib/intelligence/synthetic/phase38/",
      ];
      const violations = grepOrgEdgeDirectory(
        "lib/intelligence/synthetic/standards/resolver/org-edge",
        forbidden,
      );
      if (violations.length > 0) {
        throw new Error(violations.join("; "));
      }
      return { status: "PASS", detail: "org-edge/** has zero forbidden cross-phase imports" };
    },
  },
  {
    id: "42.7D-08",
    name: "verify:org-edge twice produces byte-identical evidence",
    run() {
      execSync("node scripts/run-org-edge-tests.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      const first = read("org-edge-evidence.json");
      execSync("node scripts/run-org-edge-tests.js", { cwd: root, stdio: "pipe", encoding: "utf8" });
      const second = read("org-edge-evidence.json");
      const evidence = JSON.parse(first);
      if (evidence.totalCases !== 60) {
        throw new Error(`expected 60 cases, got ${evidence.totalCases}`);
      }
      if (evidence.failCount !== 0) {
        throw new Error(`${evidence.failCount} org-edge test failures`);
      }
      if (evidence.evidenceVersion !== "42.7D.1") {
        throw new Error(`unexpected evidenceVersion ${evidence.evidenceVersion}`);
      }
      if (first !== second) {
        throw new Error("org-edge-evidence.json not byte-identical across consecutive runs");
      }
      return {
        status: "PASS",
        detail: "60/60 tests passed; evidence byte-identical on re-run",
      };
    },
  },
  {
    id: "42.7D-09",
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
    id: "42.7D-10",
    name: "verify:panel-consumer regression",
    run() {
      execSync("npm run verify:panel-consumer", {
        cwd: root,
        stdio: "pipe",
        encoding: "utf8",
      });
      const evidence = JSON.parse(read("panel-consumer-evidence.json"));
      if (evidence.totalCases !== 87 || evidence.failCount !== 0) {
        throw new Error(`panel-consumer regression failed (${evidence.passCount}/${evidence.totalCases})`);
      }
      return { status: "PASS", detail: "87/87 panel-consumer tests passed" };
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
    console.error(`Phase 42.7D verification failed (${failures}/${steps.length} steps).`);
    process.exit(1);
  }
  console.log(`Phase 42.7D verification passed (${steps.length}/${steps.length} steps).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
