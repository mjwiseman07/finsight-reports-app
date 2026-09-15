# Executable squash candidate — remediations source review (2026-09-06)

**Verdict: CHANGES REQUIRED**

**Reviewed HEAD:** `9b0c3b1a51e5674742c55b2d47aa0a1ecdaa3fc3`  
**Package seal:** `99f556ebab0a73e3a58c770776cf3287d5150887ae22de25f80cb6932dd1dacf` (expected `99f556ebab0a73e3a58c770776cf3287d5150887ae22de25f80cb6932dd1dacf`)  
**Bytes:** 1130762 (expected 1130762)  
**Modules:** 7  
**Candidate SQL/manifest byte-identical to committed blobs:** true  
**Prior seal superseded:** `ae85b00270d3b89f6e8f57cb6851dec19aba2b860dd0de89126bc93643555d28` (not selected: true)  
**Active supabase/migrations ESC leak:** none detected  
**Production dump / Docker / SQL exec:** not performed (not authorized)

## Part A — Seal
- M1 `20260907010000` esc_platform_prerequisites_contract: sha256=`4b71d1a582fd81098535513af258354735eb9b85827b25c3ea5a7dc2318ebad0` md5=`b91ececa001dc264f1af6e952f0fa53c` blob=`8b8f31992e2714fe3ee0ed9ec350138ceb65b926` bytes=1074 stmts≈5 match=true
- M2 `20260907010010` esc_public_users_and_foundations_baseline: sha256=`5f622b6a244620ad5ee896555c6640a34adf8d5b4212ec7815a06ce6c786cc74` md5=`60875424b1b85d32bebd2f619d86040c` blob=`81d9069328d9579bbdd73f234f5510b49d26cda3` bytes=108827 stmts≈565 match=true
- M3 `20260907010020` esc_phase1_subscriptions_rls_atomic: sha256=`10a46c634df0bfd706244a504851ed58a4b14930094b41a3baab21a14c701bff` md5=`58e9b513cd4ebd455e67c7fcf66ebc11` blob=`d55a4911d99f85bc51a3d16a40fccc87c4c35ae0` bytes=19918 stmts≈63 match=true
- M4 `20260907010030` esc_application_schema_and_security_atomic: sha256=`6e0e8c53f27531809607b1ab93dc96dd8a07f69d46974f995ea0cb3e3c0b9099` md5=`f519e5adec6aca7515069ebc72e14f2e` blob=`98936d35a2c95748aed1582e3bee50ede4ec5f94` bytes=979214 stmts≈4511 match=true
- M5 `20260907010040` esc_reference_seed_allowlist_contract: sha256=`a2ae185ca8e1c0ac6cb5dc8fef979f7c7427ad36603bbc32ce6330b020284d88` md5=`28658991e6679fbe2371a30f23b75457` blob=`06709f26f35893881eec8f6ec5dfea0a5767e7ef` bytes=1021 stmts≈3 match=true
- M6 `20260907010050` esc_guarded_dataless_safe_initialization: sha256=`25c01a3edf4dd6203f6e396b812278305f6e7ebd6c79115c75765d86742feb3b` md5=`d820e05f0da06658e5d665da45bad1a6` blob=`6dcc488c070ad5ac57c7bfe43f1d027872d702ea` bytes=15876 stmts≈50 match=true
- M7 `20260907010060` esc_forward_tail_main_unapplied: sha256=`f46ffb82276aa485ab968312e2d0c6223a83f805e99a2c671d684f7e77714232` md5=`799aa12957cdb29e8d81a426d712a119` blob=`ca90b19db66f4fbe0b76bf715e270517463559c1` bytes=4832 stmts≈21 match=true

Complete seal recomputed from concatenated entry SHA-256 lines: `99f556ebab0a73e3a58c770776cf3287d5150887ae22de25f80cb6932dd1dacf`.

## Part B — 151 accounting
Equation observed: **144 unchanged + 6 overlays + 1 forward = 151**  
Counts: {"included_unchanged_baseline":144,"reviewed_transformation_overlay":6,"moved_to_forward_tail":1,"intentionally_excluded":0,"superseded":0,"missing":0,"duplicated":0}

Interpretation of remediator’s 138 / 6 / 1:
- **138** = unique `>>> begin` markers inside atomic module 4 (app+security assembled files only); observed marker count = **139**
- **6** = disposition overlays (d6×4 + tcp1 + grant) in module 6
- **1** = digest qualify moved to module 7 forward-tail
- Remaining Option D entries live in modules 2–3 (foundations + phase1) and are part of the **unchanged baseline** class — they are **not** part of the “138” figure

Digest executable occurrence: **1** (must be 1). Provenance retained via `>>> forward 20260906184500_publish_ledger_event_extensions_digest_qualify.sql`.

## Part C — Prior P0 remediations
See findings. Critical: module 4 is one **proposed version** but nested BEGIN/COMMIT markers mean it is **not** one PostgreSQL transaction unless a runner strips/re-wraps them.

## Part D — Transaction / size
Module 4 bytes=979214; BEGIN=50; COMMIT=50.

