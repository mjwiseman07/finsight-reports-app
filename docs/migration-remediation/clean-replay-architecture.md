# Clean replay architecture (corrected after independent review)

**Status:** PR #313 INDEPENDENT REVIEW — **CHANGES REQUIRED**  
**Do not authorize a third paid Supabase branch until this architecture is reviewed.**

## Critical correction: later guarded git migrations cannot repair dashboard replay

Dashboard/MCP preview branches replay **`schema_migrations.statements[]` from production history**, not git `supabase/migrations/` files alone.

```
Fresh dashboard branch
  → applies hardened baseline (git draft, first-time recording)
  → replays production migration #1 … #N in version order
  → each step executes the STORED statement for that version
```

At migration **#26** the branch executes the **production-recorded** statement for:

| Field | Value |
|-------|--------|
| Version | `20260703182655` |
| Name | `d6_2a_test_client_activation` |
| Statement | Unconditional `INSERT INTO client_active_rules` for fixture `71111111-…` |

That statement **fails on a data-less branch before any later migration can run**.

Adding a new guarded migration file with a **later filename** in git does **not** change what the branch executes at step 26. **The prior proposal (86ce80d0) is insufficient by itself.**

---

## Executable ordering (dashboard production-history track)

| Step | Source | What executes | Data-less result |
|------|--------|---------------|------------------|
| 0 | Git draft baseline | `20260701043599_foundations_baseline.sql` | **PASS** (proven G2 #2) |
| 1–4 | Prod statements | Phase1 recovered SQL | **PASS** (RLS on 5 tables) |
| 5–17 | Prod statements | Schema + reference (checklist, d0 identity, …) | **PASS** |
| **18** | Prod statement | **`d1_qbo_write_readiness`** → creates `qbo_connections_unified` | **PASS** (view created; see provenance doc) |
| 19–24 | Prod statements | d1_1 backfill (guarded no-op), d2–d6_0 | **PASS** |
| **25** | Prod statement | **`d6_2a_test_client_activation`** | **FAIL** (FK) |
| 26+ | Never reached | d6_2b–d6_2d, … JE stack | **BLOCKED** |

Later git-only guarded files **do not appear in this sequence** unless the mechanism below changes what step 25 executes.

---

## Supported replay mechanisms (evaluated separately)

### Option A — Production `statements[]` replacement / recording (G4)

| Question | Answer |
|----------|--------|
| **What SQL executes on fresh branch?** | After baseline, production history steps 1–24 unchanged; **step 25 executes the newly recorded guarded statement** for version `20260703182655` (same version, replaced body) OR a squash replaces the whole chain |
| **Production schema/data changes?** | **Yes** if recording requires executing replacement SQL on production (must be idempotent no-op or approved squash) |
| **Migration history changes?** | **Yes** — `schema_migrations.statements[]` for affected version(s) |
| **Rollback** | Restore prior `statements[]` from backup; revert squash per Supabase runbook |
| **Supabase docs** | [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations); branching replays stored statements |
| **Audit provenance** | Preserved if version timestamps unchanged and replacement is documented; **destructive if versions rewritten without record** |
| **Fixes d6_2a at step 25?** | **Yes** — only if the stored statement for `20260703182655` is replaced with guarded SQL |
| **`migration repair` alone?** | **No** — repair changes tracking only, does not execute or replace `statements[]` |

**Required for dashboard track:** Approved G4 workflow to record guarded statement **at the same production version** (or official squash changing branch replay source).

---

### Option B — Official squash / baseline (Supabase-supported)

| Question | Answer |
|----------|--------|
| **What SQL executes?** | New baseline migration + shortened history; branches replay squashed chain |
| **Production changes?** | **Yes** — high-risk history surgery |
| **Migration history?** | **Yes** — replaced |
| **Rollback** | Supabase support / backup restore |
| **Docs** | [Managing migrations](https://supabase.com/docs/guides/deployment/database-migrations) (squash patterns) |
| **Fixes d6_2a?** | **Yes** if squash omits or guards operational activations |
| **Provenance** | Requires explicit audit trail of squash event |

---

### Option C — GitHub-integrated preview (git-authoritative)

| Question | Answer |
|----------|--------|
| **What SQL executes?** | Files in git `supabase/migrations/` in filename order — **not** production `statements[]` |
| **Production changes?** | **No** for preview itself |
| **Migration history on branch?** | Branch-local; independent of prod `statements[]` |
| **Rollback** | Delete preview branch |
| **Docs** | [GitHub integration branching](https://supabase.com/docs/guides/deployment/branching/github-integration) |
| **Fixes d6_2a?** | **Yes** if git file at semantic position uses guarded SQL (promote corrected file to `supabase/migrations/`) |
| **Provenance** | Git commits; production history remains separate (G4 still needed for prod parity) |

**Viable for PR #312 Postgres gate** once git lineage includes guarded d6_2a–d at correct positions and full chain reaches JE stack.

---

### Option D — Isolated test database from git lineage (local / CI)

| Question | Answer |
|----------|--------|
| **What SQL executes?** | `supabase db reset` or sequential apply of git migrations + draft baseline |
| **Production changes?** | **No** |
| **Migration history?** | Local only |
| **Rollback** | Drop local DB |
| **Docs** | [Local development](https://supabase.com/docs/guides/local-development) |
| **Fixes d6_2a?** | **Yes** when git files use guarded SQL |
| **Blocker today** | Docker unavailable (G2 local gate) |

---

## Per-migration treatment (dashboard track vs git track)

| Migration | Prod # | Dashboard track fix | Git track fix |
|-----------|--------|---------------------|---------------|
| `d6_2a_test_client_activation` | 26 | Replace **stored statement** at `20260703182655` OR squash | Guarded SQL in `supabase/migrations/` before promote |
| `d6_2b_mfg_activation` | 27 | Same pattern at `20260703184839` | Guarded SQL |
| `d6_2c_retail_activation` | 28 | Same at `20260703190541` | Guarded SQL |
| `d6_2d_ps_activation` | 29 | Same at `20260703192608` | Guarded SQL |
| `tcp1_w1_solo_bk_pilot_slots` | ~80 | Replace stored statement or guard seed | Remove/guard complimentary `pilot_slots` INSERT |
| `accounting_canonical_connected_grant` | ~158 | Classify **prod-only**; skip on clean replay OR replace statement | Skip or isolate to prod parity track |

**Draft guarded SQL** lives in `supabase/migrations-draft/clean-replay-proposals/` for review — **not executable on dashboard track until recorded at the same version (Option A) or git-promoted (Option C/D).**

---

## Recommendation for next independent review

**Selected for PR #312 Postgres gate path:** **Option D** (isolated Git replay harness) — see `option-d-isolated-replay.md`.  
Production migration-history repair remains **separate** (Option A/B). This selection is a **mechanism recommendation**, not merge approval or runtime confirmation.

**Production parity / dashboard branches:** **Option A or B** (G4) — must change what executes at version `20260703182655`, not add a later file.

**Do not authorize a third paid dashboard branch** until:
1. Option D local runtime clean apply + PR #312 RPC suite PASS on allowlisted localhost
2. Explicit authorization for any remote/paid resource
3. Production history repair (if still needed for dashboard parity) reviewed separately

---

## What remains unproven

- Clean replay through `journal_entry_executions` and `persist_journal_entry_execution_reservation`
- Whether GitHub-integrated previews inherit production `statements[]` for migrations already in prod history (verify with Supabase docs/support before G3)
