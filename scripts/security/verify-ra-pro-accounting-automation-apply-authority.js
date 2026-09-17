#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const {
  ARTIFACT_COMMIT,
  MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
} = require("./ra-pro-accounting-automation-apply-constants");

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function git(args, encoding = null) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function fail(code, details) {
  const error = new Error(code);
  error.code = code;
  error.details = details;
  throw error;
}

function verifyMigration(migration) {
  const spec = `${ARTIFACT_COMMIT}:${migration.path}`;
  const oid = git(["rev-parse", spec], "utf8").trim();
  const bytes = git(["cat-file", "blob", oid]);
  const observed = { oid, sha256: sha256(bytes), bytes: bytes.length };
  for (const field of ["oid", "sha256", "bytes"]) {
    if (observed[field] !== migration[field]) {
      fail("MIGRATION_SEAL_MISMATCH", {
        version: migration.version,
        field,
        expected: migration[field],
        observed: observed[field],
      });
    }
  }
  if (bytes.includes(13)) {
    fail("MIGRATION_NOT_LF_ONLY", { version: migration.version });
  }
  return { ...migration, lineEndings: "LF" };
}

function main() {
  if (process.argv.length !== 2) {
    fail("OFFLINE_VERIFIER_ARGUMENTS_FORBIDDEN", null);
  }
  if (process.env.RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL) {
    fail("OFFLINE_VERIFIER_DATABASE_CHANNEL_FORBIDDEN", null);
  }
  if (POST_HISTORY_COUNT !== PRIOR_HISTORY_COUNT + MIGRATIONS.length) {
    fail("HISTORY_CONTRACT_INVALID", {
      prior: PRIOR_HISTORY_COUNT,
      migrations: MIGRATIONS.length,
      post: POST_HISTORY_COUNT,
    });
  }
  const verified = MIGRATIONS.map(verifyMigration);
  process.stdout.write(
    `${JSON.stringify({
      verdict: "OFFLINE_AUTHORITY_VERIFIED",
      artifactCommit: ARTIFACT_COMMIT,
      history: { prior: PRIOR_HISTORY_COUNT, post: POST_HISTORY_COUNT },
      migrations: verified,
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
      details: error.details || null,
    })}\n`,
  );
  process.exitCode = 1;
}
