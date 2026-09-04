#!/usr/bin/env node
/**
 * Option D Git-blob artifact authority.
 *
 * Sole runtime authority for authorized apply artifacts is the exact committed
 * Git object at OPTION_D_AUTHORIZED_COMMIT (via `git cat-file blob commit:path`).
 * Working-tree smudge (CRLF), PowerShell text conversion, and silent EOL
 * normalization are never accepted as authority.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");

const MANIFEST_REPO_PATH = "docs/migration-remediation/option-d-replay-manifest.json";

const APPROVED_PATH_PREFIXES = [
  "docs/migration-remediation/",
  "supabase/migrations/",
  "supabase/migrations-draft/",
  "lib/journal-entry-governance/",
];

const FULL_COMMIT_RE = /^[a-f0-9]{40}$/;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;
const GIT_BLOB_OID_RE = /^[a-f0-9]{40}$/;

function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function normalizeRepoPath(repoPath) {
  return String(repoPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

/**
 * Fail closed on absolute paths, traversal, symlinks (when on disk), duplicates,
 * and paths outside the approved repository prefixes.
 * @param {string} repoPath
 * @param {{ seen?: Set<string>, root?: string, requireOnDiskNotSymlink?: boolean }} [opts]
 */
function assertSafeAuthorizedRepoPath(repoPath, opts = {}) {
  const failures = [];
  const normalized = normalizeRepoPath(repoPath);
  if (!normalized) {
    failures.push({ rule: "artifact_path_empty", path: repoPath });
    return { ok: false, failures, normalized: null };
  }
  if (path.isAbsolute(String(repoPath || "")) || /^[a-zA-Z]:[\\/]/.test(String(repoPath || ""))) {
    failures.push({ rule: "artifact_path_absolute_rejected", path: repoPath });
  }
  if (normalized.includes("\0")) {
    failures.push({ rule: "artifact_path_nul", path: repoPath });
  }
  const parts = normalized.split("/");
  if (parts.some((p) => p === ".." || p === "")) {
    failures.push({ rule: "artifact_path_traversal_rejected", path: repoPath });
  }
  if (!APPROVED_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    failures.push({
      rule: "artifact_path_outside_approved_prefixes",
      path: normalized,
      approvedPrefixes: APPROVED_PATH_PREFIXES,
    });
  }
  if (opts.seen) {
    if (opts.seen.has(normalized)) {
      failures.push({ rule: "artifact_path_duplicate", path: normalized });
    } else {
      opts.seen.add(normalized);
    }
  }
  const root = opts.root || ROOT;
  if (opts.requireOnDiskNotSymlink) {
    const abs = path.join(root, ...normalized.split("/"));
    try {
      if (fs.existsSync(abs) && fs.lstatSync(abs).isSymbolicLink()) {
        failures.push({ rule: "artifact_symlink_rejected", path: normalized });
      }
    } catch {
      /* absence is fine for symlink check — blob presence is checked separately */
    }
  }
  return { ok: failures.length === 0, failures, normalized };
}

/**
 * Binary-safe Git blob read. Never uses working-tree / smudge filters.
 * @param {string} commit
 * @param {string} repoPath
 * @param {{ cwd?: string }} [opts]
 * @returns {{ ok: boolean, bytes?: Buffer, gitBlobId?: string, sha256?: string, byteLength?: number, failures: object[] }}
 */
