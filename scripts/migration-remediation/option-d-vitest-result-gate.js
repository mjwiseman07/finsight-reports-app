#!/usr/bin/env node
/**
 * Structured Vitest result gate for PR #312 postgres suite.
 * Process exit code alone is insufficient — require executed/passed counts
 * with zero skipped/todo/pending/failed.
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PR312_COMMIT = "f65730b3d38e9cb3b192e54f62c798c74a07a1c2";
const PR312_SUITE_PATH =
  "lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts";
const PR312_SUITE_BLOB = "6dfc99e23b8206d3d70b19c8a7d4758d22e0f770";

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
 * Verify on-disk suite matches pinned PR #312 commit content when present.
 */
function resolvePr312SuiteProvenance(root) {
  const suitePath = path.join(root, PR312_SUITE_PATH);
  const present = fs.existsSync(suitePath);
  let contentSha256 = null;
  let pinnedContentSha256 = null;
  let matchesPinnedCommitContent = false;

  if (present) {
    contentSha256 = sha256Text(fs.readFileSync(suitePath, "utf8"));
    try {
      const pinnedContent = execFileSync(
        "git",
        ["show", `${PR312_COMMIT}:${PR312_SUITE_PATH}`],
        { cwd: root, encoding: "utf8", maxBuffer: 5_000_000 },
      );
      pinnedContentSha256 = sha256Text(pinnedContent);
      matchesPinnedCommitContent = pinnedContentSha256 === contentSha256;
    } catch {
      matchesPinnedCommitContent = false;
    }
  }

  return {
    present,
    suitePath: PR312_SUITE_PATH,
    sourceCommit: PR312_COMMIT,
    pinnedBlob: PR312_SUITE_BLOB,
    contentSha256,
    pinnedContentSha256,
    matchesPinnedCommitContent,
  };
}

module.exports = {
  PR312_COMMIT,
  PR312_SUITE_PATH,
  PR312_SUITE_BLOB,
  EXPECTED_PR312_TEST_TITLES,
  BLOCKED_SENTINEL_TITLE,
  flattenVitestJson,
  evaluateVitestStructuredResult,
  resolvePr312SuiteProvenance,
};
