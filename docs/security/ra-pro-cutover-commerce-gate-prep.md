# RA Pro cutover commerce gate — preparatory build

**Branch intent:** schema-compatible gate-only prep so commerce can be held
**before** migration `20260915004500_ra_pro_firm_billing_company_id` applies.

This build does **not** depend on `billing_company_id`, webhook lease RPCs, or
`activate_review_assist_pro_subscription`.

## Env contract

| Value | Effect |
|-------|--------|
| `RA_PRO_CUTOVER_COMMERCE_GATE=open` | New RA Pro checkout + webhook **admissions** allowed |
| `closed` / missing / malformed | Fail closed — new admissions blocked |

Server process env only. Not readable from client body, query, cookies,
Stripe metadata, or `NEXT_PUBLIC_*`. There is no request- or metadata-supplied
“already admitted” bypass.

**Configuration alone does not prove closure.** Setting the variable on a
pre-gate production build has no effect. Operators must independently verify
that **this gate-aware build** is serving checkout and webhook routes.

## Admission semantics (current main ledger)

Production `stripe_webhook_events` uses INSERT-first + PK dedupe. A prior row
(including `failed`) makes Stripe redelivery return `duplicate` and **never**
retry activation. Therefore this prep treats the gate as an **admission check**:

1. For RA Pro `checkout.session.completed`, check the gate **before** ledger
   insert.
2. When closed/missing/malformed: return `retryable_error` + HTTP **500** with
   **no** ledger row and **no** activation (Stripe can redeliver).
3. Once admitted under an open gate and successfully inserted, **preserve** the
   ledger row. Closure does **not** cancel previously admitted work. Do **not**
   delete ledger rows or throw gate-related retryable errors after insert.
4. After admission, main processing / `failed` semantics apply unchanged.
5. Gated holds are never marked `processed`, `skipped`, or `failed` (they never
   inserted).

**Quiescence is not proven by the gate alone.** Before migration apply, cutover
must establish that pre-closure in-flight admitted work has drained using
**separately authorized independent evidence**. Closing the gate only blocks
new admissions.

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
   pre-insert hold + HTTP 500 + admission-preserving concurrency; do not fire
   live Stripe events.
5. **Negative control:** same checkout path for `solo_bookkeeper` or
   `review_assist` must **not** return the cutover 503 (may fail later for
   unrelated reasons).

If any of (1)–(3) cannot be established, **stop**. Do not apply the RA Pro
migration.

## Out of scope

Full PR #321 (entitlement filter, lease rewrite, activation RPC, migration),
caps/triggers, Vercel/env mutation, merge/deploy (separate authorizations).
