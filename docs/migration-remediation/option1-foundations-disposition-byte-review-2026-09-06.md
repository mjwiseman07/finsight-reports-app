# Foundations-gap disposition + byte review — design only (2026-09-06)

**Authorization:** design-only foundations-gap disposition and byte-level candidate review.  
**Production mutation:** **not authorized; none performed.**  
**Bound:**
| Pin | Value |
|-----|-------|
| Project | `jzmdgwwiestcmmeuhhkr` |
| main HEAD | `9d8a01d37422179ddd68bbd181a8815d8a893577` |
| Inventory PR #314 HEAD (pre-this-commit) | `9c0b00e35f8ce691e1f68755f16bde2ef4c826b7` |
| Inventory | 185 versions, 1 statement each; earliest `20260701043602` |
| Foundations candidate | `20260701043599` |
| Option D manifest | blob `0d2a39a3…` · SHA-256 `9dc080cf…` · PASS 151/151 |
| Dashboard/MCP parity | **unresolved** |
| CLI inspected | Supabase CLI **2.116.0** (`migration repair` / `migration squash` help + official docs + CLI upsert source) |

PR #314 remains **draft / unmerged** for this authorization.

---

## Part A — Independent PR #314 review verdict

| Check | Result |
|-------|--------|
| Diff scope | **8 files, docs/evidence/scripts/tests only** — no `app/`, no `lib/`, no active `supabase/migrations/` |
| Default mutation | Inventory scripts consume **pre-exported hash JSON only**; no `db push`, `migration repair`, `apply_migration`, or `UPDATE schema_migrations` |
| Totals / hashes | Re-verified against committed evidence: 185 versions; dual hash PASS; manifest pins PASS; d6 targets + phase1 MD5s match |
| Tests | `option1-prod-inventory` + `review-gate`: **23/23 PASS** (this session) |
| Secret scan | **0 hits** |
| Draft status | Converted to **draft** during this review (was accidentally ready) |

**Verdict:** PR #314 is **acceptable as read-only inventory evidence**. Keep draft; do not merge as “parity done.”

---

## Part B — Foundations mechanism decision

### Verified CLI / dashboard behavior (executable `statements[]`)

| Mechanism | Executes SQL on target DB? | Writes `statements[]`? | Notes |
|-----------|----------------------------|-------------------------|-------|
| `supabase db push` / apply | **Yes** | **Yes** (from applied file) | Normal path |
| `supabase migration repair --status applied` | **No** (docs: tracking only — does not apply/revert SQL) | **Yes** — CLI upserts `version, name, statements` from **local migration file contents** (CLI source: `UPSERT_MIGRATION_VERSION`; community reports “populates statements column properly”) | Critical distinction: **tracking change + statement body copy**, not schema apply |
| `supabase migration repair --status reverted` | **No** | Deletes history row | Does not undo DDL |
| `supabase migration squash` | Local rebuild helper | N/A to prod history directly | **Schema-only dump**; **omits INSERT/UPDATE/DELETE**, cron, storage buckets, vault secrets — must re-add manually |
| Dashboard / MCP branch create | Replays production `schema_migrations.statements[]` | N/A | Failures leave contaminated partial schema (G2 evidence) |
| GitHub-integrated preview | Replays **git** `supabase/migrations/` | N/A | Different authority than dashboard |

**Do not equate** `migration repair` with “no statements.” Official docs emphasize no SQL execution; installed CLI still **records local file SQL into `statements[]`** when marking applied. **Do not equate** `migration squash` with a production-executable parity package — it is a local schema dump that drops DML.

### Mechanism 1 — Insert/record `20260701043599` before phase1

