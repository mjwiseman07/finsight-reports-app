#!/usr/bin/env node
/**
 * Deterministic standalone bundle builder for RA Pro billing-company cutover applicator.
 * Seal publication only — never invoked during production dry-run/apply.
 */
"use strict";

const { spawnSync, execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const ENTRY = path.join(ROOT, "scripts/security/apply-ra-pro-cutover.js");
const OUT_REL = "scripts/security/bundles/ra-pro-cutover-applicator.standalone.cjs";
const OUT_FILE = path.join(ROOT, OUT_REL);
const CONSTANTS = path.join(
  ROOT,
  "scripts/security/ra-pro-cutover-apply-constants.js",
);
const MANIFEST_PATH = path.join(
  ROOT,
  "docs/security/ra-pro-cutover-apply/STANDALONE_BUNDLE_MANIFEST.json",
);
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
);
const ESBUILD_VERSION = "0.25.0";
const SOURCE_MODULES = [
  "scripts/security/apply-ra-pro-cutover.js",
  "scripts/security/ra-pro-cutover-apply-core.js",
  "scripts/security/ra-pro-cutover-apply-constants.js",
  "scripts/security/git-blob-authority.js",
  "scripts/security/ra-pro-cutover-evidence.js",
  "scripts/security/ra-pro-cutover-tls-ca.js",
  "scripts/security/embedded-supabase-prod-ca-2021.js",
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

function scanBundleContent(source) {
  const externalRequire = [...source.matchAll(/require\(["']([^"']+)["']\)/g)].map(
    (m) => m[1],
  );
  const unresolved = externalRequire.filter(
    (id) =>
      !id.startsWith(".") &&
      !id.startsWith("node:") &&
      !id.startsWith("util/") &&
      ![
        "fs",
        "path",
        "os",
        "crypto",
        "child_process",
        "util",
        "events",
        "stream",
        "buffer",
        "url",
        "net",
        "tls",
        "dns",
        "http",
        "https",
        "zlib",
        "assert",
        "string_decoder",
        "punycode",
        "querystring",
        "module",
        "process",
        "constants",
        "tty",
        "readline",
      ].includes(id),
  );
  const pgNativeRefs = (source.match(/pg-native/g) || []).length;
  return {
    unresolved_external_requires: unresolved,
    pg_native_token_count: pgNativeRefs,
    has_unresolved_require_pg_native: /require\(["']pg-native["']\)/.test(source),
    fail_closed_stub_present: source.includes("PG_NATIVE_DISABLED"),
  };
}

function moduleSeal(rel) {
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
  };
  return sha256(Buffer.from(JSON.stringify(seals), "utf8"));
}

function runEsbuild() {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  const pgNativeStub = path.join(ROOT, "scripts/security/stubs/pg-native-failclosed.js");
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
      `--alias:pg-native=${pgNativeStub}`,
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

  for (const rel of SOURCE_MODULES) {
    writeLf(path.join(ROOT, rel), fs.readFileSync(path.join(ROOT, rel), "utf8"));
  }

  runEsbuild();

  let toolingModules = SOURCE_MODULES.map((p) => moduleSeal(p));
  const authLike = {
    artifact_commit: "b4f06a1ca889bdfb477397b990860b21e788a877",
    project_ref: "jzmdgwwiestcmmeuhhkr",
    migration_path: "supabase/migrations/20260915004500_ra_pro_firm_billing_company_id.sql",
    migration_blob_oid: "d36f5e2c50f7bab956c3191723c0e8a223279df5",
    migration_sha256:
      "c756651f267aaa2ebe5f1331e96d62bfa882507917b4201397f77e25a45f5ff9",
    migration_bytes: 40289,
    migration_version: "20260915004500",
    migration_name: "ra_pro_firm_billing_company_id",
    database_url_env: "RA_PRO_CUTOVER_APPLY_DATABASE_URL",
    tls_trust_root: "EMBEDDED_OFFICIAL_SUPABASE_CA",
    official_supabase_ca_der_sha256:
      "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa",
    apply_authorization_token: "I_AUTHORIZE_RA_PRO_BILLING_COMPANY_CUTOVER_APPLY_20260915004500",
    advisory_lock: {
      name: "RA_PRO_BILLING_COMPANY_CUTOVER_APPLY",
      key1: 1380012114,
      key2: 539363605,
    },
    tooling_modules: toolingModules,
  };

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
    package: "ra-pro-cutover-applicator-standalone",
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
      command: "node scripts/security/build-ra-pro-cutover-applicator-standalone-bundle.js",
      esbuild_version: ESBUILD_VERSION,
      node: process.version,
      deterministic_note:
        "Rebuild with the same Node major + esbuild@0.25.0 from LF-normalized freeze sources and compare bundle_sha256.",
      pg_native_alias: "scripts/security/stubs/pg-native-failclosed.js",
    },
    content_scan: scanBundleContent(finalBuf.toString("utf8")),
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

  const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
  auth.auth_seals_digest = authSealsDigest;
  auth.standalone_bundle = {
    path: OUT_REL,
    oid: finalOid,
    sha256: finalSha,
    bytes: finalBuf.length,
    pg_version: "8.21.0",
    lockfile_path: "package-lock.json",
    lockfile_oid: lockOid,
    build_command: manifest.build.command,
    esbuild_version: ESBUILD_VERSION,
  };
  auth.tooling_modules = toolingModules;
  writeLf(AUTH_PATH, `${JSON.stringify(auth, null, 2)}\n`);

  const sealsPath = path.join(
    ROOT,
    "docs/security/ra-pro-cutover-apply/SEALS.json",
  );
  const seals = JSON.parse(fs.readFileSync(sealsPath, "utf8"));
  seals.auth_seals_digest = authSealsDigest;
  seals.standalone_bundle_sha256 = finalSha;
  writeLf(sealsPath, `${JSON.stringify(seals, null, 2)}\n`);

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
