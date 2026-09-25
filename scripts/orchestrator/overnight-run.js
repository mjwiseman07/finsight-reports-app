/**
 * Overnight / autonomous lifecycle controller and resume.
 *
 * Usage:
 *   node scripts/orchestrator/overnight-run.js <plan.md> [--dry-run] [--max-cycles=N]
 *   node scripts/orchestrator/overnight-resume.js <plan.md> [--dry-run]
 *
 * Stops at: READY_FOR_HUMAN_APPROVAL | HUMAN_DECISION_REQUIRED | max cycles | fatal
 * Never merges. Never deploys. Never sets COMPLETED.
 * Mockable via injected deps for tests.
 */

"use strict";

const config = require("./config");
const {
  validatePlanStructure,
  resolveEffectiveStatus,
  readStatusJson,
  writeStatusJson,
  resolveSafeRepoPath,
  assertPlanInPlansDirectory,
  toRepoRelative,
  getRemediationCycle,
  fail,
  ok,
  emitJson,
} = require("./lib");
const { launchBuilder } = require("./launch-builder");
const { statusBuilder } = require("./status-builder");
const { launchReviewer } = require("./launch-reviewer");
const { statusReviewer } = require("./status-reviewer");
const { launchResolver } = require("./launch-resolver");
const { statusResolver } = require("./status-resolver");
const { launchRemediation } = require("./launch-remediation");
const { statusRemediation } = require("./status-remediation");
const {
  buildHumanDecisionPacket,
  writeHumanDecisionPacket,
  formatHumanDecisionText,
} = require("./human-decision");
const { buildMorningReport } = require("./morning-report");
const { withBoundedRetry, isTransientError } = require("./retry");
const { appendAuditEventInMemory } = require("./audit-trail");
const { loadEnvLocal } = require("./load-env-local");
const {
  assertWorkspaceSafeForOvernight,
  InfrastructureBlockError,
} = require("./worktree-guard");

const TERMINAL_STATES = new Set([
  "READY_FOR_HUMAN_APPROVAL",
  "HUMAN_DECISION_REQUIRED",
  "COMPLETED",
]);

function parseArgs(argv) {
  const args = argv.slice(2);
  let planPath = null;
  let dryRun = false;
  let maxCycles = config.MAX_REMEDIATION_CYCLES;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--dry-run") dryRun = true;
    else if (args[i].startsWith("--max-cycles=")) {
      maxCycles = Number(args[i].slice("--max-cycles=".length));
    } else if (args[i] === "--max-cycles") {
      maxCycles = Number(args[++i]);
    } else if (args[i].startsWith("-")) {
      fail(`Unexpected argument: ${args[i]}`);
    } else if (!planPath) planPath = args[i];
    else fail(`Unexpected argument: ${args[i]}`);
  }
  return { planPath, dryRun, maxCycles };
}

function defaultSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function countAttempts(companion) {
  return {
    builder_runs: companion?.remediation?.builder_attempts
      ? Number(companion.remediation.builder_attempts)
      : companion?.cursor_agent?.agent_id
        ? 1
        : 0,
    reviewer_runs: Number(companion?.remediation?.reviewer_attempts || 0) +
      (companion?.cursor_reviewer?.agent_id || companion?.previous_cursor_reviewer ? 1 : 0),
    resolver_runs: Number(companion?.remediation?.resolver_attempts || 0) +
      (companion?.cursor_resolver?.agent_id ? 1 : 0),
    remediation_cycles: getRemediationCycle(companion),
  };
}

async function pollUntil(label, pollFn, {
  sleepImpl = defaultSleep,
  pollIntervalMs = config.CONTROLLER_POLL_INTERVAL_MS,
  maxPollMs = config.CONTROLLER_MAX_POLL_MS,
  isDone,
} = {}) {
  const started = Date.now();
  let last;
  while (Date.now() - started < maxPollMs) {
    last = await pollFn();
    if (isDone(last)) return last;
    await sleepImpl(pollIntervalMs);
  }
  throw new Error(`${label} polling timed out after ${maxPollMs}ms`);
}

function bumpCounter(companion, key) {
  const rem = { ...(companion.remediation || {}) };
  rem[key] = Number(rem[key] || 0) + 1;
  companion.remediation = rem;
  return companion;
}

