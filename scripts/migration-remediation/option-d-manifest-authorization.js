#!/usr/bin/env node
/**
 * Option D manifest authorization integrity.
 *
 * Requires:
 *   - OPTION_D_EXPECTED_MANIFEST_SHA256 = whole-file SHA-256 of committed manifest bytes
 *   - OPTION_D_AUTHORIZED_COMMIT = full git commit the authorization is bound to
 *
 * Disallowed substitutes: Git blob OID, re-assemble hash, per-entry assembledSha256 counts.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const DEFAULT_MANIFEST_PATH = path.join(
  ROOT,
  "docs/migration-remediation/option-d-replay-manifest.json",
);
const PREWRITE_EVIDENCE_PATH = path.join(
  ROOT,
  "docs/migration-remediation/option-d-prewrite-authorization-evidence.json",
);

const SHA256_HEX_RE = /^[a-f0-9]{64}$/;
const FULL_COMMIT_RE = /^[a-f0-9]{40}$/;

function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function resolveGitHead(cwd = ROOT) {
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" });
  if (r.status !== 0) return null;
  return String(r.stdout || "").trim().toLowerCase();
}

/**
 * @param {object} opts
 * @param {string|null|undefined} opts.expectedSha256
 * @param {string|null|undefined} opts.authorizedCommit
 * @param {string|null|undefined} opts.currentHead
 * @param {string} [opts.manifestPath]
 * @param {Buffer} [opts.manifestBytes]
 * @param {boolean} [opts.requireCommitBinding]
 */
function evaluateManifestAuthorization(opts = {}) {
  const failures = [];
  const expectedRaw = opts.expectedSha256;
  const expected =
    expectedRaw == null ? "" : String(expectedRaw).trim().toLowerCase();
  const authorizedCommit = String(opts.authorizedCommit || "")
    .trim()
    .toLowerCase();
  const currentHead = String(
    opts.currentHead != null ? opts.currentHead : resolveGitHead() || "",
  )
    .trim()
    .toLowerCase();
  const requireCommitBinding = opts.requireCommitBinding !== false;

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

  if (requireCommitBinding) {
    if (!authorizedCommit) {
      failures.push({
        rule: "missing_OPTION_D_AUTHORIZED_COMMIT",
        detail:
          "Set OPTION_D_AUTHORIZED_COMMIT to the full 40-char commit the manifest hash is authorized against",
      });
    } else if (!FULL_COMMIT_RE.test(authorizedCommit)) {
      failures.push({
        rule: "invalid_OPTION_D_AUTHORIZED_COMMIT",
        detail: "OPTION_D_AUTHORIZED_COMMIT must be a full 40-character lowercase hex commit",
        authorizedCommit: opts.authorizedCommit,
      });
    } else if (!currentHead) {
      failures.push({
        rule: "unable_to_resolve_git_head",
        detail: "Could not resolve git rev-parse HEAD for commit binding",
      });
    } else if (authorizedCommit !== currentHead) {
      failures.push({
        rule: "authorized_commit_mismatch",
        detail:
          "OPTION_D_AUTHORIZED_COMMIT must equal current HEAD. Re-authorization required after checkout/commit moves.",
        authorizedCommit,
        currentHead,
      });
    }
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
        "Authorized Manifest SHA-256 does not match SHA-256 of exact on-disk manifest bytes. Abort before assemble/apply.",
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
    authorizedCommit: authorizedCommit || null,
    currentHead: currentHead || null,
    manifestPath: path.relative(ROOT, manifestPath).replace(/\\/g, "/"),
    substitutesNotAccepted: [
      "git_blob_oid",
      "reassemble_generatedAt_hash",
      "per_entry_assembledSha256_counts",
    ],
  };
}

/**
 * Detect unauthorized regeneration after a successful authorization snapshot.
 */
function evaluateManifestUnchangedSinceAuthorization(opts = {}) {
  const failures = [];
  const authorizedSha = String(opts.authorizedObservedSha256 || "")
    .trim()
    .toLowerCase();
  const currentSha = opts.manifestBytes
    ? sha256Buffer(opts.manifestBytes)
    : sha256File(opts.manifestPath || DEFAULT_MANIFEST_PATH);

  if (!authorizedSha || !SHA256_HEX_RE.test(authorizedSha)) {
    failures.push({
      rule: "missing_authorized_observed_sha256",
      detail: "Prior authorization snapshot missing observedManifestSha256",
    });
  } else if (authorizedSha !== currentSha) {
    failures.push({
      rule: "manifest_regenerated_after_authorization",
      detail:
        "Manifest bytes changed after authorization (e.g. assemble rewrote generatedAt). Abort and require new authorization; do not accept regenerated output.",
      authorizedObservedSha256: authorizedSha,
      currentManifestSha256: currentSha,
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    authorizedObservedSha256: authorizedSha || null,
    currentManifestSha256: currentSha,
  };
}

/**
 * Immutable pre-write evidence: records authorization before any SQL attempts.
 */
function buildPrewriteAuthorizationEvidence(opts = {}) {
  const sqlApplicationAttempts = Number(opts.sqlApplicationAttempts || 0);
  return {
    kind: "option_d_prewrite_authorization_evidence",
    immutable: true,
    writtenAt: opts.writtenAt || new Date().toISOString(),
    authorizedCommit: opts.authorizedCommit || null,
    currentHead: opts.currentHead || null,
    manifestPath: opts.manifestPath || path.relative(ROOT, DEFAULT_MANIFEST_PATH).replace(/\\/g, "/"),
    expectedManifestSha256: opts.expectedSha256 || null,
    actualManifestSha256: opts.observedManifestSha256 || null,
    byteLength: opts.byteLength ?? null,
    sqlApplicationAttempts,
    authorizationOk: opts.ok === true,
    failures: opts.failures || [],
  };
}

function writePrewriteAuthorizationEvidence(evidence, outPath = PREWRITE_EVIDENCE_PATH) {
  if (Number(evidence.sqlApplicationAttempts) !== 0) {
    throw new Error("Refusing to write pre-write evidence after SQL application attempts");
  }
  fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2) + "\n");
  return outPath;
}

function readExpectedManifestSha256FromEnv(env = process.env) {
  return env.OPTION_D_EXPECTED_MANIFEST_SHA256 || null;
}

function readAuthorizedCommitFromEnv(env = process.env) {
  return env.OPTION_D_AUTHORIZED_COMMIT || null;
}

module.exports = {
  SHA256_HEX_RE,
  FULL_COMMIT_RE,
  DEFAULT_MANIFEST_PATH,
  PREWRITE_EVIDENCE_PATH,
  sha256Buffer,
  sha256File,
  resolveGitHead,
  evaluateManifestAuthorization,
  evaluateManifestUnchangedSinceAuthorization,
  buildPrewriteAuthorizationEvidence,
  writePrewriteAuthorizationEvidence,
  readExpectedManifestSha256FromEnv,
  readAuthorizedCommitFromEnv,
};
