#!/usr/bin/env node
/**
 * Migration lineage mapping math and uniqueness checks.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const MIGRATIONS_DIR = path.join(ROOT, 'supabase', 'migrations');
const PROD_JSON = path.join(ROOT, 'docs', 'migration-remediation', 'evidence', 'production-migrations.json');

function parseLocal(filename) {
  const m = filename.match(/^(\d{8,14})[_-](.+)\.sql$/);
  if (!m) return { version: filename.replace(/\.sql$/, ''), name: filename.replace(/\.sql$/, ''), filename, irregular: true };
  return { version: m[1], name: m[2], filename, irregular: false };
}

function main() {
  const prod = JSON.parse(fs.readFileSync(PROD_JSON, 'utf8'));
  const localFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const local = localFiles.map((f) => parseLocal(f));

  const prodByName = new Map();
  for (const m of prod) {
    const key = m.name.toLowerCase();
    if (!prodByName.has(key)) prodByName.set(key, []);
    prodByName.get(key).push(m);
  }
  const localByName = new Map();
  for (const m of local) {
    const key = m.name.toLowerCase();
    if (!localByName.has(key)) localByName.set(key, []);
    localByName.get(key).push(m);
  }

  const localOnly = [];
  const prodOnly = [];
  const semanticPairs = [];
  const exactPairs = [];

  for (const lm of local) {
    const hits = prodByName.get(lm.name.toLowerCase()) || [];
    if (hits.length === 0) localOnly.push(lm);
    else if (hits.some((p) => p.version === lm.version)) exactPairs.push({ local: lm, prod: hits.find((p) => p.version === lm.version) });
    else semanticPairs.push({ local: lm, prod: hits[0] });
  }
  for (const pm of prod) {
    if (!localByName.has(pm.name.toLowerCase())) prodOnly.push(pm);
  }

  const prodVersions = prod.map((p) => p.version);
  const dupProd = prodVersions.filter((v, i) => prodVersions.indexOf(v) !== i);

  const report = {
    counts: {
      local: local.length,
      production: prod.length,
      localOnly: localOnly.length,
      prodOnly: prodOnly.length,
      semanticDrift: semanticPairs.length,
      exactVersionMatch: exactPairs.length,
      localPrePhase1: local.filter((m) => m.version < '20260701043602').length,
    },
    productionFirst: prod[0],
    productionSecond: prod[1],
    productionLast: prod[prod.length - 1],
    duplicateProductionVersions: [...new Set(dupProd)],
    phase1ProdOnly: prodOnly.filter((p) => p.name.startsWith('phase1_')),
    localOnlyPrePhase1: localOnly.filter((m) => m.version < '20260701043602').map((m) => m.filename),
    semanticDriftSample: semanticPairs.slice(0, 15),
    mathCheck: {
      localSum: semanticPairs.length + localOnly.length,
      prodSum: semanticPairs.length + prodOnly.length,
    },
  };

  const outPath = path.join(ROOT, 'docs', 'migration-remediation', 'migration-mapping.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: report.duplicateProductionVersions.length === 0 && report.mathCheck.localSum === local.length, report }, null, 2));
}

main();
