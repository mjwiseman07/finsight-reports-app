#!/usr/bin/env node
/**
 * Freeze-materialized helper for native PowerShell bootstrap evidence framing (FRLS).
 */
"use strict";

const fs = require("fs");
const {
  extractEvidenceFrame,
  encodeEvidenceFrame,
  normalizeApplicatorEvidence,
  buildWrapperFallback,
  writeEvidenceFrameToStdout,
} = require("./free-review-lead-session-evidence");

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function main() {
  const cmd = process.argv[2];
  if (cmd === "parse-and-enrich") {
    const stdoutPath = process.argv[3];
    const enrichPath = process.argv[4];
    const text = fs.readFileSync(stdoutPath).toString("utf8");
    const enrich = enrichPath ? readJson(enrichPath) : {};
    const extracted = extractEvidenceFrame(text);
    if (!extracted.ok) {
      const fb = buildWrapperFallback({
        result_code: "BOOTSTRAP_BLOCKED",
        reason_code: extracted.code,
        phase: extracted.phase || "child_execute",
        error: extracted.code,
        nodeProcessStarted: Boolean(enrich.nodeProcessStarted),
        child_output_received: Boolean(String(text || "").trim()),
        cleanup: enrich.cleanup || { completed: true },
        extra: {
          ...enrich,
          missing_or_invalid: extracted.missing_or_invalid || null,
          counters_are_wrapper_observed: true,
        },
      });
      writeEvidenceFrameToStdout(fb);
      process.exitCode = 2;
      return;
    }
    const merged = normalizeApplicatorEvidence({
      ...extracted.evidence,
      bootstrap: enrich,
      unsafeInheritedNodeEnvironmentRemoved:
        enrich.unsafeInheritedNodeEnvironmentRemoved != null
          ? enrich.unsafeInheritedNodeEnvironmentRemoved
          : extracted.evidence.unsafeInheritedNodeEnvironmentRemoved,
    });
    writeEvidenceFrameToStdout(merged);
    process.exitCode = 0;
    return;
  }

  if (cmd === "wrap-fallback") {
    writeEvidenceFrameToStdout(buildWrapperFallback(readJson(process.argv[3])));
    process.exitCode = 2;
    return;
  }

  if (cmd === "encode") {
    writeEvidenceFrameToStdout(normalizeApplicatorEvidence(readJson(process.argv[3])));
    process.exitCode = 0;
    return;
  }

  process.stderr.write(
    "usage: free-review-lead-session-evidence-frame-tool.js parse-and-enrich|wrap-fallback|encode ...\n",
  );
  process.exitCode = 2;
}

main();
