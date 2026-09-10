#!/usr/bin/env node
/**
 * Deterministic standalone bundle builder for containment applicator + pg graph.
 * Seal publication only — never invoked during production dry-run/apply.
 */
"use strict";

const { spawnSync, execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const ENTRY = path.join(ROOT, "scripts/security/apply-credential-browser-containment.js");
const OUT_REL = "scripts/security/bundles/credential-browser-containment-applicator.standalone.cjs";
const OUT_FILE = path.join(ROOT, OUT_REL);
const CONSTANTS = path.join(
  ROOT,
  "scripts/security/credential-browser-containment-constants.js",
);
const MANIFEST_PATH = path.join(
  ROOT,
  "docs/security/connection-credential-browser-containment/STANDALONE_BUNDLE_MANIFEST.json",
);
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json",
);
const ESBUILD_VERSION = "0.25.0";
const SOURCE_MODULES = [
  "scripts/security/apply-credential-browser-containment.js",
  "scripts/security/credential-browser-containment-apply-core.js",
  "scripts/security/credential-browser-containment-constants.js",
  "scripts/security/git-blob-authority.js",
];

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function lf(s) {
  return String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function writeLf(file, text) {
  fs.writeFileSync(file, lf(text), { encoding: "utf8" });
}

function moduleSeal(rel) {
  // Ensure LF on disk before hashing for seal publication on Windows.
  const p = path.join(ROOT, rel);
  writeLf(p, fs.readFileSync(p, "utf8"));
  const buf = fs.readFileSync(p);
  const oid = execFileSync("git", ["hash-object", rel], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  return { path: rel, oid, sha256: sha256(buf), bytes: buf.length };
}

function canonicalAuthSealsDigest(authLike) {
  const seals = {
    artifact_commit: authLike.artifact_commit,
    project_ref: authLike.project_ref,
    migration_path: authLike.migration_path,
    migration_blob_oid: authLike.migration_blob_oid,
    migration_sha256: authLike.migration_sha256,
    migration_bytes: authLike.migration_bytes,
    migration_version: authLike.migration_version,
    migration_name: authLike.migration_name,
    database_url_env: authLike.database_url_env,
    apply_authorization_token: authLike.apply_authorization_token,
    advisory_lock: authLike.advisory_lock,
    pg_version: "8.21.0",
    lockfile_path: "package-lock.json",
    source_modules: authLike.tooling_modules.map((m) => ({
      path: m.path,
      oid: m.oid,
      sha256: m.sha256,
      bytes: m.bytes,
    })),
  };
  return sha256(Buffer.from(JSON.stringify(seals), "utf8"));
}

function runEsbuild() {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "--yes",
      `esbuild@${ESBUILD_VERSION}`,
      ENTRY,
      "--bundle",
      "--platform=node",
      "--format=cjs",
      `--outfile=${OUT_FILE}`,
      "--log-level=warning",
    ],
    { cwd: ROOT, encoding: "utf8", windowsHide: true, shell: true },
  );
  if (r.status !== 0) {
    throw new Error(`esbuild failed: ${r.stderr || r.stdout}`);
  }
  writeLf(OUT_FILE, fs.readFileSync(OUT_FILE, "utf8"));
}

