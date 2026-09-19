"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { loadAndVerifyGitBlob, assertUtf8LfNoBom } = require("./git-blob-authority");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1";
const CONTRACT_PATH =
  "docs/security/ra-pro-accounting-automation-apply/PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json";
const COLLECTION_PR_HEAD = "a49a20a8fae505a7639914326836dc79577600e2";
const PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
const PRODUCTION_COMMIT = "854fd2920cd1c77a411918a617d10a8fb3ce591d";
const VERCEL_DEPLOYMENT_ID = "FTe8t7bxyMVV6imEFAatkmBau1R7";
const GITHUB_PRODUCTION_DEPLOYMENT_ID = 6513747695;
const GITHUB_PREVIEW_DEPLOYMENT_ID = 6536311942;
const PRIOR_SHA256 = "f89c3e701703d199f56577a65ae6f28b5ba120be45ee482f2ab75c284d763d18";
const PRIOR_SOURCE = "195c76060f0fc8aa7b81dc4718d7357c3be8eba6";
const PRIOR_TIP = "99e6ed195c95b5cdcd27a6690f2441df4e7ae6a9";
const HISTORY_COUNT = 188;
const WINDOW_MS = 24 * 60 * 60 * 1000;
const MIGRATIONS = [
  {
    version: "20260917044537",
    oid: "788de3e4b600c0aac57738c9ca3509d1b7e76d49",
    sha256: "7ce512e9e58a589766db12e6179300bf7f8ba8918a50685cfff5820989925430",
    bytes: 6952,
  },
  {
    version: "20260917180140",
    oid: "929054aec3d08bbf45d13d2a23f187f6200005dd",
    sha256: "ea22749b259a9b14a8cb8c5c575495430262057179d148496d506aaeebbbff10",
    bytes: 3997,
  },
];
const PREREQUISITES = [
  "firms_id_uuid_key",
  "companies_id_uuid_key",
  "firm_clients_id_uuid_key",
  "firm_clients_firm_id_uuid",
  "accounting_syncs_id_uuid_key",
  "firm_memberships_shape",
  "auth_uid_uuid",
  "roles_compatible",
  "gen_random_uuid_present",
];
const WEBHOOK_STATUSES = ["received", "processing", "retryable"];
const SUBSTITUTES = new Set([
  "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
  "RA_PRO_ACCOUNTING_AUTOMATION_PRODUCTION_DRY_RUN_CEREMONY_V1",
  "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
  "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
]);
const SOURCE_CHANNELS = new Set([
  "fresh_read_only_github_vercel_status_and_supabase_select",
  "synthetic_disposable_fixture",
]);
const DISPOSABLE_VALIDATOR = "PASS_DISPOSABLE_PRE_APPLY_LIVE_VALIDATION";

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

function parseUtc(value, code) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) {
    throw blocked(code, "timestamp");
  }
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw blocked(code, "timestamp");
  return ms;
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
    throw blocked("PRE_APPLY_LIVE_SANITIZATION", "forbidden material");
  }
}

