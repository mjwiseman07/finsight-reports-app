"use strict";
const { spawnSync, execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT_REL = "scripts/security/bundles/credential-browser-containment-applicator.standalone.cjs";
const OUT = path.join(ROOT, OUT_REL);
const CONSTANTS = path.join(ROOT, "scripts/security/credential-browser-containment-constants.js");
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json",
);
const MANIFEST = path.join(
  ROOT,
  "docs/security/connection-credential-browser-containment/STANDALONE_BUNDLE_MANIFEST.json",
);
const SOURCES = [
  "scripts/security/apply-credential-browser-containment.js",
  "scripts/security/credential-browser-containment-apply-core.js",
  "scripts/security/credential-browser-containment-constants.js",
  "scripts/security/git-blob-authority.js",
];

function sha256(b) {
  return crypto.createHash("sha256").update(b).digest("hex");
}
function lf(s) {
  return String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function writeLf(f, t) {
  const x = lf(t);
  fs.writeFileSync(f, x.endsWith("\n") ? x : `${x}\n`);
}
function seal(rel) {
  writeLf(path.join(ROOT, rel), fs.readFileSync(path.join(ROOT, rel), "utf8"));
  const buf = fs.readFileSync(path.join(ROOT, rel));
  return {
    path: rel,
    oid: execFileSync("git", ["hash-object", rel], { encoding: "utf8" }).trim(),
    sha256: sha256(buf),
    bytes: buf.length,
  };
}

const dig = sha256(
  Buffer.from(
    JSON.stringify({
      artifact_commit: "dadd4345c6b4f5df718f1e31f27b161d05fe7aa9",
      project_ref: "jzmdgwwiestcmmeuhhkr",
      migration_path:
        "supabase/migrations/20260908031736_connection_credential_browser_containment.sql",
      migration_blob_oid: "a5051f23da5bc889d0612f76a61eec1c3cd487e7",
      migration_sha256:
        "71500fc8c56f484e3f2d5b49ff2b3161aad474027291a4eda22f26e7fc8071e7",
      migration_bytes: 10586,
      migration_version: "20260908031736",
      migration_name: "connection_credential_browser_containment",
      database_url_env: "CONTAINMENT_APPLY_DATABASE_URL",
      apply_authorization_token: "I_AUTHORIZE_CONTAINMENT_APPLY_20260908031736",
      advisory_lock: {
        name: "CREDENTIAL_BROWSER_CONTAINMENT_STAGE1",
        key1: 1129464387,
        key2: 539363592,
      },
      pg_version: "8.21.0",
      lockfile_path: "package-lock.json",
    }),
    "utf8",
  ),
);

writeLf(
  CONSTANTS,
  lf(fs.readFileSync(CONSTANTS, "utf8")).replace(
    /const EXPECTED_AUTH_SEALS_DIGEST =\n {2}"[^"]+";/,
    `const EXPECTED_AUTH_SEALS_DIGEST =\n  "${dig}";`,
  ),
);

const r = spawnSync(
  "npx.cmd",
  [
    "--yes",
    "esbuild@0.25.0",
    path.join(ROOT, "scripts/security/apply-credential-browser-containment.js"),
    "--bundle",
    "--platform=node",
    "--format=cjs",
    `--outfile=${OUT}`,
    "--log-level=warning",
  ],
  { cwd: ROOT, encoding: "utf8", shell: true, windowsHide: true },
);
if (r.status !== 0) throw new Error(r.stderr || r.stdout);
writeLf(OUT, fs.readFileSync(OUT, "utf8"));

const emb = (fs.readFileSync(OUT, "utf8").match(
  /EXPECTED_AUTH_SEALS_DIGEST\s*=\s*"([0-9a-f]{64})"/,
) || [])[1];
if (emb !== dig) throw new Error(`embedded mismatch ${emb} vs ${dig}`);

const modules = SOURCES.map(seal);
const buf = fs.readFileSync(OUT);
const bundleSha = sha256(buf);
const bundleOid = execFileSync("git", ["hash-object", OUT_REL], {
  encoding: "utf8",
}).trim();
const lockOid = execFileSync("git", ["rev-parse", "HEAD:package-lock.json"], {
  encoding: "utf8",
}).trim();
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const pgPkg = lock.packages["node_modules/pg"];

const auth = {
  package: "connection-credential-browser-containment-stage1-tooling",
  authorized_pr_head: "PENDING_AFTER_COMMIT",
  artifact_commit: "dadd4345c6b4f5df718f1e31f27b161d05fe7aa9",
  project_ref: "jzmdgwwiestcmmeuhhkr",
  migration_path:
    "supabase/migrations/20260908031736_connection_credential_browser_containment.sql",
  migration_blob_oid: "a5051f23da5bc889d0612f76a61eec1c3cd487e7",
  migration_sha256: "71500fc8c56f484e3f2d5b49ff2b3161aad474027291a4eda22f26e7fc8071e7",
  migration_bytes: 10586,
  migration_version: "20260908031736",
  migration_name: "connection_credential_browser_containment",
  database_url_env: "CONTAINMENT_APPLY_DATABASE_URL",
  apply_authorization_token: "I_AUTHORIZE_CONTAINMENT_APPLY_20260908031736",
  advisory_lock: {
    name: "CREDENTIAL_BROWSER_CONTAINMENT_STAGE1",
    key1: 1129464387,
    key2: 539363592,
  },
  auth_seals_digest: dig,
  standalone_bundle: {
    path: OUT_REL,
    oid: bundleOid,
    sha256: bundleSha,
    bytes: buf.length,
    pg_version: "8.21.0",
    lockfile_path: "package-lock.json",
    lockfile_oid: lockOid,
    build_command: "node scripts/security/build-containment-applicator-standalone-bundle.js",
    esbuild_version: "0.25.0",
  },
  tooling_modules: modules,
  launcher_bootstrap_only: "scripts/security/launch-credential-browser-containment-apply.js",
  notes: [
    "authorized_pr_head is the executable tooling freeze commit (set in pin publication).",
    "Pass --pr-head equal to authorized_pr_head (tooling freeze), not the evidence tip.",
    "Launcher materializes standalone_bundle from freeze git blobs before any DB connection.",
  ],
};
writeLf(AUTH_PATH, `${JSON.stringify(auth, null, 2)}\n`);
writeLf(
  MANIFEST,
  `${JSON.stringify(
    {
      package: "credential-browser-containment-applicator-standalone",
      bundle_path: OUT_REL,
      bundle_sha256: bundleSha,
      bundle_bytes: buf.length,
      bundle_oid_hash_object: bundleOid,
      auth_seals_digest: dig,
      lockfile_path: "package-lock.json",
      lockfile_oid: lockOid,
      pg_version: "8.21.0",
      pg_resolved: pgPkg.resolved,
      pg_integrity: pgPkg.integrity,
      build: {
        command: "node scripts/security/build-containment-applicator-standalone-bundle.js",
        esbuild_version: "0.25.0",
        node: process.version,
        deterministic_note:
          "Rebuild with same Node major + esbuild@0.25.0; committed git blob is authoritative.",
      },
      source_modules: modules,
      inventory: {
        includes: [
          "applicator CLI/core/constants/git-blob-authority",
          "pg@8.21.0 and esbuild-resolved runtime dependency graph",
        ],
        excludes_at_runtime: [
          "repository node_modules",
          "NODE_PATH",
          "global packages",
          "network fetch",
        ],
      },
      built_at: new Date().toISOString(),
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ dig, emb, bundleSha, bundleOid, bytes: buf.length }, null, 2));