## Part E — Boundary matrix
- After M1 (esc_platform_prerequisites_contract): created=0 rls=0 unsafe=0 cumulativeWithoutRls=0
- After M2 (esc_public_users_and_foundations_baseline): created=43 rls=43 unsafe=0 cumulativeWithoutRls=0
- After M3 (esc_phase1_subscriptions_rls_atomic): created=5 rls=5 unsafe=0 cumulativeWithoutRls=0
- After M4 (esc_application_schema_and_security_atomic): created=171 rls=171 unsafe=0 cumulativeWithoutRls=0
- After M5 (esc_reference_seed_allowlist_contract): created=0 rls=0 unsafe=0 cumulativeWithoutRls=0
- After M6 (esc_guarded_dataless_safe_initialization): created=2 rls=2 unsafe=0 cumulativeWithoutRls=0
- After M7 (esc_forward_tail_main_unapplied): created=0 rls=0 unsafe=0 cumulativeWithoutRls=0

## Part F — Dump requirement
Full live pg_dump --schema-only remains mandatory before local replay / mutation. Option D PASS + 47-table G1 are not a complete production match.  
Comparison complete-prod-match claim: **false**. Mandatory dump before replay: **true**.

## Findings (P0–P3)
- **P0** `MODULE4_NOT_SINGLE_TRANSACTION` @ esc_application_schema_and_security_atomic: Nested txn markers BEGIN=50 COMMIT=50. One proposed version ≠ one PostgreSQL transaction; premature COMMIT possible mid-module.
- **P1** `MANIFEST_138_VS_MARKERS` @ esc_application_schema_and_security_atomic: unique begin markers in module4=139 (manifest claimed 138)
- **P1** `MODULE4_SIZE_OPERATIONAL_RISK` @ esc_application_schema_and_security_atomic: 979KB-class module may hit dashboard/CLI timeout or payload limits; nested COMMITs also break atomicity. Secure atomic split design required if P0 txn finding stands — not applied in this review.
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:9383: public.gap2_audit_append_only
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:9499: public.gap2_schedule_purge
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:9577: public.gap2_cancel_purge
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:10165: public.increment_pbc_request_count
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:11454: audit_ready_latest_bs_kickout_lines
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:11504: audit_ready_latest_pbc_kickout_runs
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:11994: public.handle_new_auth_user
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:12278: public.pilot_lifecycle_events_before_insert
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:12396: public.pilot_lifecycle_events_verify_chain
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:12483: public.pilot_lifecycle_events_before_insert
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:12559: public.pilot_lifecycle_events_verify_chain
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:12796: public.pilot_lifecycle_events_before_insert
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:12935: public.pilot_lifecycle_events_verify_chain
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:13204: public.sp_write_anchor_batch
- **P1** `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` @ esc_application_schema_and_security_atomic:13306: public.sp_list_public_columns
- **P1** `SENSITIVE_DML_KEYWORD` @ esc_public_users_and_foundations_baseline: oauth/secret near INSERT
- **P1** `SENSITIVE_DML_KEYWORD` @ esc_application_schema_and_security_atomic: oauth/secret near INSERT
- **P2** `EXECUTABLE_GRANT_TO_AUTHENTICATED` @ esc_application_schema_and_security_atomic:11502: GRANT EXECUTE ON FUNCTION audit_ready_latest_bs_kickout_lines(uuid[]) TO authenticated
- **P2** `EXECUTABLE_GRANT_TO_AUTHENTICATED` @ esc_application_schema_and_security_atomic:11565: GRANT EXECUTE ON FUNCTION audit_ready_latest_pbc_kickout_runs(uuid[]) TO authenticated
- **P2** `EXECUTABLE_GRANT_TO_AUTHENTICATED` @ esc_application_schema_and_security_atomic:11854: GRANT EXECUTE ON FUNCTION public.get_similar_kickout_resolutions(uuid, text, jsonb)
  TO authenticated
- **P2** `EXECUTABLE_GRANT_TO_AUTHENTICATED` @ esc_application_schema_and_security_atomic:11918: GRANT EXECUTE ON FUNCTION public.get_similar_kickout_resolution_counts(uuid[])
  TO authenticated
- **P2** `EXECUTABLE_GRANT_TO_AUTHENTICATED` @ esc_application_schema_and_security_atomic:21292: GRANT EXECUTE ON FUNCTION public.is_active_company_member(uuid)      TO authenticated
- **P2** `EXECUTABLE_GRANT_TO_AUTHENTICATED` @ esc_application_schema_and_security_atomic:21293: GRANT EXECUTE ON FUNCTION public.has_active_company_role(uuid, text[]) TO authenticated
- **P2** `EXECUTABLE_GRANT_TO_AUTHENTICATED` @ esc_application_schema_and_security_atomic:21294: GRANT EXECUTE ON FUNCTION public.is_company_admin(uuid)              TO authenticated
- **P2** `EXECUTABLE_GRANT_TO_AUTHENTICATED` @ esc_application_schema_and_security_atomic:21295: GRANT EXECUTE ON FUNCTION public.is_active_firm_member(uuid)         TO authenticated
- **P2** `EXECUTABLE_GRANT_TO_AUTHENTICATED` @ esc_application_schema_and_security_atomic:21296: GRANT EXECUTE ON FUNCTION public.has_active_firm_role(uuid, text[])  TO authenticated
- **P2** `SETVAL_NON_LITERAL` @ esc_application_schema_and_security_atomic: 1 non-literal setval (e.g. function-local); sample L12721: setval('public.pilot_lifecycle_events_chain_seq_seq', v_next - 1, true)

## Next authorization
Depends on verdict. Do not authorize Docker/SQL replay or production dump until source review PASSes **and** dump is separately authorized. Keep PR #314 draft.
