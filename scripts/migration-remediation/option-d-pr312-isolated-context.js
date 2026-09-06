#!/usr/bin/env node
/**
 * Isolated PR #312 Vitest execution context.
 *
 * Root cause of zero_tests_in_report (2026-09-04f): the suite was materialized to
 * an absolute temp path outside the Vitest project root. vitest.config.ts include
 * globs only cover in-repo paths (e.g. lib/journal-entry-governance/.../*.test.ts),
 * so Vitest collected zero tests.
 *
 * Fix: detached git worktree at the exact PR #312 commit; run the suite at its
 * canonical repository-relative path with cwd = worktree root. Share node_modules
 * from the active repo only when package-lock.json Git blobs match (read-only
 * junction/symlink). Never mutate the user's active worktree checkout.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { spawnSync } = require("child_process");
const {
  readGitBlobAtCommit,
  sha256Buffer,
  normalizeRepoPath,
} = require("./option-d-git-blob-authority");
const {
  PR312_COMMIT,
  PR312_SUITE_PATH,
  PR312_SUITE_BLOB,
} = require("./option-d-vitest-result-gate");

const ROOT = path.join(__dirname, "..", "..");
const FULL_COMMIT_RE = /^[a-f0-9]{40}$/;

function sha256File(absPath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absPath)).digest("hex");
}

function git(args, opts = {}) {
  return spawnSync("git", args, {
    cwd: opts.cwd || ROOT,
    encoding: opts.encoding === null ? undefined : opts.encoding || "utf8",
    maxBuffer: opts.maxBuffer || 20 * 1024 * 1024,
  });
}

/**
 * Diagnose why a suite path would yield zero Vitest discovery under a project root.
 */
function diagnoseVitestSuiteDiscovery(opts = {}) {
  const failures = [];
  const projectRoot = path.resolve(opts.projectRoot || ROOT);
  const suitePath = opts.suitePath;
  if (!suitePath) {
    return { ok: false, failures: [{ rule: "suite_path_missing" }] };
  }
  const absSuite = path.isAbsolute(suitePath)
    ? path.resolve(suitePath)
    : path.resolve(projectRoot, suitePath);
  const rel = path.relative(projectRoot, absSuite);
  const outside =
    !rel ||
    rel.startsWith("..") ||
    path.isAbsolute(rel) ||
    rel.split(path.sep).includes("..");
  if (outside) {
    failures.push({
      rule: "suite_outside_vitest_project_root",
      detail:
        "Suite path is outside the Vitest project root / include scope; Vitest collects zero tests.",
      projectRoot,
      suitePath: absSuite,
      relative: rel,
    });
  }
  const canonical = normalizeRepoPath(opts.canonicalRepoPath || PR312_SUITE_PATH);
  if (!outside && normalizeRepoPath(rel.replace(/\\/g, "/")) !== canonical) {
    failures.push({
      rule: "suite_path_not_canonical_repo_relative",
      expected: canonical,
      observed: normalizeRepoPath(rel.replace(/\\/g, "/")),
    });
  }
  if (opts.requireIncludeMatch !== false && !outside) {
    const includeNeedle = "lib/journal-entry-governance/";
    if (!normalizeRepoPath(rel.replace(/\\/g, "/")).startsWith(includeNeedle)) {
      failures.push({
        rule: "suite_outside_configured_include_prefix",
        includeNeedle,
      });
    }
  }
  return {
    ok: failures.length === 0,
    failures,
    projectRoot,
    suitePath: absSuite,
    repositoryRelativePath: outside ? null : normalizeRepoPath(rel.replace(/\\/g, "/")),
    outsideProjectRoot: outside,
  };
}

function readBlobOid(commit, repoPath, cwd = ROOT) {
  const r = git(["rev-parse", "--verify", `${commit}:${normalizeRepoPath(repoPath)}`], {
    cwd,
  });
  if (r.status !== 0) return null;
  return String(r.stdout || "")
    .trim()
    .toLowerCase();
}

/**
 * Create a detached worktree at PR #312 and prepare Vitest cwd.
 * @param {{
 *   commit?: string,
 *   suitePath?: string,
 *   suiteBlob?: string,
 *   donorRoot?: string,
 *   tempRoot?: string,
 * }} [opts]
 */