| Dimension | Assessment |
|-----------|------------|
| Rows inserted | One new history row `20260701043599` / `foundations_baseline` with executable `statements[]` (via apply-once **or** repair-applied from draft file if objects already exist) |
| Rows replaced | None required for foundations alone; d6 same-version replaces still needed separately |
| Rows retained | All **185** production versions remain |
| Rows retired | None |
| Executable statements? | Only if file SQL is recorded into `statements[]` — **repair-applied can do that without executing**; repair-only with empty local file would be tracking-only and **fails dashboard** |
| Data-less dashboard obtain schema | Foundations row + remaining 185 prod statements (still fails at unguarded d6 unless also replaced) |
| GitHub vs dashboard converge? | **No** — 185 production-only version keys vs ~109 git-only remain; **0 exact version/body matches** persist |
| Effect of 185 / 109 split | **Permanently preserved** — insert deepens dual authority |
| Phase1 recovered (4) | Retained as-is (MD5s already match prod); still depend on foundations objects existing before them |
| Later prod migrations | Retained; still include unguarded d6 + grant RAISE path |
| PR #312 git-only / unapplied-by-version | Untouched; JE objects already appear in late prod versions under **different** version keys |
| Partial-replay RLS | Medium — fail after foundations+phase1 still possible at d6; contaminated branch |
| Txn / recovery | Foundations draft uses BEGIN/COMMIT; nested txn risk if runner wraps; failure → delete branch |
| CLI/dashboard compatibility | Insert via repair-applied is CLI-compatible for history; dashboard replay order gains one prefix step |
| Rollback | Revert foundations history row; schema may already have objects (no drop) |
| Long-term workflow | **Worst** — institutionalizes split lineage; every new migration needs dual mapping |

**Reject as primary path.** Acceptable only as a temporary dashboard hotfix **if** squash is impossible — not recommended given inventory.

### Mechanism 2 — Approved executable squash / baseline (primary)

| Dimension | Assessment |
|-----------|------------|
| Rows inserted | New baseline version(s) with **full executable** `statements[]` = schema dump of live prod **plus** manually restored data-less-safe reference DML / grants / buckets as required |
| Rows replaced / retired | **All 185** current production history rows reverted/retired after backup; replaced by short chain: baseline (+ optional small forward set) |
| Rows retained | None of the split 185 long-term (except as offline backup evidence) |
| Executable statements? | **Required** — baseline file(s) must be repair-applied or push-recorded with non-empty `statements[]`. Naive tracking-only repair without file bodies is **forbidden** |
| Data-less dashboard obtain schema | Replay short chain from new baseline statements |
| GitHub vs dashboard converge? | **Yes, if** active `supabase/migrations/` is rewritten to the same baseline chain in the same change window |
| Effect of 185 / 109 split | **Eliminated** by replacing both authorities with one chain |
| Phase1 recovered (4) | Absorbed into baseline schema dump (objects already exist); recovered files remain provenance evidence only |
| Later prod migrations | Absorbed into baseline; operational blockers (d6, grant RAISE) either omitted, guarded, or folded as no-ops |
| PR #312 git migrations | Fold into baseline if already live; otherwise append as **new** forward versions after cutover — never leave orphan git-only timestamps |
| Partial-replay RLS | Lower once chain is short and guarded; still delete contaminated branches on fail |
| Txn / recovery | Prefer baseline without fragile nested BEGIN if runner auto-wraps; document failure → revert history from backup |
| CLI/dashboard compatibility | Aligns with documented “baseline when history too complex” troubleshooting guidance; **not** the same as bare `migration squash` (must fix DML omission) |
| Rollback | Restore DB snapshot + restore prior `schema_migrations` dump (185 rows + statement bytes) |
| Long-term workflow | Single lineage; `migration list` local=remote; Option D becomes regression of the new chain |

### Recommendation

**Primary path: Mechanism 2 — executable squash/baseline + necessary later migrations.**

**Reject Mechanism 1** as primary because it preserves the 185↔109 split forever, does not make GitHub and dashboard converge, and still requires multiple same-version body mutations afterward.

**Mutation readiness:** design-approved, **not** mutation-authorized. Baseline package (exact SQL bytes + hashes) is **not yet authored** against a sealed production schema dump in this PR. Full parity is **feasible in principle**, **not** ready to execute.

---

## Part C — Byte review: d6_2a–d6_2d (no apply)

Shared semantic pattern (all four):

| | Production (inventory) | Option D substitution candidate |
|--|------------------------|----------------------------------|
| Authority | `schema_migrations.statements[1]` | `supabase/migrations-draft/option-d-isolated-replay/substitutions/*` |
| Registry | `UPDATE curated_rules_registry … is_active = true` | Same intent retained |
| Client rules | `INSERT … VALUES (fixture uuid, …)` / ON CONFLICT | `INSERT … SELECT FROM firm_clients WHERE id = fixture` + ON CONFLICT |
| Guard | **None** on fixture presence | **Requires** matching `firm_clients` row |
| Txn wrapper | **No** BEGIN/COMMIT | **Yes** BEGIN/COMMIT |
| Data-less | **FAIL** FK (G2) | INSERT selects 0 rows → **no-op**; UPDATE registry still runs |
| Live prod with fixture | Inserts/upserts rules for fixture client | Same if fixture row exists |

### Per-version verdicts

