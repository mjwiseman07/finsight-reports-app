# Option D runtime evidence — 2026-09-06e (4f4b9309 approval-ID + SAVEPOINT validation)

**Authorization:** one full fresh local Option D replay to validate approval-ID reuse and SAVEPOINT containment  
**PR #313 HEAD (at run):** `4f4b9309e0eca2f8a15ec38ea5fbb439c330103e` (draft)  
**PR #312 HEAD (at run):** `3a2f2efc69b17499c8885c18081f6f3ef550d6c1` (draft)  
**Suite / seed / resolver / setup blobs:** `f9ce8541…` / `ccaa60cf…` / `5178894f…` / `1635517a…`  
**Manifest:** blob `0d2a39a3…` / SHA-256 `9dc080cf…` / **164204** bytes / **151/7**  
**Supabase CLI:** 2.116.0  
**Remediation during this run:** none

## Verdicts (separate)

| Scope | Verdict |
|-------|---------|
| Candidate replay | **PASS** (151/151) |
| Digest-definition proof | **PASS** |
| Security and SI/Memory immutability | **PASS** |
| Schema-only suite DB setup | **PASS** (`option_d_pr312_rpc_4b5587cadd26`; 0 app/auth rows) |
| PR #312 RPC validation | **FAIL** (7/13) |
| Diagnostic completeness | **complete** |
| Production dashboard replay parity | **unresolved** |
| **Overall** | **FAIL** |

## Title statuses (13/13)

| Title | Status | Notes |
|-------|--------|-------|
| SETUP | passed | |
| compile | passed | |
| A | passed | |
| B | passed | `reuse_reason=idempotency_key` |
| C | passed | `reuse_reason=approval_id` (distinct `d`×64) |
| D | passed | SAVEPOINT containment + health |
| E | passed | no 25P02 from D |
| **E2** | **failed** | first independent — `previous_event_hash` null |
| F | failed | independent — status concurrency vs expected state_version |
| G | failed | independent — 23514 idempotency CHECK (`h`∉[a-f0-9]) |
| H–J | failed | 25P02 fallout from uncontained G |

## Sanitized diagnostic artifact

- Path: `docs/migration-remediation/option-d-pr312-vitest-diagnostics-session-4f4b9309-1788729242390.json`
- SHA-256: `ee8e33537012d4b40b08e05d63afd63740d823587268ef33a591c0dd96192215`
- `credentialsIncluded: false`; all 13 titles accounted; `complete: true`

## Residual and cleanup

Post-rollback residual **0**. `CLEANUP_DONE` — port 54322 closed.
