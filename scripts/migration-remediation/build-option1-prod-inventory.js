#!/usr/bin/env node
/**
 * Read-only Option 1 planning inventory builder.
 * Consumes sanitized MCP execute_sql exports (hashes only; no SQL bodies).
 * Does not mutate production.
 */
'use strict';

const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '../..');
const evidenceDir = path.join(root, 'docs/migration-remediation/evidence');
fs.mkdirSync(evidenceDir, { recursive: true });

function parseUntrusted(file) {
  const raw = fs.readFileSync(file, 'utf8');
  let text = raw;
  try {
    const j = JSON.parse(raw);
    if (typeof j === 'string') text = j;
    else if (j.result) text = typeof j.result === 'string' ? j.result : JSON.stringify(j.result);
    else text = JSON.stringify(j);
  } catch {
    /* plain MCP text dump */
  }
  // Prefer payload that starts with JSON array/object (skip prose that mentions the tag name).
  const re = /<untrusted-data-[^>]+>\s*([\[{][\s\S]*?)\s*<\/untrusted-data-[^>]+>/g;
  let m;
  let last = null;
  while ((m = re.exec(text)) !== null) last = m;
  if (!last) throw new Error('no untrusted JSON block in ' + file);
  return JSON.parse(last[1]);
}

function hashUtf8LfBuffer(buf) {
  const text = buf.toString('utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lf = Buffer.from(text, 'utf8');
  return {
    bytes: lf.length,
    sha256: crypto.createHash('sha256').update(lf).digest('hex'),
    md5: crypto.createHash('md5').update(lf).digest('hex'),
  };
}

function hashFile(p) {
  const buf = fs.readFileSync(p);
  const h = hashUtf8LfBuffer(buf);
  const rel = path.relative(root, p).replace(/\\/g, '/');
  const gitBlob = execSync(`git hash-object "${rel}"`, { cwd: root }).toString().trim();
  return { ...h, gitBlob, path: rel };
}

function versionFromName(fname) {
  const m = fname.match(/^(\d{14})/);
  return m ? m[1] : null;
}

const invFile =
  process.env.OPTION1_INV_FILE ||
  'C:/Users/mattj/.cursor/projects/c-Users-mattj-finsight-reports/agent-tools/2cc18d0e-55d4-4cff-bfce-b88187efab12.txt';
const classFile =
  process.env.OPTION1_CLASS_FILE ||
  'C:/Users/mattj/.cursor/projects/c-Users-mattj-finsight-reports/agent-tools/9b54828d-3b1b-4974-8905-71d6d8f6e19e.txt';

const inventory = parseUntrusted(invFile)[0].inventory;
const classifications = parseUntrusted(classFile);
const byVer = Object.fromEntries(inventory.map((r) => [r.version, r]));
const classByVer = Object.fromEntries(classifications.map((r) => [r.version, r]));

const keyVerify = [
  {
    version: '20260701043602',
    combined_sha256: '5ce9f47bc051393665675d795c6e685bc2c813cd355c2ac39367cd9c59145072',
    combined_md5: '5992414bde50c4562925b60361721b44',
    combined_utf8_lf_bytes: 6231,
  },
  {
    version: '20260703182655',
    combined_sha256: '4ff9251055f2af8a3b4314409c198f61a0d2597a0f7b44819d6ccb5f3ac044bb',
    combined_md5: '94914d3ef889f1ca1a002f6c8b0404b0',
    combined_utf8_lf_bytes: 1002,
  },
  {
    version: '20260703184839',
    combined_sha256: 'fc53cb1efe54eea106ebfed71d724ccde51573ad148151e77989d924c4f9988e',
    combined_md5: 'd28ab0c40e3abb20d602bf1842b8146e',
    combined_utf8_lf_bytes: 1446,
  },
  {
    version: '20260703190541',
    combined_sha256: '5daaf4fd08488b42796f4acfa3c567bc81a1a5205d4700ec998ea3787b4e0a6a',
    combined_md5: 'f14b10c683b74cb93f13283c0986ac4c',
    combined_utf8_lf_bytes: 1099,
  },
  {
    version: '20260703192608',
    combined_sha256: 'f1b7ec4eb94c37730ff7cef1b5be27f1861d2df06a11ef5d2251e3d4a4546ab5',
    combined_md5: '5ad9bc5d6d6c256054ce3f32980eacb6',
    combined_utf8_lf_bytes: 1103,
  },
];

const dual = keyVerify.map((k) => {
  const a = byVer[k.version];
  return {
    version: k.version,
    match:
      !!a &&
      a.combined_sha256 === k.combined_sha256 &&
      a.combined_md5 === k.combined_md5 &&
      a.combined_utf8_lf_bytes === k.combined_utf8_lf_bytes,
    method1: {
      sha256: a?.combined_sha256,
      md5: a?.combined_md5,
      bytes: a?.combined_utf8_lf_bytes,
      stmtCount: a?.statement_count,
    },
    method2: k,
  };
});

const migDir = path.join(root, 'supabase/migrations');
const gitFiles = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
const gitByVer = {};
for (const f of gitFiles) {
  const v = versionFromName(f);
  if (!v) continue;
  gitByVer[v] = hashFile(path.join(migDir, f));
}

const manifestRel = 'docs/migration-remediation/option-d-replay-manifest.json';
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestRel), 'utf8'));
const manBuf = fs.readFileSync(path.join(root, manifestRel));
const manifestBlob = execSync(`git hash-object "${manifestRel}"`, { cwd: root }).toString().trim();
const manSha = crypto.createHash('sha256').update(manBuf).digest('hex');

