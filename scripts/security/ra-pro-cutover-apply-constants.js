/**
 * Fixed constants for RA Pro billing-company cutover single-version applicator.
 * Dedicated package — does not retarget FRLS or credential-containment Stage-1.
 */
"use strict";

/** Named advisory lock unique to this migration (pg_advisory_xact_lock). */
const ADVISORY_LOCK = Object.freeze({
  name: "RA_PRO_BILLING_COMPANY_CUTOVER_APPLY",
  /** ASCII 'RAPR' */
  key1: 0x52415052,
  /** Version-date fragment 20260915 */
  key2: 0x20260915,
});

const EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";

/**
 * Reviewed tip where the migration blob is already sealed.
 * authorized_pr_head / AUTHORIZED_TOOLING_FREEZE filled at a later freeze step.
 */
const ARTIFACT_COMMIT = "b4f06a1ca889bdfb477397b990860b21e788a877";

const MIGRATION_PATH =
  "supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql";

const MIGRATION_BLOB_OID = "d36f5e2c50f7bab956c3191723c0e8a223279df5";
/** LF git blob at ARTIFACT_COMMIT (git cat-file authority). */
const MIGRATION_SHA256 =
  "c756651f267aaa2ebe5f1331e96d62bfa882507917b4201397f77e25a45f5ff9";
const MIGRATION_BYTES = 40289;

const MIGRATION_VERSION = "20260915004500";
const MIGRATION_NAME = "ra_pro_firm_billing_company_id";

const PRIOR_HISTORY_COUNT = 187;

/** Operator decision blob seals (companion authority alongside migration). */
const DECISION_PATH = "docs/security/ra-pro-cutover-operator-decision.json";
const DECISION_BLOB_OID = "0dd39de5ffbfd2b35d3d73887dd0fa915a061c93";
const DECISION_SHA256 =
  "f00039cb536b0ffef09ea41c0613ce83d7f52067b2bffc4ff27980f8e9bd46e1";
const DECISION_BYTES = 1122;

/** Mapping artifact SHA bound by the sealed operator decision. */
const MAPPING_SHA256 =
  "93f6fe31360222ccd282e814a3764ccf07929e7cb91c25c70e10b750ec0ec953";

const EXPECTED_DECISION_ACTIONS = Object.freeze({
  NO_CUTOVER: 4,
  LINK_EXISTING_FIRM: 0,
  CREATE_NEW_FIRM: 0,
});
const EXPECTED_LINKED_FIRMS_AFTER_MIGRATION = 0;

/**
 * Session-only DB URL channel. Never argv. Never generic DATABASE_URL.
 * Never CONTAINMENT_APPLY_DATABASE_URL or FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL.
 */
const DATABASE_URL_ENV = "RA_PRO_CUTOVER_APPLY_DATABASE_URL";

/** Retired CA-path channel for this package. */
const FORBIDDEN_SSL_ROOTCERT_ENV = "RA_PRO_CUTOVER_APPLY_SSL_ROOTCERT";

/** Forbidden sibling channels from prior packages. */
const FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV = "CONTAINMENT_APPLY_DATABASE_URL";
const FORBIDDEN_FRLS_DATABASE_URL_ENV = "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL";

const APPLY_AUTHORIZATION_TOKEN =
  "I_AUTHORIZE_RA_PRO_BILLING_COMPANY_CUTOVER_APPLY_20260915004500";

const ATTESTED_FREEZE_ENV = "RA_PRO_CUTOVER_ATTESTED_FREEZE";
const GIT_CWD_ENV = "RA_PRO_CUTOVER_GIT_CWD";

/** Filled by bundle builder before seal. */
const EXPECTED_AUTH_SEALS_DIGEST =
  "c3bc387a0d4698b2a7e5c07fd5c18672a8dd4699efcd9f54f47c882173d2eabc";

const EXPECTED_STANDALONE_BUNDLE_SHA256 =
  "PENDING_BUNDLE_BUILD_SHA256_PLACEHOLDER_00000000000000000000000000000000";

/** Exact executable tooling freeze (40-hex). Set after freeze commit. */
const AUTHORIZED_TOOLING_FREEZE =
  "PLACEHOLDER_40HEX_0000000000000000000000000000000000000000";

const STANDALONE_BUNDLE_PATH =
  "scripts/security/bundles/ra-pro-cutover-applicator.standalone.cjs";

const EVIDENCE_PROTOCOL_ID = "RA_PRO_CUTOVER_EVIDENCE_V1";

const CONTRACT_PATH = "docs/security/ra-pro-cutover-apply/PRE_CHANGE_CONTRACT.json";
const FIXTURE_PATH = "docs/security/ra-pro-cutover-apply/LOCAL_FIXTURE_SCHEMA.sql";
const TOOLING_AUTHORIZATION_PATH =
  "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json";
const DECISION_DOC_PATH = DECISION_PATH;

/** Gate-aware merge base reference (documentation / contract pin). */
const GATE_AWARE_MERGE_BASE_REF = "19e8bd071bae5f8afed85340f50168d4ca8e5586";

/** Source modules sealed alongside the standalone bundle (review/SBOM). */
const SELF_AUTHORITY_MODULES = Object.freeze([
  "scripts/security/apply-ra-pro-cutover.js",
  "scripts/security/ra-pro-cutover-apply-core.js",
  "scripts/security/ra-pro-cutover-apply-constants.js",
  "scripts/security/git-blob-authority.js",
  "scripts/security/ra-pro-cutover-evidence.js",
  "scripts/security/ra-pro-cutover-tls-ca.js",
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
  DECISION_PATH,
  DECISION_BLOB_OID,
  DECISION_SHA256,
  DECISION_BYTES,
  MAPPING_SHA256,
  EXPECTED_DECISION_ACTIONS,
  EXPECTED_LINKED_FIRMS_AFTER_MIGRATION,
  DATABASE_URL_ENV,
  FORBIDDEN_SSL_ROOTCERT_ENV,
  FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV,
  FORBIDDEN_FRLS_DATABASE_URL_ENV,
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
  DECISION_DOC_PATH,
  GATE_AWARE_MERGE_BASE_REF,
  SELF_AUTHORITY_MODULES,
};
