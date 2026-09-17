# RA Pro cutover — operator decision & deployment sequence

## Authorized operator decision

Committed sanitized record:

`docs/security/ra-pro-cutover-operator-decision.json`

| Field | Value |
|-------|-------|
| Protocol | `ra-pro-cutover-operator-decision/v1` |
| Mapping artifact SHA-256 | `93f6fe31360222ccd282e814a3764ccf07929e7cb91c25c70e10b750ec0ec953` |
| Decision-record Git OID | `0dd39de5ffbfd2b35d3d73887dd0fa915a061c93` |
| Decision-record SHA-256 (Git **LF** blob) | `f00039cb536b0ffef09ea41c0613ce83d7f52067b2bffc4ff27980f8e9bd46e1` |
| Decision-record bytes | `1122` |
| Actions | **NO_CUTOVER × 4** |
| Link / create | 0 / 0 |
| Collisions | 0 |
| Backfill authorized | **false** |
| Classification | internal smoke/demo entitlements excluded |

Digest authority: committed Git **LF** blob only (see
`docs/security/ra-pro-decision-record-seal.md`). Superseded CRLF worktree digest
`8499dd36…` / 1148 bytes is non-authoritative.

The detailed handle-bearing ceremony artifact remains **local-only** under
`scripts/output/` (gitignored). Do not commit handles, names, emails, or IDs.

This release **does not** backfill `firms.billing_company_id`. Existing unlinked
firms stay denied from `/reviewer`. Legacy smoke/demo pilot rows are left for
audit history and grant no new reviewer access. Future customers must use the
canonical activation path after commerce reopening.

## Cutover commerce gate contract

| Item | Value |
|------|-------|
| Env var | `RA_PRO_CUTOVER_COMMERCE_GATE` |
| `open` | RA Pro checkout + webhook activation allowed |
| `closed` | Checkout returns **503** `ra_pro_cutover_commerce_gated` before Stripe session create; RA Pro `checkout.session.completed` is held **before lease claim** as retryable HTTP 500 (no claim / no finalize / not processed/skipped) |
| missing / malformed | **closed** (fail closed) |
| Authority | Server process env only |
| Forbidden inputs | client body, query, cookies, Stripe metadata, `NEXT_PUBLIC_*` |

Distinct from `LAUNCH_GATE_REVIEW_ASSIST_PRO` (cookie/token bypass). Cutover must
**not** rely on that bypass path.

This authorization does **not** mutate Vercel. Operators set the variable under
separate environment authorization.

### Gate-aware build vs older pre-gate builds

`RA_PRO_CUTOVER_COMMERCE_GATE` has **no effect** on older, pre-gate builds. Those
builds do not read the variable on checkout or webhook activation routes.

Setting the env value to `closed` **alone does not establish** that commerce is
blocked. Configuration is not evidence of runtime closure.

Before migration apply:

- Independently verify that a **gate-aware** build (this PR’s checkout + webhook
  gate) is serving the relevant checkout and webhook routes.
- Independently verify that commerce is actually blocked (checkout 503
  `ra_pro_cutover_commerce_gated` before Stripe; RA Pro webhook held
  **before lease claim** as retryable HTTP 500 — no claim, not processed/skipped).
- If this cannot be established safely, **stop**. Do not infer closure from
  configuration alone.
- Any prerequisite deployment or configuration change requires **separate
  authorization**. This runbook does not authorize those changes.

## Cutover sequence (production)

1. Confirm mapping artifact SHA still matches the committed decision record.
2. Set `RA_PRO_CUTOVER_COMMERCE_GATE=closed` in production (**separate auth**).
   This step does **not** by itself prove commerce is blocked on older builds.
3. Independently verify a gate-aware build is serving checkout/webhook routes
   and that commerce is blocked (see above). If not established, **stop**.
   Deploying that build (if not already live) requires **separate authorization**.
4. Run sanitized read-only preconditions (`assertCutoverPreconditions`) using
   independently collected evidence only (see evidence contract below):
   - authorizing slots still 4 (3 company / 1 firm)
   - zero new slots after mapping snapshot
   - `billing_company_id` column absent
   - migration version absent
   - no unexpired processing leases
   - no unreviewed held/retryable RA Pro events
   - commerce gate confirmed closed **in the serving gate-aware build**, not
     inferred from env configuration alone
5. Apply migration `20260915004500_ra_pro_firm_billing_company_id` (separate auth).
6. Independently verify migration + zero linked firms.
7. Deploy / confirm production deployment healthy with `/reviewer` denying unlinked firms
   (**separate authorization** for any deploy).
8. Do **not** reopen until reopening criteria below are met.

## Evidence contract for `assertCutoverPreconditions(observed)`

`assertCutoverPreconditions` **validates supplied observations**. It does **not**
collect production facts and does **not** independently authenticate them.

- Every required observation must be supported by **independently collected,
  authorized read-only evidence**.
- Record **source**, **collection time**, **relevant deployment/commit identity**,
  and **sanitized results** for each observation.
- **Missing, stale, contradictory, or self-attested** observations **block**
  cutover.
- Closure and quiescence evidence is **time-bounded and historical**. Passing
  within a stated window does **not** keep that evidence fresh indefinitely.
- Before migration apply, require a **fresh pre-apply check** under separate
  authorization — do not reuse prior closure/quiescence snapshots as current.
- Do **not** fabricate values. Do **not** treat unit-test fixtures as production
  evidence.

Any inventory drift → **stop** and require a new mapping ceremony.

## Reopening criteria

Reopen only when **all** are true:

- Migration applied and independently verified
- PR #321 merged and production deployment healthy
- `/reviewer` denies every unlinked firm
- Canonical activation succeeds in controlled non-prod or separately authorized smoke
- Webhook lease/idempotency passes
- Limits 2 / 5 / 10 pass
- No held/retryable RA Pro event needs reconciliation
- Monitoring + operator reconciliation runbook ready

Then set `RA_PRO_CUTOVER_COMMERCE_GATE=open` (separate auth). Do not leave the
gate permanently closed as a product shutdown.
