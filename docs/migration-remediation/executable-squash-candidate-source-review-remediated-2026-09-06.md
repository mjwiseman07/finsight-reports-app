# Executable squash candidate — remediations independent source review (2026-09-06)

**Verdict: CHANGES REQUIRED**

| Pin | Value |
|-----|-------|
| Reviewed HEAD | `9b0c3b1a51e5674742c55b2d47aa0a1ecdaa3fc3` |
| Package seal observed | `99f556ebab0a73e3a58c770776cf3287d5150887ae22de25f80cb6932dd1dacf` |
| Package bytes | `1,130,762` |
| Modules | `7` |
| Candidate SQL/manifest byte-identical to committed blobs | **YES** |
| Prior seal superseded (`ae85b002…` / 8 modules) | **YES** (not selected) |
| Active `supabase/migrations/` ESC versions | **none** |
| Option D manifest SHA-256 | `9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359` |
| Docker / SQL exec / prod dump | **not performed** (not authorized) |
| PR #314 | remains **draft** |

Authority: `git cat-file` / `git show` at reviewed HEAD only (clean detached worktree `finsight-reports-esc-review-9b0c3b1a` used for blob recomputation). Reviewer did not regenerate Option D or modify candidate SQL/manifest.

---

## Part A — Seal verification

All seven modules recomputed from committed blobs; manifest fields match.

| # | Version | Name | Git blob | SHA-256 | MD5 | Bytes | Stmts≈ |
|---|---------|------|----------|---------|-----|------:|-------:|
| 1 | `20260907010000` | platform | `8b8f3199…` | `4b71d1a5…` | `b91ececa…` | 1074 | 1 |
| 2 | `20260907010010` | foundations | `81d90693…` | `5f622b6a…` | `60875424…` | 108827 | ~300+ |
| 3 | `20260907010020` | phase1 atomic | `d55a4911…` | `10a46c63…` | `58e9b513…` | 19918 | ~40 |
| 4 | `20260907010030` | **app+security atomic** | `98936d35…` | `6e0e8c53…` | `f519e5ad…` | 979214 | ~2000+ |
| 5 | `20260907010040` | reference allowlist | `06709f26…` | `a2ae185c…` | `28658991…` | 1021 | 1 |
| 6 | `20260907010050` | guarded init | `6dcc488c…` | `25c01a3e…` | `d820e05f…` | 15876 | ~50 |
| 7 | `20260907010060` | forward-tail | `ca90b19d…` | `f46ffb82…` | `799aa129…` | 4832 | ~21 |

Complete package seal = SHA-256 of the seven entry SHA-256 values joined by `\n` → **`99f556ebab0a73e3a58c770776cf3287d5150887ae22de25f80cb6932dd1dacf`**.

Deterministic regeneration: seal recomputed solely from git blobs (builder not invoked; would rewrite `generatedAt`). Prior eight-module seal cannot be selected from this manifest.

---

## Part B — Exact 151-entry accounting

**Equation: 144 included unchanged in baseline + 6 reviewed transformation overlays + 1 moved to forward-tail = 151**

| Class | Count | Meaning |
|-------|------:|---------|
| Included unchanged in a baseline module | 144 | Foundations, phase1, and module-4 assembled bodies |
| Reviewed transformation / overlay | 6 | d6×4 + tcp1 seed-omitted + grant schema-only (module 6) |
| Moved to forward-tail | 1 | `20260906184500_publish_ledger_event_extensions_digest_qualify.sql` |
| Intentionally excluded | 0 | — |
| Superseded | 0 | — |
| Missing / duplicated | **0 / 0** | — |

### Explaining remediator’s “138 / 6 / 1”
- **138 (claimed)** ≈ app+security assembled sources counted by the builder (`123+15`). Independent marker scan of module 4 found **139** unique `>>> begin` markers (**P1** bookkeeping drift of +1 vs claim; not a missing Option D entry).
- **6** = disposition overlays in module 6 (exact).
- **1** = digest qualify in module 7 only (exact).
- The remaining baseline entries (foundations + phase1 prefix, etc.) sit in modules 2–3 and are inside the **144 unchanged** class — they are not part of the “138” figure.

