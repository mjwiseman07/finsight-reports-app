# ESC fifth independent source review — 2026-09-07

**Verdict: CHANGES REQUIRED**

| Pin | Value |
|-----|-------|
| Reviewed HEAD | `1a4c8182b68a2506f85140970073558fb1b1ebb2` |
| Seal | `75b3466195ad01ae336cb1a5f6e89f29232757b2d048dd68ac9ad50bad1d049b` |
| Prior seal superseded | `c5c360d8325e2cbfa474d97ea0d33e0f2449ab89820770146def8c4c13da5a37` |
| Bytes | 1,191,052 |
| Modules | 12 |
| Candidate SQL/manifest byte-identical | **true** |
| Local replay readiness | **NO** |
| Production dump authorized | **NO** |

Review authority: `git cat-file` / `git show` at pinned HEAD only. Candidate SQL and `MANIFEST.json` were not modified by this review.

Machine evidence: `docs/migration-remediation/evidence/executable-squash-candidate-source-review-fifth-2026-09-07.json`  
Harness: `scripts/migration-remediation/review-executable-squash-candidate-fifth-source.js`

## Part A — seal and accounting

Independently recomputed from committed blobs:

- Package seal **matches** `75b3466195ad01ae336cb1a5f6e89f29232757b2d048dd68ac9ad50bad1d049b`
- Package bytes **1,191,052**; **12** modules; each manifest `gitBlobId` / SHA-256 / LF length verified
- Source accounting: **`144 unchanged + 6 overlays + 1 forward = 151`**
- Digest-qualification operation: **exactly 1** (forward-tail `20260907010060`)
- Missing/duplicate Option D operations: **0**
- Active `supabase/migrations/`: no ESC `202609070100*` contamination

### Per-module hash / transaction (summary)

| Order | Version | utf8LfBytes | BEGIN/COMMIT | Nested txn |
|------:|---------|------------:|:------------:|:----------:|
| 1 | 20260907010000 | 1,074 | 0/0 | n/a (contract) |
| 2 | 20260907010010 | 111,885 | 1/1 | 0 |
| 3 | 20260907010020 | 20,392 | 1/1 | 0 |
| 4 | 20260907010030 | 206,856 | 1/1 | 0 |
| 5 | 20260907010031 | 189,013 | 1/1 | 0 |
| 6 | 20260907010032 | 209,503 | 1/1 | 0 |
| 7 | 20260907010033 | 205,787 | 1/1 | 0 |
| 8 | 20260907010034 | 150,947 | 1/1 | 0 |
| 9 | 20260907010035 | 71,926 | 1/1 | 0 |
| 10 | 20260907010040 | 1,021 | 0/0 | n/a (contract) |
| 11 | 20260907010050 | 16,797 | 5/5 | guarded init blocks |
| 12 | 20260907010060 | 5,851 | 0/0 | n/a (forward) |

Full blob IDs / SHA-256 / MD5: evidence JSON `hashResults`.

## Part B — public.users security — **PASS** (prior P0 closed)

Independently rebuilt from executable SQL + repository writer trace:

| Check | Result |
|-------|--------|
| PUBLIC / anon table privileges | **Revoked / absent** |
| authenticated | **SELECT only** |
| authenticated table/column UPDATE | **Revoked** (no column UPDATE grants) |
| authenticated INSERT / DELETE | **Absent** |
| service_role | **ALL retained** (server/admin writers) |
| Own-row SELECT RLS | **Present** |
| Browser `.from('users').update` | **None found** |
| Signup / billing / trial / account writers | **service_role / supabaseAdmin** |

**P2** only: stale `FOR UPDATE` own-row RLS policy remains in `10010` after table UPDATE revoke (dead policy; not a write path). Prefer drop on next remediation.

Contract pin: `docs/migration-remediation/evidence/executable-squash-candidate-public-users-column-contract.json`.

## Part C — function identity / privilege closure — **FAIL (P0)**

| Metric | Count |
|--------|------:|
| CREATE [OR REPLACE] FUNCTION hits | 116 |
| Unique normalized identities | **95** |
| trigger_only | 52 |
| internal_service_role_only | 24 |
| migration_admin_or_internal | 14 |
| authenticated_rls_helper | 5 |
| anonymous_public_rpc | **0** |
| Retained net `service_role` EXECUTE | 30 |
| `service_role` revoked but live `.rpc()` callers | **4** |

Same-slice / net-at-COMMIT PUBLIC EXECUTE gaps: **0**.

### P0 — JE provider-dispatch RPCs revoked despite live service callers

Module `20260907010034` end-of-slice privilege closure **REVOKEs** `service_role` EXECUTE on four functions that `lib/journal-entry-governance/provider-dispatch-repository.ts` calls via `getSupabaseAdmin().rpc()`:

| Identity | Caller | Net |
|----------|--------|-----|
| `apply_journal_entry_provider_dispatch_started(...)` | `:81` | **revoke** |
| `apply_journal_entry_provider_posted(...)` | `:123` | **revoke** |
| `apply_journal_entry_provider_post_unknown(...)` | `:168` | **revoke** |
| `apply_journal_entry_provider_precommit_failed(...)` | `:212` | **revoke** |

Root cause: names absent from `SERVICE_ROLE_RPC_NAME_ALLOWLIST` in `esc-privilege-remediation.js`, so classified `migration_admin_or_internal` and revoked at COMMIT.