function preparePr312IsolatedContext(opts = {}) {
  const failures = [];
  const commit = String(opts.commit || PR312_COMMIT)
    .trim()
    .toLowerCase();
  const suiteRepoPath = normalizeRepoPath(opts.suitePath || PR312_SUITE_PATH);
  const expectedBlob = String(opts.suiteBlob || PR312_SUITE_BLOB)
    .trim()
    .toLowerCase();
  const donorRoot = path.resolve(opts.donorRoot || ROOT);

  if (!FULL_COMMIT_RE.test(commit)) {
    return { ok: false, failures: [{ rule: "invalid_pr312_commit", commit }] };
  }

  const suiteBlob = readGitBlobAtCommit(commit, suiteRepoPath, { cwd: donorRoot });
  if (!suiteBlob.ok) {
    return { ok: false, failures: suiteBlob.failures };
  }
  if (suiteBlob.gitBlobId !== expectedBlob) {
    return {
      ok: false,
      failures: [
        {
          rule: "exact_suite_blob_mismatch",
          expectedBlobId: expectedBlob,
          observedBlobId: suiteBlob.gitBlobId,
        },
      ],
    };
  }

  const donorLockOid = readBlobOid(commit, "package-lock.json", donorRoot);
  const headLockOid = readBlobOid(
    String(
      git(["rev-parse", "HEAD"], { cwd: donorRoot }).stdout || "",
    )
      .trim()
      .toLowerCase(),
    "package-lock.json",
    donorRoot,
  );
  // Compare PR312 lock to donor HEAD lock (active install). Must match to share node_modules.
  const pr312LockAtPin = donorLockOid;
  const activeHead = String(git(["rev-parse", "HEAD"], { cwd: donorRoot }).stdout || "")
    .trim()
    .toLowerCase();
  const activeLockOid = readBlobOid(activeHead, "package-lock.json", donorRoot);
  if (!pr312LockAtPin || !activeLockOid || pr312LockAtPin !== activeLockOid) {
    return {
      ok: false,
      failures: [
        {
          rule: "package_lock_mismatch_cannot_share_node_modules",
          pr312LockOid: pr312LockAtPin,
          activeLockOid,
          activeHead,
          pr312Commit: commit,
        },
      ],
    };
  }

  const tempRoot =
    opts.tempRoot ||
    fs.mkdtempSync(path.join(os.tmpdir(), "option-d-pr312-worktree-"));
  const worktreePath = path.join(tempRoot, "tree");

  // Ensure parent exists; git worktree add creates the leaf.
  fs.mkdirSync(tempRoot, { recursive: true });
  if (fs.existsSync(worktreePath)) {
    return {
      ok: false,
      failures: [{ rule: "worktree_path_already_exists", worktreePath }],
    };
  }

  const add = git(
    ["worktree", "add", "--detach", worktreePath, commit],
    { cwd: donorRoot },
  );
  if (add.status !== 0) {
    return {
      ok: false,
      failures: [
        {
          rule: "git_worktree_add_failed",
          detail: String(add.stderr || add.stdout || "").slice(0, 400),
        },
      ],
      tempRoot,
    };
  }

  const wtHead = String(git(["rev-parse", "HEAD"], { cwd: worktreePath }).stdout || "")
    .trim()
    .toLowerCase();
  if (wtHead !== commit) {
    failures.push({
      rule: "worktree_head_mismatch",
      expected: commit,
      observed: wtHead,
    });
  }

  const suiteAbs = path.join(worktreePath, ...suiteRepoPath.split("/"));
  if (!fs.existsSync(suiteAbs)) {
    failures.push({ rule: "suite_missing_in_worktree", path: suiteAbs });
  } else {
    // Checkout may smudge CRLF; authoritative suite bytes are the Git blob.
    // Overwrite the canonical path with exact cat-file bytes before Vitest runs.
    fs.writeFileSync(suiteAbs, suiteBlob.bytes);
    const liveSha = sha256File(suiteAbs);
    if (liveSha !== suiteBlob.sha256) {
      failures.push({
        rule: "worktree_suite_bytes_mismatch",
        expectedSha256: suiteBlob.sha256,
        observedSha256: liveSha,
      });
    }
    // Confirm we did not leave active-branch substitutes: blob OID must still match pin.
    const oidInTree = readBlobOid(commit, suiteRepoPath, worktreePath);
    if (oidInTree !== expectedBlob) {
      failures.push({
        rule: "worktree_suite_git_oid_mismatch",
        expectedBlobId: expectedBlob,
        observedBlobId: oidInTree,
      });
    }
  }

  const discovery = diagnoseVitestSuiteDiscovery({
    projectRoot: worktreePath,
    suitePath: suiteAbs,
    canonicalRepoPath: suiteRepoPath,
  });
  if (!discovery.ok) {
    failures.push(...discovery.failures);
  }

  // Share node_modules via junction/symlink (reversible). Fail if donor missing.
  const donorNm = path.join(donorRoot, "node_modules");
  const wtNm = path.join(worktreePath, "node_modules");
  let nodeModulesLink = null;
  if (!fs.existsSync(donorNm)) {
    failures.push({ rule: "donor_node_modules_missing", path: donorNm });
  } else if (!failures.length) {
    try {
      if (process.platform === "win32") {
        fs.symlinkSync(donorNm, wtNm, "junction");
        nodeModulesLink = { type: "junction", target: donorNm, path: wtNm };
      } else {
        fs.symlinkSync(donorNm, wtNm, "dir");
        nodeModulesLink = { type: "symlink", target: donorNm, path: wtNm };
      }
    } catch (err) {
      failures.push({
        rule: "node_modules_link_failed",
        detail: String(err.message || err).slice(0, 300),
      });
    }
  }

  // Guard: worktree must not be the active donor checkout path.
  if (path.resolve(worktreePath) === path.resolve(donorRoot)) {
    failures.push({ rule: "worktree_must_not_be_active_checkout" });
  }

  if (failures.length) {
    cleanupPr312IsolatedContext({
      tempRoot,
      worktreePath,
      donorRoot,
      nodeModulesLink,
    });
    return { ok: false, failures, tempRoot, worktreePath };
  }

  const configPath = path.join(worktreePath, "vitest.config.ts");
  if (!fs.existsSync(configPath)) {
    cleanupPr312IsolatedContext({
      tempRoot,
      worktreePath,
      donorRoot,
      nodeModulesLink,
    });
    return {
      ok: false,
      failures: [{ rule: "vitest_config_missing_in_worktree", path: configPath }],
      tempRoot,
      worktreePath,
    };
  }

  return {
    ok: true,
    failures: [],
    commit,
    suiteRepoPath,
    suiteAbsPath: suiteAbs,
    suiteGitBlobId: suiteBlob.gitBlobId,
    suiteSha256: suiteBlob.sha256,
    worktreePath,
    tempRoot,
    configPath,
    donorRoot,
    nodeModulesLink,
    packageLockOid: pr312LockAtPin,
    discovery,
    authority: "git_worktree_detach_pr312_commit",
    activeWorktreeUntouched: true,
  };
}

