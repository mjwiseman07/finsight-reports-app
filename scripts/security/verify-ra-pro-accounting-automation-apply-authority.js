#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Offline authority verifier for RA Pro accounting-automation migrations.
 * Never accepts a database URL or apply token. Never contacts production.
 */
const {
  ARTIFACT_COMMIT,
  MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
} = require("./ra-pro-accounting-automation-apply-constants");
const { loadAndVerifyGitBlob } = require("./git-blob-authority");

function fail(code, details) {
  const error = new Error(code);
  error.code = code;
  error.details = details;
  throw error;
}

function verifyMigration(migration) {
  const loaded = loadAndVerifyGitBlob({
    commit: ARTIFACT_COMMIT,
    path: migration.path,
    expectedOid: migration.oid,
    expectedSha256: migration.sha256,
    expectedBytes: migration.bytes,
  });
  return {
    version: migration.version,
    name: migration.name,
    path: migration.path,
    oid: loaded.oid,
    sha256: loaded.sha256,
    bytes: loaded.bytes,
    lineEndings: "LF",
  };
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
      details: error.details || String(error && error.message) || null,
    })}\n`,
  );
  process.exitCode = 1;
}