async function enforceMaxCycles(absolute, companion, maxCycles, nowIso) {
  const cycle = getRemediationCycle(companion);
  if (cycle < maxCycles) return null;
  const fromStatus = companion.status;
  const packet = buildHumanDecisionPacket({
    planId: companion.planId,
    state: "HUMAN_DECISION_REQUIRED",
    question:
      "Remediation cycle budget exhausted — abort, raise max cycles, or provide guidance?",
    why: `Automation reached MAX_REMEDIATION_CYCLES=${maxCycles} without PASS.`,
    options: [
      {
        id: "A",
        label: "Abort",
        behavior: "Leave plan at HUMAN_DECISION_REQUIRED",
        impact: "No further autonomous changes",
      },
      {
        id: "B",
        label: "Raise budget and resume",
        behavior: "Human raises ORCHESTRATOR_MAX_REMEDIATION_CYCLES then resume",
        impact: "Continues autonomous loop",
      },
    ],
    recommended: "Review audit trail and reviewer findings before raising budget",
    completed: [
      `Remediation cycles attempted: ${cycle}`,
      `Last review: ${companion.review?.verdict || companion.previous_review?.verdict || "n/a"}`,
    ],
    waiting: ["Human decision on cycle budget / next action"],
  });
  writeHumanDecisionPacket(absolute, packet);
  companion.status = "HUMAN_DECISION_REQUIRED";
  companion.human_decision = packet;
  companion.merge = false;
  companion.deploy = false;
  appendAuditEventInMemory(companion, {
    timestamp: nowIso,
    fromStatus,
    toStatus: "HUMAN_DECISION_REQUIRED",
    actor: "controller",
    result: "MAX_CYCLES",
    reason: `Exceeded max remediation cycles (${maxCycles})`,
  });
  writeStatusJson(absolute, companion, {
    fromStatus,
    syncMarkdown: true,
  });
  return packet;
}

/**
 * Core overnight loop. Injectable deps for mocked tests.
 */
