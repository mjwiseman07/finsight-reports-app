"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Authenticated outer-launch binding for corrective dry-run.
 *
 * The clean executable never embeds its own SHA. A separate launcher tip
 * (not executable, not an AUTH-publication parent) binds:
 *   - expected_executable_commit
 *   - optional executable-authority publication + AUTH blob seals
 *   - bootstrap / entry / ceremony / bundle / frame / receipt seals
 *
 * describeExecutableAuthorityMap consumes expectedExecutableCommit only from
 * this binding (Git blob) or explicit in-process harness context — never from
 * AUTH record self-selection, argv, env, or worktree files.
 */
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
  OUTER_LAUNCH_BINDING_PATH,
  OUTER_LAUNCH_BINDING_PROTOCOL_ID,
  STANDALONE_BUNDLE_PATH,
  TOOLING_AUTHORIZATION_PATH,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { loadAndVerifyGitBlob } = require("./git-blob-authority");

const PROTOCOL = OUTER_LAUNCH_BINDING_PROTOCOL_ID;
const BINDING_REL = OUTER_LAUNCH_BINDING_PATH;
const AUTH_REL = TOOLING_AUTHORIZATION_PATH;
const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;

const BOOTSTRAP_REL =
  "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1";
const CEREMONY_REL =
  "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1";
const ENTRY_REL = "scripts/security/apply-ra-pro-accounting-automation-corrective.js";
const FRAME_REL = "scripts/security/ra-pro-accounting-automation-corrective-evidence.js";
const RECEIPT_REL =
  "scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js";

const SEAL_PAIRS = Object.freeze([
  ["bootstrap", BOOTSTRAP_REL],
  ["entry", ENTRY_REL],
  ["ceremony", CEREMONY_REL],
  ["bundle", STANDALONE_BUNDLE_PATH],
  ["frame", FRAME_REL],
  ["receipt", RECEIPT_REL],
]);

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "outer_launch_binding";
  return error;
}

function gitEnv(cwd) {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
  env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "ra-acct-corrective-outer-bind-disposable";
  env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "ra-acct-corrective-outer-bind-disposable@invalid";
  env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || "ra-acct-corrective-outer-bind-disposable";
  env.GIT_COMMITTER_EMAIL =
    env.GIT_COMMITTER_EMAIL || "ra-acct-corrective-outer-bind-disposable@invalid";
  return env;
}

function gitText(args, cwd) {
  return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
}

function canonicalUnboundOuterLaunchBinding() {
  return {
    protocol: PROTOCOL,
    status: "UNBOUND",
    expected_executable_commit: null,
    executable_authority_publication_commit: null,
    executable_authority_blob: null,
    seals: null,
    note:
      "Outer launch binding remains UNBOUND on the clean executable tip. A separate reviewed launcher tip binds the expected executable and artifact seals after the executable SHA is known. The launcher tip is never an executable and never an authorization-publication parent.",
  };
}

function requireSeal(seal, label) {
  if (
    !seal ||
    seal.path == null ||
    !HEX40.test(String(seal.oid || "")) ||
    !HEX64.test(String(seal.sha256 || "")) ||
    !Number.isInteger(seal.bytes)
  ) {
    throw blocked("OUTER_LAUNCH_BINDING_SEAL_MISSING", label);
  }
}

function assertSealAgainstTip(commit, rel, seal, cwd) {
  requireSeal(seal, rel);
  if (seal.path !== rel) {
    throw blocked("OUTER_LAUNCH_BINDING_SEAL_MISSING", `${rel} path`);
  }
  try {
    loadAndVerifyGitBlob({
      commit,
      path: rel,
      expectedOid: seal.oid,
      expectedSha256: seal.sha256,
      expectedBytes: seal.bytes,
      cwd,
    });
  } catch (err) {
    throw blocked(
      "OUTER_LAUNCH_BINDING_SEAL_MISMATCH",
      err && err.message ? err.message : rel,
    );
  }
}

function sealAtCommit(commit, rel, cwd) {
  const loaded = loadAndVerifyGitBlob({ commit, path: rel, cwd });
  return {
    path: rel,
    oid: loaded.oid,
    sha256: loaded.sha256,
    bytes: loaded.bytes,
    line_endings: "LF",
  };
}

function loadBindingFromGit(commit, cwd, expect = {}) {
  const loaded = loadAndVerifyGitBlob({
    commit,
    path: BINDING_REL,
    expectedOid: expect.expectBlobOid,
    expectedSha256: expect.expectBlobSha256,
    expectedBytes: expect.expectBlobBytes,
    cwd,
  });
  const binding = JSON.parse(loaded.buffer.toString("utf8"));
  if (binding.protocol !== PROTOCOL) {
    throw blocked("OUTER_LAUNCH_BINDING_PROTOCOL_MISSING", "protocol");
  }
  return { binding, loaded };
}

