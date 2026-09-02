# Baseline adversarial replay review (post-ordering fix)

Generated after dependency-manifest reorder. **Does not claim G2 pass** — local simulation only.

## Predicted object-availability trace (first → last failure if order regresses)

| Step | Source file | Critical objects created | Next consumer that would break if reordered earlier |
|------|-------------|--------------------------|---------------------------------------------------|
| 1 | `create_audit_logs` | `audit_logs` | `security_control_hardening` |
| 2 | `create_background_jobs` | `background_jobs` | `security_control_hardening` |
| 3 | `create_client_briefings` | `firms`, `firm_*`, `client_briefing_*` | Firm-dependent policies in later files |
| 4 | **`create_company_accounts`** | **`companies`**, `company_*` | **`add_account_type_onboarding`** ← G2 failure point |
| 5 | `create_accounting_connections` | `accounting_connections` | `create_accounting_syncs`, SI tables |
| 6–10 | PDF, pulse, free_review, memory core | respective tables | alters / RLS / indexes |
| 11 | `add_account_type_onboarding` | `practice_accounts`, alters `companies` | Requires step 4 |
| 12 | `add_industry_intelligence_onboarding` | alters `companies`, `company_settings` | Requires step 4 |
| 13–17 | company-dependent feature tables | healthcare, support, ttfv | Require `companies` |
| 18 | `alter_pdf_*` | columns on `pdf_package_customizations` | Requires PDF create |
| 19 | `security_control_hardening` | cross-table RLS/index pass | Requires 10+ prior creators |
| 20–21 | accounting sync chain | `accounting_syncs` + column std | Requires `accounting_connections` |
| 22 | `create_advisory_intelligence` | advisory_* | Requires `companies`, `company_users` |
| 23–28 | SI creators | si_* tables | SI RLS / immutability |
| 29 | `add_si_snapshot_rls_policies` | policies | Requires all SI tables + `company_users` |
| 30 | `harden_si_snapshot_immutability` | trigger functions + triggers | Requires SI tables; functions before triggers ✓ |
| 31–34 | company memory DDL | constraints, indexes, RLS, immutability | Requires memory core (phase 1 root) |

## Remaining adversarial risks (cannot prove without PostgreSQL replay)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Policy predicates reference columns added in later source sections | Medium | Manual review: `security_control_hardening` runs after all its table creators; company alters run before hardening |
| `create_accounting_connections` legacy DO blocks | Low | Guarded by `to_regclass()`; optional tables listed in manifest |
| Duplicate `CREATE EXTENSION pgcrypto` | Low | Idempotent `IF NOT EXISTS` |
| Company memory FK constraints in DO blocks | Low | DO blocks reference tables created in core migration (same baseline, earlier section) |
| Function bodies reference columns added later | Low | Immutability functions reference columns on tables created before triggers |
| Enum/type casts to absent types | None found | No custom enums in baseline scope |
| Grants to unavailable roles | Low | Uses `authenticated`, `service_role` (Supabase defaults) |

## Next likely failure if remediation regresses

1. **`add_account_type_onboarding` before `create_company_accounts`** — proven G2 (`42P01`)
2. **`alter_pdf` before `create_pdf`** — `42P01` on `pdf_package_customizations`
3. **`add_si_snapshot_rls_policies` before SI creators** — `42P01` on SI tables
4. **`add_company_memory_*` before core tables** — `42P01` on memory tables
5. **`harden_si_snapshot_immutability` triggers before functions** — would be `42883` undefined function (functions created in same file before triggers ✓)

## Simulation result

`validate-baseline-order.js`: **pass** — 0 replay violations on dependency order; lexicographic order correctly **fails**.
