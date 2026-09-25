"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { loadAndVerifyGitBlob, assertUtf8LfNoBom } = require("./git-blob-authority");
const {
  validatePreCorrectionDatabaseReadonly,
  assertPreCorrectionPrivilegeSurfaces,
  assertAutomationGate,
  WEBHOOK_STATUSES: SCHEMA_WEBHOOK_STATUSES,
  BASE_TABLE_PRIVS,
} = require("./ra-pro-accounting-automation-corrective-evidence-schema");
const {
  MIGRATIONS,
  PRIOR_HISTORY_COUNT,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const {
  REJECTED_STALE_COLLECTION_TIP_DBDCE968,
} = require("./ra-pro-accounting-automation-corrective-collection-authorization");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1";
const CONTRACT_PATH =
  "docs/security/ra-pro-accounting-automation-corrective-apply/PRECONDITION_EVIDENCE_CONTRACT.json";
const HISTORY_COUNT = PRIOR_HISTORY_COUNT;
const CORRECTIVE_VERSION = MIGRATIONS[0].version;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_STATUSES = SCHEMA_WEBHOOK_STATUSES;
const TABLE_PRIVILEGES = BASE_TABLE_PRIVS;
const EXECUTE_ROLES = ["service_role", "authenticated", "anon", "PUBLIC"];
const HEX40 = /^[0-9a-f]{40}$/;
const SUBSTITUTES = new Set([
  "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
  "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1",
  "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
  "RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1",
  "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
  "RA_PRO_CUTOVER_PRIOR_DRY_RUN_EVIDENCE_V1",
  "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1",
]);
const SOURCE_CHANNELS = new Set([
  "fresh_read_only_supabase_select",
  "synthetic_disposable_fixture",
]);
const DISPOSABLE_VALIDATOR = "PASS_CORRECTIVE_PRECONDITION_VALIDATION";
const AUTH_KEYS = [
  "pr_number",
  "scope",
  "authorized_executable_commit",
  "authorization_publication_commit",
  "authorization_publication_blob_oid",
];
const FORBIDDEN_AUTH_KEYS = ["pr_head", "tooling_reviewed_tip", "collection_pr_head"];

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "precondition_evidence";
  return error;
}

function assertExact(value, expected, code, label) {
  if (value !== expected) throw blocked(code, `${label} mismatch`);
}

function assertKeys(obj, keys, code) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw blocked(code, "object required");
  const got = Object.keys(obj);
  if (got.length !== keys.length || keys.some((key) => !Object.prototype.hasOwnProperty.call(obj, key))) {
    throw blocked(code, "schema keys");
  }
}

function assertRequiredKeys(obj, keys, code) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) throw blocked(code, "object required");
  if (keys.some((key) => !Object.prototype.hasOwnProperty.call(obj, key))) {
    throw blocked(code, "schema keys");
  }
}

function parseUtc(value, code) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    throw blocked(code, "timestamp");
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw blocked(code, "timestamp");
  return ms;
}

function resolveNow(options = {}) {
  if (options.now == null) return Date.now();
  if (options.now instanceof Date) return options.now.getTime();
  return parseUtc(String(options.now), "CORRECTIVE_PRECONDITION_TIMESTAMP");
}

function assertSanitized(text) {
  if (
    /postgres(?:ql)?:\/\//i.test(text) ||
    /sk_[a-z]+_/i.test(text) ||
    text.includes("BEGIN CERTIFICATE") ||
    text.includes("BEGIN RSA") ||
    /supabase\.co/i.test(text) ||
    /https?:\/\//i.test(text) ||
    text.includes("@") ||
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(text)
  ) {
    throw blocked("CORRECTIVE_PRECONDITION_SANITIZATION", "forbidden material");
  }
}

