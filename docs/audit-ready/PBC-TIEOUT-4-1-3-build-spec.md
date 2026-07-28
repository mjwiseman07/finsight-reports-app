# PBC-TIEOUT-4.1.3 — Family 2 Emitter Table Decoupling

**Phase:** PBC-TIEOUT-4.1.3  
**Prior main tip:** `34bcaf4a`  
**Branch:** `feature/pbc-tieout-413-family2-emitter-decoupling`  
**Merge order:** Any time (no external gate; parallelizable with 4.3 Block A)  
**Retirement follow-up:** PBC-TIEOUT-4.1.3.b (8-day observation window from 4.1.3 merge SHA)  
**Reference:** `docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md`

## Goal (one sentence)

Refactor the 3 Family 2 emitters (`bsAccountEmitter`, `faRollforwardEmitter`, `bsSummaryEmitter`) to source their `build(runId)` output from the canonical run stack (`loadRunContext` + `loadVariances` + `ctx.rawQboPayload`), matching the AP/AR/inventory/GRNI emitter pattern, with a tagged legacy fallback for the 8-day observation window before 4.1.3.b removes the fallback.

## Non-goals (explicit)

- Do not change the `WorkpaperEmitter` interface
- Do not add methods or fields to `EMITTER_REGISTRY`
- Do not touch `audit-ready-recons` bucket writes (Block F Part 2)
- Do not drop, alter, or stop writing to any legacy artifact tables (that's 4.1.3.b)
- Do not add new emitters (that's 4.1.4a/b/c)
- Do not add kickout logic to emitters (wrong layer — kickouts live on variances)
- Do not invent helper functions if the canonical stack already provides equivalents

## Reference implementation

`lib/audit-ready/tie-out/emitters/ap-emitter.ts` is the canonical pattern. Read its `build(runId)` method before touching any Family 2 emitter. The shape is:

```typescript
async build(runId: string): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  const variances = await loadVariances(runId);
  const sourceData = sourceDataFromPayload(ctx.rawQboPayload);
  const face = /* assemble from ctx run totals + engagement name */;
  const backup = /* assemble from ctx.rawQboPayload + variances */;
  return { face, backupTabs: backup, sourceData /* etc */ };
}
```

GRNI additionally uses `loadEvidence(runId)` from the same `_shared/load-run.ts`. The 3 Family 2 emitters may or may not need evidence — determined per emitter during implementation.

## Canonical helper stack (do not invent parallel APIs)

| Helper | Location |
|---|---|
| `loadRunContext(runId)` | `lib/audit-ready/tie-out/emitters/_shared/load-run.ts` |
| `loadVariances(runId)` | same |
| `loadEvidence(runId)` | same |
| `sourceDataFromPayload(raw)` | same |
| `dualWriteWorkpaper({emitter, runId, engagementId, generatedBy})` | `lib/audit-ready/tie-out/emitters/_shared/emit-common.ts` |
| `uploadRunArtifact(...)` | `lib/audit-ready/tie-out/upload-artifact.ts` |

Any additional helper needed by a Family 2 emitter that isn't already in the shared stack must be added to the shared file — not inlined per emitter.

**Canonical tables:**

- Run: `audit_ready_tie_out_runs` (payload column: `raw_qbo_payload_jsonb`)
- Engagement: `audit_ready_engagements`
- Variances: `audit_ready_tie_out_variances`
- Evidence: `audit_ready_tie_out_variance_evidence`
- Canonical artifacts: `audit_ready_run_artifacts` via `uploadRunArtifact`

## Six-phase execution

Each phase gates on prior. Cursor MUST NOT proceed past a gate without explicit approval from mjwiseman07.

### Phase 1 — Branch + docs commit (Cursor)

Only produces the two docs, no code changes.

1. `git checkout main && git pull origin main`
2. `git log -1 --oneline` — verify tip is `34bcaf4a` or newer
3. `git checkout -b feature/pbc-tieout-413-family2-emitter-decoupling`
4. Create `docs/audit-ready/PBC-TIEOUT-4-1-3-inventory.md` with the inventory contents provided
5. Create `docs/audit-ready/PBC-TIEOUT-4-1-3-build-spec.md` with this spec's contents
6. Commit + push + open draft PR
7. Post PR comment requesting review
8. **STOP.** Do not proceed to Phase 2 without human go.

### Phase 2 — Emitter refactor (only after Phase 1 approval)

For each of the 3 Family 2 emitters, in this order (smallest blast radius first):

1. `emitters/bs-account-emitter.ts` first
2. `emitters/fa-rollforward-emitter.ts` second
3. `emitters/bs-summary-emitter.ts` third (largest, includes `list-kickouts.ts` fix)

#### Per-emitter refactor procedure

**Step A. Read reference:** Open `lib/audit-ready/tie-out/emitters/ap-emitter.ts` and study its `build(runId)` implementation.

**Step B. Read current emitter + resolver:**

- Read the target emitter's current `build()` — note every legacy table read and every field it extracts
- Read the resolver's payload construction — verify `raw_qbo_payload_jsonb` contains equivalent data

**Step C. Gap analysis:**

For each field the emitter extracts from legacy tables, identify its canonical source:

- Run totals column? (`subledger_total_cents`, `gl_total_cents`, `totals_variance_cents`, `totals_status`, `period_end`, etc.)
- Payload field? (`ctx.rawQboPayload.<...>`)
- Variance row? (`loadVariances(runId)` result)
- Evidence row? (`loadEvidence(runId)` result)
- NONE of the above? → Design decision needed:
  - **(Preferred)** Extend the resolver's payload construction to include the missing field additively
  - **(Alternative)** Add a column to the run table (harder — additive migration required)
  - Do NOT invent a new intermediate table
  - Do NOT read from legacy in a "temporary permanent" way

Every gap must be resolved in Phase 2 — no gaps carried into Phase 3.

**Step D. Rewrite `build()`:**

Structure exactly matching AP emitter:

```typescript
async build(runId: string): Promise<WorkpaperPayload> {
  const ctx = await loadRunContext(runId);
  const variances = await loadVariances(runId);
  // Only if needed:
  // const evidence = await loadEvidence(runId);
  const sourceData = sourceDataFromPayload(ctx.rawQboPayload);

  const face = assembleFace(ctx /*, ...*/);
  const backupTabs = assembleBackup(ctx.rawQboPayload, variances /*, evidence */);

  // PBC-TIEOUT-4.1.3.b removes this fallback
  if (!face || !backupTabs) {
    return readLegacy<Kind>Artifact(runId);
  }

  return { face, backupTabs, sourceData };
}
```

The `assembleFace` / `assembleBackup` helpers are local functions inside the emitter file — do not put them in `_shared` unless multiple emitters need identical logic (unlikely; each has different face shape).

The `readLegacy<Kind>Artifact(runId)` helper is the current `build()` body extracted verbatim as a private function. Rename with `readLegacy` prefix. Tag with:

```typescript
// PBC-TIEOUT-4.1.3.b removes this function entirely
async function readLegacyBsReconArtifact(runId: string): Promise<WorkpaperPayload> {
  // ... original build() body, unchanged
}
```

**Step E. Fallback trigger:**

`if (!face || !backupTabs)` is the minimum. Add stricter guards if certain fields are known to be optional-in-payload — e.g., a specific field's absence indicates canonical path is incomplete.

Do NOT trigger the fallback based on:

- `try/catch` (that hides real errors)
- Presence of legacy row (that keeps legacy authoritative — defeats the purpose)
- Any check that doesn't semantically mean "canonical assembly failed"

**Step F. Commit per emitter:**

Individual commit for each emitter refactor. Commit message:

```text
refactor(4.1.3): decouple <name>Emitter from legacy <table> tables

Sources face + backup from canonical run stack (loadRunContext + loadVariances
+ rawQboPayload). Legacy artifact table read preserved as fallback tagged for
PBC-TIEOUT-4.1.3.b removal.
```

### Phase 3 — Reader fallbacks

**Step A.** `lib/audit-ready/kickouts/list-kickouts.ts`:

- Currently joins summary artifact id → `run_id` through `audit_ready_bs_recon_summary_artifacts`
- Prefer direct `run_id` linkage (where available)
- Fall back to legacy join only if the canonical run ID lookup returns null
- Tag every fallback with `// PBC-TIEOUT-4.1.3.b removes this fallback`

**Step B.** `lib/audit-ready/tie-out/bs-recon-artifacts.ts`:

- Any exported function that SELECTs from `audit_ready_bs_recon_artifacts` (or the FA / summary equivalents):
  - Rename current implementation to `<name>Legacy` (private)
  - Add new canonical-first implementation matching the same signature
  - Public export wraps: try canonical, fall back to legacy
  - Tag legacy read

**Step C.** Regenerate / download routes:

- Grep `lib/audit-ready/tie-out/regenerate-run.ts` and `app/api/audit-ready/**` for `.from('audit_ready_bs_recon_artifacts')` or FA/summary equivalents
- If any route reads legacy artifacts directly: same fallback pattern + same tag

### Phase 4 — Tests

Per emitter, add or update `lib/audit-ready/tie-out/emitters/__tests__/<name>-emitter.test.ts`:

Required assertions:

1. **Canonical happy path:** Mock `loadRunContext` + `loadVariances` (+ `loadEvidence` if used) to return valid data. Assert `build()` returns valid `WorkpaperPayload`. Assert `.from('audit_ready_<legacy_table>')` is NOT called on the supabase mock.
2. **Fallback path:** Mock canonical helpers to return incomplete data (missing fields triggering the fallback guard). Assert `build()` reads legacy tables and returns valid payload from that path.
3. **XLSX + PDF output:** `emitXlsx(payload)` and `emitPdf(payload)` return non-empty buffers of expected magic bytes.
4. **Backward compat:** Any existing test that hard-mocked legacy tables for `build()` must be retargeted — canonical mocks first, legacy as fallback proof.

**Full suite invariant:** Post-refactor `npx vitest run` reports exactly one more test per emitter (fallback-path test) beyond baseline. No regressions in other suites.

**Baseline:** 2767/0 (post-#212 baseline confirmed on Monday).

### Phase 5 — Verification gates

Run in order. If any fails, STOP and report:

```powershell
npx tsc --noEmit
npx vitest run lib/audit-ready/tie-out/emitters
npx vitest run lib/audit-ready/kickouts
npx vitest run
# Expect ~2770/0 (2767 baseline + 3 new fallback-path tests)
git diff --name-only origin/main | Where-Object { $_ -match "\.ts$" } | ForEach-Object { npx eslint $_ }
```

Smokes (only if pilot engagement accessible from local `.env`):

```powershell
tsx scripts/smoke/bs-account-emitter-canonical-smoke.ts
tsx scripts/smoke/fa-rollforward-emitter-canonical-smoke.ts
tsx scripts/smoke/bs-summary-emitter-canonical-smoke.ts
```

If `.env` doesn't point at Preview/prod, skip smokes with reason logged.

### Phase 6 — Push + convert to ready-for-review

1. Push final commits
2. `gh pr ready` (convert from draft)
3. Post PR comment summarizing emitters / fallbacks / vitest / gates
4. Human review gate before merge:
   - Verify diff touches only the 3 emitters + list-kickouts + reader helpers + tests (+ resolver payload extensions if approved in gap analysis)
   - Verify no legacy table writes were removed
   - Verify no bucket writes were touched
   - Verify Vercel Preview green
5. Then `confirm_action` and squash-merge

## Guardrails / abort conditions

Cursor MUST stop and report — do NOT push — if any of these happen:

- A refactor requires touching a file not in Phase 1 approved inventory (§6 of inventory doc) — except additive resolver payload extensions approved during gap analysis
- A gap in Phase 2 Step C cannot be filled by payload extension (needs schema decision from human)
- Full vitest goes below baseline or unexpectedly adds unrelated tests
- Any legacy table write is removed from a resolver
- Any bucket `.upload()` is touched
- Any change to `WorkpaperEmitter` interface or `EMITTER_REGISTRY`
- Any new emitter is registered (that's 4.1.4)
- A fallback is added without the `// PBC-TIEOUT-4.1.3.b removes` tag
- Any kickout write logic ends up in an emitter
