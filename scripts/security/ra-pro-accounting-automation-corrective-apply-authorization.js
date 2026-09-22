"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Minimal apply authorization for the CORRECTIVE accounting-automation package.
 * Production record starts UNPUBLISHED. Disposable publication is for tests only.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  APPLY_AUTHORIZATION_TOKEN,
  CONSUMED_ORIGINAL_ATTEMPT_ID,
  DATABASE_URL_ENV,
  EXPECTED_PROJECT_REF,
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  TOOLING_AUTHORIZATION_PATH,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { loadAndVerifyGitBlob } = require("./git-blob-authority");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_ONE_ATTEMPT_APPLY_AUTHORIZATION_V1";
const AUTH_REL = TOOLING_AUTHORIZATION_PATH;
const ATTEMPT_RE = /^apply-[0-9a-f]{12}-[0-9a-f]{32}$/;
const HEX40 = /^[0-9a-f]{40}$/;
const ORIGINAL_VERSIONS = new Set(ORIGINAL_COMMITTED_MIGRATIONS.map((m) => m.version));

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "authorization";
  return error;
}

function gitEnv(cwd) {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
  env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "ra-acct-corrective-disposable";
  env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "ra-acct-corrective-disposable@invalid";
  env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || "ra-acct-corrective-disposable";
  env.GIT_COMMITTER_EMAIL = env.GIT_COMMITTER_EMAIL || "ra-acct-corrective-disposable@invalid";
  return env;
}

function gitText(args, cwd) {
  return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
}

function canonicalUnpublishedAuthorization() {
  return {
    status: "UNPUBLISHED",
    protocol: PROTOCOL,
    apply_authorized: false,
    authorized_executable_commit: null,
    attempt_id: null,
    project_ref: null,
    database_url_env: null,
    apply_authorization_token: null,
    bundle: null,
    migrations: null,
    publication_role: "later_descendant_commit",
    note: "Corrective apply authorization is unpublished until a separate reviewed publication. Evidence and the apply token do not authorize apply. Never reuse the consumed dual-package attempt.",
  };
}

function loadToolingAuthorization(cwd = process.cwd(), commit) {
  if (commit) {
    const loaded = loadAndVerifyGitBlob({ commit, path: AUTH_REL, cwd });
    return JSON.parse(loaded.buffer.toString("utf8"));
  }
  const abs = path.join(cwd, AUTH_REL);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function assertAttemptNotConsumed(attemptId) {
  if (String(attemptId || "") === CONSUMED_ORIGINAL_ATTEMPT_ID) {
    throw blocked(
      "CORRECTIVE_CONSUMED_ORIGINAL_ATTEMPT_FORBIDDEN",
      CONSUMED_ORIGINAL_ATTEMPT_ID,
    );
  }
}

function assertCorrectiveMigrationsAllowlist(packed) {
  if (!Array.isArray(packed) || packed.length !== 1) {
    throw blocked("CORRECTIVE_MIGRATIONS_ALLOWLIST", `length ${packed ? packed.length : 0}`);
  }
  const version = packed[0].migration
    ? packed[0].migration.version
    : packed[0].version;
  if (version !== MIGRATIONS[0].version) {
    throw blocked("CORRECTIVE_MIGRATIONS_ALLOWLIST", String(version));
  }
  for (const item of packed) {
    const v = item.migration ? item.migration.version : item.version;
    const p = item.migration ? item.migration.path : item.path;
    if (ORIGINAL_VERSIONS.has(String(v)) || ORIGINAL_COMMITTED_MIGRATIONS.some((o) => o.path === p)) {
      throw blocked("CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN", String(v || p));
    }
  }
}

function assertAuthMigrationsCorrectiveOnly(record) {
  const migrations = record && record.migrations;
  if (migrations == null) return;
  if (!Array.isArray(migrations) || migrations.length !== 1) {
    throw blocked("CORRECTIVE_AUTH_MIGRATIONS_INVALID", "must be length 1");
  }
  if (migrations[0].version !== MIGRATIONS[0].version) {
    throw blocked("CORRECTIVE_AUTH_MIGRATIONS_INVALID", String(migrations[0].version));
  }
  for (const row of migrations) {
    if (ORIGINAL_VERSIONS.has(String(row.version))) {
      throw blocked("CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN", row.version);
    }
  }
}

function assertApplyBlockedWhenUnpublished(auth) {
  const record = (auth && auth.production_apply_authorization) || {};
  if (record.status === "AUTHORIZED" && record.apply_authorized === true) {
    assertAttemptNotConsumed(record.attempt_id);
    assertAuthMigrationsCorrectiveOnly(record);
    return record;
  }
  throw blocked(
    "APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS",
    "corrective production_apply_authorization is UNPUBLISHED",
  );
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
    // Corrective auth path may not yet exist on the parent tip — create it.
    if (parts.length === 1) {
      next.push(`100644 blob ${blob}\t${name}`);
    } else {
      const emptyTree = mktree([], cwd);
      const child = replacePathInTree(emptyTree, parts.slice(1), blob, cwd);
      next.push(`040000 tree ${child}\t${name}`);
    }
  }
  return mktree(next, cwd);
}