async function runOvernight(planPathInput, options = {}) {
  const {
    dryRun = false,
    maxCycles = config.MAX_REMEDIATION_CYCLES,
    fetchImpl,
    githubFetchImpl,
    env = process.env,
    now = () => new Date().toISOString(),
    sleepImpl = defaultSleep,
    pollIntervalMs = config.CONTROLLER_POLL_INTERVAL_MS,
    maxPollMs = config.CONTROLLER_MAX_POLL_MS,
    // Injectable step functions (tests)
    deps = {},
  } = options;

  const launchBuilderFn = deps.launchBuilder || launchBuilder;
  const statusBuilderFn = deps.statusBuilder || statusBuilder;
  const launchReviewerFn = deps.launchReviewer || launchReviewer;
  const statusReviewerFn = deps.statusReviewer || statusReviewer;
  const launchResolverFn = deps.launchResolver || launchResolver;
  const statusResolverFn = deps.statusResolver || statusResolver;
  const launchRemediationFn = deps.launchRemediation || launchRemediation;
  const statusRemediationFn = deps.statusRemediation || statusRemediation;

  if (!planPathInput) {
    throw new Error("Usage: overnight-run <plan.md>");
  }

  const absolute = resolveSafeRepoPath(planPathInput, { mustExist: true });
  assertPlanInPlansDirectory(absolute, config.PLANS_DIR);
  const planPathRelative = toRepoRelative(absolute);

  const validation = validatePlanStructure(absolute);
  if (!validation.ok) {
    throw new Error(`Plan structure invalid: ${validation.errors.join("; ")}`);
  }

  let status = resolveEffectiveStatus(absolute, validation.markdown);
  let companion = readStatusJson(absolute) || {
    planId: validation.planId,
    planPath: absolute,
    status,
  };

  const events = [];
  const record = (msg) => {
    events.push({ at: now(), message: msg });
  };

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      planId: validation.planId,
      planPath: planPathRelative,
      status,
      message: "Overnight dry-run: controller would drive lifecycle; no network.",
      nextAction: inferNextAction(status, companion),
    };
  }

  const shared = { fetchImpl, githubFetchImpl, env, now };

  // Resume-safe: jump to next action based on state
  // eslint-disable-next-line no-constant-condition
  while (true) {
    companion = readStatusJson(absolute) || companion;
    status = resolveEffectiveStatus(
      absolute,
      validatePlanStructure(absolute).markdown,
    );

    if (TERMINAL_STATES.has(status)) {
      break;
    }

    const maxPacket = await enforceMaxCyclesCheck(
      absolute,
      companion,
      maxCycles,
      now(),
    );
    if (maxPacket) {
      status = "HUMAN_DECISION_REQUIRED";
      break;
    }

    if (status === "APPROVED_FOR_IMPLEMENTATION") {
      if (!companion.cursor_agent?.agent_id) {
        record("launch builder");
        await withBoundedRetry(() => launchBuilderFn(planPathRelative, shared), {
          maxAttempts: config.MAX_TRANSIENT_RETRIES,
          baseDelayMs: config.TRANSIENT_RETRY_BASE_MS,
          sleepImpl,
        });
      }
      record("poll builder");
      await pollUntil("builder", () => statusBuilderFn(planPathRelative, shared), {
        sleepImpl,
        pollIntervalMs,
        maxPollMs,
        isDone: (r) =>
          r.status === "IMPLEMENTATION_COMPLETE" ||
          r.failure === true ||
          ["ERROR", "CANCELLED", "EXPIRED"].includes(
            String(r.cursor_agent?.run_status || "").toUpperCase(),
          ),
      });
      companion = readStatusJson(absolute);
      if (companion.status !== "IMPLEMENTATION_COMPLETE") {
        // technical failure → analyze
        if (companion.status === "IN_PROGRESS") {
          companion.status = "ANALYZING_BLOCKER";
          writeStatusJson(absolute, companion, {
            fromStatus: "IN_PROGRESS",
            syncMarkdown: true,
          });
        }
      }
      continue;
    }

    if (status === "IN_PROGRESS") {
      if (!companion.cursor_agent?.agent_id) {
        throw new Error("IN_PROGRESS without cursor_agent — cannot resume safely");
      }
      record("poll builder (resume)");
      await pollUntil("builder", () => statusBuilderFn(planPathRelative, shared), {
        sleepImpl,
        pollIntervalMs,
        maxPollMs,
        isDone: (r) =>
          r.status === "IMPLEMENTATION_COMPLETE" || r.failure === true,
      });
      continue;
    }

    if (status === "IMPLEMENTATION_COMPLETE") {
      if (!companion.cursor_reviewer?.agent_id) {
        record("launch reviewer");
        companion = bumpCounter(readStatusJson(absolute), "reviewer_attempts");
        writeStatusJson(absolute, companion, {
          fromStatus: "IMPLEMENTATION_COMPLETE",
          syncMarkdown: false,
        });
        await withBoundedRetry(
          () => launchReviewerFn(planPathRelative, shared),
          {
            maxAttempts: config.MAX_TRANSIENT_RETRIES,
            baseDelayMs: config.TRANSIENT_RETRY_BASE_MS,
            sleepImpl,
          },
        );
      }
      record("poll reviewer");
      await pollUntil(
        "reviewer",
        () => statusReviewerFn(planPathRelative, shared),
        {
          sleepImpl,
          pollIntervalMs,
          maxPollMs,
          isDone: (r) =>
            r.advanced === true ||
            r.review_result != null ||
            r.failure === true,
        },
      );
      continue;
    }

    if (status === "REVIEW_FAILED" || status === "BLOCKED") {
      record("launch resolver");
      companion = bumpCounter(readStatusJson(absolute), "resolver_attempts");
      writeStatusJson(absolute, companion, {
        fromStatus: status,
        syncMarkdown: false,
      });
      await withBoundedRetry(() => launchResolverFn(planPathRelative, shared), {
        maxAttempts: config.MAX_TRANSIENT_RETRIES,
        baseDelayMs: config.TRANSIENT_RETRY_BASE_MS,
        sleepImpl,
      });
      continue;
    }

    if (status === "ANALYZING_BLOCKER") {
      if (
        companion.cursor_resolver?.agent_id &&
        !["FINISHED", "ERROR", "CANCELLED", "EXPIRED"].includes(
          String(companion.cursor_resolver.run_status || "").toUpperCase(),
        )
      ) {
        record("poll resolver");
        await pollUntil(
          "resolver",
          () => statusResolverFn(planPathRelative, shared),
          {
            sleepImpl,
            pollIntervalMs,
            maxPollMs,
            isDone: (r) =>
              r.classification != null ||
              r.advanced === true ||
              r.failure === true,
          },
        );
      } else if (
        companion.cursor_resolver?.run_status === "FINISHED" &&
        !companion.resolver?.classification
      ) {
        record("ingest resolver");
        await statusResolverFn(planPathRelative, shared);
      } else {
        record("launch resolver (analyze)");
        await withBoundedRetry(
          () => launchResolverFn(planPathRelative, shared),
          {
            maxAttempts: config.MAX_TRANSIENT_RETRIES,
            baseDelayMs: config.TRANSIENT_RETRY_BASE_MS,
            sleepImpl,
          },
        );
      }
      continue;
    }

    if (status === "RESOLUTION_PROPOSED") {
      record("launch remediation");
      await withBoundedRetry(
        () => launchRemediationFn(planPathRelative, shared),
        {
          maxAttempts: config.MAX_TRANSIENT_RETRIES,
          baseDelayMs: config.TRANSIENT_RETRY_BASE_MS,
          sleepImpl,
        },
      );
      continue;
    }

    if (status === "REMEDIATION_IN_PROGRESS") {
      record("poll remediation");
      await pollUntil(
        "remediation",
        () => statusRemediationFn(planPathRelative, shared),
        {
          sleepImpl,
          pollIntervalMs,
          maxPollMs,
          isDone: (r) => r.advanced === true || r.failure === true,
        },
      );
      continue;
    }

    if (status === "REMEDIATION_COMPLETE") {
      // status-remediation should have advanced; if stuck, advance manually is unsafe — fail
      throw new Error(
        "Stuck at REMEDIATION_COMPLETE — run status-remediation to advance to re-review",
      );
    }

    if (status === "REVIEW_PASSED") {
      // status-reviewer normally advances; if stuck, leave for human
      break;
    }

    throw new Error(`Overnight controller cannot handle status ${status}`);
  }

  companion = readStatusJson(absolute);
  status = companion?.status || status;
  const report = buildMorningReport({
    planId: validation.planId,
    companion,
    events,
  });

  return {
    ok: true,
    dryRun: false,
    planId: validation.planId,
    planPath: planPathRelative,
    status,
    counts: countAttempts(companion || {}),
    morning_report: report,
    human_decision_text:
      status === "HUMAN_DECISION_REQUIRED"
        ? formatHumanDecisionText(companion?.human_decision)
        : null,
    events,
    message: `Overnight run finished: ${status}`,
  };
}