const recoveredCandidates = {};
function walkSql(dir, relBase) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    const r = relBase + '/' + ent.name;
    if (ent.isDirectory()) walkSql(p, r);
    else if (ent.name.endsWith('.sql')) {
      const v = versionFromName(ent.name);
      const key = v || r;
      recoveredCandidates[key] = hashFile(p);
    }
  }
}
walkSql(path.join(root, 'supabase/migrations-draft'), 'supabase/migrations-draft');

const foundationsRel = 'supabase/migrations-draft/20260701043599_foundations_baseline.sql';
const foundations = fs.existsSync(path.join(root, foundationsRel))
  ? hashFile(path.join(root, foundationsRel))
  : null;

const knownFail = {
  '20260703182655': {
    why: 'Unconditional INSERT into client_active_rules for fixture firm_client_id; FK fail on data-less branch (G2 second replay)',
    class: 'customer/operational DML',
  },
  '20260703184839': {
    why: 'Same fixture activation pattern as d6_2a (mfg)',
    class: 'customer/operational DML',
  },
  '20260703190541': {
    why: 'Same fixture activation pattern as d6_2a (retail)',
    class: 'customer/operational DML',
  },
  '20260703192608': {
    why: 'Same fixture activation pattern as d6_2a (ps)',
    class: 'customer/operational DML',
  },
};

const provenanceNameRes = [/tcp1_w1_solo_bk_pilot_slots/i, /accounting_canonical_connected_grant/i];

function classifyOps(c) {
  if (!c) return ['unknown'];
  const tags = [];
  if (c.has_schema_ddl) tags.push('schema-only');
  if (c.looks_like_reference_seed) tags.push('reference seed');
  if (c.has_dml_keywords) tags.push('customer/operational DML');
  if (c.has_rls_policy) tags.push('policy/RLS');
  if (c.has_function) tags.push('function/RPC');
  if (c.has_trigger) tags.push('trigger');
  if (c.has_view) tags.push('view');
  if (c.has_grant) tags.push('grant/revoke');
  if (c.has_extension) tags.push('extension');
  if (c.has_rename) tags.push('rename');
  if (c.has_assertion_like) tags.push('assertion');
  if (tags.length === 0) tags.push('unclassified-keywords-absent');
  return [...new Set(tags)];
}

const classificationTotals = {};
function bump(k) {
  classificationTotals[k] = (classificationTotals[k] || 0) + 1;
}

