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

/**
 * Session-only DB URL channel. Never argv. Never generic DATABASE_URL.
 * Value must never be printed or written into evidence.
 */
const DATABASE_URL_ENV = "CONTAINMENT_APPLY_DATABASE_URL";

/**
 * Retired CA-path channel. Presence at runtime fails closed.
 * Trust root is the freeze-sealed embedded official Supabase CA (DER-pinned).
 */
const FORBIDDEN_SSL_ROOTCERT_ENV = "CONTAINMENT_APPLY_SSL_ROOTCERT";

/** Exact apply authorization token (not a secret credential; an explicit operator intent pin). */
const APPLY_AUTHORIZATION_TOKEN = "I_AUTHORIZE_CONTAINMENT_APPLY_20260908031736";

/**
 * Env attestation set only by the verified launcher after tip-auth checks.
 * Not a credential. Must equal authorized tooling freeze (never the evidence tip).
 */
const ATTESTED_FREEZE_ENV = "CONTAINMENT_ATTESTED_FREEZE";

/** Repo path for git cat-file of sealed SQL (not an executable module path). */
const GIT_CWD_ENV = "CONTAINMENT_GIT_CWD";

/**
 * Digest of authorization seals excluding authorized_pr_head (tip-published).
 * Filled by build-containment-applicator-standalone-bundle.js before seal.
 */
const EXPECTED_AUTH_SEALS_DIGEST =
  "5db0f72335e4d4d2d7ffe5e7b5df9431ccdce26c993c6c67fae1a780298bd52e";

/**
 * SHA-256 of the committed standalone applicator bundle bytes (documentation pin).
 * Runtime authority for the bundle hash is TOOLING_AUTHORIZATION + launcher verification.
 * Not used for whole-file self-hash (embedding the digest changes the digest).
 */
const EXPECTED_STANDALONE_BUNDLE_SHA256 =
  "PENDING_BUNDLE_BUILD_SHA256_PLACEHOLDER_00000000000000000000000000000000";

/**
 * Exact executable tooling freeze (40-hex). Published after freeze commit identity
 * is known; until then PENDING_AFTER_COMMIT. Core rejects PENDING in apply/dry-run
 * when running the sealed standalone bundle path.
 */
const AUTHORIZED_TOOLING_FREEZE = "PENDING_AFTER_COMMIT";

const STANDALONE_BUNDLE_PATH =
  "scripts/security/bundles/credential-browser-containment-applicator.standalone.cjs";

const ROLLBACK_PATH =
  "docs/security/connection-credential-browser-containment/ROLLBACK_SECURITY_REGRESSION_BREAK_GLASS_ONLY.sql";
const CONTRACT_PATH =
  "docs/security/connection-credential-browser-containment/PRE_CHANGE_CONTRACT.json";
const FIXTURE_PATH =
  "docs/security/connection-credential-browser-containment/LOCAL_FIXTURE_SCHEMA.sql";
const TOOLING_AUTHORIZATION_PATH =
  "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json";

/**
 * Target #2 safety gate (non-token columns only).
 * Stable match key = literal equality of `fingerprint` against
 * external_entity_id OR tenant_or_realm_id OR metadata_json->>'fingerprint',
 * plus provider / provider_environment / status.
 * Intentionally excluded from the match (must not define the binding):
 * updated_at, token values, token presence, credentials_cleared_at,
 * superseded_by_connection_id, labels/names, and any ops-side "binding"
 * handle that is not stored in those three identity columns.
 */
const TARGET2 = Object.freeze({
  fingerprint: "d331891f0424",
  provider_environment: "sandbox",
  status: "connected",
  provider: "quickbooks",
});

/** Source modules sealed alongside the standalone bundle (review/SBOM). */
const SELF_AUTHORITY_MODULES = Object.freeze([
  "scripts/security/apply-credential-browser-containment.js",
  "scripts/security/credential-browser-containment-apply-core.js",
  "scripts/security/credential-browser-containment-constants.js",
  "scripts/security/git-blob-authority.js",
  "scripts/security/containment-evidence-protocol.js",
  "scripts/security/containment-tls-ca.js",
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
  APPLY_AUTHORIZATION_TOKEN,
  ATTESTED_FREEZE_ENV,
  GIT_CWD_ENV,
  EXPECTED_AUTH_SEALS_DIGEST,
  EXPECTED_STANDALONE_BUNDLE_SHA256,
  AUTHORIZED_TOOLING_FREEZE,
  STANDALONE_BUNDLE_PATH,
  ROLLBACK_PATH,
  CONTRACT_PATH,
  FIXTURE_PATH,
  TOOLING_AUTHORIZATION_PATH,
  TARGET2,
  SELF_AUTHORITY_MODULES,
};
