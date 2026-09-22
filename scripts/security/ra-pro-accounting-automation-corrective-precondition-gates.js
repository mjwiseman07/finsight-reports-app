"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { loadAndVerifyGitBlob, assertUtf8LfNoBom } = require("./git-blob-authority");
const {
  CONSUMED_ORIGINAL_ATTEMPT_ID,
  CORRECTIVE_TABLES,
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  PRIOR_HISTORY_COUNT,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1";
const CONTRACT_PATH =
  "docs/security/ra-pro-accounting-automation-corrective-apply/PRECONDITION_EVIDENCE_CONTRACT.json";
const TOOLING_REVIEWED_TIP = "5d112447ad90597d923900eff747917c0bd4f6c1";
const COLLECTION_PR_HEAD = "5d112447ad90597d923900eff747917c0bd4f6c1";
const PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
const HISTORY_COUNT = PRIOR_HISTORY_COUNT;
const CORRECTIVE_VERSION = MIGRATIONS[0].version;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const WEBHOOK_STATUSES = ["received", "processing", "retryable"];
const TABLE_PRIVILEGES = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];
const EXECUTE_ROLES = ["service_role", "authenticated", "anon", "PUBLIC"];
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

function expectedPrHead(options = {}) {
  return options.expected?.pr_head || options.expectedPrHead || COLLECTION_PR_HEAD;
}

function validatePrivilegeMatrix(db, codePrefix = "CORRECTIVE_PRECONDITION_PRIVILEGE") {
  const defect = db.privilege_defect;
  if (!defect || typeof defect !== "object") {
    throw blocked(`${codePrefix}_DEFECT`, "privilege_defect missing");
  }
  if (defect.present !== true) {
    throw blocked(`${codePrefix}_DEFECT`, "privilege defect must be present");
  }

  for (const role of ["service_role", "authenticated", "anon"]) {
    const matrix = defect[role];
    if (!matrix || typeof matrix !== "object") {
      throw blocked(`${codePrefix}_DEFECT`, `${role} matrix missing`);
    }
    for (const priv of TABLE_PRIVILEGES) {
      if (typeof matrix[priv] !== "boolean") {
        throw blocked(`${codePrefix}_DEFECT`, `${role}.${priv} must be boolean`);
      }
    }
  }

  const svc = defect.service_role;
  if (
    svc.SELECT !== true ||
    svc.INSERT !== true ||
    svc.UPDATE !== true ||
    svc.DELETE !== true ||
    svc.TRUNCATE !== true ||
    svc.REFERENCES !== true ||
    svc.TRIGGER !== true
  ) {
    throw blocked(`${codePrefix}_DEFECT`, "service_role excess defect incomplete");
  }

  const auth = defect.authenticated;
  if (
    auth.SELECT !== true ||
    auth.INSERT !== false ||
    auth.UPDATE !== false ||
    auth.DELETE !== false ||
    auth.TRUNCATE !== false ||
    auth.REFERENCES !== false ||
    auth.TRIGGER !== false
  ) {
    throw blocked(`${codePrefix}_DEFECT`, "authenticated matrix mismatch");
  }

  const anon = defect.anon;
  for (const priv of TABLE_PRIVILEGES) {
    if (anon[priv] !== false) {
      throw blocked(`${codePrefix}_DEFECT`, `anon.${priv} must be false`);
    }
  }

  if (defect.PUBLIC_catalog_empty !== true) {
    throw blocked(`${codePrefix}_PUBLIC`, "PUBLIC catalog must be empty");
  }

  const exec = defect.EXECUTE;
  if (!exec || typeof exec !== "object") throw blocked(`${codePrefix}_EXECUTE`, "EXECUTE matrix missing");
  assertExact(exec.service_role, true, `${codePrefix}_EXECUTE`, "service_role execute");
  assertExact(exec.authenticated, false, `${codePrefix}_EXECUTE`, "authenticated execute");
  assertExact(exec.anon, false, `${codePrefix}_EXECUTE`, "anon execute");
  assertExact(exec.PUBLIC, false, `${codePrefix}_EXECUTE`, "PUBLIC execute");

  const versionNum = db.server_version_num;
  if (!Number.isInteger(versionNum) || versionNum <= 0) {
    throw blocked(`${codePrefix}_VERSION`, "server_version_num required");
  }
  const maintainSupported = versionNum >= 170000;
  if (maintainSupported) {
    if (defect.maintain_supported !== true || defect.maintain_status !== "checked") {
      throw blocked(`${codePrefix}_MAINTAIN`, "PG17 maintain must be checked");
    }
    for (const role of ["service_role", "authenticated", "anon"]) {
      if (defect[role].MAINTAIN !== false) {
        throw blocked(`${codePrefix}_MAINTAIN`, `${role}.MAINTAIN must be false when supported`);
      }
    }
  } else {
    if (defect.maintain_supported !== false || defect.maintain_status !== "not_supported") {
      throw blocked(`${codePrefix}_MAINTAIN`, "PG16 maintain must be not_supported");
    }
    for (const role of ["service_role", "authenticated", "anon"]) {
      if (Object.prototype.hasOwnProperty.call(defect[role], "MAINTAIN")) {
        throw blocked(`${codePrefix}_MAINTAIN`, `${role}.MAINTAIN claim forbidden below PG17`);
      }
    }
  }
}

