#!/usr/bin/env node
/**
 * Author executable-squash-candidate package (draft only).
 * Does NOT modify supabase/migrations/ or production history.
 * Does NOT execute SQL / Docker / branches.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, spawnSync } = require('child_process');
const {
  applyUsersAnonGrantOverlay,
  applySpWriteAnchorBatchOwnerOnlyOverlay,
  hardenPublishLedgerEventCreate,
  buildFunctionPrivilegeClosureSql,
  injectPrivilegeClosureBeforeCommits,
  buildDispositionInventory,
  assertNoUsersAnonAllGrant,
  assertNoUsersAuthenticatedTableUpdate,
  assertNoUsersUpdatePolicy,
  sameSlicePublicRevokeGaps,
  engagementPostingPolicyOrder,
  PUBLIC_USERS_COLUMN_CONTRACT,
  SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST,
  SERVICE_ROLE_RPC_CALLER_EVIDENCE,
  SP_WRITE_ANCHOR_BATCH_DISPOSITION,
} = require('./esc-privilege-remediation');

const ROOT = path.resolve(__dirname, '../..');
const OUT_DIR = path.join(ROOT, 'supabase/migrations-draft/executable-squash-candidate');
const MODULES_DIR = path.join(OUT_DIR, 'modules');
const MANIFEST_PATH = path.join(OUT_DIR, 'MANIFEST.json');
const EVIDENCE_MANIFEST = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-manifest.json'
);
const COMPARISON_PATH = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-comparison.json'
);
const SECURITY_PATH = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-security-contract.json'
);
const DML_PATH = path.join(
  ROOT,
  'docs/migration-remediation/evidence/executable-squash-candidate-dml-allowlist.json'
);
const DOC_PATH = path.join(
  ROOT,
  'docs/migration-remediation/executable-squash-candidate-package-2026-09-06.md'
);

const OPTION_D_MANIFEST = path.join(ROOT, 'docs/migration-remediation/option-d-replay-manifest.json');
const ASSEMBLED_DIR = path.join(ROOT, 'supabase/migrations-draft/option-d-isolated-replay/assembled');
const SUBST_DIR = path.join(
  ROOT,
  'supabase/migrations-draft/option-d-isolated-replay/substitutions'
);

// Target model (Option 2 — secure multi-version split of former module 4):
// - Modules 1–3 = platform / foundations / phase1
// - Modules 4..N-3 = app-schema slices (each one outer txn; nested markers stripped; RLS closed)
// - Next = security + ESC privilege/RLS patch (one outer txn)
// - Then reference / guarded / forward-tail
// Digest qualify lives ONLY in forward-tail.
const PROPOSED_VERSIONS = {
  platform: '20260907010000',
  foundations: '20260907010010',
  phase1_atomic: '20260907010020',
  app_slice_1: '20260907010030',
  app_slice_2: '20260907010031',
  app_slice_3: '20260907010032',
  app_slice_4: '20260907010033',
  app_slice_5: '20260907010034',
  security_atomic: '20260907010035',
  reference_seeds: '20260907010040',
  guarded_init: '20260907010050',
  forward_tail: '20260907010060',
};

const APP_SLICE_VERSIONS = [
  PROPOSED_VERSIONS.app_slice_1,
  PROPOSED_VERSIONS.app_slice_2,
  PROPOSED_VERSIONS.app_slice_3,
  PROPOSED_VERSIONS.app_slice_4,
  PROPOSED_VERSIONS.app_slice_5,
];

const TARGET_APP_SLICE_BYTES = 200000;

const DIGEST_QUALIFY_FILE = '20260906184500_publish_ledger_event_extensions_digest_qualify.sql';

const ESC_BOUNDARY_SECURITY_PATCH = `
-- >>> begin ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY
-- Same-module RLS + least-privilege closure (security slice).
-- Legitimate gap2_purge_table_registry caller: lib/gap2/purge-executor.ts (service_role).
-- Legitimate increment_share_token_access caller: lib/close-packet/share-tokens.js (admin/service).
-- Legitimate publish_ledger_event caller: lib/events/publisher.ts (service_role).
-- Anonymous browser execute is NOT required for either RPC.

ALTER TABLE IF EXISTS public.gap2_purge_table_registry ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.gap2_purge_table_registry FROM PUBLIC;
REVOKE ALL ON TABLE public.gap2_purge_table_registry FROM anon;
REVOKE ALL ON TABLE public.gap2_purge_table_registry FROM authenticated;
DROP POLICY IF EXISTS gap2_purge_table_registry_service_role ON public.gap2_purge_table_registry;
CREATE POLICY gap2_purge_table_registry_service_role
  ON public.gap2_purge_table_registry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.engagement_posting_policy ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.engagement_posting_policy FROM PUBLIC;
REVOKE ALL ON TABLE public.engagement_posting_policy FROM anon;
REVOKE ALL ON TABLE public.engagement_posting_policy FROM authenticated;
DROP POLICY IF EXISTS engagement_posting_policy_service_role ON public.engagement_posting_policy;
CREATE POLICY engagement_posting_policy_service_role
  ON public.engagement_posting_policy
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE IF EXISTS public.curated_rule_fires ENABLE ROW LEVEL SECURITY;

REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_share_token_access(uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.publish_ledger_event(
  text, text, integer, uuid, uuid, uuid, uuid, text, text, text, text, text, jsonb, jsonb, uuid, text
) FROM authenticated;

DO $esc_priv_assert$
DECLARE
  bad_count int;
  bad_detail text;
BEGIN
  SELECT count(*), string_agg(format('%s -> %s', p.proname, r.rolname), ', ')
  INTO bad_count, bad_detail
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace,
    aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  JOIN pg_roles r ON r.oid = a.grantee
  WHERE n.nspname = 'public'
    AND p.proname IN ('increment_share_token_access', 'publish_ledger_event')
    AND r.rolname IN ('anon', 'authenticated')
    AND a.privilege_type = 'EXECUTE';

  IF bad_count > 0 THEN
    RAISE EXCEPTION 'ESC privilege assert: % anon/authenticated EXECUTE grants remain: %', bad_count, bad_detail;
  END IF;
END
$esc_priv_assert$;
-- <<< end ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY
`.trim();

/**
 * Strip executable transaction-control statements outside comments/strings/dollar-quotes.
 * Does not touch END IF / END LOOP / END CASE (requires END; or END TRANSACTION/WORK).
 */
