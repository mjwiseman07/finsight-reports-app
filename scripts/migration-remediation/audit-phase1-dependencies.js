#!/usr/bin/env node
/**
 * Static dependency analysis for recovered phase1 migrations vs local baseline.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const RECOVERED_DIR = path.join(ROOT, 'supabase', 'migrations-draft', 'recovered-production-history');
const BASELINE = path.join(ROOT, 'supabase', 'migrations-draft', '20260701043599_foundations_baseline.sql');
const MIGRATIONS = path.join(ROOT, 'supabase', 'migrations');

const PHASE1_ORDER = [
  '20260701043602_phase1_subscriptions_core.sql',
  '20260701043707_phase1_subscription_seats_and_entitlements.sql',
  '20260701043911_phase1_backward_compat_view.sql',
  '20260701043931_phase1_entitlement_rls_policies.sql',
];

const FOUNDATION_MAP = {
  firms: '20260530_create_client_briefings.sql',
  firm_memberships: '20260530_create_client_briefings.sql',
  companies: '20260530_create_company_accounts.sql',
  company_users: '20260530_create_company_accounts.sql',
  company_roles: '20260530_create_company_accounts.sql',
  practice_accounts: '20260530_add_account_type_onboarding.sql',
};

function readSql(file) {
  const text = fs.readFileSync(file, 'utf8');
  return text.replace(/^-- PROVENANCE:[\s\S]*?(?=\n\n|\n--)/m, '').replace(/^--.*\n/gm, '');
}

function extractRefs(sql) {
  const tables = new Set();
  const re = /(?:from|join|references|alter\s+table)\s+(?:public\.)?(\w+)/gi;
  let m;
  while ((m = re.exec(sql))) tables.add(m[1].toLowerCase());
  return [...tables];
}

function main() {
  const report = {
    phase1Migrations: [],
    rlsExposureWindow: {
      description:
        'Recovered production history enables RLS only in migration 4. Migrations 1-3 create subscription tables without RLS.',
      tablesExposedWithoutRlsBetweenMigrations: {
        after_migration_1: ['subscriptions', 'subscription_items', 'stripe_webhook_events'],
        after_migration_2: [
          'subscriptions',
          'subscription_items',
          'stripe_webhook_events',
          'subscription_seats',
          'entitlements',
        ],
        rls_enabled_in_migration_4: [
          'subscriptions',
          'subscription_items',
          'subscription_seats',
          'entitlements',
          'stripe_webhook_events',
        ],
      },
      failedReplayRisk:
        'If replay stops after migration 1 (as on deleted preview branch), three public tables exist with RLS disabled.',
    },
    foundationPrerequisites: [],
    seedAssumptions: {
      phase1_sql_contains_insert: false,
      baseline_allowlisted_reference: ['company_roles'],
      backward_compat_view_requires: ['companies.practice_id', 'companies.package_level', 'companies.billing_status'],
    },
  };

  for (const file of PHASE1_ORDER) {
    const full = path.join(RECOVERED_DIR, file);
    const sql = readSql(full);
    const refs = extractRefs(sql);
    const external = refs.filter((t) => !t.startsWith('subscription') && t !== 'entitlements' && t !== 'stripe_webhook_events' && t !== 'company_billing_compat');
    const prereqs = external.map((t) => ({
      object: t,
      baselineSource: FOUNDATION_MAP[t] || (fs.readFileSync(BASELINE, 'utf8').includes(`create table`) ? 'check baseline' : 'UNKNOWN'),
    }));
    report.phase1Migrations.push({
      file,
      externalReferences: external,
      prerequisites: prereqs,
      enablesRls: file.includes('entitlement_rls'),
    });
  }

  for (const [obj, src] of Object.entries(FOUNDATION_MAP)) {
    report.foundationPrerequisites.push({ object: obj, localMigration: src, inBaseline: fs.readFileSync(BASELINE, 'utf8').toLowerCase().includes(`create table if not exists public.${obj}`) || fs.readFileSync(BASELINE, 'utf8').toLowerCase().includes(`create table public.${obj}`) });
  }

  const out = path.join(ROOT, 'docs', 'migration-remediation', 'phase1-dependency-analysis.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, out }, null, 2));
}

main();
