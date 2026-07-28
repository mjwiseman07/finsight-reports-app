# PBC-TIEOUT-4.1.3 Family 2 Inventory

**Authored:** 2026-07-27  
**Base main tip:** `34bcaf4a` (post-PR #210 merge)  
**Reference doc:** `docs/audit-ready/block-f-retirement-plan.md`  
**Status:** Locked scope. Phase 2 works only from this list.

**Path note:** `list-kickouts.ts` lives at `lib/audit-ready/kickouts/list-kickouts.ts` (not under `tie-out/`). `bs-recon-artifacts.ts` is at `lib/audit-ready/tie-out/bs-recon-artifacts.ts`.

## Definitions

**Family 1 (already canonical):** Emitters that build from `audit_ready_tie_out_runs` + `audit_ready_tie_out_variances` + `ctx.rawQboPayload`, using shared helpers from `lib/audit-ready/tie-out/emitters/_shared/load-run.ts`.

**Family 2 (this phase's scope):** Emitters that still read from legacy `audit_ready_*_artifacts` + `_lines` + `_transactions` tables inside `build(runId)`, despite their resolvers already writing structured data (payload + variances) to the canonical run.

## 1. Legacy artifact table writers

Real writers (all resolvers — retained as dual-write until 4.1.3.b):

| File | Legacy tables written |
|---|---|
| `lib/audit-ready/tie-out/bs-account-resolver.ts` | `audit_ready_bs_recon_artifacts`, `audit_ready_bs_recon_transactions` |
| `lib/audit-ready/tie-out/fa-rollforward-resolver.ts` | `audit_ready_fa_rollforward_artifacts`, `audit_ready_fa_rollforward_lines` |
| `lib/audit-ready/tie-out/bs-summary-resolver.ts` | `audit_ready_bs_recon_summary_artifacts`, `audit_ready_bs_recon_summary_lines` |

Canonical writer (untouched):

| File | Canonical table |
|---|---|
| `lib/audit-ready/tie-out/upload-artifact.ts` | `audit_ready_run_artifacts` |

Fictional table names checked and absent from tree: `audit_ready_artifact`, `pbc_artifact`, `artifact_storage`, `reconciliation_artifact`, `workpaper_legacy`.

## 2. Direct `.upload()` call sites

**RESOLVER** (bucket `audit-ready-recons` — DO NOT TOUCH IN 4.1.3, that's Block F Part 2):

- `bs-account-resolver.ts` — path `{engagementId}/{accountId}/{endDate}/xlsx/{sha}.xlsx`
- `fa-rollforward-resolver.ts` — path under engagement/account/period (PDF)
- `bs-summary-resolver.ts` — path under engagement/period (PDF)

**CANONICAL** (bucket `audit-ready-workpapers` — keep):

- `upload-artifact.ts` — path `{engagementId}/{runId}/{kind}-{hash8}.{ext}`

**OTHER** (out of scope, different product):

- `lib/je-evidence/packet-generator.tsx`
- `app/api/reviewer/review/[id]/packet/route.ts`

## 3. Emitters vs WorkpaperEmitter contract

All 7 shipped emitters implement `WorkpaperEmitter` correctly (`kind` + `build(runId)` + `emitXlsx` + `emitPdf`). Zero interface non-conformers.

**Non-conforming to canonical source pattern** (still read legacy tables in `build()` — this is the 4.1.3 target list):

| File | Emitter | Legacy read |
|---|---|---|
| `lib/audit-ready/tie-out/emitters/bs-account-emitter.ts` | `bsAccountEmitter` | `audit_ready_bs_recon_artifacts` + `_transactions` |
| `lib/audit-ready/tie-out/emitters/fa-rollforward-emitter.ts` | `faRollforwardEmitter` | `audit_ready_fa_rollforward_artifacts` + `_lines` |
| `lib/audit-ready/tie-out/emitters/bs-summary-emitter.ts` | `bsSummaryEmitter` | summary artifacts + lines (+ BS txns) |

**Already canonical** (reference implementations to clone):

| File | Kind | Source |
|---|---|---|
| `lib/audit-ready/tie-out/emitters/ap-emitter.ts` | `ap_aging` | `loadRunContext` + `loadVariances` + `ctx.rawQboPayload` |
| `lib/audit-ready/tie-out/emitters/ar-emitter.ts` | `ar_aging` | same |
| `lib/audit-ready/tie-out/emitters/inventory-emitter.ts` | `inventory` | same |
| `lib/audit-ready/tie-out/emitters/grni-emitter.ts` | `grni` | same + `loadEvidence` |

False positives from `emit*` grep (helpers, not Family 2 emitters):

- `emitWorkpaperXlsx`
- `emitWorkpaperPdf`
- `emitMemoryEvent`

## 4. Unregistered TIE_OUT_KINDS

Registered in `EMITTER_REGISTRY` (`lib/audit-ready/tie-out/emitters/registry.ts`) — 7:

`ar_aging`, `ap_aging`, `inventory`, `grni`, `fixed_asset_rollforward`, `bs_account_recon`, `bs_recon_summary`

Unregistered — 7 (all out of 4.1.3 scope):

- `bank_recon`, `cash_recon` — 4.1.4a Wave 1
- `debt_schedule`, `equity_rollforward` — 4.1.4b Wave 2
- `revenue_cutoff`, `expense_cutoff` — 4.1.4c Wave 3
- `unclassified` — intentional never-ships

Registry test expects exactly 7 unshipped (6 new + unclassified).

## 5. Direct kickout inserts

No hits for `.from('audit_ready_kickout_investigations').insert` anywhere in `lib/` or `app/`.

Actual kickout architecture:

- Kickout evidence written by resolvers into `audit_ready_tie_out_variances` (+ related)
- `audit_ready_kickout_investigations` is read-only from application code
- `lib/audit-ready/kickouts/list-kickouts.ts` reads structured variances + investigations for the Kickout Inbox
- Emitters do not touch kickouts at all

Kickouts are NOT an emitter concern. Any 4.1.3 code path that adds kickout logic to emitters is wrong-layer and should be rejected.

## 6. Recommended Family 2 refactor list — LOCKED SCOPE

Scope = decouple the 3 Family 2 emitters from legacy artifact tables. Match AP/AR/inventory/GRNI's canonical source pattern.

### 6a. `emitters/bs-account-emitter.ts` — `bsAccountEmitter`

**Today:** `build(runId)` reads `audit_ready_bs_recon_artifacts` (face payload) + `audit_ready_bs_recon_transactions` (backup).

**Target:** Clone `ap-emitter.ts` shape:

- `loadRunContext(runId)` → run + engagement name + `ctx.rawQboPayload`
- `loadVariances(runId)` → structured variance rows
- Assemble face from run totals (`subledger_total_cents`, `gl_total_cents`, `totals_variance_cents`, `totals_status`, `period_end`, etc.)
- Assemble backup from `ctx.rawQboPayload` (BS resolver already writes GL detail with activity into `raw_qbo_payload_jsonb` before invoking emitter)
- Use `sourceDataFromPayload(raw)` for `sourceData`

Legacy fallback (during observation window, tagged for 4.1.3.b removal):

```typescript
// PBC-TIEOUT-4.1.3.b removes this fallback
if (!face || !backup) {
  return readLegacyBsReconArtifact(runId);
}
```

**Estimated LOC delta:** 150–250 rewritten (mostly `build()` body).

**Deps:** `bs-account-resolver.ts` payload already contains `gl_detail` with activity — verify shape covers all fields emitter needs. If a gap, extend payload additively (do not add new tables).

### 6b. `emitters/fa-rollforward-emitter.ts` — `faRollforwardEmitter`

**Today:** `build(runId)` reads `audit_ready_fa_rollforward_artifacts` + `audit_ready_fa_rollforward_lines`.

**Target:** Same AP-shape pattern.

- Face: run totals + FA-specific fields on run
- Backup: `ctx.rawQboPayload` FA activity + `loadVariances` for structured line data
- Fallback: legacy artifact + lines, tagged

**Estimated LOC delta:** 150–250.

**Deps:** `fa-rollforward-resolver.ts` payload — verify FA line detail is captured. If not, additive payload extension.

### 6c. `emitters/bs-summary-emitter.ts` — `bsSummaryEmitter`

**Today:** `build(runId)` reads summary artifacts + summary lines (+ BS transactions cross-lookup).

**Target:** Same AP-shape pattern.

- Face: run totals + summary rollup on run
- Backup: `ctx.rawQboPayload` + variances aggregated by account/section
- Additional: `list-kickouts.ts` join fix — currently joins summary artifact ID → run ID via legacy table; needs canonical linkage (run ID direct)
- Fallback: legacy artifact + lines, tagged

**Estimated LOC delta:** 200–300 (largest of the three because of `list-kickouts.ts` join fix).

**Deps:** `bs-summary-resolver.ts` payload + `lib/audit-ready/kickouts/list-kickouts.ts` reader path.

### 6d. Reader fallbacks (Phase 4 of build spec)

**File:** `lib/audit-ready/kickouts/list-kickouts.ts`

- Currently joins `artifact_id` → `run_id` via legacy tables
- Add canonical direct-run-ID linkage; fall back to legacy lookup only if canonical returns null
- Tag: `// PBC-TIEOUT-4.1.3.b removes this fallback`

**File:** `lib/audit-ready/tie-out/bs-recon-artifacts.ts`

- Any select hitting `audit_ready_bs_recon_artifacts` → add canonical-first fallback
- Same tag

**Regenerate / download routes:** Check `lib/audit-ready/tie-out/regenerate-run.ts` and `app/api/audit-ready/**` for legacy reads. If any, apply same fallback pattern.

### 6e. Tests

Add or update per-emitter tests:

- `emitters/__tests__/bs-account-emitter.test.ts`
- `emitters/__tests__/fa-rollforward-emitter.test.ts`
- `emitters/__tests__/bs-summary-emitter.test.ts`

Test invariants:

- Given a run row + variances + `rawQboPayload`, `build()` returns valid `WorkpaperPayload` without touching legacy tables (mock supabase, assert `.from('audit_ready_bs_recon_artifacts')` etc. is NOT called on the canonical path)
- With canonical data absent, fallback path fires and reads legacy tables
- `emitXlsx` / `emitPdf` output matches golden fixture

Update integration tests that currently assume emitter reads legacy — retarget to canonical-first behavior.

## 7. Files explicitly NOT in this PR

| File / area | Reason for exclusion |
|---|---|
| `ap-emitter.ts`, `ar-emitter.ts`, `inventory-emitter.ts`, `grni-emitter.ts` | Already canonical |
| `emit-common.ts`, `upload-artifact.ts` | Canonical helper stack — no changes |
| `bs-recon-notify.ts` | Block F Part 1 notify layer; Part 2 retires legacy sign key |
| `app/.../recons/[artifactId]/route.ts` | Block F Part 2 (308 redirect target) |
| `lib/je-evidence/packet-generator.tsx`, JE packet routes | Different product (Pulse JE) |
| Smoke scripts reading `audit_ready_run_artifacts` | Canonical consumers |
| Bank recon, cash recon, debt schedule, equity rollforward, revenue cutoff, expense cutoff | 4.1.4a/b/c greenfield |
| `WorkpaperEmitter` interface | No change |
| `EMITTER_REGISTRY` | 7 shipped kinds already registered |
| `.upload("audit-ready-recons")` bucket writes in resolvers | Block F Part 2 |
| Legacy resolver writes to `audit_ready_*_artifacts` | 4.1.3.b |
| Legacy tables themselves (drops/alters) | 4.1.3.b |

## Follow-ups after 4.1.3 merges

**4.1.3.b** — 8-day observation window from 4.1.3 merge SHA. Then: drop legacy resolver writes + reader fallbacks + legacy tables.

Landing window likely overlaps Block F Part 2. Sequence retirement PRs together per Block F retirement plan.
