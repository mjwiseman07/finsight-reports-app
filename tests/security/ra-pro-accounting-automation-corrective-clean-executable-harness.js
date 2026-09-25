/**
 * Harness-only clean executable tip resolution for corrective security tests.
 *
 * Prefer CORRECTIVE_CLEAN_EXECUTABLE (parent retarget after new clean commit).
 * Else FALLBACK_CLEAN (032d7179… — current future publication parent with outer-launch protocol).
 * Overlay materialize only if the fallback tip fails remediated-protocol checks.
 */
const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const {
  assertExecutableHasRemediatedProtocol,
} = require("../../scripts/security/ra-pro-accounting-automation-corrective-executable-authority.js");
const {
  EXECUTABLE_AUTHORITY_MODULE_REL,
  OUTER_LAUNCH_BINDING_MODULE_REL,
  STANDALONE_BUNDLE_PATH,
  TOOLING_AUTHORIZATION_PATH,
} = require("../../scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js");

/** Future publication parent — clean remedial executable with outer-launch protocol. */
const FALLBACK_CLEAN = "032d717922ff69502829cd1081a363390b5838a7";

/** Paths that must come from the worktree for outer-launch protocol completeness (overlay fallback only). */
const OVERLAY_RELS = [
  STANDALONE_BUNDLE_PATH,
  OUTER_LAUNCH_BINDING_MODULE_REL,
  EXECUTABLE_AUTHORITY_MODULE_REL,
  "scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js",
  "scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js",
  "scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js",
  "scripts/security/ra-pro-accounting-automation-corrective-apply-core.js",
  "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1",
  "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1",
  "scripts/security/apply-ra-pro-accounting-automation-corrective.js",
  "scripts/security/ra-pro-accounting-automation-corrective-evidence.js",
  "scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js",
];

let cached = null;

function gitEnv(cwd) {
  return {
    ...process.env,
    GIT_DIR: path.join(cwd, ".git"),
    GIT_WORK_TREE: cwd,
  };
}

function gitText(args, cwd) {
  return execFileSync("git", ["-c", `safe.directory=${cwd.replace(/\\/g, "/")}`, ...args], {
    cwd,
    env: gitEnv(cwd),
    encoding: "utf8",
  }).trim();
}

function mktree(lines, cwd) {
  const input = lines.length ? `${lines.join("\n")}\n` : "";
  return execFileSync("git", ["mktree"], {
    cwd,
    env: gitEnv(cwd),
    input,
    encoding: "utf8",
  }).trim();
}

function replacePathInTree(tree, parts, blob, cwd) {
  const lines = gitText(["ls-tree", tree], cwd).split(/\n/).filter(Boolean);
  const name = parts[0];
  let found = false;
  const next = lines.map((line) => {
    const tab = line.indexOf("\t");
    if (line.slice(tab + 1) !== name) return line;
    found = true;
    if (parts.length === 1) return `100644 blob ${blob}\t${name}`;
    const old = line.slice(0, tab).split(" ")[2];
    const child = replacePathInTree(old, parts.slice(1), blob, cwd);
    return `040000 tree ${child}\t${name}`;
  });
  if (!found) {
    if (parts.length === 1) next.push(`100644 blob ${blob}\t${name}`);
    else {
      const empty = mktree([], cwd);
      const child = replacePathInTree(empty, parts.slice(1), blob, cwd);
      next.push(`040000 tree ${child}\t${name}`);
    }
  }
  return mktree(next, cwd);
}

/** Hash worktree bytes via stdin with LF normalization (avoids Windows autocrlf OID drift). */
function hashWorktreeFileLf(rel, cwd) {
  const abs = path.join(cwd, rel.replace(/\//g, path.sep));
  if (!fs.existsSync(abs)) {
    throw new Error(`CLEAN_EXECUTABLE_HARNESS_MISSING: ${rel}`);
  }
  let text = fs.readFileSync(abs, "utf8");
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const buf = Buffer.from(text, "utf8");
  const oid = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd,
    env: gitEnv(cwd),
    input: buf,
    encoding: "utf8",
  }).trim();
  return {
    oid,
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
  };
}

