# Multi-Factor Authentication — Advisacor (Intuit / SOC 2 evidence)

Last updated: 2026-07-15  
Phase: TCP1 W2.5 Block 10

## Method

- **Algorithm:** TOTP (RFC 6238) via Supabase Auth MFA
- **Parameters:** 30-second time step, 6-digit codes, authenticator-app enrollment (Google Authenticator, Authy, 1Password, etc.)
- **Enrollment path:** `/dashboard/account/security`
- **Challenge path:** `/signin/mfa-challenge` (after password when AAL1 and a verified TOTP factor exists)

## Recovery codes

- **Count:** 10 one-time codes per enrollment / regeneration
- **Format:** `XXXX-XXXX-XXXX-XXXX` (16 hex digits, dash-delimited)
- **Storage:** SHA-256 hash of normalized (dash-stripped, uppercased) code in `public.mfa_recovery_codes`
- **Display:** plaintext shown **once** at enroll / regenerate; never re-readable from the database
- **Lost-device flow:** valid recovery code consumption invalidates remaining unused codes and removes TOTP factors via Admin API, then forces re-enrollment at `/dashboard/account/security`

## Enforcement

| Role | MFA posture |
|------|-------------|
| `firm_admin` (active `firm_memberships`) | **Mandatory** — middleware redirects to `/dashboard/account/security?enforcement=required` until enrolled; sensitive routes require session `aal=aal2` once enrolled |
| All other roles | **Opt-in** — if enrolled, login and sensitive routes require AAL2 |

## Sensitive routes (AAL2 / enrollment gates)

- `/admin`, `/dashboard/admin`
- `/dashboard/settings/firm`
- `/api/quickbooks/connect` (+ integrations shim)
- `/api/billing/*`
- `/api/admin/*`
- `/api/user/delete`
- `/api/checkout/create-session`

**Explicitly not gated (Intuit webhook / OAuth return):**

- `/api/quickbooks/callback`
- `/api/quickbooks/disconnect` (HMAC verifier / realm revoke)

## Audit trail

Table `public.mfa_audit_log` is **append-only** (trigger blocks UPDATE/DELETE).

Logged event types:

- `enroll_started`, `enroll_completed`, `enroll_failed`
- `verify_success`, `verify_failed`
- `disable`
- `recovery_code_used`, `recovery_codes_regenerated`
- `admin_enforcement_prompted`

Each row stores `user_id`, `event_type`, `metadata`, optional `ip_address` / `user_agent`, and `created_at`.

## Session escalation

1. Password sign-in establishes AAL1 and sets `advisacor_access_token`.
2. Client calls `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`.
3. If `nextLevel === 'aal2'` and `currentLevel !== 'aal2'`, redirect to `/signin/mfa-challenge`.
4. Successful TOTP verify returns a new access token with `aal=aal2`; cookie is refreshed.
5. Middleware re-checks JWT `aal` claim on sensitive paths.

## Intuit App Assessment mapping

| Questionnaire topic | Advisacor control |
|---------------------|-------------------|
| User MFA available | Yes — TOTP enrollment UI |
| Admin / privileged MFA | Yes — firm_admin mandatory |
| Backup / recovery | Yes — hashed one-time recovery codes |
| Audit of auth events | Yes — immutable `mfa_audit_log` |