function validateOriginals(db) {
  const originals = db.original_committed_migrations;
  if (!Array.isArray(originals) || originals.length !== ORIGINAL_COMMITTED_MIGRATIONS.length) {
    throw blocked("CORRECTIVE_PRECONDITION_ORIGINALS", "original migration count");
  }
  for (const expected of ORIGINAL_COMMITTED_MIGRATIONS) {
    const got = originals.find((row) => row.version === expected.version);
    if (!got) throw blocked("CORRECTIVE_PRECONDITION_ORIGINALS", `missing ${expected.version}`);
    assertExact(got.count, 1, "CORRECTIVE_PRECONDITION_ORIGINALS", "count");
    assertExact(got.digest_match, true, "CORRECTIVE_PRECONDITION_ORIGINALS", "digest");
    assertExact(got.oid, expected.oid, "CORRECTIVE_PRECONDITION_ORIGINALS", "oid");
    assertExact(got.sha256, expected.sha256, "CORRECTIVE_PRECONDITION_ORIGINALS", "sha256");
    assertExact(got.bytes, expected.bytes, "CORRECTIVE_PRECONDITION_ORIGINALS", "bytes");
  }
}

function validateDatabaseReadonly(db) {
  assertExact(db.project_ref, PROJECT_REF, "CORRECTIVE_PRECONDITION_PROJECT_MISMATCH", "project_ref");
  assertExact(db.history_count, HISTORY_COUNT, "CORRECTIVE_PRECONDITION_HISTORY_DRIFT", "history");
  validateOriginals(db);
  assertExact(db.corrective_version, CORRECTIVE_VERSION, "CORRECTIVE_PRECONDITION_CORRECTIVE", "version");
  assertExact(db.corrective_version_count, 0, "CORRECTIVE_PRECONDITION_CORRECTIVE", "count");
  if (db.tables_present !== true || db.rls_enabled !== true) {
    throw blocked("CORRECTIVE_PRECONDITION_OBJECT_DRIFT", "tables/rls");
  }
  if (db.policies_present !== true || db.functions_present !== true) {
    throw blocked("CORRECTIVE_PRECONDITION_OBJECT_DRIFT", "policies/functions");
  }
  if (!Array.isArray(db.tables) || db.tables.length !== CORRECTIVE_TABLES.length) {
    throw blocked("CORRECTIVE_PRECONDITION_OBJECT_DRIFT", "tables list");
  }
  for (const table of CORRECTIVE_TABLES) {
    if (!db.tables.includes(table)) {
      throw blocked("CORRECTIVE_PRECONDITION_OBJECT_DRIFT", `missing table ${table}`);
    }
  }
  validatePrivilegeMatrix(db);
  assertExact(db.linked_firms_count, 0, "CORRECTIVE_PRECONDITION_LINKED_FIRMS", "linked firms");
  const inventory = db.authorizing_inventory;
  assertKeys(
    inventory,
    ["predicate", "total", "company_owned", "firm_owned", "dual_owner"],
    "CORRECTIVE_PRECONDITION_INVENTORY",
  );
  assertExact(
    inventory.predicate,
    "review_assist_pro_active_and_complimentary",
    "CORRECTIVE_PRECONDITION_INVENTORY",
    "predicate",
  );
  assertExact(inventory.total, 4, "CORRECTIVE_PRECONDITION_INVENTORY", "total");
  assertExact(inventory.company_owned, 3, "CORRECTIVE_PRECONDITION_INVENTORY", "company");
  assertExact(inventory.firm_owned, 1, "CORRECTIVE_PRECONDITION_INVENTORY", "firm");
  assertExact(inventory.dual_owner, 0, "CORRECTIVE_PRECONDITION_INVENTORY", "dual");
  if (inventory.company_owned + inventory.firm_owned + inventory.dual_owner !== inventory.total) {
    throw blocked("CORRECTIVE_PRECONDITION_INVENTORY", "inventory sum");
  }
  if (!Array.isArray(db.webhook_non_terminal_statuses) || db.webhook_non_terminal_statuses.join(",") !== WEBHOOK_STATUSES.join(",")) {
    throw blocked("CORRECTIVE_PRECONDITION_WEBHOOK", "statuses");
  }
  assertExact(db.webhook_non_terminal_count, 0, "CORRECTIVE_PRECONDITION_WEBHOOK", "count");
  assertExact(
    db.consumed_dual_attempt_id,
    CONSUMED_ORIGINAL_ATTEMPT_ID,
    "CORRECTIVE_PRECONDITION_DUAL_ATTEMPT",
    "consumed attempt",
  );
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
  assertExact(evidence.schema_version, 1, "CORRECTIVE_PRECONDITION_SCHEMA", "schema_version");
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
  assertKeys(authz, ["pr_number", "pr_head", "scope", "tooling_reviewed_tip"], "CORRECTIVE_PRECONDITION_SCHEMA");
  assertExact(authz.pr_number, 324, "CORRECTIVE_PRECONDITION_SCHEMA", "pr");
  assertExact(authz.pr_head, expectedPrHead(options), "CORRECTIVE_PRECONDITION_HEAD_MISMATCH", "pr head");
  assertExact(
    authz.scope,
    "read_only_production_corrective_precondition_collection",
    "CORRECTIVE_PRECONDITION_SCHEMA",
    "scope",
  );
  assertExact(authz.tooling_reviewed_tip, TOOLING_REVIEWED_TIP, "CORRECTIVE_PRECONDITION_BINDING_MISMATCH", "tip");

  const gate = evidence.automation_gate;
  assertKeys(gate, ["key", "production_presence", "effective_state", "value_read"], "CORRECTIVE_PRECONDITION_SCHEMA");
  assertExact(gate.key, "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION", "CORRECTIVE_PRECONDITION_AUTOMATION_GATE", "key");
  if (gate.production_presence !== "absent" || gate.effective_state !== "closed" || gate.value_read !== false) {
    throw blocked("CORRECTIVE_PRECONDITION_AUTOMATION_GATE", "gate");
  }

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
      "tables",
      "tables_present",
      "rls_enabled",
      "policies_present",
      "functions_present",
      "privilege_defect",
      "server_version_num",
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

function verifyCorrectivePreconditionContractSeal(auth, cwd) {
  const seal = auth && auth.precondition_evidence_contract;
  if (!seal || seal.path !== CONTRACT_PATH) {
    throw blocked("CORRECTIVE_PRECONDITION_CONTRACT_UNSEALED", "contract seal missing");
  }
  const pub = auth.precondition_publication || {};
  if (pub.status !== "PUBLISHED") {
    return { path: CONTRACT_PATH, skipped_blob_load: true };
  }
  if (String(seal.source_commit || "").toLowerCase() !== String(seal.source_commit || "").toLowerCase()) {
    throw blocked("CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "source");
  }
  const loaded = loadAndVerifyGitBlob({
    commit: seal.source_commit,
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
  assertExact(contract.bindings.collection_pr_head, COLLECTION_PR_HEAD, "CORRECTIVE_PRECONDITION_CONTRACT_MISMATCH", "head");
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
  verifyCorrectivePreconditionContractSeal(auth, inputs.cwd);
  if (preconditionPinsUnpublished(auth)) {
    throw blocked(
      "CORRECTIVE_PRECONDITION_PINS_UNPUBLISHED",
      "precondition publication is not PUBLISHED; gate stops before DB",
    );
  }
  const pub = auth.precondition_publication;
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
  validateCorrectivePreconditionEvidence(evidence, { now: inputs.now, expected: inputs.expected });
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
  COLLECTION_PR_HEAD,
  TOOLING_REVIEWED_TIP,
  HISTORY_COUNT,
  CORRECTIVE_VERSION,
  WEBHOOK_STATUSES,
  TABLE_PRIVILEGES,
  EXECUTE_ROLES,
  DISPOSABLE_VALIDATOR,
  assertTrailingLf,
  validateCorrectivePreconditionEvidence,
  validateDatabaseReadonly,
  validatePrivilegeMatrix,
  validateSafety,
  assertCorrectivePreconditionEvidencePublished,
  verifyCorrectivePreconditionContractSeal,
};
