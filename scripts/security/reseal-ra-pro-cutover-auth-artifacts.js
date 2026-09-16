#!/usr/bin/env node
/**
 * Reseal RA Pro cutover TOOLING_AUTHORIZATION native/ceremony/evidence/gate artifact seals
 * from current worktree LF bytes (git hash-object). Does not rebuild the standalone bundle.
 */
"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
);

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function lf(s) {
  return String(s).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function writeLf(file, text) {
  const body = lf(text);
  fs.writeFileSync(file, body.endsWith("\n") ? body : `${body}\n`, "utf8");
}

function sealRel(rel) {
  const abs = path.join(ROOT, rel);
  writeLf(abs, fs.readFileSync(abs, "utf8"));
  const buf = fs.readFileSync(abs);
  const oid = execFileSync("git", ["hash-object", rel], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  return { path: rel, oid, sha256: sha256(buf), bytes: buf.length };
}

function main() {
  const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));

  const nativeBootstrap = sealRel("scripts/security/bootstrap-ra-pro-cutover-apply.ps1");
  auth.native_bootstrap = {
    ...auth.native_bootstrap,
    ...nativeBootstrap,
    invoke:
      "powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File <materialized>",
  };
  auth.native_entry = sealRel("scripts/security/enter-ra-pro-cutover-apply.ps1");
  auth.operator_ceremony = sealRel(
    "scripts/security/operator-ra-pro-cutover-production-dryrun-ceremony.ps1",
  );
  auth.operator_apply_ceremony = sealRel(
    "scripts/security/operator-ra-pro-cutover-production-apply-ceremony.ps1",
  );
  auth.visible_ceremony_supervisor = sealRel(
    "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1",
  );
  auth.visible_ceremony_entry = sealRel(
    "scripts/security/enter-visible-ra-pro-cutover-ceremony.ps1",
  );
  auth.visible_ceremony_launcher = sealRel(
    "scripts/security/launch-visible-ra-pro-cutover-ceremony.ps1",
  );
  auth.prior_dry_run_gates = {
    ...auth.prior_dry_run_gates,
    ...sealRel("scripts/security/ra-pro-cutover-prior-dry-run-gates.ps1"),
    allowlist: [
      "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
      "DRY_RUN_READY",
    ],
  };
  auth.precondition_gates = {
    ...sealRel("scripts/security/ra-pro-cutover-precondition-gates.ps1"),
  };

  const evidence = sealRel("scripts/security/ra-pro-cutover-evidence.js");
  const frameTool = sealRel("scripts/security/ra-pro-cutover-evidence-frame-tool.js");
  const decodeFrame = sealRel("scripts/security/ra-pro-cutover-evidence-decode-frame.js");
  const shared = sealRel("scripts/security/containment-evidence-protocol.js");
  const contract = sealRel(
    "docs/security/ra-pro-cutover-apply/PRECONDITION_EVIDENCE_CONTRACT.json",
  );

  auth.evidence_protocol = {
    id: "RA_PRO_CUTOVER_EVIDENCE_V1",
    frame: "RA_PRO_CUTOVER_EVIDENCE_V1:<base64url-utf8-json>",
    schema_version: 1,
    ...evidence,
    frame_tool: frameTool,
    decode_frame: decodeFrame,
    shared_framing_module: shared,
  };

  auth.precondition_evidence_protocol = {
    id: "RA_PRO_CUTOVER_PRECONDITION_EVIDENCE_V1",
    schema_version: 1,
    contract_path: contract.path,
    contract_oid: contract.oid,
    contract_sha256: contract.sha256,
    contract_bytes: contract.bytes,
  };

  // Ensure pin fields exist and remain unpublished unless explicitly set.
  if (!Object.prototype.hasOwnProperty.call(auth, "required_precondition_evidence_sha256")) {
    auth.required_precondition_evidence_sha256 = null;
  }
  if (!Object.prototype.hasOwnProperty.call(auth, "required_precondition_freeze")) {
    auth.required_precondition_freeze = null;
  }
  if (!Object.prototype.hasOwnProperty.call(auth, "required_precondition_evidence_tip")) {
    auth.required_precondition_evidence_tip = null;
  }
  if (!Object.prototype.hasOwnProperty.call(auth, "required_precondition_bundle_source")) {
    auth.required_precondition_bundle_source = null;
  }
  if (!auth.published_precondition_evidence) {
    auth.published_precondition_evidence = { status: "UNPUBLISHED" };
  }

  writeLf(AUTH_PATH, `${JSON.stringify(auth, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        ok: true,
        native_bootstrap: auth.native_bootstrap.oid,
        precondition_gates: auth.precondition_gates.oid,
        operator_ceremony: auth.operator_ceremony.oid,
      },
      null,
      2,
    ),
  );
}

main();
