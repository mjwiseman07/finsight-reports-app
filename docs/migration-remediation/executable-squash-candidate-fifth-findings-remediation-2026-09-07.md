# ESC fifth-findings remediation — 2026-09-07

**Authorization:** candidate-only privilege remediation on draft PR #314.  
**Does not claim** `PASS_SOURCE_REVIEW`. Ready for **sixth independent source review**.

| Pin | Value |
|-----|-------|
| Pre-remediation PR HEAD | `a12ddc0b6ab9e309392517dbbc540e10bb3f73ba` |
| Reviewed candidate ancestor | `1a4c8182b68a2506f85140970073558fb1b1ebb2` |
| Prior seal | `75b3466195ad01ae336cb1a5f6e89f29232757b2d048dd68ac9ad50bad1d049b` |
| **New seal** | `170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e` |
| **New bytes** | 1,191,852 |
| Modules | 12 |
| Accounting | `144 unchanged + 6 overlays + 1 forward = 151` |
| Active migrations | unchanged |

## Part A — JE provider-dispatch RPCs (P0 closed)

Exact identities (service_role EXECUTE only; PUBLIC/anon/authenticated revoked):

| Identity | Caller |
|----------|--------|
| `public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text)` | `provider-dispatch-repository.ts:81` via `getSupabaseAdmin()` |
| `public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)` | `:123` |
| `public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)` | `:168` |
| `public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)` | `:212` |

Allowlist mode: **exact identity** (`SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST`). Wrong overload → fail-closed revoke.

**Dormant safety:** DB EXECUTE does not flip PREPARE/CREATE/VERIFY, Memory/worker/GOVERNED_AUTO, or kill switches. App gates remain authoritative.

## Part B — `next_document_number` (P1 closed — retain)

- Identity: `public.next_document_number(uuid,text)`
- Callers: `lib/ap-intake/requisitions/service.ts` and `purchase-orders/service.ts` via `numbering.ts` + `createServiceClient()` → `getSupabaseAdmin()`
- Disposition: **service_role EXECUTE retained**

## Part C — `sp_write_anchor_batch` (P1 closed — revoke)

- Identity: `public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb)`
- No repository `.rpc()` caller (`block9_shipped/anchor-batcher.ts` absent)
- Disposition: **owner/admin-only**; service_role EXECUTE **REVOKED** at security slice
- Separate authorization required before any future service_role re-grant
- DEFINER / `search_path = public, pg_temp` hardening preserved

## Part D — stale `public.users` UPDATE policy (P2 closed)

- Dropped `CREATE POLICY "Users can update own record" … FOR UPDATE`
- Retained own-row **SELECT** policy
- Authenticated: **SELECT only**; UPDATE revoked; no INSERT/DELETE
- PUBLIC/anon: no privileges; service_role ALL retained

## Changed modules

| Version | Change |
|---------|--------|
| `20260907010010` | Users UPDATE policy dropped (+35 bytes) |
| `20260907010034` | JE dispatch closure grants service_role (−16 bytes vs revoke-only) |
| `20260907010035` | Anchor-batch owner-only overlay + explicit revokes |

Machine retained-grant report:  
`docs/migration-remediation/evidence/executable-squash-candidate-retained-service-role-grants.json`

## Exact next authorization

**Sixth independent source review** bound to seal `170b7105…` / bytes `1,191,852` / 12 modules.  
Still no Docker, SQL execution, production dump, branches, or active migration changes.
