"use strict";

/**
 * Offline authority for the RA Pro accounting-automation migration bundle.
 * Production apply remains disabled until the authorization package publishes
 * reviewed prior-dry-run and fresh pre-apply evidence pins.
 */
const ARTIFACT_COMMIT = "85ae600be8ef8ef3498703bf480f8148d6fe0971";
const EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
const DATABASE_URL_ENV = "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL";
const APPLY_AUTHORIZATION_TOKEN =
  "I_AUTHORIZE_RA_PRO_ACCOUNTING_AUTOMATION_APPLY_20260917";

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

module.exports = {
  ADVISORY_LOCK,
  APPLY_AUTHORIZATION_TOKEN,
  ARTIFACT_COMMIT,
  DATABASE_URL_ENV,
  EXPECTED_PROJECT_REF,
  MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
};