function assertBoundBindingShape(binding, cwd) {
  if (binding.status !== "BOUND") {
    throw blocked(EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED, "outer binding not BOUND");
  }
  const expected = String(binding.expected_executable_commit || "").toLowerCase();
  if (!HEX40.test(expected)) {
    throw blocked(EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED, "expected_executable_commit");
  }
  // Binding tip must not be the expected executable (launcher ≠ executable).
  // Caller supplies bindingPublication separately; checked in describeOuterLaunchBinding.
  const seals = binding.seals || {};
  for (const [key, rel] of SEAL_PAIRS) {
    assertSealAgainstTip(expected, rel, seals[key], cwd);
  }
  const authPub = binding.executable_authority_publication_commit;
  const authBlob = binding.executable_authority_blob;
  if (authPub != null || authBlob != null) {
    const pub = String(authPub || "").toLowerCase();
    if (!HEX40.test(pub)) {
      throw blocked("OUTER_LAUNCH_BINDING_SEAL_MISSING", "executable_authority_publication_commit");
    }
    requireSeal(authBlob, "executable_authority_blob");
    if (authBlob.path && authBlob.path !== AUTH_REL) {
      throw blocked("OUTER_LAUNCH_BINDING_SEAL_MISSING", "executable_authority_blob path");
    }
    loadAndVerifyGitBlob({
      commit: pub,
      path: AUTH_REL,
      expectedOid: authBlob.oid,
      expectedSha256: authBlob.sha256,
      expectedBytes: authBlob.bytes,
      cwd,
    });
  }
  return expected;
}

/**
 * Resolve authenticated expectedExecutableCommit.
 * Rejects argv/env/worktree/AUTH-record as trust sources.
 */
function resolveAuthenticatedExpectedExecutable(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();

  if (inputs.fromArgv === true) {
    throw blocked(
      EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
      "argv cannot supply trusted expectedExecutableCommit",
    );
  }
  if (inputs.fromEnv === true) {
    throw blocked(
      EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
      "env cannot supply trusted expectedExecutableCommit",
    );
  }
  if (inputs.fromWorktree === true || inputs.worktreeBinding != null) {
    throw blocked(
      EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
      "worktree cannot supply trusted expectedExecutableCommit",
    );
  }
  if (inputs.fromAuthorizationRecord === true) {
    throw blocked(
      EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
      "authorization record cannot supply trusted expectedExecutableCommit",
    );
  }

  // Explicit in-process harness only (unit tests).
  if (
    inputs.testOnlyHarnessContext === true &&
    inputs.allowInProcessExpectedExecutable === true
  ) {
    const tip = String(inputs.expectedExecutableCommit || "").toLowerCase();
    if (!HEX40.test(tip)) {
      throw blocked(
        EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
        "harness expectedExecutableCommit shape",
      );
    }
    return {
      expected_executable_commit: tip,
      source: "in_process_harness",
      binding_publication_commit: null,
      binding_blob_oid: null,
      binding: null,
    };
  }

  const publication = String(
    inputs.outerLaunchBindingPublication ||
      inputs.outerLaunchBindingCommit ||
      "",
  ).toLowerCase();
  if (!HEX40.test(publication)) {
    throw blocked(
      EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
      "outerLaunchBindingPublication required",
    );
  }

  const { binding, loaded } = loadBindingFromGit(publication, cwd, {
    expectBlobOid: inputs.expectOuterLaunchBindingBlobOid,
    expectBlobSha256: inputs.expectOuterLaunchBindingBlobSha256,
    expectBlobBytes: inputs.expectOuterLaunchBindingBlobBytes,
  });

  if (inputs.binding && JSON.stringify(inputs.binding) !== JSON.stringify(binding)) {
    throw blocked("OUTER_LAUNCH_BINDING_WORKTREE_SUBSTITUTE", "binding object");
  }

  const expected = assertBoundBindingShape(binding, cwd);
  if (expected === publication) {
    throw blocked(
      EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
      "launcher tip cannot be the expected executable",
    );
  }

  // Optional recheck of caller-supplied expected (never trust root).
  if (inputs.expectExecutableRecheck != null && String(inputs.expectExecutableRecheck).length) {
    const recheck = String(inputs.expectExecutableRecheck).toLowerCase();
    if (!HEX40.test(recheck) || recheck !== expected) {
      throw blocked("OUTER_LAUNCH_BINDING_PIN_MISMATCH", "expectExecutableRecheck");
    }
  }

  return {
    expected_executable_commit: expected,
    source: "outer_launch_binding_git",
    binding_publication_commit: publication,
    binding_blob_oid: loaded.oid,
    binding_blob_sha256: loaded.sha256,
    binding_blob_bytes: loaded.bytes,
    binding,
    executable_authority_publication_commit:
      binding.executable_authority_publication_commit || null,
    executable_authority_blob: binding.executable_authority_blob || null,
    seals: binding.seals,
  };
}

