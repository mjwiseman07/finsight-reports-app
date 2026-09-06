# Option D runtime evidence - 2026-09-04b

Date: 2026-09-04
Commit: e39d24c7c497a74eb1b11df33197a0a1c8db5cb7
Manifest SHA-256: 5a66815352f4879b68a49d2cef3182d9637a20eb2a3a7617ed0bb979406dba0c (115488 bytes)
Supabase CLI: 2.116.0 (OPTION_D_SUPABASE_CLI_VERSION set)
Target: platform-only disposable local (127.0.0.1:54322 / postgres)

## Prechecks

All passed: HEAD pin, binary-safe manifest hash, platform workdir with 0 migration SQL files, TCP 54322 open, CLI 2.116.0, DB URL file present.

## Harness result

- overall: BLOCKED
- reason: security_immutability_checks_failed
- scopes:
  - candidateReplay: PASS
  - securityImmutabilityChecks: FAIL
  - pr312RpcValidation: BLOCKED
  - productionDashboardReplayParity: unresolved
- applyResult: applied=true, migrationsApplied=150, sqlApplicationAttempts=150
- first failure: si_memory_immutability / not_intended_immutability_rejection / memory_immutable_field_update_rejected — classifyReason=message_mismatch; detail=company_memory_records.payload is immutable for memory_type=probe

Harness stdout/stderr: .tmp-option-d-harness-e39d24c7.out.txt (mirrors status JSON).

## SQL verifies (counts only; post-apply)

Written to .tmp-option-d-users-verify-e39d24c7.json:

- public.users count: 0
- auth.users count: 0
- FK public.users -> auth.users count: 1
- RLS enabled on public.users: true
- RLS policy count on public.users: 2

## Cleanup (this run only)

- supabase stop --workdir C:\Users\mattj\tmp-option-d-platform-only-e39d24c7 --no-backup — success
- workdir removed
- .tmp-option-d-dburl-e39d24c7.txt removed
- .tmp-pr312-suite-materialized.test.js removed if present
- TCP 127.0.0.1:54322 confirmed closed
- cleanup record: docs/migration-remediation/option-d-runtime-cleanup-2026-09-04b.json

No production touch. No code remediation performed.
