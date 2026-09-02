# Option D: isolated Git replay harness (PR #313)

**Status:** Mechanism design + local implementation for independent review  
**Not:** merge approval, production parity confirmation, or runtime PASS without local infra  
**Selected mechanism:** Option D (isolated test DB from corrected Git lineage)  
**Deferred:** production `statements[]` repair (Option A/B) — separate track

## HEAD anchors

| Ref | SHA |
|-----|-----|
| PR #313 branch (this work) | see latest push on `chore/supabase-migration-lineage-remediation` |
| PR #312 (must stay unchanged) | `f65730b3d38e9cb3b192e54f62c798c74a07a1c2` |

## What was built

1. **Deterministic assembler** — `scripts/migration-remediation/assemble-option-d-replay.js`  
   - Foundations baseline + phase1 recovered + post-phase1 local files  
   - In-place substitutions (same filename slot — **not** appended after failing originals)  
   - Manifest with original/replacement SHA-256, order, justification

2. **Substitutions** (under `supabase/migrations-draft/option-d-isolated-replay/substitutions/`):
   - `d6_2a`–`d6_2d` — registry UPDATE + guarded `firm_clients` INSERT  
   - `tcp1_w1_solo_bk_pilot_slots` — full schema retained; seed guarded via `companies`  
   - `accounting_canonical_connected_grant` — schema-only unique index; prod RAISE body omitted

3. **Target safety** — `option-d-target-safety.js` rejects production project ref `jzmdgwwiestcmmeuhhkr` and `*.supabase.co` remotes; allowlist localhost / 127.0.0.1 / ::1 only. URLs redacted in status files.

4. **Gates**
   - **Option D candidate gate** (`audit-option-d-replay-gate.js`) — must pass (`mergeReady: true`) for the assembled set  
   - **Active migrations gate** (`audit-data-dependent-replay-gate.js`) — remains **failing** until promotion into `supabase/migrations/` (separate)

5. **Runtime harness** — `run-option-d-isolated-replay.js` (fail-closed)  
   - Fresh disposable DB precheck (`option-d-fresh-db-guard.js`) before any write  
   - **Executed** post-apply security bundle (`option-d-security-assertions.js`): schema/RLS, view `security_invoker`, SI/Memory immutability  
   - Structured Vitest gate (`option-d-vitest-result-gate.js`): expected PR #312 tests must execute; zero skip/todo/pending/fail; pinned to `f65730b3`  
   - Separate statuses; `PASS_RUNTIME` only if all applicable gates PASS

## Scope distinction (required)

| Scope | State after this PR step |
|-------|--------------------------|
| `candidateReplay` | Static PASS; runtime PASS only after fresh-DB apply |
| `securityImmutabilityChecks` | **BLOCKED** until executed post-apply assertions PASS |
| `pr312RpcValidation` | **BLOCKED** until structured Vitest PASS on pinned suite |
| `productionDashboardReplayParity` | **Unresolved** (Option A/B; not applicable to Option D PASS) |

## Infrastructure required for runtime PASS

1. Create a **fresh empty** local DB named `option_d_*` (not `postgres`)
2. `OPTION_D_DISPOSABLE_DB_NAME` matching that name
3. `OPTION_D_DATABASE_URL` on allowlisted localhost only
4. `OPTION_D_APPLY=1`
5. PR #312 suite file present and **byte-matching** commit `f65730b3` (`execution-reservation.postgres.integration.test.ts`)
6. Structured Vitest JSON must show all 12 expected tests **passed**, with **zero** skipped/todo/pending/failed
7. Post-apply security assertions must **execute and PASS** (RLS, view security_invoker, SI/Memory immutability triggers)

Missing any of the above ⇒ **BLOCKED** / **FAIL** — never silent PASS.

## Commands

```bash
node scripts/migration-remediation/assemble-option-d-replay.js
node scripts/migration-remediation/audit-option-d-replay-gate.js
node scripts/migration-remediation/audit-data-dependent-replay-gate.js   # expect FAIL on active migrations
node scripts/migration-remediation/run-option-d-isolated-replay.js      # expect BLOCKED without local DB
```

## Explicit non-goals (this step)

- No paid Supabase branch  
- No production mutation / migration-history repair  
- No merge / deploy  
- No QBO/OAuth / live custody / Memory writes  
- No capability changes (all OFF; kill switches ON)  
- PR #312 HEAD unchanged
