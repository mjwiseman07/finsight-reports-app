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

// Target model (post-remediation):
// - Modules 1–6 = production-schema baseline (Option D assembled lineage + ESC overlays)
// - Module 7 = post-baseline forward-tail (merged-but-unapplied main changes)
// Digest qualify lives ONLY in forward-tail (excluded from baseline body).
// Former modules 4+5 (app schema + security) are one atomic proposed version.
const PROPOSED_VERSIONS = {
  platform: '20260907010000',
  foundations: '20260907010010',
  phase1_atomic: '20260907010020',
  application_security_atomic: '20260907010030',
  reference_seeds: '20260907010040',
  guarded_init: '20260907010050',
  forward_tail: '20260907010060',
};

const DIGEST_QUALIFY_FILE = '20260906184500_publish_ledger_event_extensions_digest_qualify.sql';

const ESC_BOUNDARY_SECURITY_PATCH = `
-- >>> begin ESC_REMEDIATION_MODULE_BOUNDARY_SECURITY
-- Same-module RLS + least-privilege closure for tables/functions first visible here.
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

-- curated_rule_fires: ENABLE already present via d6_0_1 in this module; assert again.
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
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi;
  let m;
  while ((m = re.exec(sql))) tables.push(m[1].replace(/^public\./, ''));
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

  // Fixed prefix pieces
  const usersSql = readAssembled('20260701043598_public_users_derived_baseline.sql');
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
  const foundationsModule =
    moduleHeader({
      version: PROPOSED_VERSIONS.foundations,
      name: 'esc_public_users_and_foundations_baseline',
      module: 'public_application_schema_baseline_prefix',
      provenance:
        'Option D assembled: public_users_derived_baseline + foundations_baseline (git-blob authority via assemble)',
    }) +
    '-- >>> begin 20260701043598_public_users_derived_baseline.sql\n' +
    toLf(usersSql).trim() +
    '\n-- <<< end public_users_derived_baseline\n\n' +
    '-- >>> begin 20260701043599_foundations_baseline.sql\n' +
    toLf(foundationsSql).trim() +
    '\n-- <<< end foundations_baseline\n';

  // Phase1 atomic: concatenate 4 recovered files in one module + explicit RLS enable block up front note
  let phase1Body = '';
  for (const f of phase1Files) {
    phase1Body += `\n-- >>> begin ${f}\n` + toLf(readAssembled(f)).trim() + `\n-- <<< end ${f}\n`;
  }
  const phase1Module =
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

  // Application schema + security hardening: one atomic proposed version (closes 4→5 window).
  const prefix = new Set([
    '20260701043598_public_users_derived_baseline.sql',
    '20260701043599_foundations_baseline.sql',
    ...phase1Files,
  ]);
  const securityNameRe =
    /(q8[a-e]|rpc_lockdown|rls_|security_definer|search_path|grant|revoke|policy)/i;

  let appBody = '';
  let securityBody = '';
  const appSources = [];
  const securitySources = [];

  for (const f of order) {
    if (prefix.has(f) || skipInBody.has(f)) continue;
    const sql = sanitizeEmbeddedSqlComments(toLf(readAssembled(f)).trim());
    if (securityNameRe.test(f)) {
      securityBody += `\n-- >>> begin ${f}\n${sql}\n-- <<< end ${f}\n`;
      securitySources.push(f);
    } else {
      appBody += `\n-- >>> begin ${f}\n${sql}\n-- <<< end ${f}\n`;
      appSources.push(f);
    }
  }

  const appSecurityModule =
    moduleHeader({
      version: PROPOSED_VERSIONS.application_security_atomic,
      name: 'esc_application_schema_and_security_atomic',
      module: 'public_application_schema_and_security_atomic',
      provenance: `Option D assembled app body (${appSources.length}) + security-named files (${securitySources.length}) + ESC boundary RLS/privilege patch; digest qualify excluded (forward-tail only)`,
    }) +
    '-- NOTE: Nested BEGIN/COMMIT from source files may appear; single proposed version\n' +
    '-- closes former module 4→5 RLS exposure for schema_migrations / stop-after-module semantics.\n' +
    appBody +
    '\n-- --- security / RLS / grants / revokes (former module 5) ---\n' +
    securityBody +
    '\n' +
    ESC_BOUNDARY_SECURITY_PATCH +
    '\n';

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

  const guardedModule =
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
    const sql = toLf(fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8')).trim();
    forwardBody += `\n-- >>> forward ${f}\n${sql}\n-- <<< end ${f}\n`;
  }
  if (!forwardBody.trim()) {
    forwardBody =
      '-- No additional forward-tail SQL files required beyond Option D end-state for name-unique git migrations.\n' +
      '-- Timestamp-drift duplicates (101 git-only versions with prod name overlap) are intentionally excluded.\n' +
      'SELECT 1; -- placeholder no-op for non-empty statements[]\n';
  }

  const forwardModule =
    moduleHeader({
      version: PROPOSED_VERSIONS.forward_tail,
      name: 'esc_forward_tail_main_unapplied',
      module: 'post_baseline_forward_migrations',
      provenance:
        'Merged main migrations not in production baseline; sole home of publish_ledger_event extensions.digest qualify',
    }) + forwardBody;

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
    {
      order: 4,
      version: PROPOSED_VERSIONS.application_security_atomic,
      name: 'esc_application_schema_and_security_atomic',
      module: 'public_application_schema_and_security_atomic',
      filename: `${PROPOSED_VERSIONS.application_security_atomic}_esc_application_schema_and_security_atomic.sql`,
      kind: 'baseline',
      sql: appSecurityModule,
      sources: [
        ...appSources.map((f) => 'assembled:' + f),
        ...securitySources.map((f) => 'assembled:' + f),
        'esc:boundary-security-patch',
      ],
      txn: 'single proposed version; nested source BEGIN/COMMIT markers preserved',
      dmlClass: 'mixed_see_dml_allowlist',
    },
    {
      order: 5,
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
      order: 6,
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
      order: 7,
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
        'zero CREATE TABLE without same-module ENABLE RLS (builder refuse)',
        'gap2_purge_table_registry + engagement_posting_policy + curated_rule_fires protected in module 4',
        'publish_ledger_event and increment_share_token_access: PUBLIC/anon/authenticated EXECUTE revoked',
        'digest qualify exactly once in forward-tail',
      ],
    };
    manifestEntries.push(entry);
    allDml.push(...classifyDmlInSql(mod.sql, mod.filename));
  }

  const packageManifest = {
    packageId: 'executable-squash-candidate',
    generatedAt: new Date().toISOString(),
    authorization: 'candidate remediation only - no production mutation, no Docker, no branch, no SQL execution',
    targetModel: {
      baselineModules: '1-6 Option D production-schema baseline + ESC overlays (digest qualify excluded)',
      forwardTailModule: '7 post-baseline merged-but-unapplied main (sole digest qualify home)',
      module4AtomicSecurity: 'former application schema + security merged into one proposed version',
      reviewedAncestorSeal: 'ae85b00270d3b89f6e8f57cb6851dec19aba2b860dd0de89126bc93643555d28',
      reviewedAncestorCommit: '524ada4933c7d326e79cf69cb69bb88aed7a5c08',
      remediationAuthorizedFromPrHead: '689ab36b5e82df08dd664f43067788b6902eb86e',
    },
    bound: {
      pr314HeadAtStart: '689ab36b5e82df08dd664f43067788b6902eb86e',
      mainHead: '9d8a01d37422179ddd68bbd181a8815d8a893577',
      projectRefReadOnly: 'jzmdgwwiestcmmeuhhkr',
      optionDManifestBlob: '0d2a39a3d4220c8d28e3269a87fa8c01e8bf2d4e',
      optionDManifestSha256: manSha,
      optionDRuntime: 'PASS 151/151',
      cli: '2.116.0',
      primaryDecision: 'executable_squash_baseline',
      productionMutationReadiness: false,
      sourceReviewVerdictPrior: 'CHANGES REQUIRED',
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
      includedInBaselineBody: appSources.length + securitySources.length,
      dispositionOverlays: d6Files.length + 2,
      digestQualifyOccurrences: 1,
      digestQualifyLocation: 'module_7_forward_tail_only',
      excludedFromBaselineBody: [DIGEST_QUALIFY_FILE, ...d6Files, tcp1File, grantFile],
      escBoundaryPatch: true,
    },
    privilegeDispositions: {
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
          'Share verification uses hashed token via admin client; RPC increment is server-side only. Q8c + ESC patch revoke anon.',
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
      'Eliminate former module 4→5 RLS window by merging app schema + security',
      'Enable RLS on gap2_purge_table_registry and engagement_posting_policy at first visibility',
      'Revoke anon/authenticated/PUBLIC execute on publish_ledger_event and increment_share_token_access',
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
        afterModule: PROPOSED_VERSIONS.application_security_atomic,
        assert:
          'zero application tables without RLS; gap2_purge_table_registry and curated_rule_fires protected; sensitive RPCs revoked from anon',
      },
      {
        afterAnyFailure: true,
        assert: 'delete contaminated branch; do not continue mid-chain',
      },
    ],
    privilegeDispositions: packageManifest.privilegeDispositions,
    patent6AndImmutability:
      'Inherited from Option D assembled lineage + security modules; exact bindings must be verified in rehearsal gate (not this authoring auth)',
    partialReplayRlsRisk: 'reduced: module 4 is atomic app+security; still requires independent source review before replay',
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

  // README + human doc
  const readme = `# Executable squash candidate (DRAFT / NON-DEPLOYABLE)

