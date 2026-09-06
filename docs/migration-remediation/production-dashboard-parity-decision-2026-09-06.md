# Production dashboard replay-parity decision — 2026-09-06

**Authorization:** review-only design decision (no SQL, no Docker, no branch create, no merge)  
**Bound:** PR #313 `05004e1e8e70da1d74da2c47c75a1448404701c2` · production `main` `bff6b637506d7323cba1035104e491e7ea79333c` · PR #312 **merged** · Option D evidence **PASS_RUNTIME** (151/151 + 13/13)  
**Parity status after this decision:** still **unresolved** (design only)

## Problem (unchanged)

Dashboard/MCP preview branches replay production `supabase_migrations.schema_migrations` rows — especially stored **`statements[]`** — not Option D’s assembled Git draft and not “later” git files alone.

Two structural gaps remain on the **dashboard track**:

1. **Missing foundations** — production history starts at `20260701043602_phase1_*` without a recorded foundations baseline (`firms` / `companies` gap).  
2. **Data-dependent activations** — stored statements such as `d6_2a_test_client_activation` (`20260703182655`) and siblings unconditionally INSERT fixture firm-clients; data-less branches fail mid-chain (active git track still has 4 documented blockers).

`migration repair` alone does **not** populate executable `statements[]` and does **not** prove dashboard replay.

Option D **PASS_RUNTIME** proves isolated clean-replay + PR #312 disposable Postgres. It does **not** prove dashboard/MCP parity.

---

## Options compared

| # | Mechanism | Data-less dashboard branches | Prod history effect | Rollback | Partial-replay RLS risk | Schema compatibility | Provenance/hashes | Duplicate DDL / data mutation | Ops complexity | PR #313 scope |
|---|-----------|------------------------------|---------------------|----------|-------------------------|----------------------|-------------------|-------------------------------|----------------|---------------|
| **1** | Record/replace executable `statements[]` at **same** production versions (G4 / Option A) | **Yes**, if every failing version’s stored body is replaced with guarded/idempotent SQL and foundations gap is closed by a recorded baseline step | **Yes** — history mutation (statement body and/or inserted baseline version) | Restore prior `statements[]` from backup; re-verify version inventory | Medium during any mid-chain fail; mitigated by data-less branch only + stop-on-first-fail | Must be no-op or compatible with live prod schema | Strong if versions retained and replacements hashed/audited | Low if replacements are idempotent no-ops / EXISTS-guarded; **high** if naïve re-CREATE | Medium–high (inventory, backup, per-version auth) | Description must exclude “parity done”; parity is a **later** auth |
| **2** | Official squash / baseline (Option B) | **Yes**, if squash emits a single guarded, data-less-safe baseline + short forward chain | **Yes** — wholesale history rewrite | Backup restore / Supabase support | High during squash window if mishandled | Must equal live schema contract | Weaker unless squash event + baseline hash are meticulously audited | High if squash mis-captures live drift | High (one-shot surgery) | Same — parity later; do not claim in tooling merge |
| **3** | GitHub-integrated preview from committed `supabase/migrations/` (Option C) | **No** for **dashboard/MCP** track (different SQL authority). **Yes** for **git-authoritative** previews only | **None** for preview itself | Delete preview branch | Preview-local only | Preview may diverge from prod history | Git SHAs; prod `statements[]` unchanged | Low on prod; preview can still run destructive git files if promoted carelessly | Low–medium | Can document as complementary CI path; **must not** be labeled “dashboard parity” |
| **4** | Keep Option D as isolated validation tooling only | **N/A** — does not target dashboard track | **None** | Drop disposable DB | Contained to disposable stack | N/A to prod | Manifest/git-blob authority already proven | None on prod | Low (already built) | **Primary merge posture** for #313 now |

### Rejected as the *primary* production-parity mechanism

- **Option 3 alone** — does not change what dashboard/MCP branches execute; claiming parity from GitHub previews would be a category error.  
- **Option 2 as first choice** — unnecessary blast radius while a finite set of known blockers is documented; reserve squash if Option 1 inventory shows unmanageable version sprawl or foundations cannot be recorded safely.  
- **“Repair-only” or “add a later guarded migration”** — already disproven for dashboard step ordering (`clean-replay-architecture.md`).

---

## Recommendation

### Near-term (this PR / next merge auth): **Option 4 — Option D tooling-only**

Land PR #313 (under a **separate** ready/merge authorization) as:

- Isolated Option D harness + evidence  
- Recovered/derived draft provenance under `migrations-draft/`  
- Explicit **`productionDashboardReplayParity: unresolved`**  
- Acknowledgement of any intentional active forward migrations already on the branch (e.g. digest qualify) without claiming production SQL was applied

**Do not** require production dashboard parity before tooling merge.  
**Do not** create paid dashboard branches until Option 1 (or 2) is authorized and proven.

### Eventual production dashboard parity: **Option 1 — targeted `statements[]` recording/replacement**

Prefer surgical G4 over squash:

1. Inventory production versions whose stored statements fail on data-less replay (start with foundations gap + `d6_2a`–`d6_2d` + other documented blockers).  
2. Author **byte-reviewed** guarded replacements (EXISTS / no-op safe on live prod).  
3. Backup `schema_migrations` (and DB) before any mutation.  
4. Record/replace **same version** bodies so dashboard step order is preserved.  
5. Prove on a **new data-less dashboard branch** only after disposable rehearsal.  
6. Keep Option D as the ongoing non-prod regression gate.

