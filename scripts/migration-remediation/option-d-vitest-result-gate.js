#!/usr/bin/env node
/**
 * Structured Vitest result gate for PR #312 postgres suite.
 * Process exit code alone is insufficient — require executed/passed counts
 * with zero skipped/todo/pending/failed.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PR312_COMMIT = "7f387fe0b662e07ad271ee9db7311eeb45eafc25";
const PR312_SUITE_PATH =
  "lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts";
const PR312_SUITE_BLOB = "d4afe0584d089d4ad50d479b81a369ca6dbdd168";
const PR312_JE_REUSE_RESOLVER_PATH =
  "lib/journal-entry-governance/__tests__/je-reuse-pg-client-config.js";
const PR312_JE_REUSE_RESOLVER_BLOB = "5178894fc6811d9f9fef84b10fb9294504b4679e";

/** Titles that must execute when DB URL is present (excludes the BLOCKED sentinel). */
const EXPECTED_PR312_TEST_TITLES = [
  "migration compile: reservation + transition RPCs exist",
  "A. first reservation inserts row + execution_requested receipt",
  "B. exact idempotency replay → reused, no duplicate receipt",
  "C. approval_id replay with same binding → reused",
  "D. binding mismatch on approval_id → fail closed",
  "E. transition RESERVED → READY_TO_POST + execution_ready receipt",
  "E2. Patent #6 chain adjacency for requested → ready receipts",
  "F. state_version conflict on transition → rejected",
  "G. transition RESERVED → PRECHECK_FAILED + execution_precheck_failed receipt",
  "H. concurrent approval_id reservation attempts converge to one execution",
  "I. zero provider-attempt rows for execution reservation path",
  "J. never touches staged production execution custody id",
];

const BLOCKED_SENTINEL_TITLE =
  "BLOCKED: JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL unavailable";

function sha256Text(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Normalize vitest JSON (v1/v2 shapes) into flat test results.
 */
function flattenVitestJson(report) {
  const tests = [];
  const walk = (node, suitePath = []) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child, suitePath);
      return;
    }
    const name = node.name || node.title || "";
    const nextPath = name ? [...suitePath, name] : suitePath;

    // Vitest JSON reporter: assertionResults on test results
    if (Array.isArray(node.assertionResults)) {
      for (const a of node.assertionResults) {
        tests.push({
          title: a.title || a.fullName || "",
          fullName: a.fullName || a.title || "",
          status: a.status || "unknown", // passed|failed|skipped|pending|todo
        });
      }
    }

    // Alternative: node.tests array
    if (Array.isArray(node.tests)) {
      for (const t of node.tests) {
        tests.push({
          title: t.name || t.title || "",
          fullName: [...nextPath, t.name || t.title || ""].join(" > "),
          status: mapVitestStatus(t.result?.state || t.status),
        });
      }
    }

    if (Array.isArray(node.testResults)) walk(node.testResults, nextPath);
    if (Array.isArray(node.assertionResults) === false && node.result) {
      // no-op
    }
    for (const key of ["suites", "children", "fileResults"]) {
      if (Array.isArray(node[key])) walk(node[key], nextPath);
    }
  };
  walk(report);
  return tests;
}

function mapVitestStatus(state) {
  const s = String(state || "").toLowerCase();
  if (s === "pass" || s === "passed") return "passed";
  if (s === "fail" || s === "failed") return "failed";
  if (s === "skip" || s === "skipped") return "skipped";
  if (s === "todo") return "todo";
  if (s === "pending" || s === "run" || s === "only") return "pending";
  return s || "unknown";
}

/**
 * @param {object} report - Vitest JSON report
 * @param {{ expectedTitles?: string[] }} [opts]
 */