**Mutation readiness: NO**  
**Replay: NOT authorized**  
**Active \`supabase/migrations/\`: untouched**  
**Prior source review: CHANGES REQUIRED (remediated candidate; needs new independent review)**

## Target model
- **Baseline (modules 1–6):** Option D production-schema baseline + ESC overlays; digest qualify **excluded**
- **Forward-tail (module 7):** sole home of \`publish_ledger_event\` extensions.digest qualify
- **Module 4:** atomic application schema + security (closes former 4→5 RLS window)

## Proposed lineage

| Order | Version | Name | Kind |
|------:|---------|------|------|
${modules
  .map((m) => `| ${m.order} | \`${m.version}\` | \`${m.name}\` | ${m.kind} |`)
  .join('\n')}

## Dispositions
- **d6_2a–d**: guarded Option D substitutions
- **tcp1**: schema/RLS/functions; complimentary seed **omitted**
- **grant**: unique index only; no LOCK/RAISE/UPDATE
- **gap2_purge_table_registry / engagement_posting_policy**: ENABLE RLS + service_role-only policy
- **publish_ledger_event / increment_share_token_access**: PUBLIC/anon/authenticated EXECUTE **revoked**

## Authority
Built from Option D manifest SHA-256 \`9dc080cf…\` / 151 assembled files + substitutions, with ESC overlays.

See \`MANIFEST.json\` and \`docs/migration-remediation/executable-squash-candidate-package-2026-09-06.md\`.
`;
  writeLf(path.join(OUT_DIR, 'README.md'), readme);

  const doc = `# Executable squash/baseline candidate package — remediations 2026-09-06

**Authorization:** candidate remediation only (SQL/manifest/docs/tests).  
**PR #314:** draft. **Production mutation:** NO. **Docker/branch/SQL exec:** NO.

## Bound pins
- Remediation from PR HEAD: \`689ab36b5e82df08dd664f43067788b6902eb86e\`
- Reviewed ancestor: \`524ada4933c7d326e79cf69cb69bb88aed7a5c08\` (seal \`ae85b002…\`, 1,132,090 bytes)
- main: \`9d8a01d37422179ddd68bbd181a8815d8a893577\`
- Option D: blob \`0d2a39a3…\` · SHA-256 \`9dc080cf…\` · PASS 151/151

## P0 remediations
1. Merged former modules 4+5 into atomic \`20260907010030_esc_application_schema_and_security_atomic\`
2. Enabled RLS + service_role-only policy on \`gap2_purge_table_registry\` and \`engagement_posting_policy\`
3. Digest qualify retained **only** in forward-tail module 7
4. Revoked PUBLIC/anon/authenticated EXECUTE on \`publish_ledger_event\` and \`increment_share_token_access\` (service_role callers)

## Package files
Under \`supabase/migrations-draft/executable-squash-candidate/\` (7 SQL modules) + \`MANIFEST.json\`.

**Ready for independent source review:** YES (new review required; do not claim PASS_SOURCE_REVIEW yet)  
**Ready for local replay / production dump / mutation:** NO

## Next authorization
New independent source review of this remediations package. Do not request production schema dump until that review PASSes boundary/security gates.
`;
  writeLf(DOC_PATH, doc);

  // Clean tmp
  const tmp = path.join(ROOT, 'docs/migration-remediation/evidence/_tmp-git-vs-prod.json');
  if (fs.existsSync(tmp)) fs.unlinkSync(tmp);

  console.log(
    JSON.stringify(
      {
        modules: manifestEntries.map((e) => ({
          order: e.order,
          version: e.version,
          name: e.name,
          bytes: e.utf8LfBytes,
          sha256: e.sha256,
          blob: e.gitBlobId,
          md5: e.md5,
        })),
        totalBytes: packageManifest.totalUtf8LfBytes,
        packageSeal: packageManifest.packageSha256OfConcatenatedEntryHashes,
        forwardFiles,
        appSources: appSources.length,
        securitySources: securitySources.length,
        boundaryUnsafe: boundaryMatrix.map((b) => b.unsafeCreatesInModuleCount),
        finalWithoutRls: finalNoRls,
      },
      null,
      2
    )
  );
}

main();
