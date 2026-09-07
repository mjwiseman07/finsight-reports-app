# Executable squash/baseline candidate package — remediations 2026-09-06

**Authorization:** candidate remediation only (SQL/manifest/docs/tests).  
**PR #314:** draft. **Production mutation:** NO. **Docker/branch/SQL exec:** NO.

## Bound pins
- Remediation from PR HEAD: `689ab36b5e82df08dd664f43067788b6902eb86e`
- Reviewed ancestor: `524ada4933c7d326e79cf69cb69bb88aed7a5c08` (seal `ae85b002…`, 1,132,090 bytes)
- main: `9d8a01d37422179ddd68bbd181a8815d8a893577`
- Option D: blob `0d2a39a3…` · SHA-256 `9dc080cf…` · PASS 151/151

## P0 remediations
1. Merged former modules 4+5 into atomic `20260907010030_esc_application_schema_and_security_atomic`
2. Enabled RLS + service_role-only policy on `gap2_purge_table_registry` and `engagement_posting_policy`
3. Digest qualify retained **only** in forward-tail module 7
4. Revoked PUBLIC/anon/authenticated EXECUTE on `publish_ledger_event` and `increment_share_token_access` (service_role callers)

## Package files
Under `supabase/migrations-draft/executable-squash-candidate/` (7 SQL modules) + `MANIFEST.json`.

**Ready for independent source review:** YES (new review required; do not claim PASS_SOURCE_REVIEW yet)  
**Ready for local replay / production dump / mutation:** NO

## Next authorization
New independent source review of this remediations package. Do not request production schema dump until that review PASSes boundary/security gates.
