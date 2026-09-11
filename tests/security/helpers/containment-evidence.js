"use strict";

const {
  extractEvidenceFrame,
  legacyHeuristicExtractJson,
  PROTOCOL_PREFIX,
} = require("../../scripts/security/containment-evidence-protocol.js");

/**
 * Parse native entry/bootstrap/launcher stdout that must be a V1 evidence frame.
 */
function parseContainmentStdout(stdout) {
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
  parseContainmentStdout,
  extractEvidenceFrame,
  legacyHeuristicExtractJson,
  PROTOCOL_PREFIX,
};
