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
  review: statusJson?.review || null,
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
    "Review implementation against approved plan and acceptance criteria",
    "Verify validation evidence (lint, type-check, tests, build as applicable)",
    "Approve merge manually (orchestrator will not merge)",
    "Deploy production only with explicit human sign-off (orchestrator will not deploy)",
  );
} else if (summary.currentStatus === "DRAFT") {
  summary.humanActionsRequired.push(
    "Complete plan sections and set STATUS: APPROVED_FOR_IMPLEMENTATION when ready",
  );
} else if (summary.currentStatus === "REVIEW_FAILED") {
  summary.humanActionsRequired.push(
    "Address review findings and re-run implementation/review cycle",
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
  "Database migrations and security-sensitive changes require explicit review",
];

emitJson(summary);
