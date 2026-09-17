# Executable squash candidate (DRAFT / NON-DEPLOYABLE)

**Mutation readiness: NO**  
**Transaction model: OPTION 2 — secure multi-version split**  
**Replay: NOT authorized**  
**Active `supabase/migrations/`: untouched**

## Why Option 2
Former monolithic module 4 had 50 nested BEGIN/COMMIT pairs, extension operations, and ~979KB / ~4500 statements (HIGH timeout/lock risk). A blind single outer transaction was rejected.

## Proposed lineage
| Order | Version | Name | Kind |
|------:|---------|------|------|
| 1 | `20260907010000` | `esc_platform_prerequisites_contract` | baseline |
| 2 | `20260907010010` | `esc_public_users_and_foundations_baseline` | baseline |
| 3 | `20260907010020` | `esc_phase1_subscriptions_rls_atomic` | baseline |
| 4 | `20260907010030` | `esc_application_schema_slice_1_of_5` | baseline |
| 5 | `20260907010031` | `esc_application_schema_slice_2_of_5` | baseline |
| 6 | `20260907010032` | `esc_application_schema_slice_3_of_5` | baseline |
| 7 | `20260907010033` | `esc_application_schema_slice_4_of_5` | baseline |
| 8 | `20260907010034` | `esc_application_schema_slice_5_of_5` | baseline |
| 9 | `20260907010035` | `esc_security_rls_grants_hardening_atomic` | baseline |
| 10 | `20260907010040` | `esc_reference_seed_allowlist_contract` | baseline |
| 11 | `20260907010050` | `esc_guarded_dataless_safe_initialization` | baseline |
| 12 | `20260907010060` | `esc_forward_tail_main_unapplied` | forward-tail |

Each app/security slice: nested source txn markers stripped; exactly one outer BEGIN/COMMIT; RLS closed before COMMIT.

See `MANIFEST.json` and package docs.
