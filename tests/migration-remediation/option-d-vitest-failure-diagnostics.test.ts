import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EXPECTED_PR312_TEST_TITLES,
  PR312_COMMIT,
  PR312_SUITE_BLOB,
  evaluateVitestRunGate,
} from "../../scripts/migration-remediation/option-d-vitest-result-gate.js";
import {
  INCOMPLETE_REASON,
  sanitizeDiagnosticText,
  extractSqlSignals,
  buildSanitizedVitestFailureDiagnostics,
  persistSanitizedVitestDiagnosticsArtifact,
  captureVitestDiagnosticsBeforeCleanup,
  applyDiagnosticsFailClosed,
} from "../../scripts/migration-remediation/option-d-vitest-failure-diagnostics.js";

const ROOT = path.resolve(__dirname, "../..");

function multiFailReport() {
  const passed = EXPECTED_PR312_TEST_TITLES.slice(0, 2);
  const failed = EXPECTED_PR312_TEST_TITLES.slice(2);
  const assertionResults = [
    ...passed.map((title) => ({
      title,
      fullName: title,
      status: "passed",
      duration: 1.5,
      failureMessages: [],
    })),
    ...failed.map((title, i) => ({
      title,
      fullName: title,
      status: "failed",
      duration: 0.4 + i * 0.01,
      failureMessages: [
        [
          `Error: JE_REUSE RPC failed sqlstate=42501: permission denied for function reserve_journal_entry_execution`,
          `    at runCase (C:/Users/mattj/AppData/Local/Temp/option-d-pr312-worktree-abc123/tree/lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts:${240 + i}:20)`,
          `    at file:///C:/Users/mattj/finsight-reports/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11`,
          `DETAIL: Failed to insert company_id=11111111-1111-4111-8111-111111111111 email=user@example.com key=${"a".repeat(64)}`,
          `HINT: DATABASE_URL=postgresql://postgres:s3cret@127.0.0.1:54322/option_d_pr312_rpc_deadbeef`,
        ].join("\n"),
      ],
    })),
  ];
  return {
    success: false,
    numFailedTestSuites: 1,
    numFailedTests: failed.length,
    numTotalTests: EXPECTED_PR312_TEST_TITLES.length,
    testResults: [
      {
        name: "C:/Users/mattj/AppData/Local/Temp/option-d-pr312-worktree-abc123/tree/lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts",
        status: "failed",
        message: "",
        assertionResults,
      },
    ],
  };
}

