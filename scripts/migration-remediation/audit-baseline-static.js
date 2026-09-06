#!/usr/bin/env node
/**
 * Static safety scan for draft foundations baseline migration.
 * Read-only analysis — does not connect to any database.
 */
const fs = require('fs');
const path = require('path');

const BASELINE = path.join(
  __dirname,
  '..',
  '..',
  'supabase',
  'migrations-draft',
  '20260701043599_foundations_baseline.sql',
);

const ALLOWLIST_REFERENCE_INSERTS = [
  'company_roles', // canonical role catalog
];

function scan(sql) {
  const findings = [];
  const lines = sql.split(/\r?\n/);

  const patterns = [
    { id: 'drop_table', severity: 'error', re: /\bdrop\s+table\b/i, msg: 'DROP TABLE' },
    { id: 'drop_schema', severity: 'error', re: /\bdrop\s+schema\b/i, msg: 'DROP SCHEMA' },
    { id: 'truncate', severity: 'error', re: /\btruncate\b/i, msg: 'TRUNCATE' },
    { id: 'delete_from', severity: 'warn', re: /\bdelete\s+from\b/i, msg: 'DELETE FROM' },
    { id: 'update_set', severity: 'warn', re: /\bupdate\s+public\./i, msg: 'UPDATE on public table' },
    { id: 'insert_into', severity: 'info', re: /\binsert\s+into\b/i, msg: 'INSERT INTO' },
    { id: 'security_definer', severity: 'info', re: /\bsecurity\s+definer\b/i, msg: 'SECURITY DEFINER' },
    { id: 'grant_public', severity: 'warn', re: /\bgrant\b.+\bto\s+public\b/i, msg: 'GRANT TO PUBLIC' },
    { id: 'grant_anon', severity: 'info', re: /\bgrant\b.+\bto\s+anon\b/i, msg: 'GRANT TO anon' },
    { id: 'storage_ref', severity: 'warn', re: /\bstorage\./i, msg: 'storage schema reference' },
    { id: 'vault_ref', severity: 'warn', re: /\bvault\./i, msg: 'vault reference' },
    { id: 'nested_begin', severity: 'warn', re: /^\s*begin\s*;/i, msg: 'nested BEGIN' },
    { id: 'nested_commit', severity: 'warn', re: /^\s*commit\s*;/i, msg: 'nested COMMIT' },
    { id: 'create_extension', severity: 'info', re: /create\s+extension\b/i, msg: 'CREATE EXTENSION' },
    { id: 'rls_disable', severity: 'error', re: /disable\s+row\s+level\s+security/i, msg: 'DISABLE RLS' },
    { id: 'no_rls_after_create', severity: 'info', re: /create\s+table/i, msg: 'CREATE TABLE (check RLS follows)' },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of patterns) {
      if (p.re.test(line)) {
        findings.push({
          severity: p.severity,
          rule: p.id,
          line: i + 1,
          text: line.trim().slice(0, 160),
          message: p.msg,
        });
      }
    }
  }

  const createTables = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi)].map(
    (m) => m[1].toLowerCase(),
  );
  const rlsTables = [...sql.matchAll(/alter\s+table\s+(?:public\.)?(\w+)\s+enable\s+row\s+level\s+security/gi)].map(
    (m) => m[1].toLowerCase(),
  );
  const missingRls = createTables.filter((t) => !rlsTables.includes(t));

  const extensions = [...sql.matchAll(/create\s+extension\s+if\s+not\s+exists\s+(\w+)/gi)].map((m) => m[1]);
  const extCounts = extensions.reduce((acc, e) => {
    acc[e] = (acc[e] || 0) + 1;
    return acc;
  }, {});

  const insertTables = [...sql.matchAll(/insert\s+into\s+(?:public\.)?(\w+)/gi)].map((m) => m[1].toLowerCase());
  const disallowedInserts = insertTables.filter((t) => !ALLOWLIST_REFERENCE_INSERTS.includes(t));

  const duplicateCreateTable = createTables.filter((t, i) => createTables.indexOf(t) !== i);

  return {
    bytes: Buffer.byteLength(sql),
    lineCount: lines.length,
    createTableCount: createTables.length,
    rlsEnableCount: rlsTables.length,
    tablesMissingRls: [...new Set(missingRls)],
    extensionDuplicates: Object.fromEntries(Object.entries(extCounts).filter(([, c]) => c > 1)),
    duplicateCreateTable: [...new Set(duplicateCreateTable)],
    disallowedInsertTargets: [...new Set(disallowedInserts)],
    findingsBySeverity: {
      error: findings.filter((f) => f.severity === 'error'),
      warn: findings.filter((f) => f.severity === 'warn'),
      info: findings.filter((f) => f.severity === 'info').length,
    },
    findings: findings.filter((f) => f.severity !== 'info').slice(0, 80),
  };
}

function main() {
  if (!fs.existsSync(BASELINE)) {
    console.error('Baseline not found:', BASELINE);
    process.exit(2);
  }
  const sql = fs.readFileSync(BASELINE, 'utf8');
  const report = scan(sql);
  const outPath = path.join(__dirname, '..', '..', 'docs', 'migration-remediation', 'baseline-static-scan.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    ok: report.findingsBySeverity.error.length === 0,
    errors: report.findingsBySeverity.error.length,
    warnings: report.findingsBySeverity.warn.length,
    tablesMissingRls: report.tablesMissingRls.length,
    disallowedInsertTargets: report.disallowedInsertTargets,
    outPath,
  }, null, 2));
  process.exit(report.findingsBySeverity.error.length > 0 ? 1 : 0);
}

main();
