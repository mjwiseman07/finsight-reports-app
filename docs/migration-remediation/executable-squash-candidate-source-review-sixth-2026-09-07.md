# ESC sixth independent source review — 2026-09-07

**Verdict: PASS_SOURCE_REVIEW**

| Pin | Value |
|-----|-------|
| Reviewed HEAD | `c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6` |
| Seal | `170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e` |
| Prior seal superseded | `75b3466195ad01ae336cb1a5f6e89f29232757b2d048dd68ac9ad50bad1d049b` |
| Bytes | 1,191,852 |
| Modules | 12 |
| Candidate SQL/manifest byte-identical | **true** |
| Local replay readiness | **NO** |
| Production dump authorized | **NO** |
| Production-schema parity claimed | **NO** |

Review authority: `git cat-file` / `git show` at pinned HEAD only. Candidate SQL and `MANIFEST.json` were not modified.

**Scope:** This PASS is limited to independently verified source integrity, security/privilege closure, transaction/dependency/DML allowlist posture, and frozen provenance. It does **not** claim live production schema parity or authorize local replay.

Machine evidence: `docs/migration-remediation/evidence/executable-squash-candidate-source-review-sixth-2026-09-07.json`  
Harness: `scripts/migration-remediation/review-executable-squash-candidate-sixth-source.js`

## Part A — package integrity

Independently recomputed from committed blobs:

- Package seal **matches** `170b7105…`
- Package bytes **1,191,852**; **12** modules; each manifest `gitBlobId` / SHA-256 / MD5 / LF length verified
- Source accounting: **`144 unchanged + 6 overlays + 1 forward = 151`**
- Digest-qualification: **exactly 1** (forward-tail `20260907010060`)
- Missing/duplicate Option D operations: **0**
- Active `supabase/migrations/`: no ESC `202609070100*` contamination

### Per-module hash / transaction (summary)

| Order | Version | utf8LfBytes | BEGIN/COMMIT | Risk |
|------:|---------|------------:|:------------:|------|
| 1 | 20260907010000 | 1,074 | 0/0 | LOW |
| 2 | 20260907010010 | 111,920 | 1/1 | MODERATE |
| 3 | 20260907010020 | 20,392 | 1/1 | LOW |
| 4 | 20260907010030 | 206,856 | 1/1 | HIGH (rehearsal) |
| 5 | 20260907010031 | 189,013 | 1/1 | HIGH (rehearsal) |
| 6 | 20260907010032 | 209,503 | 1/1 | HIGH (rehearsal) |
| 7 | 20260907010033 | 205,787 | 1/1 | HIGH (rehearsal) |
| 8 | 20260907010034 | 150,931 | 1/1 | MODERATE |
| 9 | 20260907010035 | 72,707 | 1/1 | LOW |
| 10 | 20260907010040 | 1,021 | 0/0 | LOW |
| 11 | 20260907010050 | 16,797 | 5/5 | LOW (guarded blocks) |
| 12 | 20260907010060 | 5,851 | 0/0 | LOW |

## Part B — four JE dispatch RPCs — **PASS**

| Identity | svc | auth/anon/PUBLIC | Caller |
|----------|-----|------------------|--------|
| `…_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text)` | grant | revoke | `provider-dispatch-repository.ts:81` |
| `…_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)` | grant | revoke | `:123` |
| `…_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)` | grant | revoke | `:168` |
| `…_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)` | grant | revoke | `:212` |

- Exact identities present; slice `10034` net-at-COMMIT grants service_role; no later cancel
- Callers use `getSupabaseAdmin()` (service-role only); no browser path
- PREPARE/CREATE/VERIFY remain OFF; sandbox + production kill switches engaged
- DB EXECUTE alone does not activate dispatch

## Part C — retained grants — **PASS**

Independent inventory vs committed retained-grant report: **no diff**; seal matches.

| Metric | Count |
|--------|------:|
| CREATE hits | 116 |
| Unique identities | 95 |
| trigger_only | 52 |
| internal_service_role_only | 28 |
| migration_admin_or_internal | 10 |
| authenticated_rls_helper | 5 |
| Retained service_role (incl. helpers) | 33 |
| Revoked-but-called | **0** |

- **`next_document_number(uuid,text)`** — service_role **retained**; `numbering.ts` `.rpc` + `createServiceClient` in requisitions/PO services — **PASS**
- **`sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb)`** — service_role **revoked**; no lib/script `.rpc('sp_write_anchor_batch')` caller — **PASS** (owner/admin only)
- Trigger-only: no service_role EXECUTE retained — **PASS**
- Anonymous RPC count: **0**

## Part D — public.users — **PASS**

| Check | Result |
|-------|--------|
| Stale FOR UPDATE policy | **Absent** |
| authenticated | **SELECT only** |
| UPDATE/INSERT/DELETE (table/column) | **Absent** |
| PUBLIC / anon | **Revoked** |
| Own-row SELECT RLS | **Present** |
| Browser `.from('users').update` | **None** |
| service_role ALL | **Retained** |

## Part E — per-COMMIT security — **PASS**

Across all 12 modules:

- Application tables without RLS: **0**
- PUBLIC execute gaps at COMMIT: **0**
- Named priors (`curated_rule_fires`, `gap2_purge_table_registry`, `engagement_posting_policy`): CREATE+ENABLE same module
- `publish_ledger_event`: create-time `search_path` + forward `extensions.digest(..., sha256)` — **PASS**

## Part F — txn / DML / size

- App/security/phase1 slices: single outer BEGIN/COMMIT — **PASS**
- Module size: slices `10030`–`10033` remain **HIGH_TIMEOUT_LOCK_RISK_FOR_LOCAL_REHEARSAL** (not a source-seal failure)
- DML allowlist / guarded d6 / omitted tcp1 seed / no customer-row embeds — consistent with prior gates

## Part G — frozen authority / dump

- Option D manifest SHA-256 `9dc080cf…` matches
- HEAD vs frozen assemble authority: `EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY`
- Comparison: `PARTIAL_COVERAGE_DOCUMENTED`; `readyForLocalReplay: false`
- **Full production `pg_dump --schema-only` remains mandatory before local replay**

## Findings ranked

**None (P0–P3: 0)**

## Tests / secret scan

- Sixth-review harness + Vitest gates (this commit)
- Broader ESC / prior-review gates: non-mutating
- Secret scan: must be clean
- Candidate seal unchanged by this review commit

## Exact next bounded authorization

This PASS does **not** authorize dump, Docker, SQL execution, or active migration changes.

**Next:** separately authorize a **read-only full production `pg_dump --schema-only` seal** (and only after that, a bounded local replay rehearsal authorization). Keep PR #314 draft until those steps are explicitly authorized and reviewed.
