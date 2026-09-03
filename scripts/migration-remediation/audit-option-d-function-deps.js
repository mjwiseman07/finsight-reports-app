#!/usr/bin/env node
/**
 * Audit Option D assembled-set function CREATE vs ALTER/GRANT/REVOKE/trigger bindings.
 * Identities are schema.name(normalized_types). Same-file CREATE then consume is ordered.
 * Does not connect to a database.
 */
const fs = require("fs");
const path = require("path");
const { splitStatements } = require("./baseline-sql-analyzer");
const {
  functionRefsDeep,
  isSafeConditionalFunctionRef,
} = require("./option-d-function-identity");

const ROOT = path.join(__dirname, "..", "..");
const ASSEMBLED = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const DEST = path.join(ROOT, "docs/migration-remediation/option-d-function-dependency-audit.json");

function refsInSql(sql) {
  const refs = [];
  for (const stmt of splitStatements(sql)) {
    for (const r of functionRefsDeep(stmt)) {
      refs.push({
        ...r,
        stmt: stmt.slice(0, 180),
        conditional: isSafeConditionalFunctionRef(stmt, r) || Boolean(r.ifExists),
      });
    }
  }
  return refs;
}

function main() {
  if (!fs.existsSync(ASSEMBLED) || !fs.existsSync(MANIFEST)) {
    console.error("FAIL: assembled set / replay manifest missing; run assemble-option-d-replay.js");
    process.exit(1);
  }
  const man = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const files = (man.entries || []).map((e) => ({
    filename: e.assembledFilename,
    absPath: path.join(ASSEMBLED, e.assembledFilename),
    role: e.role,
    order: e.order,
  }));

  const creators = new Map();
  const consumes = [];
  for (const f of files) {
    const sql = fs.readFileSync(f.absPath, "utf8");
    for (const r of refsInSql(sql)) {
      if (r.kind === "create_function") {
        if (!creators.has(r.identity)) creators.set(r.identity, []);
        creators.get(r.identity).push({ file: f.filename, role: f.role, order: f.order });
      } else {
        consumes.push({
          file: f.filename,
          role: f.role,
          order: f.order,
          ...r,
        });
      }
    }
  }

  const rows = consumes.map((c) => {
    const createdBy = creators.get(c.identity) || [];
    const creatorBefore = createdBy.filter((x) => {
      if (x.file === c.file) return true;
      if (c.order == null || x.order == null) return false;
      return x.order < c.order;
    });
    let classification;
    if (c.conditional) classification = "safe_conditional";
    else if (creatorBefore.length) classification = "creator_in_set_ordered";
    else if (createdBy.length) classification = "creator_in_set_ordered_incorrectly";
    else classification = "required_missing_create";
    return {
      file: c.file,
      order: c.order,
      kind: c.kind,
      identity: c.identity,
      conditional: Boolean(c.conditional),
      nestedInDo: Boolean(c.nestedInDo),
      createdBy: createdBy.map((x) => `${x.file}@${x.order ?? "?"}`),
      firstCreator: createdBy[0] ? `${createdBy[0].file}@${createdBy[0].order ?? "?"}` : null,
      classification,
    };
  });

  const required = rows.filter((r) => r.classification === "required_missing_create");
  const misordered = rows.filter((r) => r.classification === "creator_in_set_ordered_incorrectly");
  const uniqueMissing = [...new Set(required.map((r) => r.identity))].sort();
  const major1 = rows.filter((r) => r.file.includes("major_1_rpc_lockdown"));

  const table = [];
  const seen = new Set();
  for (const r of rows.filter((x) => x.file.includes("major_1_rpc_lockdown") || /pilot_lifecycle_events_|sp_write_anchor_batch/.test(x.identity))) {
    const k = `${r.identity}|${r.file}|${r.kind}`;
    if (seen.has(k)) continue;
    seen.add(k);
    table.push({
      identity: r.identity,
      consumer: r.file,
      consumerOrder: r.order,
      kind: r.kind,
      firstCreator: r.firstCreator,
      classification: r.classification,
    });
  }

  const out = {
    consumeCount: rows.length,
    createIdentityCount: creators.size,
    requiredMissingCount: required.length,
    uniqueRequiredMissingIdentities: uniqueMissing,
    misorderedCount: misordered.length,
    requiredDependenciesResolved: required.length === 0 && misordered.length === 0,
    major1Consumes: major1,
    functionDependencyTable: table,
    required,
    misordered,
    creates: [...creators.entries()].map(([identity, files]) => ({ identity, files })),
  };
  fs.writeFileSync(DEST, JSON.stringify(out, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        dest: DEST,
        consumeCount: out.consumeCount,
        createIdentityCount: out.createIdentityCount,
        requiredMissingCount: out.requiredMissingCount,
        uniqueRequiredMissing: uniqueMissing,
        misorderedCount: out.misorderedCount,
        major1Count: major1.length,
      },
      null,
      2,
    ),
  );
  process.exit(required.length === 0 && misordered.length === 0 ? 0 : 1);
}

main();
