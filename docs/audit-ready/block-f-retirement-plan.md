# Block F — Legacy audit-ready-recons retirement plan

## Sequencing

Two PRs to preserve 7-day signed-URL TTL on already-sent emails:

- **Part 1 (PR #210, this PR):** Dual-bucket notify. New bucket preferred, legacy fallback. Zero risk to in-flight signed URLs.
- **Part 2 (PR #211):** Retire legacy bucket + .upload() paths. Merge date ≥ Part 1 merge date + 8 days.

## Timing gate

Part 2 cannot merge until 8+ days after Part 1 merges. The 7-day TTL of the last legacy-bucket-signed email (worst case: sent just before Part 1 merged) must expire before Part 2 drops the bucket.

## Part 1 changes (this PR)

1. `bs-recon-notify.ts`: adds `newPdfObjectKey` optional param, signs against `audit-ready-workpapers` when provided
2. Cron (`bs-recon-monthly`): pass `newPdfObjectKey` from `audit_ready_run_artifacts.storage_path`
   - Resolvers do **not** call notify helpers directly — skipped in Part 1
3. Tests + smoke coverage

## Part 2 changes (PR #211, later)

1. Delete resolvers' `.upload("audit-ready-recons")` blocks (3 files)
2. Delete legacy `pdfObjectKey` optional-param support in `bs-recon-notify.ts`
3. Rewrite `app/api/audit-ready/[engagementId]/recons/[artifactId]/route.ts` as 308 permanent redirect to `/api/audit-ready/runs/[runId]/workpaper`
4. Migration: drop `audit-ready-recons` bucket + 3 storage RLS policies
5. Update tests to single-bucket world

## Family 2 — separate phase

Retirement of legacy artifact + line tables (`audit_ready_bs_recon_artifacts`, `audit_ready_fa_rollforward_artifacts`, `audit_ready_bs_recon_summary_artifacts` + `_transactions` / `_lines`) is tracked as PBC-TIEOUT-4.1.3. Requires emitter interface refactor to source structured payload directly from resolvers or from `audit_ready_run_artifacts` metadata.

## Rollback

- Part 1: revert commit; feature is additive, no data migration to undo
- Part 2: bucket drop is destructive — see Part 2 spec for pre-migration backup procedure