Digest executable occurrence: **exactly once** (`>>> forward …digest_qualify` in module 7). No `>>> begin` copy in baseline. Final definition contains `extensions.digest`, `'sha256'::text`, and `search_path = public, pg_temp`. Provenance retained via forward marker → `supabase/migrations/20260906184500_…`.

---

## Part C — Prior P0 remediation verdicts

| Remediation | Verdict |
|-------------|---------|
| Module 4 combines app+security in **one proposed version** | **PASS** (single module file / version) |
| Module 4 is **one actual PostgreSQL transaction** | **FAIL — P0** (`BEGIN=50`, `COMMIT=50` nested remnants) |
| Cumulative tables without RLS after every module = 0 | **PASS** (matrix all zeros) |
| `curated_rule_fires` RLS same atomic **module** as create | **PASS** |
| `gap2_purge_table_registry` RLS + service_role-only policy same module | **PASS**; no broad anon/auth grants detected |
| `engagement_posting_policy` RLS same module | **PASS** |
| `publish_ledger_event` / `increment_share_token_access` PUBLIC+anon+authenticated EXECUTE revoked | **PASS** (module 4; comment-stripped grant scan clean for anon/PUBLIC) |
| Comment/literal misclassified as GRANT | **PASS** (strip-comments scanner; historical comment prose sanitized) |
| Digest only in module 7 with required shape | **PASS** |

Owners / live ACLs: **not verified** (no DB access authorized). Static SQL + application callers (`lib/events/publisher.ts`, `lib/close-packet/share-tokens.js`, `lib/gap2/purge-executor.ts`) support service-role-only disposition.

---

## Part D — Transaction / deployability (especially module 4)

**P0 — `MODULE4_NOT_SINGLE_TRANSACTION`:** Module 4 is one dashboard version but **not** one DB transaction. Nested `COMMIT` can make CREATE TABLE visible before later same-file RLS/revokes if a runner executes statements with those markers. Stop-after-module semantics for *versions* are improved vs old 4→5 split; stop-mid-file / statement-runner behavior is **not** atomic.

**P1 — size:** 979,214 UTF-8 bytes — credible CLI/dashboard timeout or payload risk.

No `CREATE INDEX CONCURRENTLY`, client meta-commands (`\echo` etc.), or empty executable bodies detected. Dollar-quote marker count evenness heuristic: no imbalance flagged.

### Secure atomic split design (review-only — **not applied**)
Do **not** silently re-split into insecure windows. Acceptable remediation designs:

1. **Preferred — single version, true transaction:** Strip nested `BEGIN`/`COMMIT`/`ROLLBACK` from concatenated sources inside module 4; wrap the entire module body in exactly one outer `BEGIN`…`COMMIT`; keep RLS/privilege patch at end before the outer `COMMIT`. Preserve one proposed version.

2. **Alternate — multi-version atomic slices:** Partition module 4 into ordered proposed versions where **each** version:
   - is one outer transaction (no nested commits),
   - enables RLS (+ required policies/grants/revokes) for every table it creates **before** its `COMMIT`,
   - preserves function/policy dependency order,
   - leaves cumulative-without-RLS = 0 at every version boundary.
   Digest remains solely in the forward-tail module.

3. **Rejected:** Restoring a “schema module then later security module” stop-window.

---

## Part E — Boundary matrix & adversarial notes

| After module | Created | RLS enables | Unsafe same-module | Cumulative without RLS |
|-------------:|--------:|------------:|-------------------:|-----------------------:|
| 1 | 0 | 0 | 0 | 0 |
| 2 | 43 | 43 | 0 | 0 |
| 3 | 5 | 5 | 0 | 0 |
| 4 | 171 | 171 | 0 | 0 |
| 5 | 0 | 0 | 0 | 0 |
| 6 | 2 | 2 | 0 | 0 |
| 7 | 0 | 0 | 0 | 0 |

