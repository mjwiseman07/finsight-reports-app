#!/usr/bin/env node
/**
 * Emit review task payload JSON (requires IMPLEMENTATION_COMPLETE).
 * Usage: node scripts/orchestrator/prepare-review.js <plan.md>
 */

const path = require("path");
const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
  readStatusJson,
  writeStatusJson,
  fail,
  emitJson,
} = require("./lib");

const COMPLETE = "IMPLEMENTATION_COMPLETE";
const IN_REVIEW = "IN_REVIEW";

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/prepare-review.js <plan.md>");
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

const prior = readStatusJson(absolute);
const effective = prior?.status || status;

if (effective !== COMPLETE) {
  fail(`Cannot prepare review: STATUS is ${effective}, required ${COMPLETE}`);
}

const meta = parsePlanMetadata(validation.markdown);
const impl = prior?.implementation || null;

writeStatusJson(absolute, {
  planId: meta.planId,
  planPath: absolute,
  status: IN_REVIEW,
  phase: "review",
  implementation: impl,
  review: {
    startedAt: new Date().toISOString(),
  },
});

const payload = {
  task: "review",
  planPath: absolute,
  planId: meta.planId,
  title: meta.title,
  objective: meta.objective,
  scope: meta.scope,
  validationPlan: meta.validationPlan,
  implementation: impl,
  status: IN_REVIEW,
  agentGuide: "docs/agent/REVIEW_AGENT.md",
  reviewCriteria: [
    "Scope matches approved plan only",
    "No auth/RLS/tenant isolation regressions",
    "No secrets or production data exposure",
    "Validation commands documented and plausible",
  ],
};

emitJson(payload);
