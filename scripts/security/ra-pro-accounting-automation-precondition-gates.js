"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { loadAndVerifyGitBlob } = require("./git-blob-authority");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1";
const EXPECTED_HEAD = "25e12cc5412275e9a922d7add344c5074a7c1e7a";
const EXPECTED_PRODUCTION_COMMIT = "854fd2920cd1c77a411918a617d10a8fb3ce591d";
const EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "precondition_evidence";
  return error;
}

function assertExact(value, expected, code, label) {
  if (value !== expected) throw blocked(code, `${label} mismatch`);
}

function assertNoOverride(inputs = {}) {
  const env = inputs.env || process.env;
  if (inputs.preconditionEvidencePath) {
    throw blocked("PRECONDITION_EVIDENCE_PATH_OVERRIDE_FORBIDDEN", "path override supplied");
  }
  for (const key of [
    "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_PATH",
    "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_SHA256",
  ]) {
    if (Object.prototype.hasOwnProperty.call(env, key)) {
      throw blocked("PRECONDITION_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
}

function validateEvidence(evidence, now = new Date()) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw blocked("PRECONDITION_EVIDENCE_SCHEMA_INVALID", "root must be an object");
  }
  assertExact(evidence.protocol, PROTOCOL, "PRECONDITION_EVIDENCE_PROTOCOL_MISMATCH", "protocol");
  assertExact(evidence.schema_version, 1, "PRECONDITION_EVIDENCE_SCHEMA_INVALID", "schema_version");

  const validFrom = Date.parse(evidence.valid_from_utc);
  const validUntil = Date.parse(evidence.valid_until_utc);
  const collectedAt = Date.parse(evidence.collected_at_utc);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  if (![validFrom, validUntil, collectedAt, nowMs].every(Number.isFinite)) {
    throw blocked("PRECONDITION_EVIDENCE_TIME_INVALID", "timestamps must be valid UTC instants");
  }
  if (validFrom > nowMs) {
    throw blocked("PRECONDITION_EVIDENCE_START_NOT_UNEXPIRED", "valid_from is in the future");
  }
  if (nowMs >= validUntil) {
    throw blocked("PRECONDITION_EVIDENCE_EXPIRED", "valid_until is not after gate time");
  }
  if (collectedAt < validFrom || collectedAt >= validUntil) {
    throw blocked("PRECONDITION_EVIDENCE_TIME_INVALID", "collection is outside validity window");
  }

  assertExact(evidence.authorization?.pr_number, 324, "PRECONDITION_EVIDENCE_BINDING_MISMATCH", "PR");
  assertExact(evidence.authorization?.pr_head, EXPECTED_HEAD, "PRECONDITION_EVIDENCE_BINDING_MISMATCH", "PR head");
  assertExact(evidence.authorization?.scope, "read_only_production_precondition_collection", "PRECONDITION_EVIDENCE_BINDING_MISMATCH", "scope");
  assertExact(evidence.deployment?.production_state, "READY", "PRECONDITION_EVIDENCE_DEPLOYMENT_MISMATCH", "production state");
  assertExact(evidence.deployment?.production_commit, EXPECTED_PRODUCTION_COMMIT, "PRECONDITION_EVIDENCE_DEPLOYMENT_MISMATCH", "production commit");
  assertExact(evidence.deployment?.preview_state, "READY", "PRECONDITION_EVIDENCE_DEPLOYMENT_MISMATCH", "preview state");
  assertExact(evidence.deployment?.preview_commit, EXPECTED_HEAD, "PRECONDITION_EVIDENCE_DEPLOYMENT_MISMATCH", "preview commit");
  assertExact(evidence.automation_gate?.key, "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION", "PRECONDITION_EVIDENCE_GATE_MISMATCH", "gate key");
  assertExact(evidence.automation_gate?.production_presence, "absent", "PRECONDITION_EVIDENCE_GATE_MISMATCH", "gate presence");
  assertExact(evidence.automation_gate?.effective_state, "closed", "PRECONDITION_EVIDENCE_GATE_MISMATCH", "gate state");

  const db = evidence.database || {};
  assertExact(db.project_ref, EXPECTED_PROJECT_REF, "PRECONDITION_EVIDENCE_DATABASE_MISMATCH", "project_ref");
  assertExact(db.migration_history_count, 188, "PRECONDITION_EVIDENCE_DATABASE_MISMATCH", "history");
  for (const [key, expected] of Object.entries({
    weekly_version_count: 0,
    month_end_version_count: 0,
    linked_firms_count: 0,
    webhook_non_terminal_count: 0,
  })) assertExact(db[key], expected, "PRECONDITION_EVIDENCE_DATABASE_MISMATCH", key);
  for (const key of [
    "weekly_runs_absent",
    "weekly_findings_absent",
    "weekly_persist_rpc_absent",
    "month_end_packages_absent",
    "month_end_persist_rpc_absent",
  ]) assertExact(db[key], true, "PRECONDITION_EVIDENCE_DATABASE_MISMATCH", key);
  assertExact(db.authorizing_inventory?.predicate, "review_assist_pro_active_and_complimentary", "PRECONDITION_EVIDENCE_INVENTORY_MISMATCH", "inventory predicate");
  for (const [key, expected] of Object.entries({ total: 4, company_owned: 3, firm_owned: 1, dual_owner: 0 })) {
    assertExact(db.authorizing_inventory?.[key], expected, "PRECONDITION_EVIDENCE_INVENTORY_MISMATCH", key);
  }

  const safety = evidence.safety || {};
  assertExact(safety.read_only, true, "PRECONDITION_EVIDENCE_SAFETY_MISMATCH", "read_only");
  for (const key of ["production_writes", "sql_application_attempts", "dry_run_attempts", "migration_apply_attempts", "provider_writes"]) {
    assertExact(safety[key], 0, "PRECONDITION_EVIDENCE_SAFETY_MISMATCH", key);
  }
  assertExact(safety.automation_enabled, false, "PRECONDITION_EVIDENCE_SAFETY_MISMATCH", "automation_enabled");
  assertExact(safety.merge_or_deploy_performed, false, "PRECONDITION_EVIDENCE_SAFETY_MISMATCH", "merge_or_deploy_performed");
  return evidence;
}

function assertPreconditionEvidencePublished({ auth, cwd, now, env, preconditionEvidencePath } = {}) {
  assertNoOverride({ env, preconditionEvidencePath });
  const publication = auth?.precondition_publication;
  if (!publication || publication.status !== "PUBLISHED") {
    throw blocked("PRECONDITION_PINS_UNPUBLISHED", "precondition publication is not PUBLISHED");
  }
  for (const [key, pattern] of Object.entries({
    evidence_source_commit: /^[0-9a-f]{40}$/,
    evidence_blob_oid: /^[0-9a-f]{40}$/,
    evidence_sha256: /^[0-9a-f]{64}$/,
  })) {
    if (!pattern.test(String(publication[key] || ""))) {
      throw blocked("PRECONDITION_PINS_INVALID", `${key} is not published`);
    }
  }
  if (!Number.isInteger(publication.evidence_bytes) || publication.evidence_bytes <= 0) {
    throw blocked("PRECONDITION_PINS_INVALID", "evidence_bytes is invalid");
  }
  const loaded = loadAndVerifyGitBlob({
    commit: publication.evidence_source_commit,
    path: publication.evidence_path,
    expectedOid: publication.evidence_blob_oid,
    expectedSha256: publication.evidence_sha256,
    expectedBytes: publication.evidence_bytes,
    cwd,
  });
  if (loaded.buffer[loaded.buffer.length - 1] !== 0x0a) {
    throw blocked("PRECONDITION_EVIDENCE_NEWLINE_INVALID", "single trailing LF required");
  }
  if (loaded.buffer.length > 1 && loaded.buffer[loaded.buffer.length - 2] === 0x0a) {
    throw blocked("PRECONDITION_EVIDENCE_NEWLINE_INVALID", "multiple trailing newlines forbidden");
  }
  let evidence;
  try {
    evidence = JSON.parse(loaded.buffer.toString("utf8"));
  } catch {
    throw blocked("PRECONDITION_EVIDENCE_JSON_INVALID", "JSON parse failed");
  }
  validateEvidence(evidence, now || new Date());
  return { protocol: PROTOCOL, oid: loaded.oid, sha256: loaded.sha256, bytes: loaded.bytes };
}

module.exports = { PROTOCOL, assertPreconditionEvidencePublished, validateEvidence };
