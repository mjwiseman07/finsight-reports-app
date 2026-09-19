"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { loadAndVerifyGitBlob } = require("./git-blob-authority");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1";
const EVIDENCE_PATH =
  "docs/security/ra-pro-accounting-automation-apply/RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1.json";
const SOURCE_COMMIT = "195c76060f0fc8aa7b81dc4718d7357c3be8eba6";
const EVIDENCE_OID = "76a75e41c80e1692670ede5d70cec963a1986f92";
const EVIDENCE_SHA256 = "f89c3e701703d199f56577a65ae6f28b5ba120be45ee482f2ab75c284d763d18";
const EVIDENCE_BYTES = 5100;
const REVIEWED_TIP = "99e6ed195c95b5cdcd27a6690f2441df4e7ae6a9";
const VERDICT = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
const MARKER = "attempt-99e6ed195c95-aaa974cab7984e13a66e4e1237e211b9.marker";
const PRECONDITION_SHA256 = "d2e47fb6c77501fa6a8b7e29ea728550c23f0daef1713ded7de96c080bcf8288";
const PRECONDITION_OID = "f05bfa25def88f28037defbbdd3375bd84068604";
const BUNDLE_OID = "2e42488b4888f8fe1a1cd25fdbcaa5d72594d84e";
const BUNDLE_SHA256 = "6061df5e2689d8658169485beb0f66f3b73591de0161b4f47f65beb9eb8d4614";
const BUNDLE_BYTES = 277613;
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
const PROBE_CHECKS = [
  "history_count",
  "versions_absent",
  "weekly_runs_absent",
  "weekly_findings_absent",
  "month_end_packages_absent",
  "weekly_persist_absent",
  "month_end_persist_absent",
  "target_indexes_absent",
  "target_policies_absent",
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

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "prior_dry_run_evidence";
  return error;
}

function assertExact(value, expected, code, label) {
  if (value !== expected) throw blocked(code, `${label} mismatch`);
}

