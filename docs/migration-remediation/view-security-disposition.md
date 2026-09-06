# View provenance and security disposition

Evidence for partial branch at **24 migrations recorded** (failed at #25). No production mutation.

## qbo_connections_unified — provenance trace (P2 resolved)

**Prior report was incorrect.** The view is **not** from baseline and **not** migration ~87. It is created at **production migration #18**, before the d6_2a failure.

| Field | Value |
|-------|--------|
| Production version | `20260703002615` |
| Production name | `d1_qbo_write_readiness` |
| Replay order | **#18** (after baseline + phase1 + close checklist chain + d0) |
| Git file | `supabase/migrations/20260708_01_d1_qbo_write_readiness.sql` |
| Lines | 31–73 (`DO $$ … EXECUTE 'CREATE OR REPLACE VIEW qbo_connections_unified …'`) |
| Foundations baseline | **Not present** — view is not in `20260701043599_foundations_baseline.sql` |

**Why advisor flagged SECURITY DEFINER on partial branch:** `CREATE OR REPLACE VIEW` without `security_invoker=true` defaults to invoker=false (definer semantics). Migration #18 runs; migration **#78** (`d65_p2_block7a2_prepilot_security`) and **#86** (`q8a_qbo_view_security_invoker`) that set `security_invoker=true` have **not** run yet at 24 recorded migrations.

**Conclusion:** Advisor finding is **expected** on partial branch, not an anomaly.

### Later recreation (resets security_invoker)

| Migration | Effect |
|-----------|--------|
| `20260708_01_d1_qbo_write_readiness.sql` | Creates view (no security_invoker) |
| `20260717130000_tcp1_w3_erp_connections_disconnected_at.sql` | `CREATE OR REPLACE VIEW` — drops reloptions |
| `20260707214500_d65_p2_block7a2_prepilot_security.sql` | Sets `security_invoker=true` (prod ~#78) |
| `20260718180000_q8a_qbo_view_security_invoker.sql` | Re-asserts after tcp1 recreate (prod ~#86) |

---

## company_billing_compat — provenance

| Field | Value |
|-------|--------|
| Production version | `20260701043911` |
| Replay order | **#3** (phase1) |
| Source | Recovered production statement in `supabase/migrations-draft/recovered-production-history/20260701043911_phase1_backward_compat_view.sql` lines 14–43 |
| CREATE | `CREATE OR REPLACE VIEW public.company_billing_compat AS SELECT … FROM companies c` |
| security_invoker at create | **Not set** → definer semantics until later fix |

---

## Security disposition matrix

| View | security_invoker at partial branch (#24) | Grants (typical Supabase) | Data API exposure | Underlying RLS | Production final fix |
|------|------------------------------------------|---------------------------|-------------------|----------------|----------------------|
| `company_billing_compat` | **false** (definer) | View inherits table grants; companies/entitlements have RLS | Readable if granted to anon/authenticated on view | `companies`, `entitlements` RLS applies when invoker=true; **definer bypasses caller RLS** until fix | `d65_p2_block7a2_prepilot_security` L92 |
| `qbo_connections_unified` | **false** (definer) | App uses service_role in code paths | Same | `accounting_connections` RLS | `d65_p2_block7a2` L93 + `q8a` re-assert |

### Remediation proposal (review only — not applied)

1. **Partial-branch advisor ERRORs for these two views are expected** until migration ~78+ in full replay.
2. **Do not weaken Patent #6** — keep `q8a`/`q8b`/`q8c` lockdown migrations in full lineage.
3. **Future CREATE OR REPLACE VIEW** for `qbo_connections_unified` must preserve `(security_invoker = true)` (see q8a comment re tcp1 recreate).
4. **Phase1 recovered evidence** — consider adding `security_invoker=true` only in **promoted git lineage**, not by silently editing recovered production evidence files.
5. **No production mutation** from this review.

---

## accounting_connections underlying table

`qbo_connections_unified` selects from `accounting_connections` where `provider='quickbooks'` and `status='connected'`. RLS on `accounting_connections` is enabled in foundation baseline. Definer view runs as view owner until `security_invoker=true`.
