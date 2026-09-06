#!/usr/bin/env node
/**
 * Decode recovered function-source bodies from UTF-8 base64 (production statements[1]),
 * verify MD5/length, prepend provenance headers. Does not query production.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "..");
const RAW = path.join(ROOT, "docs/migration-remediation/evidence/option-d-required-functions/raw");
const OUT_DIR = path.join(ROOT, "supabase/migrations-draft/recovered-production-history");
const MANIFEST = path.join(
  ROOT,
  "docs/migration-remediation/evidence/option-d-required-functions/provenance-manifest.json",
);

function md5(s) {
  return crypto.createHash("md5").update(s, "utf8").digest("hex");
}
function sha256(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

const specs = [
  {
    version: "20260804213819",
    name: "pilot_lifecycle_events_hash_chain_trigger",
    file: "20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql",
    md5: "5ede7d6c22fe4b9ba15e9b038e5379dc",
    len: 7738,
  },
  {
    version: "20260804213934",
    name: "pilot_lifecycle_events_hash_digest_bytea_fix",
    file: "20260804213934_pilot_lifecycle_events_hash_digest_bytea_fix.sql",
    md5: "804e70213d39474337ad6a0526df4120",
    len: 3968,
  },
  {
    version: "20260804214151",
    name: "pilot_lifecycle_events_hash_extensions_search_path",
    file: "20260804214151_pilot_lifecycle_events_hash_extensions_search_path.sql",
    md5: "7a5489dd8dd316cf26eb02a413339f71",
    len: 4004,
  },
  {
    version: "20260804220220",
    name: "pilot_lifecycle_events_chain_seq_hardening",
    file: "20260804220220_pilot_lifecycle_events_chain_seq_hardening.sql",
    md5: "0dfe89813e31c0cf5341d8fd65ab4c18",
    len: 17126,
  },
  {
    version: "20260805005320",
    name: "pilot_lifecycle_anchors",
    file: "20260805005320_pilot_lifecycle_anchors.sql",
    md5: "74f838e87f887acae7cfee3bc65a00cc",
    len: 5905,
  },
];

function decodeBody(version) {
  const sqlPath = path.join(RAW, `${version}.sql`);
  const b64Path = path.join(RAW, `${version}.b64`);
  if (fs.existsSync(sqlPath)) {
    let t = fs.readFileSync(sqlPath, "utf8").replace(/\r\n/g, "\n");
    if (t.startsWith("\uFEFF")) t = t.slice(1);
    return t;
  }
  const b64 = fs.readFileSync(b64Path, "utf8").replace(/\s+/g, "");
  return Buffer.from(b64, "base64").toString("utf8");
}

const entries = [];
for (const s of specs) {
  const body = decodeBody(s.version);
  if (body.length !== s.len || md5(body) !== s.md5) {
    throw new Error(`${s.name} mismatch len=${body.length} md5=${md5(body)}`);
  }
  if (body.endsWith("\n")) {
    throw new Error(`${s.name} unexpectedly has trailing newline`);
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
  fs.writeFileSync(path.join(OUT_DIR, s.file), out, "utf8");
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

fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      warning:
        "Recovered production migration originals for Option D draft replay — NOT approved active supabase/migrations/ files.",
      source_project_ref: "jzmdgwwiestcmmeuhhkr",
      source_table: "supabase_migrations.schema_migrations",
      retrieval_mode: "read-only",
      retrieval_date: "2026-09-03",
      contains_data_rows: false,
      contains_credentials: false,
      statement_storage:
        "Each production row stores statements[] (here: exactly one SQL string in statements[1]). Files preserve that element bytes-for-bytes after the provenance header.",
      note: "chain_seq includes a DO backfill UPDATE of chain_seq on existing rows; on an empty table it is a no-op. anchors INSERT is inside sp_write_anchor_batch (caller-supplied params), not a seed of customer rows.",
      migrations: entries,
    },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ ok: true, count: entries.length, manifest: MANIFEST }, null, 2));