function assertNoOverride(inputs = {}) {
  const env = inputs.env || {};
  if (inputs.preconditionEvidencePath) {
    throw blocked("CORRECTIVE_PRECONDITION_EVIDENCE_PATH_OVERRIDE_FORBIDDEN", "path override supplied");
  }
  for (const key of [
    "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_PATH",
    "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_SHA256",
  ]) {
    if (Object.prototype.hasOwnProperty.call(env, key) && env[key]) {
      throw blocked("CORRECTIVE_PRECONDITION_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
}

function assertTrailingLf(buffer) {
  try {
    assertUtf8LfNoBom(buffer, "corrective precondition evidence");
  } catch (err) {
    throw blocked("CORRECTIVE_PRECONDITION_NEWLINE", err.message);
  }
  if (buffer.length < 2 || buffer[buffer.length - 1] !== 0x0a || buffer[buffer.length - 2] === 0x0a) {
    throw blocked("CORRECTIVE_PRECONDITION_NEWLINE", "exactly one trailing LF required");
  }
}

function expectedAuthorityFromPublication(pub = {}) {
  const e = {
    authorized_executable_commit: pub.authorized_executable_commit,
    authorization_publication_commit: pub.authorization_publication_commit,
    authorization_publication_blob_oid: pub.authorization_publication_blob_oid,
  };
  if (
    !HEX40.test(String(e.authorized_executable_commit || "").toLowerCase()) ||
    !HEX40.test(String(e.authorization_publication_commit || "").toLowerCase()) ||
    !HEX40.test(String(e.authorization_publication_blob_oid || "").toLowerCase())
  ) {
    return null;
  }
  return {
    authorized_executable_commit: String(e.authorized_executable_commit).toLowerCase(),
    authorization_publication_commit: String(e.authorization_publication_commit).toLowerCase(),
    authorization_publication_blob_oid: String(e.authorization_publication_blob_oid).toLowerCase(),
  };
}

function expectedAuthority(options = {}) {
  const e = options.expected || {};
  if (
    e.authorized_executable_commit &&
    e.authorization_publication_commit &&
    e.authorization_publication_blob_oid
  ) {
    return {
      authorized_executable_commit: String(e.authorized_executable_commit).toLowerCase(),
      authorization_publication_commit: String(e.authorization_publication_commit).toLowerCase(),
      authorization_publication_blob_oid: String(e.authorization_publication_blob_oid).toLowerCase(),
    };
  }
  const fromPub = expectedAuthorityFromPublication(options.publication || {});
  if (fromPub) return fromPub;
  throw blocked("CORRECTIVE_PRECONDITION_AUTHORITY_EXPECTED", "expected authority pins required");
}

function validatePrivilegeMatrix(dbOrSurfaces, codePrefix = "CORRECTIVE_PRECONDITION") {
  return assertPreCorrectionPrivilegeSurfaces(
    dbOrSurfaces.privilege_surfaces || dbOrSurfaces,
    codePrefix,
  );
}

function validateDatabaseReadonly(db) {
  return validatePreCorrectionDatabaseReadonly(db, {
    codePrefix: "CORRECTIVE_PRECONDITION",
  });
}

function validateSafety(safety) {
  assertKeys(
    safety,
    [
      "read_only",
      "select_only",
      "production_writes",
      "sql_application_attempts",
      "dry_run_attempts",
      "migration_apply_attempts",
      "provider_writes",
      "automation_enabled",
      "merge_or_deploy_performed",
      "credential_prompt_opened",
      "marker_created",
      "pins_published",
    ],
    "CORRECTIVE_PRECONDITION_SCHEMA",
  );
  if (safety.read_only !== true || safety.select_only !== true) {
    throw blocked("CORRECTIVE_PRECONDITION_SAFETY", "read_only");
  }
  for (const key of [
    "production_writes",
    "sql_application_attempts",
    "dry_run_attempts",
    "migration_apply_attempts",
    "provider_writes",
  ]) {
    if (safety[key] !== 0) throw blocked("CORRECTIVE_PRECONDITION_WRITE_COUNTER", key);
  }
  if (
    safety.automation_enabled !== false ||
    safety.merge_or_deploy_performed !== false ||
    safety.credential_prompt_opened !== false ||
    safety.marker_created !== false ||
    safety.pins_published !== false
  ) {
    throw blocked("CORRECTIVE_PRECONDITION_SAFETY", "safety flag");
  }
}

function validateAuthorityBlock(authz, options, codePrefix) {
  if (!authz || typeof authz !== "object" || Array.isArray(authz)) {
    throw blocked(`${codePrefix}_SCHEMA`, "authorization object");
  }
  for (const key of FORBIDDEN_AUTH_KEYS) {
    if (Object.prototype.hasOwnProperty.call(authz, key)) {
      throw blocked(`${codePrefix}_AUTHORITY_FORBIDDEN`, key);
    }
  }
  // attestations.collection_tooling_tip / tooling_reviewed_tip are non-authoritative and ignored
  void options;
  assertKeys(authz, AUTH_KEYS, `${codePrefix}_SCHEMA`);
  const expected = expectedAuthority(options);
  for (const key of [
    "authorized_executable_commit",
    "authorization_publication_commit",
    "authorization_publication_blob_oid",
  ]) {
    const value = String(authz[key] || "").toLowerCase();
    if (!HEX40.test(value)) throw blocked(`${codePrefix}_AUTHORITY_SHAPE`, key);
    if (value === REJECTED_STALE_COLLECTION_TIP_DBDCE968) {
      throw blocked(`${codePrefix}_REJECTED_STALE_TIP`, key);
    }
    assertExact(value, String(expected[key]).toLowerCase(), `${codePrefix}_AUTHORITY_MISMATCH`, key);
  }
}

function validateCorrectivePreconditionEvidence(evidence, options = {}) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "evidence object");
  }
  if (SUBSTITUTES.has(evidence.protocol)) {
    throw blocked("CORRECTIVE_PRECONDITION_SUBSTITUTION_FORBIDDEN", evidence.protocol);
  }
  assertRequiredKeys(
    evidence,
    [
      "protocol",
      "schema_version",
      "source_channel_classification",
      "collected_at_utc",
      "valid_from_utc",
      "valid_until_utc",
      "authorization",
      "automation_gate",
      "database_readonly",
      "safety",
      "visibility_limitations",
      "validator_result",
    ],
    "CORRECTIVE_PRECONDITION_SCHEMA",
  );
  assertExact(evidence.protocol, PROTOCOL, "CORRECTIVE_PRECONDITION_PROTOCOL_MISMATCH", "protocol");
  assertExact(evidence.schema_version, 3, "CORRECTIVE_PRECONDITION_SCHEMA", "schema_version");
  if (!SOURCE_CHANNELS.has(evidence.source_channel_classification)) {
    throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "source channel");
  }
  assertExact(evidence.validator_result, DISPOSABLE_VALIDATOR, "CORRECTIVE_PRECONDITION_SCHEMA", "validator");

  const from = parseUtc(evidence.valid_from_utc, "CORRECTIVE_PRECONDITION_TIMESTAMP");
  const until = parseUtc(evidence.valid_until_utc, "CORRECTIVE_PRECONDITION_TIMESTAMP");
  const collected = parseUtc(evidence.collected_at_utc, "CORRECTIVE_PRECONDITION_TIMESTAMP");
  if (until - from !== WINDOW_MS) throw blocked("CORRECTIVE_PRECONDITION_WINDOW", "window must be 24h");
  if (collected < from || collected >= until) {
    throw blocked("CORRECTIVE_PRECONDITION_WINDOW", "collection outside validity");
  }
  const now = resolveNow(options);
  if (now < from) throw blocked("CORRECTIVE_PRECONDITION_NOT_YET_VALID", "future start");
  if (now >= until) throw blocked("CORRECTIVE_PRECONDITION_EXPIRED", "expired");

  const authz = evidence.authorization;
  for (const key of FORBIDDEN_AUTH_KEYS) {
    if (authz && Object.prototype.hasOwnProperty.call(authz, key)) {
      throw blocked("CORRECTIVE_PRECONDITION_AUTHORITY_FORBIDDEN", key);
    }
  }
  assertKeys(authz, AUTH_KEYS, "CORRECTIVE_PRECONDITION_SCHEMA");
  assertExact(authz.pr_number, 324, "CORRECTIVE_PRECONDITION_SCHEMA", "pr");
  assertExact(
    authz.scope,
    "read_only_production_corrective_precondition_collection",
    "CORRECTIVE_PRECONDITION_SCHEMA",
    "scope",
  );
  validateAuthorityBlock(authz, options, "CORRECTIVE_PRECONDITION");

  const gate = evidence.automation_gate;
  assertAutomationGate(gate, "CORRECTIVE_PRECONDITION");

  const db = evidence.database_readonly;
  assertKeys(
    db,
    [
      "project_ref",
      "observed_at_utc",
      "history_count",
      "original_committed_migrations",
      "corrective_version",
      "corrective_version_count",
      "privilege_surfaces",
      "objects",
      "linked_firms_count",
      "authorizing_inventory",
      "webhook_non_terminal_count",
      "webhook_non_terminal_statuses",
      "consumed_dual_attempt_id",
    ],
    "CORRECTIVE_PRECONDITION_SCHEMA",
  );
  assertExact(parseUtc(db.observed_at_utc, "CORRECTIVE_PRECONDITION_TIMESTAMP"), collected, "CORRECTIVE_PRECONDITION_WINDOW", "db observed");
  validateDatabaseReadonly(db);
  validateSafety(evidence.safety);
  if (!Array.isArray(evidence.visibility_limitations) || evidence.visibility_limitations.length < 1) {
    throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "limitations");
  }
  const limitationText = evidence.visibility_limitations.join("\n");
  if (!/pins.*unpublished/i.test(limitationText)) {
    throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "limitations must mention unpublished pins");
  }
  for (const line of evidence.visibility_limitations) {
    if (typeof line !== "string" || !line.trim()) throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "limitation");
  }
  assertSanitized(JSON.stringify(evidence));
  return { protocol: PROTOCOL, apply_authorized: false };
}

