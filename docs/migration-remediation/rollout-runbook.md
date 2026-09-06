# Fail-closed rollout plan (DRAFT — do not execute)

## Approval gates (sequential, independent sign-off each)

| Gate | Scope | Blocker until |
|------|-------|---------------|
| **G1** Baseline + phase1 schema sign-off | Hardened baseline draft + recovered phase1 evidence vs production schema contract | Schema-definition PASS; **dependency order invalidated by first G2, remediated locally** |
| **G2** Local clean replay | Docker `supabase start` + apply baseline + phase1 + lineage | **First disposable branch failed (42P01); deleted. Second attempt blocked pending review.** |
| **G3** New data-less preview branch | Dashboard or GitHub-integrated replay on empty DB | G1 + G2 |
| **G4** Production migration recording | Execute/assert baseline on prod OR squash workflow | G3 pass |
| **G5** Production post-checks | Advisors, spot schema diff, no drift | G4 complete |
| **G6** Rollback/recovery verified | Documented revert path tested | Before G4 |

**Never copy production data to preview branches.**

---

## Proven branch-replay facts (from recovered evidence)

1. `schema_migrations` has columns: `version`, `name`, **`statements text[]`**
2. Each recovered phase1 migration = **exactly 1 stored SQL statement**
3. Dashboard branches replay **stored statements** from production history
4. `migration repair --status applied` = **tracking only**, no SQL execution
5. Repair-only baseline **cannot** supply runnable SQL for dashboard replay

---

## Rollout options (choose at G4 — not now)

| Option | Production SQL executes? | Records `statements[]`? | Risk |
|--------|-------------------------|------------------------|------|
| **A.** Idempotent baseline apply on prod | Yes (must be true no-op) | Yes | Medium — needs diff proof |
| **B.** Official squash/baseline | Yes (squash) | Yes | High — history surgery |
| **C.** GitHub-integrated previews only | No (previews use git) | N/A for previews | Low for previews; prod separate |
| **D.** Supabase Support history repair | Unknown | Must verify | Escalation path |

Mark A/B as **destructive/high-risk** requiring DBA + on-call approval.

---

## Phase 1 — Evidence (COMPLETE for phase1 SQL)

- [x] Recovered 4 phase1 bodies with MD5 verification
- [ ] Isolated `migration fetch` full chain (185 rows)
- [x] Read-only production schema diff (G1 — contract manifest + minimized diff committed)

## Phase 2 — Promote to `supabase/migrations/` (after G1)

1. Hardened `20260701043599_foundations_baseline.sql`
2. Recovered phase1 files (exact production text)
3. Timestamp reconciliation for remaining 106 drift pairs (separate effort)

## Phase 3 — Production (G4 only)

> **WARNING:** Do not run `migration repair` alone for baseline.

## Phase 4 — Preview verification (G3)

1. Create new data-less branch (`with_data=false`)
2. Confirm full replay through JE stack
3. RLS enabled on all public subscription tables
4. PR #312 Postgres gate (separate PR)

## Rollback

| Action | When |
|--------|------|
| Revert remediation PR merge | Before G4 |
| `migration repair --status reverted` | Only with schema proof |
| Delete failed preview branch | Any time |

---

## Current blockers

- [x] G1: Production schema diff (read-only contract manifest; **schema-definition** verdict PASS)
- [x] G1 ordering: **Invalidated by first G2** — dependency manifest remediated at `61642106`
- [x] G2 second attempt: baseline ordering **PASS**; stopped at `d6_2a_test_client_activation` (fixture FK)
- [ ] G2 third attempt: blocked until data-dependent migration remediation reviewed + branch authorization
- [ ] G3: Cannot create preview branch until G2 clean replay passes