function evaluateVitestStructuredResult(report, opts = {}) {
  const expectedTitles = opts.expectedTitles || EXPECTED_PR312_TEST_TITLES;
  if (!report || typeof report !== "object") {
    return {
      ok: false,
      status: "FAIL",
      reason: "vitest_report_absent",
      counts: {},
    };
  }

  const tests = flattenVitestJson(report);
  const counts = {
    total: tests.length,
    passed: tests.filter((t) => t.status === "passed").length,
    failed: tests.filter((t) => t.status === "failed").length,
    skipped: tests.filter((t) => t.status === "skipped").length,
    todo: tests.filter((t) => t.status === "todo").length,
    pending: tests.filter((t) => t.status === "pending").length,
    unknown: tests.filter((t) => !["passed", "failed", "skipped", "todo", "pending"].includes(t.status))
      .length,
  };

  const failures = [];

  if (counts.total === 0) {
    failures.push({ rule: "zero_tests_in_report" });
  }
  if (counts.failed > 0) failures.push({ rule: "failures_present", count: counts.failed });
  if (counts.skipped > 0) failures.push({ rule: "skipped_present", count: counts.skipped });
  if (counts.todo > 0) failures.push({ rule: "todo_present", count: counts.todo });
  if (counts.pending > 0) failures.push({ rule: "pending_present", count: counts.pending });
  if (counts.unknown > 0) failures.push({ rule: "unknown_status_present", count: counts.unknown });

  // BLOCKED sentinel must not be the only "success"
  const blockedPassed = tests.some(
    (t) => t.title.includes("BLOCKED:") && t.status === "passed",
  );
  if (blockedPassed && counts.passed <= 1) {
    failures.push({ rule: "blocked_sentinel_only" });
  }

  const passedTitles = new Set(
    tests.filter((t) => t.status === "passed").map((t) => t.title),
  );
  const missing = expectedTitles.filter((title) => !passedTitles.has(title));
  if (missing.length) {
    failures.push({
      rule: "expected_tests_not_all_passed",
      missing,
      expectedCount: expectedTitles.length,
      passedExpected: expectedTitles.length - missing.length,
    });
  }

  const titleCounts = new Map();
  for (const t of tests) {
    const key = t.title || "";
    titleCounts.set(key, (titleCounts.get(key) || 0) + 1);
  }
  const duplicates = [...titleCounts.entries()]
    .filter(([, n]) => n > 1)
    .map(([title, count]) => ({ title, count }));
  if (duplicates.length) {
    failures.push({ rule: "duplicate_test_titles", duplicates });
  }

  const expectedSet = new Set(expectedTitles);
  const unexpected = tests
    .map((t) => t.title)
    .filter(
      (title) =>
        title &&
        !expectedSet.has(title) &&
        !String(title).includes("BLOCKED:"),
    );
  // Allow only expected titles (+ optional BLOCKED sentinel). Any other title is unexpected.
  const unexpectedUnique = [...new Set(unexpected)];
  if (unexpectedUnique.length) {
    failures.push({ rule: "unexpected_test_titles", unexpected: unexpectedUnique });
  }

  if (counts.passed < expectedTitles.length) {
    failures.push({
      rule: "insufficient_passed_count",
      passed: counts.passed,
      required: expectedTitles.length,
    });
  }

  // All-skipped / partial: explicit
  if (counts.skipped > 0 && counts.passed === 0) {
    failures.push({ rule: "all_skipped_cannot_pass" });
  }
  if (counts.passed > 0 && counts.passed < expectedTitles.length && missing.length) {
    failures.push({
      rule: "partial_pass_insufficient",
      passed: counts.passed,
      required: expectedTitles.length,
    });
  }

  const ok = failures.length === 0;
  return {
    ok,
    status: ok ? "PASS" : "FAIL",
    reason: ok ? "structured_vitest_pass" : failures[0]?.rule || "vitest_gate_failed",
    counts,
    failures,
    pr312: {
      commit: PR312_COMMIT,
      suitePath: PR312_SUITE_PATH,
      suiteBlob: PR312_SUITE_BLOB,
      expectedTestCount: expectedTitles.length,
    },
  };
}

/**
 * Verify PR #312 suite provenance from the pinned commit Git blob (not worktree).
 */
