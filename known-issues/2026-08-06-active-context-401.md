# /api/accounting/active-context returns 401 on browser session

Discovered: 2026-08-06 during DASH_1A local verification

Branch: dash-1-scorecard-and-onboarding

## Repro

- Sign in manually as mwiseman@advisacor.com with TOTP MFA on localhost
- Dashboard UI renders authenticated (client-side session cookie works)
- `/api/accounting/active-context` returns 401 "Invalid or expired token"

## Impact

Blocks local smoke of any dashboard flow that fetches active accounting context server-side.

## Not blocking Prod

Prod behavior not yet verified — assumed working since customers have not reported this.

## Follow-up

Diagnose after DASH_1 lands. Likely candidates: session cookie parsing in the API route handler, JWT expiry mismatch, or middleware ordering.

Do NOT attempt a drive-by fix inside DASH_1A — log only.

---

# Local dev environment has no QBO sync data for test accounts

Discovered: 2026-08-06 during DASH_1A local verification

Branch: dash-1-scorecard-and-onboarding

## Observation

Both mwiseman@ and demo@ lack `accounting_syncs` rows locally (and the `accounting_syncs` table itself is not present on the linked prod Supabase project as of this note). Fresh signups also lack them (obviously).

## Impact

Cannot verify Scorecard live-data rendering on localhost — must use Preview against real customer connections.

## Not blocking

Preview deployment auto-connects to Prod QBO for accounts that have real integrations. Verification path shifts to Preview.
