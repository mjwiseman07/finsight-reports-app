#!/usr/bin/env node
/**
 * Option D manifest authorization integrity.
 *
 * Authorization requires an explicit expected whole-file SHA-256 of
 * docs/migration-remediation/option-d-replay-manifest.json.
 *
 * Disallowed substitutes:
 *   - Git blob OID (SHA-1)
 *   - Re-assemble output hash (new generatedAt)
 *   - Per-entry assembledSha256 match counts
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "..");
const DEFAULT_MANIFEST_PATH = path.join(
  ROOT,
  "docs/migration-remediation/option-d-replay-manifest.json",
);

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;

function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

/**
 * @param {object} opts
 * @param {string|null|undefined} opts.expectedSha256 - from OPTION_D_EXPECTED_MANIFEST_SHA256
 * @param {string} [opts.manifestPath]
 * @param {Buffer} [opts.manifestBytes] - optional override for tests
 */
function evaluateManifestAuthorization(opts = {}) {
  const failures = [];
  const expectedRaw = opts.expectedSha256;
  const expected =
    expectedRaw == null ? "" : String(expectedRaw).trim().toLowerCase();

  if (!expected) {
    failures.push({
      rule: "missing_OPTION_D_EXPECTED_MANIFEST_SHA256",
      detail:
        "Set OPTION_D_EXPECTED_MANIFEST_SHA256 to the authorized whole-file SHA-256 of option-d-replay-manifest.json",
    });
  } else if (!SHA256_HEX_RE.test(expected)) {
    failures.push({
      rule: "invalid_OPTION_D_EXPECTED_MANIFEST_SHA256",
      detail: "Expected Manifest SHA-256 must be 64 lowercase hex characters",
      expectedSha256: expectedRaw,
    });
  }

  const manifestPath = opts.manifestPath || DEFAULT_MANIFEST_PATH;
  let bytes = opts.manifestBytes || null;
  let observed = null;
  let byteLength = null;

  if (!bytes) {
    if (!fs.existsSync(manifestPath)) {
      failures.push({
        rule: "manifest_file_missing",
        detail: `Manifest file not found: ${manifestPath}`,
      });
    } else {
      bytes = fs.readFileSync(manifestPath);
    }
  }

  if (bytes) {
    observed = sha256Buffer(bytes);
    byteLength = bytes.length;
  }

  if (expected && SHA256_HEX_RE.test(expected) && observed && expected !== observed) {
    failures.push({
      rule: "manifest_sha256_mismatch",
      detail:
        "Authorized Manifest SHA-256 does not match SHA-256 of exact on-disk manifest bytes. Abort before assemble/apply. Do not substitute entry hashes, Git blob OID, or re-assemble output.",
      expectedSha256: expected,
      observedManifestSha256: observed,
      byteLength,
      manifestPath: path.relative(ROOT, manifestPath).replace(/\\/g, "/"),
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    expectedSha256: expected || null,
    observedManifestSha256: observed,
    byteLength,
    manifestPath: path.relative(ROOT, manifestPath).replace(/\\/g, "/"),
    substitutesNotAccepted: [
      "git_blob_oid",
      "reassemble_generatedAt_hash",
      "per_entry_assembledSha256_counts",
    ],
  };
}

function readExpectedManifestSha256FromEnv(env = process.env) {
  return env.OPTION_D_EXPECTED_MANIFEST_SHA256 || null;
}

module.exports = {
  SHA256_HEX_RE,
  DEFAULT_MANIFEST_PATH,
  sha256Buffer,
  sha256File,
  evaluateManifestAuthorization,
  readExpectedManifestSha256FromEnv,
};