function describeOuterLaunchBinding(inputs = {}) {
  return resolveAuthenticatedExpectedExecutable(inputs);
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
      const emptyTree = mktree([], cwd);
      const child = replacePathInTree(emptyTree, parts.slice(1), blob, cwd);
      next.push(`040000 tree ${child}\t${name}`);
    }
  }
  return mktree(next, cwd);
}

function commitBindingTree(cwd, parent, bindingObject) {
  const text = `${JSON.stringify(bindingObject, null, 2)}\n`;
  if (text.includes("\r")) throw blocked("OUTER_LAUNCH_BINDING_SEAL_MISSING", "crlf");
  const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd,
    env: gitEnv(cwd),
    input: text,
    encoding: "utf8",
  }).trim();
  const tree = gitText(["log", "-1", "--format=%T", parent], cwd);
  const newTree = replacePathInTree(tree, BINDING_REL.split("/"), blob, cwd);
  return execFileSync(
    "git",
    ["commit-tree", newTree, "-p", parent, "-m", "disposable corrective outer launch binding"],
    { cwd, env: gitEnv(cwd), encoding: "utf8" },
  ).trim();
}

/**
 * Disposable BOUND launcher tip parented on the expected executable.
 * Delta is OUTER_LAUNCH_BINDING.json only — cannot serve as AUTH-only parent.
 */
function createDisposableOuterLaunchBindingCommit(inputs = {}) {
  if (inputs.allowDisposableOuterLaunchBindingCommit !== true) {
    throw blocked("DISPOSABLE_OUTER_LAUNCH_BINDING_FORBIDDEN", "harness flag required");
  }
  if (inputs.testOnlyHarnessContext !== true) {
    throw blocked("HARNESS_CONTEXT_REQUIRED", "testOnlyHarnessContext required");
  }
  const cwd = inputs.cwd || process.cwd();
  const expected = String(inputs.expectedExecutableCommit || "").toLowerCase();
  if (!HEX40.test(expected)) {
    throw blocked(
      EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
      "expectedExecutableCommit required",
    );
  }

  const seals = {};
  for (const [key, rel] of SEAL_PAIRS) {
    seals[key] = sealAtCommit(expected, rel, cwd);
  }

  let executableAuthorityPublicationCommit = null;
  let executableAuthorityBlob = null;
  if (inputs.executableAuthorityPublicationCommit) {
    const pub = String(inputs.executableAuthorityPublicationCommit).toLowerCase();
    if (!HEX40.test(pub)) {
      throw blocked("OUTER_LAUNCH_BINDING_SEAL_MISSING", "executableAuthorityPublicationCommit");
    }
    const loaded = loadAndVerifyGitBlob({ commit: pub, path: AUTH_REL, cwd });
    executableAuthorityPublicationCommit = pub;
    executableAuthorityBlob = {
      path: AUTH_REL,
      oid: loaded.oid,
      sha256: loaded.sha256,
      bytes: loaded.bytes,
    };
  }

  const binding = {
    protocol: PROTOCOL,
    status: "BOUND",
    expected_executable_commit: expected,
    executable_authority_publication_commit: executableAuthorityPublicationCommit,
    executable_authority_blob: executableAuthorityBlob,
    seals,
    note:
      "Disposable outer-launch binding for harness only. Launcher tip is not executable and not an authorization-publication parent.",
  };

  const before = gitText(["rev-parse", "HEAD"], cwd);
  // Parent on expected executable so delta is binding-only vs clean executable.
  const publication = commitBindingTree(cwd, expected, binding);
  const after = gitText(["rev-parse", "HEAD"], cwd);
  if (before !== after) throw blocked("OUTER_LAUNCH_BINDING_SEAL_MISSING", "HEAD moved");
  if (publication === expected) {
    throw blocked(EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED, "circular launcher");
  }

  return {
    outerLaunchBindingPublication: publication,
    expectedExecutableCommit: expected,
    binding_blob_oid: gitText(["rev-parse", `${publication}:${BINDING_REL}`], cwd),
    headUnchanged: true,
    binding,
  };
}

module.exports = {
  AUTH_REL,
  BINDING_REL,
  BOOTSTRAP_REL,
  CEREMONY_REL,
  ENTRY_REL,
  FRAME_REL,
  PROTOCOL,
  RECEIPT_REL,
  SEAL_PAIRS,
  assertBoundBindingShape,
  canonicalUnboundOuterLaunchBinding,
  createDisposableOuterLaunchBindingCommit,
  describeOuterLaunchBinding,
  loadBindingFromGit,
  resolveAuthenticatedExpectedExecutable,
  sealAtCommit,
};
