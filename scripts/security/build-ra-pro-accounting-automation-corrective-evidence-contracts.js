"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { ORIGINAL_COMMITTED_MIGRATIONS } = require("./ra-pro-accounting-automation-corrective-apply-constants");

const ROOT = path.resolve(__dirname, "../..");
const common = {
  schema_version: 3,
  publication_status: "UNPUBLISHED",
  pin_source: "committed_tooling_authorization_only",
  operator_path_override: "forbidden",
  operator_env_override: "forbidden",
  freshness: "valid_from_utc <= UtcNow < valid_until_utc",
  validity_window: "exactly_24_hours",
  newline: "UTF-8, no BOM, no CR, exactly one trailing LF",
  sanitization: [
    "no database URLs",
    "no credential material",
    "no PEM or private keys",
    "no customer, firm, user, or webhook identifiers",
    "no hostnames",
    "no UUID shapes",
  ],
};

function bindings(scope) {
  return {
    pr_number: 324,
    authorized_executable_commit: "from_production_collection_authorization_record",
    authorization_publication_commit: "from_runtime_publication_commit",
    authorization_publication_blob_oid: "from_authorization_git_blob",
    scope,
    project_ref: "jzmdgwwiestcmmeuhhkr",
    history_count: 190,
    original_committed_migrations: ORIGINAL_COMMITTED_MIGRATIONS.map(
      ({ version, oid, sha256, bytes }) => ({ version, oid, sha256, bytes }),
    ),
    corrective_version: "20260922003200",
    corrective_version_count: 0,
    privilege_surfaces: {
      tables: [
        "ra_pro_weekly_completeness_runs",
        "ra_pro_weekly_completeness_findings",
        "ra_pro_month_end_review_packages",
      ],
      owner: "postgres",
      direct_catalog_grantees: ["service_role", "authenticated", "anon", "PUBLIC"],
      effective_roles: ["service_role", "authenticated", "anon"],
      inherited_contributions: "must_be_empty",
      unexpected_grantees: "must_be_empty",
      service_role_pre_correction: [
        "SELECT",
        "INSERT",
        "UPDATE",
        "DELETE",
        "TRUNCATE",
        "REFERENCES",
        "TRIGGER",
      ],
      authenticated_pre_correction: ["SELECT"],
      anon_pre_correction: [],
      PUBLIC_pre_correction: [],
      execute: { service_role: true, authenticated: false, anon: false, PUBLIC: false },
      MAINTAIN: {
        PG16_and_below: "not_supported_and_claim_forbidden",
        PG17_and_above: "service_role_direct_and_effective_true; all_other_roles_false",
      },
    },
    objects: {
      table_owners: "postgres",
      columns: "exact_name_type_nullability_match",
      indexes: "exact_name_uniqueness_columns_match",
      constraints:
        "structural_canonical_identity_for_unnamed_migration_constraints; exact_name_only_when_CONSTRAINT_clause_present_in_sealed_migrations (none)",
      constraints_exact_name_bound: [],
      constraints_structurally_canonicalized:
        "all_pk_unique_fk_check; compare table/kind/ordered_columns/referenced_table_columns/match_update_delete/deferrability/normalized_check_expr/uniqueness; ignore PostgreSQL-generated names",
      policies: "exact_name_command_role_match",
      functions: "exact_signature_security_search_path_language_match",
      row_counts: "nonnegative_integer_for_each_corrective_table",
      provider_sentinels:
        "typed_state_per_relation; sealed_expected_absent_for_invoices_bills_payments_journal_entries_provider_write_attempts; present:false requires count=unavailable mutations=not_applicable; present:true requires nonnegative count; reject missing/unknown/duplicate/contradictory/unexpected_presence/nonzero_provider_write_evidence",
      partial_corrective_state: false,
    },
    authorizing_inventory: {
      predicate: "review_assist_pro_active_and_complimentary",
      total: 4,
      company_owned: 3,
      firm_owned: 1,
      dual_owner: 0,
    },
    linked_firms_count: 0,
    webhook_non_terminal_count: 0,
    webhook_non_terminal_statuses: ["received", "processing", "retryable"],
    consumed_dual_attempt_id: "apply-b9926961e32c-8aecb1bd2f5f17dec0483dd550bb395f",
    automation_gate_key: "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION",
    automation_gate_presence: "absent",
    automation_gate_production_key_name_authority: "vercel_production_exact_key_names",
    automation_gate_state: "closed",
    automation_gate_value_read: false,
    write_counters: 0,
  };
}

const contracts = [
  {
    file: "PRECONDITION_EVIDENCE_CONTRACT.json",
    protocol: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1",
    scope: "read_only_production_corrective_precondition_collection",
    substitutions: [
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRIOR_DRY_RUN_EVIDENCE_V1",
    ],
  },
  {
    file: "PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json",
    protocol: "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRE_APPLY_LIVE_EVIDENCE_V1",
    scope: "read_only_production_corrective_pre_apply_live_collection",
    substitutions: [
      "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1",
      "RA_PRO_ACCOUNTING_AUTOMATION_PRIOR_DRY_RUN_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
      "RA_PRO_CUTOVER_PRIOR_DRY_RUN_EVIDENCE_V1",
    ],
  },
];

for (const contract of contracts) {
  const value = {
    protocol: contract.protocol,
    ...common,
    substitution_forbidden: contract.substitutions,
    bindings: bindings(contract.scope),
  };
  const out = path.join(
    ROOT,
    "docs/security/ra-pro-accounting-automation-corrective-apply",
    contract.file,
  );
  fs.writeFileSync(out, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
