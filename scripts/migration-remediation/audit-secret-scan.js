#!/usr/bin/env node
/**
 * Secret and credential pattern scan for migration remediation package paths.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SCAN_DIRS = [
  'docs/migration-remediation',
  'scripts/migration-remediation',
  'supabase/migrations-draft',
];

const PATTERNS = [
  { id: 'postgres_url', re: /postgres(ql)?:\/\/[^\s'"]+/i },
  { id: 'supabase_key', re: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\./ },
  { id: 'password_assign', re: /password\s*=\s*['"][^'"]+['"]/i },
  { id: 'service_role', re: /service_role['"]?\s*:\s*['"][^'"]+['"]/i },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function main() {
  const hits = [];
  for (const rel of SCAN_DIRS) {
    const abs = path.join(ROOT, rel);
    for (const file of walk(abs)) {
      const text = fs.readFileSync(file, 'utf8');
      const lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        for (const p of PATTERNS) {
          if (p.re.test(lines[i])) {
            hits.push({ file: path.relative(ROOT, file), line: i + 1, rule: p.id });
          }
        }
      }
    }
  }
  const out = { ok: hits.length === 0, hitCount: hits.length, hits };
  const outPath = path.join(ROOT, 'docs', 'migration-remediation', 'secret-scan.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ ok: out.ok, hitCount: out.hitCount }, null, 2));
  process.exit(out.ok ? 0 : 1);
}

main();
