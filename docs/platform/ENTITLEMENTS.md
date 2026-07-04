# Doc D Entitlements

## Model

- **Base tier: Full Close** (JEs, reclass, accruals, recon, flux+JE proposal, period lock, audit trail, assertions, guided close).
- **6 independent add-ons:** `ap_intake`, `ap_pay`, `ar_invoicing`, `ar_cash_app`, `ar_collections`, `voice_collections`. Any combination. No prerequisites.

## Enforcement

Every add-on module (D6.5 intake, D6.6 pay, D6.7 cash app, D6.8 AR) MUST call `assertEntitlement(code, engagementId, ctx)` at its entry point. Denied checks throw `EntitlementDenied` and log to `entitlement_check_audit`. Allowed checks also log (for D11 coverage statement).

## State changes

Never toggle `is_active` directly. Use:

- `activateAddon(...)` — upsert + publish `entitlement.activated` event
- `deactivateAddon(...)` — soft flip + publish `entitlement.deactivated` event

Both publish into the immutable `ledger_events` log (`event_category = entitlement`).

## Stripe

- Prod webhook: `POST /api/webhooks/stripe`
- Signature verified with `STRIPE_WEBHOOK_SECRET`
- Idempotent via `stripe_webhook_events.stripe_event_id` PK
- Subscription line-item metadata `addon_code` maps to our 6 codes
- Subscription `metadata.engagement_id` maps to our engagement UUID

## Pricing

Pricing lives in Stripe (Product/Price metadata), not our DB. Our schema is tier-agnostic; per-engagement overrides live on `engagement_addons` (`included_volume_override`, `overage_unit_price_cents_override`).
