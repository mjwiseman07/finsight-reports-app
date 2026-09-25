#!/usr/bin/env node
/**
 * Emit implementation task payload JSON (requires APPROVED_FOR_IMPLEMENTATION).
 * Usage: node scripts/orchestrator/prepare-implementation.js <plan.md>
 */

const path = require("path");
const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
  writeStatusJson,
  fail,
  emitJson,
} = require("./lib");

const APPROVED = "APPROVED_FOR_IMPLEMENTATION";
const IN_IMPL = "IN_IMPLEMENTATION";

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/prepare-implementation.js <plan.md>");
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

if (status !== APPROVED) {
  fail(`Cannot prepare implementation: STATUS is ${status}, required ${APPROVED}`);
}

const meta = parsePlanMetadata(validation.markdown);
writeStatusJson(absolute, {
  planId: meta.planId,
  planPath: absolute,
  status: IN_IMPL,
  phase: "implementation",
  startedAt: new Date().toISOString(),
});

const payload = {
  task: "implementation",
  planPath: absolute,
  planId: meta.planId,
  title: meta.title,
  branch: meta.branch,
  objective: meta.objective,
  scope: meta.scope,
  outOfScope: meta.outOfScope,
  validationPlan: meta.validationPlan,
  status: IN_IMPL,
  agentGuide: "docs/agent/IMPLEMENTATION_AGENT.md",
  constraints: [
    "Minimize scope to plan only",
    "Never weaken auth, RLS, or tenant isolation",
    "Never expose secrets or modify production data",
    "Run validation commands before marking complete",
  ],
};

emitJson(payload);
