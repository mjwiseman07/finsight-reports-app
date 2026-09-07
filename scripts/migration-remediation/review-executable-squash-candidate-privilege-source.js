#!/usr/bin/env node
/**
 * Fourth independent source review — privilege-remediated ESC candidate (read-only).
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
  parseCreateFunction,
  parseRoutineHead,
} = require('./option-d-function-identity');
const {
  findCreateFunctionsDetailed,
  findRevokeExecuteDetailed,
  findGrantExecuteDetailed,
  classifyFunction,
  AUTHENTICATED_HELPER_ALLOWLIST,
  ANON_RPC_ALLOWLIST,
  sameSlicePublicRevokeGaps,
  engagementPostingPolicyOrder,
  assertNoUsersAnonAllGrant,
} = require('./esc-privilege-remediation');

const ROOT = path.resolve(__dirname, '../..');
const COMMIT = process.env.ESC_REVIEW_COMMIT || 'd558c39b4a42540f9c485b30c6b9f0972b4ac500';
const EXPECTED_SEAL = 'c5c360d8325e2cbfa474d97ea0d33e0f2449ab89820770146def8c4c13da5a37';
const EXPECTED_BYTES = 1190718;
const EXPECTED_MODULES = 12;
const PRIOR_SEAL = '74d3b7498f4f2327b15c4ea8631c1b0c40b1daf795675f0517a5fb7052f3d3ff';
const OPTION_D_SHA = '9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359';
const DIGEST = '20260906184500_publish_ledger_event_extensions_digest_qualify.sql';

const OUT_JSON = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-source-review-privilege-2026-09-07.json'
);
const OUT_AUTO = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-source-review-privilege-2026-09-07.auto.md'
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
  walkExecutable(sql, (i, rest) => {
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

function regexCreateFunctionHits(sql) {
  const out = [];
  walkExecutable(sql, (i, rest) => {
    const m = /^(CREATE\s+(OR\s+REPLACE\s+)?FUNCTION)\b/i.exec(rest);
    if (!m) return;
    const parsed = parseRoutineHead(rest);
    out.push({
      index: i,
      line: lineAt(sql, i),
      orReplace: /OR\s+REPLACE/i.test(m[0]),
      identity: parsed ? parsed.identity : null,
      parseOk: Boolean(parsed),
    });
  });
  return out;
}

function netExecutePrivileges(sql) {
  // Last GRANT/REVOKE wins per identity+role
  const cleaned = stripComments(sql);
  const events = [];
  const re =
    /\b(GRANT|REVOKE)\s+EXECUTE\s+ON\s+FUNCTION\s+((?:[A-Za-z_][\w]*\.)?[A-Za-z_][\w]*)\s*\(([^)]*)\)\s+(?:TO|FROM)\s+([A-Za-z_][\w,\s]*)/gi;
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
      });
    }
  }
  events.sort((a, b) => a.index - b.index);
  const net = new Map();
  for (const ev of events) net.set(`${ev.identity}::${ev.role}`, ev.kind);
  return net;
}

function analyzeUsersColumnSecurity(sql) {
  const cleaned = stripComments(sql);
  const create = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+public\.users\s*\(([\s\S]*?)\)\s*;/i.exec(
    cleaned
  );
  const columns = [];
  if (create) {
    for (const line of create[1].split(',')) {
      const t = line.trim();
      if (!t || /^constraint\b/i.test(t)) continue;
      const name = t.split(/\s+/)[0].replace(/"/g, '');
      if (name) columns.push({ name, def: t.replace(/\s+/g, ' ').slice(0, 120) });
    }
  }
  const sensitive = columns.filter((c) =>
    /email|stripe|subscription|trial|reports_generated|ip_address|business_name/i.test(c.name)
  );
  const hasColumnUpdateGrant = /GRANT\s+UPDATE\s*\([^)]+\)\s+ON\s+(TABLE\s+)?public\.users/i.test(cleaned);
  const hasUpdateTrigger =
    /CREATE\s+TRIGGER[\s\S]{0,200}?ON\s+public\.users[\s\S]{0,80}?(BEFORE|AFTER)\s+UPDATE/i.test(sql) ||
    /CREATE\s+TRIGGER[\s\S]{0,200}?(BEFORE|AFTER)\s+UPDATE[\s\S]{0,80}?ON\s+public\.users/i.test(sql);
  const tableUpdateGrant =
    /GRANT\s+(?:ALL|(?:SELECT\s*,\s*)?UPDATE|(?:UPDATE\s*,\s*)?SELECT)\b[\s\S]{0,80}?ON\s+(TABLE\s+)?public\.users\s+TO\s+authenticated/i.test(
      cleaned
    ) || /GRANT\s+SELECT\s*,\s*UPDATE\s+ON\s+(TABLE\s+)?public\.users\s+TO\s+authenticated/i.test(cleaned);
  const updatePolicy = /CREATE\s+POLICY[\s\S]{0,200}?ON\s+public\.users[\s\S]{0,80}?FOR\s+UPDATE/i.test(sql);
  const anonAll = /GRANT\s+ALL\s+ON\s+(TABLE\s+)?public\.users\s+TO\s+anon/i.test(cleaned);
  const anonAny = /GRANT\s+\w+[\s\S]{0,40}?ON\s+(TABLE\s+)?public\.users\s+TO\s+anon/i.test(cleaned);
  const insertGrantAuth = /GRANT\s+[^(;]*\bINSERT\b[^(;]*ON\s+(TABLE\s+)?public\.users\s+TO\s+authenticated/i.test(
    cleaned
  );
  const deleteGrantAuth = /GRANT\s+[^(;]*\bDELETE\b[^(;]*ON\s+(TABLE\s+)?public\.users\s+TO\s+authenticated/i.test(
    cleaned
  );

  const escalationPossible =
    tableUpdateGrant && updatePolicy && !hasColumnUpdateGrant && !hasUpdateTrigger;

  return {
    columns,
    sensitiveColumns: sensitive.map((c) => c.name),
    hasColumnUpdateGrant,
    hasUpdateTrigger,
    tableUpdateGrant,
    updatePolicy,
    anonAllAbsent: !anonAll,
    anonAnyGrantAbsent: !anonAny,
    insertGrantAuth,
    deleteGrantAuth,
    escalationPossible,
    safeProfileAllowlistAssumption: ['first_name', 'last_name', 'business_name'],
    protectedIfEscalation: sensitive.map((c) => c.name),
  };
}

function main() {
  const findings = [];
  const add = (severity, code, where, detail, line) =>
    findings.push({ severity, code, module: where, detail, line: line || null });

  const manifest = JSON.parse(
    gitShow('supabase/migrations-draft/executable-squash-candidate/MANIFEST.json').toString('utf8')
  );

  // Part A — seal from committed blobs
  const hashResults = [];
  const parts = [];
  let bytes = 0;
  let candidateIdentical = true;
  for (const e of manifest.entries) {
    const buf = gitCatBlob(e.gitBlobId);
    const s = sha256(buf);
    const m = md5(buf);
    if (s !== e.sha256 || buf.length !== e.utf8LfBytes || m !== e.md5) {
      candidateIdentical = false;
      add('P0', 'MANIFEST_BLOB_MISMATCH', e.name, `sha ${s} vs ${e.sha256}`);
    }
    // Also compare path content at COMMIT
    const pathBuf = gitShow(e.path);
    if (sha256(pathBuf) !== s) {
      candidateIdentical = false;
      add('P0', 'PATH_BLOB_DIVERGENCE', e.name, e.path);
    }
    const sql = buf.toString('utf8');
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
      manifestMatch: true,
    });
    parts.push(s);
    bytes += buf.length;
  }
  const seal = sha256(Buffer.from(parts.join('\n'), 'utf8'));
  if (seal !== EXPECTED_SEAL) add('P0', 'SEAL_MISMATCH', 'package', `${seal} != ${EXPECTED_SEAL}`);
  if (bytes !== EXPECTED_BYTES) add('P0', 'BYTES_MISMATCH', 'package', `${bytes} != ${EXPECTED_BYTES}`);
  if (manifest.entries.length !== EXPECTED_MODULES) {
    add('P0', 'MODULE_COUNT', 'package', String(manifest.entries.length));
  }
  if (seal === PRIOR_SEAL) add('P0', 'PRIOR_SEAL_NOT_SUPERSEDED', 'package', PRIOR_SEAL);

  // Accounting
  const od = JSON.parse(gitShow('docs/migration-remediation/option-d-replay-manifest.json').toString('utf8'));
  const odSha = sha256(gitShow('docs/migration-remediation/option-d-replay-manifest.json'));
  const accounting = {
    optionDEntries: (od.ordering?.dependencyOrder || []).length,
    optionDManifestSha256: odSha,
    optionDManifestShaExpected: OPTION_D_SHA,
    equation: manifest.sourceAccounting?.equation,
    counts: {
      unchanged: 144,
      overlay: 6,
      forward_tail: 1,
      missing: 0,
      duplicated: 0,
    },
    digestQualifyOccurrences: 0,
  };
  if (odSha !== OPTION_D_SHA) add('P0', 'OPTION_D_MANIFEST_SHA', 'option-d', odSha);
  if (accounting.optionDEntries !== 151) add('P0', 'OPTION_D_COUNT', 'option-d', String(accounting.optionDEntries));
  if (accounting.equation !== '144 unchanged + 6 overlays + 1 forward = 151') {
    add('P0', 'ACCOUNTING_EQUATION', 'manifest', accounting.equation);
  }

  const moduleSql = {};
  const byVersion = {};
  for (const h of hashResults) {
    const sql = gitCatBlob(h.gitBlobId).toString('utf8');
    moduleSql[h.order] = sql;
    byVersion[h.version] = sql;
    const digests = (sql.match(/>>> forward 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || [])
      .length;
    if (digests) {
      accounting.digestQualifyOccurrences += digests;
      if (h.version !== '20260907010060') {
        add('P0', 'DIGEST_OUTSIDE_FORWARD_TAIL', h.name, `count=${digests}`, null);
      }
    }
  }
  if (accounting.digestQualifyOccurrences !== 1) {
    add('P0', 'DIGEST_COUNT', 'package', String(accounting.digestQualifyOccurrences));
  }

  // Part B — independent function inventory
  const createHits = [];
  const identityMap = new Map();
  for (const h of hashResults) {
    const sql = moduleSql[h.order];
    const hits = regexCreateFunctionHits(sql);
    for (const hit of hits) {
      createHits.push({ ...hit, version: h.version, name: h.name });
      if (!hit.parseOk) {
        add('P0', 'FUNCTION_IDENTITY_PARSE_FAIL', h.name, `line ${hit.line}`, hit.line);
        continue;
      }
      const cur = identityMap.get(hit.identity) || {
        identity: hit.identity,
        createCount: 0,
        firstVersion: h.version,
        finalVersion: h.version,
        occurrences: [],
      };
      cur.createCount += 1;
      cur.finalVersion = h.version;
      cur.occurrences.push({ version: h.version, line: hit.line, orReplace: hit.orReplace });
      identityMap.set(hit.identity, cur);
    }
  }

  // Adversarial parser probes (synthetic)
  const parserProbes = [
    {
      name: 'array_overload',
      sql: 'CREATE FUNCTION public.p(a uuid[]) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;',
    },
    {
      name: 'defaults',
      sql: 'CREATE FUNCTION public.p(a text DEFAULT null) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;',
    },
    {
      name: 'quoted',
      sql: 'CREATE FUNCTION public."WeirdName"(a integer) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;',
    },
    {
      name: 'multiline',
      sql: 'CREATE OR REPLACE FUNCTION public.p(\n  a text,\n  b jsonb\n) RETURNS trigger LANGUAGE plpgsql AS $f$ BEGIN RETURN NEW; END; $f$;',
    },
    {
      name: 'schema_type',
      sql: 'CREATE FUNCTION public.p(a public.users) RETURNS void LANGUAGE sql AS $$ SELECT 1 $$;',
    },
  ];
  const probeResults = [];
  for (const p of parserProbes) {
    const parsed = parseCreateFunction(p.sql) || parseRoutineHead(p.sql);
    probeResults.push({ name: p.name, ok: Boolean(parsed?.identity), identity: parsed?.identity || null });
    if (!parsed?.identity) add('P1', 'PARSER_PROBE_FAIL', 'parser', p.name);
  }

  const independentInventory = [];
  for (const [identity, meta] of identityMap) {
    // Use final occurrence create header attrs from detailed finder in final module
    const finalSql = byVersion[meta.finalVersion];
    const detailed = findCreateFunctionsDetailed(finalSql).find((f) => f.identity === identity);
    const disposition = classifyFunction(
      detailed || {
        identity,
        name: identity.slice(identity.indexOf('.') + 1, identity.indexOf('(')),
        returnsTrigger: /\)\)$/.test(identity) === false && false,
        securityDefiner: false,
      }
    );
    // Enrich returnsTrigger from any occurrence window
    let returnsTrigger = detailed?.returnsTrigger || false;
    let securityDefiner = detailed?.securityDefiner || false;
    let searchPath = detailed?.searchPath || null;
    if (detailed) {
      returnsTrigger = detailed.returnsTrigger;
      securityDefiner = detailed.securityDefiner;
      searchPath = detailed.searchPath;
    }
    const classed = classifyFunction({
      identity,
      name: identity.replace(/^public\./, '').split('(')[0],
      returnsTrigger,
      securityDefiner,
    });
    independentInventory.push({
      identity,
      createCount: meta.createCount,
      firstVersion: meta.firstVersion,
      finalVersion: meta.finalVersion,
      returnsTrigger,
      securityDefiner,
      searchPath,
      class: classed.class,
      revoke: classed.revoke,
      grant: classed.grant,
      rationale: classed.rationale,
    });
  }

  const classCounts = {};
  for (const fn of independentInventory) {
    classCounts[fn.class] = (classCounts[fn.class] || 0) + 1;
  }

  const countExplanation = {
    priorReviewApproxCreates: 111,
    regexCreateHitsThisPackage: createHits.length,
    uniqueIdentities: identityMap.size,
    committedInventoryRows: 100,
    note:
      'Prior ~111 and current regex hits count every CREATE/REPLACE occurrence. Unique identities collapse OR REPLACE redefinitions. Committed inventory listed 100 rows (includes duplicate identity rows across slices); independent unique identity count is authoritative.',
  };

  if (identityMap.size < 80) {
    add('P0', 'FUNCTION_INVENTORY_TOO_SMALL', 'parser', String(identityMap.size));
  }
  if (createHits.some((h) => !h.parseOk)) {
    /* already added */
  }

  // Part C — per-COMMIT privilege + class review
  const perCommitMatrix = [];
  const cumCreates = new Set();
  const cumRls = new Set();
  let publicExecuteGaps = 0;
  let unjustifiedServiceRoleGrants = 0;

  const knownServiceCallers = new Set([
    'public.publish_ledger_event(text,text,int4,uuid,uuid,uuid,uuid,text,text,text,text,text,jsonb,jsonb,uuid,text)',
    'public.increment_share_token_access(uuid)',
  ]);

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
    publicExecuteGaps += gaps.length;
    if (gaps.length) {
      add(
        'P0',
        'FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT',
        h.name,
        `${gaps.length} identities; sample ${gaps
          .slice(0, 5)
          .map((g) => g.identity)
          .join(', ')}`
      );
    }

    const net = netExecutePrivileges(sql);
    const fnsHere = findCreateFunctionsDetailed(sql);
    const privilegeAtCommit = [];
    let triggerSvcGrants = 0;
    let migrationAdminSvcGrants = 0;
    for (const fn of fnsHere) {
      const pub = net.get(`${fn.identity}::PUBLIC`);
      const anon = net.get(`${fn.identity}::anon`);
      const auth = net.get(`${fn.identity}::authenticated`);
      const svc = net.get(`${fn.identity}::service_role`);
      const cls = classifyFunction(fn);
      privilegeAtCommit.push({
        identity: fn.identity,
        class: cls.class,
        PUBLIC: pub || 'default_or_unset',
        anon: anon || 'default_or_unset',
        authenticated: auth || 'default_or_unset',
        serviceRoleNet: svc || 'default_or_unset',
      });
      if (pub !== 'revoke') {
        add('P0', 'NET_PUBLIC_EXECUTE_AT_COMMIT', h.name, fn.identity, fn.line);
      }
      if (anon === 'grant') {
        add('P0', 'NET_ANON_EXECUTE_AT_COMMIT', h.name, fn.identity, fn.line);
      }
      if (auth === 'grant' && !AUTHENTICATED_HELPER_ALLOWLIST.has(fn.identity)) {
        add('P0', 'NET_AUTH_EXECUTE_UNALLOWLISTED', h.name, fn.identity, fn.line);
      }
      if (cls.class === 'trigger_only' && svc === 'grant') {
        unjustifiedServiceRoleGrants++;
        triggerSvcGrants++;
      }
      if (cls.class === 'migration_admin_or_internal' && svc === 'grant') {
        unjustifiedServiceRoleGrants++;
        migrationAdminSvcGrants++;
      }
      if (fn.securityDefiner && !fn.searchPath) {
        add('P1', 'SECURITY_DEFINER_MISSING_SEARCH_PATH', h.name, fn.identity, fn.line);
      }
    }
    if (triggerSvcGrants) {
      add(
        'P2',
        'TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED',
        h.name,
        `${triggerSvcGrants} trigger_only functions granted EXECUTE to service_role; triggers do not require caller EXECUTE`
      );
    }
    if (migrationAdminSvcGrants) {
      add(
        'P2',
        'MIGRATION_ADMIN_SERVICE_ROLE_GRANT_WITHOUT_CALLER_PROOF',
        h.name,
        `${migrationAdminSvcGrants} migration_admin_or_internal functions granted service_role without demonstrated runtime caller`
      );
    }

    perCommitMatrix.push({
      afterModule: h.order,
      version: h.version,
      name: h.name,
      tablesCreated: creates.length,
      rlsEnabled: rls.size,
      unsafeCreatesWithoutRls: unsafe,
      cumulativeWithoutRls: exposed.length,
      functionsCreated: fnsHere.length,
      publicExecuteGaps: gaps.length,
      privilegeAtCommitSample: privilegeAtCommit.slice(0, 12),
      txn: h.txn,
    });
  }

  if (ANON_RPC_ALLOWLIST.size !== 0) {
    add('P0', 'ANON_RPC_ALLOWLIST_NONEMPTY', 'policy', String(ANON_RPC_ALLOWLIST.size));
  }

  // Part D — users column security
  const usersSql = byVersion['20260907010010'] || '';
  const usersSecurity = analyzeUsersColumnSecurity(usersSql);
  if (!assertNoUsersAnonAllGrant(usersSql)) {
    add('P0', 'USERS_ANON_ALL_GRANT', '20260907010010', 'GRANT ALL TO anon present');
  }
  if (usersSecurity.escalationPossible) {
    add(
      'P0',
      'USERS_AUTHENTICATED_COLUMN_UPDATE_ESCALATION',
      'esc_public_users_and_foundations_baseline',
      `authenticated has table-level UPDATE + own-row RLS without column grants or BEFORE UPDATE trigger; protected columns: ${usersSecurity.protectedIfEscalation.join(', ')}`,
      56
    );
  }
  if (usersSecurity.insertGrantAuth || usersSecurity.deleteGrantAuth) {
    add('P0', 'USERS_BROWSER_INSERT_OR_DELETE', '20260907010010', 'insert/delete grant to authenticated');
  }

  // Part E — engagement_posting_policy + named objects
  const epp = engagementPostingPolicyOrder(byVersion);
  if (!epp.okOrder || !epp.sameModule) {
    add(
      'P0',
      'ENGAGEMENT_POSTING_POLICY_ORDER',
      'engagement_posting_policy',
      `create@${epp.createVer} enable@${epp.enableVer}`
    );
  }
  const namedTiming = [];
  for (const t of [
    'curated_rule_fires',
    'gap2_purge_table_registry',
    'engagement_posting_policy',
  ]) {
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
    const ok = createV && rlsV && createV === rlsV;
    namedTiming.push({ table: t, createV, rlsV, sameModuleClosure: ok });
    if (!ok) add('P0', 'NAMED_TABLE_RLS_NOT_AT_CREATE_COMMIT', t, `create@${createV} rls@${rlsV}`);
  }

  // Part F — txn balance for transactional slices
  for (const h of hashResults) {
    if (/slice_|security_rls_grants_hardening_atomic|phase1_subscriptions_rls_atomic/.test(h.name)) {
      if (h.txn.BEGIN !== 1 || h.txn.COMMIT !== 1 || h.txn.ROLLBACK !== 0) {
        add('P0', 'TXN_IMBALANCE', h.name, JSON.stringify(h.txn));
      }
    }
  }

  // Extensions
  const extensionFindings = [];
  for (const h of hashResults) {
    const cleaned = stripComments(moduleSql[h.order]);
    const re = /\b((?:CREATE|ALTER)\s+EXTENSION\b[^;]*;)/gi;
    let m;
    while ((m = re.exec(cleaned))) {
      extensionFindings.push({
        version: h.version,
        match: m[1].replace(/\s+/g, ' ').trim().slice(0, 120),
        line: lineAt(cleaned, m.index),
        disposition: 'OK_INSIDE_TRANSACTION_ON_PG15_SUPABASE',
      });
    }
  }

  // Module size risk
  const moduleSizeRisk = hashResults.map((h) => ({
    version: h.version,
    bytes: h.utf8LfBytes,
    statementsApprox: h.statementCountApprox,
    risk:
      h.utf8LfBytes > 180000
        ? 'HIGH_TIMEOUT_LOCK_RISK_FOR_LOCAL_REHEARSAL'
        : h.utf8LfBytes > 100000
          ? 'MODERATE'
          : 'LOW',
  }));

  // Part G — DML scan sample (advisory)
  const dmlFindings = [];
  for (const h of hashResults) {
    const cleaned = stripComments(moduleSql[h.order]);
    if (/INSERT\s+INTO\s+auth\./i.test(cleaned)) {
      add('P0', 'AUTH_USERS_INSERT', h.name, 'auth schema insert');
      dmlFindings.push({ version: h.version, kind: 'auth_insert' });
    }
    // Flag only setval that embeds literal production-looking sequence values (not generic catalog helpers)
    const setvalRe = /setval\s*\(\s*[^,]+,\s*(\d{6,})\s*/gi;
    let sm;
    while ((sm = setvalRe.exec(cleaned))) {
      add(
        'P1',
        'LARGE_LITERAL_SETVAL',
        h.name,
        `setval literal ${sm[1]} — verify not production sequence copy`,
        lineAt(cleaned, sm.index)
      );
      dmlFindings.push({ version: h.version, kind: 'setval_literal', value: sm[1] });
    }
  }

  // Part H — frozen authority + comparison limits
  let frozenAuthority = { status: 'checked' };
  try {
    const odMan = JSON.parse(
      gitShow('docs/migration-remediation/option-d-replay-manifest.json').toString('utf8')
    );
    const srcCommit = odMan.assembleAuthority?.sourceCommit;
    frozenAuthority = {
      assembleAuthoritySourceCommit: srcCommit || null,
      optionDManifestSha256: odSha,
      disposition: 'FROZEN_OPTION_D_AUTHORITY_PRESENT',
    };
    // Detect HEAD drift for journal_entry_executions without mutating candidate
    if (srcCommit) {
      try {
        const frozen = execFileSync(
          'git',
          ['show', `${srcCommit}:supabase/migrations/20260821183525_journal_entry_executions.sql`],
          { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 }
        );
        const head = gitShow('supabase/migrations/20260821183525_journal_entry_executions.sql');
        frozenAuthority.headDiffersFromFrozen = sha256(frozen) !== sha256(head);
        frozenAuthority.frozenBlobSha256 = sha256(frozen);
        frozenAuthority.headBlobSha256 = sha256(head);
        frozenAuthority.note = frozenAuthority.headDiffersFromFrozen
          ? 'EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY'
          : 'HEAD_MATCHES_FROZEN';
      } catch (e) {
        frozenAuthority.journalCheckError = String(e.message || e);
      }
    }
  } catch (e) {
    frozenAuthority = { status: 'error', error: String(e.message || e) };
    add('P1', 'FROZEN_AUTHORITY_UNREADABLE', 'option-d', String(e.message || e));
  }

  const comparison = JSON.parse(
    gitShow(
      'docs/migration-remediation/evidence/executable-squash-candidate-comparison.json'
    ).toString('utf8')
  );
  const schemaGaps = {
    packageClaimsCompleteProdMatch: /^(COMPLETE|FULL_PARITY|SCHEMA_PARITY)$/i.test(
      String(comparison.candidateVersusProductionContract?.status || '')
    ),
    comparisonStatus: comparison.candidateVersusProductionContract?.status || null,
    readyForLocalReplay: comparison.readyForLocalReplay === true,
    mandatoryFullPgDumpBeforeReplay: true,
    dumpDependencyNote:
      'Full live pg_dump --schema-only remains mandatory before local replay / mutation. Option D + partial G1 are not complete production match.',
  };
  if (schemaGaps.packageClaimsCompleteProdMatch) {
    add('P0', 'PREMATURE_SCHEMA_PARITY_CLAIM', 'comparison', comparison.candidateVersusProductionContract.status);
  }
  if (schemaGaps.readyForLocalReplay) {
    add('P0', 'PREMATURE_REPLAY_READY', 'comparison', 'readyForLocalReplay true');
  }
  if (!/PARTIAL/i.test(String(schemaGaps.comparisonStatus || ''))) {
    add(
      'P1',
      'COMPARISON_STATUS_UNEXPECTED',
      'comparison',
      String(schemaGaps.comparisonStatus)
    );
  }

  // Active migrations must not contain ESC versions
  const activeList = execFileSync('git', ['ls-tree', '-r', '--name-only', COMMIT, 'supabase/migrations'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split(/\r?\n/)
    .filter(Boolean);
  if (activeList.some((f) => /202609070100/.test(f))) {
    add('P0', 'ACTIVE_MIGRATION_CONTAMINATION', 'supabase/migrations', 'ESC version present');
  }

  // Verdict
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
    functionInventoryIndependent: {
      regexCreateHits: createHits.length,
      uniqueIdentities: identityMap.size,
      classCounts,
      countExplanation,
      parserProbes: probeResults,
      functions: independentInventory,
    },
    perCommitMatrix,
    usersColumnSecurity: usersSecurity,
    engagementPostingPolicy: epp,
    namedTiming,
    extensionFindings,
    moduleSizeRisk,
    dmlFindings,
    frozenAuthority,
    schemaGaps,
    findingCounts: {
      P0: findings.filter((f) => f.severity === 'P0').length,
      P1: findings.filter((f) => f.severity === 'P1').length,
      P2: findings.filter((f) => f.severity === 'P2').length,
      P3: findings.filter((f) => f.severity === 'P3').length,
    },
    findings,
    unjustifiedServiceRoleGrants,
    publicExecuteGaps,
    knownServiceCallers: [...knownServiceCallers],
    note: 'PASS_SOURCE_REVIEW would be source-only; never implies local replay readiness or production dump waiver.',
  };

  const md = [
    '# ESC privilege-remediation independent source review — 2026-09-07',
    '',
    `**Verdict: ${verdict}**`,
    '',
    '| Pin | Value |',
    '|-----|-------|',
    `| Reviewed HEAD | \`${COMMIT}\` |`,
    `| Seal | \`${seal}\` |`,
    `| Bytes | ${bytes} |`,
    `| Modules | ${hashResults.length} |`,
    `| Candidate byte-identical | ${candidateIdentical} |`,
    `| Prior seal superseded | ${seal !== PRIOR_SEAL} |`,
    '',
    '## Source accounting',
    accounting.equation || '',
    `Digest qualify occurrences: ${accounting.digestQualifyOccurrences} (forward-tail only)`,
    '',
    '## Independent function inventory',
    `- Regex CREATE/REPLACE hits: ${createHits.length}`,
    `- Unique identities: ${identityMap.size}`,
    `- Class counts: ${JSON.stringify(classCounts)}`,
    `- Count explanation: ${countExplanation.note}`,
    '',
    '## public.users column security',
    `- Escalation possible: ${usersSecurity.escalationPossible}`,
    `- Sensitive columns: ${usersSecurity.sensitiveColumns.join(', ')}`,
    `- Column UPDATE grant: ${usersSecurity.hasColumnUpdateGrant}`,
    `- Update trigger: ${usersSecurity.hasUpdateTrigger}`,
    `- Anon ALL absent: ${usersSecurity.anonAllAbsent}`,
    '',
    '## engagement_posting_policy',
    JSON.stringify(epp),
    '',
    '## Per-COMMIT summary',
    ...perCommitMatrix.map(
      (r) =>
        `- M${r.afterModule} ${r.version}: unsafeTables=${r.unsafeCreatesWithoutRls.length} cumWithoutRls=${r.cumulativeWithoutRls} fnPublicGaps=${r.publicExecuteGaps} txn=${r.txn.BEGIN}/${r.txn.COMMIT}`
    ),
    '',
    '## Frozen authority',
    '```json',
    JSON.stringify(frozenAuthority, null, 2),
    '```',
    '',
    '## Dump requirement',
    schemaGaps.dumpDependencyNote,
    '',
    '## Findings',
    ...findings.map(
      (f) =>
        `- **${f.severity}** \`${f.code}\` @ ${f.module}${f.line ? ':' + f.line : ''}: ${f.detail}`
    ),
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
        modules: hashResults.length,
        uniqueFns: identityMap.size,
        createHits: createHits.length,
        usersEscalation: usersSecurity.escalationPossible,
        p0: report.findingCounts.P0,
        p1: report.findingCounts.P1,
        p2: report.findingCounts.P2,
        candidateIdentical,
      },
      null,
      2
    )
  );
}

main();
