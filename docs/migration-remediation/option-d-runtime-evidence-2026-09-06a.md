# Option D runtime evidence — 2026-09-06a (f9cfc5a1 diagnostic replay)

**Authorization:** one full fresh local Option D diagnostic replay (capture exact 11 failures)  
**PR #313 HEAD (at run):** `f9cfc5a175f809ebad330ff17d84b2547a101758` (draft)  
**PR #312 HEAD:** `5e7c2a53c5fd475543c796e8f38e89432d90af58` (draft)  
**Suite / resolver blobs:** `cec32b34617afe41187a37ad7de65048040a9f45` / `5178894fc6811d9f9fef84b10fb9294504b4679e`  
**Manifest:** blob `ddabefe1…` / SHA-256 `04cd9913…` / 163141 bytes / 150/7  
**Supabase CLI:** 2.116.0  
**Remediation during this run:** none

## Verdicts (separate)

| Scope | Verdict |
|-------|---------|
| Candidate replay | **PASS** (150/150; `sqlApplicationAttempts: 150`) |
| Security and SI/Memory immutability | **PASS** |
| PR #312 setup (suite DB schema-only) | **PASS** (`option_d_pr312_rpc_af7f27fbf147`; `aclGrantsOmitted: true`; 0 app/auth rows) |
| PR #312 RPC validation | **FAIL** (2/13 passed; 11 failed; exit 1) |
| Diagnostic completeness | **complete** (not `vitest_failure_diagnostics_incomplete`) |
| Production dashboard replay parity | **unresolved** |
| **Overall** | **FAIL** |

## First failure vs fallout

- **First failure (A):** `function digest(bytea, unknown) does not exist` during reservation → `publish_ledger_event` Merkle hash.
- **B–J:** `current transaction is aborted…` (or assertion mismatch against that abort). Treated as **transaction-abort fallout** unless a later authorized replay proves otherwise after A is fixed.

Passed expected titles: SETUP; migration compile.

## Sanitized diagnostic artifact

- Path: `docs/migration-remediation/option-d-pr312-vitest-diagnostics-session-f9cfc5a1-1788720001472.json`
- SHA-256: `54db556b183f67ed959ce253a8e753567eecb7b6a1ccf0c97ff9a8c6b146d0a2`
- `credentialsIncluded: false`; reporterComplete true; all 13 titles accounted
- Raw Vitest report and detached worktree removed after persist

## Residual and cleanup

Post-rollback residual **0** (proposals/approvals/executions/provider attempts/ledger/app/Auth).  
`CLEANUP_DONE` — workdir removed, suite DB dropped, port 54322 closed.

## Note on aclGrantsOmitted

Suite restore used `--no-privileges`. The observed error is **missing function resolution** (`digest(bytea, unknown) does not exist`), not `permission denied` — so ACL omission is **not** established as causal for A.
