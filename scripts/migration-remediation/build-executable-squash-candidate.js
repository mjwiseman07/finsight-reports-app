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

const PROPOSED_VERSIONS = {
  platform: '20260907010000',
  foundations: '20260907010010',
  phase1_atomic: '20260907010020',
  application_schema: '20260907010030',
  security: '20260907010040',
  reference_seeds: '20260907010050',
  guarded_init: '20260907010060',
  forward_tail: '20260907010070',
};

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

function main() {
  ensureDir(MODULES_DIR);
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

  const skipInBody = new Set([...d6Files, tcp1File, grantFile]);

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

  // Application schema body: remaining Option D order excluding prefix + disposition files
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
    const sql = toLf(readAssembled(f)).trim();
    if (securityNameRe.test(f)) {
      securityBody += `\n-- >>> begin ${f}\n${sql}\n-- <<< end ${f}\n`;
      securitySources.push(f);
    } else {
      appBody += `\n-- >>> begin ${f}\n${sql}\n-- <<< end ${f}\n`;
      appSources.push(f);
    }
  }

  const appModule =
    moduleHeader({
      version: PROPOSED_VERSIONS.application_schema,
      name: 'esc_application_schema_lineage_body',
      module: 'public_application_schema_baseline_body',
      provenance: `Option D assembled body (${appSources.length} files) excluding d6/tcp1/grant disposition targets`,
    }) +
    '-- NOTE: Nested BEGIN/COMMIT from source files may appear; prefer runner that allows subtransactions\n' +
    '-- or flatten during mutation packaging. Static package preserves source txn markers for review.\n' +
    appBody +
    '\n';

  const securityModule =
    moduleHeader({
      version: PROPOSED_VERSIONS.security,
      name: 'esc_security_rls_grants_hardening',
      module: 'security_rls_grants_triggers_functions',
      provenance: `Option D assembled security-named files (${securitySources.length})`,
    }) +
    securityBody +
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
    if (!inProd && !inOptionD) {
      forwardCandidates.push(f);
    }
  }

  // Explicit known forward from inventory (merged main, not represented as prod bare name)
  const explicitForward = [
    '20260906184500_publish_ledger_event_extensions_digest_qualify.sql',
  ].filter((f) => fs.existsSync(path.join(ROOT, 'supabase/migrations', f)));

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
      provenance: 'Merged main migrations not represented in production names / Option D assembled set',
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
      version: PROPOSED_VERSIONS.application_schema,
      name: 'esc_application_schema_lineage_body',
      module: 'public_application_schema_baseline_body',
      filename: `${PROPOSED_VERSIONS.application_schema}_esc_application_schema_lineage_body.sql`,
      kind: 'baseline',
      sql: appModule,
      sources: appSources.map((f) => 'assembled:' + f),
      txn: 'mixed (source nested markers preserved for review)',
      dmlClass: 'mixed_see_dml_allowlist',
    },
    {
      order: 5,
      version: PROPOSED_VERSIONS.security,
      name: 'esc_security_rls_grants_hardening',
      module: 'security_rls_grants_triggers_functions',
      filename: `${PROPOSED_VERSIONS.security}_esc_security_rls_grants_hardening.sql`,
      kind: 'baseline',
      sql: securityModule,
      sources: securitySources.map((f) => 'assembled:' + f),
      txn: 'mixed',
      dmlClass: 'none_expected_primary',
    },
    {
      order: 6,
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
      order: 7,
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
      order: 8,
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
        'stop-after-module must not leave new app tables without RLS when module defines tables',
        'anon/authenticated must not gain broad PUBLIC execute',
      ],
    };
    manifestEntries.push(entry);
    allDml.push(...classifyDmlInSql(mod.sql, mod.filename));
  }

  const packageManifest = {
    packageId: 'executable-squash-candidate',
    generatedAt: new Date().toISOString(),
    authorization: 'authoring and static validation only - no production mutation, no Docker, no branch',
    bound: {
      pr314HeadAtStart: '157c561b85793248cce0d8256f16cb43c298c1b6',
      mainHead: '9d8a01d37422179ddd68bbd181a8815d8a893577',
      projectRefReadOnly: 'jzmdgwwiestcmmeuhhkr',
      optionDManifestBlob: '0d2a39a3d4220c8d28e3269a87fa8c01e8bf2d4e',
      optionDManifestSha256: manSha,
      optionDRuntime: 'PASS 151/151',
      cli: '2.116.0',
      primaryDecision: 'executable_squash_baseline',
      productionMutationReadiness: false,
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
  };

  writeLf(MANIFEST_PATH, JSON.stringify(packageManifest, null, 2));
  writeLf(EVIDENCE_MANIFEST, JSON.stringify(packageManifest, null, 2));

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
      'RLS enablement assertions after phase1',
      'Platform prerequisites isolated from application DDL',
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
        afterAnyFailure: true,
        assert: 'delete contaminated branch; do not continue mid-chain',
      },
    ],
    patent6AndImmutability:
      'Inherited from Option D assembled lineage + security modules; exact bindings must be verified in rehearsal gate (not this authoring auth)',
    partialReplayRlsRisk: 'reduced vs historical phase1 split; still medium until full-chain rehearsal',
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
**Replay: NOT authorized by package authoring**  
**Active \`supabase/migrations/\`: untouched**

## Proposed lineage (dashboard = GitHub same files/order)

| Order | Version | Name | Kind |
|------:|---------|------|------|
${modules
  .map((m) => `| ${m.order} | \`${m.version}\` | \`${m.name}\` | ${m.kind} |`)
  .join('\n')}

