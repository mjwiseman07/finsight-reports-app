#!/usr/bin/env node
/**
 * Third independent source review — Option-2 ESC candidate (read-only).
 * Authority: git cat-file / git show at pinned COMMIT only.
 * Does NOT modify candidate SQL or MANIFEST.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const COMMIT = process.env.ESC_REVIEW_COMMIT || '4888756224129abcdc1729fc772a1300dc1ba074';
const EXPECTED_SEAL = '74d3b7498f4f2327b15c4ea8631c1b0c40b1daf795675f0517a5fb7052f3d3ff';
const EXPECTED_BYTES = 1139927;
const EXPECTED_MODULES = 12;
const OPTION_D_SHA = '9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359';
const DIGEST = '20260906184500_publish_ledger_event_extensions_digest_qualify.sql';
const APP_SLICE_VERSIONS = [
  '20260907010030',
  '20260907010031',
  '20260907010032',
  '20260907010033',
  '20260907010034',
];
const SECURITY_VERSION = '20260907010035';
const FORWARD_VERSION = '20260907010060';

const OUT_JSON = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-source-review-option2-2026-09-06.json'
);
const OUT_AUTO = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-source-review-option2-2026-09-06.auto.md'
);

function gitShow(revPath) {
  return execFileSync('git', ['show', `${COMMIT}:${revPath}`], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  });
}
function gitCatBlob(blobId) {
  return execFileSync('git', ['cat-file', 'blob', blobId], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  });
}
function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
function md5(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}
function lineAt(sql, index) {
  return sql.slice(0, index).split('\n').length;
}

/** Walk SQL skipping comments/strings/dollar-quotes; invoke onExecutable(i, rest). */
function walkExecutable(sql, onTokenStart) {
  let i = 0;
  const n = sql.length;
  while (i < n) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < n - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (sql[i] === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        const tag = m[0];
        i += tag.length;
        const end = sql.indexOf(tag, i);
        i = end < 0 ? n : end + tag.length;
        continue;
      }
    }
    if (sql[i] === "'") {
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (sql[i] === '"') {
      i++;
      while (i < n) {
        if (sql[i] === '"' && sql[i + 1] === '"') {
          i += 2;
          continue;
        }
        if (sql[i] === '"') {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    const prev = i > 0 ? sql[i - 1] : ' ';
    if (!/[A-Za-z0-9_]/.test(prev)) {
      const step = onTokenStart(i, sql.slice(i));
      if (typeof step === 'number' && step > 0) {
        i += step;
        continue;
      }
    }
    i++;
  }
}

function countTxnControls(sql) {
  const c = { BEGIN: 0, COMMIT: 0, ROLLBACK: 0, START: 0, END_TXN: 0, intermediateCommits: [] };
  const positions = [];
  walkExecutable(sql, (i, rest) => {
    const m =
      /^(BEGIN(\s+(WORK|TRANSACTION))?|START\s+TRANSACTION|COMMIT(\s+(WORK|TRANSACTION))?|ROLLBACK(\s+(WORK|TRANSACTION))?|END\s+(WORK|TRANSACTION))\s*;/i.exec(
        rest
      );
    if (!m) return 0;
    const raw = m[0].toUpperCase();
    const kind = raw.startsWith('BEGIN')
      ? 'BEGIN'
      : raw.startsWith('START')
        ? 'START'
        : raw.startsWith('COMMIT')
          ? 'COMMIT'
          : raw.startsWith('ROLLBACK')
            ? 'ROLLBACK'
            : 'END_TXN';
    c[kind === 'START' ? 'START' : kind === 'END_TXN' ? 'END_TXN' : kind]++;
    positions.push({ kind, index: i, line: lineAt(sql, i) });
    return m[0].length;
  });
  // Intermediate COMMIT: any COMMIT that is not the last txn control when BEGIN==1
  const commits = positions.filter((p) => p.kind === 'COMMIT');
  if (commits.length > 1) {
    c.intermediateCommits = commits.slice(0, -1);
  }
  // Also: COMMIT before final if there's content after last COMMIT? tracked via counts
  return { ...c, positions };
}

function approxStatements(sql) {
  let body = '';
  // rough: strip comments/strings/dollar for split — reuse walk to build stripped? simpler:
  body = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
  // remove dollar bodies
  body = body.replace(/\$([A-Za-z_][A-Za-z0-9_]*)?\$[\s\S]*?\$\1\$/g, ' ');
  return body.split(';').map((s) => s.trim()).filter(Boolean).length;
}

function findCreateTables(sql) {
  const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
  const out = [];
  const banned = new Set(['if', 'not', 'exists', 'without', 'only', 'as']);
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi;
  let m;
  while ((m = re.exec(cleaned))) {
    const t = m[1].replace(/^public\./, '');
    if (!banned.has(t.toLowerCase())) out.push({ table: t, index: m.index, line: lineAt(cleaned, m.index) });
  }
  return out;
}

function findEnableRls(sql) {
  const set = new Set();
  const re =
    /ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  let m;
  while ((m = re.exec(sql))) set.add(m[1].replace(/^public\./, ''));
  return set;
}

function findCreateFunctions(sql) {
  const out = [];
  const re =
    /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+((?:public\.)?[a-zA-Z_][\w.]*)\s*\(([^)]*)\)([\s\S]{0,800}?)(?:AS\s|LANGUAGE\s)/gi;
  let m;
  while ((m = re.exec(sql))) {
    const chunk = m[0];
    const name = m[2].replace(/^public\./, '');
    const args = m[3].replace(/\s+/g, ' ').trim();
    const header = m[4] || '';
    const securityDefiner = /SECURITY\s+DEFINER/i.test(header) || /SECURITY\s+DEFINER/i.test(chunk);
    const hasSearchPath = /SET\s+search_path\s*=/i.test(chunk);
    out.push({
      name,
      args,
      index: m.index,
      line: lineAt(sql, m.index),
      securityDefiner,
      hasSearchPathInCreateChunk: hasSearchPath,
    });
  }
  return out;
}

function findRevokeExecute(sql) {
  const out = [];
  const re =
    /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+((?:public\.)?[a-zA-Z_][\w.]*)\s*\(([^)]*)\)\s+FROM\s+(PUBLIC|anon|authenticated)/gi;
  let m;
  while ((m = re.exec(sql))) {
    out.push({
      name: m[1].replace(/^public\./, ''),
      args: m[2].replace(/\s+/g, ' ').trim(),
      role: m[3],
      index: m.index,
      line: lineAt(sql, m.index),
    });
  }
  return out;
}

