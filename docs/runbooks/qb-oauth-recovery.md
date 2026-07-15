# QuickBooks OAuth — Recovery & Production Cutover Runbook

_Phase TCP1 W3._

## When to consult this

- Users report "cannot connect QuickBooks" or landing on an error banner post-Intuit auth.
- Flipping the prod app from Intuit sandbox to Intuit production.
- Rotating QB credentials after suspected compromise.

## Prerequisites — Intuit Developer Console verification

Before flipping `QB_ENVIRONMENT` from `sandbox` to `production`, confirm in the Intuit Developer Console:

1. Sign in at https://developer.intuit.com and open the **Advisacor** app.
2. Confirm the app status shows **Production Approved** (not Sandbox Only).
3. Under **Keys & OAuth → Production**, confirm:
   - `Client ID` matches Vercel prod `QB_CLIENT_ID`.
   - `Client Secret` matches Vercel prod `QB_CLIENT_SECRET`.
   - **Redirect URIs** includes `https://www.advisacor.com/api/quickbooks/callback`.
   - If your `Client ID` in Vercel matches the **Development** tab instead of **Production**, the app is still using sandbox credentials — production cutover cannot proceed until Intuit approves the app for Production.

## Cutover procedure

1. Verify the checks above.
2. In Vercel dashboard → advisacor project → Settings → Environment Variables:
   - Edit `QB_ENVIRONMENT` for **Production** environment: `sandbox` → `production`.
   - If `QB_CLIENT_ID` / `QB_CLIENT_SECRET` in Vercel are sandbox values, replace them with the Production values from Intuit Developer Console (Production tab).
3. Trigger a production redeploy (any promote or a new merge to `main`).
4. Verify by connecting a real QuickBooks Online company end-to-end.

## Rollback

If production connect fails after cutover:

1. Flip `QB_ENVIRONMENT` back to `sandbox` in Vercel prod.
2. Restore sandbox `QB_CLIENT_ID` / `QB_CLIENT_SECRET` if changed.
3. Redeploy.
4. Sandbox-only connections resume working.

## Diagnosing failures

The callback logs a structured line per event to Vercel logs:

- `[quickbooks/callback] received callback` — always logs entry.
- `[quickbooks/callback] token exchange failed` — check `message` / `intuitTid` for Intuit-side detail.
- `[quickbooks/callback] user connection save failed` — Supabase issue on `erp_connections`.

The user is redirected to `/onboarding?qbError=<code>` on any error — check the `qbError` code:

| Code | Meaning |
|---|---|
| `intuit_denied` | User cancelled on Intuit prompt, or Intuit returned an OAuth error |
| `state_mismatch` | State cookie expired (10-min TTL) or user reached callback on wrong host |
| `missing_callback_values` | Intuit didn't return `code` or `realmId` |
| `missing_admin_client` | Server-side `supabaseAdmin` missing — env misconfig |
| `invalid_supabase_token` | Session expired mid-OAuth |
| `token_exchange_failed` | Intuit rejected our exchange call — very often means sandbox/prod env mismatch, or bad `QB_REDIRECT_URI` vs. what's registered in Intuit console |
| `connection_save_failed` | Supabase write to `erp_connections` or `accounting_connections` failed |

## Rotating QB credentials

If credentials are compromised:

1. Intuit Developer Console → your app → Regenerate `Client Secret` under whichever tab (sandbox / production) is in use.
2. Update `QB_CLIENT_SECRET` in Vercel prod (and preview/dev if applicable).
3. Trigger prod redeploy.
4. All existing user connections in `erp_connections` remain valid (they carry their own refresh tokens issued under the previous secret) — Intuit does not invalidate user tokens on client secret rotation.
