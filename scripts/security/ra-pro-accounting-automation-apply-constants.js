"use strict";

/**
 * Offline authority for the RA Pro accounting-automation migration applicator.
 * Dry-run: published precondition_publication only.
 * Apply: one-attempt authorization. Evidence publication is not sufficient.
 * The committed production_apply_authorization record stays UNPUBLISHED.
 * Bundle authority is external (OID/SHA/bytes) — never PENDING self-hash alone.
 */
const ARTIFACT_COMMIT = "85ae600be8ef8ef3498703bf480f8148d6fe0971";
const EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
const DATABASE_URL_ENV = "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL";
const APPLY_AUTHORIZATION_TOKEN =
  "I_AUTHORIZE_RA_PRO_ACCOUNTING_AUTOMATION_APPLY_20260917";

const FORBIDDEN_DATABASE_URL_ENVS = Object.freeze([
  "DATABASE_URL",
  "RA_PRO_CUTOVER_APPLY_DATABASE_URL",
  "CONTAINMENT_APPLY_DATABASE_URL",
  "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL",
]);

const FEATURE_FLAG_ENV = "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION";

const ADVISORY_LOCK = Object.freeze({
  name: "RA_PRO_ACCOUNTING_AUTOMATION_APPLY",
  key1: 0x52414141, // RAAA
  key2: 0x20260917,
});

const PRIOR_HISTORY_COUNT = 188;
const POST_HISTORY_COUNT = 190;

const MIGRATIONS = Object.freeze([
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

const TOOLING_AUTHORIZATION_PATH =
  "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";

const STANDALONE_BUNDLE_PATH =
  "scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs";

/**
 * Inert placeholder — MUST NOT be treated as a matching authority hash.
 * Mandatory external gate: STANDALONE_BUNDLE_{OID,SHA256,BYTES} + TOOLING_AUTHORIZATION.standalone_bundle
 * verified via git cat-file before credentials/DB/SQL.
 */
const EXPECTED_STANDALONE_BUNDLE_SHA256 =
  "PENDING_BUNDLE_BUILD_SHA256_PLACEHOLDER_00000000000000000000000000000000";

/** Filled by assemble script after LF measure; non-circular (constants updated without rebuild). */
const STANDALONE_BUNDLE_OID =
  "31c41ab1c351d3264f94f30e2aa1fab5f94689f3";
const STANDALONE_BUNDLE_SHA256 =
  "3ee3d807055c9a4b7fc536eb887eabfc49c5cb17427be1bf863b357f7f355065";
const STANDALONE_BUNDLE_BYTES = 341372;

const SELF_AUTHORITY_MODULES = Object.freeze([
  "scripts/security/apply-ra-pro-accounting-automation.js",
  "scripts/security/ra-pro-accounting-automation-apply-core.js",
  "scripts/security/ra-pro-accounting-automation-apply-constants.js",
  "scripts/security/git-blob-authority.js",
  "scripts/security/verify-ra-pro-accounting-automation-apply-authority.js",
]);

module.exports = {
  ADVISORY_LOCK,
  APPLY_AUTHORIZATION_TOKEN,
  ARTIFACT_COMMIT,
  DATABASE_URL_ENV,
  EXPECTED_PROJECT_REF,
  EXPECTED_STANDALONE_BUNDLE_SHA256,
  FEATURE_FLAG_ENV,
  FORBIDDEN_DATABASE_URL_ENVS,
  MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  SELF_AUTHORITY_MODULES,
  STANDALONE_BUNDLE_BYTES,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
  TOOLING_AUTHORIZATION_PATH,
};
