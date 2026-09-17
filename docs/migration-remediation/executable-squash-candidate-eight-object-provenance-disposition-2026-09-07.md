# ESC production-only objects — provenance & disposition — 2026-09-07

## Scope

Read-only provenance recovery and disposition design for eight production-only schema objects missing from the executable-squash candidate. **No candidate SQL changes. No production mutation. No credential rotation. No Docker replay.**

## Pins

| Pin | Value |
|-----|-------|
| PR #314 HEAD (start) | `99fc630446252f337871115dfcac74d36e95b24b` |
| PR #314 | draft — https://github.com/mjwiseman07/finsight-reports-app/pull/314 |
| `origin/main` | `9d8a01d37422179ddd68bbd181a8815d8a893577` |
| Candidate authority | `c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6` |
| Package seal | `170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e` |
| Bytes / modules | 1,191,852 / 12 (immutability verified this turn) |
| Authoritative dump SHA-256 | `0eee4dc3b803db3e632443ac7f45b740345279f4c9171ff25ad6f310592a6cd4` |
| Portable dump SHA-256 | `b745ecfc25965f70ffe19b8fd0b92c3257407eccd8ba02bc07e3e33078512b0c` |
| Production migrations | 185 (`20260701043602` → `20260827030454`) |
| Prior verdicts | `PASS_SOURCE_REVIEW`; schema-seal **CHANGES REQUIRED** |

Candidate authority remains the commit/seal above regardless of later evidence-only commits.

---

## Part A — Credential-exposure triage

| Question | Finding |
|----------|---------|
| What appeared in the local CLI `--dry-run` console? | Ephemeral **`cli_login_postgres.<project_ref>`** role password embedded in the printed `pg_dump` helper script (`PGUSER` / `PGPASSWORD` exports). |
| Persistent project database password? | **Not indicated.** Dry-run script shape matches Supabase CLI temporary login-role bootstrap, not the durable DB password. |
| Supabase personal access token? | **Not displayed** in the dry-run script (token used for Management API login separately; not printed in the captured dump script body). |
| Classification | **`EPHEMERAL_CLI_LOGIN_ROLE_PASSWORD`** (local console only) |
| Retained in repo / evidence artifacts? | **No** credential values in committed docs/JSON (sanitized mentions only). |
| Retained as `dry-run.txt`? | **No** — deleted same session; file absent. |
| Raw dump dir / helper containers? | `%TEMP%\esc-prod-schema-seal`: **0** `.sql`; no matching dump helper containers. |
| `CREDENTIAL_ROTATION_REQUIRED`? | **No** under this classification. |
| Recommendation | Clear local terminal / agent console scrollback that may still show the dry-run script. Do **not** rotate the persistent project DB password solely for this event. CLI login-role credentials are session/bootstrap oriented; rotating the project password would force dependent pooler/app updates and is out of scope here. |

Prior seal note that recommended project-password rotation is **superseded** by this triage.

---

## Part B — Provenance (summary)

Full machine-readable rows: `docs/migration-remediation/evidence/executable-squash-candidate-eight-object-provenance-2026-09-07.json`.

| Object | First / final prod version | Statement # | Stmt SHA-256 (LF) | Git CREATE today on main? | Recoverable git (feature commit) |
|--------|---------------------------|------------:|-------------------|---------------------------|----------------------------------|
| `pilot_lifecycle_coverage_downloads` | `20260805000533` | 1 | `7b194ec2…cf508e` | No | `ac0d0352` `…/20260805030000_….sql` |
| `pulse_je_submissions` | `20260808045712` | 1 | `698304e4…bb6c5` | No | `88c919a3` `…/20260808050000_….sql` |
| `qbo_accounts_cache` | `20260808065206` (shared stmt) | 1 | `0fbe8002…751c87` | No | `8a0f8480` `…/20260808070000_….sql` |
| `xero_accounts_cache` | same stmt as qbo | 1 | same | No | same |
| `quickbooks_connections` | **No `schema_migrations` CREATE hit** | — | — | No CREATE in git | Pre-git / out-of-band; only 20260531 conditional backfill *from* table |
| `platform_integrity_chain_status` | create `20260806042702`; **final** `20260806042857` | 1 | final `72f726ee…91bb8` | No | `27572e64` |
| `v_platform_integrity_current` | `20260806042702` (shared with function create) | 1 | `1ef3ec2f…ce90a` | No | `27572e64` |
| `sp_write_pilot_slot_and_event` | create `20260804225750`; **final** `20260804234244` | 1 | final `ed50f271…5a607` | No | `a2499f87` (+ later OR REPLACE on feature branch) |

