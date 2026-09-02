# G2 second replay — data-dependent blocker

## Verdict

**G2 clean replay: CHANGES REQUIRED**

Baseline ordering remediation **PASS**. New independent blocker at migration **#25**.

## What passed

| Check | Result |
|-------|--------|
| Dependency-ordered foundations baseline | Applied successfully |
| Foundation objects | `firms`, `companies`, `firm_memberships`, `company_users`, `companies.practice_id` present |
| Phase1 migrations #2–#4 | Replayed successfully |
| Phase1 RLS on subscription tables | Enabled on all five |
| Production touched | **No** |
| PR #312 / PR #313 code | **Unchanged during replay** |

## Failure

| Field | Value |
|-------|-------|
| Migrations recorded | **25** |
| Failing production version | `20260703182655` |
| Failing name | `d6_2a_test_client_activation` |
| Local git file | `20260703_2000_d6_2a_test_client_activation.sql` |
| Mechanism | `INSERT INTO client_active_rules` for `firm_client_id` `71111111-1111-4111-8111-111111111111` |
| Data-less branch | Zero matching `firm_clients` rows → FK failure |
| JE stack reached | **No** — `journal_entry_executions`, `persist_journal_entry_execution_reservation` not created |

## Branch disposal

| Field | Value |
|-------|-------|
| Branch ID | `c5982210-4114-432e-9339-4cff1decf538` |
| Child ref | `oczqpxtehgkulqxujfhx` |
| Status | **Deleted and confirmed absent** |

## Related migrations (same class)

- `d6_2b_mfg_activation`
- `d6_2c_retail_activation`
- `d6_2d_ps_activation`

All use the same fixture `firm_client_id` pattern.

## Next gate

**Do not create another Supabase branch** until:

1. This classification + guarded-draft remediation is reviewed
2. Explicit paid-branch authorization
3. Guarded migration proposals promoted (separate step)

See `clean-replay-remediation-design.md`.
