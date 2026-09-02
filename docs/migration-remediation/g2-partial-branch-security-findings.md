# G2 partial-branch security advisor findings (review only)

Observed on disposable branch `oczqpxtehgkulqxujfhx` after baseline + 25 migrations. **Review findings — not auto-fixed.**

## Reported items

| Object | Finding | Review classification |
|--------|---------|----------------------|
| `company_billing_compat` | SECURITY DEFINER view | Expected from recovered phase1 migration #3 (`phase1_backward_compat_view`); compare prod contract |
| `qbo_connections_unified` | SECURITY DEFINER view | From later QBO migration track (`q8a_qbo_view_security_invoker` attempts lockdown); **not created** at migration 25 — likely prod baseline or advisor cache |
| Several functions | mutable `search_path` | Known class; production has `q8b_function_search_path_lockdown` later in lineage |

## Comparison notes

### company_billing_compat

- Created in phase1 recovered migration `20260701043911_phase1_backward_compat_view.sql`
- Production schema contract includes 1 view in scoped 47-table export
- **Not introduced by new foundations baseline ordering fix**
- Remediation: document as intentional compat view; verify `security_invoker` policy at promotion if Supabase advisor requires

### qbo_connections_unified

- Not in foundation/phase1 contract scope
- Created in `20260718000000_q8a_qbo_view_security_invoker.sql` (migration ~87+ in production lineage)
- **Should not exist** on partial branch at migration 25 unless advisor scanned stale metadata or platform default
- Treat as **comparison anomaly** until third G2 replay confirms object presence at each checkpoint

### mutable search_path functions

- Partial branch at migration 25 includes functions from `d0_identity`, `d6_0`, platform foundation migrations
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
