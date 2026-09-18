#!/usr/bin/env node
/**
 * Reseal RA Pro accounting-automation visible ceremony authority artifacts.
 * Writes LF-normalized OID/SHA-256/bytes seals into TOOLING_AUTHORIZATION.json.
 * Does not rebuild the standalone applicator bundle.
 * Does not publish prior-dry-run / pre-apply pins.
 *
 * Usage:
 *   node scripts/security/reseal-ra-pro-accounting-automation-ceremony-auth.js \
 *     --freeze <40hex> --bootstrap-source <40hex> --ceremony-source <40hex>
 */
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const AUTH_REL = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";
const AUTH_PATH = path.join(ROOT, AUTH_REL);

const BOOTSTRAP_ARTIFACTS = {
  visible_ceremony_bootstrap:
    "scripts/security/bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1",
  visible_ceremony_native_entry:
    "scripts/security/enter-ra-pro-accounting-automation-ceremony.ps1",
};

const CEREMONY_ARTIFACTS = {
  visible_ceremony_supervisor:
    "scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1",
  visible_ceremony_entry: "scripts/security/enter-ra-pro-accounting-automation-apply.ps1",
  operator_ceremony:
    "scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1",
};

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function lf(s) {
  return String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function writeLf(file, text) {
  const body = lf(text);
  fs.writeFileSync(file, body.endsWith("\n") ? body : `${body}\n`, { encoding: "utf8" });
}

function gitEnv() {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = ROOT.replace(/\\/g, "/");
  return env;
}

function parseArgs(argv) {
  const out = {
    freeze: null,
    bootstrapSource: null,
    ceremonySource: null,
    fromWorktree: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--freeze") out.freeze = argv[++i];
    else if (a === "--bootstrap-source") out.bootstrapSource = argv[++i];
    else if (a === "--ceremony-source") out.ceremonySource = argv[++i];
    else if (a === "--source") out.ceremonySource = argv[++i]; // back-compat alias
    else if (a === "--from-worktree") out.fromWorktree = true;
    else throw new Error(`unknown arg: ${a}`);
  }
  return out;
}

function assertHex40(v, label) {
  if (!/^[0-9a-fA-F]{40}$/.test(String(v || ""))) {
    throw new Error(`${label} must be exact 40-hex`);
  }
  return String(v).toLowerCase();
}

function loadBlobFromCommit(commit, rel) {
  const raw = execFileSync("git", ["show", `${commit}:${rel}`], {
    cwd: ROOT,
    env: gitEnv(),
    maxBuffer: 32 * 1024 * 1024,
  });
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
}

function sealFromBytes(rel, buf, sourceCommit) {
  if (buf.includes(0x0d)) throw new Error(`CRLF forbidden in ${rel}`);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    throw new Error(`BOM forbidden in ${rel}`);
  }
  const oid = execFileSync("git", ["hash-object", "--stdin"], {
    cwd: ROOT,
    env: gitEnv(),
    input: buf,
    encoding: "utf8",
  }).trim();
  return {
    path: rel,
    source_commit: sourceCommit,
    oid,
    sha256: sha256(buf),
    bytes: buf.length,
    line_endings: "LF",
  };
}

function sealGroup(artifacts, source, fromWorktree) {
  const out = {};
  for (const [key, rel] of Object.entries(artifacts)) {
    let buf;
    if (fromWorktree) {
      buf = fs.readFileSync(path.join(ROOT, rel));
    } else {
      buf = loadBlobFromCommit(source, rel);
    }
    if (buf.includes(0x0d)) {
      const text = lf(buf.toString("utf8"));
      buf = Buffer.from(text.endsWith("\n") ? text : `${text}\n`, "utf8");
      if (!fromWorktree) {
        throw new Error(`${rel} at source ${source} contains CR; commit LF-normalized bytes first`);
      }
      fs.writeFileSync(path.join(ROOT, rel), buf);
    }
    out[key] = sealFromBytes(rel, buf, source);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);
  const freeze = assertHex40(args.freeze, "--freeze");
  const bootstrapSource = assertHex40(args.bootstrapSource, "--bootstrap-source");
  const ceremonySource = assertHex40(args.ceremonySource, "--ceremony-source");
  const ids = [freeze, bootstrapSource, ceremonySource];
  if (new Set(ids).size !== 3) {
    throw new Error("freeze, bootstrap-source, and ceremony-source must be pairwise distinct");
  }

  for (const rel of [
    ...Object.values(BOOTSTRAP_ARTIFACTS),
    ...Object.values(CEREMONY_ARTIFACTS),
  ]) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) writeLf(abs, fs.readFileSync(abs, "utf8"));
  }

  const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
  auth.authorized_pr_head = freeze;
  auth.bootstrap_source_commit = bootstrapSource;
  auth.ceremony_source_commit = ceremonySource;

  Object.assign(auth, sealGroup(BOOTSTRAP_ARTIFACTS, bootstrapSource, args.fromWorktree));
  Object.assign(auth, sealGroup(CEREMONY_ARTIFACTS, ceremonySource, args.fromWorktree));

  if (!auth.notes || !Array.isArray(auth.notes)) auth.notes = [];
  const note =
    "First-hop authority: tip-seal materialize visible_ceremony_bootstrap from bootstrap_source_commit (or tip-seal native_entry which does the same). Never -File worktree supervise/entry-apply/ceremony/bootstrap without seal verify.";
  if (!auth.notes.includes(note)) auth.notes.push(note);

  if (!auth.publication) auth.publication = {};
  auth.publication.status = "UNPUBLISHED";
  auth.publication.required_prior_dry_run_evidence_sha256 = null;
  auth.publication.required_prior_dry_run_evidence_oid = null;
  auth.publication.required_prior_dry_run_evidence_bytes = null;
  auth.publication.required_pre_apply_live_evidence_sha256 = null;
  auth.publication.required_pre_apply_live_evidence_oid = null;
  auth.publication.required_pre_apply_live_evidence_bytes = null;

  writeLf(AUTH_PATH, `${JSON.stringify(auth, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        verdict: "CEREMONY_AUTH_RESEALED",
        freeze,
        bootstrapSource,
        ceremonySource,
        fromWorktree: args.fromWorktree,
        seals: {
          visible_ceremony_bootstrap: auth.visible_ceremony_bootstrap,
          visible_ceremony_native_entry: auth.visible_ceremony_native_entry,
          visible_ceremony_supervisor: auth.visible_ceremony_supervisor,
          visible_ceremony_entry: auth.visible_ceremony_entry,
          operator_ceremony: auth.operator_ceremony,
        },
        productionContact: false,
      },
      null,
      2,
    ),
  );
}

main();
