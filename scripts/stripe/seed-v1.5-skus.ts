/**
 * V1.5 Stripe SKU Seed
 *
 * Seeds Audit Ready add-on SKUs (4 tiers × 4 prices = 16 SKUs).
 * IDEMPOTENT: safe to re-run. Uses stripe.products.search by metadata.internal_key.
 *
 * Usage:
 *   npx tsx scripts/stripe/seed-v1.5-skus.ts --env=test --dry-run
 *   npx tsx scripts/stripe/seed-v1.5-skus.ts --env=test --execute
 *   npx tsx scripts/stripe/seed-v1.5-skus.ts --env=live --dry-run
 *   npx tsx scripts/stripe/seed-v1.5-skus.ts --env=live --execute
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
  // Load without clobbering existing process.env; .env.local first so local wins for generic key.
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

  // Repo convention: .env holds sandbox/test; .env.local holds live after W2.5 cutover.
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

interface SkuDefinition {
  internal_key: string;
  product_name: string;
  product_description: string;
  active: boolean;
  prices: Array<{
    internal_price_key: string;
    unit_amount: number;
    currency: 'usd';
    recurring?: { interval: 'month' | 'year' };
    metadata: Record<string, string>;
  }>;
  metadata: Record<string, string>;
}

const V1_5_SKUS: SkuDefinition[] = [
  {
    internal_key: 'ra_pro_audit_ready_small',
    product_name: 'Audit Ready — Small',
    product_description:
      'Audit Ready add-on for Review Assist Pro. Small tier: 1 entity, up to 50 PBC requests per engagement. ' +
      'Includes PBC ingest, four canonical reconciliations, engagement-scoped auditor portal, ' +
      'historical inquiry-response drafting.',
    active: false,
    metadata: {
      internal_key: 'ra_pro_audit_ready_small',
      tier: 'audit_ready',
      audit_ready_size: 'small',
      max_entities: '1',
      max_pbc_requests: '50',
      max_auditor_users: '3',
      attaches_to: 'review_assist_pro',
      launch_phase: 'v1.5_phase_3',
    },
    prices: [
      {
        internal_price_key: 'audit_ready_small_monthly_standard',
        unit_amount: 9900,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: {
          billing_mode: 'monthly',
          plan_variant: 'standard',
          audit_ready_size: 'small',
        },
      },
      {
        internal_price_key: 'audit_ready_small_yearly_standard',
        unit_amount: 99000,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: {
          billing_mode: 'monthly',
          plan_variant: 'standard',
          plan_period: 'yearly',
          audit_ready_size: 'small',
        },
      },
      {
        internal_price_key: 'audit_ready_small_monthly_pilot',
        unit_amount: 5900,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: {
          billing_mode: 'monthly',
          plan_variant: 'pilot',
          audit_ready_size: 'small',
        },
      },
      {
        internal_price_key: 'audit_ready_small_per_engagement_standard',
        unit_amount: 29900,
        currency: 'usd',
        metadata: {
          billing_mode: 'per_engagement',
          plan_variant: 'standard',
          audit_ready_size: 'small',
        },
      },
    ],
  },
  {
    internal_key: 'ra_pro_audit_ready_standard',
    product_name: 'Audit Ready — Standard',
    product_description:
      'Audit Ready add-on for Review Assist Pro. Standard tier: 1-2 entities, 50-150 PBC requests per engagement.',
    active: false,
    metadata: {
      internal_key: 'ra_pro_audit_ready_standard',
      tier: 'audit_ready',
      audit_ready_size: 'standard',
      max_entities: '2',
      max_pbc_requests: '150',
      max_auditor_users: '5',
      attaches_to: 'review_assist_pro',
      launch_phase: 'v1.5_phase_3',
    },
    prices: [
      {
        internal_price_key: 'audit_ready_standard_monthly_standard',
        unit_amount: 19900,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { billing_mode: 'monthly', plan_variant: 'standard', audit_ready_size: 'standard' },
      },
      {
        internal_price_key: 'audit_ready_standard_yearly_standard',
        unit_amount: 199000,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: {
          billing_mode: 'monthly',
          plan_variant: 'standard',
          plan_period: 'yearly',
          audit_ready_size: 'standard',
        },
      },
      {
        internal_price_key: 'audit_ready_standard_monthly_pilot',
        unit_amount: 13900,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { billing_mode: 'monthly', plan_variant: 'pilot', audit_ready_size: 'standard' },
      },
      {
        internal_price_key: 'audit_ready_standard_per_engagement_standard',
        unit_amount: 69900,
        currency: 'usd',
        metadata: {
          billing_mode: 'per_engagement',
          plan_variant: 'standard',
          audit_ready_size: 'standard',
        },
      },
    ],
  },
  {
    internal_key: 'ra_pro_audit_ready_complex',
    product_name: 'Audit Ready — Complex',
    product_description:
      'Audit Ready add-on for Review Assist Pro. Complex tier: 2-5 entities, 150-400 PBC requests per engagement.',
    active: false,
    metadata: {
      internal_key: 'ra_pro_audit_ready_complex',
      tier: 'audit_ready',
      audit_ready_size: 'complex',
      max_entities: '5',
      max_pbc_requests: '400',
      max_auditor_users: '10',
      attaches_to: 'review_assist_pro',
      launch_phase: 'v1.5_phase_3',
    },
    prices: [
      {
        internal_price_key: 'audit_ready_complex_monthly_standard',
        unit_amount: 39900,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { billing_mode: 'monthly', plan_variant: 'standard', audit_ready_size: 'complex' },
      },
      {
        internal_price_key: 'audit_ready_complex_yearly_standard',
        unit_amount: 399000,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: {
          billing_mode: 'monthly',
          plan_variant: 'standard',
          plan_period: 'yearly',
          audit_ready_size: 'complex',
        },
      },
      {
        internal_price_key: 'audit_ready_complex_monthly_pilot',
        unit_amount: 27900,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { billing_mode: 'monthly', plan_variant: 'pilot', audit_ready_size: 'complex' },
      },
      {
        internal_price_key: 'audit_ready_complex_per_engagement_standard',
        unit_amount: 149900,
        currency: 'usd',
        metadata: {
          billing_mode: 'per_engagement',
          plan_variant: 'standard',
          audit_ready_size: 'complex',
        },
      },
    ],
  },
  {
    internal_key: 'ra_pro_audit_ready_multi_entity',
    product_name: 'Audit Ready — Multi-entity',
    product_description:
      'Audit Ready add-on for Review Assist Pro. Multi-entity tier: 5+ entities OR any tier with >400 PBC requests per engagement.',
    active: false,
    metadata: {
      internal_key: 'ra_pro_audit_ready_multi_entity',
      tier: 'audit_ready',
      audit_ready_size: 'multi_entity',
      max_entities: 'unlimited',
      max_pbc_requests: 'unlimited',
      max_auditor_users: '25',
      attaches_to: 'review_assist_pro',
      launch_phase: 'v1.5_phase_3',
    },
    prices: [
      {
        internal_price_key: 'audit_ready_multi_entity_monthly_standard',
        unit_amount: 69900,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: {
          billing_mode: 'monthly',
          plan_variant: 'standard',
          audit_ready_size: 'multi_entity',
        },
      },
      {
        internal_price_key: 'audit_ready_multi_entity_yearly_standard',
        unit_amount: 699000,
        currency: 'usd',
        recurring: { interval: 'year' },
        metadata: {
          billing_mode: 'monthly',
          plan_variant: 'standard',
          plan_period: 'yearly',
          audit_ready_size: 'multi_entity',
        },
      },
      {
        internal_price_key: 'audit_ready_multi_entity_monthly_pilot',
        unit_amount: 48900,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: {
          billing_mode: 'monthly',
          plan_variant: 'pilot',
          audit_ready_size: 'multi_entity',
        },
      },
      {
        internal_price_key: 'audit_ready_multi_entity_per_engagement_standard',
        unit_amount: 249900,
        currency: 'usd',
        metadata: {
          billing_mode: 'per_engagement',
          plan_variant: 'standard',
          audit_ready_size: 'multi_entity',
        },
      },
    ],
  },
];

async function findProductByInternalKey(internalKey: string): Promise<Stripe.Product | null> {
  const search = await stripe.products.search({
    query: `metadata['internal_key']:'${internalKey}'`,
    limit: 1,
  });
  if (search.data.length > 0) return search.data[0];

  // Search index is eventually consistent. Default list() is active-only;
  // Audit Ready products are seeded inactive, so scan both.
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
    const listed = await stripe.prices.list({
      limit: 100,
      starting_after: startingAfter,
    });
    const match = listed.data.find(
      (p) => p.metadata?.internal_price_key === internalPriceKey,
    );
    if (match) return match;
    if (!listed.has_more) break;
    startingAfter = listed.data[listed.data.length - 1]?.id;
  }
  return null;
}

async function findOrCreateProduct(def: SkuDefinition) {
  const existing = await findProductByInternalKey(def.internal_key);
  if (existing) {
    console.log(`  [FOUND] Product ${existing.id} (${def.internal_key}) active=${existing.active}`);
    return existing;
  }

  if (dryRun) {
    console.log(`  [DRY-RUN] Would CREATE product ${def.internal_key} (active=${def.active})`);
    return { id: 'dry_run_' + def.internal_key } as Stripe.Product;
  }

  const created = await stripe.products.create({
    name: def.product_name,
    description: def.product_description,
    active: def.active,
    metadata: def.metadata,
  });
  console.log(`  [CREATED] Product ${created.id} (${def.internal_key}) active=${created.active}`);
  return created;
}

async function findOrCreatePrice(
  productId: string,
  priceDef: SkuDefinition['prices'][number],
) {
  const existing = await findPriceByInternalKey(priceDef.internal_price_key);
  if (existing) {
    console.log(
      `    [FOUND] Price ${existing.id} (${priceDef.internal_price_key}) = $${((existing.unit_amount ?? 0) / 100).toFixed(2)}`,
    );
    if (existing.unit_amount !== priceDef.unit_amount) {
      console.warn(
        `    [WARN] Price amount mismatch: existing=${existing.unit_amount}, expected=${priceDef.unit_amount}. Stripe prices are immutable — create a new price key to change price.`,
      );
    }
    return existing;
  }

  if (dryRun) {
    console.log(
      `    [DRY-RUN] Would CREATE price ${priceDef.internal_price_key} = $${(priceDef.unit_amount / 100).toFixed(2)}`,
    );
    return { id: 'dry_run_price_' + priceDef.internal_price_key } as Stripe.Price;
  }

  const created = await stripe.prices.create({
    product: productId,
    unit_amount: priceDef.unit_amount,
    currency: priceDef.currency,
    recurring: priceDef.recurring,
    metadata: { ...priceDef.metadata, internal_price_key: priceDef.internal_price_key },
    nickname: priceDef.internal_price_key,
  });
  console.log(
    `    [CREATED] Price ${created.id} (${priceDef.internal_price_key}) = $${(priceDef.unit_amount / 100).toFixed(2)}`,
  );
  return created;
}

function renderIdMapMarkdown(
  idMap: Array<{
    internal_key: string;
    product_id: string;
    prices: Array<{ key: string; id: string; amount: number }>;
  }>,
  mapEnv: string,
) {
  let md = `# V1.5 Stripe SKU Map — ${mapEnv.toUpperCase()}\n\nGenerated: ${new Date().toISOString()}\n\n`;
  for (const item of idMap) {
    md += `## ${item.internal_key}\n\n`;
    md += `- Product ID: \`${item.product_id}\`\n`;
    md += `- Prices:\n`;
    for (const p of item.prices) {
      md += `  - \`${p.key}\`: \`${p.id}\` ($${(p.amount / 100).toFixed(2)})\n`;
    }
    md += `\n`;
  }
  return md;
}

async function main() {
  console.log(`\n=== V1.5 Stripe SKU Seed (${env}) ${dryRun ? '[DRY RUN]' : '[EXECUTING]'} ===\n`);

  const idMap: Array<{
    internal_key: string;
    product_id: string;
    prices: Array<{ key: string; id: string; amount: number }>;
  }> = [];

  for (const def of V1_5_SKUS) {
    console.log(`\nProcessing: ${def.product_name}`);
    const product = await findOrCreateProduct(def);
    const priceIds: Array<{ key: string; id: string; amount: number }> = [];
    for (const priceDef of def.prices) {
      const price = await findOrCreatePrice(product.id, priceDef);
      priceIds.push({
        key: priceDef.internal_price_key,
        id: price.id,
        amount: priceDef.unit_amount,
      });
    }
    idMap.push({
      internal_key: def.internal_key,
      product_id: product.id,
      prices: priceIds,
    });
  }

  const docsDir = resolve(process.cwd(), 'docs/stripe');
  if (!existsSync(docsDir)) mkdirSync(docsDir, { recursive: true });
  const mapPath = `docs/stripe/v1.5-sku-map-${env}.md`;
  writeFileSync(mapPath, renderIdMapMarkdown(idMap, env));
  console.log(`\n[WROTE] ID map to ${mapPath}\n`);
  console.log(`=== Seed complete ${dryRun ? '(dry run)' : ''} ===\n`);
}

main().catch((err) => {
  console.error('SEED FAILED:', err);
  process.exit(1);
});
