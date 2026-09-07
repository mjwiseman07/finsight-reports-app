# Precursor: authoritative QuickBooks `provider_environment` on OAuth reconnect

## Purpose

Code-only precursor (not the legacy-table cutover). On a normal, environment-bound QuickBooks OAuth connect/reconnect, persist `accounting_connections.provider_environment` from **trusted server configuration** bound into **signed OAuth state**.

- No production rows were changed during development.
- No OAuth or QBO call was performed in this PR.
- Existing token-resolver / adapter **legacy fallbacks remain intact**.
- Three null-environment production rows still require **separately authorized interactive reconnects**.
- PR #315 remains draft and blocked on its data gate.
- QBO token encryption-at-rest remains a **separate** security track.

## Guarantees (what this PR does)

| Guarantee | Behavior |
|-----------|----------|
| Environment authority | `expected_provider_environment` comes only from validated server `QB_ENVIRONMENT` (`sandbox` \| `production`) |
| Tamper evidence | HMAC-SHA256 over the full canonical payload (`v`, `nonce`, env, `iat`, `exp`) |
| Callback binding | Signed Intuit `state` must match HttpOnly `qb_oauth_state` cookie; browser `?environment=` is ignored |
| Cross-environment | State minted under one server env is rejected if the callback host’s `QB_ENVIRONMENT` differs |
| Persistence | Verified env is written to the canonical `accounting_connections` row for `user_id + provider + tenant_or_realm_id`; ambiguous matches fail closed |
| Fail-closed | Missing/invalid server env, bad signature, malformed/expired state, cookie mismatch → reject **before** token exchange or persistence |

## Residual replay risk (accurate wording — do not overclaim)

This implementation provides:

- signed OAuth state;
- HttpOnly cookie binding to that state;
- a short TTL (aligned with cookie max-age);
- environment binding to the current server `QB_ENVIRONMENT`;
- cookie clearing on success and error redirects.

It does **not** have an authoritative server-side **nonce-consumption ledger**.

Therefore:

- Do **not** describe the flow as “replay-proof” or “single-use proven.”
- **Residual risk:** a parallel replay attempt while the matching cookie remains valid (for example two near-simultaneous callbacks before cookie clear).
- **Mitigating fact (external):** an Intuit authorization code is normally single-use, which usually causes a second exchange to fail. That external behavior is **not** this application’s nonce guarantee.
- Adding a server-side nonce ledger would be a separate **defense-in-depth** change. It is **not required** for this environment-provenance precursor unless a later review finds a concrete exploit that bypasses authorization-code controls.

## Reviewed P3 observations (not remediated in this follow-up)

- Early `state !== cookie` string compare in the callback (before timing-safe verify) remains as-is.
- `verifiedProviderEnvironment` remains optional on non-OAuth persistence callers (e.g. promote); OAuth callback paths pass the verified value. This was intentional and is not claimed fixed here.

## Intended sequence

1. Review and merge this precursor.
2. Separately authorize interactive reconnects (operator runbook below).
3. Reconnect each affected connection on the exact intended hostname/environment.
4. Count-only readiness check (zero null/ambiguous blockers).
5. Independently re-review PR #315.
6. Merge PR #315 only after its data gate passes.
7. Update PR #314 to omit `quickbooks_connections`.

## Design

| Step | Behavior |
|------|----------|
| Connect | `createQboOAuthEnvironmentState()` resolves `QB_ENVIRONMENT`, signs `{ v, nonce, expected_provider_environment, iat, exp }` with HMAC (`QB_OAUTH_STATE_SECRET` or `QB_CLIENT_SECRET`) |
| Cookie + Intuit `state` | Same signed blob |
| Callback | Cookie equality + signature + expiry + `expected_provider_environment ===` current server env |
| Browser `?environment=` | Ignored |
| Persist | `persistCanonicalAccountingConnectionGrant({ verifiedProviderEnvironment })` writes that env; refuses `extraColumns.provider_environment` |
| Ambiguity | Grant selectors use `limit(2)` and throw `AmbiguousAccountingConnectionGrantError` |
| Legacy | Dual-write to `erp_connections` / `quickbooks_connections` via adapter **unchanged**; token-resolver fallbacks **unchanged** |

## Prohibited under this PR / precursor authorization

- Blind `UPDATE` of `provider_environment` / bulk backfill
- Live OAuth, QBO calls, token refresh/revoke, production writes during development
- Schema migrations; capability / kill-switch / dispatch / Memory / custody changes
- Merging PR #315 or modifying PR #314

## Operator reconnect runbook (design only — do not execute under this PR)

1. Use an authorized admin session and existing protected connection UI (or a controlled local report). Do not commit identifiers.
2. Confirm Vercel host:
   - Production hostname → `QB_ENVIRONMENT=production`
   - Preview/dev → `sandbox`
3. For each affected null-env connection, have the owning user initiate reconnect on that host only.
4. Stop on ambiguity / state errors; do not force environment in the browser.
5. Record **aggregate** completion counts in Git only (never tokens, realm IDs, or emails).
6. When count-only readiness shows attested production + sandbox totals with zero null/ambiguous, proceed to PR #315 re-review.

## Writer inventory (post-precursor)

Canonical env writers: `persistCanonicalAccountingConnectionGrant` (OAuth user/lead/holder + accounting service QBO lane).  
Refresh writers do not set `provider_environment`.  
Never write env to `quickbooks_connections`.