function resolveContractCommit(seal, options = {}) {
  if (seal.source_commit != null && String(seal.source_commit).length) {
    return String(seal.source_commit).toLowerCase();
  }
  const fromOptions =
    options.executableCommit ||
    options.expected?.authorized_executable_commit ||
    null;
  if (!fromOptions || !HEX40.test(String(fromOptions).toLowerCase())) {
    throw blocked("CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "source_commit unresolved");
  }
  return String(fromOptions).toLowerCase();
}

function verifyCorrectivePreconditionContractSeal(auth, cwd, options = {}) {
  const seal = auth && auth.precondition_evidence_contract;
  if (!seal || seal.path !== CONTRACT_PATH) {
    throw blocked("CORRECTIVE_PRECONDITION_CONTRACT_UNSEALED", "contract seal missing");
  }
  const pub = auth.precondition_publication || {};
  if (pub.status !== "PUBLISHED") {
    return { path: CONTRACT_PATH, skipped_blob_load: true };
  }
  const commit = resolveContractCommit(seal, options);
  const loaded = loadAndVerifyGitBlob({
    commit,
    path: CONTRACT_PATH,
    expectedOid: seal.oid,
    expectedSha256: seal.sha256,
    expectedBytes: seal.bytes,
    cwd,
  });
  assertTrailingLf(loaded.buffer);
  const contract = JSON.parse(loaded.buffer.toString("utf8"));
  assertExact(contract.protocol, PROTOCOL, "CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "protocol");
  assertExact(contract.publication_status, "UNPUBLISHED", "CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "status");
  assertExact(
    contract.bindings.authorized_executable_commit,
    "from_production_collection_authorization_record",
    "CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH",
    "authorized_executable_commit",
  );
  assertExact(contract.bindings.history_count, HISTORY_COUNT, "CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "history");
  return loaded;
}

function preconditionPinsUnpublished(auth) {
  const pub = auth && auth.precondition_publication ? auth.precondition_publication : {};
  return (
    pub.status !== "PUBLISHED" ||
    pub.evidence_sha256 == null ||
    pub.evidence_blob_oid == null ||
    pub.evidence_bytes == null ||
    pub.evidence_source_commit == null ||
    pub.evidence_path == null
  );
}

function assertCorrectivePreconditionEvidencePublished(inputs = {}) {
  assertNoOverride(inputs);
  const auth = inputs.auth;
  if (!auth || typeof auth !== "object") throw blocked("CORRECTIVE_PRECONDITION_SCHEMA", "auth");
  if (preconditionPinsUnpublished(auth)) {
    throw blocked(
      "CORRECTIVE_PRECONDITION_PINS_UNPUBLISHED",
      "precondition publication is not PUBLISHED; gate stops before DB",
    );
  }
  const pub = auth.precondition_publication;
  const expected =
    (inputs.expected &&
    inputs.expected.authorized_executable_commit &&
    inputs.expected.authorization_publication_commit &&
    inputs.expected.authorization_publication_blob_oid
      ? {
          authorized_executable_commit: String(inputs.expected.authorized_executable_commit).toLowerCase(),
          authorization_publication_commit: String(
            inputs.expected.authorization_publication_commit,
          ).toLowerCase(),
          authorization_publication_blob_oid: String(
            inputs.expected.authorization_publication_blob_oid,
          ).toLowerCase(),
        }
      : null) || expectedAuthorityFromPublication(pub);
  if (!expected) {
    throw blocked("CORRECTIVE_PRECONDITION_AUTHORITY_EXPECTED", "expected authority pins required");
  }
  verifyCorrectivePreconditionContractSeal(auth, inputs.cwd, {
    executableCommit: inputs.executableCommit || expected.authorized_executable_commit,
    expected,
  });
  for (const [key, pattern] of Object.entries({
    evidence_source_commit: /^[0-9a-f]{40}$/,
    evidence_blob_oid: /^[0-9a-f]{40}$/,
    evidence_sha256: /^[0-9a-f]{64}$/,
  })) {
    if (!pattern.test(String(pub[key] || ""))) {
      throw blocked("CORRECTIVE_PRECONDITION_PINS_INVALID", `${key} is not published`);
    }
  }
  if (!Number.isInteger(pub.evidence_bytes) || pub.evidence_bytes <= 0) {
    throw blocked("CORRECTIVE_PRECONDITION_PINS_INVALID", "evidence_bytes is invalid");
  }
  if (
    !HEX40.test(String(pub.authorized_executable_commit || "").toLowerCase()) ||
    !HEX40.test(String(pub.authorization_publication_commit || "").toLowerCase()) ||
    !HEX40.test(String(pub.authorization_publication_blob_oid || "").toLowerCase())
  ) {
    throw blocked("CORRECTIVE_PRECONDITION_PINS_INVALID", "collection-authority triad required");
  }
  let loaded;
  try {
    loaded = loadAndVerifyGitBlob({
      commit: pub.evidence_source_commit,
      path: pub.evidence_path,
      expectedOid: pub.evidence_blob_oid,
      expectedSha256: pub.evidence_sha256,
      expectedBytes: pub.evidence_bytes,
      cwd: inputs.cwd,
    });
  } catch (err) {
    if (err.code === "GIT_BLOB_LOAD_FAILED" || err.code === "BLOCKED_PIN_MISMATCH") throw err;
    throw blocked(err.code || "GIT_BLOB_LOAD_FAILED", err.message);
  }
  assertTrailingLf(loaded.buffer);
  const evidence = JSON.parse(loaded.buffer.toString("utf8"));
  validateCorrectivePreconditionEvidence(evidence, { now: inputs.now, expected });
  return {
    protocol: PROTOCOL,
    sha256: loaded.sha256,
    oid: loaded.oid,
    bytes: loaded.bytes,
    apply_authorized: false,
    productionContact: false,
  };
}

module.exports = {
  PROTOCOL,
  CONTRACT_PATH,
  REJECTED_STALE_COLLECTION_TIP_DBDCE968,
  HISTORY_COUNT,
  CORRECTIVE_VERSION,
  WEBHOOK_STATUSES,
  TABLE_PRIVILEGES,
  EXECUTE_ROLES,
  DISPOSABLE_VALIDATOR,
  assertTrailingLf,
  expectedAuthority,
  expectedAuthorityFromPublication,
  validateCorrectivePreconditionEvidence,
  validateDatabaseReadonly,
  validatePrivilegeMatrix,
  validateSafety,
  assertCorrectivePreconditionEvidencePublished,
  verifyCorrectivePreconditionContractSeal,
};
