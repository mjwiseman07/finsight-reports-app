# Option D runtime evidence — 2026-09-05d (b9d5d037)

**Authorization:** one bounded full fresh local Option D replay + schema-only PR #312 suite DB  
**PR #313 HEAD (at run):** `b9d5d037d95c13a0612e1c485cdae1ef0480a527` (draft, unchanged during replay)  
**PR #312 HEAD:** `5e7c2a53c5fd475543c796e8f38e89432d90af58` (draft, unchanged)  
**PR #312 suite blob:** `cec32b34617afe41187a37ad7de65048040a9f45`  
**PR #312 resolver blob:** `5178894fc6811d9f9fef84b10fb9294504b4679e`  
**Manifest:** blob `ddabefe12573bbfd073464a7d220a1e5275ad2c8` / SHA-256 `04cd991347959c684293f372418ad6538d2a7ad8715c98caefb760d8789b39ae` / 163141 bytes / 150/7  
**Supabase CLI:** 2.116.0  
**Stopped on:** PR #312 RPC Vitest after candidate replay + security + suite-DB PASS  
**Remediation during this run:** none  
**Per-test assertion/SQLSTATE text:** **not preserved** (raw Vitest report deleted with detached worktree before sanitized capture existed). Diagnostic-persistence remediation follows under separate authorization on PR #313 only.

## Verdicts (separate)

| Scope | Verdict |
|-------|---------|
| Candidate replay | **PASS** (150/150; `sqlApplicationAttempts: 150`) |
| Security and SI/Memory immutability | **PASS** |
| PR #312 setup (suite DB schema-only) | **PASS** (`option_d_pr312_rpc_2a3c39bf6118`; mechanism `pg_dump_schema_only_no_owner_no_privileges_sanitized_session_sets_then_psql_restore`; 0 app/auth rows; 229 relations / 415 policies; `aclGrantsOmitted: true`) |
| PR #312 RPC validation (SETUP+12) | **FAIL** (2/13 expected titles passed; 11 failed; exit 1; 0 skipped/todo/pending) |
| Production dashboard replay parity | **unresolved** |
| **Overall** | **FAIL** (`reason: vitest_nonzero_exit`) |

## Vitest accounting (gate; no sanitized messages)

Passed expected titles:

- `SETUP: disposable database preparation`
- `migration compile: reservation + transition RPCs exist`

Failed expected titles (A–J; assertion bodies not retained by this run’s harness):

- `A. first reservation inserts row + execution_requested receipt`
- `B. exact idempotency replay → reused, no duplicate receipt`
- `C. approval_id replay with same binding → reused`
- `D. binding mismatch on approval_id → fail closed`
- `E. transition RESERVED → READY_TO_POST + execution_ready receipt`
- `E2. Patent #6 chain adjacency for requested → ready receipts`
- `F. state_version conflict on transition → rejected`
- `G. transition RESERVED → PRECHECK_FAILED + execution_precheck_failed receipt`
- `H. concurrent approval_id reservation attempts converge to one execution`
- `I. zero provider-attempt rows for execution reservation path`
- `J. never touches staged production execution custody id`

Env handoff: PASS (`plaintext_loopback`, `ssl:false`, suite DB only — not `postgres`)  
Post-rollback residual: **0** synthetic rows (proposals/approvals/executions/provider attempts/ledger)

## Static hypotheses only (not runtime-proven)

Inspected pinned PR #312 suite/seed at `5e7c2a53…` without changing them. Possible shared causes for “SETUP+compile PASS, A–J FAIL” — **hypotheses only**:

1. Suite DB restore uses `--no-privileges` / `aclGrantsOmitted: true`; compile checks only that RPCs exist, while A–J invoke them under role/ACL that may differ from platform `postgres` grants.
2. Shared `requireJeReuseSetup` / client session state after SETUP could diverge for later cases without surviving assertion text.
3. RPC binding, search_path, or schema-only omission of a non-table dependency not exercised by the compile probe.
4. Unrelated assertion failures inside reservation/transition paths (needs sanitized diagnostics from a fresh replay).

Do **not** treat these as root cause. A separately authorized replay after diagnostic-persistence lands is required to capture exact SQLSTATE/messages for the 11 failures.

## Cleanup

`CLEANUP_DONE` — workdir removed, port 54322 closed, suite DBs dropped, URL/status/schema temp files removed. PRs left draft/unmerged. No production/cloud access, merge, deploy, or capability changes.
