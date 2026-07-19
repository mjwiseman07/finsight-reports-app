/**
 * Verifies v1.5 Stripe SKU seed. Fails if any expected SKU/Price is missing.
 *
 * Usage:
 *   npx tsx scripts/stripe/verify-v1.5-seed.ts --env=test
 *   npx tsx scripts/stripe/verify-v1.5-seed.ts --env=live
 */

import Stripe from 'stripe';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AUDIT_READY_SKU_CATALOG } from '../../lib/product-tiers.js';

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
  } catch {
    // optional
  }
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
  } catch {
    // optional
  }
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
  if (dedicated) {
    if (keyMode(dedicated) !== target) {
      throw new Error(
        `STRIPE_${target.toUpperCase()}_SECRET_KEY is not a ${target} key`,
      );
    }
    console.log(`Using STRIPE_${target.toUpperCase()}_SECRET_KEY`);
    return dedicated;
  }

  const generic = process.env.STRIPE_SECRET_KEY;
  if (generic && keyMode(generic) === target) {
    console.log(`Using STRIPE_SECRET_KEY (${target})`);
    return generic;
  }

  const fromFile =
    target === 'test'
      ? readKeyFromFile(resolve(process.cwd(), '.env'))
      : readKeyFromFile(resolve(process.cwd(), '.env.local'));
  if (fromFile && keyMode(fromFile) === target) {
    console.log(
      `Using STRIPE_SECRET_KEY from ${target === 'test' ? '.env' : '.env.local'} (${target})`,
    );
    return fromFile;
  }

  throw new Error(
    `Missing Stripe ${target} secret key. Set STRIPE_${target.toUpperCase()}_SECRET_KEY ` +
      `or a matching STRIPE_SECRET_KEY (sk_${target}_...).`,
  );
}

const env = process.argv.includes('--env=live') ? 'live' : 'test';
const stripeKey = resolveStripeKey(env);
const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' });

const EXPECTED_PRICE_KEYS = [
  'audit_ready_small_monthly_standard',
  'audit_ready_small_yearly_standard',
  'audit_ready_small_monthly_pilot',
  'audit_ready_small_per_engagement_standard',
  'audit_ready_standard_monthly_standard',
  'audit_ready_standard_yearly_standard',
  'audit_ready_standard_monthly_pilot',
  'audit_ready_standard_per_engagement_standard',
  'audit_ready_complex_monthly_standard',
  'audit_ready_complex_yearly_standard',
  'audit_ready_complex_monthly_pilot',
  'audit_ready_complex_per_engagement_standard',
  'audit_ready_multi_entity_monthly_standard',
  'audit_ready_multi_entity_yearly_standard',
  'audit_ready_multi_entity_monthly_pilot',
  'audit_ready_multi_entity_per_engagement_standard',
] as const;

const EXPECTED_AMOUNTS: Record<(typeof EXPECTED_PRICE_KEYS)[number], number> = {
  audit_ready_small_monthly_standard: 9900,
  audit_ready_small_yearly_standard: 99000,
  audit_ready_small_monthly_pilot: 5900,
  audit_ready_small_per_engagement_standard: 29900,
  audit_ready_standard_monthly_standard: 19900,
  audit_ready_standard_yearly_standard: 199000,
  audit_ready_standard_monthly_pilot: 13900,
  audit_ready_standard_per_engagement_standard: 69900,
  audit_ready_complex_monthly_standard: 39900,
  audit_ready_complex_yearly_standard: 399000,
  audit_ready_complex_monthly_pilot: 27900,
  audit_ready_complex_per_engagement_standard: 149900,
  audit_ready_multi_entity_monthly_standard: 69900,
  audit_ready_multi_entity_yearly_standard: 699000,
  audit_ready_multi_entity_monthly_pilot: 48900,
  audit_ready_multi_entity_per_engagement_standard: 249900,
};

async function findProductByInternalKey(internalKey: string): Promise<Stripe.Product | null> {
  const search = await stripe.products.search({
    query: `metadata['internal_key']:'${internalKey}'`,
    limit: 1,
  });
  if (search.data.length > 0) return search.data[0];

  for (const active of [false, true] as const) {
    let startingAfter: string | undefined;
    for (let page = 0; page < 20; page++) {
      const listed = await stripe.products.list({
        limit: 100,
        active,
        starting_after: startingAfter,
      });
      const match = listed.data.find((p) => p.metadata?.internal_key === internalKey);
      if (match) return match;
      if (!listed.has_more) break;
      startingAfter = listed.data[listed.data.length - 1]?.id;
    }
  }
  return null;
}

async function findPriceByInternalKey(internalPriceKey: string): Promise<Stripe.Price | null> {
  const search = await stripe.prices.search({
    query: `metadata['internal_price_key']:'${internalPriceKey}'`,
    limit: 1,
  });
  if (search.data.length > 0) return search.data[0];

  let startingAfter: string | undefined;
  for (let page = 0; page < 40; page++) {
    const listed = await stripe.prices.list({ limit: 100, starting_after: startingAfter });
    const match = listed.data.find(
      (p) => p.metadata?.internal_price_key === internalPriceKey,
    );
    if (match) return match;
    if (!listed.has_more) break;
    startingAfter = listed.data[listed.data.length - 1]?.id;
  }
  return null;
}

async function main() {
  console.log(`\n=== V1.5 Stripe SKU Verify (${env}) ===\n`);

  const catalogKeys = Object.keys(AUDIT_READY_SKU_CATALOG);
  if (catalogKeys.length !== 4) {
    throw new Error(`Expected 4 Audit Ready catalog entries, got ${catalogKeys.length}`);
  }

  for (const productKey of catalogKeys) {
    const product = await findProductByInternalKey(productKey);
    if (!product) {
      throw new Error(`MISSING PRODUCT: ${productKey}`);
    }
    if (product.active !== false) {
      throw new Error(
        `PRODUCT NOT INACTIVE: ${productKey} (${product.id}) active=${product.active}`,
      );
    }
    console.log(`  OK product: ${productKey} → ${product.id} (active=false)`);
  }

  const failures: string[] = [];
  for (const key of EXPECTED_PRICE_KEYS) {
    const price = await findPriceByInternalKey(key);
    if (!price) {
      failures.push(`MISSING PRICE: ${key}`);
      continue;
    }
    const expected = EXPECTED_AMOUNTS[key];
    if (price.unit_amount !== expected) {
      failures.push(
        `AMOUNT MISMATCH: ${key} existing=${price.unit_amount} expected=${expected}`,
      );
      continue;
    }
    console.log(`  OK: ${key} → ${price.id} ($${(price.unit_amount! / 100).toFixed(2)})`);
  }

  if (failures.length > 0) {
    console.error('\nVERIFICATION FAILED:');
    failures.forEach((f) => console.error(`  ${f}`));
    process.exit(1);
  }
  console.log('\n[PASS] All 16 v1.5 SKUs verified.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
