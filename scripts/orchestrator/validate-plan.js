#!/usr/bin/env node
/**
 * Validate plan document structure and required sections.
 * Usage: node scripts/orchestrator/validate-plan.js <plan.md>
 */
"use strict";

const {
  validatePlanStructure,
  resolveSafeRepoPath,
  fail,
  ok,
  emitJson,
} = require("./lib");

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/validate-plan.js <plan.md>");
}

let absolute;
try {
  absolute = resolveSafeRepoPath(planPath);
} catch (err) {
  fail(err.message);
}

const result = validatePlanStructure(absolute);

if (!result.ok) {
  emitJson({ ok: false, planPath: absolute, errors: result.errors });
  fail(`Plan validation failed (${result.errors.length} issue(s))`);
}

ok(`Plan valid: ${absolute} (STATUS: ${result.status})`);
emitJson({
  ok: true,
  planPath: absolute,
  status: result.status,
  planId: result.planId,
  sections: result.headers,
});
