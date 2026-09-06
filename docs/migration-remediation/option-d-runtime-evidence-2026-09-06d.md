# Option D runtime evidence — 2026-09-06d (f643c8c1 company_id fixture validation)

**Authorization:** one full fresh local Option D replay to validate `firm_clients.company_id` fixture repair  
**PR #313 HEAD (at run):** `f643c8c1ee87d39fbd38546b176baf52705a712b` (draft)  
**PR #312 HEAD (at run):** `da4ff14366d47b906962770b5d4e187a4d1853d0` (draft)  
**Suite / seed / resolver blobs:** `4675a74f…` / `ccaa60cf…` / `5178894f…`  
**Manifest:** blob `0d2a39a3…` / SHA-256 `9dc080cf…` / **164204** bytes / **151/7**  
**Supabase CLI:** 2.116.0  
**Remediation during this run:** none

## Verdicts (separate)

| Scope | Verdict |
|-------|---------|
| Candidate replay | **PASS** (151/151) |
| Digest-definition proof | **PASS** |
| Security and SI/Memory immutability | **PASS** |
| Schema-only suite DB setup | **PASS** (`option_d_pr312_rpc_74d4d73e7dbb`; 0 app/auth rows) |
| PR #312 RPC validation | **FAIL** (5/13) |
| Diagnostic completeness | **complete** |
| Production dashboard replay parity | **unresolved** |
| **Overall** | **FAIL** |

## Title statuses (13/13)

| Title | Status |
|-------|--------|
| SETUP: disposable database preparation | passed |
| migration compile: reservation + transition RPCs exist | passed |
| A. first reservation inserts row + execution_requested receipt | passed |
| B. exact idempotency replay → reused, no duplicate receipt | passed |
| C. approval_id replay with same binding → reused | **failed** (first independent) |
| D. binding mismatch on approval_id → fail closed | passed |
| E. transition RESERVED → READY_TO_POST + execution_ready receipt | failed (25P02 fallout) |
| E2. Patent #6 chain adjacency for requested → ready receipts | failed (25P02) |
| F. state_version conflict on transition → rejected | failed (25P02) |
| G. transition RESERVED → PRECHECK_FAILED + execution_precheck_failed receipt | failed (25P02) |
| H. concurrent approval_id reservation attempts converge to one execution | failed (25P02) |
| I. zero provider-attempt rows for execution reservation path | failed (25P02) |
| J. never touches staged production execution custody id | failed (25P02) |

## First failure vs fallout

- **C (independent):** expected `reuse_reason=approval_id`, received `idempotency_key`. C reused A/B’s same `"c"×64` idempotency key, so key-first RPC precedence correctly classified the hit. No SQLSTATE.
- **`firm_clients.company_id` NOT NULL:** gone (SETUP passed).
- **`ledger_events_engagement_id_fkey`:** gone (A passed).
- **E–J:** SQLSTATE **25P02** transaction-abort cascade after D’s expected `RAISE` on the shared suite transaction (no SAVEPOINT).

## Sanitized diagnostic artifact

- Path: `docs/migration-remediation/option-d-pr312-vitest-diagnostics-session-f643c8c1-1788727014195.json`
- SHA-256: `f08a991bc2345ef88a498342fe0e987d153e0bc3b7ff8c4edbd2158dc953011c`
- `credentialsIncluded: false`; all 13 titles accounted; `complete: true`

## Residual and cleanup

Post-rollback residual **0** (companies/firms/firm_clients/engagements/proposals/approvals/executions/attempts/ledger/auth).  
`CLEANUP_DONE` — port 54322 closed.
