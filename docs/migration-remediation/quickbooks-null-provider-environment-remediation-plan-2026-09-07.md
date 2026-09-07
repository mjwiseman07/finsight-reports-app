# Provider-environment remediation plan (read-only)

**Date:** 2026-09-07  
**Bound PR #315 HEAD (code immutable this turn):** `928f13fcac62d4b5a99e591d67158e1938edb8cd`  
**Base:** `9d8a01d37422179ddd68bbd181a8815d8a893577`  
**PR #314:** untouched `c4230d460f593429a819fc0466cfb008c3b2e476`  
**Project:** `jzmdgwwiestcmmeuhhkr`  
**Authorization:** read-only planning only — **no UPDATE executed**

## Verdict

**INSUFFICIENT_ENVIRONMENT_PROVENANCE**

Do **not** authorize a production `provider_environment` UPDATE for the three null rows. Independent non-secret evidence does **not** prove they are production OAuth grants. A wrong assignment could route refresh/API traffic to the wrong Intuit environment.

---

## Part A — Runtime QB_ENVIRONMENT classifications

Normalized classifications only (values inspected transiently; not committed):

| Surface | `QB_ENVIRONMENT` classification |
|---------|----------------------------------|
| Vercel **Production** | **production** |
| Vercel **Preview** | **sandbox** |
| Vercel **Development** | **sandbox** |

Production application expects **production**. Sandbox preview/dev expect **sandbox**. Not missing/invalid. No deployment or env-var change is required for a future data fix.

JE-3D capabilities remain OFF (`CREATE`/`VERIFY`/`PREPARE` = false). Base policy `sandboxDispatchKillSwitch` remains `false as const` (unchanged by this plan; first-run activation modules are out of scope). No capability or kill-switch changes authorized.

---

## Part B — Aggregate provenance for the three null-env rows

### Evidence inventory

| Source | Available? | Result (aggregates) |
|--------|------------|---------------------|
| Legacy `quickbooks_connections` environment column | **No** (`legacy_env_columns = 0`) | Cannot prove env from legacy |
| Canonical `provider_environment` | Null on all 3 targets | Under investigation |
| `metadata_json` env keys (`environment` / `provider_environment` / `qb_environment`) | **0** of 3 | Not sole authority; also empty |
| `metadata_json.source_table` | 1 of 3 = `quickbooks_connections` | Provenance of **origin table** only — **not** Intuit API env |
| OAuth/audit event tables | **Absent** (`connection_audit_events`, `oauth_events`, `audit_events` = false) | No immutable OAuth env log |
| Same-realm classified sibling | 0 production / 0 sandbox | No same-realm proof |
| Other-realm classified siblings | **2** sandbox-only; **0** production-only; **0** mixed; **1** none | **Non-authoritative lean toward sandbox for 2/3** — insufficient to prove either env for the grant |
| Created before `provider_environment` column epoch (~2026-08-22) | **3** of 3 | Consistent with backfill before column existed |
| Historical backfill SQL | Sets tokens/realm/metadata `source_table`; **never** sets `provider_environment` | Explains nulls; does **not** prove production |
| Presence in production Supabase project | N/A | **Explicitly rejected** as sole proof (sandbox grants also live here) |

### Internal classification counts (no identifiers)

| Class | Count |
|------:|------:|
| Proven production | **0** |
| Proven sandbox | **0** |
| Conflicting evidence (authoritative) | **0** |
| Insufficient evidence | **3** |
| Non-authoritative sandbox-leaning corroboration (other-realm siblings) | **2** |
| No classified sibling corroboration | **1** |

**Conclusion:** Cannot mark any of the three as **Proven production**. Sibling sandbox lean for two rows makes a blanket production assignment especially unsafe.

---

## Part C — Exact future UPDATE target predicate (not executed)

Intended future mutation (when/if provenance is proven) would set **only**:

```text
provider_environment = 'production'   -- or 'sandbox', only if proven
updated_at = now()                    -- concurrency/audit timestamp only
```

**Set-based predicate structure (placeholders; no row IDs committed):**

