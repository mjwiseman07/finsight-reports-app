# Option D runtime evidence — 2026-09-05b (f67eae1e)

**Authorization:** one bounded full fresh local Option D replay + one schema-only PR #312 suite DB  
**PR #313 HEAD:** `f67eae1eb1a1ffced77c2ac556b6b0f5a3d2b699` (draft, unchanged)  
**PR #312 HEAD:** `5972a70782549950db23fc46d84c6f85b87affe6` (draft, unchanged)  
**Manifest:** blob `ddabefe1…` / SHA-256 `04cd9913…` / 163141 bytes / 150 entries / 7 substitutions  
**Supabase CLI:** 2.116.0  
**Stopped on:** PR #312 Vitest SETUP seed failure (`42601`) after candidate replay + security + suite DB PASS  
**Remediation:** none (requires separate authorization)

## Verdicts (separate)

| Scope | Verdict |
|-------|---------|
| Candidate replay | **PASS** (150/150; `sqlApplicationAttempts: 150`) |
| Security and SI/Memory immutability | **PASS** |
| PR #312 setup (suite DB schema-only) | **PASS** (`option_d_pr312_rpc_*`; empty app/auth rows; 229 public relations; 415 policies) |
| PR #312 twelve-test RPC validation (SETUP+12) | **FAIL** (0/13 passed; exit 1) |
| Production dashboard replay parity | **unresolved** |
| **Overall** | **FAIL** (stop after first post-replay failure; no remediation) |

## Failure detail (PR #312)

- Phase: `seed_fixture_rows`
- SQLSTATE: `42601`
- Message: `cannot insert multiple commands into a prepared statement`
- Cause: suite `seedFixture` sends multiple `INSERT` statements in one parameterized `client.query(sql, values)` call; node-pg extended protocol rejects this.
- Migration apply phase inside the suite transaction succeeded; failure is at seed.
- Post-rollback residual on suite DB: **0** synthetic rows (executions/provider/approvals/proposals/ledger).

## Suite DB mechanism (sanitized)

- `CREATE DATABASE option_d_pr312_rpc_<runid>` (not `TEMPLATE postgres`)
- `pg_dump --schema-only --no-owner --no-privileges` from same-run local Option D `postgres`
- Session `SET log_min_*` / `transaction_timeout` sanitized for restore
- ACL GRANTs omitted (`--no-privileges`) because extension ACL restore failed closed on this stack; RLS policies/types/functions/extensions preserved
- No production/cloud source; no data copy; `auth.users` count 0 after restore

## Artifacts (session / untracked)

- `.tmp-option-d-preflight-f67eae1e.json` — preflight PASS
- `.tmp-option-d-orchestrator-f67eae1e.json` — apply+security PASS; first suite restore attempt failed (later fixed in phase2)
- `.tmp-option-d-phase2-f67eae1e.json` — suite setup PASS; Vitest FAIL
- `.tmp-option-d-vitest-report-f67eae1e.json` — 13 failed
- `.tmp-option-d-suite-schema-meta-f67eae1e.json` — schema provenance counts

## Cleanup

Stack, suite DBs, DB URL files, schema dumps, worktrees/junctions removed per run protocol (`option-d-runtime-cleanup-2026-09-05b.json`: `CLEANUP_DONE`, `port54322Open: false`, `workdirRemoved: true`). PRs #312/#313 left draft/unmerged. No production/cloud access.
