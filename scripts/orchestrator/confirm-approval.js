#!/usr/bin/env node
/**
 * STOP unless plan STATUS is APPROVED_FOR_IMPLEMENTATION.
 * Usage: node scripts/orchestrator/confirm-approval.js <plan.md>
 */
"use strict";

const {
  validatePlanStructure,
  resolveEffectiveStatus,
  resolveSafeRepoPath,
  fail,
  ok,
  emitJson,
} = require("./lib");

const APPROVED = "APPROVED_FOR_IMPLEMENTATION";

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/confirm-approval.js <plan.md>");
}

let absolute;
try {
  absolute = resolveSafeRepoPath(planPath);
} catch (err) {
  fail(err.message);
}

const validation = validatePlanStructure(absolute);
if (!validation.ok) {
  emitJson({ ok: false, planPath: absolute, errors: validation.errors });
  fail("Plan structure invalid; fix before checking approval");
}

let status;
try {
  status = resolveEffectiveStatus(absolute, validation.markdown);
} catch (err) {
  fail(err.message);
}

if (status !== APPROVED) {
  emitJson({
    ok: false,
    planPath: absolute,
    status,
    requiredStatus: APPROVED,
    message: "Implementation blocked: human approval required.",
  });
  fail(
    `Unsafe transition blocked: STATUS is ${status || "MISSING"}, required ${APPROVED}`,
  );
}

ok(`Approval confirmed for ${absolute}`);
emitJson({ ok: true, planPath: absolute, status });
