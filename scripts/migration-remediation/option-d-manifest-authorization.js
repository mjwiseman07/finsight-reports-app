#!/usr/bin/env node
/**
 * Option D manifest authorization integrity.
 *
 * Requires:
 *   - OPTION_D_EXPECTED_MANIFEST_SHA256 = whole-file SHA-256 of committed Git-blob manifest bytes
 *   - OPTION_D_AUTHORIZED_COMMIT = full git commit the authorization is bound to
 *
 * Authority is exclusively `git cat-file blob <commit>:<path>`. Working-tree /
 * CRLF smudge bytes are never accepted. Disallowed substitutes: Git blob OID as
 * content hash, re-assemble hash, per-entry assembledSha256 counts alone.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const {
  loadAuthorizedManifestFromGit,
  MANIFEST_REPO_PATH,
  sha256Buffer: gitAuthoritySha256,
} = require("./option-d-git-blob-authority");

const ROOT = path.join(__dirname, "..", "..");
const DEFAULT_MANIFEST_PATH = path.join(ROOT, MANIFEST_REPO_PATH);
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
 * @param {Buffer} [opts.manifestBytes] optional override for unit tests only (must already be Git-blob bytes)
 * @param {boolean} [opts.requireCommitBinding]
 * @param {boolean} [opts.allowWorktreeBytes] FORBIDDEN for runtime
 * @param {number} [opts.expectedByteLength]
 */
function evaluateManifestAuthorization(opts = {}) {
  const requireCommitBinding = opts.requireCommitBinding !== false;
  const currentHead = String(
    opts.currentHead != null ? opts.currentHead : resolveGitHead() || "",
  )
    .trim()
    .toLowerCase();
  const authorizedCommit = String(opts.authorizedCommit || "")
    .trim()
    .toLowerCase();
  const expectedRaw = opts.expectedSha256;
  const expected =
    expectedRaw == null ? "" : String(expectedRaw).trim().toLowerCase();

  // Runtime / commit-bound path: Git blob is sole authority.
  if (requireCommitBinding && !opts.manifestBytes) {
    const loaded = loadAuthorizedManifestFromGit({
      expectedSha256: expected,
      authorizedCommit,
      currentHead,
      expectedByteLength: opts.expectedByteLength,
      cwd: opts.cwd || ROOT,
    });
    return {
      ok: loaded.ok,
      failures: loaded.failures,
      expectedSha256: loaded.expectedSha256,
      observedManifestSha256: loaded.observedManifestSha256,
      byteLength: loaded.byteLength,
      authorizedCommit: loaded.authorizedCommit,
      currentHead: loaded.currentHead,
      manifestPath: loaded.manifestPath,
      gitBlobId: loaded.gitBlobId || null,
      authority: loaded.authority || "git_cat_file_blob",
      manifest: loaded.manifest || null,
      manifestBytes: loaded.manifestBytes || null,
      substitutesNotAccepted: loaded.substitutesNotAccepted || [
        "working_tree_smudge_bytes",
        "powershell_text_conversion",
        "eol_normalization",
        "git_blob_oid",
        "reassemble_generatedAt_hash",
        "per_entry_assembledSha256_counts",
      ],
    };
  }

  // Test / explicit bytes path — caller supplies already-authorized buffers.
  const failures = [];
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

  if (opts.allowWorktreeBytes === true) {
    failures.push({
      rule: "worktree_bytes_authority_forbidden",
      detail: "allowWorktreeBytes is not permitted for Option D authorization",
    });
  }

  let bytes = opts.manifestBytes || null;
  let observed = null;
  let byteLength = null;
  if (bytes) {
    observed = sha256Buffer(bytes);
    byteLength = bytes.length;
  } else {
    failures.push({
      rule: "manifest_bytes_absent_without_git_authority",
      detail:
        "Manifest bytes must come from git cat-file blob at the authorized commit; worktree readFileSync is not authority",
    });
  }

  if (expected && SHA256_HEX_RE.test(expected) && observed && expected !== observed) {
    failures.push({
      rule: "manifest_sha256_mismatch",
      detail:
        "Authorized Manifest SHA-256 does not match SHA-256 of supplied Git-blob manifest bytes. Abort before assemble/apply.",
      expectedSha256: expected,
      observedManifestSha256: observed,
      byteLength,
      manifestPath: MANIFEST_REPO_PATH,
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
    manifestPath: MANIFEST_REPO_PATH,
    authority: "explicit_manifest_bytes",
    substitutesNotAccepted: [
      "working_tree_smudge_bytes",
      "powershell_text_conversion",
      "eol_normalization",
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
  let currentSha = null;
  if (opts.manifestBytes) {
    currentSha = sha256Buffer(opts.manifestBytes);
  } else if (opts.authorizedCommit && opts.currentHead) {
    const loaded = loadAuthorizedManifestFromGit({
      expectedSha256: authorizedSha,
      authorizedCommit: opts.authorizedCommit,
      currentHead: opts.currentHead,
      cwd: opts.cwd || ROOT,
    });
    currentSha = loaded.observedManifestSha256;
    if (!currentSha) {
      failures.push(...loaded.failures);
    }
  } else {
    failures.push({
      rule: "manifest_unchanged_requires_git_or_bytes",
      detail: "Pass manifestBytes or authorizedCommit+currentHead for Git-blob comparison",
    });
  }

  if (!authorizedSha || !SHA256_HEX_RE.test(authorizedSha)) {
    failures.push({
      rule: "missing_authorized_observed_sha256",
      detail: "Prior authorization snapshot missing observedManifestSha256",
    });
  } else if (currentSha && authorizedSha !== currentSha) {
    failures.push({
      rule: "manifest_regenerated_after_authorization",
      detail:
        "Manifest Git-blob bytes changed after authorization (e.g. assemble rewrote generatedAt). Abort and require new authorization; do not accept regenerated output.",
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

function buildPrewriteAuthorizationEvidence(opts = {}) {
  const sqlApplicationAttempts = Number(opts.sqlApplicationAttempts || 0);
  return {
    kind: "option_d_prewrite_authorization_evidence",
    immutable: true,
    writtenAt: opts.writtenAt || new Date().toISOString(),
    authorizedCommit: opts.authorizedCommit || null,
    currentHead: opts.currentHead || null,
    manifestPath: opts.manifestPath || MANIFEST_REPO_PATH,
    expectedManifestSha256: opts.expectedSha256 || null,
    actualManifestSha256: opts.observedManifestSha256 || null,
    byteLength: opts.byteLength ?? null,
    gitBlobId: opts.gitBlobId || null,
    authority: opts.authority || "git_cat_file_blob",
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
  MANIFEST_REPO_PATH,
  sha256Buffer,
  sha256File,
  resolveGitHead,
  evaluateManifestAuthorization,
  evaluateManifestUnchangedSinceAuthorization,
  buildPrewriteAuthorizationEvidence,
  writePrewriteAuthorizationEvidence,
  readExpectedManifestSha256FromEnv,
  readAuthorizedCommitFromEnv,
  gitAuthoritySha256,
};
