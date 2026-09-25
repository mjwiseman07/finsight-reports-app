#!/usr/bin/env node
/**
 * Record independent review results.
 * Usage:
 *   node scripts/orchestrator/record-review.js <plan.md> --verdict PASS|NEEDS_CHANGES|BLOCKED [--advance] [--notes <text>] [--plan-id <ID>]
 */
"use strict";

const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
  readStatusJson,
  writeStatusJson,
  resolveSafeRepoPath,
  REVIEW_VERDICTS,
  fail,
  ok,
  emitJson,
} = require("./lib");

const COMPLETE = "IMPLEMENTATION_COMPLETE";
const PASSED = "REVIEW_PASSED";
const FAILED = "REVIEW_FAILED";
const READY = "READY_FOR_HUMAN_APPROVAL";

function parseArgs(argv) {
  const planPath = argv[2];
  let verdict = null;
  let advance = false;
  let notes = "";
  let planIdArg = null;

  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === "--verdict" && argv[i + 1]) {
      verdict = String(argv[i + 1]).toUpperCase();
      i += 1;
    } else if (argv[i] === "--advance") {
      advance = true;
    } else if (argv[i] === "--notes" && argv[i + 1]) {
      notes = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--plan-id" && argv[i + 1]) {
      planIdArg = argv[i + 1];
      i += 1;
    } else if (argv[i].startsWith("-")) {
      fail(`Unexpected argument: ${argv[i]}`);
    }
  }

  return { planPath, verdict, advance, notes, planIdArg };
}

const { planPath, verdict, advance, notes, planIdArg } = parseArgs(process.argv);
if (!planPath || !verdict) {
  fail(
    "Usage: node scripts/orchestrator/record-review.js <plan.md> --verdict PASS|NEEDS_CHANGES|BLOCKED [--advance] [--notes <text>] [--plan-id <ID>]",
  );
}

if (!REVIEW_VERDICTS.includes(verdict)) {
  fail(
    `Invalid --verdict: ${verdict} (expected PASS|NEEDS_CHANGES|BLOCKED)`,
  );
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
const meta = parsePlanMetadata(validation.markdown);

if (planIdArg && planIdArg !== meta.planId) {
  fail(`PLAN_ID mismatch: --plan-id ${planIdArg} != plan ${meta.planId}`);
}

if (effective !== COMPLETE && effective !== PASSED && effective !== FAILED) {
  fail(
    `Cannot record review: STATUS is ${effective}, expected ${COMPLETE}`,
  );
}

if (effective !== COMPLETE && verdict) {
  // Allow re-recording only from IMPLEMENTATION_COMPLETE for a clean review cycle
  if (effective === PASSED || effective === FAILED) {
    fail(
      `Cannot re-record review from ${effective}; return to IMPLEMENTATION_COMPLETE first`,
    );
  }
}

const nextStatus = verdict === "PASS" ? PASSED : FAILED;

try {
  writeStatusJson(
    absolute,
    {
      planId: meta.planId,
      planPath: absolute,
      status: nextStatus,
      phase: "review",
      implementation: prior?.implementation || null,
      review: {
        ...(prior?.review || {}),
        completedAt: new Date().toISOString(),
        verdict,
        notes: notes || null,
      },
    },
    { fromStatus: COMPLETE },
  );
} catch (err) {
  fail(err.message);
}

if (advance) {
  if (verdict !== "PASS") {
    emitJson({
      ok: false,
      planPath: absolute,
      status: nextStatus,
      verdict,
      message: `Advance blocked: review verdict is ${verdict}`,
    });
    fail(
      `Unsafe transition blocked: cannot advance to ${READY} with verdict ${verdict}`,
    );
  }

  try {
    writeStatusJson(
      absolute,
      {
        planId: meta.planId,
        planPath: absolute,
        status: READY,
        phase: "human_approval",
        implementation: prior?.implementation || null,
        review: {
          ...(prior?.review || {}),
          completedAt: new Date().toISOString(),
          verdict: "PASS",
          notes: notes || null,
          advancedToHumanApprovalAt: new Date().toISOString(),
        },
        merge: false,
        deploy: false,
      },
      { fromStatus: PASSED },
    );
  } catch (err) {
    fail(err.message);
  }

  ok(`Review PASS recorded; advanced to ${READY}`);
  emitJson({ ok: true, planPath: absolute, status: READY, verdict: "PASS" });
  process.exit(0);
}

ok(`Review recorded for ${absolute}: ${verdict}`);
emitJson({ ok: true, planPath: absolute, status: nextStatus, verdict });
