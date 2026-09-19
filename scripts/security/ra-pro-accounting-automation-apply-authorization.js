"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * One-attempt production apply authorization.
 * Evidence publication is not sufficient. The committed production record stays
 * UNPUBLISHED until a later explicit authorization names one tip and one attempt.
 * Synthetic authorization is in-process only and cannot be supplied by env or argv.
 */
const fs = require("node:fs");
const path = require("node:path");
const { MIGRATIONS } = require("./ra-pro-accounting-automation-apply-constants");
const { loadAndVerifyGitBlob } = require("./git-blob-authority");
const {
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
} = require("./ra-pro-accounting-automation-tls-ca");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_ONE_ATTEMPT_APPLY_AUTHORIZATION_V1";
const ATTEMPT_RE = /^apply-[0-9a-f]{12}-[0-9a-f]{32}$/;

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "authorization";
  return error;
}

function assertNoAuthorizationEnv(env) {
  for (const key of [
    "RA_PRO_ACCOUNTING_AUTOMATION_SYNTHETIC_APPLY_AUTHORIZATION",
    "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_ATTEMPT_ID",
    "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_MARKER_DIR",
  ]) {
    if (env && Object.prototype.hasOwnProperty.call(env, key) && env[key]) {
      throw blocked("APPLY_AUTHORIZATION_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
}

function assertAttemptId(attemptId) {
  if (!ATTEMPT_RE.test(String(attemptId || ""))) {
    throw blocked("APPLY_ATTEMPT_ID_INVALID", "attempt id");
  }
  if (String(attemptId).startsWith("attempt-")) {
    throw blocked("APPLY_MARKER_DRY_RUN_REUSE_FORBIDDEN", "dry-run prefix");
  }
}

function markerFile(dir, attemptId) {
  assertAttemptId(attemptId);
  if (!dir || typeof dir !== "string") throw blocked("APPLY_MARKER_DIR_REQUIRED", "dir");
  return path.join(dir, `${attemptId}.marker`);
}

function assertNotConsumed(dir, attemptId) {
  const file = markerFile(dir, attemptId);
  if (fs.existsSync(file)) throw blocked("APPLY_ATTEMPT_CONSUMED", file);
  return file;
}

function createApplyMarkerAtomic(dir, tip, attemptId) {
  const file = assertNotConsumed(dir, attemptId);
  fs.mkdirSync(dir, { recursive: true });
  const body = `apply\n${tip}\n${attemptId}\n`;
  let fd;
  try {
    fd = fs.openSync(file, "wx");
    fs.writeFileSync(fd, body);
  } catch (err) {
    if (err && (err.code === "EEXIST" || err.code === "APPLY_ATTEMPT_CONSUMED")) {
      throw blocked("APPLY_ATTEMPT_CONSUMED", "create collision");
    }
    throw blocked("APPLY_MARKER_CREATE_FAILED", err && err.message ? err.message : "create");
  } finally {
    if (fd != null) fs.closeSync(fd);
  }
  return file;
}

function verifyExistingMarker(file, tip, attemptId) {
  assertAttemptId(attemptId);
  if (!file || !fs.existsSync(file)) throw blocked("APPLY_MARKER_MISSING", "before credentials");
  const text = fs.readFileSync(file, "utf8");
  if (text.startsWith("dry-run")) throw blocked("APPLY_MARKER_DRY_RUN_REUSE_FORBIDDEN", "body");
  const lines = text.split(/\n/);
  if (lines[0] !== "apply" || lines[1] !== tip || lines[2] !== attemptId) {
    throw blocked("APPLY_MARKER_MISMATCH", "body");
  }
  return file;
}

function assertIdentities(auth, cwd) {
  const tls = auth && auth.tls_trust_root;
  if (!tls || tls.der_sha256 !== OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256) {
    throw blocked("APPLY_AUTHORIZATION_CA_MISMATCH", "der");
  }
  const loaded = loadAndVerifyGitBlob({
    commit: tls.source_commit,
    path: tls.path,
    expectedOid: tls.oid,
    expectedSha256: tls.sha256,
    expectedBytes: tls.bytes,
    cwd,
  });
  const text = loaded.buffer.toString("utf8");
  if (!text.includes(tls.der_sha256)) {
    throw blocked("APPLY_AUTHORIZATION_CA_MISMATCH", "blob");
  }
  const migrations = (auth && auth.migrations) || [];
  if (migrations.length !== MIGRATIONS.length) {
    throw blocked("APPLY_AUTHORIZATION_MIGRATION_MISMATCH", "count");
  }
  MIGRATIONS.forEach((expected, index) => {
    const got = migrations[index] || {};
    if (
      got.version !== expected.version ||
      got.oid !== expected.oid ||
      got.sha256 !== expected.sha256 ||
      got.bytes !== expected.bytes
    ) {
      throw blocked("APPLY_AUTHORIZATION_MIGRATION_MISMATCH", expected.version);
    }
  });
  const bundle = auth.standalone_bundle || {};
  if (!bundle.oid || !bundle.sha256 || !bundle.bytes) {
    throw blocked("APPLY_AUTHORIZATION_BUNDLE_MISMATCH", "missing");
  }
  return bundle;
}

function assertOneAttemptApplyAuthorization(inputs = {}) {
  const env = inputs.env || {};
  assertNoAuthorizationEnv(env);
  const auth = inputs.auth;
  if (!auth || typeof auth !== "object") throw blocked("APPLY_AUTHORIZATION_ABSENT", "auth");
  const tip = String(inputs.tip || "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(tip)) throw blocked("APPLY_AUTHORIZATION_TIP_MISMATCH", "tip");
  const synthetic = inputs.allowSyntheticOneAttemptAuthorization === true;
  if (!synthetic) {
    const published = auth.production_apply_authorization || {};
    if (
      published.status !== "AUTHORIZED" ||
      published.apply_authorized !== true ||
      !published.authorized_tip ||
      !published.attempt_id
    ) {
      throw blocked(
        "APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS",
        "production apply authorization is unpublished; evidence publication is not sufficient",
      );
    }
  }
  const bundle = assertIdentities(auth, inputs.cwd);
  if (inputs.authorizationToken !== inputs.expectedToken) {
    throw blocked("APPLY_AUTHORIZATION_TOKEN_MISMATCH", "token");
  }

  const record = synthetic
    ? inputs.syntheticApplyAuthorization
    : auth.production_apply_authorization;
  if (!record || typeof record !== "object") throw blocked("APPLY_AUTHORIZATION_ABSENT", "record");
  const attemptId = String(record.attempt_id || "");
  const authorizedTip = String(record.authorized_tip || "").toLowerCase();
  assertAttemptId(attemptId);
  if (authorizedTip !== tip) throw blocked("APPLY_AUTHORIZATION_TIP_MISMATCH", "authorized tip");
  if (record.bundle_oid && record.bundle_oid !== bundle.oid) {
    throw blocked("APPLY_AUTHORIZATION_BUNDLE_MISMATCH", "oid");
  }
  if (record.bundle_sha256 && record.bundle_sha256 !== bundle.sha256) {
    throw blocked("APPLY_AUTHORIZATION_BUNDLE_MISMATCH", "sha");
  }

  if (inputs.existingMarkerPath) {
    return {
      marker: verifyExistingMarker(inputs.existingMarkerPath, tip, attemptId),
      attemptId,
      synthetic,
      apply_authorized: false,
    };
  }
  const marker = createApplyMarkerAtomic(inputs.markerDir, tip, attemptId);
  return { marker, attemptId, synthetic, apply_authorized: false };
}

module.exports = {
  PROTOCOL,
  assertOneAttemptApplyAuthorization,
  createApplyMarkerAtomic,
  verifyExistingMarker,
};
