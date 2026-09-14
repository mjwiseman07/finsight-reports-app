"use strict";
/**
 * Verify / converge FRLS standalone bundle auth digest (matches build script logic).
 */
const { spawnSync, execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const OUT_REL = "scripts/security/bundles/free-review-lead-session-applicator.standalone.cjs";
const OUT = path.join(ROOT, OUT_REL);
const CONSTANTS = path.join(ROOT, "scripts/security/free-review-lead-session-apply-constants.js");
const AUTH = path.join(
  ROOT,
  "docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json",
);
const MANIFEST = path.join(
  ROOT,
  "docs/security/free-review-lead-session-apply/STANDALONE_BUNDLE_MANIFEST.json",
);
const SEALS = path.join(ROOT, "docs/security/free-review-lead-session-apply/SEALS.json");
const SOURCE_MODULES = [
  "scripts/security/apply-free-review-lead-session.js",
  "scripts/security/free-review-lead-session-apply-core.js",
  "scripts/security/free-review-lead-session-apply-constants.js",
  "scripts/security/git-blob-authority.js",
  "scripts/security/free-review-lead-session-evidence.js",
  "scripts/security/free-review-lead-session-tls-ca.js",
  "scripts/security/embedded-supabase-prod-ca-2021.js",
];

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function lf(s) {
  return String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}
function writeLf(f, t) {
  fs.writeFileSync(f, lf(t).endsWith("\n") ? lf(t) : `${lf(t)}\n`);
}
function seal(rel) {
  writeLf(path.join(ROOT, rel), fs.readFileSync(path.join(ROOT, rel), "utf8"));
  const buf = fs.readFileSync(path.join(ROOT, rel));
  const oid = execFileSync("git", ["hash-object", rel], { encoding: "utf8" }).trim();
  return { path: rel, oid, sha256: sha256(buf), bytes: buf.length };
}
function canonicalAuthSealsDigest() {
  const seals = {
    artifact_commit: "b2c431fa4310f58c9ee667e858333e084c2fed52",
    project_ref: "jzmdgwwiestcmmeuhhkr",
    migration_path: "supabase/migrations/20260913235500_free_review_lead_sessions.sql",
    migration_blob_oid: "7dca9674673eb51ab5094d3ec09508d0711f16cd",
    migration_sha256:
      "b7e1e68b82a5975e85e1b9d6f0c491fa632474801ce00b311cea366f3b9b0ddb",
    migration_bytes: 8108,
    migration_version: "20260913235500",
    migration_name: "free_review_lead_sessions",
    database_url_env: "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL",
    apply_authorization_token: "I_AUTHORIZE_FREE_REVIEW_LEAD_SESSIONS_APPLY_20260913235500",
    advisory_lock: {
      name: "FREE_REVIEW_LEAD_SESSIONS_APPLY",
      key1: 1178940499,
      key2: 539363603,
    },
    pg_version: "8.21.0",
    lockfile_path: "package-lock.json",
  };
  return sha256(Buffer.from(JSON.stringify(seals), "utf8"));
}
function esbuild() {
  const pgNativeStub = path.join(ROOT, "scripts/security/stubs/pg-native-failclosed.js");
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "--yes",
      "esbuild@0.25.0",
      path.join(ROOT, "scripts/security/apply-free-review-lead-session.js"),
      "--bundle",
      "--platform=node",
      "--format=cjs",
      `--outfile=${OUT}`,
      `--alias:pg-native=${pgNativeStub}`,
      "--log-level=warning",
    ],
    { cwd: ROOT, encoding: "utf8", windowsHide: true, shell: true },
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  writeLf(OUT, fs.readFileSync(OUT, "utf8"));
}
function embeddedDigest() {
  const t = fs.readFileSync(OUT, "utf8");
  const m = t.match(/EXPECTED_AUTH_SEALS_DIGEST\s*=\s*"([0-9a-f]{64})"/);
  if (!m) throw new Error("embedded digest missing");
  return m[1];
}

let dig = "";
for (let i = 0; i < 8; i += 1) {
  dig = canonicalAuthSealsDigest();
  let c = lf(fs.readFileSync(CONSTANTS, "utf8"));
  c = c.replace(
    /const EXPECTED_AUTH_SEALS_DIGEST =\n {2}"[^"]+";/,
    `const EXPECTED_AUTH_SEALS_DIGEST =\n  "${dig}";`,
  );
  writeLf(CONSTANTS, c);
  esbuild();
  const emb = embeddedDigest();
  const dig2 = canonicalAuthSealsDigest();
  if (emb === dig && dig === dig2) {
    const modules = SOURCE_MODULES.map(seal);
    const buf = fs.readFileSync(OUT);
    const bundleSha = sha256(buf);
    const bundleOid = execFileSync("git", ["hash-object", OUT_REL], {
      encoding: "utf8",
    }).trim();
    let lockOid;
    try {
      lockOid = execFileSync("git", ["rev-parse", "HEAD:package-lock.json"], {
        encoding: "utf8",
      }).trim();
    } catch {
      lockOid = execFileSync("git", ["hash-object", "package-lock.json"], {
        encoding: "utf8",
      }).trim();
    }
    const auth = JSON.parse(fs.readFileSync(AUTH, "utf8"));
    auth.auth_seals_digest = dig;
    auth.standalone_bundle = {
      ...auth.standalone_bundle,
      path: OUT_REL,
      oid: bundleOid,
      sha256: bundleSha,
      bytes: buf.length,
    };
    auth.tooling_modules = modules;
    writeLf(AUTH, `${JSON.stringify(auth, null, 2)}\n`);
    writeLf(
      MANIFEST,
      `${JSON.stringify(
        {
          ...JSON.parse(fs.readFileSync(MANIFEST, "utf8")),
          bundle_sha256: bundleSha,
          bundle_bytes: buf.length,
          bundle_oid_hash_object: bundleOid,
          auth_seals_digest: dig,
          source_modules: modules,
        },
        null,
        2,
      )}\n`,
    );
    const sealsDoc = JSON.parse(fs.readFileSync(SEALS, "utf8"));
    sealsDoc.auth_seals_digest = dig;
    sealsDoc.standalone_bundle_sha256 = bundleSha;
    writeLf(SEALS, `${JSON.stringify(sealsDoc, null, 2)}\n`);
    console.log(JSON.stringify({ ok: true, dig, bundleSha, bundleOid, bytes: buf.length }, null, 2));
    process.exit(0);
  }
  dig = dig2;
}
throw new Error("failed to converge auth seals digest");