DML: tcp1 complimentary seed **omitted**; grant LOCK/operational body **absent**; d6 guarded SELECT pattern **present**. One non-literal `setval` inside pilot lifecycle function (P2 — not a production sequence dump). Multiple `SECURITY DEFINER` creates without `SET search_path` inside the create-chunk heuristic window (**P1**, may be locked later by Q8b in same module — still flagged for follow-up). Authenticated EXECUTE grants on some audit-ready helpers (**P2**, product-shaped).

No auth.users inserts, no ESC leak into active migrations, no platform Auth/Storage recreation in candidate modules beyond prerequisite DO checks.

---

## Part F — Schema comparison / dump

Comparison evidence remains **PARTIAL** vs live production. 47-table G1 / Option D runtime are **not** a complete production match.  
**Full read-only `pg_dump --schema-only` seal remains mandatory before any local replay or mutation auth.**

This review does **not** elevate to `BLOCKED` solely for missing dump: seal/hashes verify; the blocking dump requirement gates **replay**, not this source-hygiene verdict. Verdict remains **CHANGES REQUIRED** due to P0 transaction atomicity.

---

## Findings ranked

### P0
1. **`MODULE4_NOT_SINGLE_TRANSACTION`** — `esc_application_schema_and_security_atomic` — nested `BEGIN=50` / `COMMIT=50`; not one actual transaction (Part C.1 / D).

### P1 (selected)
- `MANIFEST_138_VS_MARKERS` — module 4 begin markers 139 vs claimed 138
- `MODULE4_SIZE_OPERATIONAL_RISK` — ~979KB module
- `SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK` — multiple functions (see JSON lines)
- `SENSITIVE_DML_KEYWORD` — oauth/secret token near INSERT (comment/column-name proximity; no auth row insert proven)

### P2
- `EXECUTABLE_GRANT_TO_AUTHENTICATED` — audit-ready helpers (review least-privilege)
- `SETVAL_NON_LITERAL` — function-local chain `setval`

Full machine-readable list: `docs/migration-remediation/evidence/executable-squash-candidate-source-review-remediated-2026-09-06.json`

---

## Tests & secret scan

| Suite | Result |
|-------|--------|
| ESC package + remediation gates + historical source-review | **24/24 passed** (inventory worktree at same HEAD) |
| Secret scan | **`ok: true`, `hitCount: 0`** |
| Clean worktree blob reseal | **PASS** (seal/bytes/module count) |
| Broader Option D `verifies every original…` | **FAIL (1 file)** — see below |
| Option D assemble-driven tests | Prior **timeouts** when assemble rewrites manifests (duration/side-effect), not ESC seal drift |

### Broader suite diagnosis (no artifacts committed)
- Failure is **genuine pin drift**, not flaky nondeterminism: `supabase/migrations/20260821183525_journal_entry_executions.sql` at HEAD SHA-256 `63eb55cb…` vs Option D manifest `originalSha256` `3212b999…` (matches `assembleAuthority.sourceCommit` `93363371…`).
- Assembled blob at HEAD still matches pinned `assembledSha256` `3212b999…` (ESC embeds assembled lineage).
- Test reads originals at **current HEAD** rather than `assembleAuthority.sourceCommit` → fails after main moved that one file.
- Assemble timeouts: separate **runtime-duration / mutating assemble** issue when those tests invoke the assembler.

---

## Candidate immutability
Candidate SQL modules + `MANIFEST.json` were **not** modified by this review. Only review harness, report, evidence JSON, and non-mutating tests may be committed.

## Exact next bounded authorization
Authorize **candidate remediation** to make module 4 a **true single transaction** (preferred: strip nested txn markers + one outer `BEGIN`/`COMMIT`) **or** implement the secure multi-version atomic split above — still under `supabase/migrations-draft/executable-squash-candidate/` only; no Docker, SQL exec, prod dump, branch, or active-migration edits. Then a **third independent source review**. Do **not** authorize production schema dump until a source review returns `PASS_SOURCE_REVIEW` on transaction atomicity **and** boundary/security gates.
