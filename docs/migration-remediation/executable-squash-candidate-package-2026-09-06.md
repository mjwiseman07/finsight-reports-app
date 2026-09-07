# Executable squash/baseline candidate package — 2026-09-06

**Authorization:** authoring + static validation only.  
**PR #314:** draft. **Production mutation:** NO. **Docker/branch replay:** NO.

## Bound pins
- Start HEAD: `157c561b85793248cce0d8256f16cb43c298c1b6`
- main: `9d8a01d37422179ddd68bbd181a8815d8a893577`
- Option D: blob `0d2a39a3…` · SHA-256 `9dc080cf…` · PASS 151/151
- CLI: 2.116.0
- Package seal (concat entry sha256s): `ae85b00270d3b89f6e8f57cb6851dec19aba2b860dd0de89126bc93643555d28`
- Total UTF-8 LF bytes: **1132090**

## Proposed versions / module order

| Order | Version | Name | Kind | Bytes | SHA-256 |
|------:|---------|------|------|------:|---------|
| 1 | `20260907010000` | `esc_platform_prerequisites_contract` | baseline | 1074 | `4b71d1a5…` |
| 2 | `20260907010010` | `esc_public_users_and_foundations_baseline` | baseline | 108827 | `5f622b6a…` |
| 3 | `20260907010020` | `esc_phase1_subscriptions_rls_atomic` | baseline | 19918 | `10a46c63…` |
| 4 | `20260907010030` | `esc_application_schema_lineage_body` | baseline | 906182 | `0914af79…` |
| 5 | `20260907010040` | `esc_security_rls_grants_hardening` | baseline | 74387 | `cfbb6962…` |
| 6 | `20260907010050` | `esc_reference_seed_allowlist_contract` | baseline | 1021 | `a47d687c…` |
| 7 | `20260907010060` | `esc_guarded_dataless_safe_initialization` | baseline | 15876 | `affe5b9b…` |
| 8 | `20260907010070` | `esc_forward_tail_main_unapplied` | forward-tail | 4805 | `e738091a…` |

Exact git-blob IDs and full hashes: `supabase/migrations-draft/executable-squash-candidate/MANIFEST.json`.

## Package files
Under `supabase/migrations-draft/executable-squash-candidate/modules/` (8 SQL modules) + `MANIFEST.json` + `README.md`.

## DML
See `docs/migration-remediation/evidence/executable-squash-candidate-dml-allowlist.json`.

## tcp1 / grant / d6
- d6: **ALLOW guarded**
- tcp1: **OMIT seed, keep schema**
- grant: **schema index only**

## Comparison
See `docs/migration-remediation/evidence/executable-squash-candidate-comparison.json`.

**Ready for independent source review:** YES  
**Ready for local replay:** NO (needs separate auth)  
**Ready for production mutation:** NO

## Next authorization
Independent source review of this sealed package (hashes/modules/DML/security). Only after that: disposable local rehearsal auth — still no production history mutation.
