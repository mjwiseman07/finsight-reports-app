#!/usr/bin/env node
/**
 * Emit review task payload (requires IMPLEMENTATION_COMPLETE).
 * Usage: node scripts/orchestrator/prepare-review.js <plan.md>
 */
"use strict";

const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
  readStatusJson,
  resolveSafeRepoPath,
  fail,
  emitJson,
} = require("./lib");

const COMPLETE = "IMPLEMENTATION_COMPLETE";

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/prepare-review.js <plan.md>");
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

let prior;
try {
  prior = readStatusJson(absolute);
} catch (err) {
  fail(err.message);
}

const effective = prior?.status || status;

if (effective !== COMPLETE) {
  fail(`Cannot prepare review: STATUS is ${effective}, required ${COMPLETE}`);
}

const meta = parsePlanMetadata(validation.markdown);
const impl = prior?.implementation || null;

// Stay on IMPLEMENTATION_COMPLETE until review records a verdict.
// Prepare-review does not advance status; it only emits the payload.
emitJson({
  task: "review",
  planPath: absolute,
  planId: meta.planId,
  title: meta.title,
  objective: meta.objective,
  scope: meta.scope,
  acceptanceCriteria: meta.acceptanceCriteria,
  validationCommands: meta.validationCommands,
  implementation: impl,
  status: COMPLETE,
  agentGuide: "docs/agent/REVIEW_AGENT.md",
  merge: false,
  deploy: false,
  reviewCriteria: [
    "Scope matches approved plan only",
    "Acceptance criteria fulfilled",
    "No auth/RLS/tenant isolation regressions",
    "No secrets or production data exposure",
    "Validation evidence present",
  ],
});
