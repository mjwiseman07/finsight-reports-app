/**
 * Emit morning report for a plan.
 * Usage: node scripts/orchestrator/morning-report-cli.js <plan.md>
 */

"use strict";

const {
  validatePlanStructure,
  readStatusJson,
  resolveSafeRepoPath,
  assertPlanInPlansDirectory,
  fail,
  ok,
  emitJson,
} = require("./lib");
const config = require("./config");
const { buildMorningReport } = require("./morning-report");

const planPath = process.argv[2];
if (!planPath) {
  fail("Usage: node scripts/orchestrator/morning-report-cli.js <plan.md>");
}

const absolute = resolveSafeRepoPath(planPath, { mustExist: true });
assertPlanInPlansDirectory(absolute, config.PLANS_DIR);
const validation = validatePlanStructure(absolute);
if (!validation.ok) {
  fail(`Plan structure invalid: ${validation.errors.join("; ")}`);
}
const companion = readStatusJson(absolute);
const report = buildMorningReport({
  planId: validation.planId,
  companion,
});
ok("Morning report generated");
process.stdout.write(`${report.text}\n\n`);
emitJson(report);
