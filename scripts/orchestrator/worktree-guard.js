"use strict";

/**
 * Non-interactive Git / worktree safety for overnight orchestrator.
 *
 * Never opens stash/commit/discard UI. Never auto-discards user changes.
 * Never checks out Cloud Agent branches into a dirty parent worktree.
 * Fail closed with FATAL_INFRASTRUCTURE_BLOCK when Git cannot proceed safely.
 */

const { spawnSync } = require("child_process");
const path = require("path");
const { getRepoRoot } = require("./lib");

const LOCAL_CHANGES_CHECKOUT_RE =
  /Local changes detected before checking out/i;
const INTERACTIVE_GIT_PROMPT_RE =
  /^(?:error: )?Your local changes to the following files would be overwritten by checkout/i;

class InfrastructureBlockError extends Error {
  /**
   * @param {string} message
   * @param {object} [details]
   */
  constructor(message, details = {}) {
    super(message);
    this.name = "InfrastructureBlockError";
    this.code = "FATAL_INFRASTRUCTURE_BLOCK";
    this.details = details;
  }

  toJSON() {
    return {
      ok: false,
      code: this.code,
      error: this.message,
      details: this.details,
      human_decision_required: false,
      infrastructure_block: true,
    };
  }
}

/**
 * Env that disables Git interactive prompts, editors, and pagers.
 */
function nonInteractiveGitEnv(env = process.env) {
  return {
    ...env,
    GIT_TERMINAL_PROMPT: "0",
    GIT_EDITOR: "true",
    EDITOR: "true",
    VISUAL: "true",
    PAGER: "cat",
    GIT_PAGER: "cat",
  };
}

/**
 * Detect classic interactive-checkout failure text.
 * @returns {boolean}
 */
function isLocalChangesCheckoutBlock(message) {
  const text = String(message || "");
  return (
    LOCAL_CHANGES_CHECKOUT_RE.test(text) ||
    INTERACTIVE_GIT_PROMPT_RE.test(text)
  );
}

/**
 * Parse `git status --porcelain` into tracked dirty vs untracked.
 */
