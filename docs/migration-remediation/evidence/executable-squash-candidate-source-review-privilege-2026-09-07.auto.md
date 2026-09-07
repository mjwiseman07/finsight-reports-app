# ESC privilege-remediation independent source review — 2026-09-07

**Verdict: CHANGES REQUIRED**

| Pin | Value |
|-----|-------|
| Reviewed HEAD | `d558c39b4a42540f9c485b30c6b9f0972b4ac500` |
| Seal | `c5c360d8325e2cbfa474d97ea0d33e0f2449ab89820770146def8c4c13da5a37` |
| Bytes | 1190718 |
| Modules | 12 |
| Candidate byte-identical | true |
| Prior seal superseded | true |

## Source accounting
144 unchanged + 6 overlays + 1 forward = 151
Digest qualify occurrences: 1 (forward-tail only)

## Independent function inventory
- Regex CREATE/REPLACE hits: 116
- Unique identities: 95
- Class counts: {"trigger_only":53,"internal_service_role_only":28,"migration_admin_or_internal":9,"authenticated_rls_helper":5}
- Count explanation: Prior ~111 and current regex hits count every CREATE/REPLACE occurrence. Unique identities collapse OR REPLACE redefinitions. Committed inventory listed 100 rows (includes duplicate identity rows across slices); independent unique identity count is authoritative.

## public.users column security
- Escalation possible: true
- Sensitive columns: email, business_name, ip_address_signup, trial_used, reports_generated, subscription_status, stripe_customer_id
- Column UPDATE grant: false
- Update trigger: false
- Anon ALL absent: true

## engagement_posting_policy
{"createVer":"20260907010031","enableVer":"20260907010031","createLine":31,"enableLine":2063,"okOrder":true,"sameModule":true}

## Per-COMMIT summary
- M1 20260907010000: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=0/0
- M2 20260907010010: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=1/1
- M3 20260907010020: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=1/1
- M4 20260907010030: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=1/1
- M5 20260907010031: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=1/1
- M6 20260907010032: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=1/1
- M7 20260907010033: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=1/1
- M8 20260907010034: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=1/1
- M9 20260907010035: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=1/1
- M10 20260907010040: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=0/0
- M11 20260907010050: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=5/5
- M12 20260907010060: unsafeTables=0 cumWithoutRls=0 fnPublicGaps=0 txn=0/0

## Frozen authority
```json
{
  "assembleAuthoritySourceCommit": "93363371c2aa6e032e8b1c1cd34f92594d69edb4",
  "optionDManifestSha256": "9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359",
  "disposition": "FROZEN_OPTION_D_AUTHORITY_PRESENT",
  "headDiffersFromFrozen": true,
  "frozenBlobSha256": "3212b9994574d27844cdf3dbde6997a951d0d91f455a40c3b9323eeabab4c4d3",
  "headBlobSha256": "63eb55cb64bafa7a6a5bf67932e09040e1c014885e976d52f6274fe15987529e",
  "note": "EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY"
}
```

## Dump requirement
Full live pg_dump --schema-only remains mandatory before local replay / mutation. Option D + partial G1 are not complete production match.

## Findings
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` @ esc_public_users_and_foundations_baseline: 5 trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` @ esc_phase1_subscriptions_rls_atomic: 1 trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` @ esc_application_schema_slice_1_of_5: 18 trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE
- **P1** `SECURITY_DEFINER_MISSING_SEARCH_PATH` @ esc_application_schema_slice_2_of_5:2732: public.publish_ledger_event(text,text,int4,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,uuid,text)
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` @ esc_application_schema_slice_2_of_5: 5 trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE
- **P2** `MIGRATION_ADMIN_SERVICE_ROLE_GRANT_WITHOUT_CALLER_PROOF` @ esc_application_schema_slice_2_of_5: 3 migration_admin_or_internal functions granted service_role without demonstrated runtime caller
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` @ esc_application_schema_slice_3_of_5: 9 trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` @ esc_application_schema_slice_4_of_5: 17 trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE
- **P2** `MIGRATION_ADMIN_SERVICE_ROLE_GRANT_WITHOUT_CALLER_PROOF` @ esc_application_schema_slice_4_of_5: 6 migration_admin_or_internal functions granted service_role without demonstrated runtime caller
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` @ esc_application_schema_slice_5_of_5: 3 trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` @ esc_security_rls_grants_hardening_atomic: 1 trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE
- **P2** `TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED` @ esc_guarded_dataless_safe_initialization: 1 trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE
- **P2** `MIGRATION_ADMIN_SERVICE_ROLE_GRANT_WITHOUT_CALLER_PROOF` @ esc_guarded_dataless_safe_initialization: 1 migration_admin_or_internal functions granted service_role without demonstrated runtime caller
- **P0** `USERS_AUTHENTICATED_COLUMN_UPDATE_ESCALATION` @ esc_public_users_and_foundations_baseline:56: authenticated has table-level UPDATE + own-row RLS without column grants or BEFORE UPDATE trigger; protected columns: email, business_name, ip_address_signup, trial_used, reports_generated, subscription_status, stripe_customer_id
