# Production schema seal attempt — BLOCKED — 2026-09-07

**Verdict: BLOCKED**

Read-only production `pg_dump --schema-only` seal did **not** complete. Production was not mutated. Candidate SQL/manifest were not modified. PR #314 remains draft.

## Pin validation (resolved from sixth-review evidence + Git)

| Pin | Verified value | Notes |
|-----|----------------|-------|
| PR #314 HEAD | `ea6c105fec912cd6d8ec8f2226df74dda74046da` | Matches workspace HEAD |
| Candidate ancestor (sixth review) | `c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6` | From committed sixth-review JSON |
| User-pasted candidate commit | `c386185f4a42540f9c485b30c6b9f0972b4ac500` | **Rejected** — transcription mix with older privilege HEAD |
| Candidate seal | `170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e` | Independently recomputed from Git blobs |
| User-pasted seal fragment | `…fd1d5f18…` | **Rejected** — typo (`5f` vs `5d`) |
| Bytes / modules | 1,191,852 / 12 | Match |
| Accounting | `144 unchanged + 6 overlays + 1 forward = 151` | Match |
| Source-review verdict | `PASS_SOURCE_REVIEW` | Sixth-review evidence |
| `origin/main` (fetched) | `9d8a01d37422179ddd68bbd181a8815d8a893577` | Current at seal attempt |

## Production identity (MCP read)

| Field | Value |
|-------|-------|
| Project ref | `jzmdgwwiestcmmeuhhkr` |
| Status | `ACTIVE_HEALTHY` |
| Region | `us-east-2` |
| Database host (sanitized) | `db.jzmdgwwiestcmmeuhhkr.supabase.co` |
| Postgres engine (API) | 17 / `17.6.1.121` |
| `version()` prefix (SQL) | `PostgreSQL 17.6 on x86_64-pc-linux-gnu…` |
| `current_database()` | `postgres` |
| MCP session `transaction_read_only` | `off` (superuser MCP path; not used for dump) |

Sanitized live catalog probes via Supabase MCP `execute_sql` (read SELECT only; no DDL/DML):

- `supabase_migrations.schema_migrations`: **185** rows; min `20260701043602`; max `20260827030454`

(Object-count probes were requested; if the MCP returns only the last statement, treat migration totals above as authoritative for this blocked attempt.)

## Why BLOCKED (Part A tooling/credentials)

| Requirement | Result |
|-------------|--------|
| Authenticated production identity `jzmdgwwiestcmmeuhhkr` | **PASS** (MCP `get_project`) |
| Local `pg_dump` binary | **FAIL** — not on PATH |
| Supabase CLI | Present `2.116.0` |
| `supabase login` / `SUPABASE_ACCESS_TOKEN` | **FAIL** — not available in this session |
| Session `DATABASE_URL` / `SUPABASE_DB_URL` / `SUPABASE_READONLY_DATABASE_URL` | **FAIL** — unset; not present in local `.env.local` keys |
| `supabase db dump --project-ref …` | **FAIL** — Access token not provided |
| Credentials printable/persisted | Avoided |

Per authorization Part A.8: stop when credentials/tooling cannot be verified for the required dump path.

## Raw dumps

- Authoritative schema dump: **not created**
- Portable structural dump: **not created**
- Raw-dump deletion proof: **N/A** (nothing written)

## Candidate package

- Candidate SQL and `MANIFEST.json`: **unchanged**
- Active `supabase/migrations/`: **unchanged**
- Production: **unmodified**

## Exact next bounded authorization

Provide **one** of the following session-only credentials to the agent (do not commit; do not paste into evidence artifacts):

1. `SUPABASE_ACCESS_TOKEN` so CLI can `supabase db dump --project-ref jzmdgwwiestcmmeuhhkr` (schema-only; no `--data-only`), **or**
2. A **read-only** Postgres URL (preferred: dedicated verifier role / `SUPABASE_READONLY_DATABASE_URL`) usable with installed `pg_dump` (install PostgreSQL 17 client tools if needed),

Then re-authorize the same **read-only full production `pg_dump --schema-only` seal and comparison** bound to:

- PR HEAD at time of resume (currently `ea6c105f…` unless only this BLOCKED note is committed)
- Candidate ancestor `c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6`
- Seal `170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e`

Still no Docker replay, DDL/DML, migration repair, branch mutation, or candidate SQL changes.
