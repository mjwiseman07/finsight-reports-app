# G2 partial-branch security advisor findings (review only)

Observed on disposable branch `oczqpxtehgkulqxujfhx` after baseline + **24 migrations recorded** (failed applying #25). **Review findings — not auto-fixed.**

## Reported items

| Object | Finding | Review classification |
|--------|---------|----------------------|
| `company_billing_compat` | SECURITY DEFINER view | **Expected** — created at production migration #3 (`phase1_backward_compat_view`); `security_invoker` fix at ~#78 |
| `qbo_connections_unified` | SECURITY DEFINER view | **Expected** — created at production migration **#18** (`d1_qbo_write_readiness`); `security_invoker` fix at ~#78 and ~#86 |
| Several functions | mutable `search_path` | Known class; production has `q8b_function_search_path_lockdown` later in lineage |

## Comparison notes (corrected)

### company_billing_compat

- Created in phase1 recovered migration `20260701043911_phase1_backward_compat_view.sql` (replay order **#3**)
- Production schema contract includes 1 view in scoped 47-table export
- **Not introduced by foundations baseline ordering fix**
- At 24 recorded migrations: `security_invoker` not yet set → advisor ERROR is expected
- Remediation: `d65_p2_block7a2_prepilot_security` sets `security_invoker=true` at prod ~#78

### qbo_connections_unified (P2 correction)

**Prior report was wrong.** This view is **not** from migration ~87 and is **not** a comparison anomaly.

| Field | Value |
|-------|--------|
| Production version | `20260703002615` |
| Production name | `d1_qbo_write_readiness` |
| Replay order | **#18** |
| Git file | `supabase/migrations/20260708_01_d1_qbo_write_readiness.sql` lines 31–73 |
| In foundations baseline | **No** |

At 24 recorded migrations the view **exists** and lacks `security_invoker=true` because migrations ~78 (`d65_p2_block7a2_prepilot_security`) and ~86 (`q8a_qbo_view_security_invoker`) have not run.

See **`view-security-disposition.md`** for full provenance and disposition matrix.

### mutable search_path functions

- Partial branch at migration 24 includes functions from `d0_identity`, `d6_0`, platform foundation migrations
- Production remediation track includes `q8b_function_search_path_lockdown` (migration ~90+)
- **Expected delta** between partial replay and production final state
- Do not weaken Patent #6 RPC lockdown migrations to silence advisor on partial branch

## Patent #6 posture (unchanged)

- Memory is never provider-success authority
- PREPARE/CREATE/VERIFY/Memory/worker/GOVERNED_AUTO remain **OFF**
- Kill switches remain **ON**
- No production credentials or data accessed

## Action

Log findings in PR #313 review package. Full advisor sign-off deferred until clean replay reaches JE stack or production post-checks (G5).
