# Clean replay remediation design (PR #313 review-only)

## Problem statement

Second G2 disposable replay **passed baseline ordering and Phase1 RLS**, then failed at production migration #25:

`20260703182655_d6_2a_test_client_activation`

Root cause: unconditional `INSERT INTO client_active_rules` referencing fixture `firm_client_id` `71111111-1111-4111-8111-111111111111`, which does not exist on a data-less branch.

**Do not** insert fake `firm_clients` rows to satisfy FKs. That would poison empty-branch replays and violate Patent #6 custody boundaries.

## Critical architecture constraint (independent review P1)

Dashboard branches replay **production-recorded `schema_migrations.statements[]`**, not git files alone. A guarded migration file with a **later filename cannot run before** the failing production statement at version `20260703182655`.

See **`clean-replay-architecture.md`** for per-option evaluation (production statement replacement, squash, GitHub-integrated preview, isolated git replay).

**Prior promotion path ("add guarded replacements under new filenames") is insufficient for dashboard track by itself.**

## Durable design (production history preserved)

### Principle 1 — Do not rewrite applied production rows without G4 approval

Production-recorded SQL remains authoritative for dashboard replay until an approved G4 workflow replaces `statements[]` **at the same version** or performs an official squash. Remediation applies to **git lineage promotion** and **replay classification** in parallel.

### Principle 2 — Split schema/reference from operational activation

| Layer | Examples | Data-less replay |
|-------|----------|------------------|
| Schema | CREATE TABLE, RLS, functions | Required |
| Reference seed | `company_roles`, `curated_rules_registry`, checklist templates | Required |
| Registry flip | `UPDATE curated_rules_registry SET is_active` | Required (no tenant FK) |
| Operational activation | `client_active_rules` rows for a specific `firm_client_id` | **Guarded or replay-optional** |
| Production backfill | `UPDATE companies WHERE id = '<prod uuid>'` | No-op on empty branch |
| Prod-only rewiring | `accounting_canonical_connected_grant` | Skip on empty / prod-only track |

### Principle 3 — Guard operational DML with existence checks

Draft pattern in `supabase/migrations-draft/clean-replay-proposals/d6_2a_test_client_activation.guarded.sql`:

```sql
INSERT INTO client_active_rules (...)
SELECT fc.id, v.rule_id, ...
FROM firm_clients fc
CROSS JOIN (VALUES (...)) v(rule_id)
WHERE fc.id = '71111111-1111-4111-8111-111111111111'::uuid
ON CONFLICT ...
```

On data-less branch: **0 rows inserted**, migration succeeds, registry UPDATE still applies.

Apply same pattern to `d6_2b`, `d6_2c`, `d6_2d`.

### Principle 4 — Replay tracks

| Track | Purpose | Mechanism to fix d6_2a |
|-------|---------|------------------------|
| **Dashboard production-history** | Disposable Supabase branches | Replace stored statement at `20260703182655` or squash (Option A/B) |
| **Git clean schema replay** | CI, PR #312 Postgres gate | Promote guarded SQL into `supabase/migrations/` (Option C/D) |
| **Production parity replay** | Prod recording verification | Full 185 including prod backfills |

## Migrations requiring treatment

| Production version | Local file | Dashboard track | Git track |
|--------------------|------------|-----------------|-----------|
| `20260703182655` | `d6_2a_test_client_activation` | Replace stored statement | Promote guarded INSERT |
| `20260703184839` | `d6_2b_mfg_activation` | Same | Guard client INSERT |
| `20260703190541` | `d6_2c_retail_activation` | Same | Same |
| `20260703192608` | `d6_2d_ps_activation` | Same | Same |
| `20260708051526` | `tcp1_w1_solo_bk_pilot_slots` | Replace or guard seed | Guard/remove complimentary INSERT |
| `20260814011547` | `accounting_canonical_connected_grant` | Prod-only skip | Classify prod-only |

## Downstream JE stack

Clean replay must reach (for PR #312):

- `journal_entry_executions` (~migration 158 local / prod `20260822011350`)
- `persist_journal_entry_execution_reservation` RPC

Current stop at migration 25 leaves **160 migrations** including entire JE/Patent #6 stack unreached.

## Static gates (implemented)

1. `audit-migration-lineage-classification.js` — full lineage manifest
2. `audit-data-dependent-replay-gate.js` — **fails merge readiness** while executable blocking violations remain in git `supabase/migrations/` (documentation does not suppress)

## Promotion path (after review — not this PR)

1. Select replay mechanism per `clean-replay-architecture.md`
2. For git track: promote guarded replacements into `supabase/migrations/` at correct semantic positions
3. For dashboard track: G4 workflow to record guarded statement at same production version
4. Static gate must pass (`mergeReady: true`)
5. Third G2 disposable branch **only with explicit authorization**
6. Only then unblock PR #312 Postgres gate