function cleanupPr312IsolatedContext(ctx = {}) {
  const donorRoot = ctx.donorRoot || ROOT;
  const worktreePath = ctx.worktreePath;
  const tempRoot = ctx.tempRoot;
  const removed = { nodeModulesLink: false, worktree: false, tempRoot: false };

  if (ctx.nodeModulesLink?.path && fs.existsSync(ctx.nodeModulesLink.path)) {
    try {
      fs.lstatSync(ctx.nodeModulesLink.path).isSymbolicLink() ||
      process.platform === "win32"
        ? fs.rmSync(ctx.nodeModulesLink.path, { recursive: true, force: true })
        : fs.unlinkSync(ctx.nodeModulesLink.path);
      removed.nodeModulesLink = true;
    } catch {
      try {
        fs.rmSync(ctx.nodeModulesLink.path, { recursive: true, force: true });
        removed.nodeModulesLink = true;
      } catch {
        /* continue */
      }
    }
  }

  if (worktreePath && fs.existsSync(worktreePath)) {
    const rm = git(["worktree", "remove", "--force", worktreePath], { cwd: donorRoot });
    if (rm.status !== 0) {
      // Fallback: force-delete directory then prune
      try {
        fs.rmSync(worktreePath, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      git(["worktree", "prune"], { cwd: donorRoot });
    }
    removed.worktree = !fs.existsSync(worktreePath);
  }

  if (tempRoot && fs.existsSync(tempRoot)) {
    try {
      fs.rmSync(tempRoot, { recursive: true, force: true });
      removed.tempRoot = !fs.existsSync(tempRoot);
    } catch {
      removed.tempRoot = false;
    }
  }

  return {
    ok: removed.worktree || !worktreePath || !fs.existsSync(worktreePath || ""),
    removed,
  };
}

module.exports = {
  ROOT,
  diagnoseVitestSuiteDiscovery,
  preparePr312IsolatedContext,
  cleanupPr312IsolatedContext,
  sha256File,
  readBlobOid,
};
