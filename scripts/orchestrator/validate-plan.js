#!/usr/bin/env node
/**
 * Validate plan document structure and required sections.
 * Usage: node scripts/orchestrator/validate-plan.js <plan.md>
 */

const path = require("path");
const { validatePlanStructure, fail, ok, emitJson } = require("./lib");

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/validate-plan.js <plan.md>");
}

const absolute = path.resolve(planPath);
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
  sections: result.headers,
});