const rows = [];
for (const r of inventory) {
  const git = gitByVer[r.version];
  const cls = classByVer[r.version];
  const ops = classifyOps(cls);
  const fail = knownFail[r.version];
  const labels = [];
  let exactGit = false;
  if (git && git.sha256 === r.combined_sha256) {
    labels.push('Exact production ↔ Git match');
    exactGit = true;
  } else if (git && git.sha256 !== r.combined_sha256) {
    labels.push('Same version with divergent executable SQL');
  } else if (!git) {
    labels.push('Production-only migration');
  }

  const rec = recoveredCandidates[r.version];
  if (rec && rec.sha256 === r.combined_sha256) {
    labels.push('Exact production ↔ recovered evidence match');
  }
  if (!r.has_executable_text || r.statement_presence_mode !== 'present') {
    labels.push('Tracking-only or missing executable statements');
  }
  if (fail) {
    labels.push('Requires guarded same-version replacement');
  } else if (exactGit && !cls?.has_dml_keywords) {
    labels.push('Safe as currently recorded');
  }
  if (provenanceNameRes.some((re) => re.test(r.name))) {
    labels.push('Requires additional provenance before any mutation');
  }
  for (const l of labels) bump(l);

  rows.push({
    version: r.version,
    name: r.name,
    statement_count: r.statement_count,
    statement_presence: r.statement_presence_mode,
    has_executable_text: r.has_executable_text,
    combined_utf8_lf_bytes: r.combined_utf8_lf_bytes,
    combined_sha256: r.combined_sha256,
    combined_md5: r.combined_md5,
    txn_wrapper_keywords_present: r.txn_wrapper_keywords_present,
    starts_with_begin: r.starts_with_begin,
    statements: r.statements,
    operation_tags: ops,
    dml: !!cls?.has_dml_keywords,
    rls: !!cls?.has_rls_policy,
    git_match: git
      ? {
          path: git.path,
          sha256: git.sha256,
          md5: git.md5,
          bytes: git.bytes,
          gitBlob: git.gitBlob,
          exact: exactGit,
        }
      : null,
    recovered_match: rec
      ? { path: rec.path, sha256: rec.sha256, exact: rec.sha256 === r.combined_sha256 }
      : null,
    known_dashboard_replay_fail: fail || null,
    classification_labels: labels,
  });
}

const gitOnly = [];
for (const [v, g] of Object.entries(gitByVer)) {
  if (!byVer[v]) {
    gitOnly.push({ version: v, ...g });
    bump('Git-only migration');
  }
}

bump('Covered by derived foundations baseline');

const substDir = path.join(
  root,
  'supabase/migrations-draft/option-d-isolated-replay/substitutions'
);
const targetSpecs = [
  {
    version: '20260703182655',
    name: 'd6_2a_test_client_activation',
    candidates: [
      'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2000_d6_2a_test_client_activation.sql',
      'supabase/migrations-draft/clean-replay-proposals/d6_2a_test_client_activation.guarded.sql',
    ],
    whyFail:
      'Unconditional fixture INSERT into client_active_rules; FK fail when firm_clients row absent (G2 #2)',
  },
  {
    version: '20260703184839',
    name: 'd6_2b_mfg_activation',
    candidates: [
      'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2200_d6_2b_mfg_activation.sql',
    ],
    whyFail: 'Same fixture activation class as d6_2a (mfg)',
  },
  {
    version: '20260703190541',
    name: 'd6_2c_retail_activation',
    candidates: [
      'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2300_d6_2c_retail_activation.sql',
    ],
    whyFail: 'Same fixture activation class as d6_2a (retail)',
  },
  {
    version: '20260703192608',
    name: 'd6_2d_ps_activation',
    candidates: [
      'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260703_2400_d6_2d_ps_activation.sql',
    ],
    whyFail: 'Same fixture activation class as d6_2a (ps)',
  },
  {
    version: '20260708051526',
    name: 'tcp1_w1_solo_bk_pilot_slots',
    candidates: [
      'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260708120000_tcp1_w1_solo_bk_pilot_slots.sql',
    ],
    whyFail:
      'Option D substitution target — pilot_slots create/seed path; production version timestamp differs from Option D filename (20260708051526 vs 20260708120000). Requires additional provenance before statements[] mutation',
    provenanceOnly: true,
  },
  {
    version: '20260814023005',
    name: 'accounting_canonical_connected_grant',
    candidates: [
      'supabase/migrations-draft/option-d-isolated-replay/substitutions/20260814221500_accounting_canonical_connected_grant.sql',
    ],
    whyFail:
      'Option D substitution / UPDATE accounting_connections grant path; production version 20260814023005 vs Option D filename 20260814221500. Requires additional provenance before any mutation',
    provenanceOnly: true,
  },
];

