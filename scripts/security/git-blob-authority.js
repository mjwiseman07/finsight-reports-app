/**
 * Binary-safe Git blob authority for Stage-1 containment tooling.
 * Never reads SQL from the worktree.
 */
"use strict";

const { createHash } = require("node:crypto");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function sha256Buffer(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

function assertBinaryBuffer(buf, label) {
  if (!Buffer.isBuffer(buf)) {
    throw new Error(`${label}: expected Buffer from git cat-file`);
  }
}

/**
 * Load exact blob bytes. Never falls back to filesystem.
 * @param {string} commit full or unambiguous git commit SHA
 * @param {string} pathRel repo-relative path
 * @param {{ cwd?: string }} [opts]
 */
function loadGitBlob(commit, pathRel, opts = {}) {
  if (!commit || !/^[0-9a-f]{7,40}$/i.test(commit)) {
    throw new Error(`invalid commit for git blob load: ${String(commit)}`);
  }
  if (!pathRel || pathRel.includes("\0") || path.isAbsolute(pathRel)) {
    throw new Error(`invalid path for git blob load: ${String(pathRel)}`);
  }
  const cwd = opts.cwd || ROOT;
  const buf = execFileSync("git", ["cat-file", "blob", `${commit}:${pathRel}`], {
    cwd,
    // binary-safe: no encoding
  });
  assertBinaryBuffer(buf, pathRel);
  return buf;
}

function gitBlobOid(commit, pathRel, opts = {}) {
  const cwd = opts.cwd || ROOT;
  return execFileSync("git", ["rev-parse", `${commit}:${pathRel}`], {
    cwd,
    encoding: "utf8",
  }).trim();
}

function assertUtf8LfNoBom(buf, label = "blob") {
  assertBinaryBuffer(buf, label);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    throw new Error(`${label}: UTF-8 BOM forbidden`);
  }
  if (buf.includes(0x0d)) {
    throw new Error(`${label}: CR/CRLF bytes forbidden; require LF-only`);
  }
  // fatal UTF-8 decode
  new TextDecoder("utf-8", { fatal: true }).decode(buf);
}

/**
 * Verify blob OID + SHA-256 + byte length before any SQL use.
 * @returns {{ buffer: Buffer, oid: string, sha256: string, bytes: number, source: 'git_blob', commit: string, path: string }}
 */
function loadAndVerifyGitBlob(spec) {
  const {
    commit,
    path: pathRel,
    expectedOid,
    expectedSha256,
    expectedBytes,
    cwd,
  } = spec;

  let oid;
  let buffer;
  try {
    oid = gitBlobOid(commit, pathRel, { cwd });
    buffer = loadGitBlob(commit, pathRel, { cwd });
  } catch (err) {
    const e = new Error(`GIT_BLOB_LOAD_FAILED: ${err.message}`);
    e.code = "GIT_BLOB_LOAD_FAILED";
    throw e;
  }

  assertUtf8LfNoBom(buffer, pathRel);
  const digest = sha256Buffer(buffer);
  const bytes = buffer.length;

  if (expectedOid && oid !== expectedOid) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: blob OID for ${pathRel} at ${commit}: got ${oid}, expected ${expectedOid}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (expectedSha256 && digest !== expectedSha256) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: SHA-256 for ${pathRel}: got ${digest}, expected ${expectedSha256}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (expectedBytes != null && bytes !== expectedBytes) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: byte length for ${pathRel}: got ${bytes}, expected ${expectedBytes}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }

  return {
    buffer,
    oid,
    sha256: digest,
    bytes,
    source: "git_blob",
    commit,
    path: pathRel,
  };
}

/**
 * Deterministically remove exactly one outer BEGIN;/COMMIT; pair.
 * Full file (including wrapper) remains the history statements[1] payload.
 */
function stripOuterBeginCommit(fullSqlUtf8) {
  if (typeof fullSqlUtf8 !== "string") {
    throw new Error("stripOuterBeginCommit: expected string");
  }
  if (fullSqlUtf8.includes("\r")) {
    throw new Error("stripOuterBeginCommit: CR bytes forbidden");
  }
  const beginMatches = [...fullSqlUtf8.matchAll(/^BEGIN;/gm)];
  const commitMatches = [...fullSqlUtf8.matchAll(/^COMMIT;/gm)];
  if (beginMatches.length !== 1 || commitMatches.length !== 1) {
    throw new Error(
      `stripOuterBeginCommit: expected exactly one outer BEGIN; and one COMMIT; (begin=${beginMatches.length}, commit=${commitMatches.length})`,
    );
  }
  const beginIdx = beginMatches[0].index;
  const commitIdx = commitMatches[0].index;
  if (commitIdx <= beginIdx) {
    throw new Error("stripOuterBeginCommit: COMMIT; before BEGIN;");
  }
  // BEGIN; must be followed by newline; COMMIT; must be last non-empty statement
  if (!fullSqlUtf8.slice(beginIdx).startsWith("BEGIN;\n")) {
    throw new Error("stripOuterBeginCommit: BEGIN; must be followed by LF");
  }
  const afterCommit = fullSqlUtf8.slice(commitIdx);
  if (!/^COMMIT;\n?$/.test(afterCommit)) {
    throw new Error("stripOuterBeginCommit: COMMIT; must terminate the file");
  }
  const inner = fullSqlUtf8.slice(beginIdx + "BEGIN;\n".length, commitIdx);
  if (!inner.trim()) {
    throw new Error("stripOuterBeginCommit: empty inner body");
  }
  return inner;
}

function assertNoDropCascade(sql) {
  if (/\bDROP\s+(VIEW|TABLE|SCHEMA|FUNCTION|MATERIALIZED\s+VIEW)\b[\s\S]{0,200}?\bCASCADE\b/i.test(sql)) {
    throw new Error("DROP ... CASCADE detected in SQL artifact");
  }
}

module.exports = {
  ROOT,
  sha256Buffer,
  loadGitBlob,
  gitBlobOid,
  assertUtf8LfNoBom,
  loadAndVerifyGitBlob,
  stripOuterBeginCommit,
  assertNoDropCascade,
};
