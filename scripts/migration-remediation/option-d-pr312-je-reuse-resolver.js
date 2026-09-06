#!/usr/bin/env node
/**
 * Load the exact PR #312 test-infra JE_REUSE pg client config resolver
 * from the pinned commit Git blob (never a production barrel).
 */
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const {
  PR312_COMMIT,
  PR312_JE_REUSE_RESOLVER_PATH,
  PR312_JE_REUSE_RESOLVER_BLOB,
} = require("./option-d-vitest-result-gate");
const { readGitBlobAtCommit } = require("./option-d-git-blob-authority");

const ROOT = path.join(__dirname, "..", "..");

/** @type {{ module: object, gitBlobId: string, tmpFile: string } | null } */
let cached = null;

function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Load resolveJeReusePgClientConfig (and helpers) from the pinned PR #312 blob.
 * @param {{ root?: string, worktreePath?: string, forceReload?: boolean }} [opts]
 */
function loadPinnedJeReuseResolver(opts = {}) {
  const root = opts.root || ROOT;
  if (cached && !opts.forceReload) {
    return {
      ok: true,
      module: cached.module,
      gitBlobId: cached.gitBlobId,
      source: "cache",
      resolverPath: PR312_JE_REUSE_RESOLVER_PATH,
      expectedBlob: PR312_JE_REUSE_RESOLVER_BLOB,
      commit: PR312_COMMIT,
    };
  }

  if (opts.worktreePath) {
    const abs = path.join(
      opts.worktreePath,
      ...PR312_JE_REUSE_RESOLVER_PATH.split("/"),
    );
    if (fs.existsSync(abs) && fs.lstatSync(abs).isFile()) {
      const bytes = fs.readFileSync(abs);
      const hashObject = require("child_process").spawnSync(
        "git",
        ["hash-object", "--stdin"],
        { cwd: root, input: bytes, encoding: "buffer", maxBuffer: 4 * 1024 * 1024 },
      );
      const oid = String(hashObject.stdout || "")
        .trim()
        .toLowerCase();
      if (oid !== PR312_JE_REUSE_RESOLVER_BLOB) {
        return {
          ok: false,
          failures: [
            {
              rule: "worktree_resolver_blob_mismatch",
              expected: PR312_JE_REUSE_RESOLVER_BLOB,
              observed: oid,
            },
          ],
        };
      }
      const resolvedAbs = require.resolve(abs);
      delete require.cache[resolvedAbs];
      const mod = require(abs);
      if (typeof mod.resolveJeReusePgClientConfig !== "function") {
        return {
          ok: false,
          failures: [{ rule: "resolver_export_missing" }],
        };
      }
      cached = { module: mod, gitBlobId: oid, tmpFile: abs };
      return {
        ok: true,
        module: mod,
        gitBlobId: oid,
        source: "worktree",
        resolverPath: PR312_JE_REUSE_RESOLVER_PATH,
        expectedBlob: PR312_JE_REUSE_RESOLVER_BLOB,
        commit: PR312_COMMIT,
      };
    }
  }

  const pinned = readGitBlobAtCommit(PR312_COMMIT, PR312_JE_REUSE_RESOLVER_PATH, {
    cwd: root,
  });
  if (!pinned.ok) {
    return { ok: false, failures: pinned.failures };
  }
  if (pinned.gitBlobId !== PR312_JE_REUSE_RESOLVER_BLOB) {
    return {
      ok: false,
      failures: [
        {
          rule: "pinned_resolver_blob_mismatch",
          expected: PR312_JE_REUSE_RESOLVER_BLOB,
          observed: pinned.gitBlobId,
          sha256: pinned.sha256 || sha256Buffer(pinned.bytes),
        },
      ],
    };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pr312-je-reuse-resolver-"));
  const tmpFile = path.join(tmpDir, "je-reuse-pg-client-config.js");
  fs.writeFileSync(tmpFile, pinned.bytes);
  delete require.cache[tmpFile];
  const mod = require(tmpFile);
  if (typeof mod.resolveJeReusePgClientConfig !== "function") {
    return {
      ok: false,
      failures: [{ rule: "resolver_export_missing" }],
    };
  }
  cached = { module: mod, gitBlobId: pinned.gitBlobId, tmpFile };
  return {
    ok: true,
    module: mod,
    gitBlobId: pinned.gitBlobId,
    source: "git_blob",
    resolverPath: PR312_JE_REUSE_RESOLVER_PATH,
    expectedBlob: PR312_JE_REUSE_RESOLVER_BLOB,
    commit: PR312_COMMIT,
    sha256: pinned.sha256,
    byteLength: pinned.byteLength,
  };
}

/**
 * @param {string} databaseUrl
 * @param {{ root?: string, worktreePath?: string, lookupAll?: Function }} [opts]
 */
async function resolvePinnedJeReusePgClientConfig(databaseUrl, opts = {}) {
  const loaded = loadPinnedJeReuseResolver(opts);
  if (!loaded.ok) {
    return {
      ok: false,
      reason: "resolver_load_failed",
      failures: loaded.failures,
      redacted: "(resolver-unavailable)",
    };
  }
  return loaded.module.resolveJeReusePgClientConfig(databaseUrl, {
    lookupAll: opts.lookupAll,
  });
}

function clearPinnedJeReuseResolverCache() {
  if (cached && cached.tmpFile && cached.source !== "worktree") {
    try {
      delete require.cache[cached.tmpFile];
    } catch {
      /* ignore */
    }
  }
  cached = null;
}

module.exports = {
  loadPinnedJeReuseResolver,
  resolvePinnedJeReusePgClientConfig,
  clearPinnedJeReuseResolverCache,
  PR312_JE_REUSE_RESOLVER_PATH,
  PR312_JE_REUSE_RESOLVER_BLOB,
  PR312_COMMIT,
};