## Dispositions
- **d6_2a–d**: guarded Option D substitutions
- **tcp1**: schema/RLS/functions; complimentary seed **omitted**
- **grant**: unique index only; no LOCK/RAISE/UPDATE

## Authority
Built from Option D manifest SHA-256 \`9dc080cf…\` / 151 assembled files + substitutions, with ESC overlays.

See \`MANIFEST.json\` and \`docs/migration-remediation/executable-squash-candidate-package-2026-09-06.md\`.
`;
  writeLf(path.join(OUT_DIR, 'README.md'), readme);

  const doc = `# Executable squash/baseline candidate package — 2026-09-06

**Authorization:** authoring + static validation only.  
**PR #314:** draft. **Production mutation:** NO. **Docker/branch replay:** NO.

## Bound pins
- Start HEAD: \`157c561b85793248cce0d8256f16cb43c298c1b6\`
- main: \`9d8a01d37422179ddd68bbd181a8815d8a893577\`
- Option D: blob \`0d2a39a3…\` · SHA-256 \`9dc080cf…\` · PASS 151/151
- CLI: 2.116.0

## Proposed versions / module order
See \`supabase/migrations-draft/executable-squash-candidate/MANIFEST.json\`.

## Package files
Under \`supabase/migrations-draft/executable-squash-candidate/modules/\` (8 SQL modules) + \`MANIFEST.json\` + \`README.md\`.

## DML
See \`docs/migration-remediation/evidence/executable-squash-candidate-dml-allowlist.json\`.

## tcp1 / grant / d6
- d6: **ALLOW guarded**
- tcp1: **OMIT seed, keep schema**
- grant: **schema index only**

## Comparison
See \`docs/migration-remediation/evidence/executable-squash-candidate-comparison.json\`.

**Ready for independent source review:** YES  
**Ready for local replay:** NO (needs separate auth)  
**Ready for production mutation:** NO

## Next authorization
Independent source review of this sealed package (hashes/modules/DML/security). Only after that: disposable local rehearsal auth — still no production history mutation.
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
          bytes: e.utf8LfBytes,
          sha256: e.sha256,
          blob: e.gitBlobId,
        })),
        totalBytes: packageManifest.totalUtf8LfBytes,
        packageSeal: packageManifest.packageSha256OfConcatenatedEntryHashes,
        forwardFiles,
        appSources: appSources.length,
        securitySources: securitySources.length,
      },
      null,
      2
    )
  );
}

main();