function parsePorcelainStatus(stdout) {
  const lines = String(stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter(Boolean);
  const trackedDirty = [];
  const untracked = [];
  for (const line of lines) {
    // XY PATH — untracked is "?? "
    if (line.startsWith("?? ")) {
      untracked.push(line.slice(3).trim());
      continue;
    }
    // Ignore empty XY for safety; any other status is tracked dirty
    trackedDirty.push(line.slice(3).trim() || line);
  }
  return { trackedDirty, untracked, raw: lines };
}

function defaultExecGit(args, { cwd, env } = {}) {
  const result = spawnSync("git", args, {
    cwd: cwd || getRepoRoot(),
    env: nonInteractiveGitEnv(env || process.env),
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    status: result.status == null ? 1 : result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error || null,
  };
}

/**
 * Dedicated sibling worktree path recommendation (never mutates).
 */
function recommendPlanWorktreePath(planId, {
  parentDir = path.dirname(getRepoRoot()),
  repoName = "finsight-reports",
} = {}) {
  const slug = String(planId || "plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return path.join(parentDir, `${repoName}-orch-${slug}`);
}

/**
 * Paths the overnight controller is expected to mutate (STATUS + companion JSON).
 * These must not trip DIRTY_TRACKED_WORKTREE.
 */
function isOrchestratorOwnedDirtyPath(relPath) {
  const normalized = String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "");
  if (!normalized.startsWith("docs/plans/")) return false;
  // Plan markdown STATUS line, companion status, audit jsonl, human decision packets
  if (/\.status\.json$/i.test(normalized)) return true;
  if (/\.audit\.jsonl$/i.test(normalized)) return true;
  if (/\.human-decision\.json$/i.test(normalized)) return true;
  if (/\.blocker\.json$/i.test(normalized)) return true;
  if (/\.md$/i.test(normalized)) return true;
  return false;
}

/**
 * Assert controller workspace is safe for overnight (no interactive Git).
 *
 * Policy:
 * - Apply non-interactive Git env
 * - Refuse if tracked files are dirty (would trigger stash/checkout UI),
 *   except orchestrator-owned docs/plans/* STATUS/companion artifacts
 * - Untracked files are allowed (e.g. local helpers) unless forbidden
 * - Never auto-stash / discard / checkout
 * - If message matches "Local changes detected before checking out…", throw FATAL
 *
 * @returns {{ ok: true, trackedDirty: [], untracked: string[], ignoredOrchestratorDirty?: string[] }}
 */
function assertWorkspaceSafeForOvernight({
  cwd = getRepoRoot(),
  env = process.env,
  execGit = defaultExecGit,
  forbidUntracked = false,
  skip = false,
} = {}) {
  if (skip || env.ORCHESTRATOR_SKIP_WORKTREE_GUARD === "1") {
    return { ok: true, skipped: true, trackedDirty: [], untracked: [] };
  }

  // Mutate caller's env copy only if it's process.env — apply markers
  Object.assign(env, {
    GIT_TERMINAL_PROMPT: "0",
    GIT_EDITOR: "true",
    PAGER: "cat",
    GIT_PAGER: "cat",
  });

  const result = execGit(["status", "--porcelain"], { cwd, env });
  if (result.error) {
    throw new InfrastructureBlockError(
      `FATAL_INFRASTRUCTURE_BLOCK: cannot run git status (${result.error.message})`,
      {
        reason: "GIT_STATUS_FAILED",
        cwd,
        hint: "Fix Git availability; do not open interactive prompts.",
      },
    );
  }
  if (result.status !== 0) {
    const combined = `${result.stdout}\n${result.stderr}`;
    if (isLocalChangesCheckoutBlock(combined)) {
      throw new InfrastructureBlockError(
        "FATAL_INFRASTRUCTURE_BLOCK: Local changes detected before checking out — refusing interactive stash/commit/discard",
        {
          reason: "LOCAL_CHANGES_BEFORE_CHECKOUT",
          cwd,
          git_stderr: String(result.stderr || "").slice(0, 500),
          hint:
            "Use a dedicated clean worktree from origin/main. Inspect Cloud Agent branches via GitHub/API, never checkout into a dirty parent.",
        },
      );
    }
    throw new InfrastructureBlockError(
      `FATAL_INFRASTRUCTURE_BLOCK: git status failed (exit ${result.status})`,
      {
        reason: "GIT_STATUS_NONZERO",
        cwd,
        stderr: String(result.stderr || "").slice(0, 500),
      },
    );
  }

  const parsed = parsePorcelainStatus(result.stdout);
  const ignoredOrchestratorDirty = [];
  const blockingDirty = [];
  for (const file of parsed.trackedDirty) {
    if (isOrchestratorOwnedDirtyPath(file)) {
      ignoredOrchestratorDirty.push(file);
    } else {
      blockingDirty.push(file);
    }
  }

  if (blockingDirty.length > 0) {
    throw new InfrastructureBlockError(
      "FATAL_INFRASTRUCTURE_BLOCK: dirty tracked files in controller workspace — refusing branch switch / stash / discard interaction",
      {
        reason: "DIRTY_TRACKED_WORKTREE",
        cwd,
        trackedDirty: blockingDirty.slice(0, 50),
        ignoredOrchestratorDirty: ignoredOrchestratorDirty.slice(0, 50),
        hint:
          "Create or reuse a dedicated clean worktree from origin/main for this plan. Do not auto-discard user changes.",
        recommended_worktree: recommendPlanWorktreePath(
          env.ORCHESTRATOR_PLAN_ID || "plan",
        ),
      },
    );
  }

  if (forbidUntracked && parsed.untracked.length > 0) {
    throw new InfrastructureBlockError(
      "FATAL_INFRASTRUCTURE_BLOCK: untracked files forbidden in this workspace mode",
      {
        reason: "UNTRACKED_FORBIDDEN",
        cwd,
        untracked: parsed.untracked.slice(0, 50),
      },
    );
  }

  return {
    ok: true,
    trackedDirty: [],
    untracked: parsed.untracked,
    ignoredOrchestratorDirty,
  };
}

/**
 * Fail closed when a Git operation reports the classic dirty-checkout block.
 */
function assertGitOutputSafe(stdout, stderr) {
  const combined = `${stdout || ""}\n${stderr || ""}`;
  if (isLocalChangesCheckoutBlock(combined)) {
    throw new InfrastructureBlockError(
      "FATAL_INFRASTRUCTURE_BLOCK: Local changes detected before checking out — refusing interactive stash/commit/discard",
      {
        reason: "LOCAL_CHANGES_BEFORE_CHECKOUT",
        hint:
          "Inspect agent branches via GitHub/API or a separate clean worktree; never checkout into a dirty parent.",
      },
    );
  }
  return true;
}

/**
 * Orchestrator must not checkout Cloud Agent branches into the controller tree.
 */
function assertNoLocalAgentBranchCheckout(operation) {
  const op = String(operation || "").toLowerCase();
  if (
    op.includes("checkout") ||
    op.includes("git switch") ||
    op.includes("switch branch")
  ) {
    throw new InfrastructureBlockError(
      "FATAL_INFRASTRUCTURE_BLOCK: local checkout/switch of agent branches is forbidden in overnight controller",
      {
        reason: "FORBIDDEN_LOCAL_CHECKOUT",
        operation,
        hint:
          "Use GitHub API / gh / separate clean worktree to inspect cursor/* branches.",
      },
    );
  }
  return true;
}

module.exports = {
  InfrastructureBlockError,
  nonInteractiveGitEnv,
  isLocalChangesCheckoutBlock,
  isOrchestratorOwnedDirtyPath,
  parsePorcelainStatus,
  recommendPlanWorktreePath,
  assertWorkspaceSafeForOvernight,
  assertGitOutputSafe,
  assertNoLocalAgentBranchCheckout,
  defaultExecGit,
};
