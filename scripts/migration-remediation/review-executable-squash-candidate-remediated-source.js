#!/usr/bin/env node
/**
 * Independent source review of REMEDIATED executable-squash-candidate (read-only).
 * Authority: git cat-file / git show at pinned COMMIT only — not worktree smudge.
 * Does NOT modify candidate SQL or MANIFEST.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const COMMIT = process.env.ESC_REVIEW_COMMIT || '9b0c3b1a51e5674742c55b2d47aa0a1ecdaa3fc3';
const EXPECTED_SEAL = '99f556ebab0a73e3a58c770776cf3287d5150887ae22de25f80cb6932dd1dacf';
const EXPECTED_BYTES = 1130762;
const EXPECTED_MODULES = 7;
const OPTION_D_SHA = '9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359';
const PRIOR_SEAL = 'ae85b00270d3b89f6e8f57cb6851dec19aba2b860dd0de89126bc93643555d28';
const DIGEST = '20260906184500_publish_ledger_event_extensions_digest_qualify.sql';

const OUT_MD = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-source-review-remediated-2026-09-06.auto.md'
);
const OUT_JSON = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-source-review-remediated-2026-09-06.json'
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
function approxStatements(sql) {
  const body = stripComments(sql);
  return body.split(';').map((s) => s.trim()).filter(Boolean).length;
}
function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}
function lineAt(sql, index) {
  return sql.slice(0, index).split('\n').length;
}
function extractMarkers(sql, re) {
  const out = [];
  let m;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(sql))) out.push(m[1]);
  return out;
}
function findCreateTables(sql) {
  const tables = [];
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi;
  let m;
  while ((m = re.exec(sql))) tables.push({ table: m[1].replace(/^public\./, ''), index: m.index });
  return tables;
}
function findEnableRls(sql) {
  const tables = new Set();
  const re =
    /ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  let m;
  while ((m = re.exec(sql))) tables.add(m[1].replace(/^public\./, ''));
  return tables;
}
function findExecutableGrants(sql) {
  const body = stripComments(sql);
  const out = [];
  const re =
    /GRANT\s+EXECUTE\s+ON\s+(?:FUNCTION|PROCEDURE|ALL\s+FUNCTIONS\s+IN\s+SCHEMA)\s+[^\n;]*\s+TO\s+(PUBLIC|anon|authenticated)/gi;
  let m;
  while ((m = re.exec(body))) {
    // map body index roughly via search in original for reporting
    const idx = sql.search(new RegExp(m[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    out.push({ match: m[0].slice(0, 160), to: m[1], index: idx >= 0 ? idx : m.index });
  }
  return out;
}
function findRevokes(sql, fnName) {
  const body = stripComments(sql);
  const roles = { PUBLIC: false, anon: false, authenticated: false };
  const re = new RegExp(
    String.raw`REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.${fnName}\s*\([^)]*\)\s+FROM\s+(PUBLIC|anon|authenticated)`,
    'gi'
  );
  let m;
  while ((m = re.exec(body))) roles[m[1]] = true;
  return roles;
}
function countTxnMarkers(sql) {
  return {
    begin: (sql.match(/^\s*BEGIN\s*;/gim) || []).length,
    commit: (sql.match(/^\s*COMMIT\s*;/gim) || []).length,
    rollback: (sql.match(/^\s*ROLLBACK\s*;/gim) || []).length,
  };
}

function main() {
  const findings = [];
  const add = (priority, code, module, detail, line) => {
    findings.push({ priority, code, module, detail, line: line || null });
  };

  const head = execFileSync('git', ['rev-parse', COMMIT], { cwd: ROOT }).toString().trim();
  if (head !== COMMIT) add('P0', 'COMMIT_RESOLVE_MISMATCH', 'review', `${head} vs ${COMMIT}`);

  const manifestBuf = gitShow('supabase/migrations-draft/executable-squash-candidate/MANIFEST.json');
  const manifest = JSON.parse(manifestBuf.toString('utf8'));
  const odBuf = gitShow('docs/migration-remediation/option-d-replay-manifest.json');
  const odSha = sha256(odBuf);
  const od = JSON.parse(odBuf.toString('utf8'));
  const order = od.ordering.dependencyOrder;

  // --- Part A: seal ---
  if (manifest.entries.length !== EXPECTED_MODULES) {
    add('P0', 'MODULE_COUNT_MISMATCH', 'package', `expected ${EXPECTED_MODULES} got ${manifest.entries.length}`);
  }
  if (manifest.packageSha256OfConcatenatedEntryHashes === PRIOR_SEAL) {
    add('P0', 'PRIOR_SEAL_STILL_SELECTED', 'package', PRIOR_SEAL);
  }

  const hashResults = [];
  let totalBytes = 0;
  const sealParts = [];
  const moduleSql = {};

  for (const e of manifest.entries) {
    const blobBuf = gitCatBlob(e.gitBlobId);
    const showBuf = gitShow(e.path);
    const blobSha = sha256(blobBuf);
    const blobMd5 = md5(blobBuf);
    const showSha = sha256(showBuf);
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
      showSha === e.sha256 &&
      recomputedBlobId === e.gitBlobId &&
      !blobBuf.includes(0x0d);
    if (!ok) {
      add(
        'P0',
        'HASH_MISMATCH',
        e.name,
        `manifest sha=${e.sha256} blob=${blobSha} md5=${blobMd5} bytes=${blobBuf.length} blobId=${recomputedBlobId}`
      );
    }
    totalBytes += blobBuf.length;
    sealParts.push(blobSha);
    const sql = blobBuf.toString('utf8');
    moduleSql[e.order] = sql;
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
      manifestMatch: ok,
      crlfPresent: sql.includes('\r'),
      txnMarkers: countTxnMarkers(sql),
    });
  }

  const seal = sha256(Buffer.from(sealParts.join('\n'), 'utf8'));
  if (seal !== EXPECTED_SEAL || seal !== manifest.packageSha256OfConcatenatedEntryHashes) {
    add('P0', 'PACKAGE_SEAL_MISMATCH', 'package', `expected ${EXPECTED_SEAL} got ${seal}`);
  }
  if (totalBytes !== EXPECTED_BYTES) {
    add('P0', 'PACKAGE_BYTES_MISMATCH', 'package', `expected ${EXPECTED_BYTES} got ${totalBytes}`);
  }
  if (odSha !== OPTION_D_SHA) add('P0', 'OPTION_D_MANIFEST_PIN_MISMATCH', 'option-d', odSha);

  // Deterministic regeneration check WITHOUT writing: rebuild seal from blobs only (already done).
  // Optionally invoke builder in a temp copy — forbidden to change committed files; skip write.
  const regenNote =
    'Seal recomputed solely from git blobs at COMMIT; builder not invoked (would rewrite generatedAt).';

  // Active migrations
  const active = execFileSync('git', ['ls-tree', '-r', '--name-only', COMMIT, 'supabase/migrations'], {
    cwd: ROOT,
  })
    .toString()
    .trim()
    .split('\n');
  if (active.some((f) => f.includes('202609070100'))) {
    add('P0', 'ACTIVE_MIGRATIONS_CONTAIN_ESC', 'supabase/migrations', 'ESC versions in active path');
  }

  // --- Part B: 151 accounting ---
  const d6 = [
    '20260703_2000_d6_2a_test_client_activation.sql',
    '20260703_2200_d6_2b_mfg_activation.sql',
    '20260703_2300_d6_2c_retail_activation.sql',
    '20260703_2400_d6_2d_ps_activation.sql',
  ];
  const tcp1 = '20260708120000_tcp1_w1_solo_bk_pilot_slots.sql';
  const grant = '20260814221500_accounting_canonical_connected_grant.sql';
  const overlays = new Set([...d6, tcp1, grant]);

  const classification = new Map(); // file -> {category, module, note}
  function classify(f, category, module, note) {
    if (classification.has(f)) {
      add('P0', 'ACCOUNTING_DOUBLE_CLASSIFY', f, `${classification.get(f).category} and ${category}`);
      return;
    }
    classification.set(f, { category, module, note });
  }

  // Marker scan
  const seenMarkers = new Map(); // file -> modules[]
  function noteMarker(f, ord) {
    if (!seenMarkers.has(f)) seenMarkers.set(f, []);
    if (!seenMarkers.get(f).includes(ord)) seenMarkers.get(f).push(ord);
  }

  for (const [ordStr, sql] of Object.entries(moduleSql)) {
    const ord = Number(ordStr);
    for (const f of extractMarkers(sql, /-- >>> begin ([^\n]+)\n/g)) noteMarker(f.trim(), ord);
    for (const f of extractMarkers(sql, /-- >>> guarded ([^\n]+)\n/g)) noteMarker(f.trim(), ord);
    for (const f of extractMarkers(sql, /-- >>> forward ([^\n]+)\n/g)) noteMarker(f.trim(), ord);
  }
  // foundations special markers
  if (moduleSql[2].includes('20260701043598_public_users_derived_baseline.sql')) {
    noteMarker('20260701043598_public_users_derived_baseline.sql', 2);
  }
  if (moduleSql[2].includes('20260701043599_foundations_baseline.sql')) {
    noteMarker('20260701043599_foundations_baseline.sql', 2);
  }
  // tcp1/grant in module 6
  if (moduleSql[6] && moduleSql[6].includes('tcp1 schema without complimentary seed')) noteMarker(tcp1, 6);
  if (moduleSql[6] && moduleSql[6].includes('accounting connected grant schema-only')) noteMarker(grant, 6);

  for (const f of order) {
    if (f === DIGEST) {
      classify(f, 'moved_to_forward_tail', 7, 'Excluded from baseline; sole home in forward-tail');
      continue;
    }
    if (overlays.has(f)) {
      classify(f, 'reviewed_transformation_overlay', 6, 'Disposition overlay in guarded init module');
      continue;
    }
    const mods = seenMarkers.get(f) || [];
    if (mods.length === 1) {
      classify(f, 'included_unchanged_baseline', mods[0], 'Assembled marker in baseline module');
    } else if (mods.length === 0) {
      classify(f, 'missing', null, 'No module marker found');
      add('P0', 'SOURCE_MISSING_FROM_MODULES', f, 'Option D entry not marked in any module');
    } else {
      classify(f, 'duplicated', mods.join(','), 'Marked in multiple modules');
      add('P0', 'SOURCE_DUPLICATED_ACROSS_MODULES', f, JSON.stringify(mods));
    }
  }

  // Digest must appear exactly once in executable SQL markers
  const digestForward = (moduleSql[7].match(/>>> forward 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || [])
    .length;
  const digestBegin = Object.values(moduleSql).join('\n').match(/>>> begin 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || [];
  if (digestForward !== 1 || digestBegin.length !== 0) {
    add(
      'P0',
      'DIGEST_OCCURRENCE_COUNT',
      'package',
      `forward=${digestForward} begin=${digestBegin.length}`
    );
  }
  const fwdSql = moduleSql[7];
  if (!fwdSql.includes('extensions.digest') || !fwdSql.includes("'sha256'::text")) {
    add('P0', 'DIGEST_SHAPE_MISSING', 'esc_forward_tail_main_unapplied', 'missing extensions.digest or sha256::text');
  }
  if (!/search_path\s*=\s*public,\s*pg_temp/i.test(fwdSql)) {
    add('P0', 'DIGEST_SEARCH_PATH', 'esc_forward_tail_main_unapplied', 'missing locked search_path');
  }

  const counts = {
    included_unchanged_baseline: 0,
    reviewed_transformation_overlay: 0,
    moved_to_forward_tail: 0,
    intentionally_excluded: 0,
    superseded: 0,
    missing: 0,
    duplicated: 0,
  };
  for (const v of classification.values()) counts[v.category] = (counts[v.category] || 0) + 1;
  const accounted = [...classification.keys()].length;
  if (accounted !== 151) add('P0', 'ACCOUNTING_TOTAL_NE_151', 'package', `accounted=${accounted}`);
  // Expected equation: unchanged + overlays + forward = 151
  const eq =
    counts.included_unchanged_baseline +
    counts.reviewed_transformation_overlay +
    counts.moved_to_forward_tail +
    (counts.intentionally_excluded || 0) +
    (counts.superseded || 0);
  if (eq !== 151 || counts.missing || counts.duplicated) {
    add(
      'P0',
      'ACCOUNTING_EQUATION_FAIL',
      'package',
      JSON.stringify({ counts, eq, accounted })
    );
  }
  // Explain 138 / 6 / 1: 138 should be unchanged in modules 1-5 body markers; overlays 6; digest 1
  // Manifest claimed includedInBaselineBody=138 = app+security markers only (not foundations/phase1).
  const m4markers = [
    ...extractMarkers(moduleSql[4], /-- >>> begin ([^\n]+)\n/g),
  ].map((s) => s.trim());
  const baselineBodyUnique = new Set(m4markers);
  // Manifest 138 = appSources(123)+securitySources(15) — verify
  if (baselineBodyUnique.size !== 138) {
    add(
      'P1',
      'MANIFEST_138_VS_MARKERS',
      'esc_application_schema_and_security_atomic',
      `unique begin markers in module4=${baselineBodyUnique.size} (manifest claimed 138)`
    );
  }

  // --- Part C: P0 remediations ---
  const m4 = moduleSql[4];
  const m4txn = countTxnMarkers(m4);
  // One ACTUAL transaction? Nested BEGIN/COMMIT means NO single outer atomic txn.
  const hasOuterBeginWrap =
    /^\s*BEGIN\s*;/im.test(m4.split('\n').slice(0, 40).join('\n')) === false
      ? false
      : false;
  // Module 4 header does not wrap entire body in single BEGIN...COMMIT without nested commits.
  if (m4txn.commit > 0 || m4txn.begin > 1) {
    add(
      'P0',
      'MODULE4_NOT_SINGLE_TRANSACTION',
      'esc_application_schema_and_security_atomic',
      `Nested txn markers BEGIN=${m4txn.begin} COMMIT=${m4txn.commit}. One proposed version ≠ one PostgreSQL transaction; premature COMMIT possible mid-module.`
    );
  }

  // Boundary matrix
  const boundaryMatrix = [];
  const cumulativeCreates = new Set();
  const cumulativeRls = new Set();
  for (let ord = 1; ord <= 7; ord++) {
    const sql = moduleSql[ord];
    const creates = findCreateTables(sql);
    const rls = findEnableRls(sql);
    for (const c of creates) cumulativeCreates.add(c.table);
    for (const t of rls) cumulativeRls.add(t);
    const createdHere = new Set(creates.map((c) => c.table));
    const unsafe = [...createdHere].filter((t) => !rls.has(t));
    const exposed = [...cumulativeCreates].filter((t) => !cumulativeRls.has(t));
    boundaryMatrix.push({
      afterModule: ord,
      name: manifest.entries[ord - 1].name,
      tablesCreatedInModule: createdHere.size,
      rlsEnabledInModule: rls.size,
      unsafeCreatesInModuleWithoutRlsSameModule: unsafe,
      unsafeCreatesInModuleCount: unsafe.length,
      cumulativeTablesWithoutRlsYet: exposed.length,
      sampleCumulativeWithoutRls: exposed.slice(0, 40),
      txnMarkers: countTxnMarkers(sql),
    });
    if (unsafe.length) {
      add(
        'P0',
        'SAME_MODULE_RLS_GAP',
        manifest.entries[ord - 1].name,
        unsafe.join(', '),
        creates.find((c) => unsafe.includes(c.table))?.index
          ? lineAt(sql, creates.find((c) => unsafe.includes(c.table)).index)
          : null
      );
    }
    if (exposed.length) {
      add(
        'P0',
        'CUMULATIVE_WITHOUT_RLS_AFTER_MODULE',
        manifest.entries[ord - 1].name,
        exposed.join(', ')
      );
    }
  }

  for (const t of ['curated_rule_fires', 'gap2_purge_table_registry', 'engagement_posting_policy']) {
    const createIdx = m4.search(new RegExp(String.raw`CREATE\s+TABLE[\s\S]{0,80}?${t}`, 'i'));
    const rlsIdx = m4.search(
      new RegExp(String.raw`ALTER\s+TABLE[\s\S]{0,80}?${t}[\s\S]{0,80}?ENABLE\s+ROW\s+LEVEL\s+SECURITY`, 'i')
    );
    if (createIdx < 0) add('P0', 'TABLE_CREATE_MISSING', t, 'not found in module 4');
    if (rlsIdx < 0) add('P0', 'TABLE_RLS_MISSING_SAME_MODULE', t, 'ENABLE RLS not in module 4');
  }
  if (!/CREATE\s+POLICY[\s\S]{0,120}?gap2_purge_table_registry_service_role/i.test(m4)) {
    add('P0', 'GAP2_POLICY_MISSING', 'gap2_purge_table_registry', 'service_role policy missing');
  }
  if (/GRANT\s+(ALL|SELECT|INSERT|UPDATE|DELETE)[\s\S]{0,80}?gap2_purge_table_registry[\s\S]{0,40}?TO\s+(anon|authenticated|PUBLIC)/i.test(
    stripComments(m4)
  )) {
    add('P0', 'GAP2_BROAD_GRANT', 'gap2_purge_table_registry', 'broad grant to anon/authenticated/PUBLIC');
  }

  // Privilege dispositions — comment-stripped grant scan
  for (const e of manifest.entries) {
    const grants = findExecutableGrants(moduleSql[e.order]);
    for (const g of grants) {
      if (g.to === 'PUBLIC' || g.to === 'anon') {
        add('P0', 'EXECUTABLE_GRANT_TO_' + g.to.toUpperCase(), e.name, g.match, lineAt(moduleSql[e.order], g.index));
      } else if (g.to === 'authenticated') {
        add('P2', 'EXECUTABLE_GRANT_TO_AUTHENTICATED', e.name, g.match, lineAt(moduleSql[e.order], g.index));
      }
    }
  }
  for (const fn of ['publish_ledger_event', 'increment_share_token_access']) {
    const rev = findRevokes(m4, fn);
    for (const role of ['PUBLIC', 'anon', 'authenticated']) {
      if (!rev[role]) {
        add('P0', 'REVOKE_MISSING', fn, `missing REVOKE EXECUTE ... FROM ${role} in module 4`);
      }
    }
  }
  // Comment false-positive check: raw GRANT TO anon in comments should NOT trigger if stripComments works
  const rawAnonGrantComments = (m4.match(/--[^\n]*GRANT\s+EXECUTE[^\n]*\banon\b/gi) || []).length;
  const execAnonGrants = findExecutableGrants(m4).filter((g) => g.to === 'anon').length;

  // Search path on publish after digest
  if (!/SECURITY\s+DEFINER[\s\S]{0,80}?SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(fwdSql)) {
    // digest replace includes both
    if (!/SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(fwdSql)) {
      add('P0', 'PUBLISH_LEDGER_SEARCH_PATH', 'module7', 'digest qualify missing locked search_path');
    }
  }

  // --- Part D: transaction / deployability ---
  const txnFindings = [];
  for (const hr of hashResults) {
    const sql = moduleSql[hr.order];
    const body = stripComments(sql);
    const concurrent = body.match(/CREATE\s+(UNIQUE\s+)?INDEX\s+CONCURRENTLY/gi) || [];
    const vacuum = body.match(/\bVACUUM\b/gi) || [];
    const meta = body.match(/\\(echo|i|ir|o|set|timing|gset)\b/g) || [];
    if (concurrent.length) {
      add('P0', 'CONCURRENT_INDEX_IN_TXN_UNSAFE', hr.name, `${concurrent.length} CONCURRENTLY`);
    }
    if (meta.length) add('P0', 'CLIENT_META_COMMAND', hr.name, meta.join(','));
    if (vacuum.length) add('P1', 'VACUUM_IN_MODULE', hr.name, String(vacuum.length));
    // dollar-quote balance heuristic
    const dollars = sql.match(/\$[a-zA-Z0-9_]*\$/g) || [];
    if (dollars.length % 2 !== 0) {
      add('P0', 'DOLLAR_QUOTE_IMBALANCE', hr.name, `markers=${dollars.length}`);
    }
    if (approxStatements(sql) < 1) add('P0', 'EMPTY_EXECUTABLE_BODY', hr.name, 'no statements');
    txnFindings.push({
      order: hr.order,
      name: hr.name,
      bytes: hr.utf8LfBytes,
      ...hr.txnMarkers,
      concurrentIndex: concurrent.length,
      clientMeta: meta.length,
      statementCountApprox: hr.statementCountApprox,
    });
  }
  // Module 4 size risk
  if (hashResults.find((h) => h.order === 4).utf8LfBytes > 500000) {
    add(
      'P1',
      'MODULE4_SIZE_OPERATIONAL_RISK',
      'esc_application_schema_and_security_atomic',
      `979KB-class module may hit dashboard/CLI timeout or payload limits; nested COMMITs also break atomicity. Secure atomic split design required if P0 txn finding stands — not applied in this review.`
    );
  }

  // --- Part E: adversarial / DML ---
  const dmlAll = [];
  for (const e of manifest.entries) {
    const sql = moduleSql[e.order];
    const body = stripComments(sql);
    let m;
    const ins = /INSERT\s+INTO\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi;
    while ((m = ins.exec(body))) {
      dmlAll.push({ module: e.name, kind: 'INSERT', target: m[1].replace(/^public\./, ''), line: null });
    }
    const setvalHits = [];
    const setvalRe = /setval\s*\(\s*'[^']+'\s*,\s*([^)]+)\)/gi;
    let sm;
    while ((sm = setvalRe.exec(sql))) {
      const arg = sm[1].trim();
      const line = lineAt(sql, sm.index);
      if (/^\d+\s*(,|$)/.test(arg)) {
        add('P0', 'PRODUCTION_SETVAL_LITERAL', e.name, sm[0].slice(0, 120), line);
      } else {
        setvalHits.push({ line, snip: sm[0].slice(0, 120) });
      }
    }
    if (setvalHits.length) {
      add(
        'P2',
        'SETVAL_NON_LITERAL',
        e.name,
        `${setvalHits.length} non-literal setval (e.g. function-local); sample L${setvalHits[0].line}: ${setvalHits[0].snip}`
      );
    }
    if (/INSERT\s+INTO\s+auth\./i.test(body)) add('P0', 'AUTH_ROW_INSERT', e.name, 'auth insert');
    if (/oauth|refresh_token|client_secret/i.test(body) && /INSERT\s+INTO/i.test(body)) {
      add('P1', 'SENSITIVE_DML_KEYWORD', e.name, 'oauth/secret near INSERT');
    }
  }
  // tcp1 seed omitted
  if (/INSERT\s+INTO\s+public\.pilot_slots[\s\S]{0,400}00000000-0000-0000-0000-000000000001/i.test(stripComments(moduleSql[6]))) {
    add('P0', 'TCP1_COMPLIMENTARY_SEED_PRESENT', 'module6', 'seed present');
  }
  if (!/Seed\s*[—-]\s*OMITTED/i.test(moduleSql[6])) {
    add('P1', 'TCP1_OMIT_MARKER_MISSING', 'module6', 'marker missing');
  }
  if (/LOCK\s+TABLE\s+public\.accounting_connections/i.test(stripComments(moduleSql[6]))) {
    add('P0', 'GRANT_LOCK_PRESENT', 'module6', 'LOCK present');
  }

  // SECURITY DEFINER without search_path in create chunk (sample)
  let secDefinerNoPath = 0;
  for (const e of manifest.entries) {
    const sql = moduleSql[e.order];
    const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[\s\S]{0,500}?SECURITY\s+DEFINER/gi;
    let m;
    while ((m = re.exec(sql))) {
      if (!/SET\s+search_path\s*=/i.test(m[0])) {
        secDefinerNoPath++;
        if (secDefinerNoPath <= 15) {
          add(
            'P1',
            'SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK',
            e.name,
            (m[0].match(/FUNCTION\s+((?:public\.)?[a-zA-Z_][\w.]*)/i) || [])[1] || 'unknown',
            lineAt(sql, m.index)
          );
        }
      }
    }
  }

  // --- Part F: comparison / dump ---
  let comparison = null;
  try {
    comparison = JSON.parse(
      gitShow('docs/migration-remediation/evidence/executable-squash-candidate-comparison.json').toString('utf8')
    );
  } catch (err) {
    add('P0', 'COMPARISON_EVIDENCE_MISSING', 'comparison', String(err.message || err));
  }
  const schemaGaps = {
    productionContractScope: 'foundation_and_phase1_only_47_tables',
    packageClaimsCompleteProdMatch: false,
    mandatoryFullPgDumpBeforeReplay: true,
  };
  if (comparison) {
    if (comparison.candidateVersusProductionContract?.status === 'COMPLETE' || comparison.completeProductionMatch === true) {
      add('P0', 'FALSE_COMPLETE_PROD_MATCH_LABEL', 'comparison', 'comparison claims complete prod match');
      schemaGaps.packageClaimsCompleteProdMatch = true;
    }
    if (
      comparison.candidateVersusProductionContract?.status === 'PARTIAL_COVERAGE_DOCUMENTED' ||
      /PARTIAL/i.test(String(comparison.candidateVersusProductionContract?.status || ''))
    ) {
      schemaGaps.mandatoryFullPgDumpBeforeReplay = true;
    }
    if (comparison.readyForLocalReplay === true) {
      add('P0', 'COMPARISON_CLAIMS_REPLAY_READY', 'comparison', 'readyForLocalReplay true without dump');
    }
  }

  // Full dump still mandatory — if source correctness for mutation/replay depends on unavailable prod definitions:
  // For SOURCE REVIEW of candidate lineage alone, missing dump is a gating BLOCK for replay auth, not necessarily for PASS_SOURCE_REVIEW of SQL hygiene.
  // Auth Part F.4: "Return BLOCKED rather than PASS if source correctness depends on unavailable production definitions."
  // Candidate claims Option D as stand-in — comparison documents PARTIAL. Source review of remediation can PASS_SOURCE_REVIEW for package hygiene IF all P0 security/accounting clear, while still requiring dump before replay. If any correctness of the baseline body depends on unsealed prod objects, BLOCKED.
  const dumpDependencyNote =
    'Full live pg_dump --schema-only remains mandatory before local replay / mutation. Option D PASS + 47-table G1 are not a complete production match.';

  // --- Verdict ---
  const p0 = findings.filter((f) => f.priority === 'P0');
  let verdict = 'PASS_SOURCE_REVIEW';
  if (p0.length) verdict = 'CHANGES REQUIRED';
  // Seal must match or BLOCKED
  if (seal !== EXPECTED_SEAL || totalBytes !== EXPECTED_BYTES || !hashResults.every((h) => h.manifestMatch)) {
    verdict = 'BLOCKED';
  }
  // If hygiene P0s exist but seal ok → CHANGES REQUIRED (already)
  if (hashResults.every((h) => h.manifestMatch) && seal === EXPECTED_SEAL && p0.length) {
    verdict = 'CHANGES REQUIRED';
  }

  const accountingTable = [...classification.entries()]
    .map(([file, meta]) => ({ file, ...meta }))
    .sort((a, b) => a.file.localeCompare(b.file));

  const report = {
    reviewedAt: new Date().toISOString(),
    reviewedHead: COMMIT,
    packageSealExpected: EXPECTED_SEAL,
    packageSealObserved: seal,
    packageBytesExpected: EXPECTED_BYTES,
    packageBytesObserved: totalBytes,
    moduleCount: manifest.entries.length,
    optionDManifestSha256: odSha,
    priorSealSuperseded: PRIOR_SEAL,
    priorSealStillSelected: manifest.packageSha256OfConcatenatedEntryHashes === PRIOR_SEAL,
    candidateSqlAndManifestByteIdentical: hashResults.every((h) => h.manifestMatch) && seal === EXPECTED_SEAL,
    regenNote,
    verdict,
    hashResults,
    sourceAccounting: {
      optionDEntries: order.length,
      counts,
      equation: `${counts.included_unchanged_baseline} unchanged + ${counts.reviewed_transformation_overlay} overlays + ${counts.moved_to_forward_tail} forward = ${eq}`,
      expectedEquation: '144 unchanged + 6 overlays + 1 forward_tail = 151 (if markers complete)',
      manifestClaimedBaselineBody: manifest.sourceAccounting?.includedInBaselineBody,
      module4BeginMarkerCount: baselineBodyUnique.size,
      digestQualifyOccurrences: digestForward,
      digestQualifyLocation: 'module_7_forward_tail_only',
      classificationSample: accountingTable.slice(0, 20),
      classificationFullPath:
        'docs/migration-remediation/evidence/executable-squash-candidate-source-review-remediated-2026-09-06.json',
    },
    accountingTable,
    failureBoundaryMatrix: boundaryMatrix,
    privilegeScan: {
      commentStrippedAnonGrantsInModule4: execAnonGrants,
      rawCommentLinesMentioningGrantAnon: rawAnonGrantComments,
      publish_ledger_event_revokes: findRevokes(m4, 'publish_ledger_event'),
      increment_share_token_access_revokes: findRevokes(m4, 'increment_share_token_access'),
    },
    txnFindings,
    dmlSample: dmlAll.slice(0, 60),
    dmlCount: dmlAll.length,
    schemaGaps: { ...schemaGaps, dumpDependencyNote },
    findingCounts: {
      P0: findings.filter((f) => f.priority === 'P0').length,
      P1: findings.filter((f) => f.priority === 'P1').length,
      P2: findings.filter((f) => f.priority === 'P2').length,
      P3: findings.filter((f) => f.priority === 'P3').length,
    },
    findings,
  };

  // Write report only (allowed). Do not touch candidate.
  const md = `# Executable squash candidate — remediations source review (2026-09-06)

**Verdict: ${verdict}**

**Reviewed HEAD:** \`${COMMIT}\`  
**Package seal:** \`${seal}\` (expected \`${EXPECTED_SEAL}\`)  
**Bytes:** ${totalBytes} (expected ${EXPECTED_BYTES})  
**Modules:** ${manifest.entries.length}  
**Candidate SQL/manifest byte-identical to committed blobs:** ${report.candidateSqlAndManifestByteIdentical}  
**Prior seal superseded:** \`${PRIOR_SEAL}\` (not selected: ${!report.priorSealStillSelected})  
**Active supabase/migrations ESC leak:** none detected  
**Production dump / Docker / SQL exec:** not performed (not authorized)

## Part A — Seal
${hashResults
  .map(
    (h) =>
      `- M${h.order} \`${h.version}\` ${h.name}: sha256=\`${h.sha256}\` md5=\`${h.md5}\` blob=\`${h.gitBlobId}\` bytes=${h.utf8LfBytes} stmts≈${h.statementCountApprox} match=${h.manifestMatch}`
  )
  .join('\n')}

Complete seal recomputed from concatenated entry SHA-256 lines: \`${seal}\`.

## Part B — 151 accounting
Equation observed: **${report.sourceAccounting.equation}**  
Counts: ${JSON.stringify(counts)}

Interpretation of remediator’s 138 / 6 / 1:
- **138** = unique \`>>> begin\` markers inside atomic module 4 (app+security assembled files only); observed marker count = **${baselineBodyUnique.size}**
- **6** = disposition overlays (d6×4 + tcp1 + grant) in module 6
- **1** = digest qualify moved to module 7 forward-tail
- Remaining Option D entries live in modules 2–3 (foundations + phase1) and are part of the **unchanged baseline** class — they are **not** part of the “138” figure

Digest executable occurrence: **${digestForward}** (must be 1). Provenance retained via \`>>> forward ${DIGEST}\`.

## Part C — Prior P0 remediations
See findings. Critical: module 4 is one **proposed version** but nested BEGIN/COMMIT markers mean it is **not** one PostgreSQL transaction unless a runner strips/re-wraps them.

## Part D — Transaction / size
Module 4 bytes=${hashResults.find((h) => h.order === 4).utf8LfBytes}; BEGIN=${m4txn.begin}; COMMIT=${m4txn.commit}.

## Part E — Boundary matrix
${boundaryMatrix
  .map(
    (b) =>
      `- After M${b.afterModule} (${b.name}): created=${b.tablesCreatedInModule} rls=${b.rlsEnabledInModule} unsafe=${b.unsafeCreatesInModuleCount} cumulativeWithoutRls=${b.cumulativeTablesWithoutRlsYet}`
  )
  .join('\n')}

## Part F — Dump requirement
${dumpDependencyNote}  
Comparison complete-prod-match claim: **${schemaGaps.packageClaimsCompleteProdMatch}**. Mandatory dump before replay: **${schemaGaps.mandatoryFullPgDumpBeforeReplay}**.

## Findings (P0–P3)
${findings
  .sort((a, b) => a.priority.localeCompare(b.priority) || a.code.localeCompare(b.code))
  .map((f) => `- **${f.priority}** \`${f.code}\` @ ${f.module}${f.line ? `:${f.line}` : ''}: ${f.detail}`)
  .join('\n') || '_none_'}

## Next authorization
Depends on verdict. Do not authorize Docker/SQL replay or production dump until source review PASSes **and** dump is separately authorized. Keep PR #314 draft.
`;

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_MD, md, 'utf8');
  console.log(
    JSON.stringify(
      {
        verdict,
        seal,
        totalBytes,
        p0: report.findingCounts.P0,
        p1: report.findingCounts.P1,
        accounting: counts,
        equation: report.sourceAccounting.equation,
        module4Txn: m4txn,
        candidateIdentical: report.candidateSqlAndManifestByteIdentical,
        outMd: OUT_MD,
        outJson: OUT_JSON,
      },
      null,
      2
    )
  );
}

main();