Use **Option 2 (squash)** only if Option 1 is blocked (e.g. foundations cannot be inserted into history without breaking version order, or blocker count explodes).

Use **Option 3** as an optional **git-track** CI complement — never as the dashboard-parity proof.

---

## Exact production mutation eventually required (Option 1)

**Not authorized by this document.** When separately approved, expect:

1. **Read-only export** of production `schema_migrations` (`version`, `name`, `statements[]` hashes) — no DDL.  
2. **Backup** of production database + migration table.  
3. For each approved version `V`:  
   - Replace or initially record `statements[]` with guarded SQL that is a **schema-compatible no-op** on current production and **runnable** on empty branches.  
4. Optionally **record** a foundations baseline version **only** if Supabase-supported ordering is confirmed (otherwise escalate to Option 2).  
5. **No** customer DML; **no** capability/kill-switch changes; **no** QBO/OAuth/Memory.

---

## Safety and rollback plan (Option 1)

| Stage | Action | Abort if |
|-------|--------|----------|
| Preflight | Hash inventory + diff vs intended replacements | Any unexpected prod version drift |
| Backup | Snapshot DB + dump `schema_migrations` | Backup incomplete |
| Rehearsal | Apply replacements on disposable clone / local | Replay fail or RLS regression |
| Mutate | Per-version authorized replace | Non-idempotent apply or lock contention |
| Prove | New data-less dashboard branch through full chain | Any FAIL mid-chain |
| Rollback | Restore `statements[]` (and DB if schema touched) from backup | Always available before next version |

Partial-replay RLS: treat any failed branch as **contaminated** — delete branch; never “continue” mid-chain into shared environments.

---

## Staged runbook with approval boundaries

### Stage 0 — Read-only verification (safe now; no mutation)

- Confirm `main` = `bff6b637…` and #313 draft HEAD.  
- Re-read active data-dependent gate (4 blockers).  
- Diff prod migration inventory hashes (read-only) when separately authorized with prod credentials.  
**Boundary:** no SQL writes; no branch create.

### Stage 1 — Local / disposable validation (Option D; already PASS)

- Retain Option D as CI/local gate.  
- Re-run only under explicit replay auth.  
**Boundary:** localhost / empty workdir only; no prod.

### Stage 2 — PR #313 readiness and merge (**tooling-only**)

- Rewrite PR title/body to Option D tooling + unresolved parity (proposed text below).  
- Mark ready / merge under **separate** authorization.  
**Boundary:** git only; **no** prod SQL; **no** dashboard branch.

### Stage 3 — Production migration-history mutation (Option 1)

- Requires **dedicated** G4 authorization listing exact versions and replacement SHAs.  
**Boundary:** prod `statements[]` (and only approved DDL no-ops).

### Stage 4 — New preview-branch creation

- Only after Stage 3 rehearsal PASS.  
- One data-less dashboard branch to prove full replay.  
**Boundary:** paid branch create is its own auth; delete on fail.

---

## Can PR #313 merge as tooling-only before parity?

**Yes.** Recommended. Parity remains an independent program. Merging tooling does not imply dashboard PASS.

---

## Proposed PR #313 scope / title / description

**Title:** `chore: Option D isolated migration replay tooling and evidence (parity unresolved)`

**Scope:**

- Option D assemble/gate/harness, manifests, recovered/derived drafts under `migrations-draft/`  
- Runtime evidence for PASS_RUNTIME (151/151 + 13/13 historical validation)  
- Explicit non-goals: production dashboard/MCP replay parity; production `schema_migrations` mutation; capability changes  

**Description (paste when separately authorizing ready/merge):**

```markdown
## Verdict
**TOOLING / EVIDENCE — merge-ready when authorized.** Production dashboard replay parity remains **unresolved**.

## What this PR is
- Isolated Option D Git-blob replay harness and evidence
- Draft recovered/derived SQL under `supabase/migrations-draft/` (not CLI-active by path)
- Documents why dashboard/MCP branches replay `statements[]`, not this draft alone

## What this PR is not
- Not production migration-history repair (Option A/B)
- Not proof that new dashboard branches replay cleanly
- Not a capability or kill-switch change
- PR #312 already merged on main (`bff6b637…`); Postgres suite was validated via Option D 13/13

## Parity decision (2026-09-06)
See `docs/migration-remediation/production-dashboard-parity-decision-2026-09-06.md`.
Near-term: keep Option D tooling. Eventual dashboard parity: targeted `statements[]` recording (Option A), not GitHub-preview-alone.

## Production impact of merge
Git/docs/tooling only unless a listed active forward migration is already present — **no SQL execution authorized by merge alone**.
```

---

## Exact next bounded authorization (choose one)

1. **Rewrite #313 PR title/body + mark ready / merge as tooling-only** (no SQL, no branch), or  
2. **Read-only production `schema_migrations` inventory export** (hashes only) to size Option 1, or  
3. **Option 1 G4 plan auth** with exact version list + replacement SQL review (still no apply until a further auth), or  
4. **Option 2 squash design auth** if foundations recording is deemed impossible.

**Default recommendation:** (1) then (2), then (3).
