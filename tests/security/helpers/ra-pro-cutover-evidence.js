"use strict";

const {
  extractEvidenceFrame,
  legacyHeuristicExtractJson,
  PROTOCOL_PREFIX,
} = require("../../../scripts/security/ra-pro-cutover-evidence.js");

function parseRaProStdout(stdout) {
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
  parseRaProStdout,
  extractEvidenceFrame,
  legacyHeuristicExtractJson,
  PROTOCOL_PREFIX,
};