#### `20260703182655` — `d6_2a_test_client_activation`
| Field | Value |
|-------|-------|
| Prod | stmts=1 · bytes=**1002** · sha256=`4ff9251055f2af8a3b4314409c198f61a0d2597a0f7b44819d6ccb5f3ac044bb` · md5=`94914d3ef889f1ca1a002f6c8b0404b0` |
| Candidate | path `…/20260703_2000_d6_2a_test_client_activation.sql` · blob=`cee5530e27268f7dbdbf15880cd3d0405dacf70e` · sha256=`037021afaab5dbb3bd8687ae91e4d26aa816c1d321dc851cd4e23fe36423aeee` · md5=`5fcba729a6b2eccd81c25906a6b8cdb8` · bytes=**1332** |
| Semantic diff | Unconditional VALUES insert → guarded INSERT…SELECT; adds BEGIN/COMMIT; retains registry UPDATE + fixture UUID filter + ON CONFLICT |
| Prerequisite present | Registry activation + client rule upsert for fixture client |
| Prerequisite absent | Registry UPDATE only; client INSERT no-op |
| Extra behavior | Transaction wrapper; slightly different UPDATE formatting vs prod prefix |
| RLS/grants/triggers | None in either body; depends on pre-existing `client_active_rules` / `curated_rules_registry` / `firm_clients` |
| Rollback bytes | Restore prod sha256 `4ff92510…` / md5 `94914d3e…` / 1002 bytes |
| **Verdict** | **APPROVE as squash-chain guarded module or same-version replace candidate** — not applied |

#### `20260703184839` — `d6_2b_mfg_activation`
| Field | Value |
|-------|-------|
| Prod | bytes=**1446** · sha256=`fc53cb1efe54eea106ebfed71d724ccde51573ad148151e77989d924c4f9988e` · md5=`d28ab0c40e3abb20d602bf1842b8146e` |
| Candidate | blob=`86ec0b33afeba4a9ecb033ff8c8a1154302e2204` · sha256=`4c2ab4ada3bba3fd9377fa51f8594d2152d3a327b8e0529021b3982d960bff82` · md5=`fe68d378577a3e63a03b38d25a6138ea` · bytes=**1530** |
| **Verdict** | **APPROVE** (same pattern as d6_2a; mfg rule_ids) |

#### `20260703190541` — `d6_2c_retail_activation`
| Field | Value |
|-------|-------|
| Prod | bytes=**1099** · sha256=`5daaf4fd08488b42796f4acfa3c567bc81a1a5205d4700ec998ea3787b4e0a6a` · md5=`f14b10c683b74cb93f13283c0986ac4c` |
| Candidate | blob=`08c659039bd4e9d3f9631dffdee707468129eda2` · sha256=`48430bf74138644066823e178f2f7243bc9c1fe2bf083b1b9624b5d4db28e9c5` · md5=`183bd7652c217306f49170642cd5501e` · bytes=**1349** |
| **Verdict** | **APPROVE** (retail rule_ids) |

#### `20260703192608` — `d6_2d_ps_activation`
| Field | Value |
|-------|-------|
| Prod | bytes=**1103** · sha256=`f1b7ec4eb94c37730ff7cef1b5be27f1861d2df06a11ef5d2251e3d4a4546ab5` · md5=`5ad9bc5d6d6c256054ce3f32980eacb6` |
| Candidate | blob=`b4abf9416c001bde77f1643cae73b3d62da759f1` · sha256=`5bd9be56d1cac1e5be8d89ae195d7f2e7b1c330098e41725df49fada9fa3d1cc` · md5=`957219e565cdc46756ed4d5779522b26` · bytes=**1349** |
| **Verdict** | **APPROVE** (ps rule_ids) |

Under the **squash primary path**, these become **modules absorbed into the baseline or short forward chain**, not isolated production history surgery as the main strategy.

---

## Part D — Provenance: tcp1 + accounting grant

### `20260708051526` — `tcp1_w1_solo_bk_pilot_slots`
| | Production | Option D candidate (`20260708120000_…`) |
|--|------------|------------------------------------------|
| Bytes / sha256 | **6288** / `de02eba76e8dc969c13ade60f136f4dfb949c7742253d060aac0ee46d7532010` | **8373** / `27090d7d5bbcbdc2114b7bda4f2b7fdfc00fb028d5c0816ae816f8f3b87acb40` |
| Shape | CREATE TABLE + RLS/policies/functions; prefix notes complimentary seed **deferred**; **no** `INSERT INTO pilot_slots` | Schema/RLS/functions **plus guarded** `INSERT INTO pilot_slots … SELECT FROM companies` |
| Timestamp | `20260708051526` | Filename `20260708120000` (intentionally different) |

