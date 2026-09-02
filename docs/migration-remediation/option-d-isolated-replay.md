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

5. **Runtime harness** — `run-option-d-isolated-replay.js`  
   - Missing infra / skipped apply / missing PR #312 suite ⇒ **BLOCKED** (never silent PASS)  
   - Defined tests: clean replay apply, schema/RLS inventory, view security, immutability, PR #312 postgres RPC suite

## Scope distinction (required)

| Scope | State after this PR step |
|-------|--------------------------|
| Isolated candidate-lineage validation | Static assemble + gate (PASS when substitutions correct) |
| PR #312 RPC validation | **BLOCKED** until local DB apply + suite run |
| Production dashboard replay parity | **Unresolved** (Option A/B) |

## Infrastructure required for runtime PASS

1. Local Docker + Supabase Postgres on `127.0.0.1:54322` (or allowlisted localhost URL)  
2. `OPTION_D_DATABASE_URL` set (never production)  
3. `OPTION_D_APPLY=1` to apply assembled SQL in order  
4. PR #312 test file present (or checked out) for `npm run test:je-execution-reservation-postgres`  
5. Independent review approval before any remote execution

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
