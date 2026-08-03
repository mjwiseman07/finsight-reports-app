/**
 * Track 4 — Review Assist Pro SKU Seed
 *
 * Creates the standalone Review Assist Pro product + 4 prices (std_mo, std_yr, pilot_mo, pilot_yr).
 * IDEMPOTENT: safe to re-run. Uses stripe.products.search by metadata.internal_key.
 *
 * Usage:
 *   npx tsx scripts/stripe/seed-review-assist-pro.ts --env=test --dry-run
 *   npx tsx scripts/stripe/seed-review-assist-pro.ts --env=test --execute
 *   npx tsx scripts/stripe/seed-review-assist-pro.ts --env=live --dry-run
 *   npx tsx scripts/stripe/seed-review-assist-pro.ts --env=live --execute
 */

import Stripe from 'stripe';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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
  if (dedicated) {
    const mode = keyMode(dedicated);
    if (mode !== target) {
      throw new Error(
        `STRIPE_${target.toUpperCase()}_SECRET_KEY is not a ${target} key (got ${mode})`,
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
const dryRun = !process.argv.includes('--execute');

const stripeKey = resolveStripeKey(env);
const stripe = new Stripe(stripeKey, { apiVersion: '2026-04-22.dahlia' });

interface PriceDef {
  lookup_key: string;
  nickname: string;
  unit_amount: number;
  recurring: { interval: 'month' | 'year' };
  metadata: Record<string, string>;
}

const RA_PRO_PRICES: PriceDef[] = [
  {
    lookup_key: 'review_assist_pro_std_mo',
    nickname: 'Review Assist Pro — Standard Monthly',
    unit_amount: 19900,
    recurring: { interval: 'month' },
    metadata: {
      tier: 'review_assist_pro',
      rate_plan: 'std',
      billing_interval: 'month',
    },
  },
  {
    lookup_key: 'review_assist_pro_std_yr',
    nickname: 'Review Assist Pro — Standard Yearly',
    unit_amount: 199000,
    recurring: { interval: 'year' },
    metadata: {
      tier: 'review_assist_pro',
      rate_plan: 'std',
      billing_interval: 'year',
    },
  },
  {
    lookup_key: 'review_assist_pro_pilot_mo',
    nickname: 'Review Assist Pro — Pilot Monthly',
    unit_amount: 13900,
    recurring: { interval: 'month' },
    metadata: {
      tier: 'review_assist_pro',
      rate_plan: 'pilot',
      billing_interval: 'month',
    },
  },
  {
    lookup_key: 'review_assist_pro_pilot_yr',
    nickname: 'Review Assist Pro — Pilot Yearly',
    unit_amount: 139000,
    recurring: { interval: 'year' },
    metadata: {
      tier: 'review_assist_pro',
      rate_plan: 'pilot',
      billing_interval: 'year',
    },
  },
];

const PRODUCT_INTERNAL_KEY = 'review_assist_pro';
const PRODUCT_NAME = 'Review Assist Pro';
const PRODUCT_DESCRIPTION =
  'Advisacor Review Assist Pro. Read-only findings + AI-reasoned matching, patented memory substrate, historical cleanup, multi-client portfolio workspace, firm seats (5), Ask Pulse Command Center, industry-native templates across 15 verticals, evidence-linked JE proposals with assertion coverage. Includes direct QuickBooks write. Base scope: 2 entities, 150 PBC requests. Attach Audit Ready Complex or Multi-entity for larger engagements.';

async function findOrCreateProduct(): Promise<Stripe.Product> {
  const existing = await stripe.products.search({
    query: `metadata['internal_key']:'${PRODUCT_INTERNAL_KEY}' AND active:'true'`,
    limit: 5,
  });

  if (existing.data.length > 0) {
    console.log(`✓ Product exists: ${existing.data[0].id} (${existing.data[0].name})`);
    return existing.data[0];
  }

  if (dryRun) {
    console.log(`[dry-run] Would create product: ${PRODUCT_NAME}`);
    return {
      id: 'prod_DRY_RUN_placeholder',
      name: PRODUCT_NAME,
    } as Stripe.Product;
  }

  const created = await stripe.products.create({
    name: PRODUCT_NAME,
    description: PRODUCT_DESCRIPTION,
    active: true,
    metadata: {
      internal_key: PRODUCT_INTERNAL_KEY,
      tier: 'review_assist_pro',
      subscription_entity: 'company',
      launch_phase: 'track_4',
    },
  });
  console.log(`✓ Created product: ${created.id}`);
  return created;
}

async function findOrCreatePrice(product: Stripe.Product, priceDef: PriceDef): Promise<void> {
  const existing = await stripe.prices.list({
    lookup_keys: [priceDef.lookup_key],
    active: true,
    limit: 5,
  });

  if (existing.data.length > 0) {
    console.log(`  ✓ Price exists: ${existing.data[0].id} (${priceDef.lookup_key})`);
    return;
  }

  if (dryRun) {
    console.log(`  [dry-run] Would create price: ${priceDef.lookup_key} @ $${priceDef.unit_amount / 100}/${priceDef.recurring.interval}`);
    return;
  }

  const created = await stripe.prices.create({
    product: product.id,
    lookup_key: priceDef.lookup_key,
    nickname: priceDef.nickname,
    unit_amount: priceDef.unit_amount,
    currency: 'usd',
    recurring: priceDef.recurring,
    metadata: priceDef.metadata,
  });
  console.log(`  ✓ Created price: ${created.id} (${priceDef.lookup_key})`);
}

async function main() {
  console.log(`=== Track 4 — Review Assist Pro Seed ===`);
  console.log(`Environment: ${env.toUpperCase()}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);
  console.log('');

  const balance = await stripe.balance.retrieve();
  console.log(`Stripe balance reachable (livemode=${balance.livemode})`);
  console.log('');

  const product = await findOrCreateProduct();
  console.log('');

  for (const priceDef of RA_PRO_PRICES) {
    await findOrCreatePrice(product, priceDef);
  }

  console.log('');
  console.log(`=== Done ===`);
  if (dryRun) {
    console.log('This was a DRY RUN. Re-run with --execute to apply changes.');
  }

  // Write SKU map artifact
  const outputDir = resolve(process.cwd(), 'docs/stripe');
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });
  const outputPath = resolve(outputDir, `track-4-ra-pro-sku-map-${env}.md`);
  const content = [
    `# Track 4 — Review Assist Pro SKU Map (${env.toUpperCase()})`,
    ``,
    `Generated: ${new Date().toISOString()}`,
    `Product internal_key: \`${PRODUCT_INTERNAL_KEY}\``,
    `Product ID: \`${product.id}\``,
    ``,
    `## Prices`,
    ``,
    `| Lookup Key | Amount | Interval | Nickname |`,
    `|---|---|---|---|`,
    ...RA_PRO_PRICES.map(
      (p) =>
        `| \`${p.lookup_key}\` | $${(p.unit_amount / 100).toFixed(2)} | ${p.recurring.interval} | ${p.nickname} |`,
    ),
    ``,
  ].join('\n');
  writeFileSync(outputPath, content);
  console.log(`Wrote SKU map: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
