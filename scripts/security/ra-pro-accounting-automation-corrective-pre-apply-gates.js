"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { loadAndVerifyGitBlob } = require("./git-blob-authority");
const { assertAutomationGate } = require("./ra-pro-accounting-automation-corrective-evidence-schema");
const {
  validateDatabaseReadonly,
  validateSafety,
  assertTrailingLf,
  HISTORY_COUNT,
  REJECTED_STALE_COLLECTION_TIP_DBDCE968,
} = require("./ra-pro-accounting-automation-corrective-precondition-gates");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1";
const CONTRACT_PATH =
  "docs/security/ra-pro-accounting-automation-corrective-apply/PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json";
const WINDOW_MS = 24 * 60 * 60 * 1000;
const PRECONDITION_PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1";
const SUBSTITUTES = new Set([
  PRECONDITION_PROTOCOL,
  "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
  "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1",
  "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
  "RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1",
  "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
  "RA_PRO_CUTOVER_PRIOR_DRY_RUN_EVIDENCE_V1",
]);
const SOURCE_CHANNELS = new Set([
  "fresh_read_only_supabase_select",
  "synthetic_disposable_fixture",
]);
const DISPOSABLE_VALIDATOR_PRE_APPLY = "PASS_CORRECTIVE_PRE_APPLY_LIVE_VALIDATION";
const AUTHORIZATION_KEYS = [
  "pr_number",
  "scope",
  "authorized_executable_commit",
  "authorization_publication_commit",
  "authorization_publication_blob_oid",
  "committed_pre_apply_pins",
  "disposable_pin_scope",
];
const FORBIDDEN_AUTHORITY_KEYS = ["tooling_reviewed_tip", "pr_head", "collection_pr_head"];
const HEX40 = /^[0-9a-f]{40}$/;

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "pre_apply_live_evidence";
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
  return parseUtc(String(options.now), "CORRECTIVE_PRE_APPLY_TIMESTAMP");
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
    throw blocked("CORRECTIVE_PRE_APPLY_SANITIZATION", "forbidden material");
  }
}

