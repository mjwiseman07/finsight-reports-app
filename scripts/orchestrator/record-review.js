#!/usr/bin/env node
/**
 * Record reviewer results; STOP if verdict is not PASS when --advance is set.
 * Usage: node scripts/orchestrator/record-review.js <plan.md> --verdict PASS|FAIL [--advance] [--notes <text>]
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

const IN_REVIEW = "IN_REVIEW";
const PASS = "REVIEW_PASS";
const FAIL = "REVIEW_FAIL";
const READY = "READY_FOR_HUMAN_REVIEW";

function parseArgs(argv) {
  const planPath = argv[2];
  let verdict = null;
  let advance = false;
  let notes = "";

  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i] === "--verdict" && argv[i + 1]) {
      verdict = argv[i + 1].toUpperCase();
      i += 1;
    } else if (argv[i] === "--advance") {
      advance = true;
    } else if (argv[i] === "--notes" && argv[i + 1]) {
      notes = argv[i + 1];
      i += 1;
    }
  }

  return { planPath, verdict, advance, notes };
}

const { planPath, verdict, advance, notes } = parseArgs(process.argv);
if (!planPath || !verdict) {
  fail(
    "Usage: node scripts/orchestrator/record-review.js <plan.md> --verdict PASS|FAIL [--advance] [--notes <text>]",
  );
}

if (!["PASS", "FAIL"].includes(verdict)) {
  fail(`Invalid --verdict: ${verdict} (expected PASS or FAIL)`);
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

if (effective !== IN_REVIEW && effective !== "IMPLEMENTATION_COMPLETE") {
  fail(`Cannot record review: STATUS is ${effective}, expected ${IN_REVIEW}`);
}

const meta = parsePlanMetadata(validation.markdown);
const nextStatus = verdict === "PASS" ? PASS : FAIL;

writeStatusJson(absolute, {
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
});

if (advance && verdict !== "PASS") {
  emitJson({
    ok: false,
    planPath: absolute,
    status: nextStatus,
    message: "Advance blocked: review verdict is FAIL",
  });
  fail("Unsafe transition blocked: cannot advance with REVIEW_FAIL");
}

if (advance && verdict === "PASS") {
  writeStatusJson(absolute, {
    planId: meta.planId,
    planPath: absolute,
    status: READY,
    phase: "human_review",
    implementation: prior?.implementation || null,
    review: {
      ...(prior?.review || {}),
      completedAt: new Date().toISOString(),
      verdict,
      notes: notes || null,
      advancedToHumanReviewAt: new Date().toISOString(),
    },
  });
  ok(`Review PASS recorded; advanced to ${READY}`);
  emitJson({ ok: true, planPath: absolute, status: READY, verdict });
  process.exit(0);
}

ok(`Review recorded for ${absolute}: ${verdict}`);
emitJson({ ok: true, planPath: absolute, status: nextStatus, verdict });
