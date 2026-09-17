# Option 1 — production schema_migrations hash inventory (read-only)

**Authorization:** read-only production migration metadata inventory for Option 1 planning.
**Production mutation:** not authorized; none performed.
**Project:** `jzmdgwwiestcmmeuhhkr`
**Bound main HEAD:** `9d8a01d37422179ddd68bbd181a8815d8a893577`
**Generated:** 2026-09-07T01:17:30.802Z

## Production totals

| Metric | Value |
|--------|-------|
| Versions | 185 |
| Rows with statements present | 185 |
| Null statements rows | 0 |
| Empty statements[] rows | 0 |
| Total statement elements | 185 |
| All single-statement | true |
| Txn-wrapper keyword rows | 27 |
| Starts-with-BEGIN rows | 10 |

## Hash / provenance verification

- Dual method hash checks (full inventory agg vs keyed re-query): **PASS**
- Option D manifest blob: observed `0d2a39a3d4220c8d28e3269a87fa8c01e8bf2d4e` match=true
- Option D manifest SHA-256: match=true
- Option D substitutions in manifest: 7

## Classification totals

- **Covered by derived foundations baseline:** 1
- **Git-only migration:** 109
- **Production-only migration:** 185
- **Requires additional provenance before any mutation:** 2
- **Requires guarded same-version replacement:** 4

- Exact production ↔ Git match: 0
- Same version divergent SQL: 0
- Production-only: 185
- Git-only: 109
- DML-keyword versions: 22
- RLS/policy-keyword versions: 85

## Foundations gap disposition

**BLOCKER — cannot host foundations via same-version replacement without changing version order**

Earliest production version is 20260701043602 (phase1_subscriptions_core). No earlier production row exists. Hosting foundations requires inserting/recording 20260701043599 (changes order) or Option 2 squash.

Fallback: Option 2 squash OR separately authorized insert/record of version 20260701043599 before phase1

Derived baseline draft: `supabase/migrations-draft/20260701043599_foundations_baseline.sql` · git-blob `06aeb59eb5ee51e39c82dca1e2e1d359bdf2553f` · SHA-256 `50d607160fb384bb88e1528ed7e4007ec5ac801c6d2f0b0a278b4b77bfa38985` · bytes 106283

## Proposed Option 1 same-version targets (mutate NOT authorized)

### `20260703182655` — d6_2a_test_client_activation

- Status: **PROPOSED_GUARDED_SAME_VERSION_REPLACEMENT**
- Existing statements: count=1, bytes=1002, sha256=`4ff9251055f2af8a3b4314409c198f61a0d2597a0f7b44819d6ccb5f3ac044bb`, md5=`94914d3ef889f1ca1a002f6c8b0404b0`
- Candidate: `supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2000_d6_2a_test_client_activation.sql`
  - git-blob `cee5530e27268f7dbdbf15880cd3d0405dacf70e`
  - SHA-256 `037021afaab5dbb3bd8687ae91e4d26aa816c1d321dc851cd4e23fe36423aeee`
  - MD5 `5fcba729a6b2eccd81c25906a6b8cdb8`
  - bytes 1332
