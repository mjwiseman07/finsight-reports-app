#!/usr/bin/env node
/**
 * Shell-free, locally pinned Vitest launcher for Option D / PR #312 suite.
 *
 * Root cause of prior Windows failure: spawnSync("npx.cmd", …, { shell: false })
 * yields EINVAL because .cmd wrappers require a shell. This launcher never uses
 * npx, npm exec, cmd.exe, PowerShell, shell:true, PATH lookup, or network resolve.
 *
 * Command model:
 *   process.execPath <absolute-local-vitest.mjs> run <suiteTemp> --reporter=json --outputFile=<out>
 *   with shell: false and cwd = repository root.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const VITEST_PACKAGE_DIR = path.join(ROOT, "node_modules", "vitest");
const VITEST_PACKAGE_JSON = path.join(VITEST_PACKAGE_DIR, "package.json");

function sha256File(absPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absPath)).digest("hex");
}

/**
 * Resolve the lockfile-installed Vitest CLI entry from local node_modules only.
 * @param {{ root?: string }} [opts]
 */
function resolveLocalVitestEntry(opts = {}) {
  const failures = [];
  const root = opts.root || ROOT;
  const pkgDir = path.join(root, "node_modules", "vitest");
  const pkgJsonPath = path.join(pkgDir, "package.json");

  if (!fs.existsSync(pkgDir) || !fs.statSync(pkgDir).isDirectory()) {
    return {
      ok: false,
      failures: [{ rule: "local_vitest_package_missing", path: pkgDir }],
    };
  }
  if (!fs.existsSync(pkgJsonPath)) {
    return {
      ok: false,
      failures: [{ rule: "local_vitest_package_json_missing", path: pkgJsonPath }],
    };
  }

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  } catch (err) {
    return {
      ok: false,
      failures: [
        {
          rule: "local_vitest_package_json_invalid",
          detail: String(err.message || err).slice(0, 200),
        },
      ],
    };
  }

  const binField = pkg.bin;
  let binRel = null;
  if (typeof binField === "string") binRel = binField;
  else if (binField && typeof binField === "object" && typeof binField.vitest === "string") {
    binRel = binField.vitest;
  }
  if (!binRel) {
    return {
      ok: false,
      failures: [{ rule: "local_vitest_bin_field_missing" }],
    };
  }

  // Reject path traversal / absolute bin targets outside the package dir.
  if (path.isAbsolute(binRel) || binRel.split(/[/\\]/).includes("..")) {
    return {
      ok: false,
      failures: [{ rule: "local_vitest_bin_path_rejected", bin: binRel }],
    };
  }

  const entryPath = path.resolve(pkgDir, binRel);
  const expectedPrefix = path.resolve(pkgDir) + path.sep;
  if (entryPath !== path.resolve(pkgDir) && !entryPath.startsWith(expectedPrefix)) {
    return {
      ok: false,
      failures: [{ rule: "local_vitest_entry_outside_package", entryPath }],
    };
  }
  if (!fs.existsSync(entryPath) || !fs.statSync(entryPath).isFile()) {
    return {
      ok: false,
      failures: [{ rule: "local_vitest_entry_missing", entryPath }],
    };
  }

  return {
    ok: true,
    failures: [],
    packageDir: pkgDir,
    packageJsonPath: pkgJsonPath,
    packageName: pkg.name || "vitest",
    packageVersion: pkg.version || null,
    binField: binRel,
    entryPath,
    entrySha256: sha256File(entryPath),
    resolver: "node_modules_vitest_package_json_bin",
    shellUsed: false,
    networkResolverUsed: false,
    npxUsed: false,
  };
}

/**
 * Build the exact argv for a shell-free Vitest run.
 * @param {{ entryPath: string, suitePath: string, outputFile: string }} opts
 */
function buildVitestArgv(opts) {
  const entryPath = opts.entryPath;
  const suitePath = opts.suitePath;
  const outputFile = opts.outputFile;
  if (!entryPath || !suitePath || !outputFile) {
    return {
      ok: false,
      failures: [{ rule: "vitest_argv_incomplete" }],
    };
  }
  return {
    ok: true,
    failures: [],
    command: process.execPath,
    argv: [entryPath, "run", suitePath, "--reporter=json", `--outputFile=${outputFile}`],
    shell: false,
  };
}

/**
 * Prove the spawn plan never uses shell / npx / network resolvers.
 */