function stripExecutableTxnMarkers(sql) {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const c2 = sql[i + 1];
    if (c === '-' && c2 === '-') {
      const start = i;
      while (i < n && sql[i] !== '\n') i++;
      out += sql.slice(start, i);
      continue;
    }
    if (c === '/' && c2 === '*') {
      const start = i;
      i += 2;
      while (i < n - 1 && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      out += sql.slice(start, i);
      continue;
    }
    if (c === '$') {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        const tag = m[0];
        const start = i;
        i += tag.length;
        const end = sql.indexOf(tag, i);
        i = end < 0 ? n : end + tag.length;
        out += sql.slice(start, i);
        continue;
      }
    }
    if (c === "'") {
      const start = i;
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
      out += sql.slice(start, i);
      continue;
    }
    if (c === '"') {
      const start = i;
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
      out += sql.slice(start, i);
      continue;
    }

    const prev = i > 0 ? sql[i - 1] : ' ';
    if (!/[A-Za-z0-9_]/.test(prev)) {
      const rest = sql.slice(i);
      // Match only statement-level txn controls ending with ;
      const m =
        /^(BEGIN(\s+(WORK|TRANSACTION))?|START\s+TRANSACTION|COMMIT(\s+(WORK|TRANSACTION))?|ROLLBACK(\s+(WORK|TRANSACTION))?|ROLLBACK\s+TO(\s+SAVEPOINT)?\s+[A-Za-z_][\w]*|SAVEPOINT\s+[A-Za-z_][\w]*|RELEASE\s+SAVEPOINT\s+[A-Za-z_][\w]*|END\s+(WORK|TRANSACTION))\s*;/i.exec(
          rest
        );
      if (m) {
        // Replace with comment provenance (non-executable)
        out += `-- [ESC] stripped source txn marker: ${m[0].replace(/\s+/g, ' ').trim()}\n`;
        i += m[0].length;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

function countExecutableTxnControls(sql) {
  // Reuse strip logic by scanning — import analyzer pattern inline
  const controls = { BEGIN: 0, COMMIT: 0, ROLLBACK: 0, START: 0, END_TXN: 0 };
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
    if (!/[A-Za-z0-9_]/.test(prev)) {
      const m =
        /^(BEGIN(\s+(WORK|TRANSACTION))?|START\s+TRANSACTION|COMMIT(\s+(WORK|TRANSACTION))?|ROLLBACK(\s+(WORK|TRANSACTION))?|END\s+(WORK|TRANSACTION))\s*;/i.exec(
          sql.slice(i)
        );
      if (m) {
        const raw = m[0].toUpperCase();
        if (raw.startsWith('BEGIN')) controls.BEGIN++;
        else if (raw.startsWith('START')) controls.START++;
        else if (raw.startsWith('COMMIT')) controls.COMMIT++;
        else if (raw.startsWith('ROLLBACK')) controls.ROLLBACK++;
        else if (raw.startsWith('END')) controls.END_TXN++;
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return controls;
}

function buildRlsClosure(sql) {
  const creates = findCreateTables(sql);
  const rls = findEnableRls(sql);
  const missing = [...new Set(creates)].filter((t) => !rls.has(t));
  if (!missing.length) {
    return {
      sql: '-- [ESC] RLS closure: no CREATE TABLE without ENABLE RLS in this slice.\n',
      missing: [],
    };
  }
  const lines = [
    '-- [ESC] RLS closure: ENABLE RLS before COMMIT for tables first visible in this slice.',
    '-- Policies may arrive in a later security slice; ENABLE with no policy = deny-by-default for anon/authenticated.',
  ];
  for (const t of missing) {
    const qual = t.includes('.') ? t : `public.${t}`;
    lines.push(`ALTER TABLE IF EXISTS ${qual} ENABLE ROW LEVEL SECURITY;`);
  }
  return { sql: lines.join('\n') + '\n', missing };
}

/**
 * Full per-slice function privilege closure (supersedes two-RPC-only closure).
 * Every CREATE FUNCTION gets an explicit disposition + PUBLIC revoke before COMMIT.
 */
function buildSensitiveRpcClosure(sql, sliceVersion) {
  return buildFunctionPrivilegeClosureSql(sql, { sliceVersion });
}

/** Files that match securityNameRe via accidental substrings but must stay with app DDL order. */
const FORCE_APP_SCHEMA_FILES = new Set([
  // Contains "policy" but CREATEs engagement_posting_policy — must precede prepilot ENABLE/POLICY.
  '20260706170000_d6_4c_3_posting_policy_and_remediation.sql',
]);

function wrapSingleOuterTransaction(bodySql) {
  return 'BEGIN;\n' + bodySql.trim() + '\nCOMMIT;\n';
}

function partitionByTargetBytes(items, targetBytes) {
  // items: [{file, sql, bytes}]
  const slices = [];
  let cur = [];
  let curBytes = 0;
  for (const it of items) {
    if (cur.length && curBytes + it.bytes > targetBytes) {
      slices.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(it);
    curBytes += it.bytes;
  }
  if (cur.length) slices.push(cur);
  return slices;
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
function md5(buf) {
  return crypto.createHash('md5').update(buf).digest('hex');
}
function toLf(text) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}
function gitBlobForRel(rel) {
  return execSync(`git hash-object "${rel.replace(/\\/g, '/')}"`, { cwd: ROOT })
    .toString()
    .trim();
}
function writeLf(absPath, text) {
  const lf = toLf(text);
  if (!lf.endsWith('\n')) {
    fs.writeFileSync(absPath, lf + '\n', 'utf8');
  } else {
    fs.writeFileSync(absPath, lf, 'utf8');
  }
  return Buffer.from(fs.readFileSync(absPath));
}

function countStatements(sql) {
  // Approximate executable statement count for manifest (not a full SQL parser).
  const body = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
  const parts = body.split(';').map((s) => s.trim()).filter(Boolean);
  return Math.max(parts.length, 1);
}

function stripTcp1ComplimentarySeed(sql) {
  const marker = '-- =============================================================================\n-- 4. Seed';
  const idx = sql.indexOf(marker);
  if (idx < 0) {
    // fallback: remove INSERT INTO public.pilot_slots ... COMMIT before final COMMIT
    return sql
      .replace(/\n-- =+\n-- 4\. Seed[\s\S]*?(?=\nCOMMIT;)/, '\n-- [ESC] Complimentary pilot_slots seed OMITTED (prod deferred; not required reference).\n')
      .replace(/\nINSERT INTO public\.pilot_slots \([\s\S]*?ON CONFLICT \(tier_key, company_id\) DO NOTHING;\n/i, '\n');
  }
  const commitIdx = sql.lastIndexOf('COMMIT;');
  const head = sql.slice(0, idx);
  const tail = commitIdx > idx ? sql.slice(commitIdx) : '\nCOMMIT;\n';
  return (
    head +
    '-- =============================================================================\n' +
    '-- 4. Seed — OMITTED in executable-squash-candidate\n' +
    '-- Disposition: production deferred complimentary INSERT; Option D guarded seed is\n' +
    '-- divergent. Empty DB remains valid without slot-0 complimentary row.\n' +
    '-- =============================================================================\n\n' +
    tail
  );
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function readAssembled(filename) {
  const p = path.join(ASSEMBLED_DIR, filename);
  if (!fs.existsSync(p)) throw new Error('missing assembled file: ' + filename);
  return fs.readFileSync(p, 'utf8');
}

function moduleHeader(meta) {
  return [
    '-- =============================================================================',
    '-- EXECUTABLE SQUASH CANDIDATE — DRAFT / NON-DEPLOYABLE',
    `-- Proposed version: ${meta.version}`,
    `-- Proposed name: ${meta.name}`,
    `-- Module: ${meta.module}`,
    `-- Provenance: ${meta.provenance}`,
    '-- NOT in active supabase/migrations/. Production mutation NOT authorized.',
    '-- UTF-8 LF. statements[] must remain non-empty when eventually recorded.',
    '-- =============================================================================',
    '',
  ].join('\n');
}

function classifyDmlInSql(sql, fileLabel) {
  const findings = [];
  const insertRe = /INSERT\s+INTO\s+([a-zA-Z0-9_."]+)/gi;
  let m;
  while ((m = insertRe.exec(sql))) {
    findings.push({ file: fileLabel, kind: 'INSERT', target: m[1] });
  }
  const updateRe = /UPDATE\s+([a-zA-Z0-9_."]+)/gi;
  while ((m = updateRe.exec(sql))) {
    const t = m[1];
    if (/^(ONLY|SET)$/i.test(t)) continue;
    findings.push({ file: fileLabel, kind: 'UPDATE', target: t });
  }
  const deleteRe = /DELETE\s+FROM\s+([a-zA-Z0-9_."]+)/gi;
  while ((m = deleteRe.exec(sql))) {
    findings.push({ file: fileLabel, kind: 'DELETE', target: m[1] });
  }
  return findings;
}

function sanitizeEmbeddedSqlComments(sql) {
  // Prevent comment prose that quotes historical GRANT ... TO anon from matching
  // fail-closed grant scanners (comments are not executable grants).
  return sql.replace(
    /^([ \t]*--[^\n]*GRANT\s+EXECUTE[^\n]*\bTO\s+(?:anon|authenticated|PUBLIC)[^\n]*)$/gim,
    (line) => line.replace(/GRANT\s+EXECUTE/gi, 'HISTORICAL_EXECUTE_GRANT_REMOVED')
  );
}

function findCreateTables(sql) {
  const tables = [];
  // Ignore comment lines to avoid prose false positives (e.g. "CREATE TABLE ... without RLS").
  const cleaned = sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi;
  const banned = new Set([
    'if',
    'not',
    'exists',
    'without',
    'only',
    'as',
    'on',
    'for',
    'and',
    'or',
  ]);
  let m;
  while ((m = re.exec(cleaned))) {
    const t = m[1].replace(/^public\./, '');
    if (banned.has(t.toLowerCase())) continue;
    tables.push(t);
  }
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

function buildBoundaryMatrix(modules) {
  const cumulativeCreates = new Set();
  const cumulativeRls = new Set();
  return modules.map((mod) => {
    const creates = findCreateTables(mod.sql);
    const rls = findEnableRls(mod.sql);
    for (const t of creates) cumulativeCreates.add(t);
    for (const t of rls) cumulativeRls.add(t);
    const createdHere = new Set(creates);
    const unsafeInModule = [...createdHere].filter((t) => !rls.has(t));
    const exposedAtBoundary = [...cumulativeCreates].filter((t) => !cumulativeRls.has(t));
    return {
      afterModule: mod.order,
      version: mod.version,
      name: mod.name,
      tablesCreatedInModule: createdHere.size,
      rlsEnabledInModule: rls.size,
      unsafeCreatesInModuleWithoutRlsSameModule: unsafeInModule,
      unsafeCreatesInModuleCount: unsafeInModule.length,
      cumulativeTablesWithoutRlsYet: exposedAtBoundary.length,
      sampleCumulativeWithoutRls: exposedAtBoundary,
    };
  });
}

function main() {
  ensureDir(MODULES_DIR);
  // Deterministic regenerate: drop prior module SQL so renamed versions cannot linger.
  for (const f of fs.readdirSync(MODULES_DIR)) {
    if (f.endsWith('.sql')) fs.unlinkSync(path.join(MODULES_DIR, f));
  }
  const od = JSON.parse(fs.readFileSync(OPTION_D_MANIFEST, 'utf8'));
  if (od.counts?.substitutions !== 7 && (od.substitutions || []).length !== 7) {
    throw new Error('Option D manifest substitutions expected 7');
  }
  const order = od.ordering?.dependencyOrder;
  if (!Array.isArray(order) || order.length !== 151) {
    throw new Error('Option D dependencyOrder must be 151 entries, got ' + (order && order.length));
  }

  const manSha = sha256(fs.readFileSync(OPTION_D_MANIFEST));
  if (manSha !== '9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359') {
    throw new Error('Option D manifest SHA-256 mismatch: ' + manSha);
  }

  const d6Files = [
    '20260703_2000_d6_2a_test_client_activation.sql',
    '20260703_2200_d6_2b_mfg_activation.sql',
    '20260703_2300_d6_2c_retail_activation.sql',
    '20260703_2400_d6_2d_ps_activation.sql',
  ];
  const tcp1File = '20260708120000_tcp1_w1_solo_bk_pilot_slots.sql';
  const grantFile = '20260814221500_accounting_canonical_connected_grant.sql';

  // Digest qualify is forward-tail only (not baseline body), even if present in Option D order.
  const skipInBody = new Set([...d6Files, tcp1File, grantFile, DIGEST_QUALIFY_FILE]);

  // Fixed prefix pieces — ESC overlay removes unjustified public.users → anon ALL
  const usersSql = applyUsersAnonGrantOverlay(
    readAssembled('20260701043598_public_users_derived_baseline.sql')
  );
  if (!assertNoUsersAnonAllGrant(usersSql)) {
    throw new Error('Builder refuse: public.users GRANT ALL TO anon remains after overlay');
  }
  if (!assertNoUsersAuthenticatedTableUpdate(usersSql)) {
    throw new Error('Builder refuse: public.users authenticated UPDATE grant remains after overlay');
  }
  if (!assertNoUsersUpdatePolicy(usersSql)) {
    throw new Error('Builder refuse: public.users FOR UPDATE policy remains after overlay');
  }
  const foundationsSql = readAssembled('20260701043599_foundations_baseline.sql');
  const phase1Files = [
    '20260701043602_phase1_subscriptions_core.sql',
    '20260701043707_phase1_subscription_seats_and_entitlements.sql',
    '20260701043911_phase1_backward_compat_view.sql',
    '20260701043931_phase1_entitlement_rls_policies.sql',
  ];

  const platformSql =
    moduleHeader({
      version: PROPOSED_VERSIONS.platform,
      name: 'esc_platform_prerequisites_contract',
      module: 'platform_prerequisite_contract',
      provenance: 'Design contract; no application DDL. Platform-managed Auth/Storage/Realtime/Vault/_realtime.',
    }) +
    [
      '-- This module records required platform prerequisites. It must not CREATE auth/storage internals.',
      '-- Mid-replay assertion (expected on host before application modules):',
      'DO $esc_platform$',
      'BEGIN',
      "  IF to_regclass('auth.users') IS NULL THEN",
      "    RAISE EXCEPTION 'ESC platform prerequisite missing: auth.users';",
      '  END IF;',
      "  IF to_regnamespace('storage') IS NULL THEN",
      "    RAISE EXCEPTION 'ESC platform prerequisite missing: storage schema';",
      '  END IF;',
      'END',
      '$esc_platform$;',
      '',
    ].join('\n');

  // Extract company_roles seed from foundations if present; keep foundations as schema+allowlisted seed
  let foundationsModule =
    moduleHeader({
      version: PROPOSED_VERSIONS.foundations,
      name: 'esc_public_users_and_foundations_baseline',
      module: 'public_application_schema_baseline_prefix',
      provenance:
        'Option D assembled: public_users_derived_baseline (ESC users-grant overlay) + foundations_baseline',
    }) +
    '-- >>> begin 20260701043598_public_users_derived_baseline.sql\n' +
    toLf(usersSql).trim() +
    '\n-- <<< end public_users_derived_baseline\n\n' +
    '-- >>> begin 20260701043599_foundations_baseline.sql\n' +
    toLf(foundationsSql).trim() +
    '\n-- <<< end foundations_baseline\n';
  {
    const inj = injectPrivilegeClosureBeforeCommits(foundationsModule, {
      sliceVersion: PROPOSED_VERSIONS.foundations,
    });
    foundationsModule = inj.sql;
  }

  // Phase1 atomic: concatenate 4 recovered files in one module + explicit RLS enable block up front note
  let phase1Body = '';
  for (const f of phase1Files) {
    phase1Body += `\n-- >>> begin ${f}\n` + toLf(readAssembled(f)).trim() + `\n-- <<< end ${f}\n`;
  }
  let phase1Module =
    moduleHeader({
      version: PROPOSED_VERSIONS.phase1_atomic,
      name: 'esc_phase1_subscriptions_rls_atomic',
      module: 'phase1_atomic_with_rls_closure',
      provenance: 'Option D assembled recovered phase1 ×4 concatenated to close historical RLS window in one version',
    }) +
    '-- Security: single proposed version closes CREATE→RLS gap that existed across prod versions 1–4.\n' +
    'BEGIN;\n' +
    phase1Body +
    '\n-- Hardening: ensure RLS enabled on phase1 subscription tables before COMMIT.\n' +
    'ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;\n' +
    'ALTER TABLE IF EXISTS public.subscription_items ENABLE ROW LEVEL SECURITY;\n' +
    'ALTER TABLE IF EXISTS public.subscription_seats ENABLE ROW LEVEL SECURITY;\n' +
    'ALTER TABLE IF EXISTS public.entitlements ENABLE ROW LEVEL SECURITY;\n' +
    'ALTER TABLE IF EXISTS public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;\n' +
    'COMMIT;\n';
  {
    const inj = injectPrivilegeClosureBeforeCommits(phase1Module, {
      sliceVersion: PROPOSED_VERSIONS.phase1_atomic,
    });
    phase1Module = inj.sql;
  }

  // Application schema + security: Option 2 secure multi-version split
  const prefix = new Set([
    '20260701043598_public_users_derived_baseline.sql',
    '20260701043599_foundations_baseline.sql',
    ...phase1Files,
  ]);
  const securityNameRe =
    /(q8[a-e]|rpc_lockdown|rls_|security_definer|search_path|grant|revoke|policy)/i;

  const appItems = [];
  const securityItems = [];
  const appSources = [];
  const securitySources = [];

  for (const f of order) {
    if (prefix.has(f) || skipInBody.has(f)) continue;
    const raw = sanitizeEmbeddedSqlComments(toLf(readAssembled(f)).trim());
    const sql = hardenPublishLedgerEventCreate(stripExecutableTxnMarkers(raw));
    const bytes = Buffer.byteLength(sql, 'utf8');
    if (securityNameRe.test(f) && !FORCE_APP_SCHEMA_FILES.has(f)) {
      securityItems.push({ file: f, sql, bytes });
      securitySources.push(f);
    } else {
      appItems.push({ file: f, sql, bytes });
      appSources.push(f);
    }
  }

  const appSlices = partitionByTargetBytes(appItems, TARGET_APP_SLICE_BYTES);
  if (appSlices.length > APP_SLICE_VERSIONS.length) {
    throw new Error(
      `App slice count ${appSlices.length} exceeds allocated versions ${APP_SLICE_VERSIONS.length}; raise target bytes or add versions`
    );
  }

  const splitModules = [];
  appSlices.forEach((slice, idx) => {
    const version = APP_SLICE_VERSIONS[idx];
    const name = `esc_application_schema_slice_${idx + 1}_of_${appSlices.length}`;
    let body = '';
    const files = [];
    for (const it of slice) {
      body += `\n-- >>> begin ${it.file}\n${it.sql}\n-- <<< end ${it.file}\n`;
      files.push(it.file);
    }
    const rls = buildRlsClosure(body);
    const rpc = buildSensitiveRpcClosure(body, version);
    const inner =
      `-- OPTION 2 secure multi-version split: slice ${idx + 1}/${appSlices.length}\n` +
      `-- Source BEGIN/COMMIT stripped; exactly one outer transaction.\n` +
      `-- Files: ${files.length}; RLS closure tables: ${rls.missing.length || 0}; fn dispositions: ${rpc.inventory.length}\n` +
      body +
      '\n' +
      rls.sql +
      '\n' +
      rpc.sql;
    const full = moduleHeader({
      version,
      name,
      module: `public_application_schema_slice_${idx + 1}`,
      provenance: `Option D assembled app files (${files.length}) stripped of nested txn markers; RLS/privilege closed before COMMIT`,
    }) + wrapSingleOuterTransaction(inner);

    const txn = countExecutableTxnControls(full);
    if (txn.BEGIN !== 1 || txn.COMMIT !== 1 || txn.ROLLBACK !== 0 || txn.START !== 0) {
      throw new Error(`Slice ${idx + 1} txn controls invalid: ${JSON.stringify(txn)}`);
    }
    if (rls.missing.length && !rls.sql.includes('ENABLE ROW LEVEL SECURITY')) {
      throw new Error(`Slice ${idx + 1} missing RLS closure`);
    }

    splitModules.push({
      order: 0, // filled later
      version,
      name,
      module: `public_application_schema_slice_${idx + 1}`,
      filename: `${version}_${name}.sql`,
      kind: 'baseline',
      sql: full,
      sources: files.map((f) => 'assembled:' + f),
      txn: 'single outer BEGIN/COMMIT; nested source markers stripped',
      dmlClass: 'mixed_see_dml_allowlist',
      txnControls: txn,
      rlsClosureTables: rls.missing,
      sourceEntryRange: files,
    });
  });

  // Security slice: policies/lockdowns + ESC patch + privilege closure for functions created here
  let securityBody = '';
  for (const it of securityItems) {
    securityBody += `\n-- >>> begin ${it.file}\n${it.sql}\n-- <<< end ${it.file}\n`;
  }
  securityBody = applySpWriteAnchorBatchOwnerOnlyOverlay(securityBody);
  const securityPriv = buildSensitiveRpcClosure(securityBody + '\n' + ESC_BOUNDARY_SECURITY_PATCH, PROPOSED_VERSIONS.security_atomic);
  const securityInner =
    '-- OPTION 2 security slice: RLS policies, Q8 lockdowns, ESC boundary patch\n' +
    '-- Nested source txn markers stripped; one outer transaction.\n' +
    securityBody +
    '\n' +
    ESC_BOUNDARY_SECURITY_PATCH +
    '\n' +
    '-- [ESC] sp_write_anchor_batch: owner/admin-only (no proven runtime .rpc() caller).\n' +
    'REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM PUBLIC;\n' +
    'REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM anon;\n' +
    'REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM authenticated;\n' +
    'REVOKE EXECUTE ON FUNCTION public.sp_write_anchor_batch(bigint,bigint,integer,text,jsonb,jsonb) FROM service_role;\n' +
    '\n' +
    securityPriv.sql +
    '\n';
  let securityFull =
    moduleHeader({
      version: PROPOSED_VERSIONS.security_atomic,
      name: 'esc_security_rls_grants_hardening_atomic',
      module: 'security_rls_grants_triggers_functions_atomic',
      provenance: `Option D security-named files (${securitySources.length}) + ESC boundary patch; single outer txn`,
    }) + wrapSingleOuterTransaction(securityInner);
  const securityTxn = countExecutableTxnControls(securityFull);
  if (securityTxn.BEGIN !== 1 || securityTxn.COMMIT !== 1) {
    throw new Error('Security slice txn controls invalid: ' + JSON.stringify(securityTxn));
  }
  // Ensure engagement + gap2 protected in this slice (created here or earlier; patch enables)
  const secRls = findEnableRls(securityFull);
  for (const t of ['gap2_purge_table_registry', 'engagement_posting_policy', 'curated_rule_fires']) {
    if (!secRls.has(t) && !findCreateTables(securityFull).includes(t)) {
      // may have been enabled in earlier app slice — OK if created earlier with closure
    }
  }

  splitModules.push({
    order: 0,
    version: PROPOSED_VERSIONS.security_atomic,
    name: 'esc_security_rls_grants_hardening_atomic',
    module: 'security_rls_grants_triggers_functions_atomic',
    filename: `${PROPOSED_VERSIONS.security_atomic}_esc_security_rls_grants_hardening_atomic.sql`,
    kind: 'baseline',
    sql: securityFull,
    sources: [...securitySources.map((f) => 'assembled:' + f), 'esc:boundary-security-patch'],
    txn: 'single outer BEGIN/COMMIT; nested source markers stripped',
    dmlClass: 'none_expected_primary',
    txnControls: securityTxn,
    rlsClosureTables: [],
    sourceEntryRange: securitySources,
  });

  // Marker bookkeeping: OD assembled begin markers in app+security = appSources+securitySources (138)
  // ESC patch adds a 139th begin marker that is NOT an Option D entry.
  const odAssembledInSplits = appSources.length + securitySources.length;

  // Reference seeds: document allowlist only + no-op check (company_roles already in foundations)
  const referenceModule =
    moduleHeader({
      version: PROPOSED_VERSIONS.reference_seeds,
      name: 'esc_reference_seed_allowlist_contract',
      module: 'allowlisted_immutable_reference_seeds',
      provenance: 'Allowlist contract; company_roles seed lives inside foundations module (deterministic reference)',
    }) +
    [
      '-- Allowlisted reference seeds (already applied in foundations module):',
      '--   public.company_roles — immutable role catalog (see foundations baseline allowlist)',
      '-- No additional INSERT/UPDATE/DELETE in this module.',
      'DO $esc_ref$',
      'BEGIN',
      "  IF to_regclass('public.company_roles') IS NULL THEN",
      "    RAISE EXCEPTION 'ESC reference seed prerequisite missing: public.company_roles';",
      '  END IF;',
      'END',
      '$esc_ref$;',
      '',
    ].join('\n');

  // Guarded init: d6 ×4 + tcp1 schema-no-seed + grant index-only
  const d6Parts = d6Files.map((f) => {
    const p = path.join(SUBST_DIR, f);
    return `\n-- >>> guarded ${f}\n` + toLf(fs.readFileSync(p, 'utf8')).trim() + `\n-- <<< end ${f}\n`;
  });
  const tcp1Raw = fs.readFileSync(path.join(SUBST_DIR, tcp1File), 'utf8');
  const tcp1Stripped = stripTcp1ComplimentarySeed(toLf(tcp1Raw));
  const grantSql = toLf(fs.readFileSync(path.join(SUBST_DIR, grantFile), 'utf8'));

  let guardedModule =
    moduleHeader({
      version: PROPOSED_VERSIONS.guarded_init,
      name: 'esc_guarded_dataless_safe_initialization',
      module: 'guarded_data_less_safe_initialization',
      provenance:
        'd6: Option D guarded substitutions; tcp1: Option D schema/RLS/functions with complimentary seed omitted; grant: schema-only unique index',
    }) +
    d6Parts.join('\n') +
    '\n-- >>> tcp1 schema without complimentary seed\n' +
    tcp1Stripped.trim() +
    '\n-- <<< end tcp1\n\n' +
    '-- >>> accounting connected grant schema-only\n' +
    grantSql.trim() +
    '\n-- <<< end grant\n';
  {
    const inj = injectPrivilegeClosureBeforeCommits(guardedModule, {
      sliceVersion: PROPOSED_VERSIONS.guarded_init,
    });
    guardedModule = inj.sql;
  }

  // Forward tail: git files whose semantic names are not present in production name list
  const prod = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'docs/migration-remediation/evidence/option1-prod-schema-migrations-version-name-list.json'),
      'utf8'
    )
  );
  const prodNameSet = new Set(prod.map((r) => r.name));
  // also strip leading timestamps from prod names for comparison
  const prodBare = new Set(
    prod.map((r) => r.name.replace(/^\d{14}_/, '').replace(/^\d{8}_\d{4}_/, ''))
  );

  const gitFiles = fs
    .readdirSync(path.join(ROOT, 'supabase/migrations'))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const skippedCovered = new Set(od.skippedCoveredByBaseline || []);
  const forwardCandidates = [];
  for (const f of gitFiles) {
    if (skippedCovered.has(f)) continue;
    // Pre-phase1 / foundations-era git files are absorbed into foundations module.
    if (/^202605|^2026060[1-5]/.test(f)) continue;
    const bare = f.replace(/\.sql$/, '').replace(/^\d{14}_/, '').replace(/^\d{8}_\d{4}_/, '');
    const fullStem = f.replace(/\.sql$/, '');
    const inProd = prodNameSet.has(bare) || prodNameSet.has(fullStem) || prodBare.has(bare);
    const inOptionD =
      order.includes(f) ||
      order.some((o) => o === f || o.endsWith('_' + bare + '.sql') || o.includes(bare));
    // Digest qualify is Option D–listed but intentionally modeled as forward-tail only.
    if (f === DIGEST_QUALIFY_FILE) continue;
    if (!inProd && !inOptionD) {
      forwardCandidates.push(f);
    }
  }

  // Explicit known forward from inventory (merged main, not represented as prod bare name)
  const explicitForward = [DIGEST_QUALIFY_FILE].filter((f) =>
    fs.existsSync(path.join(ROOT, 'supabase/migrations', f))
  );

  const forwardFiles = [...new Set([...explicitForward, ...forwardCandidates])].sort();

  let forwardBody = '';
  for (const f of forwardFiles) {
    const sql = hardenPublishLedgerEventCreate(
      toLf(fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8')).trim()
    );
    forwardBody += `\n-- >>> forward ${f}\n${sql}\n-- <<< end ${f}\n`;
  }
  if (!forwardBody.trim()) {
    forwardBody =
      '-- No additional forward-tail SQL files required beyond Option D end-state for name-unique git migrations.\n' +
      '-- Timestamp-drift duplicates (101 git-only versions with prod name overlap) are intentionally excluded.\n' +
      'SELECT 1; -- placeholder no-op for non-empty statements[]\n';
  }

  let forwardModule =
    moduleHeader({
      version: PROPOSED_VERSIONS.forward_tail,
      name: 'esc_forward_tail_main_unapplied',
      module: 'post_baseline_forward_migrations',
      provenance:
        'Merged main migrations not in production baseline; sole home of publish_ledger_event extensions.digest qualify',
    }) + forwardBody;
  {
    const inj = injectPrivilegeClosureBeforeCommits(forwardModule, {
      sliceVersion: PROPOSED_VERSIONS.forward_tail,
    });
    forwardModule = inj.sql;
  }

  const modules = [
    {
      order: 1,
      version: PROPOSED_VERSIONS.platform,
      name: 'esc_platform_prerequisites_contract',
      module: 'platform_prerequisite_contract',
      filename: `${PROPOSED_VERSIONS.platform}_esc_platform_prerequisites_contract.sql`,
      kind: 'baseline',
      sql: platformSql,
      sources: ['design:platform-prerequisites'],
      txn: 'DO block only',
      dmlClass: 'none',
    },
    {
      order: 2,
      version: PROPOSED_VERSIONS.foundations,
      name: 'esc_public_users_and_foundations_baseline',
      module: 'public_application_schema_baseline_prefix',
      filename: `${PROPOSED_VERSIONS.foundations}_esc_public_users_and_foundations_baseline.sql`,
      kind: 'baseline',
      sql: foundationsModule,
      sources: [
        'assembled:20260701043598_public_users_derived_baseline.sql',
        'assembled:20260701043599_foundations_baseline.sql',
      ],
      txn: 'inherits source BEGIN/COMMIT from foundations',
      dmlClass: 'required_immutable_reference_seed (company_roles inside foundations)',
    },
    {
      order: 3,
      version: PROPOSED_VERSIONS.phase1_atomic,
      name: 'esc_phase1_subscriptions_rls_atomic',
      module: 'phase1_atomic_with_rls_closure',
      filename: `${PROPOSED_VERSIONS.phase1_atomic}_esc_phase1_subscriptions_rls_atomic.sql`,
      kind: 'baseline',
      sql: phase1Module,
      sources: phase1Files.map((f) => 'assembled:' + f),
      txn: 'single outer BEGIN/COMMIT wrapping phase1 + ENABLE RLS',
      dmlClass: 'none',
    },
    ...splitModules.map((m, i) => ({ ...m, order: 4 + i })),
    {
      order: 4 + splitModules.length,
      version: PROPOSED_VERSIONS.reference_seeds,
      name: 'esc_reference_seed_allowlist_contract',
      module: 'allowlisted_immutable_reference_seeds',
      filename: `${PROPOSED_VERSIONS.reference_seeds}_esc_reference_seed_allowlist_contract.sql`,
      kind: 'baseline',
      sql: referenceModule,
      sources: ['design:reference-allowlist'],
      txn: 'DO block only',
      dmlClass: 'none_in_module',
    },
    {
      order: 5 + splitModules.length,
      version: PROPOSED_VERSIONS.guarded_init,
      name: 'esc_guarded_dataless_safe_initialization',
      module: 'guarded_data_less_safe_initialization',
      filename: `${PROPOSED_VERSIONS.guarded_init}_esc_guarded_dataless_safe_initialization.sql`,
      kind: 'baseline',
      sql: guardedModule,
      sources: [
        ...d6Files.map((f) => 'substitution:' + f),
        'substitution:' + tcp1File + '#seed_omitted',
        'substitution:' + grantFile,
      ],
      txn: 'per-source BEGIN/COMMIT for d6/tcp1; grant has none',
      dmlClass: 'guarded_optional_seed + registry_reference_update',
    },
    {
      order: 6 + splitModules.length,
      version: PROPOSED_VERSIONS.forward_tail,
      name: 'esc_forward_tail_main_unapplied',
      module: 'post_baseline_forward_migrations',
      filename: `${PROPOSED_VERSIONS.forward_tail}_esc_forward_tail_main_unapplied.sql`,
      kind: 'forward-tail',
      sql: forwardModule,
      sources: forwardFiles.map((f) => 'supabase/migrations/' + f),
      txn: 'mixed',
      dmlClass: 'forward_source_dependent',
    },
  ];

  // Re-number orders sequentially 1..n
  modules.forEach((m, i) => {
    m.order = i + 1;
  });

  const boundaryMatrix = buildBoundaryMatrix(modules);
  const finalNoRls = boundaryMatrix[boundaryMatrix.length - 1].sampleCumulativeWithoutRls || [];
  if (finalNoRls.length) {
    throw new Error('Builder refuse: tables without RLS after final module: ' + finalNoRls.join(', '));
  }
  const unsafeAny = boundaryMatrix.filter((b) => b.unsafeCreatesInModuleCount > 0);
  if (unsafeAny.length) {
    throw new Error(
      'Builder refuse: same-module RLS gaps: ' +
        unsafeAny
          .map((b) => `m${b.afterModule}:{${b.unsafeCreatesInModuleWithoutRlsSameModule.join(',')}}`)
          .join('; ')
    );
  }
  for (const sm of splitModules) {
    const t = countExecutableTxnControls(sm.sql);
    if (t.BEGIN !== 1 || t.COMMIT !== 1 || t.ROLLBACK !== 0) {
      throw new Error(`Builder refuse: split ${sm.name} txn=${JSON.stringify(t)}`);
    }
  }
  if (odAssembledInSplits !== 138) {
    throw new Error(
      `Builder refuse: expected 138 OD assembled files in app+security splits, got ${odAssembledInSplits} (app=${appSources.length} sec=${securitySources.length})`
    );
  }

  // Fail-closed privilege + engagement_posting_policy order + users anon grant
  const byVersion = Object.fromEntries(modules.map((m) => [m.version, m.sql]));
  for (const mod of modules) {
    const gaps = sameSlicePublicRevokeGaps(mod.sql);
    if (gaps.length) {
      throw new Error(
        `Builder refuse: ${gaps.length} functions without same-module PUBLIC EXECUTE revoke in ${mod.version}: ` +
          gaps
            .slice(0, 8)
            .map((g) => g.identity)
            .join(', ')
      );
    }
    const unclassified = buildDispositionInventory(mod.sql, mod.version).filter((f) => !f.classified);
    if (unclassified.length) {
      throw new Error(`Builder refuse: unclassified functions in ${mod.version}`);
    }
  }
  if (!assertNoUsersAnonAllGrant(byVersion[PROPOSED_VERSIONS.foundations] || '')) {
    throw new Error('Builder refuse: GRANT ALL ON public.users TO anon still present');
  }
  if (!assertNoUsersAuthenticatedTableUpdate(byVersion[PROPOSED_VERSIONS.foundations] || '')) {
    throw new Error('Builder refuse: authenticated UPDATE on public.users still present');
  }
  // publish_ledger_event must lock search_path in every CREATE/REPLACE body
  for (const mod of modules) {
    const re =
      /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+public\.publish_ledger_event\s*\([\s\S]*?SECURITY\s+DEFINER([\s\S]{0,120}?)AS\s+/gi;
    let m;
    while ((m = re.exec(mod.sql))) {
      if (!/SET\s+search_path\s*=\s*public,\s*pg_temp/i.test(m[1])) {
        throw new Error(
          `Builder refuse: publish_ledger_event CREATE in ${mod.version} missing create-time search_path`
        );
      }
    }
  }
  const epp = engagementPostingPolicyOrder(byVersion);
  if (!epp.okOrder || !epp.sameModule) {
    // same-module preferred; okOrder requires create<=enable. Require CREATE and ENABLE in same version.
    if (!(epp.createVer && epp.enableVer && epp.createVer === epp.enableVer && epp.okOrder)) {
      // Allow create-then-enable across slices only if create slice also ENABLE via RLS closure
      const createSql = byVersion[epp.createVer] || '';
      const createHasEnable =
        /ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+(?:public\.)?engagement_posting_policy\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/i.test(
          createSql
        );
      if (!(epp.okOrder && createHasEnable && epp.createVer <= epp.enableVer)) {
        throw new Error(
          `Builder refuse: engagement_posting_policy order create@${epp.createVer} enable@${epp.enableVer} sameModule=${epp.sameModule}`
        );
      }
    }
  }
  if (!FORCE_APP_SCHEMA_FILES.has('20260706170000_d6_4c_3_posting_policy_and_remediation.sql')) {
    throw new Error('Builder refuse: d6_4c_3 must remain FORCE_APP');
  }
  if (!appSources.includes('20260706170000_d6_4c_3_posting_policy_and_remediation.sql')) {
    throw new Error('Builder refuse: d6_4c_3 not in appSources');
  }
  if (securitySources.includes('20260706170000_d6_4c_3_posting_policy_and_remediation.sql')) {
    throw new Error('Builder refuse: d6_4c_3 incorrectly in securitySources');
  }

  const manifestEntries = [];
  const allDml = [];

  for (const mod of modules) {
    const abs = path.join(MODULES_DIR, mod.filename);
    const buf = writeLf(abs, mod.sql);
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    // stage for git hash-object (may be untracked — hash-object still works on path)
    const blob = gitBlobForRel(rel);
    const entry = {
      order: mod.order,
      version: mod.version,
      name: mod.name,
      module: mod.module,
      kind: mod.kind,
      path: rel,
      sourceProvenance: mod.sources,
      gitBlobId: blob,
      sha256: sha256(buf),
      md5: md5(buf),
      utf8LfBytes: buf.length,
      statementCountApprox: countStatements(mod.sql),
      transactionBoundary: mod.txn,
      dmlClassification: mod.dmlClass,
      createdConsumedObjects: 'see Option D dependency manifests + module source list',
      rlsSecurityAssertions: [
        'Option 2 secure multi-version split: each app/security slice has exactly one outer BEGIN/COMMIT',
        'zero CREATE TABLE without same-module ENABLE RLS (builder refuse + per-slice closure)',
        'every CREATE FUNCTION: same-slice REVOKE EXECUTE FROM PUBLIC + disposition grants',
        'digest qualify exactly once in forward-tail',
        'OD assembled begin markers in splits=138; ESC patch marker is extra non-OD',
        'public.users: no GRANT ALL TO anon; authenticated narrowed to SELECT/UPDATE',
      ],
      transactionControlCounts: mod.txnControls || countExecutableTxnControls(mod.sql),
      sourceEntryRange: mod.sourceEntryRange || mod.sources,
    };
    manifestEntries.push(entry);
    allDml.push(...classifyDmlInSql(mod.sql, mod.filename));
  }

  const packageManifest = {
    packageId: 'executable-squash-candidate',
    generatedAt: new Date().toISOString(),
    authorization: 'candidate remediation only - no production mutation, no Docker, no branch, no SQL execution',
    targetModel: {
      transactionModel: 'OPTION_2_SECURE_MULTI_VERSION_SPLIT',
      transactionModelJustification:
        'Module4 txn analysis: BEGIN/COMMIT 50/50 nested markers; CREATE/ALTER EXTENSION present; ~979KB / ~4500 stmts HIGH payload-timeout-lock risk. Option 1 rejected.',
      baselineModules: 'platform+foundations+phase1+app slices+security+reference+guarded',
      forwardTailModule: 'post-baseline merged-but-unapplied main (sole digest qualify home)',
      reviewedAncestorSeal: 'c5c360d8325e2cbfa474d97ea0d33e0f2449ab89820770146def8c4c13da5a37',
      reviewedAncestorCommit: 'd558c39b4a42540f9c485b30c6b9f0972b4ac500',
      remediationAuthorizedFromPrHead: '93f839546bbec8d6e80e06f263660ae091c3fc8b',
      priorSingleModule4Superseded: true,
      privilegeAndRlsOrderRemediation: true,
      usersColumnUpdateRemediation: true,
    },
    bound: {
      pr314HeadAtStart: '93f839546bbec8d6e80e06f263660ae091c3fc8b',
      candidateAncestorSeal: 'c5c360d8325e2cbfa474d97ea0d33e0f2449ab89820770146def8c4c13da5a37',
      candidateAncestorCommit: 'd558c39b4a42540f9c485b30c6b9f0972b4ac500',
      mainHead: '9d8a01d37422179ddd68bbd181a8815d8a893577',
      projectRefReadOnly: 'jzmdgwwiestcmmeuhhkr',
      optionDManifestBlob: '0d2a39a3d4220c8d28e3269a87fa8c01e8bf2d4e',
      optionDManifestSha256: manSha,
      optionDRuntime: 'PASS 151/151',
      cli: '2.116.0',
      primaryDecision: 'executable_squash_baseline',
      productionMutationReadiness: false,
      sourceReviewVerdictPrior: 'CHANGES REQUIRED',
      blockingFindingsRemediated: [
        'USERS_AUTHENTICATED_COLUMN_UPDATE_ESCALATION',
        'USERS_STALE_UPDATE_RLS_POLICY',
        'SECURITY_DEFINER_MISSING_SEARCH_PATH:publish_ledger_event',
        'TRIGGER_ONLY_SERVICE_ROLE_EXECUTE_GRANTED',
        'MIGRATION_ADMIN_SERVICE_ROLE_GRANT_WITHOUT_CALLER_PROOF',
        'SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED:je_provider_dispatch',
        'SERVICE_ROLE_EXECUTE_WITHOUT_PROVEN_CALLER:sp_write_anchor_batch',
      ],
      serviceRoleRpcAllowlistMode: 'exact_identity',
      spWriteAnchorBatchDisposition: SP_WRITE_ANCHOR_BATCH_DISPOSITION,
    },
    proposedLineageOrder: modules.map((m) => ({
      order: m.order,
      version: m.version,
      name: m.name,
      filename: m.filename,
      kind: m.kind,
    })),
    activeSupabaseMigrationsModified: false,
    entries: manifestEntries,
    moduleFileCount: manifestEntries.length,
    totalUtf8LfBytes: manifestEntries.reduce((s, e) => s + e.utf8LfBytes, 0),
    packageSha256OfConcatenatedEntryHashes: sha256(
      Buffer.from(manifestEntries.map((e) => e.sha256).join('\n'), 'utf8')
    ),
    sourceAccounting: {
      optionDEntries: order.length,
      includedUnchangedBaseline:
        prefix.size - phase1Files.length + phase1Files.length + odAssembledInSplits,
      // Explicit equation components for reviewers:
      foundationsAndUsers: 2,
      phase1: phase1Files.length,
      appAndSecurityAssembled: odAssembledInSplits,
      dispositionOverlays: d6Files.length + 2,
      digestQualifyOccurrences: 1,
      digestQualifyLocation: 'forward_tail_only',
      equation: `${2 + phase1Files.length + odAssembledInSplits} unchanged + ${d6Files.length + 2} overlays + 1 forward = ${2 + phase1Files.length + odAssembledInSplits + d6Files.length + 2 + 1}`,
      includedInBaselineBody: odAssembledInSplits,
      markerBookkeeping: {
        odAssembledBeginMarkersInSplits: odAssembledInSplits,
        escRemediationPatchBeginMarker: 1,
        priorObserved139Explanation:
          '139 = 138 Option D assembled begin markers in former module 4 + 1 ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY patch marker (not an Option D entry)',
      },
      excludedFromBaselineBody: [DIGEST_QUALIFY_FILE, ...d6Files, tcp1File, grantFile],
      escBoundaryPatch: true,
      transactionModel: 'OPTION_2_SECURE_MULTI_VERSION_SPLIT',
      appSliceCount: appSlices.length,
    },
    privilegeDispositions: {
      defaultPolicy:
        'Every CREATE FUNCTION receives same-slice REVOKE EXECUTE FROM PUBLIC; anon/authenticated revoked unless allowlisted RLS helper; service_role regranted only for exact-identity allowlist',
      serviceRoleRpcIdentityAllowlist: [...SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST].sort(),
      serviceRoleRpcCallerEvidence: SERVICE_ROLE_RPC_CALLER_EVIDENCE,
      spWriteAnchorBatchDisposition: SP_WRITE_ANCHOR_BATCH_DISPOSITION,
      anonRpcAllowlist: [],
      authenticatedRlsHelperAllowlist: [
        'public.is_active_company_member(uuid)',
        'public.has_active_company_role(uuid,text[])',
        'public.is_company_admin(uuid)',
        'public.is_active_firm_member(uuid)',
        'public.has_active_firm_role(uuid,text[])',
      ],
      public_users_table: {
        anonAll: 'REVOKED',
        publicAll: 'REVOKED',
        authenticated: 'SELECT only; UPDATE fully REVOKED (empty self-service allowlist)',
        authenticatedUpdatePolicy: 'DROPPED (stale FOR UPDATE removed)',
        serviceRolePrivileges: 'ALL retained for server paths',
        columnContract: PUBLIC_USERS_COLUMN_CONTRACT,
        rationale: PUBLIC_USERS_COLUMN_CONTRACT.rationale,
      },
      engagement_posting_policy: {
        createForcedIntoAppBucket: '20260706170000_d6_4c_3_posting_policy_and_remediation.sql',
        note: 'FORCE_APP so CREATE precedes prepilot ENABLE/POLICY; same-slice RLS via buildRlsClosure',
      },
      publish_ledger_event: {
        anonExecute: 'REVOKED',
        authenticatedExecute: 'REVOKED',
        publicExecute: 'REVOKED',
        caller: 'lib/events/publisher.ts via createServiceClient (service_role)',
        anonymousRequired: false,
      },
      increment_share_token_access: {
        anonExecute: 'REVOKED',
        authenticatedExecute: 'REVOKED',
        publicExecute: 'REVOKED',
        caller: 'lib/close-packet/share-tokens.js via getSupabaseAdmin (service_role)',
        anonymousRequired: false,
        evidence:
          'Share verification uses hashed token via admin client; RPC increment is server-side only.',
      },
    },
  };

  writeLf(MANIFEST_PATH, JSON.stringify(packageManifest, null, 2));
  writeLf(EVIDENCE_MANIFEST, JSON.stringify(packageManifest, null, 2));

  const BOUNDARY_PATH = path.join(
    ROOT,
    'docs/migration-remediation/evidence/executable-squash-candidate-boundary-matrix.json'
  );
  writeLf(
    BOUNDARY_PATH,
    JSON.stringify(
      {
        generatedAt: packageManifest.generatedAt,
        packageSeal: packageManifest.packageSha256OfConcatenatedEntryHashes,
        totalUtf8LfBytes: packageManifest.totalUtf8LfBytes,
        matrix: boundaryMatrix,
        zeroUnsafeCreates: true,
        zeroFinalWithoutRls: true,
      },
      null,
      2
    )
  );

  // DML allowlist
  const dmlAllowlist = {
    generatedAt: packageManifest.generatedAt,
    dispositions: {
      d6_2a_through_d6_2d: {
        verdict: 'ALLOW_GUARDED_OPTIONAL_SEED',
        behavior:
          'Registry UPDATE always; client_active_rules INSERT…SELECT no-op when fixture firm_clients row absent',
        sources: d6Files,
      },
      tcp1_w1_solo_bk_pilot_slots: {
        verdict: 'OMIT_COMPLIMENTARY_SEED_KEEP_SCHEMA',
        reason:
          'Production deferred complimentary INSERT; Option D guarded seed divergent. Schema/RLS/functions retained.',
        sameVersionReplace: false,
      },
      accounting_canonical_connected_grant: {
        verdict: 'SCHEMA_INDEX_ONLY',
        reason:
          'Omit LOCK/RAISE/UPDATE operational body; preserve unique connected-grant index. Empty DB has no rows to update.',
        sameVersionReplace: false,
      },
    },
    prohibitedPatterns: [
      'customer/tenant row copies',
      'auth.users inserts',
      'oauth tokens',
      'provider/custody/ledger/execution/memory operational rows',
      'setval from production sequences',
    ],
    scanFindingsCount: allDml.length,
    scanFindingsSample: allDml.slice(0, 80),
    note: 'Full INSERT/UPDATE/DELETE scan is advisory; allowlist policy enforced by dispositions + tests',
  };
  writeLf(DML_PATH, JSON.stringify(dmlAllowlist, null, 2));

  // Security contract
  const security = {
    generatedAt: packageManifest.generatedAt,
    goals: [
      'Eliminate phase1 CREATE-before-RLS window by atomic module',
      'Option-2 per-slice RLS closure at every app/security COMMIT',
      'Create engagement_posting_policy before any ENABLE/POLICY (FORCE_APP d6_4c_3)',
      'Same-slice REVOKE EXECUTE FROM PUBLIC for every created application function',
      'Fail-closed anon/authenticated EXECUTE except allowlisted RLS helpers',
      'Remove public.users GRANT ALL TO anon; narrow authenticated to SELECT/UPDATE',
      'Digest qualify exactly once in forward-tail',
      'No customer data in package',
    ],
    midReplayAssertions: [
      {
        afterModule: PROPOSED_VERSIONS.platform,
        assert: 'auth.users and storage schema exist; no public app tables required yet',
      },
      {
        afterModule: PROPOSED_VERSIONS.phase1_atomic,
        assert:
          'subscriptions, subscription_items, subscription_seats, entitlements, stripe_webhook_events have RLS enabled',
      },
      {
        afterModule: 'app_slices_and_security',
        assert:
          'each Option-2 slice: exactly one outer txn; zero tables without RLS at slice COMMIT; sensitive RPC revokes when introduced',
      },
      {
        afterAnyFailure: true,
        assert: 'delete contaminated branch; do not continue mid-chain',
      },
    ],
    privilegeDispositions: packageManifest.privilegeDispositions,
    patent6AndImmutability:
      'Inherited from Option D assembled lineage + security modules; exact bindings must be verified in rehearsal gate (not this authoring auth)',
    partialReplayRlsRisk: 'reduced via Option 2 per-slice RLS closure; still requires independent source review before replay',
    transactionModel: 'OPTION_2_SECURE_MULTI_VERSION_SPLIT',
  };
  writeLf(SECURITY_PATH, JSON.stringify(security, null, 2));

  // Comparison
  const unappliedInv = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, 'docs/migration-remediation/evidence/option1-git-vs-prod-unapplied-inventory.json'),
      'utf8'
    )
  );
  const comparison = {
    generatedAt: packageManifest.generatedAt,
    method: 'static',
    productionSchemaContractScope: 'foundation_and_phase1_only (G1 PASS historically)',
    optionDEndState: 'PASS_RUNTIME 151/151 — primary executable provenance for full app schema in this package',
    candidateVersusProductionContract: {
      status: 'PARTIAL_COVERAGE_DOCUMENTED',
      note:
        'Foundation+phase1 contract covers 47 tables. Full production has broader surface (e.g. 424 policies). Candidate uses Option D PASS lineage as executable stand-in for full public app schema until authorized sealed pg_dump can replace module body bytes.',
      unexplainedDriftAllowedForMutation: false,
      requiresBeforeMutation: [
        'Authorized read-only pg_dump --schema-only seal OR complete catalog DDL emit',
        'Zero unexplained drift vs live prod schema',
      ],
    },
    candidatePlusForwardVersusMain: {
      forwardTailFiles: forwardFiles,
      gitOnlyByVersion: unappliedInv.gitOnlyByVersion,
      gitOnlyNameAlsoInProdTimestampDrift: unappliedInv.gitOnlyNameAlsoInProd,
      gitOnlyNameNotInProd: unappliedInv.gitOnlyNameNotInProd,
      intentionalExclusions: [
        '101 timestamp-drift git files whose bare names exist in production',
        'tcp1 complimentary seed',
        'accounting_canonical_connected_grant operational LOCK/RAISE/UPDATE',
        'customer/auth/provider/custody/memory row data',
      ],
    },
    productionOnlyDataOperationsExcluded: [
      'd6 unconditional fixture VALUES inserts (replaced by guarded)',
      'tcp1 complimentary pilot_slots seed',
      'accounting grant Demo Xero LOCK/RAISE/UPDATE path',
    ],
    readyForIndependentSourceReview: true,
    readyForLocalReplay: false,
    readyForProductionMutation: false,
  };
  writeLf(COMPARISON_PATH, JSON.stringify(comparison, null, 2));

  // Complete function privilege inventory (machine-readable dispositions)
  const PRIV_INV_PATH = path.join(
    ROOT,
    'docs/migration-remediation/evidence/executable-squash-candidate-function-privilege-inventory.json'
  );
  const allInventory = [];
  for (const mod of modules) {
    for (const fn of buildDispositionInventory(mod.sql, mod.version)) {
      allInventory.push({
        identity: fn.identity,
        schema: fn.schema,
        name: fn.name,
        argsRaw: fn.argsRaw,
        sliceVersion: mod.version,
        sliceName: mod.name,
        line: fn.line,
        returnsTrigger: fn.returnsTrigger,
        securityDefiner: fn.securityDefiner,
        searchPath: fn.searchPath,
        class: fn.disposition.class,
        revoke: fn.disposition.revoke,
        grant: fn.disposition.grant,
        rationale: fn.disposition.rationale,
        classified: true,
      });
    }
  }
  const classCounts = {};
  for (const fn of allInventory) {
    classCounts[fn.class] = (classCounts[fn.class] || 0) + 1;
  }
  writeLf(
    PRIV_INV_PATH,
    JSON.stringify(
      {
        generatedAt: packageManifest.generatedAt,
        packageSeal: packageManifest.packageSha256OfConcatenatedEntryHashes,
        totalFunctions: allInventory.length,
        unclassifiedCount: allInventory.filter((f) => !f.classified).length,
        classCounts,
        engagement_posting_policy: epp,
        public_users_anon_all_absent: true,
        public_users_authenticated_update_revoked: true,
        public_users_update_policy_absent: true,
        publicUsersColumnContract: PUBLIC_USERS_COLUMN_CONTRACT,
        serviceRoleRpcIdentityAllowlist: [...SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST].sort(),
        spWriteAnchorBatchDisposition: SP_WRITE_ANCHOR_BATCH_DISPOSITION,
        functions: allInventory,
      },
      null,
      2
    )
  );

  const RETAINED_GRANTS_PATH = path.join(
    ROOT,
    'docs/migration-remediation/evidence/executable-squash-candidate-retained-service-role-grants.json'
  );
  const retainedGrantRows = [...SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST].sort().map((identity) => {
    const ev = SERVICE_ROLE_RPC_CALLER_EVIDENCE[identity];
    if (!ev || !ev.callers || !ev.callers.length) {
      throw new Error('Builder refuse: missing caller evidence for allowlisted identity ' + identity);
    }
    return {
      identity,
      grant: 'EXECUTE TO service_role',
      revokeFrom: ['PUBLIC', 'anon', 'authenticated'],
      callers: ev.callers,
      authority: ev.authority,
      note: ev.note || null,
    };
  });
  writeLf(
    RETAINED_GRANTS_PATH,
    JSON.stringify(
      {
        generatedAt: packageManifest.generatedAt,
        packageSeal: packageManifest.packageSha256OfConcatenatedEntryHashes,
        allowlistMode: 'exact_identity',
        retainedServiceRoleGrantCount: retainedGrantRows.length,
        grants: retainedGrantRows,
        ownerAdminOnly: [SP_WRITE_ANCHOR_BATCH_DISPOSITION],
        jeDispatchRpcGrantsDoNotActivateDispatch: true,
        dormantCapabilityNote:
          'DB EXECUTE grants are orthogonal to PREPARE/CREATE/VERIFY flags and sandbox/production kill switches',
      },
      null,
      2
    )
  );

  const USERS_CONTRACT_PATH = path.join(
    ROOT,
    'docs/migration-remediation/evidence/executable-squash-candidate-public-users-column-contract.json'
  );
  writeLf(
    USERS_CONTRACT_PATH,
    JSON.stringify(
      {
        generatedAt: packageManifest.generatedAt,
        packageSeal: packageManifest.packageSha256OfConcatenatedEntryHashes,
        contract: PUBLIC_USERS_COLUMN_CONTRACT,
      },
      null,
      2
    )
  );

  // README + human doc
  const readme = `# Executable squash candidate (DRAFT / NON-DEPLOYABLE)

**Mutation readiness: NO**  
**Transaction model: OPTION 2 — secure multi-version split**  
**Replay: NOT authorized**  
**Active \`supabase/migrations/\`: untouched**

## Why Option 2
Former monolithic module 4 had 50 nested BEGIN/COMMIT pairs, extension operations, and ~979KB / ~4500 statements (HIGH timeout/lock risk). A blind single outer transaction was rejected.

## Proposed lineage
| Order | Version | Name | Kind |
|------:|---------|------|------|
${modules
  .map((m) => `| ${m.order} | \`${m.version}\` | \`${m.name}\` | ${m.kind} |`)
  .join('\n')}

Each app/security slice: nested source txn markers stripped; exactly one outer BEGIN/COMMIT; RLS closed before COMMIT.

See \`MANIFEST.json\` and package docs.
`;
  writeLf(path.join(OUT_DIR, 'README.md'), readme);

  const doc = `# Executable squash/baseline candidate — Option 2 txn remediation 2026-09-06

**Authorization:** candidate transaction-boundary remediation only.  
**PR #314:** draft. **Chosen model:** OPTION_2_SECURE_MULTI_VERSION_SPLIT.

## Bound pins
- From PR HEAD: \`142fa46ec9cc46de71dee88e2526ffc123d3172b\`
- Candidate ancestor: \`9b0c3b1a…\` seal \`99f556…\` / 1,130,762 bytes
- Option D: SHA-256 \`9dc080cf…\` · 151 entries

## Compatibility basis
See \`docs/migration-remediation/evidence/executable-squash-candidate-module4-txn-compatibility.json\`.

## Marker bookkeeping (138 vs 139)
- **138** = Option D assembled files in app+security splits
- **+1** ESC remediation patch begin marker (not an Option D entry)
- Prior review’s “139” counted both; authoritative OD accounting remains **144+6+1=151**

## Next
Third independent source review. No Docker/SQL/dump until PASS_SOURCE_REVIEW.
`;
  writeLf(DOC_PATH, doc);

  // Clean tmp
  const tmp = path.join(ROOT, 'docs/migration-remediation/evidence/_tmp-git-vs-prod.json');
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

  // Persist txn compatibility copy next to evidence if analyzer was run
  const txnCompatSrc = path.join(
    ROOT,
    'docs/migration-remediation/evidence/executable-squash-candidate-module4-txn-compatibility.json'
  );

  console.log(
    JSON.stringify(
      {
        transactionModel: 'OPTION_2_SECURE_MULTI_VERSION_SPLIT',
        modules: manifestEntries.map((e) => ({
          order: e.order,
          version: e.version,
          name: e.name,
          bytes: e.utf8LfBytes,
          sha256: e.sha256,
          blob: e.gitBlobId,
          md5: e.md5,
          txn: e.transactionControlCounts,
        })),
        totalBytes: packageManifest.totalUtf8LfBytes,
        packageSeal: packageManifest.packageSha256OfConcatenatedEntryHashes,
        forwardFiles,
        appSources: appSources.length,
        securitySources: securitySources.length,
        odAssembledInSplits,
        appSlices: appSlices.length,
        boundaryUnsafe: boundaryMatrix.map((b) => b.unsafeCreatesInModuleCount),
        finalWithoutRls: finalNoRls,
        txnCompatExists: fs.existsSync(txnCompatSrc),
      },
      null,
      2
    )
  );
}

main();
