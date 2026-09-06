# Option D runtime evidence — 2026-09-06b (18b0bb3d digest-proof replay)

**Authorization:** one full fresh local Option D replay to validate `extensions.digest` forward migration and rerun PR #312  
**PR #313 HEAD (at run):** `18b0bb3db75a100767901564e5b302313d155c05` (draft)  
**PR #312 HEAD (at run):** `af735758717e41b322e44e4abe174fbe524f3c3d` (draft)  
**Suite / resolver blobs (at run):** `cec32b34617afe41187a37ad7de65048040a9f45` / `5178894fc6811d9f9fef84b10fb9294504b4679e`  
**Manifest:** blob `0d2a39a3d4220c8d28e3269a87fa8c01e8bf2d4e` / SHA-256 `9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359` / **164204** bytes / **151/7**  
**Order 150:** `20260906184500_publish_ledger_event_extensions_digest_qualify.sql`  
**Supabase CLI:** 2.116.0  
**Remediation during this run:** none (probe false-positive corrected in session-only orchestrator after apply PASS; resume post-apply)

## Verdicts (separate)

| Scope | Verdict |
|-------|---------|
| Candidate replay | **PASS** (151/151; `sqlApplicationAttempts: 151`) |
| Forward-migration digest definition proof | **PASS** (`extensions.digest(..., 'sha256'::text)`; `search_path=public, pg_temp`) |
| Security and SI/Memory immutability | **PASS** |
| PR #312 setup (suite DB schema-only) | **PASS** (`option_d_pr312_rpc_379b7b2e181c`; `aclGrantsOmitted: true`; 0 app/auth rows) |
| PR #312 RPC validation | **FAIL** (2/13 passed; 11 failed; exit 1) |
| Diagnostic completeness | **complete** (not `vitest_failure_diagnostics_incomplete`) |
| Production dashboard replay parity | **unresolved** |
| **Overall** | **FAIL** |

## First failure vs fallout

- **First independent failure (A):** `insert or update on table "ledger_events" violates foreign key constraint "ledger_events_engagement_id_fkey"` (Postgres class **23503**). Digestion resolution error is **gone**.
- **B–J:** `current transaction is aborted…` (or assertion mismatch against that abort). Classified as **transaction-abort fallout** unless a later authorized replay proves otherwise after A is fixed.

Passed expected titles: SETUP; migration compile.

## Sanitized diagnostic artifact

- Path: `docs/migration-remediation/option-d-pr312-vitest-diagnostics-session-18b0bb3d-1788722257826.json`
- SHA-256: `28b33c2a4ac5f0b6ef7c8b1b6ea811f5a48788cd4ca9bb6979a8729cfc5107bb`
- `credentialsIncluded: false`; reporterComplete true; all 13 titles accounted
- Raw Vitest report and detached worktree removed after persist

## Residual and cleanup

Post-rollback residual **0** (proposals/approvals/executions/provider attempts/ledger/app/Auth).  
`CLEANUP_DONE` — workdir removed, suite DB dropped, port 54322 closed.

## Note on aclGrantsOmitted

Observed error is **FK violation** (`ledger_events_engagement_id_fkey`), not `permission denied` — ACL omission is **not** causal for A.