Live definition hashes (catalog, not migration stmt):

| Object | Live body/viewdef SHA-256 | Bytes |
|--------|---------------------------|------:|
| `platform_integrity_chain_status(uuid)` | `b10b3ef67443de5e63384e48e4e05507faf37c69d1e667bf90fd96aca403a6b7` | 1215 |
| `sp_write_pilot_slot_and_event(text,jsonb,jsonb)` | `86bca12572b13d4533862b1d31e21ce49d09f3f1e232cc459a8465ee6620e78b` | 5335 |
| `v_platform_integrity_current` | `77a8802a8e5fe50202b4ec2e16cd40e0707fa12f295b4f3a00df65cf7b25902d` | 876 |

Raw production SQL bodies are **not** committed this turn (hashes + previews only).

---

## Part C — Live usage / classification

On **current PR HEAD / main**: no `.from`/`.rpc` callers for the seven feature-branch objects. `quickbooks_connections` retains **live main** server fallbacks.

| Object | Classification | Callers (current tree) | DB deps |
|--------|----------------|------------------------|---------|
| `pilot_lifecycle_coverage_downloads` | Internal operational/audit | None on HEAD; feature-branch API insert | FK → `audit_ready_engagements` |
| `pulse_je_submissions` | Active compatibility / WBP write surface | None on HEAD; dash-branch adapter | FK → `companies`, `accounting_connections` |
| `qbo_accounts_cache` | Internal operational cache | None on HEAD; WBP write-boundary on dash branch | FK → `accounting_connections`; **93** cache rows |
| `xero_accounts_cache` | Internal operational cache | None on HEAD | FK → `accounting_connections`; **0** rows |
| `quickbooks_connections` | Superseded but still required for compatibility | Main: `token-resolver`, `quickbooks-adapter`, `promote-legacy-grant-execute`, verify script | FK → `auth.users`; **4** rows (OAuth material) |
| `platform_integrity_chain_status` | Internal operational | None on HEAD; feature API `.rpc` | reads lifecycle/pilot tables |
| `sp_write_pilot_slot_and_event` | Internal operational mutator | None on HEAD; pilot-lifecycle writer on feature branch | writes pilot slot/event tables |
| `v_platform_integrity_current` | Internal operational | None on HEAD; feature API `.from` | `security_invoker=true` |

Absence of HEAD callers ≠ obsolete: all eight exist in live production; seven are applied prod migrations not present on `origin/main` git files (`inGit: false` lineage class).

---

## Part D — Security contract (blockers)

### Tables (shared findings)

| Table | RLS | Policies | ACL highlights | Triggers | Seed for empty baseline? |
|-------|-----|----------|----------------|----------|--------------------------|
| `pilot_lifecycle_coverage_downloads` | on | authenticated SELECT partition | authenticated+service_role full table | none | No (0 rows) |
| `pulse_je_submissions` | on | `{public}` SELECT + service_role ALL | **anon+authenticated+service_role** full | none | No (0 rows) |
| `qbo_accounts_cache` | on | public deny-writes + select | **anon** granted | none | No (cache; 93 runtime rows not seed) |
| `xero_accounts_cache` | on | public deny-writes + select | **anon** granted | none | No |
| `quickbooks_connections` | on | **`{public}` ALL** “Users can access own QB connection” | **anon** granted; columns include **`access_token` / `refresh_token`** | none | **Never seed tokens** into candidate |

**Blockers against exact reproduction:** anon table privileges; `quickbooks_connections` token columns + PUBLIC ALL; broad authenticated grants on pilot downloads.

### Functions

| Function | SECURITY | search_path | Volatility | ACL | Blocker |
|----------|----------|-------------|------------|-----|---------|
| `platform_integrity_chain_status(uuid)` | INVOKER | `public` | stable | **anon+authenticated+service_role EXECUTE** | PUBLIC/anon execute |
| `sp_write_pilot_slot_and_event(...)` | INVOKER | `public, pg_catalog` | volatile mutator | **anon+authenticated+service_role EXECUTE** | PUBLIC/anon execute on mutator |