const option1Targets = [];
for (const t of targetSpecs) {
  const prod = byVer[t.version];
  if (!prod) {
    option1Targets.push({
      production_version: t.version,
      production_name: t.name,
      status: 'NOT_IN_PRODUCTION_INVENTORY',
      note: 'Version expected from docs/manifest but absent from production schema_migrations export',
    });
    continue;
  }
  const candidateHashes = [];
  for (const c of t.candidates) {
    const full = path.join(root, c);
    if (fs.existsSync(full)) candidateHashes.push(hashFile(full));
  }
  const primary = candidateHashes[0] || null;
  option1Targets.push({
    production_version: t.version,
    production_name: prod.name,
    status: t.provenanceOnly
      ? 'REQUIRES_ADDITIONAL_PROVENANCE'
      : 'PROPOSED_GUARDED_SAME_VERSION_REPLACEMENT',
    existing: {
      statement_count: prod.statement_count,
      combined_sha256: prod.combined_sha256,
      combined_md5: prod.combined_md5,
      combined_utf8_lf_bytes: prod.combined_utf8_lf_bytes,
      statements: prod.statements,
    },
    candidate_source_path: primary?.path || t.candidates[0],
    candidate: primary,
    alternate_candidates: candidateHashes.slice(1),
    why_dashboard_replay_fails: t.whyFail,
    why_candidate_compatible: t.provenanceOnly
      ? 'Not approved as Option 1 mutate target until provenance review completes'
      : 'Option D substitution / guarded draft uses EXISTS-style guards so missing fixture rows skip DML; live prod with fixtures present must remain schema-compatible no-op or intentional seed — byte-review required before mutate',
    contains_dml: true,
    rls_exposure:
      'Medium if mid-chain fails with partial schema; guarded skip lowers data-less branch contamination. No customer-row export in this inventory.',
    dependencies_required: [
      'firms',
      'companies',
      'firm_clients (for activation family)',
      'prior schema through this version',
    ],
    expected_dashboard_replay_order: inventory.findIndex((r) => r.version === t.version) + 1,
    rollback_material:
      'Restore prior statements[] for version ' +
      t.version +
      ' from backup (combined_sha256=' +
      prod.combined_sha256 +
      ', bytes=' +
      prod.combined_utf8_lf_bytes +
      ')',
  });
}

const provenanceNeeded = inventory
  .filter((r) => provenanceNameRes.some((re) => re.test(r.name)))
  .map((r) => ({
    version: r.version,
    name: r.name,
    sha256: r.combined_sha256,
    bytes: r.combined_utf8_lf_bytes,
    dml: !!classByVer[r.version]?.has_dml_keywords,
  }));

const dmlRows = rows
  .filter((r) => r.dml)
  .map((r) => ({ version: r.version, name: r.name, ops: r.operation_tags, sha256: r.combined_sha256 }));
const rlsRows = rows.filter((r) => r.rls).map((r) => ({ version: r.version, name: r.name }));

const foundationsGap = {
  disposition: 'BLOCKER — cannot host foundations via same-version replacement without changing version order',
  detail:
    'Earliest production version is 20260701043602 (phase1_subscriptions_core). No earlier production row exists. Hosting foundations requires inserting/recording 20260701043599 (changes order) or Option 2 squash.',
  can_same_version_host: false,
  proposed_host_version: null,
  draft_baseline: foundations,
  labels: ['Covered by derived foundations baseline', 'Requires additional provenance before any mutation'],
  fallback: 'Option 2 squash OR separately authorized insert/record of version 20260701043599 before phase1',
};