- Why replay fails: Unconditional fixture INSERT into client_active_rules; FK fail when firm_clients row absent (G2 #2)
- Expected dashboard order index: 26
- Rollback: Restore prior statements[] for version 20260703182655 from backup (combined_sha256=4ff9251055f2af8a3b4314409c198f61a0d2597a0f7b44819d6ccb5f3ac044bb, bytes=1002)

### `20260703184839` — d6_2b_mfg_activation

- Status: **PROPOSED_GUARDED_SAME_VERSION_REPLACEMENT**
- Existing statements: count=1, bytes=1446, sha256=`fc53cb1efe54eea106ebfed71d724ccde51573ad148151e77989d924c4f9988e`, md5=`d28ab0c40e3abb20d602bf1842b8146e`
- Candidate: `supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2200_d6_2b_mfg_activation.sql`
  - git-blob `86ec0b33afeba4a9ecb033ff8c8a1154302e2204`
  - SHA-256 `4c2ab4ada3bba3fd9377fa51f8594d2152d3a327b8e0529021b3982d960bff82`
  - MD5 `fe68d378577a3e63a03b38d25a6138ea`
  - bytes 1530
- Why replay fails: Same fixture activation class as d6_2a (mfg)
- Expected dashboard order index: 27
- Rollback: Restore prior statements[] for version 20260703184839 from backup (combined_sha256=fc53cb1efe54eea106ebfed71d724ccde51573ad148151e77989d924c4f9988e, bytes=1446)

### `20260703190541` — d6_2c_retail_activation

- Status: **PROPOSED_GUARDED_SAME_VERSION_REPLACEMENT**
- Existing statements: count=1, bytes=1099, sha256=`5daaf4fd08488b42796f4acfa3c567bc81a1a5205d4700ec998ea3787b4e0a6a`, md5=`f14b10c683b74cb93f13283c0986ac4c`
- Candidate: `supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2300_d6_2c_retail_activation.sql`
  - git-blob `08c659039bd4e9d3f9631dffdee707468129eda2`
  - SHA-256 `48430bf74138644066823e178f2f7243bc9c1fe2bf083b1b9624b5d4db28e9c5`
  - MD5 `183bd7652c217306f49170642cd5501e`
  - bytes 1349
- Why replay fails: Same fixture activation class as d6_2a (retail)
- Expected dashboard order index: 28
- Rollback: Restore prior statements[] for version 20260703190541 from backup (combined_sha256=5daaf4fd08488b42796f4acfa3c567bc81a1a5205d4700ec998ea3787b4e0a6a, bytes=1099)

### `20260703192608` — d6_2d_ps_activation

- Status: **PROPOSED_GUARDED_SAME_VERSION_REPLACEMENT**
- Existing statements: count=1, bytes=1103, sha256=`f1b7ec4eb94c37730ff7cef1b5be27f1861d2df06a11ef5d2251e3d4a4546ab5`, md5=`5ad9bc5d6d6c256054ce3f32980eacb6`
- Candidate: `supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2400_d6_2d_ps_activation.sql`
  - git-blob `b4abf9416c001bde77f1643cae73b3d62da759f1`
  - SHA-256 `5bd9be56d1cac1e5be8d89ae195d7f2e7b1c330098e41725df49fada9fa3d1cc`
  - MD5 `957219e565cdc46756ed4d5779522b26`
  - bytes 1349
- Why replay fails: Same fixture activation class as d6_2a (ps)
- Expected dashboard order index: 29
- Rollback: Restore prior statements[] for version 20260703192608 from backup (combined_sha256=f1b7ec4eb94c37730ff7cef1b5be27f1861d2df06a11ef5d2251e3d4a4546ab5, bytes=1103)

### `20260708051526` — tcp1_w1_solo_bk_pilot_slots

- Status: **REQUIRES_ADDITIONAL_PROVENANCE**
- Existing statements: count=1, bytes=6288, sha256=`de02eba76e8dc969c13ade60f136f4dfb949c7742253d060aac0ee46d7532010`, md5=`8333ce1630c53ad51db5dcb2caf99468`
- Candidate: `supabase/migrations-draft/option-d-isolated-replay/substitutions/20260708120000_tcp1_w1_solo_bk_pilot_slots.sql`
  - git-blob `0f48207fb66b9c090ad12fbfa1e796beb8fa8a6e`
  - SHA-256 `27090d7d5bbcbdc2114b7bda4f2b7fdfc00fb028d5c0816ae816f8f3b87acb40`
  - MD5 `4057d5f3e0d87631a94a2c008948994b`
  - bytes 8373
- Why replay fails: Option D substitution target — pilot_slots create/seed path; production version timestamp differs from Option D filename (20260708051526 vs 20260708120000). Requires additional provenance before statements[] mutation
- Expected dashboard order index: 71
- Rollback: Restore prior statements[] for version 20260708051526 from backup (combined_sha256=de02eba76e8dc969c13ade60f136f4dfb949c7742253d060aac0ee46d7532010, bytes=6288)

### `20260814023005` — accounting_canonical_connected_grant

- Status: **REQUIRES_ADDITIONAL_PROVENANCE**
- Existing statements: count=1, bytes=7870, sha256=`1beca937fcd335f6fae1778f3c0aaa315db893cbb00f63a9ce1e90ab50b8ac86`, md5=`0a7f9f42e4ac9ce951ea89b504e993ea`
- Candidate: `supabase/migrations-draft/option-d-isolated-replay/substitutions/20260814221500_accounting_canonical_connected_grant.sql`
  - git-blob `ddfebca20c83efe04384bb24e3f41460e4b174b5`
  - SHA-256 `37ea392a70211bdb93dae25079490b264802f74ab57427afe61697cbbc1c6e9c`
  - MD5 `1239cb2aee81af8e72af1d9390d39612`
  - bytes 1226
- Why replay fails: Option D substitution / UPDATE accounting_connections grant path; production version 20260814023005 vs Option D filename 20260814221500. Requires additional provenance before any mutation
- Expected dashboard order index: 164
- Rollback: Restore prior statements[] for version 20260814023005 from backup (combined_sha256=1beca937fcd335f6fae1778f3c0aaa315db893cbb00f63a9ce1e90ab50b8ac86, bytes=7870)

## Option 1 feasible without squash?

**No.** d6_2a–d6_2d are inventoriable same-version replacement targets, but foundations cannot be hosted on any existing production version without changing version order. Full dashboard parity via Option 1 alone (no insert of 20260701043599 and no squash) is NOT feasible.

## Versions requiring additional provenance

- `20260708051526` tcp1_w1_solo_bk_pilot_slots (sha256 `de02eba76e8dc969c13ade60f136f4dfb949c7742253d060aac0ee46d7532010`, dml=false)
- `20260814023005` accounting_canonical_connected_grant (sha256 `1beca937fcd335f6fae1778f3c0aaa315db893cbb00f63a9ce1e90ab50b8ac86`, dml=true)

## Proposed rehearsal order

- 1. Retain this hash inventory + full schema_migrations backup dump (statements included in secure backup only)
- 2. Resolve foundations gap mechanism (authorized insert of 20260701043599 OR Option 2 squash) — BLOCKER for same-version-only
- 3. Byte-review Option D substitutions for d6_2a→d6_2d; disposable rehearsal of statements[] replace
- 4. Additional provenance for tcp1_w1_solo_bk_pilot_slots and accounting_canonical_connected_grant
- 5. Data-less dashboard branch full-chain proof
- 6. Separate production mutation authorization (not this inventory)

## Backup / rollback requirements

- Full production DB snapshot before any schema_migrations mutation
- Machine-readable dump of schema_migrations including statements[] with matching sha256/md5/bytes
- Per mutated version: prior statement bytes + hashes as rollback material
- Delete any failed/contaminated dashboard branch; do not continue mid-chain

## Next bounded authorization

Authorize foundations-gap disposition design (insert 20260701043599 vs Option 2 squash) AND/OR byte-review of d6_2a–d6_2d guarded replacements for disposable rehearsal only — still no production statements[] mutation


## Independent version-list cross-check

- Method 1 (hash inventory) versions: **185**
- Method 2 (version/name-only query) versions: **185**
- Counts match: **true**
- Ordered versions equal: **true**
- Ordered names equal: **true**
- First/last: `20260701043602` … `20260827030454`

## Active git comparison note

Exact production version ↔ `supabase/migrations/` SHA-256 matches: **0**. Name-suffix overlap: **110**. Candidate SQL for Option 1 targets comes from Option D substitutions / clean-replay proposals, not active git timestamp identity.

## Key-version object references (sanitized)

- `20260701043602` phase1_subscriptions_core: inserts=null updates=null tables=["public.stripe_webhook_events","public.subscription_items","public.subscriptions"] functions=null
- `20260703182655` d6_2a_test_client_activation: inserts=["public.client_active_rules"] updates=["public.curated_rules_registry"] tables=null functions=null
- `20260703184839` d6_2b_mfg_activation: inserts=["public.client_active_rules"] updates=["public.curated_rules_registry"] tables=null functions=null
- `20260703190541` d6_2c_retail_activation: inserts=["public.client_active_rules"] updates=["public.curated_rules_registry"] tables=null functions=null
- `20260703192608` d6_2d_ps_activation: inserts=["public.client_active_rules"] updates=["public.curated_rules_registry"] tables=null functions=null
- `20260708051526` tcp1_w1_solo_bk_pilot_slots: inserts=null updates=null tables=["public.pilot_slots","public.sku_launch_waitlist"] functions=["public.public_pilot_slot_count","public.set_pilot_slots_updated_at"]
- `20260814023005` accounting_canonical_connected_grant: inserts=null updates=["public.accounting_connections"] tables=null functions=null

## Artifacts

- `docs/migration-remediation/evidence/option1-prod-schema-migrations-hash-inventory.json`
- `docs/migration-remediation/evidence/option1-prod-schema-migrations-hash-inventory.summary.json`
- This report

Raw SQL bodies are intentionally omitted; hashes and source paths only.