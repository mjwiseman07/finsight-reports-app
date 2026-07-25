# Preview Smoke Credential

Dedicated test user for automated UI browser smoke tests against Vercel Preview
deployments. Preview-only enforcement means the credential cannot be used in
Production even if it leaks.

## Credentials

- Email: `preview-smoke@advisacor.com`
- Supabase `auth.users.id`: `0f660773-eaf1-4187-a7f6-acb0f34c1c64`
- Password: Vercel env `PREVIEW_SMOKE_PASSWORD` (**Preview scope only**)
- Retrieval: `vercel env pull .env.preview.local --environment=preview`

`PREVIEW_SMOKE_EMAIL` is seeded to Preview **and** Production **and**
Development. It is an identifier, not a secret, and the deny-rule needs it
outside Preview. The email is also hardcoded in `lib/preview-smoke/guard.ts` so
the block stays fail-closed if the env var is ever removed.

## Assigned engagement

- Pilot engagement: `724546e9-6deb-4f7f-b8ad-88e5ee65353d` ("Week 3 Smoke — PBC Ingest Fixture")
- Scope: **firm**-scoped (`firm_id` `11111111-1111-1111-1111-111111111111`, `company_id` is null)
- Membership row: `firm_memberships` with `role = 'controller'`, `status = 'active'`
- `controller` is in `FIRM_WRITE_ROLES`, so `getEngagementActor` returns
  `canWrite: true` — Run / Regenerate / policy / classify surfaces are reachable.
- Never `firm_admin`: that role is what triggers MFA enrollment enforcement.
- MFA: no factors enrolled (a defensive exemption also exists in middleware).

## Enforcement model

Sign-in is **client-side** — `app/signin/page.tsx` calls
`supabase.auth.signInWithPassword()` against Supabase's own `/auth/v1` endpoint.
No server route ever sees the credentials, so there is no sign-in POST to
intercept. Enforcement therefore happens at **session acceptance**:

1. `lib/preview-smoke/guard.ts` inspects every request for a session belonging
   to the smoke user — the `advisacor_access_token` cookie, the chunked
   `sb-<ref>-auth-token` cookies written by `@supabase/ssr`, and
   `Authorization: Bearer`.
2. If that session is present and `VERCEL_ENV !== 'preview'`, `middleware.ts`
   returns `403 { "error": "smoke_credential_not_allowed_outside_preview" }`
   before any other gate runs.
3. `lib/mfa/middleware-enforce.ts` early-returns for the smoke user in Preview,
   before any role lookup, so an accidental role escalation cannot start
   demanding MFA of an automated run.

Launch gates (`SOLO_BK_*`, `REVIEW_ASSIST_*`) only fire on `advisacor.com` /
`www.advisacor.com`, so `*.vercel.app` Preview URLs bypass them with no code.

## Usage from a browser automation task

Cloudflare Turnstile guards the sign-in form, but it is configured in managed
mode and **auto-solves in a real browser** — no human interaction needed. Give
the automation task:

> Sign in at `<preview-url>/signin` using email `preview-smoke@advisacor.com`
> and password `<password>`. Wait for the Turnstile widget to show Success and
> the Sign In button to enable, then submit. Navigate to `<target url>`.

Retrieve `<password>` with `vercel env pull` before starting the task.

## Programmatic sessions (curl / scripts)

Supabase has captcha protection enabled **project-wide**, so the password grant
(`POST /auth/v1/token?grant_type=password`) fails with `captcha_failed` outside
a browser. For scripted checks, mint a session with the service role instead:

```
POST /auth/v1/admin/generate_link   { "type": "magiclink", "email": "…" }   -> hashed_token
POST /auth/v1/verify                { "type": "magiclink", "token_hash": … } -> access_token
```

This path is captcha-free and yields a normal AAL1 session for the smoke user.

## Rotation

Not required for a Preview-only account holding no customer data. If ever needed:

1. Change the password in Supabase Auth for this user.
2. Update `PREVIEW_SMOKE_PASSWORD` in the Vercel Preview environment.
3. No code change — the email is what the guard keys on.

## Rejection scenarios

Presenting this session in Production or locally returns
`403 smoke_credential_not_allowed_outside_preview`. That is expected behaviour,
not a bug.

## Standing rules

- Never grant this account `firm_admin`, super-admin, or membership in any
  engagement other than the pilot.
- Never add `PREVIEW_SMOKE_PASSWORD` to the Production or Development scope.
