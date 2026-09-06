# Option D runtime evidence — 2026-09-06f (317e36e5 PASS_RUNTIME)

**Authorization:** one full fresh local Option D replay to validate E2/F/G fixture remediations and complete PR #312 RPC suite  
**PR #313 HEAD (at run):** `317e36e5d03b9277d7c9d7b067eb41c48d3f21ec` (draft)  
**PR #312 HEAD (at run):** `633bdebda51c9c2321ffba6bf0a146dc81243e5d` (draft)  
**Suite / seed / resolver / setup blobs:** `b647f3b1…` / `88ee0df6…` / `5178894f…` / `5f6ff5be…`  
**Manifest:** blob `0d2a39a3…` / SHA-256 `9dc080cf…` / **164204** bytes / **151/7**  
**Supabase CLI:** 2.116.0  
**Remediation during this run:** none  
**Local orchestrator source (untracked, validated then not committed):** `.tmp-option-d-orchestrator-317e36e5.json`  
**Orchestrator artifact SHA-256:** `5629bad17cee85634d88691409c676aee5b6b3ace8b7308fa40a5021fe9615ef` (5284 bytes)

## Verdicts (separate)

| Scope | Verdict |
|-------|---------|
| Candidate replay | **PASS** (151/151) |
| Digest-definition proof | **PASS** |
| Security, RLS, view-security, SI, Memory immutability | **PASS** |
| Schema-only suite DB setup | **PASS** (`option_d_pr312_rpc_65a8b0ee71c4`; 0 app/auth rows; 229 relations / 415 policies) |
| PR #312 RPC validation | **PASS** (SETUP + 12 governed = **13/13**) |
| Diagnostic completeness | **complete** (raw Vitest report deleted; **no** failure diagnostic file — Vitest passed) |
| Production dashboard replay parity | **unresolved** |
| **Overall** | **PASS_RUNTIME** |

## Title statuses (actual execution order)

| Order | Title | Status |
|-------|-------|--------|
| 1 | SETUP: disposable database preparation | passed |
| 2 | migration compile: reservation + transition RPCs exist | passed |
| 3 | A. first reservation inserts row + execution_requested receipt | passed |
| 4 | B. exact idempotency replay → reused, no duplicate receipt | passed |
| 5 | C. approval_id replay with same binding → reused | passed |
| 6 | D. binding mismatch on approval_id → fail closed | passed |
| 7 | **F.** state_version conflict on transition → rejected | passed |
| 8 | E. transition RESERVED → READY_TO_POST + execution_ready receipt | passed |
| 9 | E2. Patent #6 chain adjacency for requested → ready receipts | passed |
| 10 | G. transition RESERVED → PRECHECK_FAILED + execution_precheck_failed receipt | passed |
| 11 | H. concurrent approval_id reservation attempts converge to one execution | passed |
| 12 | I. zero provider-attempt rows for execution reservation path | passed |
| 13 | J. never touches staged production execution custody id | passed |

Notes: **F runs before E** so the execution remains `RESERVED` while proving stale `state_version` rejection. E2 adjacency and G hex idempotency (`"0"×64`) passed. No SQLSTATE `25P02` cascade.

## Diagnostics policy

- Vitest **passed** → sanitized failure diagnostic artifact **not** written (expected).
- Raw JSON report deleted (`rawReportDeleted: true`).
- Gate diagnostics `complete: true`.

## Residual and cleanup

Suite post-rollback residual **0** (application + Auth).  
`CLEANUP_DONE` — suite DBs dropped, ephemeral stack stopped, workdir removed, port **54322** closed.

## Scope distinction (required)

`PASS_RUNTIME` proves Option D isolated clean-replay + PR #312 disposable Postgres suite.  
It does **not** prove production dashboard-branch / MCP migration replay parity (remains unresolved).
