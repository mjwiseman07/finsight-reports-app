#!/usr/bin/env node
/**
 * Independent source review of executable-squash-candidate (read-only).
 * Uses git cat-file blobs at a pinned commit — not worktree smudge copies.
 * Does NOT modify candidate SQL/manifest.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const COMMIT = process.env.ESC_REVIEW_COMMIT || '524ada4933c7d326e79cf69cb69bb88aed7a5c08';
const EXPECTED_SEAL = 'ae85b00270d3b89f6e8f57cb6851dec19aba2b860dd0de89126bc93643555d28';
const EXPECTED_BYTES = 1132090;
const OPTION_D_SHA = '9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359';

function gitShow(revPath) {
  return execFileSync('git', ['show', `${COMMIT}:${revPath}`], {
    cwd: ROOT,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function gitCatBlob(blobId) {
  return execFileSync('git', ['cat-file', 'blob', blobId], {
    cwd: ROOT,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
function md5(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}

function approxStatements(sql) {
  const body = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  return body.split(';').map((s) => s.trim()).filter(Boolean).length;
}

function extractMarkers(sql, beginRe) {
  const out = [];
  const re = beginRe;
  let m;
  while ((m = re.exec(sql))) out.push(m[1]);
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
  const re = /ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  let m;
  while ((m = re.exec(sql))) tables.add(m[1].replace(/^public\./, ''));
  return tables;
}

function findCreatePolicies(sql) {
  const out = [];
  const re = /CREATE\s+POLICY\s+"?([^"\s]+)"?\s+ON\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi;
  let m;
  while ((m = re.exec(sql))) out.push({ policy: m[1], table: m[2].replace(/^public\./, ''), index: m.index });
  return out;
}

function findGrantsPublicExecute(sql) {
  const out = [];
  const re = /GRANT\s+EXECUTE\s+ON\s+(?:FUNCTION|PROCEDURE|ALL\s+FUNCTIONS\s+IN\s+SCHEMA)\s+[^\n;]*\s+TO\s+(PUBLIC|anon|authenticated)/gi;
  let m;
  while ((m = re.exec(sql))) out.push({ match: m[0].slice(0, 160), index: m.index, to: m[1] });
  return out;
}

function findSecurityDefiner(sql) {
  const out = [];
  const re = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[\s\S]{0,400}?SECURITY\s+DEFINER/gi;
  let m;
  while ((m = re.exec(sql))) {
    const chunk = m[0];
    const name = (chunk.match(/FUNCTION\s+((?:public\.)?[a-zA-Z_][\w.]*)/i) || [])[1] || 'unknown';
    const hasSearchPath = /SET\s+search_path\s*=/i.test(chunk);
    out.push({ name, hasSearchPathInCreateChunk: hasSearchPath, index: m.index });
  }
  return out;
}

function findDml(sql, moduleLabel) {
  const findings = [];
  const patterns = [
    { kind: 'INSERT', re: /INSERT\s+INTO\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi },
    { kind: 'UPDATE', re: /UPDATE\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi },
    { kind: 'DELETE', re: /DELETE\s+FROM\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi },
    { kind: 'COPY', re: /COPY\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi },
    { kind: 'SETVAL', re: /setval\s*\(/gi },
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.re.exec(sql))) {
      if (p.kind === 'UPDATE' && /^(ONLY|SET)$/i.test(m[1] || '')) continue;
      const line = sql.slice(0, m.index).split('\n').length;
      findings.push({
        module: moduleLabel,
        kind: p.kind,
        target: p.kind === 'SETVAL' ? '(sequence)' : (m[1] || '').replace(/^public\./, ''),
        line,
        index: m.index,
      });
    }
  }
  return findings;
}

function lineAt(sql, index) {
  return sql.slice(0, index).split('\n').length;
}

function main() {
  const findings = [];
  function add(priority, code, module, detail, line) {
    findings.push({ priority, code, module, detail, line: line || null });
  }

  const manifestBuf = gitShow('supabase/migrations-draft/executable-squash-candidate/MANIFEST.json');
  const manifest = JSON.parse(manifestBuf.toString('utf8'));
  const odBuf = gitShow('docs/migration-remediation/option-d-replay-manifest.json');
  const odSha = sha256(odBuf);
  const od = JSON.parse(odBuf.toString('utf8'));

  const hashResults = [];
  let totalBytes = 0;
  const sealParts = [];

  for (const e of manifest.entries) {
    const blobBuf = gitCatBlob(e.gitBlobId);
    const showBuf = gitShow(e.path);
    const blobSha = sha256(blobBuf);
    const blobMd5 = md5(blobBuf);
    const showSha = sha256(showBuf);
    const ok =
      blobSha === e.sha256 &&
      blobMd5 === e.md5 &&
      blobBuf.length === e.utf8LfBytes &&
      showSha === e.sha256 &&
      !blobBuf.toString('binary').includes('\r');
    if (!ok) {
      add('P0', 'HASH_MISMATCH', e.name, `manifest sha=${e.sha256} blobSha=${blobSha} bytes=${blobBuf.length} vs ${e.utf8LfBytes}`);
    }
    // independent git hash-object of blob content
    const recomputedBlobId = execFileSync('git', ['hash-object', '--stdin'], {
      cwd: ROOT,
      input: blobBuf,
    })
      .toString()
      .trim();
    if (recomputedBlobId !== e.gitBlobId) {
      add('P0', 'BLOB_ID_MISMATCH', e.name, `manifest blob ${e.gitBlobId} recomputed ${recomputedBlobId}`);
    }
    totalBytes += blobBuf.length;
    sealParts.push(blobSha);
    const sql = blobBuf.toString('utf8');
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
      manifestMatch: ok && recomputedBlobId === e.gitBlobId,
      crlfPresent: sql.includes('\r'),
    });
  }

  const seal = sha256(Buffer.from(sealParts.join('\n'), 'utf8'));
  if (seal !== EXPECTED_SEAL || seal !== manifest.packageSha256OfConcatenatedEntryHashes) {
    add('P0', 'PACKAGE_SEAL_MISMATCH', 'package', `expected ${EXPECTED_SEAL} got ${seal}`);
  }
  if (totalBytes !== EXPECTED_BYTES) {
    add('P0', 'PACKAGE_BYTES_MISMATCH', 'package', `expected ${EXPECTED_BYTES} got ${totalBytes}`);
  }
  if (odSha !== OPTION_D_SHA) {
    add('P0', 'OPTION_D_MANIFEST_PIN_MISMATCH', 'option-d', `got ${odSha}`);
  }

  // Source accounting
  const order = od.ordering.dependencyOrder;
  const moduleSql = {};
  for (const e of manifest.entries) {
    moduleSql[e.order] = gitCatBlob(e.gitBlobId).toString('utf8');
  }

  const includedAssembled = new Set();
  const beginAssembled = /-- >>> begin ([^\n]+)\n/g;
  const beginGuarded = /-- >>> guarded ([^\n]+)\n/g;
  const beginForward = /-- >>> forward ([^\n]+)\n/g;

  for (const [ord, sql] of Object.entries(moduleSql)) {
    for (const f of extractMarkers(sql, new RegExp(beginAssembled.source, 'g'))) includedAssembled.add(f.trim());
    for (const f of extractMarkers(sql, new RegExp(beginGuarded.source, 'g'))) includedAssembled.add(f.trim());
  }
  // also foundations markers
  const m2 = moduleSql[2];
  if (m2.includes('20260701043598_public_users_derived_baseline.sql')) {
    includedAssembled.add('20260701043598_public_users_derived_baseline.sql');
  }
  if (m2.includes('20260701043599_foundations_baseline.sql')) {
    includedAssembled.add('20260701043599_foundations_baseline.sql');
  }
  // tcp1/grant markers
  if (moduleSql[7].includes('tcp1 schema without complimentary seed')) {
    includedAssembled.add('20260708120000_tcp1_w1_solo_bk_pilot_slots.sql');
  }
  if (moduleSql[7].includes('accounting connected grant schema-only')) {
    includedAssembled.add('20260814221500_accounting_canonical_connected_grant.sql');
  }

  const missingFromModules = [];
  const duplicated = [];
  const seen = new Map();
  // Count occurrences of each assembled filename marker across modules
  for (const [ord, sql] of Object.entries(moduleSql)) {
    const files = [
      ...extractMarkers(sql, /-- >>> begin ([^\n]+)\n/g),
      ...extractMarkers(sql, /-- >>> guarded ([^\n]+)\n/g),
      ...extractMarkers(sql, /-- >>> forward ([^\n]+)\n/g),
    ].map((s) => s.trim());
    // special foundations embeds
    if (Number(ord) === 2) {
      if (sql.includes('begin 20260701043598_public_users_derived_baseline.sql')) {
        files.push('20260701043598_public_users_derived_baseline.sql');
      }
      if (sql.includes('begin 20260701043599_foundations_baseline.sql')) {
        files.push('20260701043599_foundations_baseline.sql');
      }
    }
    if (Number(ord) === 7) {
      if (sql.includes('tcp1 schema without complimentary seed')) files.push('20260708120000_tcp1_w1_solo_bk_pilot_slots.sql');
      if (sql.includes('accounting connected grant schema-only')) {
        files.push('20260814221500_accounting_canonical_connected_grant.sql');
      }
    }
    for (const f of files) {
      if (!seen.has(f)) seen.set(f, []);
      const mods = seen.get(f);
      // count unique modules only (avoid double-detect in same module)
      if (!mods.includes(Number(ord))) mods.push(Number(ord));
    }
  }
  for (const f of order) {
    if (!seen.has(f)) missingFromModules.push(f);
  }
  for (const [f, mods] of seen.entries()) {
    if (mods.length > 1) duplicated.push({ file: f, modules: mods });
  }

  if (missingFromModules.length) {
    add(
      'P0',
      'SOURCE_MISSING_FROM_MODULES',
      'package',
      `${missingFromModules.length} Option D order entries not marked in modules: ${missingFromModules.slice(0, 20).join(', ')}`
    );
  }
  if (duplicated.length) {
    add('P0', 'SOURCE_DUPLICATED_ACROSS_MODULES', 'package', JSON.stringify(duplicated.slice(0, 20)));
  }

  // Disposition checks
  const m7 = moduleSql[7];
  if (/INSERT\s+INTO\s+public\.pilot_slots\s*\([\s\S]{0,400}00000000-0000-0000-0000-000000000001/i.test(m7)) {
    add('P0', 'TCP1_COMPLIMENTARY_SEED_PRESENT', 'esc_guarded_dataless_safe_initialization', 'complimentary seed INSERT present');
  }
  if (!/Seed\s*[—-]\s*OMITTED/i.test(m7)) {
    add('P1', 'TCP1_OMIT_MARKER_MISSING', 'esc_guarded_dataless_safe_initialization', 'expected OMITTED seed marker');
  }
  if (/LOCK\s+TABLE\s+public\.accounting_connections/i.test(m7)) {
    add('P0', 'GRANT_LOCK_PRESENT', 'esc_guarded_dataless_safe_initialization', 'operational LOCK present');
  }
  if (/Demo\s+Xero/i.test(m7) && /RAISE\s+EXCEPTION/i.test(m7) && m7.includes('accounting connected grant')) {
    // grant schema-only may still mention RAISE in comments? check body after marker
    const grantSection = m7.split('accounting connected grant')[1] || '';
    if (/LOCK\s+TABLE/i.test(grantSection) || (/RAISE\s+EXCEPTION/i.test(grantSection) && /UPDATE\s+public\.accounting_connections/i.test(grantSection))) {
      add('P0', 'GRANT_OPERATIONAL_BODY_PRESENT', 'esc_guarded_dataless_safe_initialization', 'LOCK/RAISE/UPDATE operational body present');
    }
  }
  for (const d6 of [
    '20260703_2000_d6_2a_test_client_activation.sql',
    '20260703_2200_d6_2b_mfg_activation.sql',
    '20260703_2300_d6_2c_retail_activation.sql',
    '20260703_2400_d6_2d_ps_activation.sql',
  ]) {
    if (!m7.includes(d6)) add('P0', 'D6_GUARD_MISSING', 'esc_guarded_dataless_safe_initialization', d6);
  }
  if (!/FROM\s+public\.firm_clients/i.test(m7)) {
    add('P0', 'D6_SELECT_GUARD_MISSING', 'esc_guarded_dataless_safe_initialization', 'expected INSERT…SELECT from firm_clients');
  }

  // Forward tail
  const m8 = moduleSql[8];
  const forwardFiles = extractMarkers(m8, /-- >>> forward ([^\n]+)\n/g).map((s) => s.trim());
  if (!forwardFiles.includes('20260906184500_publish_ledger_event_extensions_digest_qualify.sql')) {
    add('P0', 'FORWARD_TAIL_MISSING_DIGEST_QUALIFY', 'esc_forward_tail_main_unapplied', 'missing digest qualify forward');
  }
  // Challenge: other merged-but-unapplied by name may be missing (assertions part2/3, mc1, etc.)
  const suspectedForward = [
    '20260707130000_d_assertions_part_2_coverage_projection.sql',
    '20260707140000_d_assertions_part_3_coverage_statement.sql',
    '20260718010000_mc1_home_currency.sql',
    '20260718030000_mc4c_payment_batch_lines_currency.sql',
    '20260720150000_pulse_je_reliability_basis.sql',
  ];
  const forwardGaps = [];
  for (const f of suspectedForward) {
    const exists = fs.existsSync(path.join(ROOT, 'supabase/migrations', f));
    const inOd = order.includes(f) || order.some((o) => o.includes(f.replace(/\.sql$/, '').replace(/^\d{14}_/, '')));
    if (exists && !inOd && !forwardFiles.includes(f) && !m8.includes(f)) {
      forwardGaps.push(f);
    }
  }
  if (forwardGaps.length) {
    add(
      'P1',
      'FORWARD_TAIL_INCOMPLETE_CANDIDATES',
      'esc_forward_tail_main_unapplied',
      `git migrations possibly unrepresented: ${forwardGaps.join(', ')}`
    );
  }

  // Module boundary security: tables created vs RLS enabled within same module and cumulatively
  const boundaryMatrix = [];
  const cumulativeCreates = new Set();
  const cumulativeRls = new Set();
  for (let ord = 1; ord <= 8; ord++) {
    const sql = moduleSql[ord];
    const creates = findCreateTables(sql);
    const rls = findEnableRls(sql);
    for (const c of creates) cumulativeCreates.add(c.table);
    for (const t of rls) cumulativeRls.add(t);
    // Also CREATE TABLE ... ENABLE ROW LEVEL SECURITY inline? rare
    const inlineRls = /CREATE\s+TABLE[\s\S]{0,2000}?ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi.test(sql);
    const exposedAtBoundary = [...cumulativeCreates].filter((t) => !cumulativeRls.has(t));
    // Heuristic: tables created in this module without ENABLE RLS in same module
    const createdHere = new Set(creates.map((c) => c.table));
    const unsafeInModule = [...createdHere].filter((t) => !rls.has(t));
    boundaryMatrix.push({
      afterModule: ord,
      name: manifest.entries[ord - 1].name,
      tablesCreatedInModule: createdHere.size,
      rlsEnabledInModule: rls.size,
      unsafeCreatesInModuleWithoutRlsSameModule: unsafeInModule.slice(0, 50),
      unsafeCreatesInModuleCount: unsafeInModule.length,
      cumulativeTablesWithoutRlsYet: exposedAtBoundary.length,
      sampleCumulativeWithoutRls: exposedAtBoundary.slice(0, 40),
      inlineCreateEnableDetected: inlineRls,
    });
  }

  // P0 if module 4 creates tables without RLS and module 5 is where many RLS land
  const m4 = boundaryMatrix[3];
  const m5 = boundaryMatrix[4];
  if (m4.unsafeCreatesInModuleCount > 0) {
    add(
      'P0',
      'MODULE4_TABLES_WITHOUT_RLS_BEFORE_MODULE5',
      'esc_application_schema_lineage_body',
      `${m4.unsafeCreatesInModuleCount} CREATE TABLE without ENABLE RLS in same module; sample: ${m4.unsafeCreatesInModuleWithoutRlsSameModule.slice(0, 15).join(', ')}. Safe final state after module 5 is insufficient.`
    );
  }
  const finalNoRls = boundaryMatrix[7].sampleCumulativeWithoutRls || [];
  if (finalNoRls.length) {
    add(
      'P0',
      'FINAL_PACKAGE_TABLES_WITHOUT_RLS',
      'package',
      `Tables still without ENABLE RLS after all 8 modules: ${finalNoRls.join(', ')}`
    );
  }
  const m2b = boundaryMatrix[1];
  if (m2b.unsafeCreatesInModuleCount > 0) {
    // foundations may enable RLS in same file - check
    const foundationsRlsRatio = m2b.rlsEnabledInModule / Math.max(m2b.tablesCreatedInModule, 1);
    if (foundationsRlsRatio < 0.5) {
      add(
        'P0',
        'MODULE2_FOUNDATIONS_RLS_GAP',
        'esc_public_users_and_foundations_baseline',
        `${m2b.unsafeCreatesInModuleCount} tables created without same-module RLS enable; sample: ${m2b.unsafeCreatesInModuleWithoutRlsSameModule.slice(0, 15).join(', ')}`
      );
    } else {
      add(
        'P1',
        'MODULE2_PARTIAL_RLS_COVERAGE',
        'esc_public_users_and_foundations_baseline',
        `${m2b.unsafeCreatesInModuleCount} tables without detected ENABLE RLS in module 2`
      );
    }
  }

  // PUBLIC execute leakage scan across modules
  for (const e of manifest.entries) {
    const sql = moduleSql[e.order];
    const grants = findGrantsPublicExecute(sql);
    for (const g of grants) {
      const to = String(g.to).toLowerCase();
      if (to === 'public') {
        add('P0', 'PUBLIC_EXECUTE_GRANT', e.name, g.match, lineAt(sql, g.index));
      } else if (to === 'anon') {
        add('P0', 'ANON_EXECUTE_GRANT', e.name, g.match, lineAt(sql, g.index));
      } else if (to === 'authenticated') {
        add(
          'P2',
          'AUTHENTICATED_EXECUTE_GRANT_REVIEW',
          e.name,
          'Likely intentional product grant; confirm least-privilege: ' + g.match,
          lineAt(sql, g.index)
        );
      }
    }
    const defs = findSecurityDefiner(sql);
    for (const d of defs) {
      if (!d.hasSearchPathInCreateChunk) {
        add('P1', 'SECURITY_DEFINER_SEARCH_PATH_NOT_IN_CREATE_CHUNK', e.name, d.name, lineAt(sql, d.index));
      }
    }
  }

  // Nested transactions / BEGIN count in module 4
  const beginCount4 = (moduleSql[4].match(/^\s*BEGIN\s*;/gim) || []).length;
  const commitCount4 = (moduleSql[4].match(/^\s*COMMIT\s*;/gim) || []).length;
  if (beginCount4 > 5) {
    add(
      'P1',
      'MODULE4_NESTED_TRANSACTION_MARKERS',
      'esc_application_schema_lineage_body',
      `BEGIN count=${beginCount4} COMMIT count=${commitCount4} — concatenation preserves nested txn markers; replay runner risk`
    );
  }

  // Destructive statements
  for (const e of manifest.entries) {
    const sql = moduleSql[e.order];
    const destr = [...sql.matchAll(/\b(DROP\s+TABLE\s+(?!IF\s+EXISTS)|TRUNCATE\s+TABLE|DELETE\s+FROM\s+auth\.|DROP\s+SCHEMA\s+auth)\b/gi)];
    for (const d of destr) {
      add('P0', 'DESTRUCTIVE_STATEMENT', e.name, d[0], lineAt(sql, d.index));
    }
  }

  // Active migrations unchanged at commit
  const activeAtCommit = execFileSync(
    'git',
    ['ls-tree', '-r', '--name-only', COMMIT, 'supabase/migrations'],
    { cwd: ROOT }
  )
    .toString()
    .trim()
    .split('\n');
  if (activeAtCommit.some((f) => f.includes('202609070100'))) {
    add('P0', 'ACTIVE_MIGRATIONS_CONTAIN_ESC_VERSIONS', 'supabase/migrations', 'ESC versions leaked into active path');
  }

  // DML inventory
  const dmlAll = [];
  for (const e of manifest.entries) {
    dmlAll.push(...findDml(moduleSql[e.order], e.name));
  }

  // Schema comparison gaps
  const schemaGaps = {
    productionContractScope: 'foundation_and_phase1_only_47_tables',
    optionDFinalInventory: 'PASS_RUNTIME_151_not_a_full_prod_object_dump',
    packageClaimsCompleteProdMatch: false,
    mandatoryFullPgDumpBeforeReplay: true,
    rationale:
      'Static Option D lineage + partial G1 contract cannot prove zero unexplained drift vs live production (e.g. 424 policies). Review cannot substitute for sealed pg_dump --schema-only.',
    gaps: [
      'No full public table inventory seal in package vs live prod',
      'No full policy/function/trigger inventory seal vs live prod',
      'Module 4/5 split leaves mid-replay exposure window',
      'Forward-tail completeness vs all merged-main semantic unapplied migrations not fully proven',
    ],
  };

  // Verdict
  const p0 = findings.filter((f) => f.priority === 'P0');
  let verdict = 'PASS_SOURCE_REVIEW';
  if (p0.length) verdict = 'CHANGES REQUIRED';
  if (!hashResults.every((h) => h.manifestMatch) || seal !== EXPECTED_SEAL) verdict = 'BLOCKED';

  // If hash ok but security P0, CHANGES REQUIRED not BLOCKED
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
    optionDManifestSha256: odSha,
    candidateSqlAndManifestByteIdentical: hashResults.every((h) => h.manifestMatch) && seal === EXPECTED_SEAL,
    verdict,
    hashResults,
    sourceAccounting: {
      optionDEntries: order.length,
      markedOrDispositionedUnique: seen.size,
      missingFromModulesCount: missingFromModules.length,
      missingSample: missingFromModules.slice(0, 30),
      duplicatedCount: duplicated.length,
      duplicatedSample: duplicated.slice(0, 20),
      skippedCoveredByBaseline: (od.skippedCoveredByBaseline || []).length,
      substitutions: (od.substitutions || []).length,
    },
    failureBoundaryMatrix: boundaryMatrix,
    dmlInventory: {
      count: dmlAll.length,
      byKind: dmlAll.reduce((a, d) => {
        a[d.kind] = (a[d.kind] || 0) + 1;
        return a;
      }, {}),
      sample: dmlAll.slice(0, 100),
    },
    schemaGaps,
    findings: findings.sort((a, b) => a.priority.localeCompare(b.priority) || String(a.code).localeCompare(b.code)),
    findingCounts: {
      P0: findings.filter((f) => f.priority === 'P0').length,
      P1: findings.filter((f) => f.priority === 'P1').length,
      P2: findings.filter((f) => f.priority === 'P2').length,
      P3: findings.filter((f) => f.priority === 'P3').length,
    },
    remediationAuthorizationNeeded:
      'Authorize candidate package remediation to eliminate mid-replay exposure (co-locate RLS/grants with CREATE in modules 2/4 or merge 4+5), complete forward-tail accounting, and obtain a read-only full production pg_dump --schema-only seal — still no local replay until those land and re-review PASSes',
  };

  const outJson = path.join(
    ROOT,
    'docs/migration-remediation/evidence/executable-squash-candidate-source-review-2026-09-06.json'
  );
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log(
    JSON.stringify(
      {
        verdict,
        sealOk: seal === EXPECTED_SEAL,
        bytesOk: totalBytes === EXPECTED_BYTES,
        allHashesMatch: hashResults.every((h) => h.manifestMatch),
        missingSources: missingFromModules.length,
        duplicates: duplicated.length,
        p0: report.findingCounts.P0,
        p1: report.findingCounts.P1,
        m4UnsafeCreates: m4.unsafeCreatesInModuleCount,
        m2UnsafeCreates: m2b.unsafeCreatesInModuleCount,
        dmlCount: dmlAll.length,
        forwardGaps: forwardGaps.length,
        mandatoryPgDump: true,
      },
      null,
      2
    )
  );
}

main();
