# ESC fifth independent source review — 2026-09-07

**Verdict: CHANGES REQUIRED**

| Reviewed HEAD | `1a4c8182b68a2506f85140970073558fb1b1ebb2` |
| Seal | `75b3466195ad01ae336cb1a5f6e89f29232757b2d048dd68ac9ad50bad1d049b` |
| Bytes | 1191052 |
| Modules | 12 |
| Candidate byte-identical | true |

## Accounting
144 unchanged + 6 overlays + 1 forward = 151
Digest qualify: 1

## public.users
{
  "selectGrantAuth": true,
  "updateRevokedAuth": true,
  "noTableUpdateGrantAuth": true,
  "noAnonAll": true,
  "revokeAnon": true,
  "revokePublic": true,
  "serviceAll": true,
  "ownRowSelect": true,
  "staleUpdatePolicy": true,
  "columnUpdateGrant": false
}

## Function inventory
- CREATE hits: 116
- Unique identities: 95
- Classes: {"trigger_only":52,"internal_service_role_only":24,"migration_admin_or_internal":14,"authenticated_rls_helper":5}
- Retained service_role grants: 30
- service_role revoked but called: 4

## Findings
- **P2** `USERS_STALE_UPDATE_RLS_POLICY` @ 10010: FOR UPDATE own-row policy remains after table UPDATE revoke (dead policy; not a write path)
- **P1** `SERVICE_ROLE_EXECUTE_WITHOUT_PROVEN_CALLER` @ 20260907010031:3430: public.next_document_number(uuid,text)
- **P1** `SERVICE_ROLE_EXECUTE_WITHOUT_PROVEN_CALLER` @ 20260907010035:1576: public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb)
- **P0** `SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED` @ 20260907010034:3905: public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text) called by lib/journal-entry-governance/provider-dispatch-repository.ts:81 but net service_role EXECUTE is revoke
- **P0** `SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED` @ 20260907010034:3910: public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) called by lib/journal-entry-governance/provider-dispatch-repository.ts:123 but net service_role EXECUTE is revoke
- **P0** `SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED` @ 20260907010034:3915: public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) called by lib/journal-entry-governance/provider-dispatch-repository.ts:168 but net service_role EXECUTE is revoke
- **P0** `SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED` @ 20260907010034:3920: public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text) called by lib/journal-entry-governance/provider-dispatch-repository.ts:212 but net service_role EXECUTE is revoke

## Dump requirement
Full live pg_dump --schema-only remains mandatory before local replay / mutation.
