# Independent source review — executable squash candidate (2026-09-06)

**Verdict: CHANGES REQUIRED**

**Authorization:** review-only. Candidate SQL + `MANIFEST.json` **byte-identical** (not modified).  
**Reviewed HEAD:** `524ada4933c7d326e79cf69cb69bb88aed7a5c08`  
**Package seal:** `ae85b00270d3b89f6e8f57cb6851dec19aba2b860dd0de89126bc93643555d28` (recomputed from git blobs: **MATCH**)  
**Package bytes:** 1,132,090 (**MATCH**)  
**Production mutation / local replay:** still **NO**

Machine-readable twin: `docs/migration-remediation/evidence/executable-squash-candidate-source-review-2026-09-06.json`

---

## Part A — Seal and provenance

| Check | Result |
|-------|--------|
| Per-module git blob ID / SHA-256 / MD5 / LF bytes vs manifest | **8/8 MATCH** (via `git cat-file blob`, not worktree) |
| Independent package seal | **MATCH** |
| Option D manifest SHA-256 `9dc080cf…` | **MATCH** |
| Option D order entries missing from modules | **0** |
| Duplicated source across modules | **1 real:** `20260906184500_publish_ledger_event_extensions_digest_qualify.sql` in **module 4 and module 8** |
| Active `supabase/migrations/` contains ESC versions | **No** |

**Source accounting:** 151 Option D entries accounted (included or disposition-transformed). Substitutions (7) applied as documented overlays in module 7 (d6×4, tcp1 seed-omitted, grant schema-only). Forward digest file incorrectly also embedded in module 4 body via Option D assemble inclusion — see P0.

---

## Part B — Executable SQL (highlights)

- Module 2 foundations: 43 creates / 43 RLS enables in-module — boundary OK for foundations.
- Module 3 phase1 atomic: 5/5 RLS — OK for historical CREATE→RLS window closure intent.
- Module 4 (906,182 bytes): 166 creates / 165 same-module RLS; **2 gaps**; nested BEGIN/COMMIT markers preserved (P1 runner risk).
- Module 5: additional creates/hardening; does **not** fully close module 4 gaps for all tables.
- Invalid CREATE OR REPLACE VIEW / overload / platform recreation: no automated P0 beyond grant/RLS items; still requires dump seal before claiming completeness.
- Destructive DROP/TRUNCATE of auth: **none** detected.

---

## Part C — Failure-boundary security matrix

| After module | Creates in module | RLS enables in module | Creates w/o same-module RLS | Cumulative tables still w/o RLS |
|-------------:|------------------:|----------------------:|----------------------------:|--------------------------------:|
| 1 | 0 | 0 | 0 | 0 |
| 2 | 43 | 43 | 0 | 0 |
| 3 | 5 | 5 | 0 | 0 |
| **4** | **166** | **165** | **2** | **2** |
| 5 | 5 | 6 | 1 | 1 |
| 6 | 0 | 0 | 0 | 1 |
| 7 | 2 | 2 | 0 | 1 |
| 8 | 0 | 0 | 0 | **1** |

**Challenge result:** Module 4 → Module 5 split is **not acceptable**. Stopping after module 4 leaves application tables without RLS. Final package still leaves `gap2_purge_table_registry` without `ENABLE ROW LEVEL SECURITY`.

Anon execute grants appear in module 5 (`increment_share_token_access`, `publish_ledger_event`) — treat as P0 until proven intentional least-privilege for empty/partial DBs.

No `GRANT EXECUTE … TO PUBLIC` detected.

---

## Part D — DML

| Kind | Count (approx scan) | Notes |
|------|--------------------:|-------|
| INSERT | 110 | Includes guarded d6 + foundations reference seeds + lineage seeds |
| UPDATE | 210 | Registry/activation updates; grant operational UPDATE **absent** from module 7 |
| DELETE | 2 | Review in remediation |
| COPY | 1 | **Comment false-positive** (“Copy auth.users.created_at…”) |
| SETVAL | 1 | Dynamic `setval(..., v_next - 1, true)` — not a literal production sequence value |

**Confirmed:**
- d6 guards present (`INSERT…SELECT` from `firm_clients`)
- tcp1 complimentary seed **absent** (OMITTED marker)
- accounting grant LOCK/RAISE/UPDATE operational body **absent**
- No customer/Auth row payloads embedded in reviewed scans

---

## Part E — Schema / security contract gaps

| Gap | Severity |
|-----|----------|
| Production schema contract is **foundation+phase1 (47 tables)** only | High |
| Package body authority is Option D PASS lineage, not sealed live `pg_dump --schema-only` | High |
| Live prod has far larger surface (e.g. hundreds of policies) — unexplained drift **not** proven zero | High |
| Security contract JSON is assertion-oriented, **not** a complete object inventory | High |

**Mandatory before local replay:** yes — a new **read-only full production `pg_dump --schema-only` seal** (separate authorization). Static source review **cannot** substitute.

---

## Findings (P0–P3)

### P0 (must fix before any replay auth)
1. **MODULE4_TABLES_WITHOUT_RLS_BEFORE_MODULE5** — `curated_rule_fires`, `gap2_purge_table_registry` created in module 4 without same-module RLS.
2. **FINAL_PACKAGE_TABLES_WITHOUT_RLS** — `gap2_purge_table_registry` never enabled after all modules.
3. **SOURCE_DUPLICATED_ACROSS_MODULES** — digest-qualify SQL in modules **4 and 8**.
4. **ANON_EXECUTE_GRANT** — `increment_share_token_access`, `publish_ledger_event` granted to `anon` in module 5 (prove or restrict).

### P1 (fix before mutation; may block replay)
- Nested transaction markers in module 4 concatenation
- Many SECURITY DEFINER chunks without `search_path` in the first 400 characters of CREATE (needs exact statement-level confirmation)
- Forward-tail methodology previously timestamp-based; digest duplicate indicates assemble/forward boundary hygiene issues

### P2
- Intentional-looking `GRANT EXECUTE … TO authenticated` (9+) — product least-privilege review

### P3
- None raised beyond documentation polish

---

## Adversarial gates / tests

Review harness: `scripts/migration-remediation/review-executable-squash-candidate-source.js`  
Fail-closed tests: `tests/migration-remediation/executable-squash-candidate-source-review.test.ts`

---

## Candidate integrity

| Artifact | Modified by this review? |
|----------|--------------------------|
| Module SQL (8) | **No** |
| `MANIFEST.json` | **No** |
| Package seal | **Unchanged / verified** |

---

## Exact remediation authorization needed before local replay

Authorize **candidate package remediation** (still draft / non-deployable) to:
1. Co-locate RLS (and required grants) with table creation for every public app table — eliminate unsafe module 4→5 window; enable RLS on `gap2_purge_table_registry`.
2. Remove duplicate digest-qualify inclusion (keep a single ordered home).
3. Justify or revoke anon execute on sensitive RPCs for data-less/partial replay.
4. Obtain **separate** authorization for read-only full production schema-only dump seal.
5. Re-run independent source review to **PASS_SOURCE_REVIEW** before any local replay auth.

**Do not** authorize Docker/local replay or production mutation on the current package.
