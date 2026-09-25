#!/usr/bin/env node
/**
 * Emit implementation task payload (requires APPROVED_FOR_IMPLEMENTATION).
 * Usage: node scripts/orchestrator/prepare-implementation.js <plan.md>
 */
"use strict";

const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
  writeStatusJson,
  resolveSafeRepoPath,
  assertNoProductionAuthority,
  fail,
  emitJson,
} = require("./lib");

const APPROVED = "APPROVED_FOR_IMPLEMENTATION";
const IN_PROGRESS = "IN_PROGRESS";

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/prepare-implementation.js <plan.md>");
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

if (status !== APPROVED) {
  fail(
    `Cannot prepare implementation: STATUS is ${status || "MISSING"}, required ${APPROVED}`,
  );
}

const meta = parsePlanMetadata(validation.markdown);
try {
  writeStatusJson(
    absolute,
    {
      planId: meta.planId,
      planPath: absolute,
      status: IN_PROGRESS,
      phase: "implementation",
      startedAt: new Date().toISOString(),
    },
    { fromStatus: APPROVED },
  );
} catch (err) {
  fail(err.message);
}

const payload = {
  task: "implementation",
  planPath: absolute,
  planId: meta.planId,
  title: meta.title,
  branch: meta.branch,
  objective: meta.objective,
  scope: meta.scope,
  outOfScope: meta.outOfScope,
  acceptanceCriteria: meta.acceptanceCriteria,
  validationCommands: meta.validationCommands,
  status: IN_PROGRESS,
  agentGuide: "docs/agent/IMPLEMENTATION_AGENT.md",
  merge: false,
  deploy: false,
  constraints: [
    "Minimize scope to plan only",
    "Never weaken auth, RLS, or tenant isolation",
    "Never expose secrets or modify production data",
    "Run validation commands before marking complete",
    "Never merge or deploy",
  ],
};

try {
  assertNoProductionAuthority(payload);
} catch (err) {
  fail(err.message);
}

emitJson(payload);