function assertShellFreeLaunchPlan(plan) {
  const failures = [];
  if (!plan || plan.shell !== false) {
    failures.push({ rule: "shell_must_be_false" });
  }
  if (!plan || plan.command !== process.execPath) {
    failures.push({
      rule: "command_must_be_process_exec_path",
      observed: plan?.command || null,
    });
  }
  const argv = plan?.argv || [];
  const joined = argv.join(" ").toLowerCase();
  if (/\bnpx(\.cmd)?\b/.test(joined) || /\bnpm(\.cmd)?\b/.test(joined)) {
    failures.push({ rule: "npx_or_npm_in_argv_rejected" });
  }
  if (plan?.command && /\bnpx(\.cmd)?$/i.test(String(plan.command))) {
    failures.push({ rule: "npx_as_command_rejected" });
  }
  if (plan?.networkResolverUsed === true) {
    failures.push({ rule: "network_resolver_rejected" });
  }
  return { ok: failures.length === 0, failures };
}

/**
 * Launch Vitest via process.execPath + local entry. Does not apply SQL.
 *
 * @param {{
 *   suitePath: string,
 *   outputFile: string,
 *   cwd?: string,
 *   env?: NodeJS.ProcessEnv,
 *   timeoutMs?: number,
 *   root?: string,
 *   spawnSyncImpl?: typeof spawnSync,
 * }} opts
 */
function launchLocalVitest(opts) {
  const resolved = resolveLocalVitestEntry({ root: opts.root || ROOT });
  if (!resolved.ok) {
    return {
      ok: false,
      processExitCode: null,
      signal: null,
      timedOut: false,
      error: resolved.failures[0]?.rule || "local_vitest_resolve_failed",
      failures: resolved.failures,
      launcher: null,
      spawn: null,
      stdout: "",
      stderr: "",
    };
  }

  const argvPlan = buildVitestArgv({
    entryPath: resolved.entryPath,
    suitePath: opts.suitePath,
    outputFile: opts.outputFile,
  });
  if (!argvPlan.ok) {
    return {
      ok: false,
      processExitCode: null,
      signal: null,
      timedOut: false,
      error: "vitest_argv_incomplete",
      failures: argvPlan.failures,
      launcher: resolved,
      spawn: null,
      stdout: "",
      stderr: "",
    };
  }

  const planCheck = assertShellFreeLaunchPlan({
    ...argvPlan,
    networkResolverUsed: resolved.networkResolverUsed,
  });
  if (!planCheck.ok) {
    return {
      ok: false,
      processExitCode: null,
      signal: null,
      timedOut: false,
      error: "shell_free_launch_plan_rejected",
      failures: planCheck.failures,
      launcher: resolved,
      spawn: argvPlan,
      stdout: "",
      stderr: "",
    };
  }

  const spawnImpl = opts.spawnSyncImpl || spawnSync;
  const timeoutMs = opts.timeoutMs == null ? 600_000 : Number(opts.timeoutMs);
  const startedAt = Date.now();
  const r = spawnImpl(argvPlan.command, argvPlan.argv, {
    cwd: opts.cwd || ROOT,
    encoding: "utf8",
    env: opts.env || process.env,
    timeout: timeoutMs,
    shell: false,
    windowsHide: true,
  });
  const elapsedMs = Date.now() - startedAt;
  const timedOut =
    r.error &&
    (r.error.code === "ETIMEDOUT" ||
      String(r.error.message || "").toLowerCase().includes("timed out"));

  const launcherProvenance = {
    nodeExecPath: process.execPath,
    nodeVersion: process.version,
    vitestPackageVersion: resolved.packageVersion,
    vitestEntryPath: resolved.entryPath,
    vitestEntrySha256: resolved.entrySha256,
    resolver: resolved.resolver,
    shell: false,
    npxUsed: false,
    networkResolverUsed: false,
    argv: argvPlan.argv,
    commandModel:
      "process.execPath <node_modules/vitest/vitest.mjs> run <tempSuite> --reporter=json --outputFile=<tmpJson>",
    processExitCode: r.status,
    signal: r.signal || null,
    timedOut: Boolean(timedOut),
    elapsedMs,
    error: r.error ? String(r.error.message || r.error).slice(0, 300) : null,
  };

  return {
    ok: !r.error && r.status === 0 && !timedOut,
    processExitCode: r.status,
    signal: r.signal || null,
    timedOut: Boolean(timedOut),
    error: r.error || null,
    failures: [],
    launcher: launcherProvenance,
    spawn: argvPlan,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

module.exports = {
  ROOT,
  VITEST_PACKAGE_DIR,
  VITEST_PACKAGE_JSON,
  resolveLocalVitestEntry,
  buildVitestArgv,
  assertShellFreeLaunchPlan,
  launchLocalVitest,
  sha256File,
};
