# Executable squash candidate (DRAFT / NON-DEPLOYABLE)

**Mutation readiness: NO**  
**Replay: NOT authorized by package authoring**  
**Active `supabase/migrations/`: untouched**

## Proposed lineage (dashboard = GitHub same files/order)

| Order | Version | Name | Kind |
|------:|---------|------|------|
| 1 | `20260907010000` | `esc_platform_prerequisites_contract` | baseline |
| 2 | `20260907010010` | `esc_public_users_and_foundations_baseline` | baseline |
| 3 | `20260907010020` | `esc_phase1_subscriptions_rls_atomic` | baseline |
| 4 | `20260907010030` | `esc_application_schema_lineage_body` | baseline |
| 5 | `20260907010040` | `esc_security_rls_grants_hardening` | baseline |
| 6 | `20260907010050` | `esc_reference_seed_allowlist_contract` | baseline |
| 7 | `20260907010060` | `esc_guarded_dataless_safe_initialization` | baseline |
| 8 | `20260907010070` | `esc_forward_tail_main_unapplied` | forward-tail |

## Dispositions
- **d6_2a–d**: guarded Option D substitutions
- **tcp1**: schema/RLS/functions; complimentary seed **omitted**
- **grant**: unique index only; no LOCK/RAISE/UPDATE

## Authority
Built from Option D manifest SHA-256 `9dc080cf…` / 151 assembled files + substitutions, with ESC overlays.

See `MANIFEST.json` and `docs/migration-remediation/executable-squash-candidate-package-2026-09-06.md`.
