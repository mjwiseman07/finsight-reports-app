#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const prod = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, 'docs/migration-remediation/evidence/option1-prod-schema-migrations-version-name-list.json'),
    'utf8'
  )
);
const prodVers = new Set(prod.map((r) => r.version));
const prodNames = new Set(prod.map((r) => r.name));
const migDir = path.join(ROOT, 'supabase/migrations');
const git = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();

function ver(f) {
  const m = f.match(/^(\d{14})/);
  return m ? m[1] : null;
}
function name(f) {
  return f.replace(/\.sql$/, '').replace(/^\d{14}_/, '').replace(/^\d{8}_\d{4}_/, '');
}

const gitOnlyByVer = [];
const gitVerInProd = [];
for (const f of git) {
  const v = ver(f);
  const n = name(f);
  if (!v) continue;
  if (!prodVers.has(v)) gitOnlyByVer.push({ f, v, n, nameInProd: prodNames.has(n) });
  else gitVerInProd.push({ f, v, n });
}

const nameInProdButDiffVer = gitOnlyByVer.filter((x) => x.nameInProd);
const trueUnappliedName = gitOnlyByVer.filter((x) => !x.nameInProd);

const out = {
  gitFiles: git.length,
  prodVersions: prod.length,
  gitVersionsAlsoInProd: gitVerInProd.length,
  gitOnlyByVersion: gitOnlyByVer.length,
  gitOnlyNameAlsoInProd: nameInProdButDiffVer.length,
  gitOnlyNameNotInProd: trueUnappliedName.length,
  trueUnappliedName,
  nameInProdButDiffVer,
  gitOnlyByVer,
};

fs.writeFileSync(
  path.join(ROOT, 'docs/migration-remediation/evidence/option1-git-vs-prod-unapplied-inventory.json'),
  JSON.stringify(out, null, 2)
);
console.log(
  JSON.stringify(
    {
      gitFiles: out.gitFiles,
      prodVersions: out.prodVersions,
      gitVersionsAlsoInProd: out.gitVersionsAlsoInProd,
      gitOnlyByVersion: out.gitOnlyByVersion,
      gitOnlyNameAlsoInProd: out.gitOnlyNameAlsoInProd,
      gitOnlyNameNotInProd: out.gitOnlyNameNotInProd,
      sampleUnapplied: trueUnappliedName.slice(0, 30).map((x) => x.f),
    },
    null,
    2
  )
);
