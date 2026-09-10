/**
 * Fixed constants for Stage-1 credential browser containment apply.
 * Do not change without a new emergency review.
 */
"use strict";

/** Named advisory lock for GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY (pg_advisory_xact_lock). */
const ADVISORY_LOCK = Object.freeze({
  name: "CREDENTIAL_BROWSER_CONTAINMENT_STAGE1",
  /** ASCII 'CRBC' */
  key1: 0x43524243,
  /** Version-date fragment 20260908 */
  key2: 0x20260908,
});

const EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";

const ARTIFACT_COMMIT = "dadd4345c6b4f5df718f1e31f27b161d05fe7aa9";

const MIGRATION_PATH =
  "supabase/migrations/20260908031736_connection_credential_browser_containment.sql";

const MIGRATION_BLOB_OID = "a5051f23da5bc889d0612f76a61eec1c3cd487e7";
const MIGRATION_SHA256 =
  "71500fc8c56f484e3f2d5b49ff2b3161aad474027291a4eda22f26e7fc8071e7";
const MIGRATION_BYTES = 10586;

const MIGRATION_VERSION = "20260908031736";
const MIGRATION_NAME = "connection_credential_browser_containment";

const PRIOR_HISTORY_COUNT = 185;

const ROLLBACK_PATH =
  "docs/security/connection-credential-browser-containment/ROLLBACK_SECURITY_REGRESSION_BREAK_GLASS_ONLY.sql";
const CONTRACT_PATH =
  "docs/security/connection-credential-browser-containment/PRE_CHANGE_CONTRACT.json";
const FIXTURE_PATH =
  "docs/security/connection-credential-browser-containment/LOCAL_FIXTURE_SCHEMA.sql";

/** Target #2 binding check uses non-token columns only. */
const TARGET2 = Object.freeze({
  fingerprint: "d331891f0424",
  provider_environment: "sandbox",
  status: "connected",
  provider: "quickbooks",
});

module.exports = {
  ADVISORY_LOCK,
  EXPECTED_PROJECT_REF,
  ARTIFACT_COMMIT,
  MIGRATION_PATH,
  MIGRATION_BLOB_OID,
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  MIGRATION_VERSION,
  MIGRATION_NAME,
  PRIOR_HISTORY_COUNT,
  ROLLBACK_PATH,
  CONTRACT_PATH,
  FIXTURE_PATH,
  TARGET2,
};