describe("Option D Vitest failure diagnostics", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    for (const d of tempDirs.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it("redacts credentials, URLs, temp paths, UUIDs, hex64, and fixture DETAIL", () => {
    const raw = [
      "postgresql://postgres:s3cret@127.0.0.1:54322/postgres",
      "password=s3cret",
      "DATABASE_URL=postgresql://x:y@127.0.0.1:54322/db",
      "C:/Users/mattj/AppData/Local/Temp/option-d-pr312-worktree-zz/tree/lib/x.ts:1:1",
      "C:/Users/mattj/AppData/Local/Temp/orphan-file.txt",
      "11111111-1111-4111-8111-111111111111",
      "a".repeat(64),
      "DETAIL: row (foo, bar)",
      "$1 = 'secret-value'",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaa.bbbb",
    ].join(" | ");
    const { text } = sanitizeDiagnosticText(raw, { maxChars: 2000 });
    expect(text).toContain("[redacted-url]");
    expect(text).toContain("[redacted-password]");
    expect(text).toContain("[redacted-env]");
    expect(text).toContain("[redacted-temp-path]");
    expect(text).toContain("lib/x.ts:1:1");
    expect(text).toContain("[redacted-uuid]");
    expect(text).toContain("[redacted-hex64]");
    expect(text).toContain("[redacted-fixture]");
    expect(text).toContain("[redacted-param]");
    expect(text).toContain("[redacted-token]");
    expect(text).not.toMatch(/s3cret/);
    expect(text).not.toMatch(/postgresql:\/\//i);
    expect(text).not.toMatch(/AppData/i);
  });

  it("emits explicit truncation markers when bounded", () => {
    const { text, truncated } = sanitizeDiagnosticText("x".repeat(1000), {
      maxChars: 40,
    });
    expect(truncated).toBe(true);
    expect(text.endsWith("…[truncated]")).toBe(true);
    expect(text.length).toBeLessThanOrEqual(40 + "…[truncated]".length);
  });

  it("extracts SQLSTATE, named setup phase, constraint, table, and RPC", () => {
    const signals = extractSqlSignals(
      'JE_REUSE setup failed at phase=seed_journal_entry_approval_secondary sqlstate=23514: new row for relation "journal_entry_approvals" violates check constraint "journal_entry_approvals_idempotency_key_check" via reserve_journal_entry_execution',
    );
    expect(signals.sqlstate).toBe("23514");
    expect(signals.namedSetupPhase).toBe("seed_journal_entry_approval_secondary");
    expect(signals.constraint).toBe("journal_entry_approvals_idempotency_key_check");
    expect(signals.table).toBe("journal_entry_approvals");
    expect(signals.functionOrRpc).toBe("reserve_journal_entry_execution");
  });

  it("accounts for all 13 expected titles across multiple failures", () => {
    const built = buildSanitizedVitestFailureDiagnostics({
      report: multiFailReport(),
      processExitCode: 1,
      repoRoot: ROOT,
      worktreePath: path.join(
        os.tmpdir(),
        "option-d-pr312-worktree-abc123",
        "tree",
      ),
      provenance: {
        commit: PR312_COMMIT,
        suiteBlob: PR312_SUITE_BLOB,
        resolverBlob: "5178894fc6811d9f9fef84b10fb9294504b4679e",
        suitePath:
          "lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts",
      },
    });
    expect(built.vitestFailed).toBe(true);
    expect(built.complete).toBe(true);
    expect(built.artifact.counts.expected).toBe(13);
    expect(built.artifact.counts.accounted).toBe(13);
    expect(built.artifact.counts.passed).toBe(2);
    expect(built.artifact.counts.failed).toBe(11);
    expect(built.artifact.counts.absent).toBe(0);
    expect(built.artifact.tests.map((t: { title: string }) => t.title)).toEqual(
      EXPECTED_PR312_TEST_TITLES,
    );
    const failed = built.artifact.tests.filter((t: { status: string }) => t.status === "failed");
    expect(failed).toHaveLength(11);
    for (const t of failed) {
      expect(t.sanitizedMessage).toBeTruthy();
      expect(t.sqlstate).toBe("42501");
      expect(t.functionOrRpc).toBe("reserve_journal_entry_execution");
      expect(t.sanitizedMessage).not.toMatch(/s3cret|postgresql:\/\//i);
      expect(t.stackFrames.length).toBeGreaterThan(0);
      expect(t.stackFrames[0].path).toContain(
        "lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts",
      );
      expect(t.stackFrames.every((f: { path: string }) => !f.path.includes("node_modules"))).toBe(
        true,
      );
    }
  });

  it("rejects malformed or incomplete reports and never false-PASS", () => {
    const absent = buildSanitizedVitestFailureDiagnostics({
      report: null,
      processExitCode: 1,
    });
    expect(absent.complete).toBe(false);
    expect(absent.reason).toBe(INCOMPLETE_REASON);
    expect(absent.ok).toBe(false);

    const partial = buildSanitizedVitestFailureDiagnostics({
      report: {
        success: false,
        numFailedTests: 1,
        testResults: [
          {
            name: "suite",
            status: "failed",
            assertionResults: [
              {
                title: EXPECTED_PR312_TEST_TITLES[0],
                status: "failed",
                failureMessages: ["boom sqlstate=42P01"],
              },
            ],
          },
        ],
      },
      processExitCode: 1,
    });
    expect(partial.complete).toBe(false);
    expect(partial.reason).toBe(INCOMPLETE_REASON);
    expect(partial.artifact.counts.absent).toBe(12);

    const gate = evaluateVitestRunGate({
      processExitCode: 1,
      report: multiFailReport(),
    });
    expect(gate.ok).toBe(false);
    const closed = applyDiagnosticsFailClosed(gate, {
      vitestFailed: true,
      complete: false,
      reason: INCOMPLETE_REASON,
      diagnosticsPath: null,
      rawReportDeleted: true,
      built: { incompleteReasons: [{ rule: "vitest_report_absent_or_unparseable" }] },
    });
    expect(closed.ok).toBe(false);
    expect(closed.reason).toBe(INCOMPLETE_REASON);
    expect(closed.status).toBe("FAIL");
  });

  it("persists sanitized diagnostics, deletes raw report, and survives cleanup", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-diag-"));
    tempDirs.push(dir);
    const rawPath = path.join(dir, "raw-vitest.json");
    const report = multiFailReport();
    fs.writeFileSync(rawPath, JSON.stringify(report), "utf8");

    const capture = captureVitestDiagnosticsBeforeCleanup({
      report,
      processExitCode: 1,
      signal: null,
      timedOut: false,
      stderr: "password=s3cret postgresql://postgres:s3cret@127.0.0.1:54322/postgres",
      rawReportPath: rawPath,
      repoRoot: ROOT,
      evidenceDir: path.join(ROOT, "docs", "migration-remediation"),
      fileName: `option-d-pr312-vitest-diagnostics-unit-${Date.now()}.json`,
      worktreePath: path.join(os.tmpdir(), "option-d-pr312-worktree-abc123", "tree"),
      provenance: {
        commit: PR312_COMMIT,
        suiteBlob: PR312_SUITE_BLOB,
        resolverBlob: "5178894fc6811d9f9fef84b10fb9294504b4679e",
        suitePath:
          "lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts",
      },
    });

    expect(capture.vitestFailed).toBe(true);
    expect(capture.complete).toBe(true);
    expect(capture.rawReportDeleted).toBe(true);
    expect(fs.existsSync(rawPath)).toBe(false);
    expect(capture.diagnosticsPath).toMatch(
      /^docs\/migration-remediation\/option-d-pr312-vitest-diagnostics-unit-/,
    );
    const abs = path.join(ROOT, capture.diagnosticsPath!);
    tempDirs.push(abs); // ensure delete via afterEach? it's a file — unlink below
    expect(fs.existsSync(abs)).toBe(true);
    const saved = JSON.parse(fs.readFileSync(abs, "utf8"));
    expect(saved.kind).toBe("option_d_pr312_vitest_failure_diagnostics");
    expect(saved.complete).toBe(true);
    expect(saved.credentialsIncluded).toBe(false);
    expect(saved.tests).toHaveLength(13);
    expect(saved.counts.failed).toBe(11);
    const blob = JSON.stringify(saved);
    expect(blob).not.toMatch(/s3cret/);
    expect(blob).not.toMatch(/postgresql:\/\/postgres/i);
    expect(blob).not.toMatch(/AppData[\\/]+Local[\\/]+Temp/i);
    fs.unlinkSync(abs);

    const gate = evaluateVitestRunGate({ processExitCode: 1, report });
    const merged = applyDiagnosticsFailClosed(gate, capture);
    expect(merged.ok).toBe(false);
    expect(merged.reason).not.toBe(INCOMPLETE_REASON);
    expect(merged.diagnostics.complete).toBe(true);
    expect(merged.diagnostics.path).toBeTruthy();
  });

  it("fail-closes when persist round-trip cannot account for 13 titles", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-diag-bad-"));
    tempDirs.push(dir);
    const built = buildSanitizedVitestFailureDiagnostics({
      report: null,
      processExitCode: 1,
    });
    const persisted = persistSanitizedVitestDiagnosticsArtifact(built, {
      repoRoot: ROOT,
      evidenceDir: dir,
      fileName: "incomplete.json",
    });
    expect(persisted.complete).toBe(false);
    expect(persisted.reason).toBe(INCOMPLETE_REASON);
    // Artifact may still be written for operators, but must not claim complete.
    if (persisted.absolutePath && fs.existsSync(persisted.absolutePath)) {
      const saved = JSON.parse(fs.readFileSync(persisted.absolutePath, "utf8"));
      expect(saved.complete).toBe(false);
    }
  });

  it("captures hook failures with sanitized messages", () => {
    const report = {
      success: false,
      numFailedTestSuites: 1,
      numFailedTests: 0,
      testResults: [
        {
          name: "suite.ts",
          status: "failed",
          message:
            "Error in beforeAll hook: sqlstate=57014 password=s3cret at C:/Users/mattj/AppData/Local/Temp/x/tree/lib/journal-entry-governance/__tests__/je-reuse-disposable-setup.js:10:1",
          assertionResults: EXPECTED_PR312_TEST_TITLES.map((title) => ({
            title,
            status: "failed",
            failureMessages: ["Error: setup hook failed sqlstate=57014"],
          })),
        },
      ],
    };
    const built = buildSanitizedVitestFailureDiagnostics({
      report,
      processExitCode: 1,
      repoRoot: ROOT,
    });
    expect(built.artifact.hooks.length).toBeGreaterThan(0);
    expect(built.artifact.hooks[0].hookFailure).toBe(true);
    expect(built.artifact.hooks[0].sanitizedMessage).not.toMatch(/s3cret/);
    expect(built.artifact.hooks[0].sqlstate).toBe("57014");
  });
});