function assertNoOverride(inputs = {}) {
  const env = inputs.env || process.env;
  if (inputs.priorDryRunEvidencePath) {
    throw blocked("PRIOR_DRY_RUN_EVIDENCE_PATH_OVERRIDE_FORBIDDEN", "path override supplied");
  }
  for (const key of [
    "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_PATH",
    "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_SHA256",
  ]) {
    if (Object.prototype.hasOwnProperty.call(env, key)) {
      throw blocked("PRIOR_DRY_RUN_EVIDENCE_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
}

function validateEvidence(evidence) {
  if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
    throw blocked("PRIOR_DRY_RUN_EVIDENCE_SCHEMA_INVALID", "root must be an object");
  }
  assertExact(evidence.verdict, VERDICT, "PRIOR_DRY_RUN_VERDICT_INVALID", "outer verdict");
  assertExact(evidence.result_code, VERDICT, "PRIOR_DRY_RUN_VERDICT_INVALID", "outer result_code");
  assertExact(evidence.pr_tip, REVIEWED_TIP, "PRIOR_DRY_RUN_TIP_INVALID", "pr_tip");
  assertExact(evidence.mode, "dry-run", "PRIOR_DRY_RUN_MODE_INVALID", "mode");
  assertExact(evidence.attempt_marker, MARKER, "PRIOR_DRY_RUN_MARKER_INVALID", "attempt_marker");
  assertExact(evidence.precondition_sha256, PRECONDITION_SHA256, "PRIOR_DRY_RUN_PRECONDITION_INVALID", "precondition_sha256");
  assertExact(evidence.bundle_oid, BUNDLE_OID, "PRIOR_DRY_RUN_BUNDLE_INVALID", "bundle_oid");
  assertExact(evidence.bundle_sha256, BUNDLE_SHA256, "PRIOR_DRY_RUN_BUNDLE_INVALID", "bundle_sha256");
  assertExact(evidence.bundle_bytes, BUNDLE_BYTES, "PRIOR_DRY_RUN_BUNDLE_INVALID", "bundle_bytes");
  assertExact(evidence.database_connection_attempts, 1, "PRIOR_DRY_RUN_COUNTER_INVALID", "database_connection_attempts");
  assertExact(evidence.sql_application_attempts, 0, "PRIOR_DRY_RUN_COUNTER_INVALID", "sql_application_attempts");
  assertExact(evidence.feature_flag_untouched, true, "PRIOR_DRY_RUN_FLAG_INVALID", "feature_flag_untouched");
  assertExact(evidence.productionContact, false, "PRIOR_DRY_RUN_CONTACT_INVALID", "outer productionContact");
  assertExact(evidence.prior_dry_run_pins, "UNPUBLISHED", "PRIOR_DRY_RUN_SELF_PIN_INVALID", "prior_dry_run_pins");
  assertExact(evidence.pre_apply_pins, "UNPUBLISHED", "PRIOR_DRY_RUN_SELF_PIN_INVALID", "pre_apply_pins");
  if (!evidence.uri_diagnostics || evidence.uri_diagnostics.host_class !== "session_pooler") {
    throw blocked("PRIOR_DRY_RUN_BINDING_INVALID", "session pooler binding required");
  }
  if (evidence.uri_diagnostics.username_class !== "project_bound" || evidence.uri_diagnostics.matches_expected_project_ref !== true) {
    throw blocked("PRIOR_DRY_RUN_BINDING_INVALID", "project-bound username required");
  }
  const child = evidence.child_evidence;
  if (!child || typeof child !== "object") {
    throw blocked("PRIOR_DRY_RUN_CHILD_INVALID", "child evidence missing");
  }
  assertExact(child.verdict, VERDICT, "PRIOR_DRY_RUN_VERDICT_INVALID", "child verdict");
  assertExact(child.result_code, VERDICT, "PRIOR_DRY_RUN_VERDICT_INVALID", "child result_code");
  assertExact(child.databaseConnectionAttempts, 1, "PRIOR_DRY_RUN_COUNTER_INVALID", "child connections");
  assertExact(child.sqlApplicationAttempts, 0, "PRIOR_DRY_RUN_COUNTER_INVALID", "child sql");
  assertExact(child.migration_sql_attempts, 0, "PRIOR_DRY_RUN_COUNTER_INVALID", "child migration sql");
  assertExact(child.read_only, true, "PRIOR_DRY_RUN_MUTATION_INVALID", "read_only");
  assertExact(child.transaction_mutation, false, "PRIOR_DRY_RUN_MUTATION_INVALID", "transaction_mutation");
  assertExact(child.advisory_lock_acquired, true, "PRIOR_DRY_RUN_LOCK_INVALID", "advisory_lock_acquired");
  assertExact(child.feature_flag_touched, false, "PRIOR_DRY_RUN_FLAG_INVALID", "feature_flag_touched");
  assertExact(child.productionContact, true, "PRIOR_DRY_RUN_CONTACT_INVALID", "child productionContact");
  assertExact(child.prior_history_count, 188, "PRIOR_DRY_RUN_HISTORY_INVALID", "prior_history_count");
  if (!child.bundle_authority || child.bundle_authority.oid !== BUNDLE_OID || child.bundle_authority.sha256 !== BUNDLE_SHA256 || child.bundle_authority.bytes !== BUNDLE_BYTES || child.bundle_authority.commit !== REVIEWED_TIP) {
    throw blocked("PRIOR_DRY_RUN_BUNDLE_INVALID", "child bundle authority mismatch");
  }
  if (!child.precondition_evidence || child.precondition_evidence.sha256 !== PRECONDITION_SHA256 || child.precondition_evidence.oid !== PRECONDITION_OID || child.precondition_evidence.bytes !== 2324) {
    throw blocked("PRIOR_DRY_RUN_PRECONDITION_INVALID", "child precondition mismatch");
  }
  if (!Array.isArray(child.versions_absent) || child.versions_absent.join(",") !== "20260917044537,20260917180140") {
    throw blocked("PRIOR_DRY_RUN_VERSIONS_INVALID", "versions_absent mismatch");
  }
  const probes = child.schema_probes;
  if (!probes || probes.history_count !== 188 || probes.schema_drift_detected !== false || probes.target_versions_absent !== true || probes.target_tables_absent !== true || probes.target_functions_absent !== true || probes.prerequisites_present !== true) {
    throw blocked("PRIOR_DRY_RUN_PROBES_INVALID", "schema probe summary mismatch");
  }
  if (!Array.isArray(probes.failed_checks) || probes.failed_checks.length !== 0) {
    throw blocked("PRIOR_DRY_RUN_PROBES_INVALID", "failed_checks must be empty");
  }
  for (const name of PROBE_CHECKS) {
    if (!probes.checks || probes.checks[name] !== true) {
      throw blocked("PRIOR_DRY_RUN_PROBES_INVALID", `${name} is not true`);
    }
  }
  const sources = Array.isArray(child.source_authority) ? child.source_authority : [];
  if (sources.length !== MIGRATIONS.length) {
    throw blocked("PRIOR_DRY_RUN_MIGRATION_INVALID", "source authority length");
  }
  for (let i = 0; i < MIGRATIONS.length; i += 1) {
    const expected = MIGRATIONS[i];
    const actual = sources[i];
    if (!actual || actual.version !== expected.version || actual.oid !== expected.oid || actual.sha256 !== expected.sha256 || actual.bytes !== expected.bytes) {
      throw blocked("PRIOR_DRY_RUN_MIGRATION_INVALID", expected.version);
    }
  }
  return evidence;
}

function assertPriorDryRunEvidencePublished({ auth, cwd, env, priorDryRunEvidencePath } = {}) {
  assertNoOverride({ env, priorDryRunEvidencePath });
  const publication = auth?.prior_dry_run_publication;
  const pins = auth?.publication || {};
  if (!publication || publication.status !== "PUBLISHED") {
    throw blocked("PRIOR_DRY_RUN_PINS_UNPUBLISHED", "prior dry-run publication is not PUBLISHED");
  }
  assertExact(publication.evidence_path, EVIDENCE_PATH, "PRIOR_DRY_RUN_PINS_INVALID", "evidence_path");
  assertExact(publication.evidence_source_commit, SOURCE_COMMIT, "PRIOR_DRY_RUN_PINS_INVALID", "evidence_source_commit");
  assertExact(publication.evidence_blob_oid, EVIDENCE_OID, "PRIOR_DRY_RUN_PINS_INVALID", "evidence_blob_oid");
  assertExact(publication.evidence_sha256, EVIDENCE_SHA256, "PRIOR_DRY_RUN_PINS_INVALID", "evidence_sha256");
  assertExact(publication.evidence_bytes, EVIDENCE_BYTES, "PRIOR_DRY_RUN_PINS_INVALID", "evidence_bytes");
  assertExact(publication.reviewed_tip, REVIEWED_TIP, "PRIOR_DRY_RUN_PINS_INVALID", "reviewed_tip");
  assertExact(publication.attempt_marker, MARKER, "PRIOR_DRY_RUN_PINS_INVALID", "attempt_marker");
  assertExact(pins.required_prior_dry_run_evidence_sha256, EVIDENCE_SHA256, "PRIOR_DRY_RUN_PINS_INVALID", "required sha");
  assertExact(pins.required_prior_dry_run_evidence_oid, EVIDENCE_OID, "PRIOR_DRY_RUN_PINS_INVALID", "required oid");
  assertExact(pins.required_prior_dry_run_evidence_bytes, EVIDENCE_BYTES, "PRIOR_DRY_RUN_PINS_INVALID", "required bytes");
  const loaded = loadAndVerifyGitBlob({
    commit: publication.evidence_source_commit,
    path: publication.evidence_path,
    expectedOid: publication.evidence_blob_oid,
    expectedSha256: publication.evidence_sha256,
    expectedBytes: publication.evidence_bytes,
    cwd,
  });
  if (loaded.buffer[loaded.buffer.length - 1] !== 0x0a || (loaded.buffer.length > 1 && loaded.buffer[loaded.buffer.length - 2] === 0x0a)) {
    throw blocked("PRIOR_DRY_RUN_EVIDENCE_NEWLINE_INVALID", "single trailing LF required");
  }
  let evidence;
  try {
    evidence = JSON.parse(loaded.buffer.toString("utf8"));
  } catch {
    throw blocked("PRIOR_DRY_RUN_EVIDENCE_JSON_INVALID", "JSON parse failed");
  }
  validateEvidence(evidence);
  return {
    protocol: PROTOCOL,
    oid: loaded.oid,
    sha256: loaded.sha256,
    bytes: loaded.bytes,
    apply_authorized: false,
  };
}

module.exports = {
  PROTOCOL,
  EVIDENCE_SHA256,
  EVIDENCE_OID,
  EVIDENCE_BYTES,
  assertPriorDryRunEvidencePublished,
  validateEvidence,
};