```sql
-- ILLUSTRATIVE ONLY — DO NOT RUN without separate write authorization
-- and row-level proven-production attestation set.
UPDATE public.accounting_connections AS a
SET
  provider_environment = 'production',
  updated_at = clock_timestamp()
WHERE a.provider = 'quickbooks'
  AND a.provider_environment IS NULL
  AND a.status = 'connected'
  AND a.superseded_by_connection_id IS NULL
  AND a.credentials_cleared_at IS NULL
  AND a.access_token IS NOT NULL AND length(btrim(a.access_token)) > 0
  AND a.refresh_token IS NOT NULL AND length(btrim(a.refresh_token)) > 0
  AND a.tenant_or_realm_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.quickbooks_connections AS l
    WHERE l.user_id IS NOT DISTINCT FROM a.user_id
      AND l.realm_id IS NOT DISTINCT FROM a.tenant_or_realm_id
  )
  AND (
    SELECT count(*)
    FROM public.accounting_connections AS c
    WHERE c.provider = 'quickbooks'
      AND c.user_id IS NOT DISTINCT FROM a.user_id
      AND c.tenant_or_realm_id IS NOT DISTINCT FROM a.tenant_or_realm_id
      AND c.status = 'connected'
      AND c.superseded_by_connection_id IS NULL
      AND c.credentials_cleared_at IS NULL
      AND c.access_token IS NOT NULL AND length(btrim(c.access_token)) > 0
      AND c.refresh_token IS NOT NULL AND length(btrim(c.refresh_token)) > 0
      AND c.provider_environment IS NULL
  ) = 1
  -- AND a.id IN (/* session-local proven-production attestation set */)
;
```

### Abort gates

| Check | Required |
|-------|----------|
| Expected affected rows for **proven-production** set | Exactly **3** only if all three are proven production |
| **Current** proven-production target count | **0** → **ABORT** (this plan) |
| Already-classified sandbox unique legacy match | Must remain **1** and **excluded** |
| Ambiguous canonical matches | Must stay **0** |
| Token / unrelated columns | Must not appear in `SET` list |

Under current evidence, a production UPDATE targeting “all three nulls” is **forbidden**.

---

## Part D — Schema / side effects

| Item | Finding |
|------|---------|
| Column type | `text`, nullable |
| CHECK | `NULL OR IN ('sandbox','production')` |
| Triggers on `accounting_connections` | **None** |
| Dedicated OAuth/env audit tables | **None** |
| `updated_at` | Will change if included in UPDATE — becomes new refresh concurrency token |
| RLS | Present (service-role / admin path required for remediation) |
| Token refresh / QBO / custody / webhooks | Not triggered by column UPDATE alone (no triggers) |
| Caches | App resolves env from row + `QB_ENVIRONMENT`; no separate invalidation required beyond natural re-read |
| Must not change | access/refresh tokens, realm, status, supersession, metadata_json, capabilities |

---

## Part E — Future backup / rollback design (not created this turn)

1. Session-local protected backup (untracked): target keys + prior `provider_environment` (null) + prior `updated_at` concurrency tokens — **no token columns**.
2. Begin transaction only under future write auth.
3. `SELECT … FOR UPDATE` the exact attested set; revalidate all predicates.
4. Conditional `UPDATE … WHERE id AND updated_at = backup_token AND provider_environment IS NULL`.
5. Require `ROW_COUNT = attested_count` (would be 3 only if all proven).
6. Re-run aggregate postconditions (counts only).
7. Commit or rollback.
8. Post-commit rollback: restore prior env (null) using backup ids + concurrency guards; never touch tokens.

**No backup file created in this planning turn.**

---

## Part F — Post-update acceptance counts (future; if production remediation were ever proven)

| Metric | Required |
|--------|---------:|
| Null-env legacy-matched targets | 0 |
| Production-ready legacy matches | 3 |
| Sandbox-ready legacy matches | 1 |
| Total unique usable | 4 |
| Unmatched / ambiguous / missing tokens / wrong env | 0 |
| Then | Independent re-review of PR #315 before merge |

**Not achievable now** without provenance.

---

## Part G — Race / timing

- Active requests using hardened resolver already **skip** null-env rows — UPDATE would enable them for matching `QB_ENVIRONMENT`.
- Recommend short maintenance window or `SELECT FOR UPDATE` + concurrency token guards; avoid concurrent OAuth reconnect on the same grants.
- No Vercel deploy or env change required.
- Sandbox-classified unique match (1) must remain sandbox-only.
- Any future production-classified rows usable only when server env = production.

---

## Required next authorization (not granted)

Do **not** authorize UPDATE yet. Exact next bounded options:

1. **Authoritative provenance acquisition** (read-only or controlled reconnect): e.g. operator attestation from Intuit app environment of record, or re-OAuth under known `QB_ENVIRONMENT` writing `provider_environment` via existing persist path — without guessing.
2. Or authorize a **sandbox** remediation plan **only if** independent evidence proves sandbox (currently also unproven at grant level).
3. After attested env per row, authorize **controlled UPDATE** of only attested rows with backup/rollback and count gates.

Keep PR #315 and #314 draft/unmerged.
