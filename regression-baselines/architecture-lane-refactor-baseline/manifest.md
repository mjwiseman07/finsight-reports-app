# Architecture Lane Refactor Regression Baseline

## Branch
- `architecture-lane-refactor-baseline`

## Timestamp
- `2026-06-03T17:16:23.0216565-04:00`

## Current Git Commit Before Baseline Commit
- `f9bd64a77bfc4ecbd27b4134e7e3814144b7aaaa`

## Baseline Files Captured
- `regression-baselines/architecture-lane-refactor-baseline/kpi-outputs/quickbooks.txt`
- `regression-baselines/architecture-lane-refactor-baseline/kpi-outputs/quickbooks-package-context.txt`
- `regression-baselines/architecture-lane-refactor-baseline/pdf-samples/xero-balance-sheet-verification.txt`
- `regression-baselines/architecture-lane-refactor-baseline/validation-outputs/report-preflight.txt`
- `regression-baselines/architecture-lane-refactor-baseline/validation-outputs/typecheck.txt`
- `regression-baselines/architecture-lane-refactor-baseline/manifest.md`

## Commands Run
- `git status --short`
- `git switch -c architecture-lane-refactor-baseline`
- `mkdir regression-baselines\architecture-lane-refactor-baseline regression-baselines\architecture-lane-refactor-baseline\screenshots regression-baselines\architecture-lane-refactor-baseline\pdf-samples regression-baselines\architecture-lane-refactor-baseline\powerpoint-samples regression-baselines\architecture-lane-refactor-baseline\kpi-outputs regression-baselines\architecture-lane-refactor-baseline\validation-outputs`
- `npm run verify:quickbooks > regression-baselines\architecture-lane-refactor-baseline\kpi-outputs\quickbooks.txt 2>&1`
- `npm run verify:xero-balance-sheet-pdf > regression-baselines\architecture-lane-refactor-baseline\pdf-samples\xero-balance-sheet-verification.txt 2>&1`
- `npm run verify:quickbooks-package-context > regression-baselines\architecture-lane-refactor-baseline\kpi-outputs\quickbooks-package-context.txt 2>&1`
- `npm run verify:report-preflight > regression-baselines\architecture-lane-refactor-baseline\validation-outputs\report-preflight.txt 2>&1`
- `npx tsc --noEmit --pretty false > regression-baselines\architecture-lane-refactor-baseline\validation-outputs\typecheck.txt 2>&1`

## Command Status
- `git status --short`: PASS; working tree was clean before branch creation.
- `git switch -c architecture-lane-refactor-baseline`: PASS.
- Baseline folder creation: PASS.
- `npm run verify:quickbooks`: PASS.
- `npm run verify:xero-balance-sheet-pdf`: PASS.
- `npm run verify:quickbooks-package-context`: PASS.
- `npm run verify:report-preflight`: PASS after verifier fixture correction; output captured in `validation-outputs/report-preflight.txt`.
- `npx tsc --noEmit --pretty false`: PASS.

## Missing Baselines
- Screenshot image files were not captured in Phase 1 because the approved command list did not include browser screenshot capture commands.
- PowerPoint sample files were not captured in Phase 1 because the approved command list did not include PowerPoint generation commands.
- A binary/generated PDF file was not captured in Phase 1; the approved PDF baseline artifact is the Xero Balance Sheet PDF verification output.

## Protected Asset Confirmation
- No protected asset source files were modified during Phase 1 baseline capture.
- No dashboard layouts were changed.
- No PDF layouts were changed.
- No PowerPoint layouts were changed.
- No public pages were changed.
- No AI wording was changed.
- No integration lane architecture migration or refactor was started.
