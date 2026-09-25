/**
 * Worktree / non-interactive Git guard — regression tests.
 * Covers "Local changes detected before checking out…" fail-closed behavior.
 */

import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const guard = require(path.join(
  __dirname,
  "..",
  "..",
  "scripts/orchestrator/worktree-guard.js",
));

const {
  InfrastructureBlockError,
  isLocalChangesCheckoutBlock,
  parsePorcelainStatus,
  assertWorkspaceSafeForOvernight,
  assertGitOutputSafe,
  assertNoLocalAgentBranchCheckout,
  nonInteractiveGitEnv,
  recommendPlanWorktreePath,
} = guard;

describe("worktree-guard", () => {
  it("detects Local changes detected before checking out", () => {
    expect(
      isLocalChangesCheckoutBlock(
        "error: Local changes detected before checking out branch 'cursor/foo'",
      ),
    ).toBe(true);
    expect(
      isLocalChangesCheckoutBlock(
        "error: Your local changes to the following files would be overwritten by checkout:\n  package.json",
      ),
    ).toBe(true);
    expect(isLocalChangesCheckoutBlock("Everything up-to-date")).toBe(false);
  });

  it("assertGitOutputSafe throws FATAL_INFRASTRUCTURE_BLOCK for that message", () => {
    expect(() =>
      assertGitOutputSafe(
        "",
        "error: Local changes detected before checking out 'main'",
      ),
    ).toThrow(InfrastructureBlockError);
    try {
      assertGitOutputSafe(
        "",
        "error: Local changes detected before checking out 'main'",
      );
    } catch (err) {
      expect(err.code).toBe("FATAL_INFRASTRUCTURE_BLOCK");
      expect(err.details.reason).toBe("LOCAL_CHANGES_BEFORE_CHECKOUT");
      expect(err.toJSON().infrastructure_block).toBe(true);
    }
  });

  it("parses porcelain tracked vs untracked", () => {
    const parsed = parsePorcelainStatus(
      " M package.json\n?? scripts/orchestrator/_run-with-env.js\n",
    );
    expect(parsed.trackedDirty).toEqual(["package.json"]);
    expect(parsed.untracked).toEqual([
      "scripts/orchestrator/_run-with-env.js",
    ]);
  });

  it("refuses dirty tracked worktree without interactive stash/discard", () => {
    const env = {};
    expect(() =>
      assertWorkspaceSafeForOvernight({
        cwd: "/tmp/fake",
        env,
        execGit: () => ({
          status: 0,
          stdout: " M docs/plans/JE-4-POST-WRITE-VERIFICATION.md\n",
          stderr: "",
          error: null,
        }),
      }),
    ).toThrow(/dirty tracked files/i);

    try {
      assertWorkspaceSafeForOvernight({
        cwd: "/tmp/fake",
        env: {},
        execGit: () => ({
          status: 0,
          stdout: " M docs/plans/JE-4-POST-WRITE-VERIFICATION.md\n",
          stderr: "",
          error: null,
        }),
      });
    } catch (err) {
      expect(err.code).toBe("FATAL_INFRASTRUCTURE_BLOCK");
      expect(err.details.reason).toBe("DIRTY_TRACKED_WORKTREE");
      expect(err.details.hint).toMatch(/dedicated clean worktree/i);
    }
  });

  it("allows clean tree with untracked helper files", () => {
    const result = assertWorkspaceSafeForOvernight({
      cwd: "/tmp/fake",
      env: {},
      execGit: () => ({
        status: 0,
        stdout: "?? scripts/orchestrator/_run-with-env.js\n",
        stderr: "",
        error: null,
      }),
    });
    expect(result.ok).toBe(true);
    expect(result.untracked).toContain(
      "scripts/orchestrator/_run-with-env.js",
    );
  });

  it("maps nonzero git status with local-changes text to FATAL block", () => {
    expect(() =>
      assertWorkspaceSafeForOvernight({
        cwd: "/tmp/fake",
        env: {},
        execGit: () => ({
          status: 1,
          stdout: "",
          stderr: "error: Local changes detected before checking out 'feature/x'",
          error: null,
        }),
      }),
    ).toThrow(/Local changes detected before checking out/);
  });

  it("forbids local agent branch checkout/switch operations", () => {
    expect(() =>
      assertNoLocalAgentBranchCheckout("git checkout cursor/je-4-xyz"),
    ).toThrow(/FORBIDDEN_LOCAL_CHECKOUT|forbidden/i);
    expect(assertNoLocalAgentBranchCheckout("gh pr view 333")).toBe(true);
  });

  it("sets non-interactive Git env markers", () => {
    const env = nonInteractiveGitEnv({ PATH: "/usr/bin" });
    expect(env.GIT_TERMINAL_PROMPT).toBe("0");
    expect(env.GIT_EDITOR).toBe("true");
    expect(env.PAGER).toBe("cat");
  });

  it("recommends a dedicated sibling worktree path per plan", () => {
    const p = recommendPlanWorktreePath("JE-4-POST-WRITE-VERIFICATION", {
      parentDir: "C:\\Users\\mattj",
      repoName: "finsight-reports",
    });
    expect(p).toMatch(/finsight-reports-orch-je-4-post-write-verification$/);
  });

  it("skip flag / ORCHESTRATOR_SKIP_WORKTREE_GUARD bypasses for tests", () => {
    expect(
      assertWorkspaceSafeForOvernight({
        skip: true,
        execGit: () => {
          throw new Error("should not run");
        },
      }).skipped,
    ).toBe(true);
    expect(
      assertWorkspaceSafeForOvernight({
        env: { ORCHESTRATOR_SKIP_WORKTREE_GUARD: "1" },
        execGit: () => {
          throw new Error("should not run");
        },
      }).skipped,
    ).toBe(true);
  });
});
