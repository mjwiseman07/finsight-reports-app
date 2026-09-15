# Review Assist Pro migration seal authority

**Authoritative artifact:** committed Git **LF** blob for

`supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql`

Do **not** hash a Windows CRLF worktree checkout. Always:

```bash
git rev-parse HEAD:supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql
git cat-file blob <oid> | openssl dgst -sha256
git cat-file blob <oid> | wc -c
```

## Superseded (non-authoritative)

| Label | SHA-256 | Bytes | Why superseded |
|-------|---------|------:|----------------|
| Pre-review CRLF worktree measurement | `c54ff8f915d24a90de810b95882899fa8e3560fc810b18341f66d0736cfdfdcf` | 15822 | PowerShell/worktree CRLF expansion; not the Git blob |
| Reviewed tip `81f2d218` LF blob | `a3d59450966f16df7d2b98852954bef5737ff911d93ff9b683a2854fe682a2b8` | 15353 | Pre-remediation content |
| Tip `0ba6cee8` LF blob | `46cfc6780de07445541bdaefdd5b2b70bbb5fe0416b26a8efcd5cd8d6dc58486` | 15639 | Pre-lease / pre-cutover-docs content |

## Current tip seal (post lease remediation)

| Field | Value |
|-------|-------|
| Blob OID | `9d7a929c1d855fb07fd0acd243abb49a8b6ba819` |
| SHA-256 | `1a97bb2f681f948c0baad26fb338737258e248cf07d179d1933ec95e5e287b91` |
| Bytes | `23526` |

`.gitattributes` forces `text eol=lf` for this migration path. Production apply remains separately authorized and is **not** performed by this PR. Deterministic RA Pro billing-link backfill is **not** included — see `ra-pro-cutover-derivation.md`.
