#!/usr/bin/env node
/**
 * Extract + retain RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_EVIDENCE_V1
 * Usage:
 *   node ra-pro-accounting-automation-corrective-evidence-decode-frame.js <evidence.js> <stdout-capture> [dest.json]
 * Prints {ok,sha256,bytes,path?,code?,phase?} — never prints secrets.
 */
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("fs");

function main() {
  const protocolPath = process.argv[2];
  const stdoutPath = process.argv[3];
  const destPath = process.argv[4];
  if (!protocolPath || !stdoutPath) {
    process.stderr.write(
      "usage: node ra-pro-accounting-automation-corrective-evidence-decode-frame.js <evidence.js> <stdout> [dest]\n",
    );
    process.exitCode = 2;
    return;
  }
  const {
    extractEvidenceFrame,
    retainCanonicalEvidenceFile,
  } = require(protocolPath);
  const raw = fs.readFileSync(stdoutPath);
  if (!destPath) {
    const r = extractEvidenceFrame(raw);
    if (!r.ok) {
      process.stdout.write(
        `${JSON.stringify({ ok: false, code: r.code, phase: r.phase, verdict: "CORRECTIVE_EVIDENCE_FRAME_INVALID" })}\n`,
      );
      process.exitCode = 2;
      return;
    }
    process.stdout.write(
      `${JSON.stringify({ ok: true, sha256: r.sha256, bytes: r.bytes, verdict: r.evidence.verdict })}\n`,
    );
    process.exitCode = 0;
    return;
  }
  const retained = retainCanonicalEvidenceFile(raw, destPath);
  process.stdout.write(`${JSON.stringify(retained)}\n`);
  process.exitCode = retained.ok ? 0 : 2;
}

main();