function assertNoOverride(inputs = {}) {
  const env = inputs.env || {};
  if (inputs.preApplyEvidencePath) {
    throw blocked("CORRECTIVE_PRE_APPLY_EVIDENCE_PATH_OVERRIDE_FORBIDDEN", "path override supplied");
  }
  for (const key of [
    "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_PATH",
    "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_SHA256",
  ]) {
    if (Object.prototype.hasOwnProperty.call(env, key) && env[key]) {
      throw blocked("CORRECTIVE_PRE_APPLY_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", key);
    }
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
  throw blocked("CORRECTIVE_PRE_APPLY_AUTHORITY_EXPECTED", "expected authority pins required");
}

function assertAuthorityNotStale(authz) {
  for (const key of [
    "authorized_executable_commit",
    "authorization_publication_commit",
    "authorization_publication_blob_oid",
  ]) {
    if (String(authz[key] || "").toLowerCase() === REJECTED_STALE_COLLECTION_TIP_DBDCE968) {
      throw blocked("CORRECTIVE_PRE_APPLY_REJECTED_STALE_TIP", key);
    }
  }
}

function assertAuthorizationAuthority(authz, options = {}) {
  for (const key of FORBIDDEN_AUTHORITY_KEYS) {
    if (authz && Object.prototype.hasOwnProperty.call(authz, key)) {
      throw blocked("CORRECTIVE_PRE_APPLY_AUTHORITY_FORBIDDEN", key);
    }
  }
  assertKeys(authz, AUTHORIZATION_KEYS, "CORRECTIVE_PRE_APPLY_SCHEMA");
  // attestations.collection_tooling_tip / tooling_reviewed_tip are non-authoritative
  void options.evidence?.attestations?.collection_tooling_tip;
  void options.evidence?.attestations?.tooling_reviewed_tip;

  assertExact(authz.pr_number, 324, "CORRECTIVE_PRE_APPLY_SCHEMA", "pr");
  assertExact(
    authz.scope,
    "read_only_production_corrective_pre_apply_live_collection",
    "CORRECTIVE_PRE_APPLY_SCHEMA",
    "scope",
  );
  assertExact(authz.committed_pre_apply_pins, "UNPUBLISHED", "CORRECTIVE_PRE_APPLY_CONTRADICTION", "pins");
  assertExact(authz.disposable_pin_scope, "in_memory_file_sha_only", "CORRECTIVE_PRE_APPLY_SCHEMA", "pin scope");
  assertAuthorityNotStale(authz);

  const expected = expectedAuthority(options);
  for (const key of [
    "authorized_executable_commit",
    "authorization_publication_commit",
    "authorization_publication_blob_oid",
  ]) {
    const value = String(authz[key] || "").toLowerCase();
    if (!HEX40.test(value)) {
      throw blocked("CORRECTIVE_PRE_APPLY_AUTHORITY_SHAPE", key);
    }
    assertExact(
      value,
      String(expected[key]).toLowerCase(),
      "CORRECTIVE_PRE_APPLY_AUTHORITY_MISMATCH",
      key,
    );
  }
}

function resolveContractCommit(seal, options = {}) {
  if (seal.source_commit != null && String(seal.source_commit).trim() !== "") {
    return String(seal.source_commit).toLowerCase();
  }
  const fromOptions =
    options.executableCommit ||
    options.expected?.authorized_executable_commit ||
    null;
  if (!fromOptions || !HEX40.test(String(fromOptions).toLowerCase())) {
    throw blocked(
      "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH",
      "source_commit null requires executableCommit or expected.authorized_executable_commit",
    );
  }
  return String(fromOptions).toLowerCase();
}

function validateCorrectivePreApplyLiveEvidence(evidence, options = {}) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "evidence object");
  }
  if (SUBSTITUTES.has(evidence.protocol)) {
    throw blocked("CORRECTIVE_PRE_APPLY_SUBSTITUTION_FORBIDDEN", evidence.protocol);
  }
  assertRequiredKeys(
    evidence,
    [
      "protocol",
      "schema_version",
      "source_channel_classification",
      "collection_started_at_utc",
      "collection_ended_at_utc",
      "valid_from_utc",
      "valid_until_utc",
      "authorization",
      "automation_gate",
      "database_readonly",
      "safety",
      "visibility_limitations",
      "validator_result",
    ],
    "CORRECTIVE_PRE_APPLY_SCHEMA",
  );
  assertExact(evidence.protocol, PROTOCOL, "CORRECTIVE_PRE_APPLY_PROTOCOL_MISMATCH", "protocol");
  assertExact(evidence.schema_version, 3, "CORRECTIVE_PRE_APPLY_SCHEMA", "schema_version");
  if (!SOURCE_CHANNELS.has(evidence.source_channel_classification)) {
    throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "source channel");
  }
  assertExact(evidence.validator_result, DISPOSABLE_VALIDATOR_PRE_APPLY, "CORRECTIVE_PRE_APPLY_SCHEMA", "validator");

  const from = parseUtc(evidence.valid_from_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP");
  const until = parseUtc(evidence.valid_until_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP");
  const started = parseUtc(evidence.collection_started_at_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP");
  const ended = parseUtc(evidence.collection_ended_at_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP");
  if (until - from !== WINDOW_MS) throw blocked("CORRECTIVE_PRE_APPLY_WINDOW", "window must be 24h");
  if (started !== from || ended < started || ended >= until) {
    throw blocked("CORRECTIVE_PRE_APPLY_WINDOW", "collection outside validity");
  }
  const now = resolveNow(options);
  if (now < from) throw blocked("CORRECTIVE_PRE_APPLY_NOT_YET_VALID", "future start");
  if (now >= until) throw blocked("CORRECTIVE_PRE_APPLY_EXPIRED", "expired");

  assertAuthorizationAuthority(evidence.authorization, { ...options, evidence });

  const gate = evidence.automation_gate;
  assertAutomationGate(gate, "CORRECTIVE_PRE_APPLY");

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
    "CORRECTIVE_PRE_APPLY_SCHEMA",
  );
  assertExact(parseUtc(db.observed_at_utc, "CORRECTIVE_PRE_APPLY_TIMESTAMP"), started, "CORRECTIVE_PRE_APPLY_WINDOW", "db observed");
  validateDatabaseReadonly(db);
  validateSafety(evidence.safety);
  if (!Array.isArray(evidence.visibility_limitations) || evidence.visibility_limitations.length < 1) {
    throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "limitations");
  }
  const limitationText = evidence.visibility_limitations.join("\n");
  if (!/pins.*unpublished/i.test(limitationText)) {
    throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "limitations must mention unpublished pins");
  }
  for (const line of evidence.visibility_limitations) {
    if (typeof line !== "string" || !line.trim()) throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "limitation");
  }
  assertSanitized(JSON.stringify(evidence));
  return { protocol: PROTOCOL, apply_authorized: false };
}

