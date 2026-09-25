#!/usr/bin/env node
/**
 * Emit final human-review summary from plan + status JSON.
 * Usage: node scripts/orchestrator/human-summary.js <plan.md>
 */

const path = require("path");
const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
  readStatusJson,
  getStatusJsonPath,
  fail,
  emitJson,
} = require("./lib");

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/human-summary.js <plan.md>");
}

const absolute = path.resolve(planPath);
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
const statusJson = readStatusJson(absolute);

const summary = {
  planId: meta.planId,
  title: meta.title,
  planPath: absolute,
  statusPath: getStatusJsonPath(absolute),
  currentStatus: statusJson?.status || status,
  objective: meta.objective,
  scope: meta.scope,
  implementation: statusJson?.implementation || null,
  review: statusJson?.review || null,
  humanActionsRequired: [],
};

if (
  summary.currentStatus === "READY_FOR_HUMAN_REVIEW" ||
  summary.currentStatus === "REVIEW_PASS"
) {
  summary.humanActionsRequired.push(
    "Review implementation against approved plan scope",
    "Verify validation evidence (lint, type-check, tests, build as applicable)",
    "Approve merge or request changes (update plan STATUS manually)",
  );
} else if (summary.currentStatus === "DRAFT") {
  summary.humanActionsRequired.push(
    "Complete plan sections and set STATUS: APPROVED_FOR_IMPLEMENTATION when ready",
  );
} else if (summary.currentStatus === "REVIEW_FAIL") {
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
  "Database migrations and security-sensitive changes require explicit review",
];

emitJson(summary);
