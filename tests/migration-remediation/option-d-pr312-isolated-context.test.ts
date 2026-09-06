import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  diagnoseVitestSuiteDiscovery,
  preparePr312IsolatedContext,
  cleanupPr312IsolatedContext,
} from "../../scripts/migration-remediation/option-d-pr312-isolated-context.js";
import {
  launchLocalVitest,
  resolveLocalVitestEntry,
} from "../../scripts/migration-remediation/option-d-vitest-launcher.js";
import {
  PR312_COMMIT,
  PR312_SUITE_BLOB,
  PR312_SUITE_PATH,
  evaluateVitestRunGate,
} from "../../scripts/migration-remediation/option-d-vitest-result-gate.js";
import { sha256Buffer } from "../../scripts/migration-remediation/option-d-git-blob-authority.js";

const ROOT = path.resolve(__dirname, "../..");

describe("Option D PR #312 isolated Vitest context", () => {
  const contexts: Array<ReturnType<typeof preparePr312IsolatedContext>> = [];
  afterEach(() => {
    for (const ctx of contexts.splice(0)) {
      if (ctx && (ctx.worktreePath || ctx.tempRoot)) {
        cleanupPr312IsolatedContext(ctx);
      }
    }
  });

  it("diagnoses outside-root suite as zero-discovery failure", () => {
    const outside = path.join(os.tmpdir(), "option-d-outside", "suite.test.ts");
    const d = diagnoseVitestSuiteDiscovery({
      projectRoot: ROOT,
      suitePath: outside,
      canonicalRepoPath: PR312_SUITE_PATH,
    });
    expect(d.ok).toBe(false);
    expect(d.outsideProjectRoot).toBe(true);
    expect(d.failures.some((f) => f.rule === "suite_outside_vitest_project_root")).toBe(true);

    const launched = launchLocalVitest({
      suitePath: outside,
      outputFile: path.join(os.tmpdir(), "out.json"),
      cwd: ROOT,
      requireInsideProjectRoot: true,
      spawnSyncImpl: (() => {
        throw new Error("must_not_spawn");
      }) as never,
    });
    expect(launched.ok).toBe(false);
    expect(launched.error).toBe("suite_outside_vitest_project_root");
  });

  it("prepares detached worktree at exact PR #312 pin with canonical suite path", () => {
    const ctx = preparePr312IsolatedContext({
      commit: PR312_COMMIT,
      suitePath: PR312_SUITE_PATH,
      suiteBlob: PR312_SUITE_BLOB,
      donorRoot: ROOT,
    });
    contexts.push(ctx);
    expect(ctx.ok).toBe(true);
    expect(ctx.commit).toBe(PR312_COMMIT);
    expect(ctx.suiteGitBlobId).toBe(PR312_SUITE_BLOB);
    expect(ctx.discovery?.outsideProjectRoot).toBe(false);
    expect(ctx.discovery?.repositoryRelativePath).toBe(PR312_SUITE_PATH);
    expect(path.resolve(ctx.worktreePath!)).not.toBe(path.resolve(ROOT));
    const live = fs.readFileSync(ctx.suiteAbsPath!);
    expect(sha256Buffer(live)).toBe(ctx.suiteSha256);
    expect(fs.existsSync(path.join(ctx.worktreePath!, "node_modules", "vitest"))).toBe(true);
  });

  it("fails closed on wrong suite blob / commit", () => {
    const badBlob = preparePr312IsolatedContext({
      commit: PR312_COMMIT,
      suitePath: PR312_SUITE_PATH,
      suiteBlob: "aa".repeat(20),
      donorRoot: ROOT,
    });
    if (badBlob.tempRoot) contexts.push(badBlob);
    expect(badBlob.ok).toBe(false);
    expect(badBlob.failures.some((f) => f.rule === "exact_suite_blob_mismatch")).toBe(true);

    const badCommit = preparePr312IsolatedContext({
      commit: "bb".repeat(20),
      suitePath: PR312_SUITE_PATH,
      suiteBlob: PR312_SUITE_BLOB,
      donorRoot: ROOT,
    });
    if (badCommit.tempRoot) contexts.push(badCommit);
    expect(badCommit.ok).toBe(false);
  });

  it("discovers the pinned suite via vitest list in isolated context (no DB)", () => {
    const ctx = preparePr312IsolatedContext({
      commit: PR312_COMMIT,
      suitePath: PR312_SUITE_PATH,
      suiteBlob: PR312_SUITE_BLOB,
      donorRoot: ROOT,
    });
    contexts.push(ctx);
    expect(ctx.ok).toBe(true);

    const resolved = resolveLocalVitestEntry({ root: ROOT });
    expect(resolved.ok).toBe(true);

    // Collection-only: `vitest list` does not execute DB-dependent bodies.
    // A disposable URL string makes describeIf = describe so all 12 titles list;
    // no connection is opened by `list`.
    const { spawnSync } = require("node:child_process");
    const listed = spawnSync(
      process.execPath,
      [
        resolved.entryPath,
        "list",
        PR312_SUITE_PATH.replace(/\//g, path.sep),
        "--config",
        ctx.configPath,
        "--root",
        ctx.worktreePath,
      ],
      {
        cwd: ctx.worktreePath,
        encoding: "utf8",
        shell: false,
        env: {
          ...process.env,
          JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL:
            "postgresql://127.0.0.1:1/option_d_list_only_no_connect",
        },
        timeout: 120_000,
        windowsHide: true,
      },
    );
    expect(listed.error).toBeUndefined();
    expect(listed.status).toBe(0);
    const out = `${listed.stdout || ""}\n${listed.stderr || ""}`;
    expect(out.toLowerCase()).not.toMatch(/\bnpx(\.cmd)?\b/);
    expect(out).toMatch(/migration compile: reservation/i);
    expect(out).toMatch(/first reservation inserts row/i);
  });

  it("zero discovered tests fail closed at structured gate", () => {
    const gate = evaluateVitestRunGate({
      processExitCode: 1,
      error: null,
      report: { success: false, testResults: [] },
    });
    expect(gate.ok).toBe(false);
    expect(gate.structured.reason).toBe("zero_tests_in_report");
  });

  it("always cleans temporary worktree and does not substitute current-branch suite bytes", () => {
    const ctx = preparePr312IsolatedContext({
      commit: PR312_COMMIT,
      suitePath: PR312_SUITE_PATH,
      suiteBlob: PR312_SUITE_BLOB,
      donorRoot: ROOT,
    });
    expect(ctx.ok).toBe(true);
    const wt = ctx.worktreePath!;
    const cleanup = cleanupPr312IsolatedContext(ctx);
    expect(cleanup.ok).toBe(true);
    expect(fs.existsSync(wt)).toBe(false);
    // Active branch suite path still exists (untouched checkout).
    expect(fs.existsSync(path.join(ROOT, PR312_SUITE_PATH))).toBe(true);
  });

  it("paths containing spaces work for discovery diagnosis", () => {
    const rootWithSpaces = path.join(os.tmpdir(), "option d root with spaces");
    fs.mkdirSync(rootWithSpaces, { recursive: true });
    const suite = path.join(
      rootWithSpaces,
      "lib",
      "journal-entry-governance",
      "__tests__",
      "execution-reservation.postgres.integration.test.ts",
    );
    fs.mkdirSync(path.dirname(suite), { recursive: true });
    fs.writeFileSync(suite, "// fixture\n");
    const d = diagnoseVitestSuiteDiscovery({
      projectRoot: rootWithSpaces,
      suitePath: suite,
      canonicalRepoPath: PR312_SUITE_PATH,
    });
    expect(d.ok).toBe(true);
    expect(d.outsideProjectRoot).toBe(false);
    fs.rmSync(rootWithSpaces, { recursive: true, force: true });
  });
});
