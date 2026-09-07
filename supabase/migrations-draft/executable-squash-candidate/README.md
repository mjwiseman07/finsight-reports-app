# Executable squash candidate (DRAFT / NON-DEPLOYABLE)

**Mutation readiness: NO**  
**Replay: NOT authorized**  
**Active `supabase/migrations/`: untouched**  
**Prior source review: CHANGES REQUIRED (remediated candidate; needs new independent review)**

## Target model
- **Baseline (modules 1–6):** Option D production-schema baseline + ESC overlays; digest qualify **excluded**
- **Forward-tail (module 7):** sole home of `publish_ledger_event` extensions.digest qualify
- **Module 4:** atomic application schema + security (closes former 4→5 RLS window)

## Proposed lineage

| Order | Version | Name | Kind |
|------:|---------|------|------|
| 1 | `20260907010000` | `esc_platform_prerequisites_contract` | baseline |
| 2 | `20260907010010` | `esc_public_users_and_foundations_baseline` | baseline |
| 3 | `20260907010020` | `esc_phase1_subscriptions_rls_atomic` | baseline |
| 4 | `20260907010030` | `esc_application_schema_and_security_atomic` | baseline |
| 5 | `20260907010040` | `esc_reference_seed_allowlist_contract` | baseline |
| 6 | `20260907010050` | `esc_guarded_dataless_safe_initialization` | baseline |
| 7 | `20260907010060` | `esc_forward_tail_main_unapplied` | forward-tail |

## Dispositions
- **d6_2a–d**: guarded Option D substitutions
- **tcp1**: schema/RLS/functions; complimentary seed **omitted**
- **grant**: unique index only; no LOCK/RAISE/UPDATE
- **gap2_purge_table_registry / engagement_posting_policy**: ENABLE RLS + service_role-only policy
- **publish_ledger_event / increment_share_token_access**: PUBLIC/anon/authenticated EXECUTE **revoked**

## Authority
Built from Option D manifest SHA-256 `9dc080cf…` / 151 assembled files + substitutions, with ESC overlays.

See `MANIFEST.json` and `docs/migration-remediation/executable-squash-candidate-package-2026-09-06.md`.