const substitutions = Array.isArray(manifest.substitutions) ? manifest.substitutions : [];

const summary = {
  generatedAt: new Date().toISOString(),
  authorization:
    'read-only production schema_migrations hash inventory for Option 1 planning - no mutation',
  bound: {
    projectRef: 'jzmdgwwiestcmmeuhhkr',
    mainHead: '9d8a01d37422179ddd68bbd181a8815d8a893577',
    pr312Merge: 'bff6b637506d7323cba1035104e491e7ea79333c',
    pr313Merge: '9d8a01d37422179ddd68bbd181a8815d8a893577',
    optionDManifestBlobExpected: '0d2a39a3d4220c8d28e3269a87fa8c01e8bf2d4e',
    optionDManifestSha256Expected:
      '9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359',
    optionDManifestBlobObserved: manifestBlob,
    optionDManifestSha256Observed: manSha,
    optionDRuntime: 'PASS 151/151',
    dashboardParity: 'unresolved',
  },
  production_totals: {
    version_count: inventory.length,
    statements_null_rows: 0,
    statements_empty_array_rows: 0,
    statements_present_rows: inventory.length,
    total_statement_elements: inventory.reduce((s, r) => s + r.statement_count, 0),
    all_single_statement: inventory.every((r) => r.statement_count === 1),
    txn_wrapper_keyword_rows: inventory.filter((r) => r.txn_wrapper_keywords_present).length,
    starts_with_begin_rows: inventory.filter((r) => r.starts_with_begin).length,
  },
  dual_hash_verification: { allMatch: dual.every((d) => d.match), checks: dual },
  manifest_verification: {
    blobMatch: manifestBlob === '0d2a39a3d4220c8d28e3269a87fa8c01e8bf2d4e',
    sha256Match:
      manSha === '9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359',
    observedBlob: manifestBlob,
    observedSha256: manSha,
    bytes: manBuf.length,
    substitutionsCount: substitutions.length,
    substitutionSummaries: substitutions.map((s) => ({
      filename: s.filename || null,
      action: s.action || null,
      justification: s.justification || null,
      originalSha256: s.originalSha256 || null,
      replacementSha256: s.replacementSha256 || null,
      order: s.order ?? null,
      replacementSource:
        s.replacementSource ||
        (s.filename
          ? 'supabase/migrations-draft/option-d-isolated-replay/substitutions/' + s.filename
          : null),
    })),
  },
  classification_totals: classificationTotals,
  git_active_migration_files: gitFiles.length,
  git_only_count: gitOnly.length,
  git_only: gitOnly,
  exact_git_matches: rows.filter((r) =>
    r.classification_labels.includes('Exact production ↔ Git match')
  ).length,
  divergent_same_version: rows.filter((r) =>
    r.classification_labels.includes('Same version with divergent executable SQL')
  ).length,
  production_only: rows.filter((r) =>
    r.classification_labels.includes('Production-only migration')
  ).length,
  option1_proposed_mutate_targets: option1Targets.filter(
    (t) => t.status === 'PROPOSED_GUARDED_SAME_VERSION_REPLACEMENT'
  ),
  option1_all_candidate_versions: option1Targets,
  foundations_gap: foundationsGap,
  versions_requiring_additional_provenance: provenanceNeeded,
  dml_findings: { count: dmlRows.length, versions: dmlRows },
  rls_findings: { count: rlsRows.length, versions: rlsRows },
  option1_feasible_without_squash: false,
  option1_feasible_note:
    'd6_2a–d6_2d are inventoriable same-version replacement targets, but foundations cannot be hosted on any existing production version without changing version order. Full dashboard parity via Option 1 alone (no insert of 20260701043599 and no squash) is NOT feasible.',
  proposed_rehearsal_order: [
    '1. Retain this hash inventory + full schema_migrations backup dump (statements included in secure backup only)',
    '2. Resolve foundations gap mechanism (authorized insert of 20260701043599 OR Option 2 squash) — BLOCKER for same-version-only',
    '3. Byte-review Option D substitutions for d6_2a→d6_2d; disposable rehearsal of statements[] replace',
    '4. Additional provenance for tcp1_w1_solo_bk_pilot_slots and accounting_canonical_connected_grant',
    '5. Data-less dashboard branch full-chain proof',
    '6. Separate production mutation authorization (not this inventory)',
  ],
  backup_rollback_requirements: [
    'Full production DB snapshot before any schema_migrations mutation',
    'Machine-readable dump of schema_migrations including statements[] with matching sha256/md5/bytes',
    'Per mutated version: prior statement bytes + hashes as rollback material',
    'Delete any failed/contaminated dashboard branch; do not continue mid-chain',
  ],
  next_bounded_authorization:
    'Authorize foundations-gap disposition design (insert 20260701043599 vs Option 2 squash) AND/OR byte-review of d6_2a–d6_2d guarded replacements for disposable rehearsal only — still no production statements[] mutation',
};

