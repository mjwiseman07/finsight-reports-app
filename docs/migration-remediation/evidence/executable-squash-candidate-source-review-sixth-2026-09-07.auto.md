# ESC sixth independent source review — 2026-09-07

**Verdict: PASS_SOURCE_REVIEW**

| Reviewed HEAD | `c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6` |
| Seal | `170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e` |
| Bytes | 1191852 |
| Modules | 12 |
| Candidate byte-identical | true |

## Accounting
144 unchanged + 6 overlays + 1 forward = 151
Digest qualify: 1

## JE dispatch RPCs
- `public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text)` svc=grant auth=revoke callers=lib/journal-entry-governance/provider-dispatch-repository.ts:81
- `public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)` svc=grant auth=revoke callers=lib/journal-entry-governance/provider-dispatch-repository.ts:123
- `public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)` svc=grant auth=revoke callers=lib/journal-entry-governance/provider-dispatch-repository.ts:168
- `public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)` svc=grant auth=revoke callers=lib/journal-entry-governance/provider-dispatch-repository.ts:212

## next_document_number / sp_write_anchor_batch
{
  "nextVerdict": {
    "identity": "public.next_document_number(uuid,text)",
    "netServiceRole": "grant",
    "rpcHits": [
      {
        "file": "lib/ap-intake/requisitions/numbering.ts",
        "line": 11,
        "serviceLikely": false
      },
      {
        "file": "lib/ap-intake/requisitions/service.ts",
        "line": 0,
        "serviceLikely": true
      },
      {
        "file": "lib/ap-intake/purchase-orders/service.ts",
        "line": 0,
        "serviceLikely": true
      }
    ],
    "serviceWrappers": [
      "lib/ap-intake/requisitions/service.ts",
      "lib/ap-intake/purchase-orders/service.ts"
    ],
    "numberingHasRpc": true,
    "disposition": "retain_svc_role_execute"
  },
  "anchorVerdict": {
    "identity": "public.sp_write_anchor_batch(int8,int8,int4,text,jsonb,jsonb)",
    "netServiceRole": "revoke",
    "libCallers": [],
    "scriptRpcHits": [],
    "disposition": "REVOKED"
  }
}

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
  "staleUpdatePolicy": false,
  "columnUpdateGrant": false,
  "browserUsersUpdate": false,
  "updatePolicyAbsent": true
}

## Function inventory
- CREATE hits: 116
- Unique identities: 95
- Classes: {"trigger_only":52,"internal_service_role_only":28,"migration_admin_or_internal":10,"authenticated_rls_helper":5}
- Retained service_role grants: 33
- service_role revoked but called: 0
- Retained-report diff ok: true

## Dormant activation
{"createOff":true,"verifyOff":true,"prepareOff":true,"sandboxKillOn":true,"prodCreateOff":true,"prodVerifyOff":true,"prodKillOn":true}

## Findings
- None

## Dump requirement
Full live pg_dump --schema-only remains mandatory before local replay / mutation.

## Scope
PASS_SOURCE_REVIEW is source/security/privilege/transaction/provenance scoped only. It does NOT claim production-schema parity, local replay readiness, or dump waiver.
