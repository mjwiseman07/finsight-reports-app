/**
 * One-shot backfill for the 4 pilot_slots rows broken by CRITICAL #1 + #2.
 *
 * Usage (dry run):
 *   node scripts/backfill-crit-1-2-pilot-slots.mjs --dry-run
 *
 * Usage (apply):
 *   node scripts/backfill-crit-1-2-pilot-slots.mjs --apply
 *
 * Requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY.
 * Reads live status from Stripe for the two LIVE-mode rows; hard-flips the
 * three sandbox-leaked rows to 'cancelled' regardless of sandbox state
 * (they were never legitimate production subscriptions).
 */
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const ROWS = [
  {
    id: '77bc402d-b1a5-4389-ada3-ed0d4ced7238',
    stripe_subscription_id: 'sub_1U0Y6MEEQBooK166lUUFBEYa',
    reason: 'CRITICAL #1 — LIVE sub canceled Aug 4 02:33 UTC, pilot_status never flipped',
    livemode: true,
  },
  {
    id: '26ae7936-54e4-4033-bd77-c0c9cc145924',
    stripe_subscription_id: 'sub_1TymbQCYGplhrQTJoNkY9lZo',
    reason: 'CRITICAL #1+#2 — sandbox sub canceled Jul 30, pilot_status stuck active',
    livemode: false,
  },
  {
    id: '8105b1a9-5398-44e9-bf84-e6b7709ab94e',
    stripe_subscription_id: 'sub_1U0RbRCYGplhrQTJ1wDKnDwJ',
    reason: 'CRITICAL #2 — sandbox event leaked into prod (never a legitimate LIVE sub)',
    livemode: false,
  },
  {
    id: 'b8e6503d-2f8e-40c4-976f-2fb71e5d97fc',
    stripe_subscription_id: 'sub_1U0TGUCYGplhrQTJiZgPX2vW',
    reason: 'CRITICAL #2 — sandbox event leaked into prod (never a legitimate LIVE sub)',
    livemode: false,
  },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const apply = process.argv.includes('--apply');
  if (!dryRun && !apply) {
    console.error('Usage: node scripts/backfill-crit-1-2-pilot-slots.mjs [--dry-run|--apply]');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
    process.exit(1);
  }
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY is required (used only to verify livemode rows)');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
  const stripe = new Stripe(stripeKey);

  console.log(`[backfill] mode: ${dryRun ? 'DRY-RUN' : 'APPLY'}`);
  console.log(`[backfill] target rows: ${ROWS.length}`);

  for (const row of ROWS) {
    const { data: existing, error: readErr } = await supabase
      .from('pilot_slots')
      .select('id, pilot_status, tier_key, stripe_subscription_id, notes')
      .eq('id', row.id)
      .maybeSingle();
    if (readErr) {
      console.error(`[backfill] ${row.id} read failed`, readErr);
      continue;
    }
    if (!existing) {
      console.warn(`[backfill] ${row.id} not found — skipping`);
      continue;
    }
    if (existing.pilot_status === 'cancelled') {
      console.log(`[backfill] ${row.id} already cancelled — skipping`);
      continue;
    }

    if (row.livemode) {
      // Confirm the Stripe subscription is actually canceled before flipping.
      let sub;
      try {
        sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      } catch (err) {
        console.error(`[backfill] ${row.id} stripe retrieve failed`, err.message);
        continue;
      }
      if (sub.status !== 'canceled' && sub.status !== 'unpaid' && sub.status !== 'incomplete_expired') {
        console.warn(
          `[backfill] ${row.id} Stripe sub status is '${sub.status}' — NOT flipping (would be incorrect)`,
        );
        continue;
      }
      console.log(`[backfill] ${row.id} LIVE sub confirmed status='${sub.status}' — safe to flip`);
    } else {
      console.log(`[backfill] ${row.id} sandbox-leaked — hard-flipping without Stripe check`);
    }

    console.log(`  → tier: ${existing.tier_key} | current: ${existing.pilot_status} → target: cancelled`);
    console.log(`  → reason: ${row.reason}`);

    if (dryRun) continue;

    const { error: updateErr } = await supabase
      .from('pilot_slots')
      .update({
        pilot_status: 'cancelled',
        updated_at: new Date().toISOString(),
        notes: existing.notes
          ? `${existing.notes}\n[${new Date().toISOString()}] CRIT-1-2 backfill: ${row.reason}`
          : `[${new Date().toISOString()}] CRIT-1-2 backfill: ${row.reason}`,
      })
      .eq('id', row.id);
    if (updateErr) {
      console.error(`[backfill] ${row.id} update failed`, updateErr);
      continue;
    }
    console.log(`  ✅ ${row.id} flipped to cancelled`);
  }

  console.log('[backfill] done');
}

main().catch((err) => {
  console.error('[backfill] fatal', err);
  process.exit(1);
});