async function enforceMaxCyclesCheck(absolute, companion, maxCycles, nowIso) {
  const cycle = getRemediationCycle(companion);
  // Only enforce when about to start another remediation (RESOLUTION_PROPOSED)
  // or when already at/over budget during analyze.
  if (cycle < maxCycles) return null;
  if (
    companion.status !== "RESOLUTION_PROPOSED" &&
    companion.status !== "REVIEW_FAILED" &&
    companion.status !== "ANALYZING_BLOCKER"
  ) {
    return null;
  }
  return enforceMaxCycles(absolute, companion, maxCycles, nowIso);
}

function inferNextAction(status, companion) {
  if (status === "APPROVED_FOR_IMPLEMENTATION") return "launch-builder";
  if (status === "IN_PROGRESS") return "status-builder";
  if (status === "IMPLEMENTATION_COMPLETE") {
    return companion?.cursor_reviewer?.agent_id
      ? "status-reviewer"
      : "launch-reviewer";
  }
  if (status === "REVIEW_FAILED" || status === "BLOCKED") return "launch-resolver";
  if (status === "ANALYZING_BLOCKER") return "status-resolver|launch-resolver";
  if (status === "RESOLUTION_PROPOSED") return "launch-remediation";
  if (status === "REMEDIATION_IN_PROGRESS") return "status-remediation";
  if (status === "READY_FOR_HUMAN_APPROVAL") return "human-merge-decision";
  if (status === "HUMAN_DECISION_REQUIRED") return "answer-human-decision";
  return "inspect-status";
}

async function resumeOvernight(planPathInput, options = {}) {
  // Resume is the same controller — state machine is the source of truth.
  return runOvernight(planPathInput, options);
}

async function mainRun() {
  const { planPath, dryRun, maxCycles } = parseArgs(process.argv);
  if (!planPath) {
    fail("Usage: node scripts/orchestrator/overnight-run.js <plan.md> [--dry-run]");
  }
  try {
    loadEnvLocal();
    assertWorkspaceSafeForOvernight({ env: process.env });
    const result = await runOvernight(planPath, { dryRun, maxCycles });
    ok(result.message);
    emitJson(result);
  } catch (err) {
    const infra =
      err instanceof InfrastructureBlockError ||
      err?.code === "FATAL_INFRASTRUCTURE_BLOCK";
    emitJson(
      infra && typeof err.toJSON === "function"
        ? err.toJSON()
        : {
            ok: false,
            error: err.message,
            transient: isTransientError(err),
            code: err?.code || undefined,
            infrastructure_block: infra || undefined,
          },
    );
    fail(err.message);
  }
}

if (require.main === module) {
  mainRun();
}

module.exports = {
  runOvernight,
  resumeOvernight,
  inferNextAction,
  parseArgs,
  pollUntil,
  countAttempts,
};
