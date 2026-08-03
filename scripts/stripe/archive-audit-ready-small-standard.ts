/**
 * Track 4 — Archive dominated Audit Ready SKUs
 *
 * Archives:
 *   - Product prod_Uuok22w0mYcrCT (Audit Ready — Small) + its 4 prices
 *   - Product prod_UuokQLePTI61yr (Audit Ready — Standard) + its 4 prices
 *
 * Both are dominated by Review Assist Pro base tier ($199 / 2 entities / 150 PBC).
 *
 * IDEMPOTENT: safe to re-run. Skips already-inactive prices/products.
 *
 * Usage:
 *   npx tsx scripts/stripe/archive-audit-ready-small-standard.ts --env=test --dry-run
 *   npx tsx scripts/stripe/archive-audit-ready-small-standard.ts --env=test --execute
 *   npx tsx scripts/stripe/archive-audit-ready-small-standard.ts --env=live --dry-run
 *   npx tsx scripts/stripe/archive-audit-ready-small-standard.ts --env=live --execute
 */

import Stripe from 'stripe';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(filePath: string) {
  try {
    const raw = readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {}
}

function readKeyFromFile(filePath: string): string | null {
  try {
    const raw = readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line.startsWith('STRIPE_SECRET_KEY=')) continue;
      let value = line.slice('STRIPE_SECRET_KEY='.length).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value || null;
    }
  } catch {}
  return null;
}

function keyMode(key: string): 'live' | 'test' | 'unknown' {
  if (key.startsWith('sk_live_')) return 'live';
  if (key.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

function resolveStripeKey(target: 'live' | 'test'): string {
  loadEnvFile(resolve(process.cwd(), '.env.local'));
  loadEnvFile(resolve(process.cwd(), '.env'));

  const dedicated =
    target === 'live'
      ? process.env.STRIPE_LIVE_SECRET_KEY
      : process.env.STRIPE_TEST_SECRET_KEY;
  if (dedicated && keyMode(dedicated) === target) return dedicated;

  const generic = process.env.STRIPE_SECRET_KEY;
  if (generic && keyMode(generic) === target) return generic;

  const fromFile =
    target === 'test'
      ? readKeyFromFile(resolve(process.cwd(), '.env'))
      : readKeyFromFile(resolve(process.cwd(), '.env.local'));
  if (fromFile && keyMode(fromFile) === target) return fromFile;

  throw new Error(`Missing Stripe ${target} secret key.`);
}

const env = process.argv.includes('--env=live') ? 'live' : 'test';
const dryRun = !process.argv.includes('--execute');

const stripeKey = resolveStripeKey(env);
const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' });

const PRODUCTS_TO_ARCHIVE = [
  { internal_key: 'ra_pro_audit_ready_small', display_name: 'Audit Ready — Small' },
  { internal_key: 'ra_pro_audit_ready_standard', display_name: 'Audit Ready — Standard' },
];

async function archiveProduct(internalKey: string, displayName: string): Promise<void> {
  console.log(`\n--- Archiving ${displayName} (internal_key=${internalKey}) ---`);

  const search = await stripe.products.search({
    query: `metadata['internal_key']:'${internalKey}'`,
    limit: 5,
  });

  if (search.data.length === 0) {
    console.log(`  (no product found — nothing to archive)`);
    return;
  }

  for (const product of search.data) {
    console.log(`  Product: ${product.id} (active=${product.active})`);

    // Archive all prices under this product first (Stripe requires prices archived before product)
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
    for (const price of prices.data) {
      if (dryRun) {
        console.log(`    [dry-run] Would archive price: ${price.id} (${price.nickname ?? price.metadata?.internal_price_key ?? 'unnamed'})`);
      } else {
        await stripe.prices.update(price.id, { active: false });
        console.log(`    ✓ Archived price: ${price.id}`);
      }
    }

    // Now archive the product itself
    if (product.active) {
      if (dryRun) {
        console.log(`  [dry-run] Would archive product: ${product.id}`);
      } else {
        await stripe.products.update(product.id, { active: false });
        console.log(`  ✓ Archived product: ${product.id}`);
      }
    } else {
      console.log(`  (product already inactive)`);
    }
  }
}

async function main() {
  console.log(`=== Track 4 — Archive Audit Ready Small + Standard ===`);
  console.log(`Environment: ${env.toUpperCase()}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);

  const balance = await stripe.balance.retrieve();
  console.log(`Stripe balance reachable (livemode=${balance.livemode})`);

  for (const p of PRODUCTS_TO_ARCHIVE) {
    await archiveProduct(p.internal_key, p.display_name);
  }

  console.log('\n=== Done ===');
  if (dryRun) {
    console.log('This was a DRY RUN. Re-run with --execute to apply changes.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
