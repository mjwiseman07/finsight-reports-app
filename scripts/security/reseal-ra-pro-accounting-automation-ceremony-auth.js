#!/usr/bin/env node
/**
 * Reseal RA Pro accounting-automation visible ceremony authority artifacts.
 * Writes LF-normalized OID/SHA-256/bytes seals into TOOLING_AUTHORIZATION.json.
 * Does not rebuild the standalone applicator bundle.
 * Does not create pre-apply pins. Preserves an already published pin and keeps apply_authorized false.
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
  pre_apply_live_gates:
    "scripts/security/ra-pro-accounting-automation-pre-apply-gates.ps1",
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

function sealTlsTrustRoot(freezeCommit) {
  const rel = "scripts/security/embedded-supabase-prod-ca-2021.js";
  const buf = loadBlobFromCommit(freezeCommit, rel);
  if (buf.includes(0x0d)) throw new Error(`CRLF forbidden in ${rel}`);
  const text = buf.toString("utf8");
  const begins = text.match(/-----BEGIN CERTIFICATE-----/g) || [];
  if (begins.length !== 1) throw new Error("TLS_CA_EXTRA_OR_MISSING");
  const assign = text.match(/OFFICIAL_SUPABASE_PROD_CA_2021_PEM = "([^"]+)"/);
  const pinMatch = text.match(/OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256 =\n\s*"([0-9a-f]{64})"/);
  if (!assign || !pinMatch) throw new Error("TLS_CA_PEM_ABSENT");
  if (text.split(pinMatch[1]).length - 1 !== 1) throw new Error("TLS_CA_PIN_ABSENT");
  let pem = assign[1].replace(/\\n/g, "\n");
  if (!pem.endsWith("\n")) pem += "\n";
  const x509 = new crypto.X509Certificate(pem);
  const der = crypto.createHash("sha256").update(x509.raw).digest("hex");
  if (der !== pinMatch[1]) throw new Error("TLS_CA_PIN_MISMATCH");
  if (!String(x509.subject).includes("Supabase Root 2021 CA")) throw new Error("TLS_CA_SUBJECT_MISMATCH");
  const now = Date.now();
  if (now < Date.parse(x509.validFrom) || now > Date.parse(x509.validTo)) {
    throw new Error("TLS_CA_VALIDITY");
  }
  const pemBuf = Buffer.from(pem, "utf8");
  const seal = sealFromBytes(rel, buf, freezeCommit);
  seal.der_sha256 = der;
  seal.certificate_pem_sha256 = sha256(pemBuf);
  seal.certificate_bytes = pemBuf.length;
  seal.subject = "Supabase Root 2021 CA";
  return seal;
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
  auth.tls_trust_root = sealTlsTrustRoot(freeze);

  if (!auth.notes || !Array.isArray(auth.notes)) auth.notes = [];
  const note =
    "First-hop authority: tip-seal materialize visible_ceremony_bootstrap from bootstrap_source_commit (or tip-seal native_entry which does the same). Never -File worktree supervise/entry-apply/ceremony/bootstrap without seal verify.";
  if (!auth.notes.includes(note)) auth.notes.push(note);
  const tlsNote =
    "TLS trust: non-loopback clients use the freeze-sealed embedded Supabase Root 2021 CA with rejectUnauthorized true. No CA path, verification bypass, or trust-store mutation.";
  if (!auth.notes.includes(tlsNote)) auth.notes.push(tlsNote);
  const probeNote =
    "Dry-run records catalog probes for target absence, prerequisite shape, and schema drift in the rolled-back transaction. APPLY_COMMITTED requires post-commit history, RLS, grant, browser-write, RPC idempotency, and sentinel checks. Verification failure is not a retry.";
  if (!auth.notes.includes(probeNote)) auth.notes.push(probeNote);

  if (!auth.publication) auth.publication = {};
  const existingPre =
    auth.pre_apply_live_publication && typeof auth.pre_apply_live_publication === "object"
      ? auth.pre_apply_live_publication
      : {};
  const prePinsPublished =
    existingPre.status === "PUBLISHED" &&
    typeof existingPre.evidence_sha256 === "string" &&
    typeof existingPre.evidence_blob_oid === "string" &&
    Number.isInteger(existingPre.evidence_bytes) &&
    typeof existingPre.evidence_source_commit === "string" &&
    typeof existingPre.evidence_path === "string";
  if (!prePinsPublished) {
    auth.publication.status = "UNPUBLISHED";
    auth.publication.required_pre_apply_live_evidence_sha256 = null;
    auth.publication.required_pre_apply_live_evidence_oid = null;
    auth.publication.required_pre_apply_live_evidence_bytes = null;
  } else {
    auth.publication.status = "PUBLISHED";
    auth.publication.required_pre_apply_live_evidence_sha256 = existingPre.evidence_sha256;
    auth.publication.required_pre_apply_live_evidence_oid = existingPre.evidence_blob_oid;
    auth.publication.required_pre_apply_live_evidence_bytes = existingPre.evidence_bytes;
    existingPre.apply_authorized = false;
  }
  if (!Object.prototype.hasOwnProperty.call(auth.publication, "required_prior_dry_run_evidence_sha256")) {
    auth.publication.required_prior_dry_run_evidence_sha256 = null;
    auth.publication.required_prior_dry_run_evidence_oid = null;
    auth.publication.required_prior_dry_run_evidence_bytes = null;
  }
  const contractRel =
    "docs/security/ra-pro-accounting-automation-apply/PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json";
  auth.pre_apply_live_contract = sealFromBytes(
    contractRel,
    loadBlobFromCommit(ceremonySource, contractRel),
    ceremonySource,
  );
  if (!prePinsPublished) {
    auth.pre_apply_live_publication = {
      status: "UNPUBLISHED",
      protocol: "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1",
      contract_path: contractRel,
      evidence_path: null,
      evidence_source_commit: null,
      evidence_blob_oid: null,
      evidence_sha256: null,
      evidence_bytes: null,
      apply_authorized: false,
    };
  } else {
    existingPre.contract_path = contractRel;
    existingPre.protocol = "RA_PRO_ACCOUNTING_AUTOMATION_PRE_APPLY_LIVE_EVIDENCE_V1";
    existingPre.apply_authorized = false;
    auth.pre_apply_live_publication = existingPre;
  }

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
          tls_trust_root: auth.tls_trust_root,
        },
        productionContact: false,
      },
      null,
      2,
    ),
  );
}

main();
