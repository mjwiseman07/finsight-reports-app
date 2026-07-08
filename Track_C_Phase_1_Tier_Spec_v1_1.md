---
## Meter Emit Reconciliation (Phase TCP1 W1 addendum)

**Invariant:** For every `subscription_seats` row where `active=true` OR (`active=false` AND `deactivated_at >= subscription.current_period_start`), exactly one meter event MUST exist in Stripe with `identifier = 'seat-' || sha1(subscription_item_id || '|' || company_id || '|' || iso(current_period_start))`.

**Nightly reconciliation query** (to be wired into a Vercel cron in W2+):

```sql
SELECT
  ss.id                                          AS seat_id,
  ss.subscription_item_id,
  ss.company_id,
  ss.billing_period_anchor,
  ss.stripe_usage_event_id,
  ss.active,
  s.stripe_customer_id,
  s.current_period_start
FROM subscription_seats ss
JOIN subscription_items si ON si.id = ss.subscription_item_id
JOIN subscriptions       s  ON s.id = si.subscription_id
WHERE si.metered = true
  AND (ss.active = true OR (ss.active = false AND ss.deactivated_at >= s.current_period_start))
  AND (ss.billing_period_anchor IS NULL OR ss.stripe_usage_event_id IS NULL);
```

Any row returned by this query is a billing gap — replay `activateSeat()` after resetting the seat row.
