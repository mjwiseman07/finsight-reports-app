#!/usr/bin/env node
/**
 * Decode a CONTAINMENT_EVIDENCE_V1 frame from a captured stdout file.
 *
 * Usage:
 *   node containment-evidence-decode-frame.js <protocol.js> <stdout.txt>
 *
 * argv[2] = path to containment-evidence-protocol.js
 * argv[3] = path to raw child stdout capture
 *
 * Prints one JSON object on stdout: { ok, evidence? } or { ok:false, code, phase }.
 * Never logs credential values.
 */
"use strict";

const fs = require("fs");

function main() {
  const protocolPath = process.argv[2];
  const stdoutPath = process.argv[3];
  if (!protocolPath || !stdoutPath) {
    process.stderr.write(
      "usage: node containment-evidence-decode-frame.js <protocol.js> <stdout.txt>\n",
    );
    process.exitCode = 2;
    return;
  }
  const { extractEvidenceFrame } = require(protocolPath);
  const text = fs.readFileSync(stdoutPath, "utf8");
  const r = extractEvidenceFrame(text);
  if (!r.ok) {
    process.stdout.write(
      `${JSON.stringify({ ok: false, code: r.code, phase: r.phase })}\n`,
    );
    process.exitCode = 2;
    return;
  }
  process.stdout.write(`${JSON.stringify({ ok: true, evidence: r.evidence })}\n`);
  process.exitCode = 0;
}

main();