function assertNoOverride(inputs = {}) {
  const env = inputs.env || {};
  if (inputs.preApplyEvidencePath) {
    throw blocked("PRE_APPLY_LIVE_EVIDENCE_PATH_OVERRIDE_FORBIDDEN", "path override supplied");
  }
  for (const key of [
    "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_PATH",
    "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_SHA256",
  ]) {
    if (Object.prototype.hasOwnProperty.call(env, key) && env[key]) {
      throw blocked("PRE_APPLY_LIVE_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
}

function assertTrailingLf(buffer) {
  try {
    assertUtf8LfNoBom(buffer, "pre-apply evidence");
  } catch (err) {
    throw blocked("PRE_APPLY_LIVE_NEWLINE", err.message);
  }
  if (buffer.length < 2 || buffer[buffer.length - 1] !== 0x0a || buffer[buffer.length - 2] === 0x0a) {
    throw blocked("PRE_APPLY_LIVE_NEWLINE", "exactly one trailing LF required");
  }
}

function pinsUnpublished(auth) {
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

function assertAuthBindings(auth) {
  assertExact(auth.project_ref, PROJECT_REF, "PRE_APPLY_LIVE_PROJECT_MISMATCH", "project");
  assertExact(auth.history_contract && auth.history_contract.prior, HISTORY_COUNT, "PRE_APPLY_LIVE_HISTORY_DRIFT", "history");
  assertExact(
    auth.publication && auth.publication.required_prior_dry_run_evidence_sha256,
    PRIOR_SHA256,
    "PRE_APPLY_LIVE_PRIOR_PIN_CONTRADICTION",
    "prior sha",
  );
  const migrations = auth.migrations || [];
  if (migrations.length !== MIGRATIONS.length) {
    throw blocked("PRE_APPLY_LIVE_MIGRATION_MISMATCH", "migration count");
  }
  MIGRATIONS.forEach((expected, index) => {
    const got = migrations[index] || {};
    assertExact(got.version, expected.version, "PRE_APPLY_LIVE_MIGRATION_MISMATCH", "version");
    assertExact(got.oid, expected.oid, "PRE_APPLY_LIVE_MIGRATION_MISMATCH", "oid");
    assertExact(got.sha256, expected.sha256, "PRE_APPLY_LIVE_MIGRATION_MISMATCH", "sha");
    assertExact(got.bytes, expected.bytes, "PRE_APPLY_LIVE_MIGRATION_MISMATCH", "bytes");
  });
}

function validatePreApplyLiveEvidence(evidence, options = {}) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw blocked("PRE_APPLY_LIVE_SCHEMA", "evidence object");
  }
  if (SUBSTITUTES.has(evidence.protocol)) {
    throw blocked("PRE_APPLY_LIVE_SUBSTITUTION_FORBIDDEN", evidence.protocol);
  }
  assertKeys(
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
      "prior_dry_run_pin",
      "serving_deployment",
      "preview_deployment",
      "automation_gate",
      "database_readonly",
      "safety",
      "visibility_limitations",
      "validator_result",
    ],
    "PRE_APPLY_LIVE_SCHEMA",
  );
  assertExact(evidence.protocol, PROTOCOL, "PRE_APPLY_LIVE_PROTOCOL_MISMATCH", "protocol");
  assertExact(evidence.schema_version, 1, "PRE_APPLY_LIVE_SCHEMA", "schema_version");
  if (!SOURCE_CHANNELS.has(evidence.source_channel_classification)) {
    throw blocked("PRE_APPLY_LIVE_SCHEMA", "source channel");
  }
  assertExact(evidence.validator_result, DISPOSABLE_VALIDATOR, "PRE_APPLY_LIVE_SCHEMA", "validator");

  const from = parseUtc(evidence.valid_from_utc, "PRE_APPLY_LIVE_TIMESTAMP");
  const until = parseUtc(evidence.valid_until_utc, "PRE_APPLY_LIVE_TIMESTAMP");
  const started = parseUtc(evidence.collection_started_at_utc, "PRE_APPLY_LIVE_TIMESTAMP");
  const ended = parseUtc(evidence.collection_ended_at_utc, "PRE_APPLY_LIVE_TIMESTAMP");
  if (until - from !== WINDOW_MS) throw blocked("PRE_APPLY_LIVE_WINDOW", "window must be 24h");
  if (started !== from || ended < started || ended >= until) {
    throw blocked("PRE_APPLY_LIVE_WINDOW", "collection outside validity");
  }
  const now = options.now == null ? Date.now() : parseUtc(
    options.now instanceof Date ? options.now.toISOString().replace(/\.\d{3}Z$/, "Z") : options.now,
    "PRE_APPLY_LIVE_TIMESTAMP",
  );
  if (now < from) throw blocked("PRE_APPLY_LIVE_NOT_YET_VALID", "future start");
  if (now >= until) throw blocked("PRE_APPLY_LIVE_EXPIRED", "expired");

  const authz = evidence.authorization;
  assertKeys(
    authz,
    ["pr_number", "pr_head", "scope", "committed_pre_apply_pins", "disposable_pin_scope"],
    "PRE_APPLY_LIVE_SCHEMA",
  );
  assertExact(authz.pr_number, 324, "PRE_APPLY_LIVE_SCHEMA", "pr");
  assertExact(authz.pr_head, COLLECTION_PR_HEAD, "PRE_APPLY_LIVE_HEAD_MISMATCH", "pr head");
  assertExact(authz.scope, "read_only_production_pre_apply_live_collection", "PRE_APPLY_LIVE_SCHEMA", "scope");
  assertExact(authz.committed_pre_apply_pins, "UNPUBLISHED", "PRE_APPLY_LIVE_CONTRADICTION", "pins");
  assertExact(authz.disposable_pin_scope, "in_memory_file_sha_only", "PRE_APPLY_LIVE_SCHEMA", "pin scope");

  const prior = evidence.prior_dry_run_pin;
  assertKeys(
    prior,
    ["status", "evidence_sha256", "evidence_source_commit", "reviewed_tip", "bound_to_expected_sha"],
    "PRE_APPLY_LIVE_SCHEMA",
  );
  assertExact(prior.status, "PUBLISHED", "PRE_APPLY_LIVE_PRIOR_PIN_CONTRADICTION", "prior status");
  assertExact(prior.evidence_sha256, PRIOR_SHA256, "PRE_APPLY_LIVE_PRIOR_PIN_CONTRADICTION", "prior sha");
  assertExact(prior.evidence_source_commit, PRIOR_SOURCE, "PRE_APPLY_LIVE_PRIOR_PIN_CONTRADICTION", "prior source");
  assertExact(prior.reviewed_tip, PRIOR_TIP, "PRE_APPLY_LIVE_PRIOR_PIN_CONTRADICTION", "prior tip");
  if (prior.bound_to_expected_sha !== true) {
    throw blocked("PRE_APPLY_LIVE_PRIOR_PIN_CONTRADICTION", "prior binding flag");
  }

  const serving = evidence.serving_deployment;
  assertKeys(
    serving,
    [
      "environment",
      "state",
      "production_commit",
      "vercel_deployment_id",
      "github_deployment_id",
      "observed_at_utc",
      "pr_head_is_serving_production",
    ],
    "PRE_APPLY_LIVE_SCHEMA",
  );
  assertExact(serving.environment, "Production", "PRE_APPLY_LIVE_DEPLOYMENT_MISMATCH", "environment");
  assertExact(serving.state, "success", "PRE_APPLY_LIVE_DEPLOYMENT_MISMATCH", "state");
  assertExact(serving.production_commit, PRODUCTION_COMMIT, "PRE_APPLY_LIVE_DEPLOYMENT_MISMATCH", "commit");
  assertExact(serving.vercel_deployment_id, VERCEL_DEPLOYMENT_ID, "PRE_APPLY_LIVE_DEPLOYMENT_MISMATCH", "vercel");
  assertExact(
    serving.github_deployment_id,
    GITHUB_PRODUCTION_DEPLOYMENT_ID,
    "PRE_APPLY_LIVE_DEPLOYMENT_MISMATCH",
    "github",
  );
  assertExact(parseUtc(serving.observed_at_utc, "PRE_APPLY_LIVE_TIMESTAMP"), ended, "PRE_APPLY_LIVE_WINDOW", "observed");
  if (serving.pr_head_is_serving_production !== false) {
    throw blocked("PRE_APPLY_LIVE_CONTRADICTION", "serving head");
  }

  const preview = evidence.preview_deployment;
  assertKeys(
    preview,
    ["environment", "pr_head", "github_deployment_id", "state", "is_production_serving"],
    "PRE_APPLY_LIVE_SCHEMA",
  );
  assertExact(preview.environment, "Preview", "PRE_APPLY_LIVE_DEPLOYMENT_MISMATCH", "preview");
  assertExact(preview.pr_head, COLLECTION_PR_HEAD, "PRE_APPLY_LIVE_HEAD_MISMATCH", "preview head");
  assertExact(preview.github_deployment_id, GITHUB_PREVIEW_DEPLOYMENT_ID, "PRE_APPLY_LIVE_DEPLOYMENT_MISMATCH", "preview id");
  assertExact(preview.state, "success", "PRE_APPLY_LIVE_DEPLOYMENT_MISMATCH", "preview state");
  if (preview.is_production_serving !== false) {
    throw blocked("PRE_APPLY_LIVE_CONTRADICTION", "preview serving");
  }

  const gate = evidence.automation_gate;
  assertKeys(gate, ["key", "production_presence", "effective_state", "value_read"], "PRE_APPLY_LIVE_SCHEMA");
  assertExact(gate.key, "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION", "PRE_APPLY_LIVE_AUTOMATION_GATE_OPEN", "key");
  if (gate.production_presence !== "absent" || gate.effective_state !== "closed" || gate.value_read !== false) {
    throw blocked("PRE_APPLY_LIVE_AUTOMATION_GATE_OPEN", "gate");
  }

  const db = evidence.database_readonly;
  assertKeys(
    db,
    [
      "project_ref",
      "observed_at_utc",
      "history_count",
      "weekly_version",
      "weekly_version_count",
      "month_end_version",
      "month_end_version_count",
      "target_relation_count",
      "target_policy_count",
      "weekly_persist_absent",
      "month_end_persist_absent",
      "partial_accounting_automation_state",
      "prerequisite_shape",
      "linked_firms_count",
      "authorizing_inventory",
      "webhook_non_terminal_count",
      "webhook_non_terminal_statuses",
    ],
    "PRE_APPLY_LIVE_SCHEMA",
  );
  assertExact(db.project_ref, PROJECT_REF, "PRE_APPLY_LIVE_PROJECT_MISMATCH", "project");
  assertExact(parseUtc(db.observed_at_utc, "PRE_APPLY_LIVE_TIMESTAMP"), started, "PRE_APPLY_LIVE_WINDOW", "db observed");
  assertExact(db.history_count, HISTORY_COUNT, "PRE_APPLY_LIVE_HISTORY_DRIFT", "history");
  assertExact(db.weekly_version, MIGRATIONS[0].version, "PRE_APPLY_LIVE_MIGRATION_MISMATCH", "weekly");
  assertExact(db.month_end_version, MIGRATIONS[1].version, "PRE_APPLY_LIVE_MIGRATION_MISMATCH", "month-end");
  if (db.weekly_version_count !== 0 || db.month_end_version_count !== 0) {
    throw blocked("PRE_APPLY_LIVE_OBJECT_DRIFT", "version present");
  }
  if (db.target_relation_count !== 0 || db.target_policy_count !== 0) {
    throw blocked("PRE_APPLY_LIVE_OBJECT_DRIFT", "target object");
  }
  if (db.weekly_persist_absent !== true || db.month_end_persist_absent !== true) {
    throw blocked("PRE_APPLY_LIVE_OBJECT_DRIFT", "persist function");
  }
  if (db.partial_accounting_automation_state !== false) {
    throw blocked("PRE_APPLY_LIVE_PARTIAL_STATE", "partial");
  }
  assertKeys(db.prerequisite_shape, PREREQUISITES, "PRE_APPLY_LIVE_SCHEMA");
  for (const key of PREREQUISITES) {
    if (db.prerequisite_shape[key] !== true) {
      throw blocked("PRE_APPLY_LIVE_PREREQUISITE_DRIFT", key);
    }
  }
  assertExact(db.linked_firms_count, 0, "PRE_APPLY_LIVE_LINKED_FIRMS", "linked firms");
  const inventory = db.authorizing_inventory;
  assertKeys(
    inventory,
    ["predicate", "total", "company_owned", "firm_owned", "dual_owner"],
    "PRE_APPLY_LIVE_SCHEMA",
  );
  assertExact(inventory.predicate, "review_assist_pro_active_and_complimentary", "PRE_APPLY_LIVE_INVENTORY_DRIFT", "predicate");
  if (inventory.company_owned + inventory.firm_owned + inventory.dual_owner !== inventory.total) {
    throw blocked("PRE_APPLY_LIVE_CONTRADICTION", "inventory sum");
  }
  assertExact(inventory.total, 4, "PRE_APPLY_LIVE_INVENTORY_DRIFT", "total");
  assertExact(inventory.company_owned, 3, "PRE_APPLY_LIVE_INVENTORY_DRIFT", "company");
  assertExact(inventory.firm_owned, 1, "PRE_APPLY_LIVE_INVENTORY_DRIFT", "firm");
  assertExact(inventory.dual_owner, 0, "PRE_APPLY_LIVE_INVENTORY_DRIFT", "dual");
  if (!Array.isArray(db.webhook_non_terminal_statuses) || db.webhook_non_terminal_statuses.join(",") !== WEBHOOK_STATUSES.join(",")) {
    throw blocked("PRE_APPLY_LIVE_WEBHOOK_NOT_QUIESCENT", "statuses");
  }
  if (db.webhook_non_terminal_count !== 0) {
    throw blocked("PRE_APPLY_LIVE_WEBHOOK_NOT_QUIESCENT", "count");
  }

  const safety = evidence.safety;
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
    "PRE_APPLY_LIVE_SCHEMA",
  );
  if (safety.read_only !== true || safety.select_only !== true) {
    throw blocked("PRE_APPLY_LIVE_CONTRADICTION", "read only");
  }
  for (const key of [
    "production_writes",
    "sql_application_attempts",
    "dry_run_attempts",
    "migration_apply_attempts",
    "provider_writes",
  ]) {
    if (safety[key] !== 0) throw blocked("PRE_APPLY_LIVE_WRITE_COUNTER", key);
  }
  if (
    safety.automation_enabled !== false ||
    safety.merge_or_deploy_performed !== false ||
    safety.credential_prompt_opened !== false ||
    safety.marker_created !== false ||
    safety.pins_published !== false
  ) {
    throw blocked("PRE_APPLY_LIVE_CONTRADICTION", "safety flag");
  }
  if (!Array.isArray(evidence.visibility_limitations) || evidence.visibility_limitations.length < 1) {
    throw blocked("PRE_APPLY_LIVE_SCHEMA", "limitations");
  }
  const limitationText = evidence.visibility_limitations.join("\n");
  if (!/pins remain null/i.test(limitationText)) {
    throw blocked("PRE_APPLY_LIVE_SCHEMA", "limitations");
  }
  for (const line of evidence.visibility_limitations) {
    if (typeof line !== "string" || !line.trim()) throw blocked("PRE_APPLY_LIVE_SCHEMA", "limitation");
  }
  assertSanitized(JSON.stringify(evidence));
  return { protocol: PROTOCOL, apply_authorized: false };
}

