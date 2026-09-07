#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const evidence = path.join(root, 'docs/migration-remediation/evidence');
const invPath = path.join(evidence, 'option1-prod-schema-migrations-hash-inventory.json');
const sumPath = path.join(evidence, 'option1-prod-schema-migrations-hash-inventory.summary.json');
const inv = JSON.parse(fs.readFileSync(invPath, 'utf8'));
const summary = JSON.parse(fs.readFileSync(sumPath, 'utf8'));

const versionList = JSON.parse(
  fs.readFileSync(path.join(evidence, 'option1-prod-schema-migrations-version-name-list.json'), 'utf8')
);
const objectRefs = JSON.parse(
  fs.readFileSync(path.join(evidence, 'option1-prod-key-version-object-refs.json'), 'utf8')
);

const invVersions = inv.inventory.map((r) => r.version);
const listVersions = versionList.map((r) => r.version);
const versionListCrossCheck = {
  method1_inventory_count: invVersions.length,
  method2_version_name_list_count: listVersions.length,
  counts_match: invVersions.length === listVersions.length,
  versions_equal:
    invVersions.length === listVersions.length && invVersions.every((v, i) => v === listVersions[i]),
  first: invVersions[0],
  last: invVersions[invVersions.length - 1],
  names_equal:
    inv.inventory.length === versionList.length &&
    inv.inventory.every((r, i) => r.name === versionList[i].name),
};

const migDir = path.join(root, 'supabase/migrations');
const gitFiles = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql'));
function nameFromGit(f) {
  return f.replace(/\.sql$/, '').replace(/^\d{14}_/, '').replace(/^\d{8}_\d{4}_/, '');
}
const gitByName = {};
for (const f of gitFiles) {
  const n = nameFromGit(f);
  gitByName[n] = gitByName[n] || [];
  gitByName[n].push(f);
}
let nameOverlap = 0;
const nameMatches = [];
for (const r of inv.inventory) {
  const hits = gitByName[r.name] || [];
  if (hits.length) {
    nameOverlap++;
    nameMatches.push({ version: r.version, name: r.name, gitFiles: hits });
  }
}

const objByVer = Object.fromEntries(objectRefs.map((r) => [r.version, r]));
function attach(t) {
  const o = objByVer[t.production_version];
  if (o) {
    t.referenced_objects = {
      table_ops: o.table_ops,
      view_ops: o.view_ops,
      function_ops: o.function_ops,
      insert_targets: o.insert_targets,
      update_targets: o.update_targets,
    };
  }
}
for (const t of inv.option1_all_candidate_versions || []) attach(t);
for (const t of inv.option1_proposed_mutate_targets || []) attach(t);
for (const t of summary.option1_all_candidate_versions || []) attach(t);
for (const t of summary.option1_proposed_mutate_targets || []) attach(t);

inv.version_list_cross_check = versionListCrossCheck;
inv.name_overlap_with_active_git = {
  production_names_with_git_file_same_suffix: nameOverlap,
  sample: nameMatches.slice(0, 40),
  note: 'Active supabase/migrations/ mostly uses different version timestamps than production; zero exact version↔git body matches is expected.',
};
inv.object_refs_key_versions = objectRefs;

summary.version_list_cross_check = versionListCrossCheck;
summary.name_overlap_with_active_git = inv.name_overlap_with_active_git;
summary.object_refs_key_versions = objectRefs;
summary.option1_all_candidate_versions = inv.option1_all_candidate_versions;
summary.option1_proposed_mutate_targets = inv.option1_proposed_mutate_targets;

fs.writeFileSync(invPath, JSON.stringify(inv, null, 2));
fs.writeFileSync(sumPath, JSON.stringify(summary, null, 2));

const mdPath = path.join(
  root,
  'docs/migration-remediation/option1-prod-schema-migrations-inventory-2026-09-06.md'
);
let md = fs.readFileSync(mdPath, 'utf8');
if (!md.includes('## Independent version-list cross-check')) {
  const extra = [];
  extra.push('');
  extra.push('## Independent version-list cross-check');
  extra.push('');
  extra.push('- Method 1 (hash inventory) versions: **' + versionListCrossCheck.method1_inventory_count + '**');
  extra.push('- Method 2 (version/name-only query) versions: **' + versionListCrossCheck.method2_version_name_list_count + '**');
  extra.push('- Counts match: **' + versionListCrossCheck.counts_match + '**');
  extra.push('- Ordered versions equal: **' + versionListCrossCheck.versions_equal + '**');
  extra.push('- Ordered names equal: **' + versionListCrossCheck.names_equal + '**');
  extra.push('- First/last: `' + versionListCrossCheck.first + '` … `' + versionListCrossCheck.last + '`');
  extra.push('');
  extra.push('## Active git comparison note');
  extra.push('');
  extra.push(
    'Exact production version ↔ `supabase/migrations/` SHA-256 matches: **0**. Name-suffix overlap: **' +
      nameOverlap +
      '**. Candidate SQL for Option 1 targets comes from Option D substitutions / clean-replay proposals, not active git timestamp identity.'
  );
  extra.push('');
  extra.push('## Key-version object references (sanitized)');
  extra.push('');
  for (const r of objectRefs) {
    extra.push(
      '- `' +
        r.version +
        '` ' +
        r.name +
        ': inserts=' +
        JSON.stringify(r.insert_targets) +
        ' updates=' +
        JSON.stringify(r.update_targets) +
        ' tables=' +
        JSON.stringify(r.table_ops) +
        ' functions=' +
        JSON.stringify(r.function_ops)
    );
  }
  extra.push('');
  md = md.replace('## Artifacts', extra.join('\n') + '\n## Artifacts');
  fs.writeFileSync(mdPath, md);
}

console.log(JSON.stringify({ versionListCrossCheck, nameOverlap, targets: (summary.option1_proposed_mutate_targets || []).map((t) => ({ v: t.production_version, sha: t.candidate && t.candidate.sha256, blob: t.candidate && t.candidate.gitBlob, bytes: t.candidate && t.candidate.bytes, objs: t.referenced_objects })) }, null, 2));
