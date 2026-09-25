#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Offline authority verifier for RA Pro accounting-automation CORRECTIVE migration.
 * Never accepts a database URL or apply token. Never contacts production.
 * Never loads original dual migration statements for execution.
 */
const {
  ARTIFACT_COMMIT,
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  DATABASE_URL_ENV,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { loadAndVerifyGitBlob, sha256Buffer } = require("./git-blob-authority");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function fail(code, details) {
  const error = new Error(code);
  error.code = code;
  error.details = details;
  throw error;
}

function gitEnv(cwd) {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
  return env;
}

function verifyMigrationWorktreeOrGit(migration) {
  const cwd = process.cwd();
  if (
    typeof ARTIFACT_COMMIT === "string" &&
    /^[0-9a-f]{40}$/i.test(ARTIFACT_COMMIT) &&
    !ARTIFACT_COMMIT.startsWith("PENDING_")
  ) {
    const loaded = loadAndVerifyGitBlob({
      commit: ARTIFACT_COMMIT,
      path: migration.path,
      expectedOid: migration.oid,
      expectedSha256: migration.sha256,
      expectedBytes: migration.bytes,
      cwd,
    });
    return {
      version: migration.version,
      name: migration.name,
      path: migration.path,
      oid: loaded.oid,
      sha256: loaded.sha256,
      bytes: loaded.bytes,
      lineEndings: "LF",
      source: "git_blob",
    };
  }
  const abs = path.join(cwd, migration.path);
  const buffer = fs.readFileSync(abs);
  if (buffer.includes(0x0d)) fail("MIGRATION_CRLF_FORBIDDEN", migration.path);
  const digest = sha256Buffer(buffer);
  const oid = execFileSync("git", ["hash-object", "--stdin"], {
    cwd,
    env: gitEnv(cwd),
    input: buffer,
    encoding: "utf8",
  }).trim();
  if (oid !== migration.oid || digest !== migration.sha256 || buffer.length !== migration.bytes) {
    fail("BLOCKED_PIN_MISMATCH", {
      path: migration.path,
      oid,
      sha256: digest,
      bytes: buffer.length,
    });
  }
  return {
    version: migration.version,
    name: migration.name,
    path: migration.path,
    oid,
    sha256: digest,
    bytes: buffer.length,
    lineEndings: "LF",
    source: "worktree_pre_commit",
  };
}

function main() {
  if (process.argv.length !== 2) {
    fail("OFFLINE_VERIFIER_ARGUMENTS_FORBIDDEN", null);
  }
  if (process.env[DATABASE_URL_ENV] || process.env.RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL) {
    fail("OFFLINE_VERIFIER_DATABASE_CHANNEL_FORBIDDEN", null);
  }
  if (POST_HISTORY_COUNT !== PRIOR_HISTORY_COUNT + MIGRATIONS.length) {
    fail("HISTORY_CONTRACT_INVALID", {
      prior: PRIOR_HISTORY_COUNT,
      migrations: MIGRATIONS.length,
      post: POST_HISTORY_COUNT,
    });
  }
  if (MIGRATIONS.length !== 1 || MIGRATIONS[0].version !== "20260922003200") {
    fail("CORRECTIVE_MIGRATIONS_ALLOWLIST", MIGRATIONS.map((m) => m.version));
  }
  for (const original of ORIGINAL_COMMITTED_MIGRATIONS) {
    if (MIGRATIONS.some((m) => m.version === original.version || m.path === original.path)) {
      fail("CORRECTIVE_ORIGINAL_MIGRATION_REEXECUTION_FORBIDDEN", original.version);
    }
  }
  const verified = MIGRATIONS.map(verifyMigrationWorktreeOrGit);
  process.stdout.write(
    `${JSON.stringify({
      verdict: "OFFLINE_AUTHORITY_VERIFIED",
      artifactCommit: ARTIFACT_COMMIT,
      history: { prior: PRIOR_HISTORY_COUNT, post: POST_HISTORY_COUNT },
      migrations: verified,
      originalCommittedMigrationsVerifyOnly: ORIGINAL_COMMITTED_MIGRATIONS.map((m) => ({
        version: m.version,
        oid: m.oid,
        sha256: m.sha256,
        bytes: m.bytes,
      })),
      productionContact: false,
      applyAuthorized: false,
    })}\n`,
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      verdict: "BLOCKED",
      reason: error.code || "OFFLINE_AUTHORITY_FAILURE",
      details: error.details || String(error && error.message) || null,
    })}\n`,
  );
  process.exitCode = 1;
}
