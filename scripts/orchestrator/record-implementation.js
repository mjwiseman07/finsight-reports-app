#!/usr/bin/env node
/**
 * Record implementation results to companion status JSON.
 * Usage: node scripts/orchestrator/record-implementation.js <plan.md> --results '<json>'
 */
"use strict";

const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
  readStatusJson,
  writeStatusJson,
  resolveSafeRepoPath,
  assertImplementationResultValid,
  assertNoProductionAuthority,
  fail,
  ok,
  emitJson,
} = require("./lib");

const IN_PROGRESS = "IN_PROGRESS";
const COMPLETE = "IMPLEMENTATION_COMPLETE";

function parseArgs(argv) {
  const planPath = argv[2];
  let results = null;
  let hasResultsFlag = false;

  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === "--results" && argv[i + 1]) {
      hasResultsFlag = true;
      const raw = argv[i + 1];
      try {
        results = JSON.parse(raw);
      } catch {
        fail("Malformed --results JSON");
      }
      i += 1;
    } else if (argv[i].startsWith("-")) {
      fail(`Unexpected argument: ${argv[i]}`);
    }
  }

  return { planPath, results, hasResultsFlag };
}

const { planPath, results, hasResultsFlag } = parseArgs(process.argv);
if (!planPath) {
  fail(
    "Usage: node scripts/orchestrator/record-implementation.js <plan.md> --results '<json>'",
  );
}
if (!hasResultsFlag || results == null) {
  fail("Missing required --results JSON object");
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

const prior = (() => {
  try {
    return readStatusJson(absolute);
  } catch (err) {
    fail(err.message);
    return null;
  }
})();

const effective = prior?.status || status;

if (effective !== IN_PROGRESS && effective !== "APPROVED_FOR_IMPLEMENTATION") {
  fail(
    `Cannot record implementation: STATUS is ${effective}, expected ${IN_PROGRESS} (after prepare-implementation)`,
  );
}

// Must have been prepared (IN_PROGRESS) — recording directly from APPROVED skips prepare
if (effective === "APPROVED_FOR_IMPLEMENTATION") {
  fail(
    "Cannot record implementation: call prepare-implementation.js first (STATUS must be IN_PROGRESS)",
  );
}

const meta = parsePlanMetadata(validation.markdown);
try {
  assertImplementationResultValid(results, meta.planId);
  assertNoProductionAuthority(results);
} catch (err) {
  fail(err.message);
}

let statusPath;
try {
  statusPath = writeStatusJson(
    absolute,
    {
      planId: meta.planId,
      planPath: absolute,
      status: COMPLETE,
      phase: "implementation",
      implementation: {
        completedAt: new Date().toISOString(),
        results,
      },
    },
    { fromStatus: IN_PROGRESS },
  );
} catch (err) {
  fail(err.message);
}

ok(`Implementation recorded for ${absolute}`);
emitJson({
  ok: true,
  planPath: absolute,
  statusPath,
  status: COMPLETE,
});
