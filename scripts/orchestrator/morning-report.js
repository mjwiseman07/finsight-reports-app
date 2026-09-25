/**
 * Concise overnight / morning report builder.
 */

"use strict";

const { getRemediationCycle } = require("./lib");
const { formatHumanDecisionText } = require("./human-decision");

function buildMorningReport({ planId, companion, events = [] } = {}) {
  const c = companion || {};
  const status = c.status || "UNKNOWN";
  const cycle = getRemediationCycle(c);
  const review = c.review || c.previous_review || {};
  const tests = review?.result?.test_review || c.implementation?.results || {};

  const lines = [
    `ADVISACOR OVERNIGHT RUN`,
    `PLAN: ${planId || c.planId || "(unknown)"}`,
    `STATE: ${status}`,
    `Builder runs: ${c.remediation?.builder_attempts || (c.cursor_agent ? 1 : 0)}`,
    `Reviewer runs: ${c.remediation?.reviewer_attempts || (c.cursor_reviewer || c.previous_cursor_reviewer ? 1 : 0)}`,
    `Resolver runs: ${c.remediation?.resolver_attempts || (c.cursor_resolver ? 1 : 0)}`,
    `Technical blockers resolved: ${Math.max(0, cycle - (status === "HUMAN_DECISION_REQUIRED" ? 0 : 0))}`,
    `Remediation cycles: ${cycle}`,
    `Human intervention required: ${status === "HUMAN_DECISION_REQUIRED" ? "YES" : "NO"}`,
    `Tests: ${tests.status || tests.tests || "n/a"}`,
    `Lint: ${tests.lint || "n/a"}`,
    `Typecheck: ${tests.typecheck || "n/a"}`,
    `Build: ${tests.build || "n/a"}`,
    `Security review: ${review?.result?.security_review?.status || review?.verdict || "n/a"}`,
    `PR: ${c.cursor_agent?.pr_url || "n/a"}`,
    `Head SHA: ${c.builder_head_sha || "n/a"}`,
  ];

  if (status === "READY_FOR_HUMAN_APPROVAL") {
    lines.push(`Remaining action:`);
    lines.push(`Human review + merge`);
  } else if (status === "HUMAN_DECISION_REQUIRED") {
    lines.push(`Automation completed everything possible.`);
    lines.push(`One decision remains:`);
    lines.push(
      formatHumanDecisionText(c.human_decision).split("\n").slice(0, 12).join("\n"),
    );
  } else {
    lines.push(`Remaining action: inspect status ${status}`);
  }

  if (events.length) {
    lines.push(`Controller events: ${events.length}`);
  }

  return {
    text: lines.join("\n"),
    planId: planId || c.planId,
    status,
    human_intervention_required: status === "HUMAN_DECISION_REQUIRED",
  };
}

module.exports = {
  buildMorningReport,
};
