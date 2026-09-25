/**
 * Poll independent reviewer Cloud Agent and ingest validated review results.
 *
 * Usage:
 *   node scripts/orchestrator/status-reviewer.js <plan.md>
 *
 * Never sets COMPLETED. Never merges.
 * PASS → REVIEW_PASSED → READY_FOR_HUMAN_APPROVAL
 * NEEDS_CHANGES → REVIEW_FAILED
 * BLOCKED → BLOCKED (recorded)
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
  sanitizeCursorAgentRecord,
  fail,
  ok,
  emitJson,
} = require("./lib");
const {
  CursorCloudAgentError,
  createCursorCloudClient,
  extractSafeRunMetadata,
  redactSecrets,
  getApiKey,
} = require("./cursor-cloud-agent");
const {
  extractReviewResultJson,
  assertReviewResultValid,
} = require("./reviewer-result");

const IMPLEMENTATION_COMPLETE = "IMPLEMENTATION_COMPLETE";
const REVIEW_PASSED = "REVIEW_PASSED";
const REVIEW_FAILED = "REVIEW_FAILED";
const READY = "READY_FOR_HUMAN_APPROVAL";
const BLOCKED = "BLOCKED";
const TERMINAL_SUCCESS = new Set(["FINISHED"]);
const TERMINAL_FAILURE = new Set(["ERROR", "CANCELLED", "EXPIRED"]);

function parseArgs(argv) {
  const planPath = argv[2];
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i].startsWith("-")) {
      fail(`Unexpected argument: ${argv[i]}`);
    }
  }
  return { planPath };
}

function applyReviewOutcome(companion, validated, nowIso) {
  const reviewPayload = {
    completedAt: nowIso,
    verdict: validated.review_result,
    notes: validated.summary,
    result: validated,
    source: "cursor_cloud_reviewer",
  };

  if (validated.review_result === "PASS") {
    return {
      nextStatus: READY,
      steps: [
        { status: REVIEW_PASSED, review: reviewPayload },
        {
          status: READY,
          review: {
            ...reviewPayload,
            advancedToHumanApprovalAt: nowIso,
          },
        },
      ],
    };
  }

  if (validated.review_result === "NEEDS_CHANGES") {
    return {
      nextStatus: REVIEW_FAILED,
      steps: [
        {
          status: REVIEW_FAILED,
          review: reviewPayload,
        },
      ],
    };
  }

  // BLOCKED
  return {
    nextStatus: BLOCKED,
    steps: [
      {
        status: BLOCKED,
        review: {
          ...reviewPayload,
          blocked: true,
        },
      },
    ],
  };
}

async function statusReviewer(planPathInput, {
  fetchImpl = undefined,
  env = process.env,
  now = () => new Date().toISOString(),
  advanceOnComplete = true,
  resultTextOverride = null,
} = {}) {
  if (!planPathInput) {
    throw new Error(
      "Usage: node scripts/orchestrator/status-reviewer.js <plan.md>",
    );
  }

  const absolute = resolveSafeRepoPath(planPathInput, { mustExist: true });
  assertPlanInPlansDirectory(absolute, config.PLANS_DIR);
  const planPathRelative = toRepoRelative(absolute);

  const validation = validatePlanStructure(absolute);
  if (!validation.ok) {
    throw new Error(`Plan structure invalid: ${validation.errors.join("; ")}`);
  }

  const status = resolveEffectiveStatus(absolute, validation.markdown);
  let companion;
  try {
    companion = readStatusJson(absolute);
  } catch (err) {
    throw err;
  }

  if (!companion?.cursor_reviewer?.agent_id || !companion?.cursor_reviewer?.run_id) {
    throw new Error(
      "No cursor_reviewer association found; launch reviewer before polling",
    );
  }

  const builder = companion.cursor_agent;
  if (!builder?.agent_id || !builder?.pr_url) {
    throw new Error("Builder cursor_agent metadata incomplete for review ingest");
  }

  const expectedAgentId = companion.cursor_reviewer.agent_id;
  const expectedRunId = companion.cursor_reviewer.run_id;

  if (expectedAgentId === builder.agent_id) {
    throw new Error("Builder and reviewer agent IDs must differ");
  }

  let apiKey;
  try {
    apiKey = getApiKey({ env });
  } catch (err) {
    throw err;
  }

  const client = createCursorCloudClient({ fetchImpl, env });
  let agent;
  let run;
  try {
    agent = await client.getAgent(expectedAgentId);
    const runId = agent.latestRunId || expectedRunId;
    run = await client.getRun(expectedAgentId, runId);
  } catch (err) {
    const msg =
      err instanceof CursorCloudAgentError
        ? redactSecrets(err.message, apiKey)
        : redactSecrets(err.message || String(err), apiKey);
    throw new Error(`Cursor reviewer status poll failed: ${msg}`);
  }

  if (run.agentId && run.agentId !== expectedAgentId) {
    throw new Error(
      `agentId mismatch: run.agentId ${run.agentId} != expected ${expectedAgentId}`,
    );
  }

  const safeMeta = extractSafeRunMetadata(run, agent);
  if (safeMeta.agent_id && safeMeta.agent_id !== expectedAgentId) {
    throw new Error(
      `agent_id mismatch from API: ${safeMeta.agent_id} != ${expectedAgentId}`,
    );
  }

  const checkedAt = now();
  const cursorReviewer = sanitizeCursorAgentRecord({
    ...companion.cursor_reviewer,
    ...safeMeta,
    agent_id: expectedAgentId,
    run_id: safeMeta.run_id || expectedRunId,
    launched_at: companion.cursor_reviewer.launched_at,
    last_checked_at: checkedAt,
  });

  const runStatus = String(cursorReviewer.run_status || "").toUpperCase();
  let nextStatus = status;
  let advanced = false;
  let validated = null;
  let review = companion.review || null;

  if (TERMINAL_FAILURE.has(runStatus)) {
    writeStatusJson(
      absolute,
      {
        ...companion,
        planId: validation.planId,
        planPath: absolute,
        status: IMPLEMENTATION_COMPLETE,
        cursor_agent: builder,
        cursor_reviewer: cursorReviewer,
        merge: false,
        deploy: false,
      },
      { fromStatus: status },
    );
    return {
      ok: true,
      planId: validation.planId,
      planPath: planPathRelative,
      status: IMPLEMENTATION_COMPLETE,
      advanced: false,
      failure: true,
      cursor_reviewer: cursorReviewer,
      message: `Reviewer run ended ${runStatus}; plan remains ${IMPLEMENTATION_COMPLETE} for human review`,
    };
  }

  if (
    advanceOnComplete &&
    status === IMPLEMENTATION_COMPLETE &&
    TERMINAL_SUCCESS.has(runStatus)
  ) {
    const resultText =
      resultTextOverride != null ? resultTextOverride : run.result || "";
    if (!resultText || String(resultText).trim().length < 8) {
      writeStatusJson(
        absolute,
        {
          ...companion,
          planId: validation.planId,
          planPath: absolute,
          status: IMPLEMENTATION_COMPLETE,
          cursor_agent: builder,
          cursor_reviewer: cursorReviewer,
          merge: false,
          deploy: false,
        },
        { fromStatus: status },
      );
      throw new Error(
        "Reviewer finished without a parseable result; state not advanced",
      );
    }

    let parsed;
    try {
      parsed = extractReviewResultJson(resultText);
      validated = assertReviewResultValid(parsed, {
        expectedPlanId: validation.planId,
        expectedPrUrl: builder.pr_url,
        expectedCommitSha: companion.builder_head_sha || null,
        builderAgentId: builder.agent_id,
        reviewerAgentId: expectedAgentId,
      });
    } catch (err) {
      writeStatusJson(
        absolute,
        {
          ...companion,
          planId: validation.planId,
          planPath: absolute,
          status: IMPLEMENTATION_COMPLETE,
          cursor_agent: builder,
          cursor_reviewer: cursorReviewer,
          merge: false,
          deploy: false,
        },
        { fromStatus: status },
      );
      throw new Error(
        `Reviewer result rejected; state not advanced: ${err.message}`,
      );
    }

    const outcome = applyReviewOutcome(companion, validated, checkedAt);
    let from = status;
    for (const step of outcome.steps) {
      writeStatusJson(
        absolute,
        {
          ...companion,
          planId: validation.planId,
          planPath: absolute,
          status: step.status,
          phase:
            step.status === READY
              ? "human_approval"
              : step.status === BLOCKED
                ? "blocked"
                : "review",
          cursor_agent: builder,
          cursor_reviewer: cursorReviewer,
          builder_head_sha: companion.builder_head_sha || null,
          implementation: companion.implementation || null,
          review: step.review,
          merge: false,
          deploy: false,
        },
        { fromStatus: from },
      );
      from = step.status;
      review = step.review;
    }
    nextStatus = outcome.nextStatus;
    advanced = true;
  } else {
    writeStatusJson(
      absolute,
      {
        ...companion,
        planId: validation.planId,
        planPath: absolute,
        status,
        cursor_agent: builder,
        cursor_reviewer: cursorReviewer,
        merge: false,
        deploy: false,
      },
      { fromStatus: status },
    );
  }

  if (
    nextStatus === "COMPLETED" ||
    (validated && validated.review_result === "COMPLETED")
  ) {
    throw new Error("Refusing forbidden COMPLETED transition from reviewer");
  }

  return {
    ok: true,
    planId: validation.planId,
    planPath: planPathRelative,
    status: nextStatus,
    advanced,
    review_result: validated?.review_result || null,
    cursor_reviewer: cursorReviewer,
    review,
    failure: false,
    message: advanced
      ? `Reviewer result ${validated.review_result} → ${nextStatus}`
      : `Reviewer polled: run=${cursorReviewer.run_status} agent=${cursorReviewer.agent_status}`,
  };
}

async function main() {
  const { planPath } = parseArgs(process.argv);
  if (!planPath) {
    fail("Usage: node scripts/orchestrator/status-reviewer.js <plan.md>");
  }
  let result;
  try {
    result = await statusReviewer(planPath);
  } catch (err) {
    emitJson({ ok: false, error: err.message });
    fail(err.message);
  }
  ok(result.message);
  emitJson(result);
}

if (require.main === module) {
  main();
}

module.exports = {
  statusReviewer,
  parseArgs,
  applyReviewOutcome,
};