function commitPublicationTree(cwd, parent, authObject) {
  const text = `${JSON.stringify(authObject, null, 2)}\n`;
  if (text.includes("\r")) throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "crlf");
  const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd,
    env: gitEnv(cwd),
    input: text,
    encoding: "utf8",
  }).trim();
  const tree = gitText(["rev-parse", `${parent}^{tree}`], cwd);
  const newTree = replacePathInTree(tree, AUTH_REL.split("/"), blob, cwd);
  return execFileSync(
    "git",
    ["commit-tree", newTree, "-p", parent, "-m", "disposable corrective apply authorization"],
    { cwd, env: gitEnv(cwd), encoding: "utf8" },
  ).trim();
}

/**
 * Tests ONLY. Builds a disposable AUTHORIZED publication commit.
 * Requires inputs.allowDisposablePublicationCommit === true.
 */
function createDisposablePublicationCommit(inputs = {}) {
  if (inputs.allowDisposablePublicationCommit !== true) {
    throw blocked("DISPOSABLE_PUBLICATION_FORBIDDEN", "harness flag required");
  }
  const cwd = inputs.cwd || process.cwd();
  const executable = String(inputs.executableCommit || gitText(["rev-parse", "HEAD"], cwd)).toLowerCase();
  if (!HEX40.test(executable)) throw blocked("APPLY_AUTHORIZATION_ANCESTRY", "executable");
  const attemptId = String(inputs.attemptId || "");
  if (!ATTEMPT_RE.test(attemptId)) throw blocked("APPLY_ATTEMPT_ID_INVALID", attemptId);
  assertAttemptNotConsumed(attemptId);

  let auth;
  try {
    auth = loadToolingAuthorization(cwd, executable);
  } catch {
    auth = loadToolingAuthorization(cwd);
  }
  if ((auth.production_apply_authorization || {}).status === "AUTHORIZED") {
    throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "refusing to broaden an authorized record");
  }

  const migrations = (auth.migrations || MIGRATIONS).map((row) => ({
    version: row.version,
    path: row.path,
    oid: row.oid,
    sha256: row.sha256,
    bytes: row.bytes,
  }));
  assertCorrectiveMigrationsAllowlist(migrations.map((m) => ({ migration: m })));

  auth.production_apply_authorization = {
    status: "AUTHORIZED",
    protocol: PROTOCOL,
    apply_authorized: true,
    authorized_executable_commit: executable,
    attempt_id: attemptId,
    project_ref: auth.project_ref || EXPECTED_PROJECT_REF,
    database_url_env: auth.database_url_env || DATABASE_URL_ENV,
    apply_authorization_token: auth.apply_authorization_token || APPLY_AUTHORIZATION_TOKEN,
    bundle: auth.standalone_bundle || null,
    migrations,
    publication_role: "later_descendant_commit",
    note: "Disposable corrective publication for harness only. Publication SHA is not stored here.",
  };

  const before = gitText(["rev-parse", "HEAD"], cwd);
  const publication = commitPublicationTree(cwd, executable, auth);
  const after = gitText(["rev-parse", "HEAD"], cwd);
  if (before !== after) throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "HEAD moved");
  return { publicationCommit: publication, executableCommit: executable, headUnchanged: true };
}

function assertCorrectiveApplyAuthorized(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  if (inputs.allowDisposablePublicationCommit === true && inputs.publicationCommit) {
    const auth = loadToolingAuthorization(cwd, inputs.publicationCommit);
    return assertApplyBlockedWhenUnpublished(auth);
  }
  const auth = loadToolingAuthorization(cwd);
  return assertApplyBlockedWhenUnpublished(auth);
}

module.exports = {
  AUTH_REL,
  PROTOCOL,
  assertApplyBlockedWhenUnpublished,
  assertAttemptNotConsumed,
  assertCorrectiveApplyAuthorized,
  assertCorrectiveMigrationsAllowlist,
  canonicalUnpublishedAuthorization,
  createDisposablePublicationCommit,
  loadToolingAuthorization,
};
