/**
 * Fixed constants for Free Review lead-session single-version applicator.
 * Dedicated package — does not retarget credential-containment Stage-1.
 */
"use strict";

/** Named advisory lock unique to this migration (pg_advisory_xact_lock). */
const ADVISORY_LOCK = Object.freeze({
  name: "FREE_REVIEW_LEAD_SESSIONS_APPLY",
  /** ASCII 'FRLS' */
  key1: 0x46524c53,
  /** Version-date fragment 20260913 */
  key2: 0x20260913,
});

const EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";

/** Filled at freeze; tip-seal updates authorized_pr_head separately. */
const ARTIFACT_COMMIT = "b2c431fa4310f58c9ee667e858333e084c2fed52";

const MIGRATION_PATH =
  "supabase/migrations/20260913235500_free_review_lead_sessions.sql";

const MIGRATION_BLOB_OID = "7dca9674673eb51ab5094d3ec09508d0711f16cd";
/** LF git blob at ARTIFACT_COMMIT (git cat-file authority; OID 7dca9674…). */
const MIGRATION_SHA256 =
  "b7e1e68b82a5975e85e1b9d6f0c491fa632474801ce00b311cea366f3b9b0ddb";
const MIGRATION_BYTES = 8108;

const MIGRATION_VERSION = "20260913235500";
const MIGRATION_NAME = "free_review_lead_sessions";

const PRIOR_HISTORY_COUNT = 186;

/**
 * Session-only DB URL channel. Never argv. Never generic DATABASE_URL.
 * Never CONTAINMENT_APPLY_DATABASE_URL.
 */
const DATABASE_URL_ENV = "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL";

/** Retired CA-path channel for this package. */
const FORBIDDEN_SSL_ROOTCERT_ENV = "FREE_REVIEW_LEAD_SESSION_APPLY_SSL_ROOTCERT";

/** Forbidden sibling channel from prior package. */
const FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV = "CONTAINMENT_APPLY_DATABASE_URL";

const APPLY_AUTHORIZATION_TOKEN =
  "I_AUTHORIZE_FREE_REVIEW_LEAD_SESSIONS_APPLY_20260913235500";

const ATTESTED_FREEZE_ENV = "FRLS_ATTESTED_FREEZE";
const GIT_CWD_ENV = "FRLS_GIT_CWD";

/** Filled by bundle builder before seal. */
const EXPECTED_AUTH_SEALS_DIGEST =
  "f91ef6bb252de388b1cd179b189a6e4657c3338cf955f5effad243da4dafe40e";

const EXPECTED_STANDALONE_BUNDLE_SHA256 =
  "PENDING_BUNDLE_BUILD_SHA256_PLACEHOLDER_00000000000000000000000000000000";

/** Exact executable tooling freeze (40-hex). Set after freeze commit. */
const AUTHORIZED_TOOLING_FREEZE = "fdd365018a091d9f828df11af1c0afb66a7dcba5";

const STANDALONE_BUNDLE_PATH =
  "scripts/security/bundles/free-review-lead-session-applicator.standalone.cjs";

const EVIDENCE_PROTOCOL_ID = "FRLS_LEAD_SESSION_EVIDENCE_V1";

const CONTRACT_PATH =
  "docs/security/free-review-lead-session-apply/PRE_CHANGE_CONTRACT.json";
const FIXTURE_PATH =
  "docs/security/free-review-lead-session-apply/LOCAL_FIXTURE_SCHEMA.sql";
const TOOLING_AUTHORIZATION_PATH =
  "docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json";

/** Source modules sealed alongside the standalone bundle (review/SBOM). */
const SELF_AUTHORITY_MODULES = Object.freeze([
  "scripts/security/apply-free-review-lead-session.js",
  "scripts/security/free-review-lead-session-apply-core.js",
  "scripts/security/free-review-lead-session-apply-constants.js",
  "scripts/security/git-blob-authority.js",
  "scripts/security/free-review-lead-session-evidence.js",
  "scripts/security/free-review-lead-session-tls-ca.js",
  "scripts/security/embedded-supabase-prod-ca-2021.js",
]);

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
  DATABASE_URL_ENV,
  FORBIDDEN_SSL_ROOTCERT_ENV,
  FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV,
  APPLY_AUTHORIZATION_TOKEN,
  ATTESTED_FREEZE_ENV,
  GIT_CWD_ENV,
  EXPECTED_AUTH_SEALS_DIGEST,
  EXPECTED_STANDALONE_BUNDLE_SHA256,
  AUTHORIZED_TOOLING_FREEZE,
  STANDALONE_BUNDLE_PATH,
  EVIDENCE_PROTOCOL_ID,
  CONTRACT_PATH,
  FIXTURE_PATH,
  TOOLING_AUTHORIZATION_PATH,
  SELF_AUTHORITY_MODULES,
};
