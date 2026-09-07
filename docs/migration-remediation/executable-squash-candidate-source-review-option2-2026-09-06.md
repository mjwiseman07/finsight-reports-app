# ESC Option-2 independent source review — 2026-09-06

**Verdict: CHANGES REQUIRED**

| Pin | Value |
|-----|-------|
| Reviewed HEAD | `4888756224129abcdc1729fc772a1300dc1ba074` |
| Seal | `74d3b7498f4f2327b15c4ea8631c1b0c40b1daf795675f0517a5fb7052f3d3ff` |
| Bytes | 1139927 |
| Modules | 12 |
| Candidate byte-identical | true |
| Transaction model | OPTION_2_SECURE_MULTI_VERSION_SPLIT |

## Source accounting
144 unchanged + 6 overlays + 1 forward = 151
Marker note: 138 OD assembled begin markers in app/security slices; +1 ESC_REMEDIATION patch marker is not an Option D source

## Extension ops
- 20260907010010 L120: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L156: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L209: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L407: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L577: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L662: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L712: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L771: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L844: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L1257: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L1431: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010010 L1573: `create extension if not exists pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010030 L2071: `CREATE EXTENSION IF NOT EXISTS vector;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010031 L2466: `CREATE EXTENSION IF NOT EXISTS pgcrypto;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010033 L479: `CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE
- 20260907010035 L861: `ALTER EXTENSION vector SET SCHEMA extensions;` → OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE

## Per-COMMIT summary
- M1 20260907010000: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=0 fnPublicUnrevoked=0
- M2 20260907010010: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=5 fnPublicUnrevoked=5
- M3 20260907010020: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=1 fnPublicUnrevoked=1
- M4 20260907010030: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=19 fnPublicUnrevoked=18
- M5 20260907010031: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=7 fnPublicUnrevoked=6
- M6 20260907010032: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=14 fnPublicUnrevoked=17
- M7 20260907010033: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=39 fnPublicUnrevoked=39
- M8 20260907010034: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=19 fnPublicUnrevoked=19
- M9 20260907010035: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=9 fnPublicUnrevoked=2
- M10 20260907010040: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=0 fnPublicUnrevoked=0
- M11 20260907010050: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=2 fnPublicUnrevoked=2
- M12 20260907010060: tablesUnsafe=0 cumWithoutRls=0 fnsCreated=1 fnPublicUnrevoked=2

## Named object security timing
- curated_rule_fires: sameModuleClosure=true create=20260907010030 rls/revoke=20260907010030
- gap2_purge_table_registry: sameModuleClosure=true create=20260907010032 rls/revoke=20260907010032
- engagement_posting_policy: sameModuleClosure=false create=20260907010035 rls/revoke=20260907010031
- publish_ledger_event: sameModuleClosure=true create=20260907010031 rls/revoke=20260907010031
- increment_share_token_access: sameModuleClosure=true create=20260907010030 rls/revoke=20260907010030

## Frozen authority
{
  "assembleAuthoritySourceCommit": "93363371c2aa6e032e8b1c1cd34f92594d69edb4",
  "originalSha256Pinned": "3212b9994574d27844cdf3dbde6997a951d0d91f455a40c3b9323eeabab4c4d3",
  "originalBlobIdPinned": "9a4ca65baf6f47a6d350f5815ed693a026d5e618",
  "originalBlobShaMatchesPin": true,
  "assembledSha256Pinned": "3212b9994574d27844cdf3dbde6997a951d0d91f455a40c3b9323eeabab4c4d3",
  "headOriginalSha256": "63eb55cb64bafa7a6a5bf67932e09040e1c014885e976d52f6274fe15987529e",
  "headDiffersFromFrozen": true,
  "disposition": "EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY"
}

## Dump requirement
Full live pg_dump --schema-only remains mandatory before local replay / mutation. Option D + partial G1 are not complete production match.

## Findings
- **P1** `BROAD_TABLE_GRANT` @ esc_public_users_and_foundations_baseline:53: ALL on users TO anon
- **P0** `FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT` @ esc_phase1_subscriptions_rls_atomic: 1 functions created without same-module REVOKE FROM PUBLIC; sample: tg_set_updated_at
- **P0** `FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT` @ esc_application_schema_slice_1_of_5: 18 functions created without same-module REVOKE FROM PUBLIC; sample: set_updated_at, prevent_je_audit_update, touch_je_post_attempts, ledger_events_prevent_mutation, ledger_events_notify, engagement_addons_set_updated_at, entitlement_check_audit_no_mutation, _intake_touch_updated_at
- **P0** `FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT` @ esc_application_schema_slice_2_of_5: 6 functions created without same-module REVOKE FROM PUBLIC; sample: validate_assertions_array, close_gap_review_items_touch_updated_at, mfa_audit_log_prevent_mutation, user_webauthn_credentials_prevent_column_mutation, _d651_slugify_name, next_document_number
- **P0** `FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT` @ esc_application_schema_slice_3_of_5: 17 functions created without same-module REVOKE FROM PUBLIC; sample: preset_pack_registry_immutable, observation_events_immutable, drafted_amendments_terminal_immutable, qbo_webhook_events_enforce_append_only, qbo_webhook_events_block_delete, gap3_materiality_bucket, gap3_pre_close_ri_materiality_before_insert, gap3_pre_close_ri_sod_before_update
- **P0** `FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT` @ esc_application_schema_slice_4_of_5: 39 functions created without same-module REVOKE FROM PUBLIC; sample: get_similar_kickout_resolutions, get_similar_kickout_resolution_counts, handle_new_auth_user, pilot_lifecycle_events_canonical_payload, pilot_lifecycle_events_before_insert, pilot_lifecycle_events_reject_mutations, pilot_lifecycle_events_verify_chain, pilot_lifecycle_events_before_insert
- **P0** `FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT` @ esc_application_schema_slice_5_of_5: 19 functions created without same-module REVOKE FROM PUBLIC; sample: journal_entry_provider_attempts_guard_mutation, persist_journal_entry_provider_attempt, patch_journal_entry_provider_attempt, transition_journal_entry_execution, patch_journal_entry_provider_attempt, apply_journal_entry_provider_commit_discovered, apply_journal_entry_provider_not_found_confirmed, patch_journal_entry_provider_attempt
- **P0** `FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT` @ esc_security_rls_grants_hardening_atomic: 2 functions created without same-module REVOKE FROM PUBLIC; sample: engagement_posting_policy_preset_consistency, pre_close_review_items_immutable
- **P0** `NAMED_TABLE_RLS_NOT_AT_CREATE_COMMIT` @ engagement_posting_policy: create@20260907010035 rls@20260907010031
