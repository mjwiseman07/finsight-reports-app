import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  resolveLocalVitestEntry,
  buildVitestArgv,
  assertShellFreeLaunchPlan,
  launchLocalVitest,
} from "../../scripts/migration-remediation/option-d-vitest-launcher.js";
import {
  evaluateVitestRunGate,
  evaluateVitestStructuredResult,
  EXPECTED_PR312_TEST_TITLES,
  PR312_COMMIT,
  PR312_SUITE_BLOB,
  PR312_SUITE_PATH,
} from "../../scripts/migration-remediation/option-d-vitest-result-gate.js";
import {
  materializePr312SuiteFromGit,
  cleanupMaterialization,
  sha256Buffer,
} from "../../scripts/migration-remediation/option-d-git-blob-authority.js";

const ROOT = path.resolve(__dirname, "../..");

function passedReport(titles: string[]) {
  return {
    success: true,
    numFailedTestSuites: 0,
    numFailedTests: 0,
    testResults: [
      {
        name: "fixture",
        status: "passed",
        assertionResults: titles.map((title) => ({
          title,
          fullName: title,
          status: "passed",
        })),
      },
    ],
  };
}

describe("Option D shell-free Vitest launcher", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const d of tempDirs.splice(0)) {
      cleanupMaterialization(d);
    }
  });

  it("resolves lockfile-pinned local Vitest entry without npx", () => {
    const resolved = resolveLocalVitestEntry({ root: ROOT });
    expect(resolved.ok).toBe(true);
    expect(resolved.npxUsed).toBe(false);
    expect(resolved.shellUsed).toBe(false);
    expect(resolved.networkResolverUsed).toBe(false);
    expect(resolved.entryPath).toContain(`${path.sep}node_modules${path.sep}vitest${path.sep}`);
    expect(fs.existsSync(resolved.entryPath!)).toBe(true);
    expect(resolved.entrySha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("builds argv for process.execPath with shell false (Windows-safe)", () => {
    const resolved = resolveLocalVitestEntry({ root: ROOT });
    const suite = path.join(os.tmpdir(), "suite with spaces", "pr312.test.ts");
    const out = path.join(os.tmpdir(), "out with spaces", "result.json");
    const plan = buildVitestArgv({
      entryPath: resolved.entryPath!,
      suitePath: suite,
      outputFile: out,
    });
    expect(plan.ok).toBe(true);
    expect(plan.command).toBe(process.execPath);
    expect(plan.shell).toBe(false);
    expect(plan.argv![0]).toBe(resolved.entryPath);
    expect(plan.argv).toEqual([
      resolved.entryPath,
      "run",
      suite,
      "--reporter=json",
      `--outputFile=${out}`,
    ]);
    const check = assertShellFreeLaunchPlan(plan);
    expect(check.ok).toBe(true);
  });

  it("rejects missing or wrong local Vitest entry point", () => {
    const missingRoot = fs.mkdtempSync(path.join(os.tmpdir(), "no-vitest-"));
    const missing = resolveLocalVitestEntry({ root: missingRoot });
    expect(missing.ok).toBe(false);
    expect(missing.failures.some((f) => f.rule === "local_vitest_package_missing")).toBe(true);
    fs.rmSync(missingRoot, { recursive: true, force: true });

    const badPlan = assertShellFreeLaunchPlan({
      command: process.platform === "win32" ? "npx.cmd" : "npx",
      argv: ["vitest", "run"],
      shell: false,
    });
    expect(badPlan.ok).toBe(false);
    expect(
      badPlan.failures.some(
        (f) =>
          f.rule === "command_must_be_process_exec_path" ||
          f.rule === "npx_as_command_rejected",
      ),
    ).toBe(true);
  });

  it("records EINVAL / spawn error / signal / timeout / null exit as gate failures", () => {
    expect(
      evaluateVitestRunGate({
        processExitCode: null,
        error: Object.assign(new Error("spawnSync npx.cmd EINVAL"), { code: "EINVAL" }),
        report: null,
      }).failures.some((f) => f.rule === "vitest_spawn_einval"),
    ).toBe(true);

    expect(
      evaluateVitestRunGate({
        processExitCode: 1,
        error: null,
        report: passedReport(EXPECTED_PR312_TEST_TITLES),
      }).ok,
    ).toBe(false);

    expect(
      evaluateVitestRunGate({
        processExitCode: null,
        error: null,
        report: passedReport(EXPECTED_PR312_TEST_TITLES),
      }).failures.some((f) => f.rule === "vitest_exit_status_null"),
    ).toBe(true);

    expect(
      evaluateVitestRunGate({
        processExitCode: 0,
        signal: "SIGTERM",
        report: passedReport(EXPECTED_PR312_TEST_TITLES),
      }).ok,
    ).toBe(false);

    expect(
      evaluateVitestRunGate({
        processExitCode: null,
        timedOut: true,
        report: null,
      }).failures.some((f) => f.rule === "vitest_timeout"),
    ).toBe(true);
  });

  it("rejects malformed, incomplete, all-skipped, partial, duplicate, and unexpected structured output", () => {
    expect(evaluateVitestStructuredResult(null).ok).toBe(false);
    expect(evaluateVitestStructuredResult({}).reason).toBe("zero_tests_in_report");

    const allSkipped = {
      testResults: [
        {
          assertionResults: EXPECTED_PR312_TEST_TITLES.map((title) => ({
            title,
            status: "skipped",
          })),
        },
      ],
    };
    expect(evaluateVitestStructuredResult(allSkipped).failures.some((f) => f.rule === "all_skipped_cannot_pass")).toBe(
      true,
    );

    const partial = passedReport(EXPECTED_PR312_TEST_TITLES.slice(0, 3));
    expect(evaluateVitestStructuredResult(partial).ok).toBe(false);

    const dup = passedReport([
      ...EXPECTED_PR312_TEST_TITLES,
      EXPECTED_PR312_TEST_TITLES[0],
    ]);
    expect(evaluateVitestStructuredResult(dup).failures.some((f) => f.rule === "duplicate_test_titles")).toBe(
      true,
    );

    const unexpected = passedReport([
      ...EXPECTED_PR312_TEST_TITLES,
      "totally unexpected extra test",
    ]);
    expect(
      evaluateVitestStructuredResult(unexpected).failures.some(
        (f) => f.rule === "unexpected_test_titles",
      ),
    ).toBe(true);

    // Process success without valid structured evidence remains failure.
    expect(
      evaluateVitestRunGate({
        processExitCode: 0,
        error: null,
        report: null,
      }).ok,
    ).toBe(false);
  });

  it("materializes exact PR #312 suite blob and rejects byte mismatch", () => {
    const mat = materializePr312SuiteFromGit({
      commit: PR312_COMMIT,
      suitePath: PR312_SUITE_PATH,
      expectedBlobId: PR312_SUITE_BLOB,
    });
    if (mat.tempDir) tempDirs.push(mat.tempDir);
    expect(mat.ok).toBe(true);
    expect(mat.gitBlobId).toBe(PR312_SUITE_BLOB);
    const live = fs.readFileSync(mat.tempFile!);
    expect(sha256Buffer(live)).toBe(mat.sha256);

    const mismatch = materializePr312SuiteFromGit({
      commit: PR312_COMMIT,
      suitePath: PR312_SUITE_PATH,
      expectedBlobId: "aa".repeat(20),
    });
    if (mismatch.tempDir) tempDirs.push(mismatch.tempDir);
    expect(mismatch.ok).toBe(false);
    expect(mismatch.failures.some((f) => f.rule === "pr312_suite_blob_oid_mismatch")).toBe(
      true,
    );
  });

  it("launchLocalVitest uses process.execPath, shell false, and cleans up fixture artifacts", () => {
    const fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-git-blob-pr312-"));
    tempDirs.push(fixtureDir);
    const suitePath = path.join(fixtureDir, "harmless-launcher.fixture.test.ts");
    const outFile = path.join(fixtureDir, "result.json");
    // Harmless non-DB fixture: empty suite file that vitest can load; we mock spawn.
    fs.writeFileSync(suitePath, "import { describe, it } from 'vitest';\ndescribe('x', () => { it('y', () => {}); });\n");

    const fakeSpawn = (command: string, argv: string[], opts: { shell?: boolean }) => {
      expect(command).toBe(process.execPath);
      expect(opts.shell).toBe(false);
      expect(argv[0]).toContain(`${path.sep}vitest${path.sep}`);
      expect(argv.join(" ").toLowerCase()).not.toMatch(/\bnpx(\.cmd)?\b/);
      fs.writeFileSync(
        outFile,
        JSON.stringify(passedReport(EXPECTED_PR312_TEST_TITLES)),
      );
      return { status: 0, signal: null, error: undefined, stdout: "", stderr: "" };
    };

    const launched = launchLocalVitest({
      suitePath,
      outputFile: outFile,
      cwd: ROOT,
      spawnSyncImpl: fakeSpawn as never,
      timeoutMs: 5_000,
    });
    expect(launched.launcher?.npxUsed).toBe(false);
    expect(launched.launcher?.shell).toBe(false);
    expect(launched.launcher?.nodeExecPath).toBe(process.execPath);
    expect(launched.launcher?.vitestEntrySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(launched.processExitCode).toBe(0);
    expect(fs.existsSync(outFile)).toBe(true);

    const gate = evaluateVitestRunGate({
      processExitCode: launched.processExitCode,
      error: launched.error,
      signal: launched.signal,
      timedOut: launched.timedOut,
      report: JSON.parse(fs.readFileSync(outFile, "utf8")),
    });
    expect(gate.ok).toBe(true);

    fs.unlinkSync(outFile);
    cleanupMaterialization(fixtureDir);
    expect(fs.existsSync(fixtureDir)).toBe(false);
    const idx = tempDirs.indexOf(fixtureDir);
    if (idx >= 0) tempDirs.splice(idx, 1);
  });

  it("proves no shell or network resolver is used in launch plan", () => {
    const resolved = resolveLocalVitestEntry({ root: ROOT });
    const plan = buildVitestArgv({
      entryPath: resolved.entryPath!,
      suitePath: path.join(os.tmpdir(), "s.test.ts"),
      outputFile: path.join(os.tmpdir(), "o.json"),
    });
    expect(assertShellFreeLaunchPlan({ ...plan, networkResolverUsed: false }).ok).toBe(true);
    expect(assertShellFreeLaunchPlan({ ...plan, networkResolverUsed: true }).ok).toBe(false);
    expect(assertShellFreeLaunchPlan({ ...plan, shell: true }).ok).toBe(false);
  });
});