function readGitBlobAtCommit(commit, repoPath, opts = {}) {
  const failures = [];
  const commitNorm = String(commit || "")
    .trim()
    .toLowerCase();
  if (!FULL_COMMIT_RE.test(commitNorm)) {
    return {
      ok: false,
      failures: [{ rule: "invalid_commit_for_blob_read", commit }],
    };
  }
  const pathCheck = assertSafeAuthorizedRepoPath(repoPath, {
    requireOnDiskNotSymlink: true,
    root: opts.cwd || ROOT,
  });
  if (!pathCheck.ok) {
    return { ok: false, failures: pathCheck.failures };
  }
  const spec = `${commitNorm}:${pathCheck.normalized}`;
  const id = spawnSync("git", ["rev-parse", "--verify", spec], {
    cwd: opts.cwd || ROOT,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
  if (id.status !== 0) {
    const err = String(id.stderr || id.stdout || "").trim();
    const missing =
      /exists on disk|does not exist|bad revision|pathspec|Not a valid object/i.test(err) ||
      id.status === 128;
    return {
      ok: false,
      failures: [
        {
          rule: missing ? "git_blob_missing_at_commit" : "git_rev_parse_blob_failed",
          commit: commitNorm,
          path: pathCheck.normalized,
          detail: err.slice(0, 300),
        },
      ],
    };
  }
  const gitBlobId = String(id.stdout || "")
    .trim()
    .toLowerCase();
  if (!GIT_BLOB_OID_RE.test(gitBlobId)) {
    return {
      ok: false,
      failures: [
        {
          rule: "git_blob_oid_invalid",
          commit: commitNorm,
          path: pathCheck.normalized,
          gitBlobId,
        },
      ],
    };
  }
  const cat = spawnSync("git", ["cat-file", "blob", gitBlobId], {
    cwd: opts.cwd || ROOT,
    encoding: null,
    maxBuffer: 80 * 1024 * 1024,
  });
  if (cat.status !== 0 || !Buffer.isBuffer(cat.stdout)) {
    return {
      ok: false,
      failures: [
        {
          rule: "git_cat_file_blob_failed",
          commit: commitNorm,
          path: pathCheck.normalized,
          gitBlobId,
          detail: String(cat.stderr || "").slice(0, 300),
        },
      ],
    };
  }
  const bytes = cat.stdout;
  return {
    ok: true,
    failures: [],
    bytes,
    gitBlobId,
    sha256: sha256Buffer(bytes),
    byteLength: bytes.length,
    commit: commitNorm,
    path: pathCheck.normalized,
  };
}

/**
 * Load and authorize the Option D manifest exclusively from Git blob bytes.
 * @param {object} opts
 */
function loadAuthorizedManifestFromGit(opts = {}) {
  const failures = [];
  const expected = String(opts.expectedSha256 || "")
    .trim()
    .toLowerCase();
  const authorizedCommit = String(opts.authorizedCommit || "")
    .trim()
    .toLowerCase();
  const currentHead = String(opts.currentHead || "")
    .trim()
    .toLowerCase();
  const expectedByteLength =
    opts.expectedByteLength == null ? null : Number(opts.expectedByteLength);

  if (!FULL_COMMIT_RE.test(authorizedCommit)) {
    failures.push({
      rule: "missing_or_invalid_OPTION_D_AUTHORIZED_COMMIT",
      authorizedCommit: opts.authorizedCommit || null,
    });
  }
  if (!currentHead) {
    failures.push({ rule: "unable_to_resolve_git_head" });
  } else if (FULL_COMMIT_RE.test(authorizedCommit) && authorizedCommit !== currentHead) {
    failures.push({
      rule: "authorized_commit_mismatch",
      authorizedCommit,
      currentHead,
    });
  }
  if (!SHA256_HEX_RE.test(expected)) {
    failures.push({
      rule: "missing_or_invalid_OPTION_D_EXPECTED_MANIFEST_SHA256",
      expectedSha256: opts.expectedSha256 || null,
    });
  }

  if (failures.length) {
    return {
      ok: false,
      failures,
      authority: "git_cat_file_blob",
      expectedSha256: expected || null,
      observedManifestSha256: null,
      byteLength: null,
      authorizedCommit: authorizedCommit || null,
      currentHead: currentHead || null,
      manifestPath: MANIFEST_REPO_PATH,
      manifest: null,
      manifestBytes: null,
      gitBlobId: null,
    };
  }

  const blob = readGitBlobAtCommit(authorizedCommit, MANIFEST_REPO_PATH, {
    cwd: opts.cwd || ROOT,
  });
  if (!blob.ok) {
    return {
      ok: false,
      failures: blob.failures,
      authority: "git_cat_file_blob",
      expectedSha256: expected,
      observedManifestSha256: null,
      byteLength: null,
      authorizedCommit,
      currentHead,
      manifestPath: MANIFEST_REPO_PATH,
      manifest: null,
      manifestBytes: null,
      gitBlobId: null,
    };
  }

  if (blob.sha256 !== expected) {
    failures.push({
      rule: "manifest_sha256_mismatch",
      detail:
        "Authorized Manifest SHA-256 does not match SHA-256 of exact Git-blob manifest bytes at OPTION_D_AUTHORIZED_COMMIT. Working-tree / CRLF smudge bytes are not authority.",
      expectedSha256: expected,
      observedManifestSha256: blob.sha256,
      byteLength: blob.byteLength,
      gitBlobId: blob.gitBlobId,
      authority: "git_cat_file_blob",
    });
  }
  if (
    expectedByteLength != null &&
    Number.isFinite(expectedByteLength) &&
    blob.byteLength !== expectedByteLength
  ) {
    failures.push({
      rule: "manifest_byte_length_mismatch",
      expectedByteLength,
      byteLength: blob.byteLength,
    });
  }

  let manifest = null;
  try {
    manifest = JSON.parse(blob.bytes.toString("utf8"));
  } catch (err) {
    failures.push({
      rule: "manifest_json_parse_failed",
      detail: String(err.message || err).slice(0, 200),
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    authority: "git_cat_file_blob",
    expectedSha256: expected,
    observedManifestSha256: blob.sha256,
    byteLength: blob.byteLength,
    authorizedCommit,
    currentHead,
    manifestPath: MANIFEST_REPO_PATH,
    manifest,
    manifestBytes: blob.bytes,
    gitBlobId: blob.gitBlobId,
    substitutesNotAccepted: [
      "working_tree_smudge_bytes",
      "powershell_text_conversion",
      "eol_normalization",
      "git_blob_oid_as_content_hash",
      "reassemble_generatedAt_hash",
    ],
  };
}

function resolveEntrySourcePath(entry) {
  if (entry.replacementSource) return normalizeRepoPath(entry.replacementSource);
  if (entry.originalSource) return normalizeRepoPath(entry.originalSource);
  return null;
}

/**
 * Materialize every manifest entry's apply SQL from Git blobs into a fresh
 * run-specific temp directory. Never reads/writes repository working-tree SQL
 * as authority; never normalizes EOL.
 *
 * @param {object} opts
 * @param {string} opts.authorizedCommit
 * @param {object} opts.manifest
 * @param {string} [opts.tempRoot]
 * @param {string} [opts.cwd]
 */
function materializeAuthorizedSqlFromGit(opts = {}) {
  const failures = [];
  const artifacts = [];
  const authorizedCommit = String(opts.authorizedCommit || "")
    .trim()
    .toLowerCase();
  if (!FULL_COMMIT_RE.test(authorizedCommit)) {
    return {
      ok: false,
      failures: [{ rule: "missing_or_invalid_OPTION_D_AUTHORIZED_COMMIT" }],
      tempDir: null,
      artifacts: [],
    };
  }
  const manifest = opts.manifest;
  if (!manifest || !Array.isArray(manifest.entries)) {
    return {
      ok: false,
      failures: [{ rule: "manifest_entries_absent" }],
      tempDir: null,
      artifacts: [],
    };
  }

  const tempDir =
    opts.tempRoot ||
    fs.mkdtempSync(path.join(os.tmpdir(), "option-d-git-blob-sql-"));
  const assembledOut = path.join(tempDir, "assembled");
  fs.mkdirSync(assembledOut, { recursive: true });

  const seenPaths = new Set();
  const seenFilenames = new Set();
  const ordered = [...manifest.entries].sort((a, b) => a.order - b.order);

  for (const entry of ordered) {
    const assembledFilename = String(entry.assembledFilename || "");
    if (!assembledFilename || assembledFilename.includes("..") || assembledFilename.includes("/") || assembledFilename.includes("\\")) {
      failures.push({
        rule: "assembled_filename_invalid",
        order: entry.order,
        assembledFilename,
      });
      continue;
    }
    if (seenFilenames.has(assembledFilename)) {
      failures.push({
        rule: "assembled_filename_duplicate",
        order: entry.order,
        assembledFilename,
      });
      continue;
    }
    seenFilenames.add(assembledFilename);

    const sourcePath = resolveEntrySourcePath(entry);
    if (!sourcePath) {
      failures.push({
        rule: "entry_source_path_missing",
        order: entry.order,
        assembledFilename,
      });
      continue;
    }
    const pathCheck = assertSafeAuthorizedRepoPath(sourcePath, {
      seen: seenPaths,
      requireOnDiskNotSymlink: true,
      root: opts.cwd || ROOT,
    });
    if (!pathCheck.ok) {
      failures.push(
        ...pathCheck.failures.map((f) => ({
          ...f,
          order: entry.order,
          assembledFilename,
        })),
      );
      continue;
    }

    const expectedSha = String(entry.assembledSha256 || "")
      .trim()
      .toLowerCase();
    if (!SHA256_HEX_RE.test(expectedSha)) {
      failures.push({
        rule: "entry_assembled_sha256_missing",
        order: entry.order,
        assembledFilename,
      });
      continue;
    }

    const blob = readGitBlobAtCommit(authorizedCommit, pathCheck.normalized, {
      cwd: opts.cwd || ROOT,
    });
    if (!blob.ok) {
      failures.push(
        ...blob.failures.map((f) => ({
          ...f,
          order: entry.order,
          assembledFilename,
        })),
      );
      continue;
    }

    if (blob.sha256 !== expectedSha) {
      failures.push({
        rule: "committed_blob_sha256_mismatch_vs_manifest",
        detail:
          "Git-blob content SHA-256 at authorized commit does not equal manifest assembledSha256. Fail closed; do not apply worktree smudge bytes or EOL-normalize.",
        order: entry.order,
        assembledFilename,
        path: pathCheck.normalized,
        gitBlobId: blob.gitBlobId,
        gitBlobSha256: blob.sha256,
        gitBlobByteLength: blob.byteLength,
        manifestAssembledSha256: expectedSha,
      });
      continue;
    }

    const tempFile = path.join(assembledOut, assembledFilename);
    fs.writeFileSync(tempFile, blob.bytes);
    const tempSha = sha256Buffer(fs.readFileSync(tempFile));
    if (tempSha !== blob.sha256) {
      failures.push({
        rule: "temporary_materialization_hash_mismatch",
        order: entry.order,
        assembledFilename,
        gitBlobSha256: blob.sha256,
        temporaryFileSha256: tempSha,
      });
      continue;
    }

    artifacts.push({
      order: entry.order,
      assembledFilename,
      commit: authorizedCommit,
      path: pathCheck.normalized,
      gitBlobId: blob.gitBlobId,
      sha256: blob.sha256,
      byteLength: blob.byteLength,
      temporaryFile: tempFile,
      temporaryFileSha256: tempSha,
    });
  }

  if (failures.length) {
    return { ok: false, failures, tempDir, artifacts, assembledDir: assembledOut };
  }
  if (artifacts.length !== ordered.length) {
    return {
      ok: false,
      failures: [
        {
          rule: "materialization_count_mismatch",
          expected: ordered.length,
          materialized: artifacts.length,
        },
      ],
      tempDir,
      artifacts,
      assembledDir: assembledOut,
    };
  }

  return {
    ok: true,
    failures: [],
    tempDir,
    assembledDir: assembledOut,
    artifacts,
    authority: "git_cat_file_blob",
  };
}

function cleanupMaterialization(tempDir) {
  if (!tempDir || typeof tempDir !== "string") {
    return { ok: false, removed: false, detail: "tempDir_absent" };
  }
  const resolved = path.resolve(tempDir);
  const tmpRoot = path.resolve(os.tmpdir());
  if (!resolved.startsWith(tmpRoot + path.sep) && resolved !== tmpRoot) {
    return { ok: false, removed: false, detail: "tempDir_outside_os_tmpdir_refused" };
  }
  if (!resolved.includes("option-d-git-blob")) {
    return { ok: false, removed: false, detail: "tempDir_name_not_option_d_materialization" };
  }
  fs.rmSync(resolved, { recursive: true, force: true });
  return { ok: true, removed: !fs.existsSync(resolved), tempDir: resolved };
}

/**
 * Materialize the pinned PR #312 suite from its exact commit:path blob.
 */
function materializePr312SuiteFromGit(opts = {}) {
  const commit = String(opts.commit || "")
    .trim()
    .toLowerCase();
  const suitePath = normalizeRepoPath(opts.suitePath);
  const expectedBlobId = String(opts.expectedBlobId || "")
    .trim()
    .toLowerCase();
  const blob = readGitBlobAtCommit(commit, suitePath, { cwd: opts.cwd || ROOT });
  if (!blob.ok) {
    return { ok: false, failures: blob.failures, tempFile: null };
  }
  if (expectedBlobId && blob.gitBlobId !== expectedBlobId) {
    return {
      ok: false,
      failures: [
        {
          rule: "pr312_suite_blob_oid_mismatch",
          expectedBlobId,
          observedBlobId: blob.gitBlobId,
          path: suitePath,
          commit,
        },
      ],
      tempFile: null,
    };
  }
  const tempDir =
    opts.tempRoot ||
    fs.mkdtempSync(path.join(os.tmpdir(), "option-d-git-blob-pr312-"));
  const base = path.basename(suitePath);
  const tempFile = path.join(tempDir, base);
  fs.writeFileSync(tempFile, blob.bytes);
  const tempSha = sha256Buffer(fs.readFileSync(tempFile));
  if (tempSha !== blob.sha256) {
    return {
      ok: false,
      failures: [
        {
          rule: "temporary_materialization_hash_mismatch",
          gitBlobSha256: blob.sha256,
          temporaryFileSha256: tempSha,
        },
      ],
      tempFile,
      tempDir,
    };
  }
  return {
    ok: true,
    failures: [],
    tempDir,
    tempFile,
    commit,
    path: suitePath,
    gitBlobId: blob.gitBlobId,
    sha256: blob.sha256,
    byteLength: blob.byteLength,
    temporaryFileSha256: tempSha,
    authority: "git_cat_file_blob",
  };
}

/**
 * Reject treating PowerShell/text-converted buffers as authority when a
 * Git-blob reference is available (test helper / explicit guard).
 */
function rejectTextConvertedAuthority(opts = {}) {
  const failures = [];
  if (opts.claimedAuthority === "powershell_text" || opts.claimedAuthority === "working_tree") {
    failures.push({
      rule: "powershell_or_worktree_cannot_be_authority",
      claimedAuthority: opts.claimedAuthority,
    });
  }
  if (
    Buffer.isBuffer(opts.gitBlobBytes) &&
    Buffer.isBuffer(opts.candidateBytes) &&
    !opts.gitBlobBytes.equals(opts.candidateBytes)
  ) {
    failures.push({
      rule: "candidate_bytes_differ_from_git_blob",
      gitBlobSha256: sha256Buffer(opts.gitBlobBytes),
      candidateSha256: sha256Buffer(opts.candidateBytes),
    });
  }
  return { ok: failures.length === 0, failures };
}

module.exports = {
  ROOT,
  MANIFEST_REPO_PATH,
  APPROVED_PATH_PREFIXES,
  sha256Buffer,
  normalizeRepoPath,
  assertSafeAuthorizedRepoPath,
  readGitBlobAtCommit,
  loadAuthorizedManifestFromGit,
  resolveEntrySourcePath,
  materializeAuthorizedSqlFromGit,
  cleanupMaterialization,
  materializePr312SuiteFromGit,
  rejectTextConvertedAuthority,
};