function findGrantExecute(sql) {
  const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
  const out = [];
  const re =
    /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+((?:public\.)?[a-zA-Z_][\w.]*)\s*\(([^)]*)\)\s+TO\s+(PUBLIC|anon|authenticated)/gi;
  let m;
  while ((m = re.exec(cleaned))) {
    out.push({
      name: m[1].replace(/^public\./, ''),
      role: m[3],
      match: m[0].slice(0, 120),
      line: lineAt(cleaned, m.index),
    });
  }
  return out;
}

function findBroadTableGrants(sql) {
  const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
  const out = [];
  const re =
    /GRANT\s+(ALL|SELECT|INSERT|UPDATE|DELETE|TRUNCATE)[\s\S]{0,80}?ON\s+(TABLE\s+)?((?:public\.)?[a-zA-Z_][\w.]*)\s+TO\s+(PUBLIC|anon|authenticated)/gi;
  let m;
  while ((m = re.exec(cleaned))) {
    out.push({
      priv: m[1],
      table: m[3].replace(/^public\./, ''),
      role: m[4],
      line: lineAt(cleaned, m.index),
    });
  }
  return out;
}

function findExtensions(sql) {
  const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
  const out = [];
  const re = /(CREATE\s+EXTENSION[\s\S]{0,120}?;|ALTER\s+EXTENSION[\s\S]{0,120}?;)/gi;
  let m;
  while ((m = re.exec(cleaned))) {
    out.push({ match: m[0].replace(/\s+/g, ' ').trim(), line: lineAt(cleaned, m.index), index: m.index });
  }
  return out;
}

function extractMarkers(sql, re) {
  const out = [];
  let m;
  const r = new RegExp(re.source, 'g');
  while ((m = r.exec(sql))) out.push(m[1].trim());
  return out;
}

