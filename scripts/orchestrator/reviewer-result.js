/**
 * Independent reviewer result schema validation and parsing.
 * Fail-closed. Never advances state by itself.
 */

"use strict";

const REVIEW_RESULTS = Object.freeze(["PASS", "NEEDS_CHANGES", "BLOCKED"]);
const FINDING_SEVERITIES = Object.freeze([
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
]);
const CRITERION_STATUSES = Object.freeze(["PASS", "FAIL", "UNCLEAR"]);

const RESULT_MARK_START = "===ORCHESTRATOR_REVIEW_RESULT===";
const RESULT_MARK_END = "===END_ORCHESTRATOR_REVIEW_RESULT===";

function extractReviewResultJson(text) {
  const raw = String(text || "");
  const start = raw.indexOf(RESULT_MARK_START);
  const end = raw.indexOf(RESULT_MARK_END);
  if (start === -1 || end === -1 || end <= start) {
    // Fallback: try fenced json with review_result
    const fence = raw.match(/```(?:json)?\s*(\{[\s\S]*?"review_result"[\s\S]*?\})\s*```/i);
    if (fence) {
      try {
        return JSON.parse(fence[1]);
      } catch {
        throw new Error("Malformed reviewer JSON in fenced block");
      }
    }
    throw new Error("Reviewer result markers not found in agent output");
  }
  const slice = raw.slice(start + RESULT_MARK_START.length, end).trim();
  try {
    return JSON.parse(slice);
  } catch {
    throw new Error("Malformed reviewer JSON between result markers");
  }
}

function assertReviewResultValid(result, {
  expectedPlanId,
  expectedPrUrl,
  expectedCommitSha = null,
  builderAgentId = null,
  reviewerAgentId = null,
} = {}) {
  if (result == null || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("Reviewer result must be a JSON object");
  }

  const planId = result.plan_id || result.planId;
  if (!planId) {
    throw new Error("Reviewer result missing plan_id");
  }
  if (expectedPlanId && planId !== expectedPlanId) {
    throw new Error(
      `Reviewer plan_id mismatch: ${planId} != ${expectedPlanId}`,
    );
  }

  const reviewResult = String(result.review_result || "").toUpperCase();
  if (!REVIEW_RESULTS.includes(reviewResult)) {
    throw new Error(
      `Unknown review_result: ${result.review_result} (expected PASS|NEEDS_CHANGES|BLOCKED)`,
    );
  }

  const reviewedPr = result.reviewed_pr || result.reviewedPr;
  if (!reviewedPr) {
    throw new Error("Reviewer result missing reviewed_pr");
  }
  if (expectedPrUrl && normalizePrUrl(reviewedPr) !== normalizePrUrl(expectedPrUrl)) {
    throw new Error(
      `Reviewer reviewed_pr mismatch: ${reviewedPr} != ${expectedPrUrl}`,
    );
  }

  const reviewedCommit = result.reviewed_commit || result.reviewedCommit || null;
  if (expectedCommitSha) {
    if (!reviewedCommit) {
      throw new Error("Reviewer result missing reviewed_commit");
    }
    if (
      String(reviewedCommit).toLowerCase() !==
      String(expectedCommitSha).toLowerCase()
    ) {
      throw new Error(
        `Reviewer reviewed_commit mismatch: ${reviewedCommit} != ${expectedCommitSha}`,
      );
    }
  }

  if (!result.summary || String(result.summary).trim().length < 8) {
    throw new Error("Reviewer result missing summary");
  }

  for (const section of [
    "acceptance_criteria",
    "scope_compliance",
    "security_review",
    "test_review",
    "prohibited_changes_review",
  ]) {
    if (result[section] == null) {
      throw new Error(`Reviewer result missing ${section}`);
    }
  }

  if (!Array.isArray(result.acceptance_criteria)) {
    throw new Error("acceptance_criteria must be an array");
  }
  for (const item of result.acceptance_criteria) {
    if (!item || typeof item !== "object") {
      throw new Error("Malformed acceptance_criteria entry");
    }
    const st = String(item.status || "").toUpperCase();
    if (!CRITERION_STATUSES.includes(st)) {
      throw new Error(`Invalid acceptance criterion status: ${item.status}`);
    }
  }

  if (!Array.isArray(result.findings)) {
    throw new Error("findings must be an array");
  }

  if (reviewResult === "NEEDS_CHANGES" && result.findings.length === 0) {
    throw new Error("NEEDS_CHANGES requires a non-empty findings array");
  }

  for (const finding of result.findings) {
    if (!finding || typeof finding !== "object") {
      throw new Error("Malformed finding entry");
    }
    const sev = String(finding.severity || "").toUpperCase();
    if (!FINDING_SEVERITIES.includes(sev)) {
      throw new Error(`Invalid finding severity: ${finding.severity}`);
    }
    if (!finding.explanation || String(finding.explanation).trim().length < 3) {
      throw new Error("Finding missing explanation");
    }
    if (
      reviewResult === "NEEDS_CHANGES" &&
      (!finding.remediation || String(finding.remediation).trim().length < 3)
    ) {
      throw new Error("NEEDS_CHANGES findings require remediation");
    }
  }

  if (
    builderAgentId &&
    reviewerAgentId &&
    String(builderAgentId) === String(reviewerAgentId)
  ) {
    throw new Error("Builder and reviewer agent IDs must differ");
  }

  if (result.merge === true || result.deploy === true) {
    throw new Error("Reviewer result must not grant merge or deploy authority");
  }

  if (
    result.status === "COMPLETED" ||
    result.review_result === "COMPLETED" ||
    result.set_status === "COMPLETED"
  ) {
    throw new Error("Reviewer result must not set COMPLETED");
  }

  return {
    plan_id: planId,
    review_result: reviewResult,
    summary: String(result.summary).trim(),
    acceptance_criteria: result.acceptance_criteria,
    scope_compliance: result.scope_compliance,
    security_review: result.security_review,
    test_review: result.test_review,
    prohibited_changes_review: result.prohibited_changes_review,
    findings: result.findings,
    reviewed_pr: reviewedPr,
    reviewed_commit: reviewedCommit,
    reviewed_at: result.reviewed_at || result.reviewedAt || null,
    merge: false,
    deploy: false,
  };
}

function normalizePrUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/$/, "")
    .toLowerCase();
}

function parseGithubPrNumber(prUrl) {
  const m = String(prUrl || "").match(/\/pull\/(\d+)/i);
  return m ? Number(m[1]) : null;
}

module.exports = {
  REVIEW_RESULTS,
  FINDING_SEVERITIES,
  RESULT_MARK_START,
  RESULT_MARK_END,
  extractReviewResultJson,
  assertReviewResultValid,
  normalizePrUrl,
  parseGithubPrNumber,
};