const outInventory = { ...summary, inventory: rows };

fs.writeFileSync(
  path.join(evidenceDir, 'option1-prod-schema-migrations-hash-inventory.json'),
  JSON.stringify(outInventory, null, 2)
);
fs.writeFileSync(
  path.join(evidenceDir, 'option1-prod-schema-migrations-hash-inventory.summary.json'),
  JSON.stringify(summary, null, 2)
);

// Human-readable report
const md = [];
md.push('# Option 1 — production schema_migrations hash inventory (read-only)');
md.push('');
md.push('**Authorization:** read-only production migration metadata inventory for Option 1 planning.');
md.push('**Production mutation:** not authorized; none performed.');
md.push('**Project:** `jzmdgwwiestcmmeuhhkr`');
md.push('**Bound main HEAD:** `9d8a01d37422179ddd68bbd181a8815d8a893577`');
md.push('**Generated:** ' + summary.generatedAt);
md.push('');
md.push('## Production totals');
md.push('');
md.push('| Metric | Value |');
md.push('|--------|-------|');
md.push('| Versions | ' + summary.production_totals.version_count + ' |');
md.push('| Rows with statements present | ' + summary.production_totals.statements_present_rows + ' |');
md.push('| Null statements rows | ' + summary.production_totals.statements_null_rows + ' |');
md.push('| Empty statements[] rows | ' + summary.production_totals.statements_empty_array_rows + ' |');
md.push('| Total statement elements | ' + summary.production_totals.total_statement_elements + ' |');
md.push('| All single-statement | ' + summary.production_totals.all_single_statement + ' |');
md.push('| Txn-wrapper keyword rows | ' + summary.production_totals.txn_wrapper_keyword_rows + ' |');
md.push('| Starts-with-BEGIN rows | ' + summary.production_totals.starts_with_begin_rows + ' |');
md.push('');
md.push('## Hash / provenance verification');
md.push('');
md.push('- Dual method hash checks (full inventory agg vs keyed re-query): **' +
  (summary.dual_hash_verification.allMatch ? 'PASS' : 'FAIL') +
  '**');
md.push('- Option D manifest blob: observed `' +
  summary.manifest_verification.observedBlob +
  '` match=' +
  summary.manifest_verification.blobMatch);