function resolvePr312SuiteProvenance(root) {
  const { readGitBlobAtCommit } = require("./option-d-git-blob-authority");
  let contentSha256 = null;
  let pinnedContentSha256 = null;
  let matchesPinnedCommitContent = false;
  let present = false;
  let gitBlobId = null;

  try {
    const pinned = readGitBlobAtCommit(PR312_COMMIT, PR312_SUITE_PATH, { cwd: root });
    if (pinned.ok) {
      present = true;
      gitBlobId = pinned.gitBlobId;
      pinnedContentSha256 = pinned.sha256;
      contentSha256 = pinned.sha256;
      matchesPinnedCommitContent = pinned.gitBlobId === PR312_SUITE_BLOB;
    }
  } catch {
    matchesPinnedCommitContent = false;
  }

  return {
    present,
    suitePath: PR312_SUITE_PATH,
    sourceCommit: PR312_COMMIT,
    pinnedBlob: PR312_SUITE_BLOB,
    gitBlobId,
    contentSha256,
    pinnedContentSha256,
    matchesPinnedCommitContent,
    authority: "git_cat_file_blob",
  };
}

/**
 * Combined gate: process completion AND structured results must both PASS.
 * Nonzero/null exit, spawn errors, signals, timeouts, failed suites, and
 * report-level errors block PASS even if all assertion titles look passed.
 *
 * @param {{
 *   processExitCode: number|null|undefined,
 *   error?: Error|null,
 *   signal?: string|null,
 *   timedOut?: boolean,
 *   report: object|null,
 * }} run
 */
function evaluateVitestRunGate(run) {
  const failures = [];
  const processExitCode = run?.processExitCode;

  if (run?.error) {
    const detail = String(run.error.message || run.error).slice(0, 300);
    failures.push({
      rule: "vitest_spawn_error",
      detail,
    });
    if (/EINVAL/i.test(detail)) {
      failures.push({ rule: "vitest_spawn_einval", detail });
    }
  }
  if (run?.timedOut === true) {
    failures.push({ rule: "vitest_timeout" });
  }
  if (run?.signal) {
    failures.push({ rule: "vitest_signal", signal: run.signal });
  }
  if (processExitCode === null || processExitCode === undefined) {
    failures.push({ rule: "vitest_exit_status_null" });
  } else if (processExitCode !== 0) {
    failures.push({ rule: "vitest_nonzero_exit", processExitCode });
  }

  const report = run?.report;
  if (report && typeof report === "object") {
    // Report-level / suite-level failure signals
    if (report.success === false) {
      failures.push({ rule: "vitest_report_success_false" });
    }
    if (typeof report.numFailedTestSuites === "number" && report.numFailedTestSuites > 0) {
      failures.push({
        rule: "vitest_failed_suites",
        count: report.numFailedTestSuites,
      });
    }
    if (typeof report.numFailedTests === "number" && report.numFailedTests > 0) {
      failures.push({
        rule: "vitest_report_num_failed_tests",
        count: report.numFailedTests,
      });
    }
    if (Array.isArray(report.testResults)) {
      for (const tr of report.testResults) {
        if (tr.status === "failed" || tr.result === "failed") {
          failures.push({
            rule: "vitest_suite_status_failed",
            name: tr.name || tr.message || "(unnamed)",
          });
        }
        if (tr.message && /teardown|hook|uncaught|timeout/i.test(String(tr.message))) {
          failures.push({
            rule: "vitest_suite_error_message",
            detail: String(tr.message).slice(0, 200),
          });
        }
      }
    }
  }

  const structured = evaluateVitestStructuredResult(report);
  if (!structured.ok) {
    failures.push({
      rule: "vitest_structured_gate_failed",
      reason: structured.reason,
      structuredFailures: structured.failures,
    });
  }

  const ok = failures.length === 0 && structured.ok;
  return {
    ok,
    status: ok ? "PASS" : "FAIL",
    reason: ok ? "vitest_process_and_structured_pass" : failures[0]?.rule || "vitest_run_gate_failed",
    failures,
    processExitCode: processExitCode ?? null,
    structured,
  };
}

module.exports = {
  PR312_COMMIT,
  PR312_SUITE_PATH,
  PR312_SUITE_BLOB,
  PR312_JE_REUSE_RESOLVER_PATH,
  PR312_JE_REUSE_RESOLVER_BLOB,
  EXPECTED_PR312_TEST_TITLES,
  BLOCKED_SENTINEL_TITLE,
  flattenVitestJson,
  evaluateVitestStructuredResult,
  evaluateVitestRunGate,
  resolvePr312SuiteProvenance,
};
