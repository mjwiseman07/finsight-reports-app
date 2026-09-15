#!/usr/bin/env node
/**
 * Sixth independent source review — post fifth-findings remediation ESC candidate.
 * Authority: git cat-file / git show at pinned COMMIT only.
 * Does NOT modify candidate SQL or MANIFEST.json.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const {
  identityFromNameAndArgs,
  parseRoutineHead,
} = require('./option-d-function-identity');
const {
  findCreateFunctionsDetailed,
  classifyFunction,
  AUTHENTICATED_HELPER_ALLOWLIST,
  ANON_RPC_ALLOWLIST,
  SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST,
  SERVICE_ROLE_RPC_CALLER_EVIDENCE,
  SP_WRITE_ANCHOR_BATCH_DISPOSITION,
  sameSlicePublicRevokeGaps,
  engagementPostingPolicyOrder,
  assertNoUsersAnonAllGrant,
  assertNoUsersAuthenticatedTableUpdate,
  assertNoUsersUpdatePolicy,
} = require('./esc-privilege-remediation');

const ROOT = path.resolve(__dirname, '../..');
const COMMIT = process.env.ESC_REVIEW_COMMIT || 'c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6';
const EXPECTED_SEAL = '170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e';
const EXPECTED_BYTES = 1191852;
const EXPECTED_MODULES = 12;
const PRIOR_SEAL = '75b3466195ad01ae336cb1a5f6e89f29232757b2d048dd68ac9ad50bad1d049b';
const OPTION_D_SHA = '9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359';

const JE_DISPATCH = [
  'public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)',
  'public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)',
];

const OUT_JSON = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-source-review-sixth-2026-09-07.json'
);
const OUT_AUTO = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-source-review-sixth-2026-09-07.auto.md'
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
function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

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
    const prev = i > 0 ? sql[i - 1] : ' ';
    if (!/[A-Za-z0-9_]/.test(prev)) onTokenStart(i, sql.slice(i));
    i++;
  }
}

function countTxn(sql) {
  const controls = { BEGIN: 0, COMMIT: 0, ROLLBACK: 0, START: 0, intermediateCommitCount: 0 };
  let depth = 0;
  walkExecutable(sql, (_i, rest) => {
    const m =
      /^(BEGIN(\s+(WORK|TRANSACTION))?|START\s+TRANSACTION|COMMIT(\s+(WORK|TRANSACTION))?|ROLLBACK(\s+(WORK|TRANSACTION))?)\s*;/i.exec(
        rest
      );
    if (!m) return;
    const raw = m[0].toUpperCase();
    if (raw.startsWith('BEGIN') || raw.startsWith('START')) {
      if (raw.startsWith('BEGIN')) controls.BEGIN++;
      else controls.START++;
      depth++;
    } else if (raw.startsWith('COMMIT')) {
      controls.COMMIT++;
      if (depth > 1) controls.intermediateCommitCount++;
      depth = Math.max(0, depth - 1);
    } else if (raw.startsWith('ROLLBACK')) {
      controls.ROLLBACK++;
      depth = Math.max(0, depth - 1);
    }
  });
  return controls;
}

function countStatementsApprox(sql) {
  const body = stripComments(sql);
  return Math.max(body.split(';').map((s) => s.trim()).filter(Boolean).length, 1);
}

function findCreateTables(sql) {
  const cleaned = stripComments(sql);
  const out = [];
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi;
  let m;
  while ((m = re.exec(cleaned))) {
    const t = m[1].replace(/^public\./, '');
    if (!['if', 'not', 'exists', 'without'].includes(t.toLowerCase())) out.push(t);
  }
  return out;
}

function findEnableRls(sql) {
  const tables = new Set();
  const re =
    /ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  let m;
  while ((m = re.exec(sql))) tables.add(m[1].replace(/^public\./, ''));
  return tables;
}

function netExecutePrivileges(sql) {
  const cleaned = stripComments(sql);
  const events = [];
  const re =
    /\b(GRANT|REVOKE)\s+(?:ALL(?:\s+PRIVILEGES)?|EXECUTE)\s+ON\s+FUNCTION\s+((?:[A-Za-z_][\w]*\.)?[A-Za-z_][\w]*)\s*\(([^)]*)\)\s+(?:TO|FROM)\s+([A-Za-z_][\w,\s]*)/gi;
  let m;
  while ((m = re.exec(cleaned))) {
    const identity = identityFromNameAndArgs(m[2], m[3]);
    if (!identity) continue;
    const roles = m[4]
      .split(',')
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean)
      .map((r) => (r === 'public' ? 'PUBLIC' : r));
    for (const role of roles) {
      events.push({
        identity,
        role,
        kind: /^grant/i.test(m[1]) ? 'grant' : 'revoke',
        index: m.index,
        line: lineAt(cleaned, m.index),
      });
    }
  }
  events.sort((a, b) => a.index - b.index);
  const net = new Map();
  for (const ev of events) net.set(`${ev.identity}::${ev.role}`, ev);
  return net;
}

function discoverRpcCallers() {
  // Scan lib/ and app/ for .rpc("name") near getSupabaseAdmin/createServiceClient/supabaseAdmin
  const roots = ['lib', 'app'];
  const callers = new Map(); // name -> [{file, line, serviceLikely}]
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === '.git') continue;
        walk(p);
        continue;
      }
      if (!/\.(ts|tsx|js|jsx)$/.test(ent.name)) continue;
      const text = fs.readFileSync(p, 'utf8');
      const rel = path.relative(ROOT, p).replace(/\\/g, '/');
      const serviceLikely =
        /getSupabaseAdmin|createServiceClient|supabaseAdmin/.test(text) &&
        !/createBrowserClient/.test(text.split('.rpc')[0] || '');
      const re = /\.rpc\(\s*['"]([A-Za-z_][\w]*)['"]/g;
      let m;
      while ((m = re.exec(text))) {
        const name = m[1];
        const line = text.slice(0, m.index).split('\n').length;
        const window = text.slice(Math.max(0, m.index - 400), m.index + 80);
        const localService =
          /getSupabaseAdmin|createServiceClient|supabaseAdmin/.test(window) || serviceLikely;
        const arr = callers.get(name) || [];
        arr.push({ file: rel, line, serviceLikely: localService });
        callers.set(name, arr);
      }
    }
  }
  for (const r of roots) walk(path.join(ROOT, r));
  return callers;
}

function analyzeUsers(sql) {
  const cleaned = stripComments(sql);
  return {
    selectGrantAuth: /GRANT\s+SELECT\s+ON\s+(TABLE\s+)?public\.users\s+TO\s+authenticated/i.test(cleaned),
    updateRevokedAuth: /REVOKE\s+UPDATE\s+ON\s+(TABLE\s+)?public\.users\s+FROM\s+authenticated/i.test(
      cleaned
    ),
    noTableUpdateGrantAuth: assertNoUsersAuthenticatedTableUpdate(sql),
    noAnonAll: assertNoUsersAnonAllGrant(sql),
    revokeAnon: /REVOKE\s+ALL\s+ON\s+(TABLE\s+)?public\.users\s+FROM\s+anon/i.test(cleaned),
    revokePublic: /REVOKE\s+ALL\s+ON\s+(TABLE\s+)?public\.users\s+FROM\s+PUBLIC/i.test(cleaned),
    serviceAll: /GRANT\s+ALL\s+ON\s+(TABLE\s+)?public\.users\s+TO\s+service_role/i.test(cleaned),
    ownRowSelect: /FOR\s+SELECT[\s\S]{0,80}?auth\.uid\(\)\s*=\s*id/i.test(sql),
    staleUpdatePolicy: /FOR\s+UPDATE[\s\S]{0,80}?auth\.uid\(\)\s*=\s*id/i.test(sql),
    columnUpdateGrant: /GRANT\s+UPDATE\s*\([^)]+\)\s+ON\s+(TABLE\s+)?public\.users\s+TO\s+authenticated/i.test(
      cleaned
    ),
  };
}

function main() {
  const findings = [];
  const add = (severity, code, where, detail, line) =>
    findings.push({ severity, code, module: where, detail, line: line || null });

  const manifest = JSON.parse(
    gitShow('supabase/migrations-draft/executable-squash-candidate/MANIFEST.json').toString('utf8')
  );

  const hashResults = [];
  const parts = [];
  let bytes = 0;
  let candidateIdentical = true;
  const moduleSql = {};
  const byVersion = {};

  for (const e of manifest.entries) {
    const buf = gitCatBlob(e.gitBlobId);
    const s = sha256(buf);
    const m = md5(buf);
    if (s !== e.sha256 || buf.length !== e.utf8LfBytes || m !== e.md5) {
      candidateIdentical = false;
      add('P0', 'MANIFEST_BLOB_MISMATCH', e.name, `${s} vs ${e.sha256}`);
    }
    const pathBuf = gitShow(e.path);
    if (sha256(pathBuf) !== s) {
      candidateIdentical = false;
      add('P0', 'PATH_BLOB_DIVERGENCE', e.name, e.path);
    }
    const sql = buf.toString('utf8');
    moduleSql[e.order] = sql;
    byVersion[e.version] = sql;
    const txn = countTxn(sql);
    hashResults.push({
      order: e.order,
      version: e.version,
      name: e.name,
      path: e.path,
      gitBlobId: e.gitBlobId,
      sha256: s,
      md5: m,
      utf8LfBytes: buf.length,
      statementCountApprox: countStatementsApprox(sql),
      txn,
    });
    parts.push(s);
    bytes += buf.length;
  }

  const seal = sha256(Buffer.from(parts.join('\n'), 'utf8'));
  if (seal !== EXPECTED_SEAL) add('P0', 'SEAL_MISMATCH', 'package', `${seal} != ${EXPECTED_SEAL}`);
  if (bytes !== EXPECTED_BYTES) add('P0', 'BYTES_MISMATCH', 'package', `${bytes}`);
  if (manifest.entries.length !== EXPECTED_MODULES) add('P0', 'MODULE_COUNT', 'package', String(manifest.entries.length));
  if (seal === PRIOR_SEAL) add('P0', 'PRIOR_SEAL_NOT_SUPERSEDED', 'package', PRIOR_SEAL);

  const odBuf = gitShow('docs/migration-remediation/option-d-replay-manifest.json');
  const odSha = sha256(odBuf);
  const od = JSON.parse(odBuf.toString('utf8'));
  const accounting = {
    optionDEntries: (od.ordering?.dependencyOrder || []).length,
    optionDManifestSha256: odSha,
    equation: manifest.sourceAccounting?.equation,
    digestQualifyOccurrences: 0,
  };
  if (odSha !== OPTION_D_SHA) add('P0', 'OPTION_D_MANIFEST_SHA', 'option-d', odSha);
  if (accounting.optionDEntries !== 151) add('P0', 'OPTION_D_COUNT', 'option-d', String(accounting.optionDEntries));
  if (accounting.equation !== '144 unchanged + 6 overlays + 1 forward = 151') {
    add('P0', 'ACCOUNTING_EQUATION', 'manifest', accounting.equation);
  }

  for (const h of hashResults) {
    const digests = (moduleSql[h.order].match(/>>> forward 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || [])
      .length;
    if (digests) {
      accounting.digestQualifyOccurrences += digests;
      if (h.version !== '20260907010060') add('P0', 'DIGEST_OUTSIDE_FORWARD', h.name, String(digests));
    }
  }
  if (accounting.digestQualifyOccurrences !== 1) {
    add('P0', 'DIGEST_COUNT', 'package', String(accounting.digestQualifyOccurrences));
  }

  // Part B — users
  const usersSql = byVersion['20260907010010'] || '';
  const users = analyzeUsers(usersSql);
  if (!users.noAnonAll || !users.revokeAnon || !users.revokePublic) {
    add('P0', 'USERS_ANON_OR_PUBLIC_PRIVILEGE', '10010', JSON.stringify(users));
  }
  if (!users.selectGrantAuth || !users.updateRevokedAuth || !users.noTableUpdateGrantAuth || users.columnUpdateGrant) {
    add('P0', 'USERS_AUTHENTICATED_UPDATE_NOT_FULLY_REVOKED', '10010', JSON.stringify(users));
  }
  if (!users.ownRowSelect) add('P0', 'USERS_OWN_ROW_SELECT_RLS_MISSING', '10010', 'select policy');
  if (!assertNoUsersUpdatePolicy(usersSql)) {
    add(
      'P0',
      'USERS_STALE_UPDATE_RLS_POLICY_PRESENT',
      '10010',
      'FOR UPDATE own-row policy must be absent after fifth-findings remediation'
    );
  }
  if (!users.serviceAll) add('P1', 'USERS_SERVICE_ROLE_ALL_MISSING', '10010', 'expected GRANT ALL TO service_role');

  // Independent browser writer check (workspace files — review of current tree matching commit intent)
  const rpcCallers = discoverRpcCallers();
  // Spot-check: no browser update path string in app/components for users
  let browserUsersUpdate = false;
  for (const root of ['app', 'components']) {
    const abs = path.join(ROOT, root);
    if (!fs.existsSync(abs)) continue;
    const files = execFileSync('git', ['ls-tree', '-r', '--name-only', COMMIT, root], {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
    for (const f of files) {
      let text;
      try {
        text = gitShow(f).toString('utf8');
      } catch {
        continue;
      }
      if (/createBrowserClient|from\(['"]@\/lib\/supabase['"]\)/.test(text) && /\.from\(\s*['"]users['"]\s*\)[\s\S]{0,120}\.update\(/.test(text)) {
        browserUsersUpdate = true;
        add('P0', 'BROWSER_USERS_UPDATE_PATH', f, 'browser client updates public.users');
      }
    }
  }

  // Part C — functions
  const identityMap = new Map();
  let createHits = 0;
  for (const h of hashResults) {
    const fns = findCreateFunctionsDetailed(moduleSql[h.order]);
    createHits += fns.length;
    for (const fn of fns) {
      const cur = identityMap.get(fn.identity) || {
        identity: fn.identity,
        name: fn.name,
        createCount: 0,
        firstVersion: h.version,
        finalVersion: h.version,
        securityDefiner: fn.securityDefiner,
        searchPath: fn.searchPath,
        returnsTrigger: fn.returnsTrigger,
      };
      cur.createCount += 1;
      cur.finalVersion = h.version;
      cur.securityDefiner = fn.securityDefiner;
      cur.searchPath = fn.searchPath;
      cur.returnsTrigger = fn.returnsTrigger;
      identityMap.set(fn.identity, cur);
    }
  }

  const classCounts = {};
  const inventory = [];
  for (const [identity, meta] of identityMap) {
    const cls = classifyFunction({
      identity,
      name: meta.name,
      returnsTrigger: meta.returnsTrigger,
      securityDefiner: meta.securityDefiner,
    });
    classCounts[cls.class] = (classCounts[cls.class] || 0) + 1;
    inventory.push({ ...meta, class: cls.class, revoke: cls.revoke, grant: cls.grant });
  }

  // Final package net privileges across all modules in order
  const packageNet = new Map();
  for (const h of hashResults) {
    const net = netExecutePrivileges(moduleSql[h.order]);
    for (const [k, ev] of net) packageNet.set(k, { ...ev, version: h.version });
  }

  // Part B — four JE dispatch RPCs (after packageNet)
  const dispatchVerdicts = [];
  const slice34 = byVersion['20260907010034'] || '';
  const net34 = netExecutePrivileges(slice34);
  for (const identity of JE_DISPATCH) {
    const name = identity.replace(/^public\./, '').split('(')[0];
    const created = identityMap.has(identity);
    const svc = packageNet.get(`${identity}::service_role`);
    const auth = packageNet.get(`${identity}::authenticated`);
    const anon = packageNet.get(`${identity}::anon`);
    const pub = packageNet.get(`${identity}::PUBLIC`) || packageNet.get(`${identity}::public`);
    const sliceGrant = net34.get(`${identity}::service_role`);
    const callers = (rpcCallers.get(name) || []).filter((c) => c.serviceLikely);
    const v = {
      identity,
      created,
      netServiceRole: svc ? svc.kind : 'unset',
      netAuthenticated: auth ? auth.kind : 'unset',
      netAnon: anon ? anon.kind : 'unset',
      netPublic: pub ? pub.kind : 'unset',
      slice34ServiceRole: sliceGrant ? sliceGrant.kind : 'unset',
      callers,
    };
    dispatchVerdicts.push(v);
    if (!created) add('P0', 'JE_DISPATCH_IDENTITY_MISSING', '10034', identity);
    if (v.netServiceRole !== 'grant') {
      add('P0', 'JE_DISPATCH_SERVICE_ROLE_GRANT_MISSING', '10034', identity, svc && svc.line);
    }
    if (v.slice34ServiceRole !== 'grant') {
      add('P0', 'JE_DISPATCH_GRANT_CANCELLED_OR_MISSING_AT_SLICE', '10034', identity);
    }
    if (v.netAuthenticated === 'grant' || v.netAnon === 'grant' || v.netPublic === 'grant') {
      add('P0', 'JE_DISPATCH_BROWSER_ROLE_EXECUTE', '10034', identity);
    }
    if (!callers.length) add('P0', 'JE_DISPATCH_NO_SERVICE_CALLER', '10034', identity);
    if (!SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST.has(identity)) {
      add('P0', 'JE_DISPATCH_NOT_ON_EXACT_ALLOWLIST', 'policy', identity);
    }
  }

  // Dormant capability / kill-switch (static source at reviewed HEAD)
  const activation = gitShow(
    'lib/journal-entry-governance/je3d-first-controlled-create-activation.ts'
  ).toString('utf8');
  const production = gitShow(
    'lib/journal-entry-governance/production-activation-policy.ts'
  ).toString('utf8');
  const dormant = {
    createOff: /CREATE_SANDBOX_JE:\s*false/.test(activation),
    verifyOff: /VERIFY_SANDBOX_JE:\s*false/.test(activation),
    prepareOff: /PREPARE_SANDBOX_JE:\s*false/.test(activation),
    sandboxKillOn: /sandboxDispatchKillSwitch:\s*true/.test(activation),
    prodCreateOff: /CREATE_PRODUCTION_JE:\s*false/.test(production),
    prodVerifyOff: /VERIFY_PRODUCTION_JE:\s*false/.test(production),
    prodKillOn: /productionDispatchKillSwitch:\s*true/.test(production),
  };
  if (!dormant.createOff || !dormant.verifyOff || !dormant.prepareOff || !dormant.sandboxKillOn) {
    add('P0', 'DORMANT_SANDBOX_ACTIVATION_REGRESSION', 'je3d-activation', JSON.stringify(dormant));
  }
  if (!dormant.prodCreateOff || !dormant.prodVerifyOff || !dormant.prodKillOn) {
    add('P0', 'DORMANT_PRODUCTION_ACTIVATION_REGRESSION', 'production-activation', JSON.stringify(dormant));
  }

  // next_document_number + sp_write_anchor_batch
  const nextId = 'public.next_document_number(uuid,text)';
  const nextSvc = packageNet.get(`${nextId}::service_role`);
  const nextRpcHits = rpcCallers.get('next_document_number') || [];
  // Wrapper numbering.ts has .rpc; service modules pass createServiceClient() into it.
  const reqSvc = gitShow('lib/ap-intake/requisitions/service.ts').toString('utf8');
  const poSvc = gitShow('lib/ap-intake/purchase-orders/service.ts').toString('utf8');
  const numbering = gitShow('lib/ap-intake/requisitions/numbering.ts').toString('utf8');
  const nextServiceWrappers = [];
  if (/createServiceClient/.test(reqSvc) && /nextDocumentNumber/.test(reqSvc)) {
    nextServiceWrappers.push('lib/ap-intake/requisitions/service.ts');
  }
  if (/createServiceClient/.test(poSvc) && /nextDocumentNumber/.test(poSvc)) {
    nextServiceWrappers.push('lib/ap-intake/purchase-orders/service.ts');
  }
  const nextVerdict = {
    identity: nextId,
    netServiceRole: nextSvc ? nextSvc.kind : 'unset',
    rpcHits: nextRpcHits,
    serviceWrappers: nextServiceWrappers,
    numberingHasRpc: /rpc\(\s*["']next_document_number["']/.test(numbering),
    disposition: nextSvc && nextSvc.kind === 'grant' ? 'retain_svc_role_execute' : 'unexpected',
  };
  if (nextVerdict.netServiceRole !== 'grant') {
    add('P0', 'NEXT_DOCUMENT_NUMBER_SERVICE_ROLE_MISSING', '10031', nextId);
  }
  if (!nextVerdict.numberingHasRpc || nextServiceWrappers.length < 2) {
    add(
      'P0',
      'NEXT_DOCUMENT_NUMBER_NO_SERVICE_CALLER',
      'lib/ap-intake',
      JSON.stringify(nextVerdict)
    );
  } else {
    // Ensure retained-grant inventory treats wrapper+createServiceClient as proven service callers
    const arr = rpcCallers.get('next_document_number') || [];
    for (const f of nextServiceWrappers) {
      arr.push({ file: f, line: 0, serviceLikely: true });
    }
    rpcCallers.set('next_document_number', arr);
  }

  const anchorId = SP_WRITE_ANCHOR_BATCH_DISPOSITION.identity;
  const anchorSvc = packageNet.get(`${anchorId}::service_role`);
  const anchorCallers = rpcCallers.get('sp_write_anchor_batch') || [];
  let scriptAnchorHits = [];
  try {
    const scriptFiles = execFileSync('git', ['ls-tree', '-r', '--name-only', COMMIT, 'scripts'], {
      cwd: ROOT,
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .filter((f) => /\.(ts|tsx|js|jsx)$/.test(f));
    for (const f of scriptFiles) {
      let text;
      try {
        text = gitShow(f).toString('utf8');
      } catch {
        continue;
      }
      if (/\.rpc\(\s*['"]sp_write_anchor_batch['"]/.test(text)) {
        scriptAnchorHits.push(f);
      }
    }
  } catch {
    /* ignore */
  }
  const anchorVerdict = {
    identity: anchorId,
    netServiceRole: anchorSvc ? anchorSvc.kind : 'unset',
    libCallers: anchorCallers,
    scriptRpcHits: scriptAnchorHits,
    disposition: SP_WRITE_ANCHOR_BATCH_DISPOSITION.serviceRoleExecute,
  };
  if (anchorVerdict.netServiceRole === 'grant') {
    add('P0', 'SP_WRITE_ANCHOR_BATCH_SERVICE_ROLE_STILL_GRANTED', '10035', anchorId);
  }
  if (scriptAnchorHits.length) {
    add('P0', 'SP_WRITE_ANCHOR_BATCH_SCRIPT_RPC_CALLER_FOUND', 'scripts', scriptAnchorHits.join(','));
  }
  if (anchorCallers.filter((c) => c.serviceLikely).length) {
    add('P0', 'SP_WRITE_ANCHOR_BATCH_LIB_CALLER_BUT_REVOKED', 'lib', JSON.stringify(anchorCallers));
  }

  const retainedServiceRole = [];
  const revokedButCalled = [];
  for (const [identity, meta] of identityMap) {
    const key = `${identity}::service_role`;
    const ev = packageNet.get(key);
    const name = meta.name;
    const callers = rpcCallers.get(name) || [];
    const serviceCallers = callers.filter((c) => c.serviceLikely);
    if (ev && ev.kind === 'grant') {
      retainedServiceRole.push({
        identity,
        version: ev.version,
        line: ev.line,
        callers: serviceCallers,
        onAllowlist: SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST.has(identity),
        isHelper: AUTHENTICATED_HELPER_ALLOWLIST.has(identity),
      });
      if (!serviceCallers.length && !AUTHENTICATED_HELPER_ALLOWLIST.has(identity)) {
        add(
          'P1',
          'SERVICE_ROLE_EXECUTE_WITHOUT_PROVEN_CALLER',
          ev.version,
          identity,
          ev.line
        );
      }
    }
    if (serviceCallers.length && (!ev || ev.kind === 'revoke')) {
      revokedButCalled.push({ identity, callers: serviceCallers, net: ev ? ev.kind : 'unset' });
      add(
        'P0',
        'SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED',
        meta.finalVersion,
        `${identity} called by ${serviceCallers.map((c) => c.file + ':' + c.line).join(', ')} but net service_role EXECUTE is ${ev ? ev.kind : 'unset'}`,
        ev ? ev.line : null
      );
    }
  }

  // Compare independent retained internal grants vs committed report (exclude RLS helpers)
  let retainedReportDiff = { missingFromReport: [], extraInReport: [], ok: true };
  try {
    const committedReport = JSON.parse(
      gitShow(
        'docs/migration-remediation/evidence/executable-squash-candidate-retained-service-role-grants.json'
      ).toString('utf8')
    );
    const independentInternal = retainedServiceRole
      .filter((r) => !r.isHelper)
      .map((r) => r.identity)
      .sort();
    const reported = (committedReport.grants || []).map((g) => g.identity).sort();
    retainedReportDiff = {
      independentCount: independentInternal.length,
      reportedCount: reported.length,
      missingFromReport: independentInternal.filter((id) => !reported.includes(id)),
      extraInReport: reported.filter((id) => !independentInternal.includes(id)),
      committedSeal: committedReport.packageSeal,
      sealMatchesPackage: committedReport.packageSeal === EXPECTED_SEAL,
    };
    retainedReportDiff.ok =
      retainedReportDiff.missingFromReport.length === 0 &&
      retainedReportDiff.extraInReport.length === 0 &&
      retainedReportDiff.sealMatchesPackage;
    if (!retainedReportDiff.sealMatchesPackage) {
      add('P1', 'RETAINED_GRANT_REPORT_SEAL_MISMATCH', 'evidence', committedReport.packageSeal);
    }
    if (retainedReportDiff.missingFromReport.length || retainedReportDiff.extraInReport.length) {
      add(
        'P1',
        'RETAINED_GRANT_REPORT_DIFF',
        'evidence',
        JSON.stringify({
          missing: retainedReportDiff.missingFromReport,
          extra: retainedReportDiff.extraInReport,
        })
      );
    }
  } catch (e) {
    retainedReportDiff = { error: String(e.message || e), ok: false };
    add('P1', 'RETAINED_GRANT_REPORT_UNREADABLE', 'evidence', String(e.message || e));
  }

  // Trigger_only must not retain service_role grant
  for (const fn of inventory) {
    if (fn.class !== 'trigger_only') continue;
    const ev = packageNet.get(`${fn.identity}::service_role`);
    if (ev && ev.kind === 'grant') {
      add('P0', 'TRIGGER_ONLY_SERVICE_ROLE_EXECUTE', fn.finalVersion, fn.identity, ev.line);
    }
  }

  if (ANON_RPC_ALLOWLIST.size !== 0) add('P0', 'ANON_RPC_ALLOWLIST_NONEMPTY', 'policy', String(ANON_RPC_ALLOWLIST.size));

  // Per-COMMIT PUBLIC gaps + RLS
  const perCommitMatrix = [];
  const cumCreates = new Set();
  const cumRls = new Set();
  for (const h of hashResults) {
    const sql = moduleSql[h.order];
    const creates = findCreateTables(sql);
    const rls = findEnableRls(sql);
    for (const t of creates) cumCreates.add(t);
    for (const t of rls) cumRls.add(t);
    const unsafe = [...new Set(creates)].filter((t) => !rls.has(t));
    const exposed = [...cumCreates].filter((t) => !cumRls.has(t));
    if (unsafe.length) add('P0', 'SAME_MODULE_RLS_GAP', h.name, unsafe.join(', '));
    if (exposed.length) add('P0', 'CUMULATIVE_WITHOUT_RLS', h.name, exposed.join(', '));
    const gaps = sameSlicePublicRevokeGaps(sql);
    if (gaps.length) {
      add('P0', 'FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT', h.name, gaps.map((g) => g.identity).slice(0, 5).join(', '));
    }
    if (/slice_|security_rls_grants_hardening_atomic|phase1_subscriptions_rls_atomic/.test(h.name)) {
      if (h.txn.BEGIN !== 1 || h.txn.COMMIT !== 1 || h.txn.ROLLBACK !== 0) {
        add('P0', 'TXN_IMBALANCE', h.name, JSON.stringify(h.txn));
      }
    }
    perCommitMatrix.push({
      afterModule: h.order,
      version: h.version,
      name: h.name,
      tablesCreated: creates.length,
      unsafeCreatesWithoutRls: unsafe,
      cumulativeWithoutRls: exposed.length,
      publicExecuteGaps: gaps.length,
      txn: h.txn,
    });
  }

  // Part D — publish_ledger_event
  for (const h of hashResults) {
    const sql = moduleSql[h.order];
    const re =
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.publish_ledger_event\s*\([\s\S]*?SECURITY\s+DEFINER([\s\S]{0,120}?)AS\s+/gi;
    let m;
    while ((m = re.exec(sql))) {
      if (!/SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(m[1])) {
        add('P0', 'PLE_CREATE_MISSING_SEARCH_PATH', h.name, `line ${lineAt(sql, m.index)}`, lineAt(sql, m.index));
      }
    }
  }
  const fwd = byVersion['20260907010060'] || '';
  if (!/extensions\.digest\s*\([\s\S]*?sha256/i.test(fwd)) {
    add('P0', 'PLE_FORWARD_MISSING_EXTENSIONS_DIGEST', '10060', 'extensions.digest sha256 required');
  }

  // Named objects
  const epp = engagementPostingPolicyOrder(byVersion);
  if (!epp.okOrder || !epp.sameModule) {
    add('P0', 'ENGAGEMENT_POSTING_POLICY_ORDER', 'epp', JSON.stringify(epp));
  }
  for (const t of ['curated_rule_fires', 'gap2_purge_table_registry', 'engagement_posting_policy']) {
    let createV = null;
    let rlsV = null;
    for (const h of hashResults) {
      const sql = moduleSql[h.order];
      if (
        !createV &&
        new RegExp(String.raw`CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?${t}\b`, 'i').test(
          stripComments(sql)
        )
      ) {
        createV = h.version;
      }
      if (!rlsV && findEnableRls(sql).has(t)) rlsV = h.version;
    }
    if (!(createV && rlsV && createV === rlsV)) {
      add('P0', 'NAMED_TABLE_RLS_NOT_AT_CREATE', t, `create@${createV} rls@${rlsV}`);
    }
  }

  // Active migrations
  const activeList = execFileSync('git', ['ls-tree', '-r', '--name-only', COMMIT, 'supabase/migrations'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean);
  if (activeList.some((f) => /202609070100/.test(f))) {
    add('P0', 'ACTIVE_MIGRATION_CONTAMINATION', 'supabase/migrations', 'ESC version');
  }

  // Comparison scope
  const comparison = JSON.parse(
    gitShow('docs/migration-remediation/evidence/executable-squash-candidate-comparison.json').toString('utf8')
  );
  const schemaGaps = {
    comparisonStatus: comparison.candidateVersusProductionContract?.status || null,
    readyForLocalReplay: comparison.readyForLocalReplay === true,
    mandatoryFullPgDumpBeforeReplay: true,
    dumpDependencyNote:
      'Full live pg_dump --schema-only remains mandatory before local replay / mutation.',
  };
  if (schemaGaps.readyForLocalReplay) add('P0', 'PREMATURE_REPLAY_READY', 'comparison', 'true');
  if (!/PARTIAL/i.test(String(schemaGaps.comparisonStatus || ''))) {
    add('P1', 'COMPARISON_STATUS_UNEXPECTED', 'comparison', String(schemaGaps.comparisonStatus));
  }

  // Frozen authority
  let frozenAuthority = {};
  try {
    const odMan = JSON.parse(odBuf.toString('utf8'));
    const srcCommit = odMan.assembleAuthority?.sourceCommit;
    frozenAuthority = { assembleAuthoritySourceCommit: srcCommit || null, optionDManifestSha256: odSha };
    if (srcCommit) {
      const frozen = execFileSync(
        'git',
        ['show', `${srcCommit}:supabase/migrations/20260821183525_journal_entry_executions.sql`],
        { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 }
      );
      const head = gitShow('supabase/migrations/20260821183525_journal_entry_executions.sql');
      frozenAuthority.headDiffersFromFrozen = sha256(frozen) !== sha256(head);
      frozenAuthority.disposition = frozenAuthority.headDiffersFromFrozen
        ? 'EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY'
        : 'HEAD_MATCHES_FROZEN';
    }
  } catch (e) {
    frozenAuthority = { error: String(e.message || e) };
    add('P1', 'FROZEN_AUTHORITY_UNREADABLE', 'option-d', String(e.message || e));
  }

  const moduleSizeRisk = hashResults.map((h) => ({
    version: h.version,
    bytes: h.utf8LfBytes,
    risk: h.utf8LfBytes > 180000 ? 'HIGH_TIMEOUT_LOCK_RISK_FOR_LOCAL_REHEARSAL' : h.utf8LfBytes > 100000 ? 'MODERATE' : 'LOW',
  }));

  const p0 = findings.filter((f) => f.severity === 'P0');
  const verdict = p0.length ? 'CHANGES REQUIRED' : 'PASS_SOURCE_REVIEW';

  const report = {
    reviewedAt: new Date().toISOString(),
    reviewedHead: COMMIT,
    packageSealExpected: EXPECTED_SEAL,
    packageSealObserved: seal,
    priorSealSuperseded: seal !== PRIOR_SEAL,
    packageBytesExpected: EXPECTED_BYTES,
    packageBytesObserved: bytes,
    moduleCount: hashResults.length,
    candidateSqlAndManifestByteIdentical: candidateIdentical,
    verdict,
    hashResults,
    sourceAccounting: accounting,
    usersSecurity: {
      ...users,
      browserUsersUpdate,
      updatePolicyAbsent: assertNoUsersUpdatePolicy(usersSql),
    },
    jeDispatchVerdicts: dispatchVerdicts,
    nextDocumentNumberVerdict: nextVerdict,
    spWriteAnchorBatchVerdict: anchorVerdict,
    dormantActivation: dormant,
    retainedGrantReportDiff: retainedReportDiff,
    functionInventoryIndependent: {
      createHits,
      uniqueIdentities: identityMap.size,
      classCounts,
      inventory,
    },
    retainedServiceRoleGrants: retainedServiceRole,
    revokedButCalledServiceRoleRpcs: revokedButCalled,
    perCommitMatrix,
    engagementPostingPolicy: epp,
    moduleSizeRisk,
    frozenAuthority,
    schemaGaps,
    findingCounts: {
      P0: findings.filter((f) => f.severity === 'P0').length,
      P1: findings.filter((f) => f.severity === 'P1').length,
      P2: findings.filter((f) => f.severity === 'P2').length,
      P3: findings.filter((f) => f.severity === 'P3').length,
    },
    findings,
    scopeNote:
      'PASS_SOURCE_REVIEW is source/security/privilege/transaction/provenance scoped only. It does NOT claim production-schema parity, local replay readiness, or dump waiver.',
    note: 'Full live pg_dump --schema-only remains mandatory before local replay / mutation.',
  };

  const md = [
    '# ESC sixth independent source review — 2026-09-07',
    '',
    `**Verdict: ${verdict}**`,
    '',
    `| Reviewed HEAD | \`${COMMIT}\` |`,
    `| Seal | \`${seal}\` |`,
    `| Bytes | ${bytes} |`,
    `| Modules | ${hashResults.length} |`,
    `| Candidate byte-identical | ${candidateIdentical} |`,
    '',
    '## Accounting',
    accounting.equation || '',
    `Digest qualify: ${accounting.digestQualifyOccurrences}`,
    '',
    '## JE dispatch RPCs',
    ...dispatchVerdicts.map(
      (v) =>
        `- \`${v.identity}\` svc=${v.netServiceRole} auth=${v.netAuthenticated} callers=${v.callers.map((c) => c.file + ':' + c.line).join(',') || 'none'}`
    ),
    '',
    '## next_document_number / sp_write_anchor_batch',
    JSON.stringify({ nextVerdict, anchorVerdict }, null, 2),
    '',
    '## public.users',
    JSON.stringify(report.usersSecurity, null, 2),
    '',
    '## Function inventory',
    `- CREATE hits: ${createHits}`,
    `- Unique identities: ${identityMap.size}`,
    `- Classes: ${JSON.stringify(classCounts)}`,
    `- Retained service_role grants: ${retainedServiceRole.length}`,
    `- service_role revoked but called: ${revokedButCalled.length}`,
    `- Retained-report diff ok: ${retainedReportDiff.ok}`,
    '',
    '## Dormant activation',
    JSON.stringify(dormant),
    '',
    '## Findings',
    ...(findings.length
      ? findings.map(
          (f) => `- **${f.severity}** \`${f.code}\` @ ${f.module}${f.line ? ':' + f.line : ''}: ${f.detail}`
        )
      : ['- None']),
    '',
    '## Dump requirement',
    schemaGaps.dumpDependencyNote,
    '',
    '## Scope',
    report.scopeNote,
    '',
  ].join('\n');

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(OUT_AUTO, md, 'utf8');
  console.log(
    JSON.stringify(
      {
        verdict,
        seal,
        bytes,
        createHits,
        uniqueIdentities: identityMap.size,
        retainedSvc: retainedServiceRole.length,
        revokedButCalled: revokedButCalled.length,
        p0: report.findingCounts.P0,
        p1: report.findingCounts.P1,
        p2: report.findingCounts.P2,
        candidateIdentical,
        usersUpdatePolicyAbsent: report.usersSecurity.updatePolicyAbsent,
        dispatchOk: dispatchVerdicts.every((v) => v.netServiceRole === 'grant'),
        nextOk: nextVerdict.netServiceRole === 'grant',
        anchorRevoked: anchorVerdict.netServiceRole !== 'grant',
        dormantOk: Object.values(dormant).every(Boolean),
        retainedReportOk: retainedReportDiff.ok,
      },
      null,
      2
    )
  );
}

main();
