#!/usr/bin/env node
/**
 * Record implementation results to companion status JSON.
 * Usage: node scripts/orchestrator/record-implementation.js <plan.md> [--results <json|string>]
 */

const path = require("path");
const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
  readStatusJson,
  writeStatusJson,
  fail,
  ok,
  emitJson,
} = require("./lib");

const IN_IMPL = "IN_IMPLEMENTATION";
const COMPLETE = "IMPLEMENTATION_COMPLETE";

function parseArgs(argv) {
  const planPath = argv[2];
  let results = null;

  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === "--results" && argv[i + 1]) {
      const raw = argv[i + 1];
      try {
        results = JSON.parse(raw);
      } catch {
        results = { summary: raw };
      }
      i += 1;
    }
  }

  return { planPath, results };
}

const { planPath, results } = parseArgs(process.argv);
if (!planPath) {
  fail(
    "Usage: node scripts/orchestrator/record-implementation.js <plan.md> [--results <json>]",
  );
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

if (effective !== IN_IMPL && effective !== "APPROVED_FOR_IMPLEMENTATION") {
  fail(
    `Cannot record implementation: STATUS is ${effective}, expected ${IN_IMPL}`,
  );
}

const meta = parsePlanMetadata(validation.markdown);
const statusPath = writeStatusJson(absolute, {
  planId: meta.planId,
  planPath: absolute,
  status: COMPLETE,
  phase: "implementation",
  implementation: {
    completedAt: new Date().toISOString(),
    results: results || { summary: "Implementation recorded (no details supplied)" },
  },
});

ok(`Implementation recorded for ${absolute}`);
emitJson({
  ok: true,
  planPath: absolute,
  statusPath,
  status: COMPLETE,
});
