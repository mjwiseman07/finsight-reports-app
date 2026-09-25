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

/**
 * Historical pre-remediation executable tip.
 * Rejected for the remediated executable-authority protocol: its sealed
 * bootstrap/ceremony/bundle do not implement production_executable_authority.
 * A separate authenticated outer-launch binding tip (not the executable)
 * supplies expectedExecutableCommit. Executable-authority publications remain
 * AUTH-only descendants of the clean executable and must match that outer tip.
 */
const HISTORICAL_CORRECTIVE_EXECUTABLE_COMMIT_9F31 =
  "9f31c3552a2a06fc3b851bd722aad9311dde40f8";

/** Commits that must never be named as authorized_executable_commit. */
const REJECTED_HISTORICAL_EXECUTABLE_COMMITS = Object.freeze([
  HISTORICAL_CORRECTIVE_EXECUTABLE_COMMIT_9F31,
]);

/**
 * @deprecated Use REJECTED_HISTORICAL_EXECUTABLE_COMMITS. Kept as alias so
 * transitional call sites fail closed on the historical tip identity.
 */
const IMMUTABLE_CORRECTIVE_EXECUTABLE_COMMIT =
  HISTORICAL_CORRECTIVE_EXECUTABLE_COMMIT_9F31;

const EXECUTABLE_AUTHORITY_MODULE_REL =
  "scripts/security/ra-pro-accounting-automation-corrective-executable-authority.js";

const EXECUTABLE_AUTHORITY_PROTOCOL_ID =
  "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_EXECUTABLE_AUTHORITY_V1";

const DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED_CODE =
  "DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED";

const OUTER_LAUNCH_BINDING_PATH =
  "docs/security/ra-pro-accounting-automation-corrective-apply/OUTER_LAUNCH_BINDING.json";

const OUTER_LAUNCH_BINDING_MODULE_REL =
  "scripts/security/ra-pro-accounting-automation-corrective-outer-launch-binding.js";

const OUTER_LAUNCH_BINDING_PROTOCOL_ID =
  "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_OUTER_LAUNCH_BINDING_V1";

const EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED =
  "EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED";

const EXECUTABLE_AUTHORITY_IMMUTABLE_MISMATCH =
  "EXECUTABLE_AUTHORITY_IMMUTABLE_MISMATCH";

/**
 * Immutable evidence pin authority (reviewed pin publication).
 * Dry-run/apply evidence gates load AUTH only from this commit’s Git blob.
 * Never substitute worktree JSON or an unvalidated descendant.
 */
const EVIDENCE_PIN_AUTHORITY_COMMIT =
  "f550842cd6dd837671599ee8c65bb6ba3932aa62";
const EVIDENCE_PIN_AUTHORITY_AUTH_OID =
  "5f3845b14f12b715019e785f40702814a1471b45";
const EVIDENCE_PIN_AUTHORITY_AUTH_SHA256 =
  "1c94fea33c01d6ce4fae0e596abbcec81bb59bb55f77fd70207e78ff0940450e";
const EVIDENCE_PIN_AUTHORITY_AUTH_BYTES = 11452;

const STANDALONE_BUNDLE_PATH =
  "scripts/security/bundles/ra-pro-accounting-automation-corrective-applicator.standalone.cjs";

/**
 * Inert placeholder — MUST NOT be treated as a matching authority hash.
 */
const EXPECTED_STANDALONE_BUNDLE_SHA256 =
  "PENDING_BUNDLE_BUILD_SHA256_PLACEHOLDER_00000000000000000000000000000000";

/** Bundle seals — updated by assemble script after rebuild (non-circular). */
const STANDALONE_BUNDLE_OID =
  "876b9a1592c0551919dadb3b91defdaa52a1a4fb";
const STANDALONE_BUNDLE_SHA256 =
  "2712d3ab666646a58f5725c29bdd5f66924b82fc47cec738ee7c17eeda330188";
const STANDALONE_BUNDLE_BYTES = 521001;

const SELF_AUTHORITY_MODULES = Object.freeze([
  "scripts/security/apply-ra-pro-accounting-automation-corrective.js",
  "scripts/security/ra-pro-accounting-automation-corrective-apply-core.js",
  "scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js",
  "scripts/security/ra-pro-accounting-automation-corrective-evidence.js",
  "scripts/security/ra-pro-accounting-automation-corrective-evidence-decode-frame.js",
  "scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js",
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
  EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
  EVIDENCE_PIN_AUTHORITY_AUTH_OID,
  EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
  EVIDENCE_PIN_AUTHORITY_COMMIT,
  DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED_CODE,
  EXECUTABLE_AUTHORITY_EXPECTED_EXECUTABLE_REQUIRED,
  EXECUTABLE_AUTHORITY_IMMUTABLE_MISMATCH,
  EXECUTABLE_AUTHORITY_MODULE_REL,
  EXECUTABLE_AUTHORITY_PROTOCOL_ID,
  EXPECTED_PROJECT_REF,
  EXPECTED_STANDALONE_BUNDLE_SHA256,
  FEATURE_FLAG_ENV,
  HISTORICAL_CORRECTIVE_EXECUTABLE_COMMIT_9F31,
  IMMUTABLE_CORRECTIVE_EXECUTABLE_COMMIT,
  REJECTED_HISTORICAL_EXECUTABLE_COMMITS,
  FORBIDDEN_DATABASE_URL_ENVS,
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  OUTER_LAUNCH_BINDING_MODULE_REL,
  OUTER_LAUNCH_BINDING_PATH,
  OUTER_LAUNCH_BINDING_PROTOCOL_ID,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  SELF_AUTHORITY_MODULES,
  STANDALONE_BUNDLE_BYTES,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
  TOOLING_AUTHORIZATION_PATH,
};