### View

| View | security_invoker | ACL | Blocker |
|------|------------------|-----|---------|
| `v_platform_integrity_current` | **true** | anon+authenticated+service_role | anon SELECT via ACL |

Do **not** copy unsafe production grants into the candidate merely for parity.

---

## Part E — Disposition (exactly one each)

| # | Object | Disposition | Proposed module / notes |
|---|--------|-------------|-------------------------|
| 1 | `pilot_lifecycle_coverage_downloads` | **2 — Include security-hardened** | New recovered overlay after app slices / before security module; source = prod stmt `7b194ec2…`; same-module RLS + revoke anon; no seed; **+1 recovered overlay** outside OD-151 |
| 2 | `pulse_je_submissions` | **2 — Include security-hardened** | Same overlay family (WBP); revoke anon; service_role write + authenticated read with tenant predicate; no seed |
| 3 | `qbo_accounts_cache` | **2 — Include security-hardened** | With `xero_accounts_cache` from shared prod stmt `0fbe8002…`; revoke anon; service_role maintain; no seed |
| 4 | `xero_accounts_cache` | **2 — Include security-hardened** | Paired with #3 |
| 5 | `quickbooks_connections` | **5 — Block pending product/security decision** | Exact include **forbidden** (secrets + PUBLIC ALL). After decision, likely **3 — compatibility restricted** (no plaintext token columns in baseline / no token seed) or controlled omit with documented prod-only legacy. Live main callers require an explicit product choice. |
| 6 | `platform_integrity_chain_status` | **2 — Include security-hardened** | Final live body hash `b10b3ef6…`; revoke anon/PUBLIC execute; keep INVOKER + `search_path` |
| 7 | `sp_write_pilot_slot_and_event` | **2 — Include security-hardened** | Final migration `20260804234244` / live `86bca125…`; revoke anon/PUBLIC; grant only after exact-identity allowlist proof |
| 8 | `v_platform_integrity_current` | **2 — Include security-hardened** | Keep `security_invoker=true`; revoke anon; pair with #6 |

### Expected accounting model (after future authorized remediation)

- OD equation **151 unchanged** as historical source accounting.
- Add explicit **recovered production-only overlay** count: **7 objects** ready for hardened include (5 tables? wait - pilot, pulse, qbo, xero = 4 tables + 2 fn + 1 view = 7; quickbooks blocked = 1).
- Tables hardened include: 4; functions: 2; view: 1; blocked: 1 table.
- Package seal will change only when candidate SQL is later authorized to change.

No replacement SQL bodies are authored in this turn.

---

## Part F — Schema-seal re-evaluation

| Bucket | Status after dispositions |
|--------|---------------------------|
| True missing schema (named eight) | 7 → designed include-hardened; **1 remains blocked** (`quickbooks_connections`) |
| Intentional security hardening | Expected grant/policy diffs vs prod ACL (anon revoke, etc.) |
| Operational-data omission | Cache/token rows not seeded — intentional |
| Platform-managed | Unchanged (auth/storage excluded) |
| Forward-tail | Still PASS (`20260906184500` digest qualify) |
| Parser blind spots | RENAME / dynamic `EXECUTE` CREATE (already: `stripe_webhook_events_legacy`, `qbo_connections_unified`); policy undercount from DO-blocks |

**Would resolving these eight reduce unexplained production-schema object drift to zero?**  
**No** — `quickbooks_connections` remains blocked; privilege/policy methodology diffs remain; not claiming `PASS_SCHEMA_SEAL`.

---

## Part G — Evidence & tests

Committed (sanitized only):

- This report
- Evidence JSON (provenance, callers, security, dispositions, credential triage)
- Vitest: seal immutability, active-migration immutability, disposition completeness, secret-pattern scan of evidence

---

## Exact next authorization needed

**Candidate remediation (hardened include) for the seven non-blocked objects**, plus a **product/security decision** on `quickbooks_connections` (compatibility-hardened vs controlled omit). Still not authorized: Docker/local replay, production DDL, credential rotation, merge PR #314.