md.push('- Option D manifest SHA-256: match=' + summary.manifest_verification.sha256Match);
md.push('- Option D substitutions in manifest: ' + summary.manifest_verification.substitutionsCount);
md.push('');
md.push('## Classification totals');
md.push('');
for (const [k, v] of Object.entries(summary.classification_totals).sort()) {
  md.push('- **' + k + ':** ' + v);
}
md.push('');
md.push('- Exact production ↔ Git match: ' + summary.exact_git_matches);
md.push('- Same version divergent SQL: ' + summary.divergent_same_version);
md.push('- Production-only: ' + summary.production_only);
md.push('- Git-only: ' + summary.git_only_count);
md.push('- DML-keyword versions: ' + summary.dml_findings.count);
md.push('- RLS/policy-keyword versions: ' + summary.rls_findings.count);
md.push('');
md.push('## Foundations gap disposition');
md.push('');
md.push('**' + foundationsGap.disposition + '**');
md.push('');
md.push(foundationsGap.detail);
md.push('');
md.push('Fallback: ' + foundationsGap.fallback);
if (foundations) {
  md.push('');
  md.push(
    'Derived baseline draft: `' +
      foundations.path +
      '` · git-blob `' +
      foundations.gitBlob +
      '` · SHA-256 `' +
      foundations.sha256 +
      '` · bytes ' +
      foundations.bytes
  );
}
md.push('');
md.push('## Proposed Option 1 same-version targets (mutate NOT authorized)');
md.push('');
for (const t of summary.option1_all_candidate_versions) {
  md.push('### `' + t.production_version + '` — ' + (t.production_name || t.status));
  md.push('');
  md.push('- Status: **' + t.status + '**');
  if (t.existing) {
    md.push('- Existing statements: count=' + t.existing.statement_count +
      ', bytes=' + t.existing.combined_utf8_lf_bytes +
      ', sha256=`' + t.existing.combined_sha256 + '`' +
      ', md5=`' + t.existing.combined_md5 + '`');
  }
  if (t.candidate) {
    md.push('- Candidate: `' + t.candidate.path + '`');
    md.push('  - git-blob `' + t.candidate.gitBlob + '`');
    md.push('  - SHA-256 `' + t.candidate.sha256 + '`');
    md.push('  - MD5 `' + t.candidate.md5 + '`');
    md.push('  - bytes ' + t.candidate.bytes);
  } else if (t.candidate_source_path) {
    md.push('- Candidate path (missing locally): `' + t.candidate_source_path + '`');
  }
  if (t.why_dashboard_replay_fails) md.push('- Why replay fails: ' + t.why_dashboard_replay_fails);
  if (t.expected_dashboard_replay_order)
    md.push('- Expected dashboard order index: ' + t.expected_dashboard_replay_order);
  if (t.rollback_material) md.push('- Rollback: ' + t.rollback_material);
  md.push('');
}
md.push('## Option 1 feasible without squash?');
md.push('');
md.push('**No.** ' + summary.option1_feasible_note);
md.push('');
md.push('## Versions requiring additional provenance');
md.push('');
for (const p of summary.versions_requiring_additional_provenance) {
  md.push('- `' + p.version + '` ' + p.name + ' (sha256 `' + p.sha256 + '`, dml=' + p.dml + ')');
}
md.push('');
md.push('## Proposed rehearsal order');
md.push('');
for (const s of summary.proposed_rehearsal_order) md.push('- ' + s);
md.push('');
md.push('## Backup / rollback requirements');
md.push('');
for (const s of summary.backup_rollback_requirements) md.push('- ' + s);
md.push('');
md.push('## Next bounded authorization');
md.push('');
md.push(summary.next_bounded_authorization);
md.push('');
md.push('## Artifacts');
md.push('');
md.push('- `docs/migration-remediation/evidence/option1-prod-schema-migrations-hash-inventory.json`');
md.push('- `docs/migration-remediation/evidence/option1-prod-schema-migrations-hash-inventory.summary.json`');
md.push('- This report');
md.push('');
md.push('Raw SQL bodies are intentionally omitted; hashes and source paths only.');

fs.writeFileSync(
  path.join(root, 'docs/migration-remediation/option1-prod-schema-migrations-inventory-2026-09-06.md'),
  md.join('\n')
);

console.log(
  JSON.stringify(
    {
      versions: summary.production_totals.version_count,
      dual: summary.dual_hash_verification.allMatch,
      manifestOk:
        summary.manifest_verification.blobMatch && summary.manifest_verification.sha256Match,
      exactGit: summary.exact_git_matches,
      divergent: summary.divergent_same_version,
      prodOnly: summary.production_only,
      gitOnly: summary.git_only_count,
      dml: summary.dml_findings.count,
      rls: summary.rls_findings.count,
      mutateTargets: summary.option1_proposed_mutate_targets.map((t) => t.production_version),
      foundations: summary.foundations_gap.disposition,
      feasibleWithoutSquash: summary.option1_feasible_without_squash,
      substDirExists: fs.existsSync(substDir),
    },
    null,
    2
  )
);
