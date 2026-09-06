#!/usr/bin/env node
/**
 * Finalize recovered Option D required-create originals:
 * prepend provenance headers while keeping statements[1] bytes exact.
 * Does not query production or execute SQL.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "..");
const DIR = path.join(
  ROOT,
  "supabase/migrations-draft/recovered-production-history",
);

function md5(s) {
  return crypto.createHash("md5").update(s, "utf8").digest("hex");
}
function sha256(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function readBody(file, startMarker, stripFinalNl) {
  let t = fs.readFileSync(path.join(DIR, file), "utf8").replace(/\r\n/g, "\n");
  const i = t.indexOf(startMarker);
  if (i < 0) throw new Error(`start marker missing in ${file}`);
  t = t.slice(i);
  if (stripFinalNl && t.endsWith("\n")) t = t.slice(0, -1);
  return t;
}

const specs = [
  {
    file: "20260704024059_d_entitlements_legacy_stripe_rename.sql",
    version: "20260704024059",
    name: "d_entitlements_legacy_stripe_rename",
    start: "BEGIN;",
    strip: true,
    md5: "76b4171c8bad53b1ef0965ebf2436366",
    len: 105,
  },
  {
    file: "20260804213003_pilot_lifecycle_events.sql",
    version: "20260804213003",
    name: "pilot_lifecycle_events",
    start: "-- Phase MEM-LIFECYCLE",
    strip: true,
    md5: "34ca62d02d68fac9fc81bf485ba1a02c",
    len: 5454,
  },
  {
    file: "20260804234230_lifecycle_issues.sql",
    version: "20260804234230",
    name: "lifecycle_issues",
    start: "-- Phase MEM_LIFECYCLE",
    strip: false,
    md5: "0b75c1945dea894acbe0427a847d13c5",
    len: 3274,
  },
];

const entries = [];
for (const s of specs) {
  const body = readBody(s.file, s.start, s.strip);
  if (body.length !== s.len || md5(body) !== s.md5) {
    throw new Error(
      `body mismatch ${s.name} len=${body.length} md5=${md5(body)}`,
    );
  }
  const header = [
    "-- PROVENANCE: FETCHED_PRODUCTION_READ_ONLY",
    "-- SOURCE_PROJECT_REF: jzmdgwwiestcmmeuhhkr",
    "-- SOURCE_TABLE: supabase_migrations.schema_migrations",
    `-- VERSION: ${s.version}`,
    `-- NAME: ${s.name}`,
    `-- DATABASE_MD5_UTF8: ${s.md5}`,
    "-- STATEMENT_COUNT: 1",
    `-- STATEMENT_BYTE_LENGTH: ${s.len}`,
    "-- WARNING: NOT AN APPROVED ACTIVE MIGRATION — recovered original for Option D draft replay only. Do not place in supabase/migrations/ without sign-off.",
    "-- CONTAINS_DATA_ROWS: false",
    "-- CONTAINS_CREDENTIALS: false",
    "-- SUBSTITUTION: none — original statements[1] preserved in order.",
    "",
    "",
  ].join("\n");
  const out = header + body;
  fs.writeFileSync(path.join(DIR, s.file), out, "utf8");
  entries.push({
    version: s.version,
    name: s.name,
    filename: s.file,
    database_md5_utf8: s.md5,
    sql_body_md5_utf8: md5(body),
    sql_body_sha256_utf8: sha256(body),
    local_file_sha256_utf8: sha256(out),
    statement_count: 1,
    statement_byte_lengths: [s.len],
    byte_length: s.len,
    contains_data_rows: false,
    contains_credentials: false,
    substitution: null,
  });
}

const manifestPath = path.join(
  ROOT,
  "docs/migration-remediation/evidence/option-d-required-creates/provenance-manifest.json",
);
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
const manifest = {
  warning:
    "These files are recovered production migration originals for Option D draft replay — NOT approved active supabase/migrations/ files.",
  source_project_ref: "jzmdgwwiestcmmeuhhkr",
  source_table: "supabase_migrations.schema_migrations",
  retrieval_mode: "read-only",
  retrieval_date: "2026-09-03",
  contains_data_rows: false,
  contains_credentials: false,
  statement_storage:
    "Each production row stores statements[] (here: exactly one SQL string in statements[1]). Files preserve that element bytes-for-bytes after the provenance header.",
  migrations: entries,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ ok: true, manifest: manifestPath, count: entries.length }, null, 2));