function main() {
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, "package-lock.json"), "utf8"));
  const pgPkg = lock.packages["node_modules/pg"];
  if (!pgPkg || pgPkg.version !== "8.21.0") {
    throw new Error(`expected package-lock pg@8.21.0, got ${pgPkg && pgPkg.version}`);
  }

  // Normalize sources to LF
  for (const rel of SOURCE_MODULES) {
    writeLf(path.join(ROOT, rel), fs.readFileSync(path.join(ROOT, rel), "utf8"));
  }

  // First build (constants may still have PENDING digest)
  runEsbuild();

  // Seal source modules and compute auth seals digest; patch constants; rebuild.
  let toolingModules = SOURCE_MODULES.map((p) => moduleSeal(p));
  const authLike = {
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
    tooling_modules: toolingModules,
  };

  // Iterate: update digest in constants (changes constants seal) until digest stable
  let authSealsDigest = "";
  for (let i = 0; i < 5; i += 1) {
    toolingModules = SOURCE_MODULES.map((p) => moduleSeal(p));
    authLike.tooling_modules = toolingModules;
    authSealsDigest = canonicalAuthSealsDigest(authLike);
    let c = lf(fs.readFileSync(CONSTANTS, "utf8"));
    const next = c.replace(
      /const EXPECTED_AUTH_SEALS_DIGEST =\n {2}"[^"]+";/,
      `const EXPECTED_AUTH_SEALS_DIGEST =\n  "${authSealsDigest}";`,
    );
    if (next === c) break;
    writeLf(CONSTANTS, next);
  }

  // Final rebuild with stable digest — do not mutate constants afterward.
  toolingModules = SOURCE_MODULES.map((p) => moduleSeal(p));
  authLike.tooling_modules = toolingModules;
  authSealsDigest = canonicalAuthSealsDigest(authLike);
  writeLf(
    CONSTANTS,
    lf(fs.readFileSync(CONSTANTS, "utf8")).replace(
      /const EXPECTED_AUTH_SEALS_DIGEST =\n {2}"[^"]+";/,
      `const EXPECTED_AUTH_SEALS_DIGEST =\n  "${authSealsDigest}";`,
    ),
  );
  // Re-seal constants after digest write; if digest shifts, one more loop
  toolingModules = SOURCE_MODULES.map((p) => moduleSeal(p));
  authLike.tooling_modules = toolingModules;
  const dig2 = canonicalAuthSealsDigest(authLike);
  if (dig2 !== authSealsDigest) {
    authSealsDigest = dig2;
    writeLf(
      CONSTANTS,
      lf(fs.readFileSync(CONSTANTS, "utf8")).replace(
        /const EXPECTED_AUTH_SEALS_DIGEST =\n {2}"[^"]+";/,
        `const EXPECTED_AUTH_SEALS_DIGEST =\n  "${authSealsDigest}";`,
      ),
    );
    toolingModules = SOURCE_MODULES.map((p) => moduleSeal(p));
    authLike.tooling_modules = toolingModules;
    authSealsDigest = canonicalAuthSealsDigest(authLike);
  }
  runEsbuild();
  // Recompute module seals after build (constants unchanged)
  toolingModules = SOURCE_MODULES.map((p) => moduleSeal(p));
  authLike.tooling_modules = toolingModules;
  const digCheck = canonicalAuthSealsDigest(authLike);
  if (digCheck !== authSealsDigest) {
    throw new Error(
      `auth seals digest drifted after final build: ${digCheck} vs ${authSealsDigest}`,
    );
  }

  const finalBuf = fs.readFileSync(OUT_FILE);
  const finalSha = sha256(finalBuf);
  const finalOid = execFileSync("git", ["hash-object", OUT_REL], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();

  let lockOid;
  try {
    lockOid = execFileSync("git", ["rev-parse", "HEAD:package-lock.json"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    lockOid = execFileSync("git", ["hash-object", "package-lock.json"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
  }

  const manifest = {
    package: "credential-browser-containment-applicator-standalone",
    bundle_path: OUT_REL,
    bundle_sha256: finalSha,
    bundle_bytes: finalBuf.length,
    bundle_oid_hash_object: finalOid,
    auth_seals_digest: authSealsDigest,
    lockfile_path: "package-lock.json",
    lockfile_oid: lockOid,
    pg_version: "8.21.0",
    pg_resolved: pgPkg.resolved,
    pg_integrity: pgPkg.integrity,
    build: {
      command: "node scripts/security/build-containment-applicator-standalone-bundle.js",
      esbuild_version: ESBUILD_VERSION,
      node: process.version,
      deterministic_note:
        "Rebuild with the same Node major + esbuild@0.25.0 from LF-normalized freeze sources and compare bundle_sha256. The committed git blob is authoritative for apply; rebuild is a verification gate, not a production step.",
    },
    source_modules: toolingModules,
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
  };
  writeLf(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

  // Update TOOLING_AUTHORIZATION skeleton (authorized_pr_head left for pin commit)
  const auth = {
    package: "connection-credential-browser-containment-stage1-tooling",
    authorized_pr_head: "PENDING_AFTER_COMMIT",
    artifact_commit: authLike.artifact_commit,
    project_ref: authLike.project_ref,
    migration_path: authLike.migration_path,
    migration_blob_oid: authLike.migration_blob_oid,
    migration_sha256: authLike.migration_sha256,
    migration_bytes: authLike.migration_bytes,
    migration_version: authLike.migration_version,
    migration_name: authLike.migration_name,
    database_url_env: authLike.database_url_env,
    apply_authorization_token: authLike.apply_authorization_token,
    advisory_lock: authLike.advisory_lock,
    auth_seals_digest: authSealsDigest,
    standalone_bundle: {
      path: OUT_REL,
      oid: finalOid,
      sha256: finalSha,
      bytes: finalBuf.length,
      pg_version: "8.21.0",
      lockfile_path: "package-lock.json",
      lockfile_oid: lockOid,
      build_command: manifest.build.command,
      esbuild_version: ESBUILD_VERSION,
    },
    tooling_modules: toolingModules,
    launcher_bootstrap_only: "scripts/security/launch-credential-browser-containment-apply.js",
    notes: [
      "authorized_pr_head is the executable tooling freeze commit (set in pin publication).",
      "Pass --pr-head equal to authorized_pr_head (tooling freeze), not the evidence tip.",
      "Launcher materializes standalone_bundle from freeze git blobs before any DB connection.",
    ],
  };
  writeLf(AUTH_PATH, `${JSON.stringify(auth, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        bundle_sha256: finalSha,
        bundle_bytes: finalBuf.length,
        bundle_oid: finalOid,
        auth_seals_digest: authSealsDigest,
        pg: "8.21.0",
      },
      null,
      2,
    ),
  );
}

main();
