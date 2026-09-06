# Option D runtime evidence — 2026-09-05c (a31a9f5b)

**Authorization:** one bounded full fresh local Option D replay + schema-only PR #312 suite DB  
**PR #313 HEAD:** `a31a9f5b30bd1ae17c67c1add273493ca6945e1d` (draft, unchanged)  
**PR #312 HEAD:** `e550a029fa167cff82f9d1636341721a6d5a80ff` (draft, unchanged)  
**Manifest:** blob `ddabefe1…` / SHA-256 `04cd9913…` / 163141 bytes / 150/7  
**Supabase CLI:** 2.116.0  
**Stopped on:** PR #312 SETUP seed failure after candidate replay + security + suite-DB PASS  
**Remediation:** none (requires separate authorization)

## Verdicts (separate)

| Scope | Verdict |
|-------|---------|
| Candidate replay | **PASS** (150/150; `sqlApplicationAttempts: 150`) |
| Security and SI/Memory immutability | **PASS** |
| PR #312 setup (suite DB schema-only) | **PASS** (`option_d_pr312_rpc_*`; 0 app/auth rows; 229 relations / 415 policies) |
| PR #312 RPC validation (SETUP+12) | **FAIL** (0/13 passed; exit 1; 0 skipped) |
| Production dashboard replay parity | **unresolved** |
| **Overall** | **FAIL** |

## Failure detail (PR #312)

- Named seed phase: `seed_journal_entry_approval_secondary`
- SQLSTATE: `23514`
- Constraint: `journal_entry_approvals_idempotency_key_check`
- Message: new row for relation `journal_entry_approvals` violates check constraint `journal_entry_approvals_idempotency_key_check`
- Progress: one-statement-per-query seeding reached the 9th op (secondary approval); prior seed ops in the transaction succeeded far enough to hit this check.
- Env handoff: PASS (`plaintext_loopback`, `ssl:false`, suite DB only — not `postgres`)
- Post-rollback residual: **0** synthetic rows (proposals/approvals/executions/provider attempts/ledger)

## Cleanup

`CLEANUP_DONE` — workdir removed, port 54322 closed, suite DBs dropped, URL files removed. PRs left draft/unmerged.
