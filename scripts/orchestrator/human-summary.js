#!/usr/bin/env node
/**
 * Emit final human-approval summary from plan + status JSON.
 * Does not merge, deploy, or mark COMPLETED.
 * Usage: node scripts/orchestrator/human-summary.js <plan.md>
 */
"use strict";

const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
  readStatusJson,
  getStatusJsonPath,
  resolveSafeRepoPath,
  fail,
  emitJson,
} = require("./lib");

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/human-summary.js <plan.md>");
}

let absolute;
try {
  absolute = resolveSafeRepoPath(planPath);
} catch (err) {
  fail(err.message);
}

const validation = validatePlanStructure(absolute);
if (!validation.ok) {
  fail(`Plan structure invalid: ${validation.errors.join("; ")}`);
}

let status;
try {
  status = resolveEffectiveStatus(absolute, validation.markdown);
} catch (err) {
  fail(err.message);
}

const meta = parsePlanMetadata(validation.markdown);
let statusJson;
try {
  statusJson = readStatusJson(absolute);
} catch (err) {
  fail(err.message);
}

const builder = statusJson?.cursor_agent || null;
const reviewer = statusJson?.cursor_reviewer || null;
const review = statusJson?.review || null;
const reviewResult = review?.result || null;

const summary = {
  planId: meta.planId,
  title: meta.title,
  planPath: absolute,
  statusPath: getStatusJsonPath(absolute),
  currentStatus: statusJson?.status || status,
  objective: meta.objective,
  scope: meta.scope,
  acceptanceCriteria: meta.acceptanceCriteria,
  implementation: statusJson?.implementation || null,
  review,
  builder: builder
    ? {
        agent_id: builder.agent_id || null,
        run_id: builder.run_id || null,
        branch: builder.branch || null,
        pr_url: builder.pr_url || null,
        status: builder.run_status || builder.status || null,
      }
    : null,
  reviewer: reviewer
    ? {
        agent_id: reviewer.agent_id || null,
        run_id: reviewer.run_id || null,
        status: reviewer.run_status || reviewer.status || null,
      }
    : null,
  reviewResult: review?.verdict || reviewResult?.review_result || null,
  acceptanceCriteriaStatus: reviewResult?.acceptance_criteria || null,
  securityFindings: reviewResult?.findings || review?.result?.findings || [],
  tests: reviewResult?.test_review || null,
  knownLimitations: [],
  remainingHumanDecisions: [],
  humanActionsRequired: [],
  merge: false,
  deploy: false,
  canAutonomouslyComplete: false,
};

if (
  summary.currentStatus === "READY_FOR_HUMAN_APPROVAL" ||
  summary.currentStatus === "REVIEW_PASSED"
) {
  summary.humanActionsRequired.push(
    "Review builder PR and independent reviewer packet",
    "Verify acceptance criteria and security findings",
    "Approve merge manually (orchestrator will not merge)",
    "Deploy production only with explicit human sign-off (orchestrator will not deploy)",
  );
  summary.remainingHumanDecisions.push(
    "Merge builder PR to main?",
    "Deploy production?",
    "Close or follow up on any LOW findings?",
  );
  if (Array.isArray(summary.securityFindings) && summary.securityFindings.length) {
    summary.knownLimitations.push(
      `${summary.securityFindings.length} reviewer finding(s) recorded — inspect before merge`,
    );
  }
} else if (summary.currentStatus === "DRAFT") {
  summary.humanActionsRequired.push(
    "Complete plan sections and set STATUS: APPROVED_FOR_IMPLEMENTATION when ready",
  );
} else if (summary.currentStatus === "REVIEW_FAILED") {
  summary.humanActionsRequired.push(
    "Address reviewer findings and re-run builder/review cycle",
  );
} else if (summary.currentStatus === "BLOCKED") {
  summary.humanActionsRequired.push(
    "Resolve reviewer/system blocker before continuing",
  );
} else {
  summary.humanActionsRequired.push(
    `Plan is in ${summary.currentStatus}; see docs/agent/STATE_MACHINE.md`,
  );
}

summary.securityGates = [
  "Never merge without human approval",
  "Never deploy production without explicit sign-off",
  "Orchestrator scripts cannot set STATUS: COMPLETED",
  "Independent reviewer cannot merge or deploy",
  "Database migrations and security-sensitive changes require explicit review",
];

emitJson(summary);