**Verdict:** **Divergent implementation** (not exact semantic equivalent). Production already deferred the complimentary seed (likely data-less friendlier than candidate). Candidate **adds** guarded seed DML.  
**Same-version replace with Option D file:** **unsafe without further diff** (would change prod history semantics / byte identity).  
**Squash treatment:** Prefer **production schema shape** (no complimentary seed) unless product requires seed; do not silently adopt Option D insert.

### `20260814023005` — `accounting_canonical_connected_grant`
| | Production | Option D candidate (`20260814221500_…`) |
|--|------------|------------------------------------------|
| Bytes / sha256 | **7870** / `1beca937fcd335f6fae1778f3c0aaa315db893cbb00f63a9ce1e90ab50b8ac86` | **1226** / `37ea392a70211bdb93dae25079490b264802f74ab57427afe61697cbbc1c6e9c` |
| Shape | `LOCK TABLE accounting_connections`; Demo Xero / RAISE path; UPDATE connections; unique connected-grant index | **Schema-only** unique index; **omits** LOCK/RAISE/UPDATE operational body |

**Verdict:** **Divergent — Option D is intentional prod-omit for clean replay.**  
**Same-version replace with Option D candidate:** **unsafe** if goal is preserve production operational semantics; **acceptable only inside squash** as “schema invariant only” after proving live prod already satisfies post-conditions (no customer values copied into artifacts).  
**Provenance:** Sufficient to classify; insufficient to approve same-version body swap.

---

## Part E — Staged parity plan (squash primary)

### Exact proposed mutation set (design inventory — **not authorized to execute**)

1. **Offline backup** of production DB + full `schema_migrations` export (version, name, statements[], hashes).  
2. **Author** `YYYYMMDDHHMMSS_executable_baseline.sql` = sealed schema dump of live prod **plus** reviewed guarded modules (d6 family) **plus** decided tcp1/grant treatment. Record SHA-256/MD5/git-blob.  
3. **Rewrite** active `supabase/migrations/` to `{baseline}` + only true forward migrations (post-cutover).  
4. **Production history cutover (future auth only):**
   - `migration repair --status reverted` for all 185 current versions (or documented truncate+rebuild procedure after backup)
   - `migration repair --status applied` for new baseline (+ forwards) **from local files** so `statements[]` are populated **without** re-executing DDL on live schema  
5. **Do not** ship tracking-only rows with null/empty statements.  
6. **Post-proof:** new data-less dashboard/MCP branch full green; `migration list` local↔remote match; schema diff vs prod empty (or accepted allowlist).

### Gates (required before any mutation auth)

1. Full backup requirements (above)  
2. Local rehearsal gate (disposable DB / Option D-class harness) — **not started in this auth**  
3. Disposable data-less dashboard/MCP branch rehearsal  
4. Mid-replay RLS/security checks (stop-on-first-fail; no continue)  
5. Schema comparison vs production  
6. Application smoke (health, auth shell, JE read paths — no capability enable)  
7. Failure ⇒ **delete contaminated branch**; never promote partial  
8. Separate **production mutation authorization** with exact file hashes  
9. Post-mutation proof + rollback drill using restored `schema_migrations` bytes  

### Contaminated-branch rule
Any failed dashboard/MCP branch is **toxic**. Delete immediately. Do not repair in place. Do not point app traffic at it.

---

## Feasibility

| Question | Answer |
|----------|--------|
| Full dashboard/MCP ↔ Git parity feasible? | **Yes, via executable squash/baseline**, not via foundations insert |
| Ready to mutate now? | **No** |
| Foundations insert as primary? | **Rejected** |
| Bare `supabase migration squash` alone? | **Insufficient** (DML omitted; does not rewrite prod history) |
| `migration repair` alone? | **Insufficient** for schema; **necessary** for history statement recording when used with complete local files |

---

## Next bounded authorization

Authorize **executable baseline package authoring** (schema dump design + guarded module inclusion decisions for tcp1/grant + hash seal) **and/or** disposable local rehearsal of that package — still **no** production history mutation, **no** paid dashboard branch until the package is hash-sealed and reviewed.

---

## Artifacts

- This document  
- `docs/migration-remediation/evidence/option1-foundations-disposition-2026-09-06.json`  
- Tests covering disposition pins
