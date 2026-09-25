"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Minimal apply authorization for the CORRECTIVE accounting-automation package.
 * Production record starts UNPUBLISHED. Disposable publication is for tests only.
 *
 * Authority loads via git cat-file / loadAndVerifyGitBlob only in production.
 * Worktree filesystem reads require explicit in-process testOnlyHarnessContext
 * and allowWorktreeAuthLoad — never argv/env/CLI activation.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  APPLY_AUTHORIZATION_TOKEN,
  CONSUMED_ORIGINAL_ATTEMPT_ID,
  DATABASE_URL_ENV,
  EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
  EVIDENCE_PIN_AUTHORITY_AUTH_OID,
  EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
  EVIDENCE_PIN_AUTHORITY_COMMIT,
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

function isAncestor(ancestor, descendant, cwd) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd,
      env: gitEnv(cwd),
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function assertNoAuthEnvOverride(env) {
  for (const key of Object.keys(env || {})) {
    if (
      /CORRECTIVE.*(AUTH|AUTHORITY|PUBLICATION_COMMIT|EXECUTABLE_COMMIT|EVIDENCE_AUTHORITY)/i.test(key) &&
      env[key] &&
      !/DATABASE_URL|APPLY_TOKEN|APPLY_DATABASE/i.test(key)
    ) {
      throw blocked("AUTHORITY_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
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

/**
 * Load TOOLING_AUTHORIZATION.json.
 *
 * Production: commit is mandatory; bytes come only from git cat-file.
 * Test-only worktree: require testOnlyHarnessContext === true AND allowWorktreeAuthLoad === true.
 *
 * @param {object} inputs
 * @param {string} [inputs.cwd]
 * @param {string} [inputs.commit] full 40-hex commit (required in production)
 * @param {string} [inputs.expectedOid]
 * @param {string} [inputs.expectedSha256]
 * @param {number} [inputs.expectedBytes]
 * @param {boolean} [inputs.testOnlyHarnessContext]
 * @param {boolean} [inputs.allowWorktreeAuthLoad]
 * @param {object} [inputs.env]
 * @returns {{ auth: object, loaded: object, source: 'git_blob'|'worktree_harness' }}
 */
function loadToolingAuthorization(inputs = {}) {
  // Legacy positional form used only when commit is provided: (cwd, commit)
  if (typeof inputs === "string") {
    const cwd = inputs;
    const commit = arguments[1];
    if (!commit) {
      throw blocked(
        "AUTHORITY_COMMIT_REQUIRED",
        "loadToolingAuthorization requires an explicit commit; worktree reads are harness-only",
      );
    }
    return loadToolingAuthorization({ cwd, commit });
  }

  assertNoAuthEnvOverride(inputs.env || process.env);
  const cwd = inputs.cwd || process.cwd();

  if (inputs.allowWorktreeAuthLoad === true) {
    if (inputs.testOnlyHarnessContext !== true) {
      throw blocked(
        "HARNESS_CONTEXT_REQUIRED",
        "worktree AUTH load requires testOnlyHarnessContext === true",
      );
    }
    const abs = path.join(cwd, AUTH_REL);
    const buffer = fs.readFileSync(abs);
    const auth = JSON.parse(buffer.toString("utf8"));
    return {
      auth,
      loaded: {
        buffer,
        oid: null,
        sha256: null,
        bytes: buffer.length,
        source: "worktree_harness",
        path: AUTH_REL,
      },
      source: "worktree_harness",
    };
  }

  const commit = String(inputs.commit || "").toLowerCase();
  if (!HEX40.test(commit)) {
    throw blocked(
      "AUTHORITY_COMMIT_REQUIRED",
      "explicit 40-hex commit required for tooling authorization before credentials",
    );
  }

  const loaded = loadAndVerifyGitBlob({
    commit,
    path: AUTH_REL,
    cwd,
    expectedOid: inputs.expectedOid,
    expectedSha256: inputs.expectedSha256,
    expectedBytes: inputs.expectedBytes,
  });
  return {
    auth: JSON.parse(loaded.buffer.toString("utf8")),
    loaded,
    source: "git_blob",
  };
}

/**
 * Resolve the immutable evidence pin authority commit.
 * Caller override of a different commit is forbidden outside disposable harness.
 */
function resolveEvidenceAuthorityCommit(inputs = {}) {
  if (inputs.evidenceAuthorityCommit != null && String(inputs.evidenceAuthorityCommit).length) {
    const got = String(inputs.evidenceAuthorityCommit).toLowerCase();
    if (!HEX40.test(got)) {
      throw blocked("EVIDENCE_AUTHORITY_COMMIT_INVALID", got);
    }
    if (got !== EVIDENCE_PIN_AUTHORITY_COMMIT) {
      if (
        !(
          inputs.testOnlyHarnessContext === true &&
          inputs.allowDisposableEvidenceAuthority === true
        )
      ) {
        throw blocked(
          "EVIDENCE_AUTHORITY_COMMIT_FORBIDDEN",
          `only ${EVIDENCE_PIN_AUTHORITY_COMMIT} is evidence pin authority`,
        );
      }
      return got;
    }
  }
  return EVIDENCE_PIN_AUTHORITY_COMMIT;
}

/**
 * Load and verify the sealed evidence-pin AUTH blob at f550842c… (or disposable override).
 */
function loadEvidencePinAuthority(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  const commit = resolveEvidenceAuthorityCommit(inputs);
  const usePinnedSeals = commit === EVIDENCE_PIN_AUTHORITY_COMMIT;
  return loadToolingAuthorization({
    cwd,
    commit,
    env: inputs.env,
    expectedOid: usePinnedSeals ? EVIDENCE_PIN_AUTHORITY_AUTH_OID : inputs.expectedOid,
    expectedSha256: usePinnedSeals ? EVIDENCE_PIN_AUTHORITY_AUTH_SHA256 : inputs.expectedSha256,
    expectedBytes: usePinnedSeals ? EVIDENCE_PIN_AUTHORITY_AUTH_BYTES : inputs.expectedBytes,
  });
}

/**
 * Executable tip must come from a validated dry-run authorization map in production.
 * Caller --executable-commit alone is never trusted.
 */
function resolveExecutableCommit(inputs = {}) {
  if (inputs.dryRunAuthorizationMap && inputs.dryRunAuthorizationMap.authorized_executable_commit) {
    const commit = String(inputs.dryRunAuthorizationMap.authorized_executable_commit).toLowerCase();
    if (!HEX40.test(commit)) {
      throw blocked("EXECUTABLE_COMMIT_INVALID", commit);
    }
    if (
      inputs.executableCommit &&
      String(inputs.executableCommit).toLowerCase() !== commit
    ) {
      throw blocked(
        "EXECUTABLE_COMMIT_RECHECK_MISMATCH",
        "recheck executable does not match dry-run authorization map",
      );
    }
    return commit;
  }
  if (
    inputs.testOnlyHarnessContext === true &&
    (inputs.allowDisposablePublicationCommit === true ||
      inputs.allowLocalhostForHarness === true ||
      inputs.allowDisposableDryRunPublicationCommit === true)
  ) {
    if (inputs.executableCommit != null && String(inputs.executableCommit).length) {
      const commit = String(inputs.executableCommit).toLowerCase();
      if (!HEX40.test(commit)) {
        throw blocked("EXECUTABLE_COMMIT_INVALID", commit);
      }
      return commit;
    }
    return gitText(["rev-parse", "HEAD"], inputs.cwd || process.cwd()).toLowerCase();
  }
  // Apply mode may name an executable tip for Git AUTH/bundle load; apply authorization
  // remains a separate gate and stays UNPUBLISHED until a later publication.
  if (inputs.applyMode === true && inputs.executableCommit != null && String(inputs.executableCommit).length) {
    const commit = String(inputs.executableCommit).toLowerCase();
    if (!HEX40.test(commit)) {
      throw blocked("EXECUTABLE_COMMIT_INVALID", commit);
    }
    return commit;
  }
  if (inputs.executableCommit != null && String(inputs.executableCommit).length) {
    throw blocked(
      "DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED",
      "--executable-commit alone is not authority; validated dry-run authorization publication required",
    );
  }
  throw blocked(
    "DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED",
    "validated dry-run authorization map required before credentials",
  );
}

/**
 * Apply-authorization publication commit (future AUTHORIZED tip) or executable tip while unpublished.
 */
function resolveApplyAuthorizationCommit(inputs = {}) {
  if (inputs.applyAuthorizationCommit != null && String(inputs.applyAuthorizationCommit).length) {
    const commit = String(inputs.applyAuthorizationCommit).toLowerCase();
    if (!HEX40.test(commit)) {
      throw blocked("APPLY_AUTHORIZATION_COMMIT_INVALID", commit);
    }
    return commit;
  }
  if (inputs.publicationCommit != null && String(inputs.publicationCommit).length) {
    const commit = String(inputs.publicationCommit).toLowerCase();
    if (!HEX40.test(commit)) {
      throw blocked("APPLY_AUTHORIZATION_COMMIT_INVALID", commit);
    }
    if (
      inputs.allowDisposablePublicationCommit === true &&
      inputs.testOnlyHarnessContext === true
    ) {
      return commit;
    }
    // Production: publicationCommit alone is not enough without applying the allowlist path.
    return commit;
  }
  return resolveExecutableCommit(inputs);
}

function assertEvidenceAuthorityAncestry(evidenceAuthorityCommit, executableCommit, cwd) {
  if (evidenceAuthorityCommit === executableCommit) return;
  if (!isAncestor(evidenceAuthorityCommit, executableCommit, cwd)) {
    throw blocked(
      "EVIDENCE_AUTHORITY_ANCESTRY",
      "executable must be equal to or a descendant of evidence pin authority",
    );
  }
}

/**
 * Recheck evidence pin authority blob identity (pre-credentials / pre-DB trust boundaries).
 */
function recheckEvidencePinAuthority(inputs = {}) {
  const loaded = loadEvidencePinAuthority(inputs);
  const commit = resolveEvidenceAuthorityCommit(inputs);
  if (commit === EVIDENCE_PIN_AUTHORITY_COMMIT) {
    if (loaded.loaded.oid !== EVIDENCE_PIN_AUTHORITY_AUTH_OID) {
      throw blocked("EVIDENCE_AUTHORITY_BLOB_MISMATCH", loaded.loaded.oid);
    }
    if (loaded.loaded.sha256 !== EVIDENCE_PIN_AUTHORITY_AUTH_SHA256) {
      throw blocked("EVIDENCE_AUTHORITY_BLOB_MISMATCH", loaded.loaded.sha256);
    }
    if (loaded.loaded.bytes !== EVIDENCE_PIN_AUTHORITY_AUTH_BYTES) {
      throw blocked("EVIDENCE_AUTHORITY_BLOB_MISMATCH", String(loaded.loaded.bytes));
    }
  }
  return {
    evidence_authority_commit: commit,
    evidence_authority_auth_oid: loaded.loaded.oid,
    evidence_authority_auth_sha256: loaded.loaded.sha256,
    evidence_authority_auth_bytes: loaded.loaded.bytes,
    source: loaded.source,
  };
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
 * Requires inputs.allowDisposablePublicationCommit === true and testOnlyHarnessContext.
 * Loads base AUTH only via git (no worktree fallback).
 */
function createDisposablePublicationCommit(inputs = {}) {
  if (inputs.allowDisposablePublicationCommit !== true) {
    throw blocked("DISPOSABLE_PUBLICATION_FORBIDDEN", "harness flag required");
  }
  if (inputs.testOnlyHarnessContext !== true) {
    throw blocked("HARNESS_CONTEXT_REQUIRED", "testOnlyHarnessContext required");
  }
  const cwd = inputs.cwd || process.cwd();
  const executable = String(
    inputs.executableCommit || gitText(["rev-parse", "HEAD"], cwd),
  ).toLowerCase();
  if (!HEX40.test(executable)) throw blocked("APPLY_AUTHORIZATION_ANCESTRY", "executable");
  const attemptId = String(inputs.attemptId || "");
  if (!ATTEMPT_RE.test(attemptId)) throw blocked("APPLY_ATTEMPT_ID_INVALID", attemptId);
  assertAttemptNotConsumed(attemptId);

  const { auth } = loadToolingAuthorization({ cwd, commit: executable });
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

/**
 * Assert apply authorization from an explicit Git commit (never worktree).
 * While unpublished, load the executable tip’s AUTH via Git and fail closed.
 * Future AUTHORIZED publications: pass applyAuthorizationCommit / publicationCommit
 * (disposable harness only until a reviewed publication exists).
 */
function assertCorrectiveApplyAuthorized(inputs = {}) {
  // Apply path may name an executable tip for Git AUTH load; never trusts dry-run authorization.
  inputs = { ...inputs, applyMode: true };
  const cwd = inputs.cwd || process.cwd();
  assertNoAuthEnvOverride(inputs.env || process.env);

  if (inputs.allowDisposablePublicationCommit === true) {
    if (inputs.testOnlyHarnessContext !== true) {
      throw blocked("HARNESS_CONTEXT_REQUIRED", "disposable apply auth");
    }
    const commit = resolveApplyAuthorizationCommit(inputs);
    const { auth } = loadToolingAuthorization({ cwd, commit, env: inputs.env });
    return assertApplyBlockedWhenUnpublished(auth);
  }

  const commit = resolveApplyAuthorizationCommit(inputs);
  const executable = resolveExecutableCommit(inputs);
  if (commit !== executable) {
    // Future AUTHORIZED apply publication: must be strict descendant with AUTH-only delta.
    if (!isAncestor(executable, commit, cwd) || commit === executable) {
      throw blocked("APPLY_AUTHORIZATION_ANCESTRY", "publication must strictly descend executable");
    }
    const names = gitText(["diff", "--name-only", executable, commit], cwd)
      .split(/\n/)
      .filter(Boolean);
    if (names.length !== 1 || names[0] !== AUTH_REL) {
      throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", names.join(",") || "empty");
    }
  }

  const { auth } = loadToolingAuthorization({ cwd, commit, env: inputs.env });
  return assertApplyBlockedWhenUnpublished(auth);
}

module.exports = {
  AUTH_REL,
  PROTOCOL,
  EVIDENCE_PIN_AUTHORITY_COMMIT,
  assertApplyBlockedWhenUnpublished,
  assertAttemptNotConsumed,
  assertCorrectiveApplyAuthorized,
  assertCorrectiveMigrationsAllowlist,
  assertEvidenceAuthorityAncestry,
  canonicalUnpublishedAuthorization,
  createDisposablePublicationCommit,
  loadEvidencePinAuthority,
  loadToolingAuthorization,
  recheckEvidencePinAuthority,
  resolveApplyAuthorizationCommit,
  resolveEvidenceAuthorityCommit,
  resolveExecutableCommit,
};