function verifyCorrectivePreApplyContractSeal(auth, cwd, options = {}) {
  const seal = auth && auth.pre_apply_live_evidence_contract;
  if (!seal || seal.path !== CONTRACT_PATH) {
    throw blocked("CORRECTIVE_PRE_APPLY_CONTRACT_UNSEALED", "contract seal missing");
  }
  const pub = auth.pre_apply_live_publication || {};
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
  assertExact(contract.protocol, PROTOCOL, "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH", "protocol");
  assertExact(contract.publication_status, "UNPUBLISHED", "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH", "status");
  assertExact(
    contract.bindings.authorized_executable_commit,
    "from_production_collection_authorization_record",
    "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH",
    "authorized_executable_commit",
  );
  assertExact(contract.bindings.history_count, HISTORY_COUNT, "CORRECTIVE_PRE_APPLY_CONTRACT_MISMATCH", "history");
  return loaded;
}

function preApplyPinsUnpublished(auth) {
  const pub = auth && auth.publication ? auth.publication : {};
  const pre = auth && auth.pre_apply_live_publication ? auth.pre_apply_live_publication : {};
  return (
    pub.status === "UNPUBLISHED" ||
    pub.required_pre_apply_live_evidence_sha256 == null ||
    pub.required_pre_apply_live_evidence_oid == null ||
    pub.required_pre_apply_live_evidence_bytes == null ||
    pre.status !== "PUBLISHED" ||
    pre.evidence_sha256 == null ||
    pre.evidence_blob_oid == null ||
    pre.evidence_bytes == null ||
    pre.evidence_source_commit == null ||
    pre.evidence_path == null
  );
}

function assertCorrectivePreApplyLiveEvidencePublished(inputs = {}) {
  assertNoOverride(inputs);
  const auth = inputs.auth;
  if (!auth || typeof auth !== "object") throw blocked("CORRECTIVE_PRE_APPLY_SCHEMA", "auth");
  if (preApplyPinsUnpublished(auth)) {
    throw blocked(
      "CORRECTIVE_PRE_APPLY_PINS_UNPUBLISHED",
      "pre-apply pins are null/UNPUBLISHED; apply remains unreachable",
    );
  }
  const pub = auth.publication;
  const pre = auth.pre_apply_live_publication;
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
      : null) || expectedAuthorityFromPublication(pre);
  if (!expected) {
    throw blocked("CORRECTIVE_PRE_APPLY_AUTHORITY_EXPECTED", "expected authority pins required");
  }
  verifyCorrectivePreApplyContractSeal(auth, inputs.cwd, {
    executableCommit: inputs.executableCommit || expected.authorized_executable_commit,
    expected,
  });
  if (
    pub.required_pre_apply_live_evidence_sha256 !== pre.evidence_sha256 ||
    pub.required_pre_apply_live_evidence_oid !== pre.evidence_blob_oid ||
    pub.required_pre_apply_live_evidence_bytes !== pre.evidence_bytes
  ) {
    throw blocked("CORRECTIVE_PRE_APPLY_PIN_CONTRADICTION", "authorization pins disagree");
  }
  if (pre.apply_authorized === true) {
    throw blocked("AUTHORIZATION_PINS_UNPUBLISHED", "pre_apply apply_authorized must remain false");
  }
  if (
    !HEX40.test(String(pre.authorized_executable_commit || "").toLowerCase()) ||
    !HEX40.test(String(pre.authorization_publication_commit || "").toLowerCase()) ||
    !HEX40.test(String(pre.authorization_publication_blob_oid || "").toLowerCase())
  ) {
    throw blocked("CORRECTIVE_PRE_APPLY_PINS_INVALID", "collection-authority triad required");
  }
  let loaded;
  try {
    loaded = loadAndVerifyGitBlob({
      commit: pre.evidence_source_commit,
      path: pre.evidence_path,
      expectedOid: pre.evidence_blob_oid,
      expectedSha256: pre.evidence_sha256,
      expectedBytes: pre.evidence_bytes,
      cwd: inputs.cwd,
    });
  } catch (err) {
    if (err.code === "GIT_BLOB_LOAD_FAILED" || err.code === "BLOCKED_PIN_MISMATCH") throw err;
    throw blocked(err.code || "GIT_BLOB_LOAD_FAILED", err.message);
  }
  assertTrailingLf(loaded.buffer);
  const evidence = JSON.parse(loaded.buffer.toString("utf8"));
  validateCorrectivePreApplyLiveEvidence(evidence, { now: inputs.now, expected });
  return {
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
  DISPOSABLE_VALIDATOR: DISPOSABLE_VALIDATOR_PRE_APPLY,
  expectedAuthority,
  expectedAuthorityFromPublication,
  validateCorrectivePreApplyLiveEvidence,
  assertCorrectivePreApplyLiveEvidencePublished,
  verifyCorrectivePreApplyContractSeal,
};
