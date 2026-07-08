---
## Meter Emit Reconciliation (Phase TCP1 W1 addendum)

**Invariant:** For every `subscription_seats` row where `status='active'` OR (`status='released'` AND `released_at >= subscription.current_period_start`), exactly one meter event MUST exist in Stripe with `identifier = sha1(subscription_item_id + '|' + company_id + '|' + iso(current_period_start))` prefixed with `seat-`.

**Nightly reconciliation query** (to be wired into a Vercel cron in W2+):

```sql
SELECT
  ss.id                                          AS seat_id,
  ss.subscription_item_id,
  ss.company_id,
  ss.billing_period_anchor,
  ss.last_meter_event_id,
  ss.status,
  s.stripe_customer_id,
  s.current_period_start
FROM subscription_seats ss
JOIN subscription_items si ON si.id = ss.subscription_item_id
JOIN subscriptions       s  ON s.id = si.subscription_id
WHERE si.metered = true
  AND (ss.status = 'active' OR (ss.status = 'released' AND ss.released_at >= s.current_period_start))
  AND (ss.billing_period_anchor IS NULL OR ss.last_meter_event_id IS NULL);
```

Any row returned by this query is a billing gap — replay `activateSeat()` after resetting the seat row.
