#!/usr/bin/env node
/**
 * Read-only schema inventory helper for remediation sign-off.
 * Run after `npx supabase login` with DATABASE_URL or --db-url set.
 *
 * Does NOT write to the database. Queries information_schema only.
 *
 * Usage:
 *   node scripts/migration-remediation/schema-inventory.js --tables firms,companies,subscriptions
 *   DATABASE_URL=<readonly-connection-string> node scripts/migration-remediation/schema-inventory.js
 */
const { Client } = require('pg');

const DEFAULT_TABLES = [
  'firms',
  'firm_memberships',
  'firm_clients',
  'companies',
  'company_roles',
  'company_users',
  'subscriptions',
  'subscription_items',
  'subscription_seats',
  'entitlements',
  'stripe_webhook_events',
  'users',
  'ledger_events',
  'ledger_chain_head',
  'journal_entry_executions',
];

function parseArgs(argv) {
  const tablesIdx = argv.indexOf('--tables');
  const tables =
    tablesIdx >= 0 && argv[tablesIdx + 1]
      ? argv[tablesIdx + 1].split(',').map((t) => t.trim()).filter(Boolean)
      : DEFAULT_TABLES;
  const urlIdx = argv.indexOf('--db-url');
  const dbUrl =
    (urlIdx >= 0 && argv[urlIdx + 1]) || process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  return { tables, dbUrl };
}

async function main() {
  const { tables, dbUrl } = parseArgs(process.argv.slice(2));
  if (!dbUrl) {
    console.error('Missing DATABASE_URL / SUPABASE_DB_URL or --db-url');
    process.exit(2);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const report = { tables: {}, functions: [], extensions: [] };

  for (const table of tables) {
    const cols = await client.query(
      `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table],
    );
    const exists = cols.rows.length > 0;
    report.tables[table] = {
      exists,
      columns: cols.rows.map((r) => ({
        name: r.column_name,
        type: r.data_type,
        nullable: r.is_nullable === 'YES',
        default: r.column_default,
      })),
    };
  }

  const fn = await client.query(
    `SELECT p.proname AS name,
            pg_get_function_identity_arguments(p.oid) AS args,
            p.prosecdef AS security_definer
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN (
         'publish_ledger_event',
         'persist_journal_entry_execution_reservation',
         'transition_journal_entry_execution'
       )
     ORDER BY p.proname`,
  );
  report.functions = fn.rows;

  const ext = await client.query(
    `SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto', 'vector') ORDER BY extname`,
  );
  report.extensions = ext.rows.map((r) => r.extname);

  await client.end();
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
