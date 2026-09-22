"use strict";

/**
 * Offline authority for the RA Pro accounting-automation CORRECTIVE applicator.
 * History contract: 190 → 191 (single least-privilege revoke migration).
 * Never re-executes the original dual migrations (VERIFY seals only).
 * Production apply authorization starts UNPUBLISHED.
 */
const ARTIFACT_COMMIT = "772911b236bb24fbb9b06b104732a7495c790a07";
const EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
const DATABASE_URL_ENV = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_DATABASE_URL";
const APPLY_AUTHORIZATION_TOKEN =
  "I_AUTHORIZE_RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_20260922";

const FORBIDDEN_DATABASE_URL_ENVS = Object.freeze([
  "DATABASE_URL",
  "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL",
  "RA_PRO_CUTOVER_APPLY_DATABASE_URL",
  "CONTAINMENT_APPLY_DATABASE_URL",
  "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL",
]);

const FEATURE_FLAG_ENV = "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION";

const ADVISORY_LOCK = Object.freeze({
  name: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY",
  key1: 0x52414341, // RACA
  key2: 0x20260922,
});

const PRIOR_HISTORY_COUNT = 190;
const POST_HISTORY_COUNT = 191;

/** Consumed dual-package attempt — must never be reused by corrective tooling. */
const CONSUMED_ORIGINAL_ATTEMPT_ID =
  "apply-b9926961e32c-8aecb1bd2f5f17dec0483dd550bb395f";

const MIGRATIONS = Object.freeze([
  Object.freeze({
    version: "20260922003200",
    name: "ra_pro_accounting_automation_service_role_least_privilege",
    path: "supabase/migrations/20260922003200_ra_pro_accounting_automation_service_role_least_privilege.sql",
    oid: "2c24cdfdd087db0020296ebf3b1d077513b4744c",
    sha256: "34f81879c8e5a457ea4025ac36f9961cfcab2e275ae73d71337aa69887dd407f",
    bytes: 3982,
  }),
]);

/**
 * Sealed originals from the dual package — VERIFY digests only.
 * Never load or execute their SQL through corrective tooling.
 */
const ORIGINAL_COMMITTED_MIGRATIONS = Object.freeze([
  Object.freeze({
    version: "20260917044537",
    name: "ra_pro_weekly_completeness_findings",
    path: "supabase/migrations/20260917044537_ra_pro_weekly_completeness_findings.sql",
    oid: "788de3e4b600c0aac57738c9ca3509d1b7e76d49",
    sha256: "7ce512e9e58a589766db12e6179300bf7f8ba8918a50685cfff5820989925430",
    bytes: 6952,
  }),
  Object.freeze({
    version: "20260917180140",
    name: "ra_pro_month_end_review_packages",
    path: "supabase/migrations/20260917180140_ra_pro_month_end_review_packages.sql",
    oid: "929054aec3d08bbf45d13d2a23f187f6200005dd",
    sha256: "ea22749b259a9b14a8cb8c5c575495430262057179d148496d506aaeebbbff10",
    bytes: 3997,
  }),
]);

const CORRECTIVE_TABLES = Object.freeze([
  "ra_pro_weekly_completeness_runs",
  "ra_pro_weekly_completeness_findings",
  "ra_pro_month_end_review_packages",
]);

const TOOLING_AUTHORIZATION_PATH =
  "docs/security/ra-pro-accounting-automation-corrective-apply/TOOLING_AUTHORIZATION.json";

const STANDALONE_BUNDLE_PATH =
  "scripts/security/bundles/ra-pro-accounting-automation-corrective-applicator.standalone.cjs";

/**
 * Inert placeholder — MUST NOT be treated as a matching authority hash.
 */
const EXPECTED_STANDALONE_BUNDLE_SHA256 =
  "PENDING_BUNDLE_BUILD_SHA256_PLACEHOLDER_00000000000000000000000000000000";

const STANDALONE_BUNDLE_OID =
  "3e335195fa093e28d9ee3346f53c2e81669b7480";
const STANDALONE_BUNDLE_SHA256 =
  "0abe8b266a89eb3467dba8e2017c222838f654086774f292a4137aeb29fb6326";
const STANDALONE_BUNDLE_BYTES = 324377;

const SELF_AUTHORITY_MODULES = Object.freeze([
  "scripts/security/apply-ra-pro-accounting-automation-corrective.js",
  "scripts/security/ra-pro-accounting-automation-corrective-apply-core.js",
  "scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js",
  "scripts/security/git-blob-authority.js",
  "scripts/security/verify-ra-pro-accounting-automation-corrective-apply-authority.js",
]);

module.exports = {
  ADVISORY_LOCK,
  APPLY_AUTHORIZATION_TOKEN,
  ARTIFACT_COMMIT,
  CONSUMED_ORIGINAL_ATTEMPT_ID,
  CORRECTIVE_TABLES,
  DATABASE_URL_ENV,
  EXPECTED_PROJECT_REF,
  EXPECTED_STANDALONE_BUNDLE_SHA256,
  FEATURE_FLAG_ENV,
  FORBIDDEN_DATABASE_URL_ENVS,
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  SELF_AUTHORITY_MODULES,
  STANDALONE_BUNDLE_BYTES,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
  TOOLING_AUTHORIZATION_PATH,
};