function verifyContractSeal(auth, cwd) {
  const seal = auth && auth.pre_apply_live_contract;
  if (!seal || seal.path !== CONTRACT_PATH) {
    throw blocked("PRE_APPLY_LIVE_CONTRACT_UNSEALED", "contract seal missing");
  }
  if (String(auth.ceremony_source_commit || "").toLowerCase() !== String(seal.source_commit || "").toLowerCase()) {
    throw blocked("PRE_APPLY_LIVE_CONTRACT_MISMATCH", "source");
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
  assertExact(contract.protocol, PROTOCOL, "PRE_APPLY_LIVE_CONTRACT_MISMATCH", "protocol");
  assertExact(contract.publication_status, "UNPUBLISHED", "PRE_APPLY_LIVE_CONTRACT_MISMATCH", "status");
  assertExact(contract.bindings.collection_pr_head, COLLECTION_PR_HEAD, "PRE_APPLY_LIVE_CONTRACT_MISMATCH", "head");
  assertExact(contract.bindings.prior_dry_run_evidence_sha256, PRIOR_SHA256, "PRE_APPLY_LIVE_CONTRACT_MISMATCH", "prior");
  assertExact(contract.bindings.production_commit, PRODUCTION_COMMIT, "PRE_APPLY_LIVE_CONTRACT_MISMATCH", "production");
  return loaded;
}

function assertPreApplyLiveEvidencePublished(inputs = {}) {
  assertNoOverride(inputs);
  const auth = inputs.auth;
  if (!auth || typeof auth !== "object") throw blocked("PRE_APPLY_LIVE_SCHEMA", "auth");
  verifyContractSeal(auth, inputs.cwd);
  if (pinsUnpublished(auth)) {
    throw blocked(
      "AUTHORIZATION_PINS_UNPUBLISHED",
      "pre-apply pins are null/UNPUBLISHED; apply remains unreachable",
    );
  }
  const pub = auth.publication;
  const pre = auth.pre_apply_live_publication;
  if (
    pub.required_pre_apply_live_evidence_sha256 !== pre.evidence_sha256 ||
    pub.required_pre_apply_live_evidence_oid !== pre.evidence_blob_oid ||
    pub.required_pre_apply_live_evidence_bytes !== pre.evidence_bytes
  ) {
    throw blocked("PRE_APPLY_LIVE_PIN_CONTRADICTION", "authorization pins disagree");
  }
  assertAuthBindings(auth);
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
    const wrapped = blocked(err.code || "GIT_BLOB_LOAD_FAILED", err.message);
    throw wrapped;
  }
  assertTrailingLf(loaded.buffer);
  const evidence = JSON.parse(loaded.buffer.toString("utf8"));
  validatePreApplyLiveEvidence(evidence, { now: inputs.now });
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
  COLLECTION_PR_HEAD,
  PRIOR_SHA256,
  PRODUCTION_COMMIT,
  HISTORY_COUNT,
  assertPreApplyEvidenceBytes: assertTrailingLf,
  validatePreApplyLiveEvidence,
  assertPreApplyLiveEvidencePublished,
  verifyContractSeal,
};
