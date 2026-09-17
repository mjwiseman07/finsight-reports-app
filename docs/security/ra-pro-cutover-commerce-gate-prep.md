# RA Pro cutover commerce gate — prep + reconciled lease stack

**Branch intent:** admission-only cutover gate composed with durable webhook
leases and company-owned RA Pro billing (reconciled PR #321 onto main after
merged #322).

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
that a **gate-aware build** is serving checkout and webhook routes.

## Admission semantics (durable lease ledger)

Production `stripe_webhook_events` uses durable lease claim/finalize (no
DELETE-on-retry). Therefore the gate remains an **admission check**:

1. For RA Pro `checkout.session.completed`, check the gate **before** lease
   claim.
2. When closed/missing/malformed: return `retryable_error` + HTTP **500** with
   **no** lease claim and **no** activation (Stripe can redeliver).
3. Once admitted under an open gate and successfully **claimed**, **preserve**
   the ledger row. Closure does **not** cancel previously admitted work. Do
   **not** delete ledger rows or throw gate-related retryable errors after
   claim.
4. After admission, main processing / finalize semantics apply unchanged
   (including stale-lease rejection).
5. Gated holds are never marked `processed`, `skipped`, or `failed` (they never
   claimed).

**Quiescence is not proven by the gate alone.** Before migration apply, cutover
must establish that pre-closure in-flight admitted work has drained using
**separately authorized independent evidence**. Closing the gate only blocks
new admissions.

## Closure / quiescence evidence is time-bounded

Any closure or quiescence evidence is **historical** for the window in which it
was collected. It does **not** remain fresh indefinitely.

- Record **source**, **collection time**, and **serving commit identity**.
- Before migration apply, require a **fresh pre-apply check** under separate
  authorization — do not reuse stale closure/quiescence snapshots.
- Missing, stale, contradictory, or self-attested observations **block** apply.

## Deployed verification without a live payment

After separately authorized deploy + env set to `closed`, prove closure with
**non-mutating** checks only (no customers, Checkout Sessions, subscriptions,
or webhook events):

1. Confirm serving deployment commit identity matches the gate-aware tip.
2. Confirm process env on that deployment resolves to `closed` (platform UI /
   read-only env inspection under separate auth — do not mutate).
3. **Checkout probe (preferred):** authenticated request to
   `POST /api/checkout/create-session` with `tier_key=review_assist_pro` and
   otherwise-valid body. Expect **503** + `code=ra_pro_cutover_commerce_gated`
   and confirm no Stripe customer/session was created.
4. **Webhook unit/contract:** rely on automated tests for pre-claim hold +
   HTTP 500 + admission-preserving concurrency; do not fire live Stripe events.
5. **Negative control:** same checkout path for `solo_bookkeeper` or
   `review_assist` must **not** return the cutover 503.

If any of (1)–(3) cannot be established, **stop**. Do not apply the RA Pro
migration.

## Out of scope (this document)

Production apply tooling, Vercel/env mutation, merge/deploy, gate opening, or
ready-mark — all require **separate authorization**.
