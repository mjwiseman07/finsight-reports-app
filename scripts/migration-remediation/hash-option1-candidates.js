#!/usr/bin/env node
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '../..');

function hashFile(rel) {
  const p = path.join(root, rel);
  const buf = fs.readFileSync(p);
  const t = buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lf = Buffer.from(t, 'utf8');
  return {
    path: rel,
    bytes: lf.length,
    sha256: crypto.createHash('sha256').update(lf).digest('hex'),
    md5: crypto.createHash('md5').update(lf).digest('hex'),
    blob: execSync(`git hash-object "${rel}"`, { cwd: root }).toString().trim(),
    hasBegin: /^\s*BEGIN\s*;/m.test(t),
    hasCommit: /\bCOMMIT\s*;/i.test(t),
    hasSelectGuard: /FROM\s+public\.firm_clients/i.test(t),
    hasInsertSelect: /INSERT\s+INTO[\s\S]*?\bSELECT\b/i.test(t),
    hasValuesLiteralInsert: /INSERT\s+INTO[\s\S]*?\bVALUES\s*\(/i.test(t) && !/INSERT\s+INTO[\s\S]*?\bSELECT\b/i.test(t),
    hasOnConflict: /ON\s+CONFLICT/i.test(t),
    hasRaise: /RAISE\s+EXCEPTION/i.test(t),
    hasPilotInsert: /INSERT\s+INTO[\s\S]*pilot_slots/i.test(t),
    hasCreateTable: /CREATE\s+TABLE/i.test(t),
    hasRls: /ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(t),
    hasPolicy: /CREATE\s+POLICY/i.test(t),
    hasUniqueGrantIndex: /accounting_connections_one_connected_grant/i.test(t),
    hasLockTable: /LOCK\s+TABLE/i.test(t),
    hasUpdateAccounting: /UPDATE\s+(?:public\.)?accounting_connections/i.test(t),
    fixtureUuid: /71111111-1111-4111-8111-111111111111/i.test(t),
  };
}

const files = [
  'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2000_d6_2a_test_client_activation.sql',
  'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2200_d6_2b_mfg_activation.sql',
  'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2300_d6_2c_retail_activation.sql',
  'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2400_d6_2d_ps_activation.sql',
  'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260708120000_tcp1_w1_solo_bk_pilot_slots.sql',
  'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260814221500_accounting_canonical_connected_grant.sql',
  'supabase/migrations-draft/20260701043599_foundations_baseline.sql',
];

for (const f of files) {
  console.log(JSON.stringify(hashFile(f)));
}
