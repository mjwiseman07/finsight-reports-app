# Production schema seal — CHANGES REQUIRED — 2026-09-07

## Verdict

**CHANGES REQUIRED**

Read-only production schema seal via Supabase CLI `db dump` (schema-only) completed. Raw dumps were scanned (no row data / no secrets), hashed, compared to the executable-squash candidate, then deleted. Candidate SQL/manifest were not modified. Production was not mutated. PR #314 remains draft.

Seal capture succeeded; structural comparison against the candidate package found production objects that the candidate does not recreate. Do **not** authorize disposable local replay until those gaps are remediated (or explicitly waived with rationale).

## Pins (verified)

| Pin | Value | Proof |
|-----|-------|-------|
| Production project | `jzmdgwwiestcmmeuhhkr` | `--project-ref` on dump; MCP identity |
| PR #314 HEAD | `f27bc7f01ba99cf5ff65465f14eb3aa82135c4da` | `git rev-parse HEAD` |
| Candidate ancestor | `c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6` | From blocked report only (user abbreviated text rejected) |
| Package seal | `170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e` | Recomputed from Git blobs (`sha256(entryHashes.join('\\n'))`) |
| Bytes / modules | `1,191,852` / `12` | Match |
| CLI | `2.116.0` | `supabase --version` |
| `origin/main` | `9d8a01d37422179ddd68bbd181a8815d8a893577` | Fetched |

User-pasted seal typo `…fbd1d5f18…` / abbreviated candidate text: **rejected**.

## Tooling / protections

- Dry-run confirmed CLI emits `pg_dump --schema-only` (no `--data-only`, no `--use-copy`).
- Dump invoked as: `supabase db dump --project-ref jzmdgwwiestcmmeuhhkr --file <tmp> --yes`.
- Workspace showed `linked: false`; project pin enforced via `--project-ref` (exact ref).
- Session-level `default_transaction_read_only` / custom statement/lock timeouts: **not exposed** by CLI dump wrapper; not applied beyond CLI defaults. Dump preamble contains `SET statement_timeout = 0` / `SET lock_timeout = 0` (pg_dump boilerplate).
- Docker limited to short-lived CLI `pg_dump` helper; no local Supabase stack; no persistent dump containers remain after completion.
- **Note:** `--dry-run` printed an ephemeral `cli_login_postgres` role password to the local console. Dry-run artifact deleted immediately. **Superseded triage (2026-09-07):** classify as ephemeral CLI login-role credential — do **not** rotate the persistent project DB password for this event; clear local terminal history only. See eight-object provenance disposition report. No token/password/URL committed.

## Dump hashes (LF-normalized SHA-256)

| Artifact | Bytes | SHA-256 |
|----------|------:|---------|
| Authoritative schema dump (CLI) | 904,746 | `0eee4dc3b803db3e632443ac7f45b740345279f4c9171ff25ad6f310592a6cd4` |
| Portable structural dump (ACL/owner stripped) | 786,947 | `b745ecfc25965f70ffe19b8fd0b92c3257407eccd8ba02bc07e3e33078512b0c` |

Portable dump derivation: drop `OWNER TO` / `GRANT` / `REVOKE` / `ALTER DEFAULT PRIVILEGES` lines from authoritative dump (CLI has no `--no-owner`/`--no-acl` flags).

## No-data / secret scan

| Check | Authoritative hits |
|-------|-------------------:|
| `COPY` | 0 |
| `INSERT INTO` | 0 |
| JWT-like | 0 |
| Private key PEM | 0 |
| `postgres(ql)://` URIs | 0 |

## Platform prerequisites (catalog only; Auth/Storage not dumped)

CLI dump excludes `auth` / `storage` / other platform schemas (confirmed in dry-run `--exclude-schema`).

| Fact | Value |
|------|-------|
| Postgres | 17.6 |
| `schema_migrations` | 185 (`20260701043602` → `20260827030454`) |
| `public` tables / policies / routines | 226 / 424 / 96 |
| `auth` tables | 23 (includes `auth.users`) |
| `storage` tables | 8 |
| Extensions | `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`, `vector` |
| Candidate platform contract | Asserts `auth.users` + `storage` schema — **satisfied** by catalog |

No Auth/Storage data dump or recreation attempted.

## Schema comparison (public application)

Static inventory from portable dump vs candidate modules excluding platform contract + forward tail.

### Tables

| | Count |
|--|------:|
| Production | 226 |
| Candidate `CREATE TABLE` | 220 |
| Intersection | 220 |

**Production-only (candidate source has no matching create path):**

- `pilot_lifecycle_coverage_downloads`
- `pulse_je_submissions`
- `qbo_accounts_cache`
- `quickbooks_connections`
- `xero_accounts_cache`

**Extraction false negatives (present in candidate via non-`CREATE TABLE` forms):**

- `stripe_webhook_events_legacy` — via `RENAME TO` in slice 1
- (listed in raw extractor as prod-only; classified as covered)

### Functions

Production-only (absent from candidate source): `platform_integrity_chain_status`, `sp_write_pilot_slot_and_event`  
Candidate-only helper: `_d651_slugify_name`

### Views

Static extractor missed dynamic `EXECUTE ... CREATE VIEW`; `qbo_connections_unified` **is** in candidate.  
True production-only gap: `v_platform_integrity_current`

### Policies / triggers

Policy name counts differ sharply (prod 424 vs candidate static 172) — largely methodology (DO-block / dynamic / rename paths + intentional security overlay churn). Not used as sole blocker; table/function/view gaps above are decisive.

### Forward tail vs `origin/main`

| Check | Result |
|-------|--------|
| Candidate marker | `20260906184500_publish_ledger_event_extensions_digest_qualify.sql` |
| Main migrations with version `> 20260827030454` | Exactly that one file |
| Main file SHA-256 | `4f9d11b7bb6efe66fc744f450057366c38294e8ff88cf7aff1da608b0d69c82e` (4048 bytes) |
| `extensions.digest` in candidate forward | yes |
| `extensions.digest` in production dump | **no** (expected — forward unapplied) |

Forward-tail alignment with main: **PASS**.

## Raw-dump deletion proof

Temp dir: `%TEMP%\esc-prod-schema-seal`

Deleted after hashing/comparison:

- `authoritative-schema.sql`
- `portable-schema.sql`

Retained only sanitized JSON copies under `docs/migration-remediation/evidence/` (no raw SQL).

## Helper-container cleanup

Post-dump `docker ps -a` filter for postgres/supabase dump helpers: **none**. Short-lived CLI helper removed itself.

## Exact next gate

1. **Candidate remediation (authorized separately):** add or justify the production-only objects listed above so empty-DB replay can reach production public schema coverage (or document intentional exclusions with product-owner sign-off).
2. Re-run source review / seal comparison as needed after candidate changes.
3. Only then: separately authorize **disposable local replay** (still not authorized).

Still forbidden without new auth: production DDL/DML, `schema_migrations` mutation, `db push`/`pull`/reset/repair/squash, local stack beyond dump helper, Supabase branch create, active migration edits, merge PR #314, capability/kill-switch changes.