function main() {
  const findings = [];
  const add = (priority, code, module, detail, line) => {
    findings.push({ priority, code, module, detail, line: line || null });
  };

  const head = execFileSync('git', ['rev-parse', COMMIT], { cwd: ROOT }).toString().trim();
  if (head !== COMMIT) add('P0', 'COMMIT_RESOLVE_MISMATCH', 'review', `${head} vs ${COMMIT}`);

  const manifest = JSON.parse(gitShow('supabase/migrations-draft/executable-squash-candidate/MANIFEST.json').toString('utf8'));
  const odBuf = gitShow('docs/migration-remediation/option-d-replay-manifest.json');
  const odSha = sha256(odBuf);
  const od = JSON.parse(odBuf.toString('utf8'));
  const order = od.ordering.dependencyOrder;

  if (manifest.entries.length !== EXPECTED_MODULES) {
    add('P0', 'MODULE_COUNT_MISMATCH', 'package', `${manifest.entries.length} vs ${EXPECTED_MODULES}`);
  }
  if (odSha !== OPTION_D_SHA) add('P0', 'OPTION_D_PIN_MISMATCH', 'option-d', odSha);

  // --- Part A seal ---
  const hashResults = [];
  let totalBytes = 0;
  const sealParts = [];
  const moduleSql = {};
  const moduleByVersion = {};

  for (const e of manifest.entries) {
    const blobBuf = gitCatBlob(e.gitBlobId);
    const showBuf = gitShow(e.path);
    const blobSha = sha256(blobBuf);
    const blobMd5 = md5(blobBuf);
    const recomputedBlobId = execFileSync('git', ['hash-object', '--stdin'], {
      cwd: ROOT,
      input: blobBuf,
    })
      .toString()
      .trim();
    const ok =
      blobSha === e.sha256 &&
      blobMd5 === e.md5 &&
      blobBuf.length === e.utf8LfBytes &&
      sha256(showBuf) === e.sha256 &&
      recomputedBlobId === e.gitBlobId &&
      !blobBuf.includes(0x0d);
    if (!ok) add('P0', 'HASH_MISMATCH', e.name, `sha=${blobSha} bytes=${blobBuf.length}`);
    totalBytes += blobBuf.length;
    sealParts.push(blobSha);
    const sql = blobBuf.toString('utf8');
    moduleSql[e.order] = sql;
    moduleByVersion[e.version] = { ...e, sql };
    const txn = countTxnControls(sql);
    hashResults.push({
      order: e.order,
      version: e.version,
      name: e.name,
      path: e.path,
      gitBlobId: e.gitBlobId,
      sha256: blobSha,
      md5: blobMd5,
      utf8LfBytes: blobBuf.length,
      statementCountApprox: approxStatements(sql),
      txn,
      manifestMatch: ok,
    });
  }

  const seal = sha256(Buffer.from(sealParts.join('\n'), 'utf8'));
  if (seal !== EXPECTED_SEAL || seal !== manifest.packageSha256OfConcatenatedEntryHashes) {
    add('P0', 'PACKAGE_SEAL_MISMATCH', 'package', `expected ${EXPECTED_SEAL} got ${seal}`);
  }
  if (totalBytes !== EXPECTED_BYTES) {
    add('P0', 'PACKAGE_BYTES_MISMATCH', 'package', `expected ${EXPECTED_BYTES} got ${totalBytes}`);
  }

  // Active migrations
  const active = execFileSync('git', ['ls-tree', '-r', '--name-only', COMMIT, 'supabase/migrations'], {
    cwd: ROOT,
  })
    .toString()
    .trim()
    .split('\n');
  if (active.some((f) => f.includes('202609070100'))) {
    add('P0', 'ACTIVE_MIGRATIONS_CONTAIN_ESC', 'supabase/migrations', 'ESC versions leaked');
  }

  // --- Accounting 151 ---
  const d6 = [
    '20260703_2000_d6_2a_test_client_activation.sql',
    '20260703_2200_d6_2b_mfg_activation.sql',
    '20260703_2300_d6_2c_retail_activation.sql',
    '20260703_2400_d6_2d_ps_activation.sql',
  ];
  const tcp1 = '20260708120000_tcp1_w1_solo_bk_pilot_slots.sql';
  const grant = '20260814221500_accounting_canonical_connected_grant.sql';
  const overlays = new Set([...d6, tcp1, grant]);
  const classification = new Map();
  const seenMarkers = new Map();

  function noteMarker(f, ord) {
    if (!seenMarkers.has(f)) seenMarkers.set(f, []);
    if (!seenMarkers.get(f).includes(ord)) seenMarkers.get(f).push(ord);
  }

  for (const [ordStr, sql] of Object.entries(moduleSql)) {
    const ord = Number(ordStr);
    for (const f of extractMarkers(sql, /-- >>> begin ([^\n]+)\n/)) {
      if (f === 'ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY') continue; // not OD
      noteMarker(f, ord);
    }
    for (const f of extractMarkers(sql, /-- >>> guarded ([^\n]+)\n/)) noteMarker(f, ord);
    for (const f of extractMarkers(sql, /-- >>> forward ([^\n]+)\n/)) noteMarker(f, ord);
  }
  // foundations special
  if (moduleSql[2]) {
    if (moduleSql[2].includes('20260701043598_public_users_derived_baseline.sql')) {
      noteMarker('20260701043598_public_users_derived_baseline.sql', 2);
    }
    if (moduleSql[2].includes('20260701043599_foundations_baseline.sql')) {
      noteMarker('20260701043599_foundations_baseline.sql', 2);
    }
  }
  // tcp1/grant in guarded module
  const guardedEntry = manifest.entries.find((e) => e.name.includes('guarded'));
  if (guardedEntry) {
    const gsql = moduleSql[guardedEntry.order];
    if (gsql.includes('tcp1 schema without complimentary seed')) noteMarker(tcp1, guardedEntry.order);
    if (gsql.includes('accounting connected grant schema-only')) noteMarker(grant, guardedEntry.order);
  }

  for (const f of order) {
    if (classification.has(f)) add('P0', 'ACCOUNTING_DOUBLE', f, 'already classified');
    if (f === DIGEST) {
      classification.set(f, { category: 'forward_tail', modules: seenMarkers.get(f) || [] });
      continue;
    }
    if (overlays.has(f)) {
      classification.set(f, { category: 'overlay', modules: seenMarkers.get(f) || [] });
      continue;
    }
    const mods = seenMarkers.get(f) || [];
    if (!mods.length) {
      classification.set(f, { category: 'missing', modules: [] });
      add('P0', 'SOURCE_MISSING', f, 'not marked in any module');
    } else if (mods.length > 1) {
      classification.set(f, { category: 'duplicated', modules: mods });
      add('P0', 'SOURCE_DUPLICATED', f, JSON.stringify(mods));
    } else {
      classification.set(f, { category: 'unchanged', modules: mods });
    }
  }

  const counts = { unchanged: 0, overlay: 0, forward_tail: 0, missing: 0, duplicated: 0 };
  for (const v of classification.values()) counts[v.category] = (counts[v.category] || 0) + 1;
  if (counts.unchanged !== 144 || counts.overlay !== 6 || counts.forward_tail !== 1) {
    add('P0', 'ACCOUNTING_EQUATION_MISMATCH', 'package', JSON.stringify(counts));
  }

  // 138 OD in app+security slices
  let odInSplits = 0;
  let escPatchMarkers = 0;
  for (const e of manifest.entries) {
    if (APP_SLICE_VERSIONS.includes(e.version) || e.version === SECURITY_VERSION) {
      const begins = extractMarkers(moduleSql[e.order], /-- >>> begin ([^\n]+)\n/);
      for (const b of begins) {
        if (b === 'ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY') escPatchMarkers++;
        else odInSplits++;
      }
    }
  }
  if (odInSplits !== 138) add('P1', 'OD_SPLIT_MARKER_COUNT', 'splits', `expected 138 got ${odInSplits}`);
  if (escPatchMarkers !== 1) add('P1', 'ESC_PATCH_MARKER_COUNT', 'security', `expected 1 got ${escPatchMarkers}`);

  // Digest once
  const allSql = Object.values(moduleSql).join('\n');
  const digestFwd = (allSql.match(/>>> forward 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || [])
    .length;
  const digestBegin = (allSql.match(/>>> begin 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || [])
    .length;
  if (digestFwd !== 1 || digestBegin !== 0) {
    add('P0', 'DIGEST_COUNT', 'package', `forward=${digestFwd} begin=${digestBegin}`);
  }
  const fwd = moduleByVersion[FORWARD_VERSION];
  if (!fwd) add('P0', 'FORWARD_MODULE_MISSING', FORWARD_VERSION, 'missing');
  else {
    if (!fwd.sql.includes('extensions.digest') || !fwd.sql.includes("'sha256'::text")) {
      add('P0', 'DIGEST_SHAPE', FORWARD_VERSION, 'missing digest shape');
    }
    if (!/search_path\s*=\s*public,\s*pg_temp/i.test(fwd.sql)) {
      add('P0', 'DIGEST_SEARCH_PATH', FORWARD_VERSION, 'missing locked search_path');
    }
  }

  // --- Part B transactions ---
  const transactionalSlices = new Set([...APP_SLICE_VERSIONS, SECURITY_VERSION]);
  // phase1 is also single-txn by design
  for (const hr of hashResults) {
    const isSlice = transactionalSlices.has(hr.version) || hr.name.includes('phase1_subscriptions_rls_atomic');
    if (!isSlice) continue;
    const t = hr.txn;
    if (t.BEGIN !== 1 || t.COMMIT !== 1) {
      add(
        'P0',
        'TXN_BALANCE_FAIL',
        hr.name,
        `BEGIN=${t.BEGIN} COMMIT=${t.COMMIT} ROLLBACK=${t.ROLLBACK} START=${t.START}`
      );
    }
    if (t.ROLLBACK > 0) add('P0', 'TXN_ROLLBACK_PRESENT', hr.name, String(t.ROLLBACK));
    if (t.intermediateCommits?.length) {
      add('P0', 'INTERMEDIATE_COMMIT', hr.name, JSON.stringify(t.intermediateCommits));
    }
    // Nested remnants: stripped comments may remain; executable nested = BEGIN>1
    if (t.BEGIN > 1) add('P0', 'NESTED_BEGIN_REMNANT', hr.name, String(t.BEGIN));
  }

  // Extension ops
  const extensionFindings = [];
  for (const hr of hashResults) {
    const exts = findExtensions(moduleSql[hr.order] || '');
    for (const ex of exts) {
      const insideTxnSlice = transactionalSlices.has(hr.version) || hr.name.includes('phase1');
      // PG15+/Supabase: CREATE EXTENSION IF NOT EXISTS is transactional; ALTER EXTENSION SET SCHEMA is transactional
      const needsAutocommit = false; // modern target assumption documented
      extensionFindings.push({
        module: hr.name,
        version: hr.version,
        ...ex,
        insideTransactionalSlice: insideTxnSlice,
        needsAutocommit,
        disposition: needsAutocommit
          ? 'MUST_ISOLATE_OUTSIDE_TXN'
          : 'OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE',
      });
      if (needsAutocommit && insideTxnSlice) {
        add('P0', 'EXTENSION_REQUIRES_AUTOCOMMIT_IN_TXN', hr.name, ex.match, ex.line);
      }
    }
  }

  // --- Part C/D per-COMMIT matrices ---
  const cumulativeCreates = new Set();
  const cumulativeRls = new Set();
  const cumulativeFns = new Map(); // name -> {createdAtOrder, revokedPublic, revokedAnon, revokedAuth, securityDefiner, searchPath}
  const perCommitMatrix = [];
  const sensitiveNames = new Set([
    'publish_ledger_event',
    'increment_share_token_access',
    'gap2_schedule_purge',
    'gap2_cancel_purge',
    'gap2_audit_append_only',
  ]);

  for (let ord = 1; ord <= manifest.entries.length; ord++) {
    const e = manifest.entries[ord - 1];
    const sql = moduleSql[ord];
    const creates = findCreateTables(sql);
    const rls = findEnableRls(sql);
    const fns = findCreateFunctions(sql);
    const revokes = findRevokeExecute(sql);
    const grants = findGrantExecute(sql);
    const broad = findBroadTableGrants(sql);

    for (const c of creates) cumulativeCreates.add(c.table);
    for (const t of rls) cumulativeRls.add(t);

    for (const fn of fns) {
      const key = fn.name;
      cumulativeFns.set(key, {
        name: key,
        createdAtOrder: ord,
        createdAtVersion: e.version,
        securityDefiner: fn.securityDefiner,
        hasSearchPathInCreateChunk: fn.hasSearchPathInCreateChunk,
        revokedPublic: false,
        revokedAnon: false,
        revokedAuth: false,
        line: fn.line,
      });
    }
    for (const r of revokes) {
      const cur = cumulativeFns.get(r.name) || {
        name: r.name,
        createdAtOrder: null,
        revokedPublic: false,
        revokedAnon: false,
        revokedAuth: false,
      };
      if (r.role === 'PUBLIC') cur.revokedPublic = true;
      if (r.role === 'anon') cur.revokedAnon = true;
      if (r.role === 'authenticated') cur.revokedAuth = true;
      // If revoke happens in same module as create, stamp same-module closure
      if (cur.createdAtOrder === ord) cur.closedSameModule = true;
      cumulativeFns.set(r.name, cur);
    }

    const unsafeTables = [...new Set(creates.map((c) => c.table))].filter((t) => !rls.has(t));
    const exposedTables = [...cumulativeCreates].filter((t) => !cumulativeRls.has(t));

    // Functions created this module without PUBLIC revoke in same module
    const fnsCreatedHere = fns.map((f) => f.name);
    const fnExposure = [];
    for (const fn of fns) {
      const sameModuleRevokes = revokes.filter((r) => r.name === fn.name);
      const hasPublic = sameModuleRevokes.some((r) => r.role === 'PUBLIC');
      const hasAnon = sameModuleRevokes.some((r) => r.role === 'anon');
      const hasAuth = sameModuleRevokes.some((r) => r.role === 'authenticated');
      // Default PUBLIC EXECUTE exists unless revoked — adversarial check
      if (!hasPublic) {
        fnExposure.push({
          name: fn.name,
          missing: 'PUBLIC',
          securityDefiner: fn.securityDefiner,
          line: fn.line,
        });
      }
      if (fn.securityDefiner || sensitiveNames.has(fn.name)) {
        if (!hasAnon || !hasAuth || !hasPublic) {
          fnExposure.push({
            name: fn.name,
            missing: `sensitive:${[!hasPublic && 'PUBLIC', !hasAnon && 'anon', !hasAuth && 'authenticated'].filter(Boolean).join(',')}`,
            securityDefiner: fn.securityDefiner,
            line: fn.line,
          });
        }
      }
      if (fn.securityDefiner && !fn.hasSearchPathInCreateChunk) {
        add(
          'P1',
          'SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK',
          e.name,
          fn.name,
          fn.line
        );
      }
    }

    // Broad grants on tables without RLS yet
    for (const g of broad) {
      if (!cumulativeRls.has(g.table) && cumulativeCreates.has(g.table)) {
        add('P0', 'BROAD_GRANT_BEFORE_RLS', e.name, `${g.table} TO ${g.role}`, g.line);
      }
      if (['anon', 'PUBLIC'].includes(g.role) && g.priv !== 'SELECT') {
        add('P1', 'BROAD_TABLE_GRANT', e.name, `${g.priv} on ${g.table} TO ${g.role}`, g.line);
      }
    }
    for (const g of grants) {
      if (g.role === 'PUBLIC' || g.role === 'anon') {
        add('P0', 'EXECUTABLE_GRANT_' + g.role.toUpperCase(), e.name, g.match, g.line);
      }
    }

    if (unsafeTables.length) {
      add('P0', 'SAME_MODULE_RLS_GAP', e.name, unsafeTables.join(', '));
    }
    if (exposedTables.length) {
      add('P0', 'CUMULATIVE_WITHOUT_RLS', e.name, exposedTables.join(', '));
    }

    // Function PUBLIC default exposure at COMMIT of this module
    if (fnExposure.length) {
      // P0 for any function created without PUBLIC revoke in same transactional slice
      const isTxnSlice =
        transactionalSlices.has(e.version) || e.name.includes('phase1_subscriptions_rls_atomic');
      if (isTxnSlice) {
        add(
          'P0',
          'FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT',
          e.name,
          `${fnExposure.length} functions created without same-module REVOKE FROM PUBLIC; sample: ${fnExposure
            .slice(0, 8)
            .map((x) => x.name)
            .join(', ')}`
        );
      }
    }

    perCommitMatrix.push({
      afterModule: ord,
      version: e.version,
      name: e.name,
      tablesCreated: creates.length,
      rlsEnabled: rls.size,
      unsafeCreatesWithoutRls: unsafeTables,
      cumulativeWithoutRls: exposedTables.length,
      functionsCreated: fns.length,
      functionPublicExecuteUnrevoked: fnExposure,
      broadGrants: broad.length,
    });
  }

  // Part D — security slice timing for named objects
  const securityTiming = [];
  const namedTables = ['curated_rule_fires', 'gap2_purge_table_registry', 'engagement_posting_policy'];
  const namedFns = ['publish_ledger_event', 'increment_share_token_access'];

  function firstCreateOrder(table) {
    for (const row of perCommitMatrix) {
      const sql = moduleSql[row.afterModule];
      if (new RegExp(String.raw`CREATE\s+TABLE[\s\S]{0,80}?${table}\b`, 'i').test(sql)) return row;
    }
    return null;
  }
  function firstRlsOrder(table) {
    for (const row of perCommitMatrix) {
      if (findEnableRls(moduleSql[row.afterModule]).has(table)) return row;
    }
    return null;
  }

  for (const t of namedTables) {
    const create = firstCreateOrder(t);
    const rls = firstRlsOrder(t);
    const ok = create && rls && rls.afterModule === create.afterModule;
    securityTiming.push({ object: t, kind: 'table', create, rls, sameModuleClosure: !!ok });
    if (!ok) {
      add(
        'P0',
        'NAMED_TABLE_RLS_NOT_AT_CREATE_COMMIT',
        t,
        `create@${create?.version} rls@${rls?.version}`
      );
    }
    // Must not rely on 10035 as first RLS if created earlier
    if (create && rls && create.version !== SECURITY_VERSION && rls.version === SECURITY_VERSION) {
      add('P0', 'SECURITY_SLICE_TOO_LATE_FOR_TABLE', t, `created ${create.version}, RLS only at ${SECURITY_VERSION}`);
    }
  }

  for (const fn of namedFns) {
    let createRow = null;
    let revokePublicRow = null;
    for (const row of perCommitMatrix) {
      const sql = moduleSql[row.afterModule];
      if (new RegExp(String.raw`CREATE\s+(OR\s+REPLACE\s+)?FUNCTION[\s\S]{0,80}?${fn}\b`, 'i').test(sql)) {
        if (!createRow) createRow = row;
      }
      if (
        new RegExp(
          String.raw`REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+(?:public\.)?${fn}[\s\S]{0,200}?FROM\s+PUBLIC`,
          'i'
        ).test(sql)
      ) {
        if (!revokePublicRow) revokePublicRow = row;
      }
    }
    const same = createRow && revokePublicRow && createRow.afterModule === revokePublicRow.afterModule;
    securityTiming.push({
      object: fn,
      kind: 'function',
      create: createRow,
      revokePublic: revokePublicRow,
      sameModuleClosure: !!same,
    });
    if (!same) {
      add(
        'P0',
        'NAMED_FN_PUBLIC_REVOKE_NOT_AT_CREATE_COMMIT',
        fn,
        `create@${createRow?.version} revokePublic@${revokePublicRow?.version}`
      );
    }
    if (
      createRow &&
      revokePublicRow &&
      createRow.version !== SECURITY_VERSION &&
      revokePublicRow.version === SECURITY_VERSION &&
      createRow.afterModule !== revokePublicRow.afterModule
    ) {
      add('P0', 'SECURITY_SLICE_TOO_LATE_FOR_FUNCTION', fn, `created ${createRow.version}`);
    }
  }

  // --- Part E dispositions ---
  const guarded = manifest.entries.find((e) => e.name.includes('guarded'));
  if (guarded) {
    const g = moduleSql[guarded.order];
    if (/INSERT\s+INTO\s+public\.pilot_slots[\s\S]{0,400}00000000-0000-0000-0000-000000000001/i.test(g)) {
      add('P0', 'TCP1_SEED_PRESENT', guarded.name, 'complimentary seed');
    }
    if (!/Seed\s*[—-]\s*OMITTED/i.test(g)) add('P1', 'TCP1_OMIT_MARKER_MISSING', guarded.name, 'marker');
    if (/LOCK\s+TABLE\s+public\.accounting_connections/i.test(g.replace(/--.*$/gm, ''))) {
      add('P0', 'GRANT_LOCK_PRESENT', guarded.name, 'LOCK');
    }
    for (const f of d6) {
      if (!g.includes(f)) add('P0', 'D6_MISSING', guarded.name, f);
    }
  }

  // --- Part F Option D authority ---
  const authCommit = od.assembleAuthority?.sourceCommit;
  const je = od.entries.find((e) => String(e.originalSource).includes('journal_entry_executions'));
  let frozenAuthority = null;
  if (je && authCommit) {
    const atAuth = execFileSync('git', ['cat-file', 'blob', je.originalGitBlobId], {
      cwd: ROOT,
      maxBuffer: 32 * 1024 * 1024,
    });
    const atAuthSha = sha256(atAuth);
    let atHeadSha = null;
    try {
      const headBlob = execFileSync('git', ['show', `${COMMIT}:${je.originalSource}`], {
        cwd: ROOT,
        maxBuffer: 32 * 1024 * 1024,
      });
      atHeadSha = sha256(headBlob);
    } catch (_) {}
    const assembled = gitCatBlob(
      execFileSync('git', ['rev-parse', `${COMMIT}:${je.assembledRepoPath}`], { cwd: ROOT })
        .toString()
        .trim()
    );
    // Prefer manifest assembledSha256
    frozenAuthority = {
      assembleAuthoritySourceCommit: authCommit,
      originalSha256Pinned: je.originalSha256,
      originalBlobIdPinned: je.originalGitBlobId,
      originalBlobShaMatchesPin: atAuthSha === je.originalSha256,
      assembledSha256Pinned: je.assembledSha256,
      headOriginalSha256: atHeadSha,
      headDiffersFromFrozen: atHeadSha && atHeadSha !== je.originalSha256,
      disposition:
        atHeadSha && atHeadSha !== je.originalSha256
          ? 'EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY'
          : 'NO_DRIFT',
    };
    if (atAuthSha !== je.originalSha256) {
      add('P0', 'FROZEN_ORIGINAL_BLOB_MISMATCH', 'option-d', je.originalSource);
    }
    if (je.assembledSha256 !== je.originalSha256 && !je.replacementSource) {
      add('P1', 'ASSEMBLED_NE_ORIGINAL_WITHOUT_REPLACEMENT', 'option-d', je.assembledFilename);
    }
  }

  // --- Part G comparison ---
  let comparison = null;
  try {
    comparison = JSON.parse(
      gitShow('docs/migration-remediation/evidence/executable-squash-candidate-comparison.json').toString('utf8')
    );
  } catch (err) {
    add('P0', 'COMPARISON_MISSING', 'comparison', String(err.message || err));
  }
  const schemaGaps = {
    packageClaimsCompleteProdMatch: false,
    mandatoryFullPgDumpBeforeReplay: true,
    readyForLocalReplay: comparison?.readyForLocalReplay === true,
  };
  if (comparison?.candidateVersusProductionContract?.status === 'COMPLETE') {
    schemaGaps.packageClaimsCompleteProdMatch = true;
    add('P0', 'FALSE_COMPLETE_PROD_MATCH', 'comparison', 'status COMPLETE');
  }
  if (comparison?.readyForLocalReplay === true) {
    add('P0', 'PREMATURE_REPLAY_READY', 'comparison', 'readyForLocalReplay true');
  }
  if (comparison?.readyForProductionMutation === true) {
    add('P0', 'PREMATURE_MUTATION_READY', 'comparison', 'true');
  }

  // Verdict
  const p0 = findings.filter((f) => f.priority === 'P0');
  let verdict = 'PASS_SOURCE_REVIEW';
  if (p0.length) verdict = 'CHANGES REQUIRED';
  if (seal !== EXPECTED_SEAL || totalBytes !== EXPECTED_BYTES || !hashResults.every((h) => h.manifestMatch)) {
    verdict = 'BLOCKED';
  }
  if (hashResults.every((h) => h.manifestMatch) && seal === EXPECTED_SEAL && p0.length) {
    verdict = 'CHANGES REQUIRED';
  }

  const report = {
    reviewedAt: new Date().toISOString(),
    reviewedHead: COMMIT,
    packageSealExpected: EXPECTED_SEAL,
    packageSealObserved: seal,
    packageBytesExpected: EXPECTED_BYTES,
    packageBytesObserved: totalBytes,
    moduleCount: manifest.entries.length,
    transactionModel: manifest.targetModel?.transactionModel,
    candidateSqlAndManifestByteIdentical: hashResults.every((h) => h.manifestMatch) && seal === EXPECTED_SEAL,
    verdict,
    hashResults: hashResults.map((h) => ({
      ...h,
      txn: {
        BEGIN: h.txn.BEGIN,
        COMMIT: h.txn.COMMIT,
        ROLLBACK: h.txn.ROLLBACK,
        START: h.txn.START,
        intermediateCommitCount: h.txn.intermediateCommits?.length || 0,
      },
    })),
    sourceAccounting: {
      optionDEntries: order.length,
      counts,
      equation: `${counts.unchanged} unchanged + ${counts.overlay} overlays + ${counts.forward_tail} forward = ${counts.unchanged + counts.overlay + counts.forward_tail}`,
      odAssembledBeginMarkersInAppSecuritySplits: odInSplits,
      escPatchMarkers,
      markerExplanation:
        '138 OD assembled begin markers in app/security slices; +1 ESC_REMEDIATION patch marker is not an Option D source',
      digestQualifyOccurrences: digestFwd,
    },
    extensionFindings,
    perCommitMatrix,
    securityTiming,
    frozenAuthority,
    schemaGaps: {
      ...schemaGaps,
      dumpDependencyNote:
        'Full live pg_dump --schema-only remains mandatory before local replay / mutation. Option D + partial G1 are not complete production match.',
    },
    findingCounts: {
      P0: findings.filter((f) => f.priority === 'P0').length,
      P1: findings.filter((f) => f.priority === 'P1').length,
      P2: findings.filter((f) => f.priority === 'P2').length,
      P3: findings.filter((f) => f.priority === 'P3').length,
    },
    findings,
  };

  const md = `# ESC Option-2 independent source review — 2026-09-06

**Verdict: ${verdict}**

| Pin | Value |
|-----|-------|
| Reviewed HEAD | \`${COMMIT}\` |
| Seal | \`${seal}\` |
| Bytes | ${totalBytes} |
| Modules | ${manifest.entries.length} |
| Candidate byte-identical | ${report.candidateSqlAndManifestByteIdentical} |
| Transaction model | ${manifest.targetModel?.transactionModel} |

## Source accounting
${report.sourceAccounting.equation}
Marker note: ${report.sourceAccounting.markerExplanation}

## Extension ops
${extensionFindings.map((x) => `- ${x.version} L${x.line}: \`${x.match}\` → ${x.disposition}`).join('\n') || '_none_'}

## Per-COMMIT summary
${perCommitMatrix
  .map(
    (r) =>
      `- M${r.afterModule} ${r.version}: tablesUnsafe=${r.unsafeCreatesWithoutRls.length} cumWithoutRls=${r.cumulativeWithoutRls} fnsCreated=${r.functionsCreated} fnPublicUnrevoked=${r.functionPublicExecuteUnrevoked.length}`
  )
  .join('\n')}

## Named object security timing
${securityTiming
  .map(
    (s) =>
      `- ${s.object}: sameModuleClosure=${s.sameModuleClosure} create=${s.create?.version || s.create?.afterModule} rls/revoke=${s.rls?.version || s.revokePublic?.version}`
  )
  .join('\n')}

## Frozen authority
${JSON.stringify(frozenAuthority, null, 2)}

## Dump requirement
${report.schemaGaps.dumpDependencyNote}

## Findings
${findings.map((f) => `- **${f.priority}** \`${f.code}\` @ ${f.module}${f.line ? ':' + f.line : ''}: ${f.detail}`).join('\n') || '_none_'}
`;

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_AUTO, md, 'utf8');
  // Human narrative report is maintained separately at:
  // docs/migration-remediation/executable-squash-candidate-source-review-option2-2026-09-06.md

  console.log(
    JSON.stringify(
      {
        verdict,
        seal,
        totalBytes,
        modules: manifest.entries.length,
        p0: report.findingCounts.P0,
        p1: report.findingCounts.P1,
        accounting: counts,
        odInSplits,
        escPatchMarkers,
        digestFwd,
        fnPublicUnrevokedTotal: perCommitMatrix.reduce((s, r) => s + r.functionPublicExecuteUnrevoked.length, 0),
        namedTimingFails: securityTiming.filter((s) => !s.sameModuleClosure).map((s) => s.object),
        candidateIdentical: report.candidateSqlAndManifestByteIdentical,
      },
      null,
      2
    )
  );
}

main();