/**
 * Disposable tip: fallback tree + worktree overlays (only when FALLBACK_CLEAN lacks protocol).
 */
function materializeWorktreeCleanExecutableTip(cwd) {
  const before = gitText(["rev-parse", "HEAD"], cwd);
  let tree = gitText(["rev-parse", `${FALLBACK_CLEAN}^{tree}`], cwd);
  let bundleSeal = null;
  for (const rel of OVERLAY_RELS) {
    const abs = path.join(cwd, rel.replace(/\//g, path.sep));
    if (!fs.existsSync(abs)) continue;
    const hashed = hashWorktreeFileLf(rel, cwd);
    if (rel === STANDALONE_BUNDLE_PATH) bundleSeal = hashed;
    tree = replacePathInTree(tree, rel.split("/"), hashed.oid, cwd);
  }
  if (!bundleSeal) {
    throw new Error("CLEAN_EXECUTABLE_HARNESS_MISSING: standalone bundle");
  }

  const authRaw = execFileSync(
    "git",
    ["cat-file", "blob", `${FALLBACK_CLEAN}:${TOOLING_AUTHORIZATION_PATH}`],
    { cwd, env: gitEnv(cwd), encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  const auth = JSON.parse(authRaw.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
  auth.standalone_bundle = {
    ...(auth.standalone_bundle || {}),
    path: STANDALONE_BUNDLE_PATH,
    oid: bundleSeal.oid,
    sha256: bundleSeal.sha256,
    bytes: bundleSeal.bytes,
  };
  const authText = `${JSON.stringify(auth, null, 2)}\n`;
  if (authText.includes("\r")) {
    throw new Error("CLEAN_EXECUTABLE_HARNESS_CRLF: AUTH");
  }
  const authOid = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd,
    env: gitEnv(cwd),
    input: authText,
    encoding: "utf8",
  }).trim();
  tree = replacePathInTree(tree, TOOLING_AUTHORIZATION_PATH.split("/"), authOid, cwd);

  const tip = execFileSync(
    "git",
    [
      "commit-tree",
      tree,
      "-p",
      FALLBACK_CLEAN,
      "-m",
      "disposable harness clean executable (worktree protocol overlay; not for production)",
    ],
    { cwd, env: gitEnv(cwd), encoding: "utf8" },
  ).trim();
  const after = gitText(["rev-parse", "HEAD"], cwd);
  if (before !== after) {
    throw new Error("CLEAN_EXECUTABLE_HARNESS_HEAD_MOVED");
  }
  assertExecutableHasRemediatedProtocol(tip, cwd);
  return tip.toLowerCase();
}

/**
 * Resolve the clean remedial executable tip for corrective security tests.
 */
function resolveCorrectiveCleanExecutable(cwd = process.cwd()) {
  if (cached) return cached;
  const fromEnv = String(process.env.CORRECTIVE_CLEAN_EXECUTABLE || "").toLowerCase();
  if (/^[0-9a-f]{40}$/.test(fromEnv)) {
    assertExecutableHasRemediatedProtocol(fromEnv, cwd);
    cached = fromEnv;
    return cached;
  }
  try {
    assertExecutableHasRemediatedProtocol(FALLBACK_CLEAN, cwd);
    cached = FALLBACK_CLEAN;
    return cached;
  } catch {
    cached = materializeWorktreeCleanExecutableTip(cwd);
    return cached;
  }
}

function resetCorrectiveCleanExecutableCache() {
  cached = null;
}

module.exports = {
  FALLBACK_CLEAN,
  OVERLAY_RELS,
  materializeWorktreeCleanExecutableTip,
  resetCorrectiveCleanExecutableCache,
  resolveCorrectiveCleanExecutable,
};
