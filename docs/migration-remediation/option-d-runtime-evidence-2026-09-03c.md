# Option D local runtime evidence (FAILURE — stopped)

**Date:** 2026-09-03 (late evening run / UTC 2026-09-04)  
**Overall:** `BLOCKED` / `candidateReplay: FAIL`  
**Stopped on:** migration apply failure after incorrectly continuing past an authorization manifest-hash mismatch

## Authorization integrity (blocker acknowledged)

| Field | Full value |
|-------|------------|
| Tested HEAD | `6e24a5aa3558298a926e23344215bf3eeea2729b` |
| Authorization expected Manifest SHA-256 | `ff4c5ff1656b5d253b61397e63bb3d8dad946821d8cf9d23df0638089dd8fecb` |
| Observed committed manifest content SHA-256 | `dad4032ecefbb79a9d1a61ba8e843f7e7ea10c8fbe721b9de3ffadbb9b61fc29` |
| Match | **NO** |
| Execution continued despite mismatch | **YES — process defect** |
| Justification used at runtime (invalid) | Zero per-entry `assembledSha256` failures + commit pin |

**Correct behavior (not followed):** abort **before** any SQL writes when the authorized whole-file Manifest SHA-256 does not equal SHA-256 of the exact committed/on-disk `docs/migration-remediation/option-d-replay-manifest.json` bytes. Entry hashes, Git blob OID, and re-assemble output hashes must not substitute for the authorized Manifest SHA-256.

See `option-d-manifest-hash-explanation.json` for which artifact each hash identifies.

## Tested commits

| Ref | SHA |
|-----|-----|
| PR #313 HEAD (pin) | `6e24a5aa3558298a926e23344215bf3eeea2729b` |
| PR #312 pin | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` |
| PR #312 suite blob | `6dfc99e23b8206d3d70b19c8a7d4758d22e0f770` (content match verified before run) |

## Runtime versions

| Component | Version |
|-----------|---------|
| Node | v24.16.0 |
| Vitest | 4.1.9 (not executed — apply failed first) |
| Docker Engine | 29.7.2 |
| Supabase CLI | 2.116.0 |
| Assembled migrations | **149** |
| Recovered required originals | **9** |
| Per-entry assembled hash verification | **0 failures** (insufficient for authorization) |
| Required unresolved table/function/column/constraint/assertion deps | **0** |
| Assertion Part sequence in manifest | Part1→2→3→4→5→6 at orders **36→37→38→47→48→49** |

Installed software **left in place**: Docker Desktop, WSL, Scoop, Supabase CLI.

## Target (redacted)

`host=127.0.0.1;port=54322;db=option_d_clean_replay`

Platform bootstrap used: allowlisted **schema names** + auth schema-only dump from local Supabase `postgres`; empty `public`; empty `supabase_migrations.schema_migrations`. Freshness guard **PASS** and target-safety **PASS** before apply under the **then-current** rules (schema-name allowlist only).

**Second blocker:** `storage` schema existed but required platform catalog tables (`storage.buckets`, and later `storage.objects`) did **not**. Freshness treated schema presence as sufficient; that is incomplete Supabase platform bootstrap.

## Migration apply result

| Metric | Value |
|--------|-------|
| Assembled migrations | **149** |
| Completed before failure | **30** (orders 1–30) |
| Failed order | **31** |
| Failed file | `20260704_0100_d6_4a_je_evidence_attachments_backup.sql` |
| SQLSTATE | `42P01` |
| Error | `relation "storage.buckets" does not exist` |
| Statement (position ~5520) | `INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES ('je-backup', …) ON CONFLICT (id) DO NOTHING;` |
| Object / dependency context | Requires Supabase Storage catalog table `storage.buckets` (and later policies on `storage.objects`). |
| Routine | `parserOpenTable` |
| SQL application attempts | **31** (orders 1–30 succeeded; order 31 failed) — should have been **0** given Manifest SHA mismatch |

### Completed (orders 1–30)

1. `20260701043599_foundations_baseline.sql`
2. `20260701043602_phase1_subscriptions_core.sql`
3. `20260701043707_phase1_subscription_seats_and_entitlements.sql`
4. `20260701043911_phase1_backward_compat_view.sql`
5. `20260701043931_phase1_entitlement_rls_policies.sql`
6. `20260701_refund_requests.sql`
7. `20260702041259_add_received_at_to_stripe_webhook_events.sql`
8. `20260702_create_mfg_waitlist.sql`
9. `20260703_00_create_close_ledger.sql`
10. `20260703_01_create_checklist_system.sql`
11. `20260704024059_d_entitlements_legacy_stripe_rename.sql`
12. `20260707_create_close_packet_system.sql`
13. `20260707_01_variance_config_unique.sql`
14. `20260707_02_section_manual_edit_flag.sql`
15. `20260707_03_close_packet_share.sql`
16. `20260708120000_tcp1_w1_solo_bk_pilot_slots.sql`
17. `20260708140000_tcp1_w1_pilot_slot_number_nullable.sql`
18. `20260708150000_tcp1_w1_pilot_slots_firm_id.sql`
19. `20260708200000_tcp1_w1_seat_idempotency.sql`
20. `20260708_00_d0_identity_and_memory_activation.sql`
21. `20260703_2000_d6_2a_test_client_activation.sql`
22. `20260703_2200_d6_2b_mfg_activation.sql`
23. `20260703_2300_d6_2c_retail_activation.sql`
24. `20260703_2400_d6_2d_ps_activation.sql`
25. `20260705_d67_p1_ar_cash_app_layer0_layer1.sql`
26. `20260706_d67_p2_layer2_layer4.sql`
27. `20260708_01_d1_qbo_write_readiness.sql`
28. `20260708_02_d1_1_owner_user_id_backfill.sql`
29. `20260709070000_tcp1_w2_5_review_assist_tier_key_expand.sql`
30. `20260709_00_d2_safe_je_posting.sql`

### Note vs prior assertion-order failure

Prior FAIL at order 13 (Part 3 before Part 2) did **not** recur. Manifest orders place Parts 1→6 at 36→37→38→47→48→49. Apply advanced through order 30 and failed on Storage catalog dependency.

## Distinct gate results

| Scope | Result |
|-------|--------|
| Manifest authorization hash gate | **SHOULD HAVE FAILED CLOSED** (was not implemented; run continued) |
| Fresh-DB / target-safety precheck | PASS under incomplete rules (schema names only) |
| Platform catalog preflight | **MISSING** (would have failed closed on absent `storage.buckets`) |
| Candidate replay apply | **FAIL** at order 31 |
| Schema / RLS / view / SI-Memory immutability | **BLOCKED** |
| PR #312 Vitest (12 expected) | **BLOCKED** |
| `productionDashboardReplayParity` | `unresolved` |

## Explicit non-actions

No paid cloud resources, no Supabase branches, no production access/changes, no merge/deploy, no active migration promotion, no QBO/OAuth, no live custody/Memory writes, no capability changes, no SQL patch/reorder/omit to force PASS. PR #313 remains draft; PR #312 HEAD unchanged. Runtime remediation deferred to separate review-only authorization (this evidence commit does not authorize another replay).

## Cleanup

See `docs/migration-remediation/option-d-runtime-cleanup-2026-09-03c.json`.
