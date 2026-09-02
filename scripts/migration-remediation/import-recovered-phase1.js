#!/usr/bin/env node
/**
 * Import recovered phase1 SQL from read-only schema_migrations evidence JSON.
 * Does NOT execute SQL. Writes draft evidence files + provenance manifest.
 *
 * Usage:
 *   node scripts/migration-remediation/import-recovered-phase1.js <path-to-json>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'supabase', 'migrations-draft', 'recovered-production-history');
const MANIFEST = path.join(ROOT, 'docs', 'migration-remediation', 'evidence', 'phase1', 'provenance-manifest.json');

const EXPECTED = [
  { version: '20260701043602', name: 'phase1_subscriptions_core', dbMd5: '5992414bde50c4562925b60361721b44' },
  { version: '20260701043707', name: 'phase1_subscription_seats_and_entitlements', dbMd5: '60a5d243a32814c9975bd0e1b90e6cee' },
  { version: '20260701043911', name: 'phase1_backward_compat_view', dbMd5: '6d7ed2de4528c1380dcb0221fc14af39' },
  { version: '20260701043931', name: 'phase1_entitlement_rls_policies', dbMd5: 'd13c0dc54794fe2f0d47dfa43c86ad3e' },
];

function md5Utf8(text) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex');
}

function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.error('Usage: import-recovered-phase1.js <path-to-json>');
    process.exit(2);
  }
  const payload = JSON.parse(fs.readFileSync(path.resolve(jsonPath), 'utf8'));
  if (!Array.isArray(payload.migrations) || payload.migrations.length !== 4) {
    throw new Error(`Expected exactly 4 migrations, got ${payload.migrations?.length}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

  const entries = [];
  for (const exp of EXPECTED) {
    const row = payload.migrations.find((m) => m.version === exp.version && m.name === exp.name);
    if (!row) throw new Error(`Missing migration ${exp.version}_${exp.name}`);
    const sql = row.sql;
    const localMd5 = md5Utf8(sql);
    if (localMd5 !== exp.dbMd5) {
      throw new Error(`MD5 mismatch for ${exp.version}: local=${localMd5} expected=${exp.dbMd5}`);
    }
    const filename = `${exp.version}_${exp.name}.sql`;
    const outFile = path.join(OUT_DIR, filename);
    const header = `-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY
-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr
-- SOURCE_TABLE: supabase_migrations.schema_migrations
-- VERSION: ${exp.version}
-- NAME: ${exp.name}
-- DATABASE_MD5_UTF8: ${exp.dbMd5}
-- WARNING: NOT AN APPROVED MIGRATION — evidence only. Do not place in supabase/migrations/ without sign-off.
-- CONTAINS_DATA_ROWS: false

`;
    fs.writeFileSync(outFile, header + sql, 'utf8');
    entries.push({
      version: exp.version,
      name: exp.name,
      filename,
      database_md5_utf8: exp.dbMd5,
      local_file_md5_utf8: md5Utf8(header + sql),
      sql_body_md5_utf8: localMd5,
      statement_count: 1,
      byte_length: Buffer.byteLength(sql, 'utf8'),
      contains_data_rows: false,
    });
  }

  const manifest = {
    warning: 'These files are recovered production migration evidence — NOT approved executable migrations.',
    source_project_ref: payload.source_project_ref || 'jzmdgwwiestcmmeuhhkr',
    source_table: 'supabase_migrations.schema_migrations',
    retrieval_mode: 'read-only',
    retrieval_date: '2026-09-01',
    contains_data_rows: false,
    contains_credentials: false,
    statement_storage: 'Each production row stores exactly one SQL string in schema_migrations.statements[1]',
    migrations: entries,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ok: true, outDir: OUT_DIR, manifest: MANIFEST, count: entries.length }, null, 2));
}

main();
