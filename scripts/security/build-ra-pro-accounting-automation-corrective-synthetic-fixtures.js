"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const {
  buildSyntheticPrivilegeSurfaces,
  buildSyntheticObjects,
} = require("./ra-pro-accounting-automation-corrective-evidence-schema");
const {
  buildCorrectivePreconditionEvidence,
  buildCorrectivePreApplyLiveEvidence,
  serializeLfJson,
} = require("./ra-pro-accounting-automation-corrective-evidence-collector");
const {
  CONSUMED_ORIGINAL_ATTEMPT_ID,
  EXPECTED_PROJECT_REF,
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  PRIOR_HISTORY_COUNT,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");

const ROOT = path.resolve(__dirname, "../..");
const SYNTH_EXEC = "a111111111111111111111111111111111111111";
const SYNTH_PUB = "b222222222222222222222222222222222222222";
const SYNTH_OID = "c333333333333333333333333333333333333333";
const NOW = new Date("2026-09-21T10:00:00Z");

const SYNTH_AUTHORITY = {
  authorized_executable_commit: SYNTH_EXEC,
  authorization_publication_commit: SYNTH_PUB,
  authorization_publication_blob_oid: SYNTH_OID,
};

function databaseReadonly() {
  return {
    project_ref: EXPECTED_PROJECT_REF,
    observed_at_utc: "2026-09-21T10:00:00Z",
    history_count: PRIOR_HISTORY_COUNT,
    original_committed_migrations: ORIGINAL_COMMITTED_MIGRATIONS.map((migration) => ({
      version: migration.version,
      count: 1,
      digest_match: true,
      oid: migration.oid,
      sha256: migration.sha256,
      bytes: migration.bytes,
    })),
    corrective_version: MIGRATIONS[0].version,
    corrective_version_count: 0,
    privilege_surfaces: buildSyntheticPrivilegeSurfaces(160000),
    objects: buildSyntheticObjects(),
    linked_firms_count: 0,
    authorizing_inventory: {
      predicate: "review_assist_pro_active_and_complimentary",
      total: 4,
      company_owned: 3,
      firm_owned: 1,
      dual_owner: 0,
    },
    webhook_non_terminal_count: 0,
    webhook_non_terminal_statuses: ["received", "processing", "retryable"],
    consumed_dual_attempt_id: CONSUMED_ORIGINAL_ATTEMPT_ID,
  };
}

function observations() {
  return {
    independently_observed: {
      authorized_executable_commit: SYNTH_EXEC,
      authorization_publication_commit: SYNTH_PUB,
      authorization_publication_blob_oid: SYNTH_OID,
      database_readonly: databaseReadonly(),
      automation_gate: {
        key: "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION",
        production_presence: "absent",
        production_key_name_authority: "vercel_production_exact_key_names",
        effective_state: "closed",
        value_read: false,
      },
      safety: {
        read_only: true,
        select_only: true,
        production_writes: 0,
        sql_application_attempts: 0,
        dry_run_attempts: 0,
        migration_apply_attempts: 0,
        provider_writes: 0,
        automation_enabled: false,
        merge_or_deploy_performed: false,
        credential_prompt_opened: false,
        marker_created: false,
        pins_published: false,
      },
    },
  };
}

const precondition = buildCorrectivePreconditionEvidence(observations(), {
  now: NOW,
  authority: SYNTH_AUTHORITY,
  visibility_limitations: [
    "Synthetic disposable fixture. Corrective precondition evidence pins remain UNPUBLISHED.",
  ],
});
const preApply = buildCorrectivePreApplyLiveEvidence(observations(), {
  now: NOW,
  authority: SYNTH_AUTHORITY,
  visibility_limitations: [
    "Synthetic disposable fixture. Corrective pre-apply live evidence pins remain UNPUBLISHED.",
  ],
});

for (const [file, value] of [
  [
    "tests/security/helpers/fixtures/ra-pro-accounting-automation-corrective-precondition-synthetic.json",
    precondition,
  ],
  [
    "tests/security/helpers/fixtures/ra-pro-accounting-automation-corrective-pre-apply-live-synthetic.json",
    preApply,
  ],
]) {
  fs.writeFileSync(path.join(ROOT, file), serializeLfJson(value), "utf8");
}