### Retained service_role grants (caller evidence)

Proven allowlisted RPCs with concrete callers include: `publish_ledger_event`, `increment_share_token_access`, JE persist/transition/attempt/verify RPCs, gap2 purge RPCs, continuous-close observe, audit-ready recon/kickout helpers, `sp_list_public_columns`. Full list: evidence `retainedServiceRoleGrants`.

**P1** retained without proven app/lib caller:

- `public.next_document_number(uuid,text)` @ `10031` (~L3430) — on allowlist but no repository `.rpc()` hit
- `public.sp_write_anchor_batch(...)` @ `10035` (~L1576) — not on allowlist; net grant retained

Authenticated RLS helpers retain EXECUTE as designed (not P0).

## Part D — SECURITY DEFINER

- Every `publish_ledger_event` CREATE/REPLACE inspected: create-time `SET search_path = public, pg_temp` present in app slices (**PASS**; prior P1 closed)
- Forward-tail `10060` final definition includes `extensions.digest(..., 'sha256'::text)` (**PASS**)
- No P0 DEFINER/search_path findings on this pass
- Trigger-only identities: no retained `service_role` EXECUTE (**PASS** vs fourth-review hygiene goal)

## Part E — per-COMMIT security matrix

Across all 12 modules after each COMMIT boundary:

| Requirement | Result |
|-------------|--------|
| Application tables without RLS | **0** |
| Unintended PUBLIC/anon privileges | **0** (users + function PUBLIC gaps) |
| Browser writes to `public.users` | **0** |
| Internal functions exposed to browser roles | **0** (anon RPC allowlist empty) |
| Unjustified service-role function grants | **P0/P1 as above** |
| Unsafe SECURITY DEFINER | **0** new |
| Objects first secured by a later module | **0** for named priors |

Named recheck:

| Object | Result |
|--------|--------|
| `curated_rule_fires` | CREATE + ENABLE same module **PASS** |
| `gap2_purge_table_registry` | same **PASS** |
| `engagement_posting_policy` | CREATE→ENABLE same `10031` **PASS** |
| `publish_ledger_event` | search_path + digest **PASS** |
| `increment_share_token_access` | service_role + caller **PASS** |
| Patent #6 / SI / Memory / custody / execution / provider-attempt | RLS closure **PASS**; dispatch apply RPCs **P0** |

## Part F — transaction / DML / size

- Transactional app/security slices: single outer BEGIN/COMMIT (**PASS**)
- Module `10050`: five guarded BEGIN/COMMIT blocks (documented dataless-safe init) — not nested inside a single outer txn
- Extension ops: contract modules only; OK for later rehearsal context
- DML allowlist posture: no customer/Auth/provider/custody/Memory/accounting row embeds detected in review gates; tcp1 complimentary seed remains omitted; d6 replacements remain guarded
- Module size: slices `10030`–`10033` flagged **HIGH_TIMEOUT_LOCK_RISK_FOR_LOCAL_REHEARSAL** (not a seal failure)

## Part G — frozen authority / comparison scope

- Option D manifest SHA-256 pin `9dc080cf…` **matches**
- HEAD vs frozen `assembleAuthority.sourceCommit`: drift documented as `EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY` (candidate not mutated by HEAD drift)
- Active migrations unchanged / no ESC versions
- Comparison remains `PARTIAL_COVERAGE_DOCUMENTED`; `readyForLocalReplay: false`
- **Full production `pg_dump --schema-only` seal remains mandatory before local replay**

## Findings ranked

- **P0** `SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED` @ `20260907010034:3905` — `apply_journal_entry_provider_dispatch_started`
- **P0** `SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED` @ `20260907010034:3910` — `apply_journal_entry_provider_posted`
- **P0** `SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED` @ `20260907010034:3915` — `apply_journal_entry_provider_post_unknown`
- **P0** `SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED` @ `20260907010034:3920` — `apply_journal_entry_provider_precommit_failed`
- **P1** `SERVICE_ROLE_EXECUTE_WITHOUT_PROVEN_CALLER` @ `20260907010031:3430` — `next_document_number`
- **P1** `SERVICE_ROLE_EXECUTE_WITHOUT_PROVEN_CALLER` @ `20260907010035:1576` — `sp_write_anchor_batch`
- **P2** `USERS_STALE_UPDATE_RLS_POLICY` @ `10010` — dead FOR UPDATE policy

## Tests / secret scan

- Fifth-review harness + non-mutating Vitest gates (this commit)
- Secret scan: must be clean
- Candidate seal unchanged by this review commit

## Exact next bounded authorization

**Candidate-only remediation** (no Docker / SQL exec / dump / branch / active migrations):

1. Add the four JE provider-dispatch RPC names to `SERVICE_ROLE_RPC_NAME_ALLOWLIST` and regenerate privilege closure so net-at-COMMIT **GRANT EXECUTE TO service_role** for those exact signatures.
2. Optionally: prove or revoke `next_document_number` / `sp_write_anchor_batch`; drop stale users UPDATE RLS policy.
3. Then authorize a **sixth independent source review** bound to the new seal.

Do **not** authorize production dump, local replay, Docker, or PR ready/merge on this verdict.

Keep PR #314 **draft and unmerged**.
