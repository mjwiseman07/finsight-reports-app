# RA Pro cutover commerce gate — preparatory build

**Branch intent:** schema-compatible gate-only prep so commerce can be held
**before** migration `20260915004500_ra_pro_firm_billing_company_id` applies.

This build does **not** depend on `billing_company_id`, webhook lease RPCs, or
`activate_review_assist_pro_subscription`.

## Env contract

| Value | Effect |
|-------|--------|
| `RA_PRO_CUTOVER_COMMERCE_GATE=open` | RA Pro checkout + activation allowed |
| `closed` / missing / malformed | Fail closed |

Server process env only. Not readable from client body, query, cookies,
Stripe metadata, or `NEXT_PUBLIC_*`.

**Configuration alone does not prove closure.** Setting the variable on a
pre-gate production build has no effect. Operators must independently verify
that **this gate-aware build** is serving checkout and webhook routes.

## Redelivery safety (current main ledger)

Production `stripe_webhook_events` uses INSERT-first + PK dedupe. A prior row
(including `failed`) makes Stripe redelivery return `duplicate` and **never**
retry activation. Therefore this prep:

1. Checks the gate **before** ledger insert for RA Pro `checkout.session.completed`
2. Returns `retryable_error` + HTTP **500** with **no** ledger row
3. If a gated error is thrown after insert (defense in depth), **deletes** the
   row so redelivery can proceed
4. Never marks gated holds as `processed`, `skipped`, or `failed`

## Deployed verification without a live payment

After separately authorized deploy + env set to `closed`, prove closure with
**non-mutating** checks only (no customers, Checkout Sessions, subscriptions,
or webhook events):

1. Confirm serving deployment commit identity matches this prep tip.
2. Confirm process env on that deployment resolves to `closed` (platform UI /
   read-only env inspection under separate auth — do not mutate).
3. **Checkout probe (preferred):** authenticated request to
   `POST /api/checkout/create-session` with `tier_key=review_assist_pro` and
   otherwise-valid body. Expect **503** + `code=ra_pro_cutover_commerce_gated`
   and confirm no Stripe customer/session was created (no Stripe Dashboard
   objects; server logs show gate return before `ensureStripeCustomerForUser`).
4. **Webhook unit/contract:** rely on automated tests in this PR for
   pre-insert hold + HTTP 500 + redelivery; do not fire live Stripe events.
5. **Negative control:** same checkout path for `solo_bookkeeper` or
   `review_assist` must **not** return the cutover 503 (may fail later for
   unrelated reasons).

If any of (1)–(3) cannot be established, **stop**. Do not apply the RA Pro
migration.

## Out of scope

Full PR #321 (entitlement filter, lease rewrite, activation RPC, migration),
caps/triggers, Vercel/env mutation, merge/deploy (separate authorizations).
