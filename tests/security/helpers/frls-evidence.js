"use strict";

const {
  extractEvidenceFrame,
  legacyHeuristicExtractJson,
  PROTOCOL_PREFIX,
} = require("../../../scripts/security/free-review-lead-session-evidence.js");

function parseFrlsStdout(stdout) {
  const extracted = extractEvidenceFrame(stdout);
  if (!extracted.ok) {
    const err = new Error(extracted.code || "APPLICATOR_EVIDENCE_MISSING");
    err.code = extracted.code;
    err.phase = extracted.phase;
    throw err;
  }
  return extracted.evidence;
}

module.exports = {
  parseFrlsStdout,
  extractEvidenceFrame,
  legacyHeuristicExtractJson,
  PROTOCOL_PREFIX,
};
