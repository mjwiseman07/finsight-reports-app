# Option D runtime evidence — 2026-09-06c (ce6f5b35 engagement-fixture replay)

**Authorization:** one full fresh local Option D replay to validate engagement-parent fixture repair  
**PR #313 HEAD (at run):** `ce6f5b3536c6c415f60fba690e8f7b3465f0eecb` (draft)  
**PR #312 HEAD (at run):** `f0011f53f2d11de5340ac7f580cad571d983d149` (draft)  
**Suite / seed / resolver blobs:** `4675a74f…` / `9cfcc441…` / `5178894f…`  
**Manifest:** blob `0d2a39a3…` / SHA-256 `9dc080cf…` / **164204** bytes / **151/7**  
**Supabase CLI:** 2.116.0  
**Remediation during this run:** none

## Verdicts (separate)

| Scope | Verdict |
|-------|---------|
| Candidate replay | **PASS** (151/151) |
| Digest-definition proof | **PASS** (committed analyzer) |
| Security and SI/Memory immutability | **PASS** |
| Schema-only suite DB setup | **PASS** (`option_d_pr312_rpc_4771c955adc0`; 0 app/auth rows) |
| PR #312 RPC validation | **FAIL** (0/13; SETUP failed) |
| Diagnostic completeness | **complete** |
| Production dashboard replay parity | **unresolved** |
| **Overall** | **FAIL** |

## First failure vs fallout

- **SETUP first failure:** phase `seed_firm_clients`, SQLSTATE **23502**, table `firm_clients`, column **`company_id`** NOT NULL (D0). Seed omitted `company_id` despite `seed_companies` preceding it.
- **ledger_events_engagement_id_fkey:** **not reached**
- **A–J:** SETUP fallout via `requireJeReuseSetup` (same 23502 signal)

## Sanitized diagnostic artifact

- Path: `docs/migration-remediation/option-d-pr312-vitest-diagnostics-session-ce6f5b35-1788724443308.json`
- SHA-256: `fb0c296ecad7ac9d5e8af13c86076bf801d85a94de5da1210fa79f5b380f8ef3`
- `credentialsIncluded: false`; all 13 titles accounted

## Residual and cleanup

Post-rollback residual **0** (including firms/firm_clients/engagements/companies).  
`CLEANUP_DONE` — port 54322 closed.
