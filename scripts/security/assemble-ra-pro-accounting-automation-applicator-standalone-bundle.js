#!/usr/bin/env node
/**
 * Deterministic standalone bundle builder for RA Pro accounting-automation applicator.
 * Uses esbuild → __commonJS pack (same pattern as cutover/FRLS/containment).
 * Publishes external bundle OID/SHA/bytes into TOOLING_AUTHORIZATION.json + constants
 * WITHOUT rebuilding (non-circular authority). Seal publication only — not production apply.
 */
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawnSync, execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const ENTRY = path.join(ROOT, "scripts/security/apply-ra-pro-accounting-automation.js");
const OUT_REL = "scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs";
const OUT_FILE = path.join(ROOT, OUT_REL);
const CONSTANTS = path.join(
  ROOT,
  "scripts/security/ra-pro-accounting-automation-apply-constants.js",
);
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json",
);
const ESBUILD_VERSION = "0.25.0";

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function lf(s) {
  return String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function writeLf(file, text) {
  fs.writeFileSync(file, lf(text), { encoding: "utf8" });
}

function gitEnv() {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = ROOT.replace(/\\/g, "/");
  return env;
}

function measureLfBundle() {
  const raw = fs.readFileSync(OUT_FILE);
  const text = lf(raw.toString("utf8"));
  writeLf(OUT_FILE, text);
  const buf = Buffer.from(text, "utf8");
  if (buf.includes(0x0d)) {
    throw new Error("BUNDLE_NOT_LF_ONLY");
  }
  const oid = execFileSync("git", ["hash-object", "--stdin"], {
    cwd: ROOT,
    env: gitEnv(),
    input: buf,
    encoding: "utf8",
  }).trim();
  return { oid, sha256: sha256(buf), bytes: buf.length, lf: true };
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

function publishSeals(seals) {
  const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
  auth.standalone_bundle = {
    path: OUT_REL,
    oid: seals.oid,
    sha256: seals.sha256,
    bytes: seals.bytes,
    line_endings: "LF",
    authority: "git_blob_cat_file",
  };
  writeLf(AUTH_PATH, `${JSON.stringify(auth, null, 2)}\n`);

  let constants = lf(fs.readFileSync(CONSTANTS, "utf8"));
  constants = constants.replace(
    /const STANDALONE_BUNDLE_OID =\n {2}"[^"]+";/,
    `const STANDALONE_BUNDLE_OID =\n  "${seals.oid}";`,
  );
  constants = constants.replace(
    /const STANDALONE_BUNDLE_SHA256 =\n {2}"[^"]+";/,
    `const STANDALONE_BUNDLE_SHA256 =\n  "${seals.sha256}";`,
  );
  constants = constants.replace(
    /const STANDALONE_BUNDLE_BYTES = \d+;/,
    `const STANDALONE_BUNDLE_BYTES = ${seals.bytes};`,
  );
  // EXPECTED_STANDALONE_BUNDLE_SHA256 stays PENDING — external git-blob gate is mandatory.
  writeLf(CONSTANTS, constants);
}

function resetSealPlaceholders() {
  let constants = lf(fs.readFileSync(CONSTANTS, "utf8"));
  constants = constants.replace(
    /const STANDALONE_BUNDLE_OID =\n {2}"[^"]+";/,
    `const STANDALONE_BUNDLE_OID =\n  "PENDING_BUNDLE_OID_PLACEHOLDER_000000000000";`,
  );
  constants = constants.replace(
    /const STANDALONE_BUNDLE_SHA256 =\n {2}"[^"]+";/,
    `const STANDALONE_BUNDLE_SHA256 =\n  "PENDING_BUNDLE_SHA256_PLACEHOLDER_00000000000000000000000000000000";`,
  );
  constants = constants.replace(
    /const STANDALONE_BUNDLE_BYTES = \d+;/,
    `const STANDALONE_BUNDLE_BYTES = 0;`,
  );
  writeLf(CONSTANTS, constants);
}

function main() {
  // Keep published seals out of the packed artifact (non-circular): embed PENDING only.
  resetSealPlaceholders();
  runEsbuild();
  const seals = measureLfBundle();
  publishSeals(seals);

  // Smoke: must parse under Node (packaging). Full fail-closed auth is proven post-commit.
  const check = spawnSync(process.execPath, ["--check", OUT_FILE], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (check.status !== 0) {
    throw new Error(`standalone --check failed: ${check.stderr || check.stdout}`);
  }
  const smoke = spawnSync(process.execPath, [OUT_FILE], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env },
  });
  const out = `${smoke.stdout || ""}${smoke.stderr || ""}`;
  if (/SyntaxError|Cannot find module|Identifier 'module'/.test(out)) {
    throw new Error(`standalone packaging failure: ${out}`);
  }
  if (smoke.status === 0) {
    throw new Error(`standalone smoke unexpectedly succeeded: ${out}`);
  }
  let parsed = null;
  try {
    parsed = JSON.parse(out.trim().split(/\r?\n/).filter(Boolean).pop() || "null");
  } catch {
    parsed = null;
  }
  const code = parsed
    ? String(parsed.reason || parsed.result_code || parsed.error_code || parsed.error || "")
    : out;
  if (
    !/BUNDLE_|AUTHORIZATION_PINS_UNPUBLISHED|BLOCKED_PIN_MISMATCH|GIT_BLOB|MISSING_INPUT|DATABASE_PROJECT_REF_MISMATCH/i.test(
      code,
    )
  ) {
    throw new Error(`standalone smoke unexpected verdict: ${out}`);
  }

  process.stdout.write(
    `${JSON.stringify({
      verdict: "BUNDLE_ASSEMBLED",
      path: OUT_REL,
      oid: seals.oid,
      sha256: seals.sha256,
      bytes: seals.bytes,
      lf: true,
      esbuild_version: ESBUILD_VERSION,
      productionContact: false,
      applyAuthorized: false,
      note: "Seals published externally; constants updated without rebuild (non-circular).",
    })}\n`,
  );
}

main();
