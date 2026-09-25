/**
 * Poll Cursor Cloud Agent status for a launched builder plan.
 *
 * Usage:
 *   node scripts/orchestrator/status-builder.js <plan.md>
 *
 * Updates safe cursor_agent metadata. May advance IN_PROGRESS → IMPLEMENTATION_COMPLETE
 * when the builder run FINISHED and a PR URL exists.
 * Never sets REVIEW_PASSED, READY_FOR_HUMAN_APPROVAL, or COMPLETED.
 */

"use strict";

const config = require("./config");
const {
  validatePlanStructure,
  resolveEffectiveStatus,
  parsePlanMetadata,
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

const IN_PROGRESS = "IN_PROGRESS";
const IMPLEMENTATION_COMPLETE = "IMPLEMENTATION_COMPLETE";
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

async function statusBuilder(planPathInput, {
  fetchImpl = undefined,
  env = process.env,
  now = () => new Date().toISOString(),
  advanceOnComplete = true,
} = {}) {
  if (!planPathInput) {
    throw new Error(
      "Usage: node scripts/orchestrator/status-builder.js <plan.md>",
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

  if (!companion?.cursor_agent?.agent_id || !companion?.cursor_agent?.run_id) {
    throw new Error(
      "No cursor_agent association found; launch builder before polling status",
    );
  }

  const expectedAgentId = companion.cursor_agent.agent_id;
  const expectedRunId = companion.cursor_agent.run_id;

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
    throw new Error(`Cursor status poll failed: ${msg}`);
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
  const cursorAgent = sanitizeCursorAgentRecord({
    ...companion.cursor_agent,
    ...safeMeta,
    agent_id: expectedAgentId,
    run_id: safeMeta.run_id || expectedRunId,
    launched_at: companion.cursor_agent.launched_at,
    last_checked_at: checkedAt,
  });

  const runStatus = String(cursorAgent.run_status || "").toUpperCase();
  let nextStatus = status;
  let advanced = false;
  let implementation = companion.implementation || null;

  if (
    advanceOnComplete &&
    status === IN_PROGRESS &&
    TERMINAL_SUCCESS.has(runStatus) &&
    cursorAgent.pr_url
  ) {
    const meta = parsePlanMetadata(validation.markdown);
    implementation = {
      completedAt: checkedAt,
      results: {
        planId: meta.planId,
        success: true,
        source: "cursor_cloud_agent",
        agent_id: cursorAgent.agent_id,
        run_id: cursorAgent.run_id,
        branch: cursorAgent.branch,
        pr_url: cursorAgent.pr_url,
        notes:
          "Builder run FINISHED with PR URL. Independent review still required. Do not treat as REVIEW_PASSED.",
      },
    };
    nextStatus = IMPLEMENTATION_COMPLETE;
    advanced = true;
  } else if (
    advanceOnComplete &&
    status === IN_PROGRESS &&
    TERMINAL_SUCCESS.has(runStatus) &&
    !cursorAgent.pr_url
  ) {
    // Finished without PR — record metadata only; do not advance.
    nextStatus = IN_PROGRESS;
  }

  // Explicitly refuse forbidden advances
  if (
    nextStatus === "REVIEW_PASSED" ||
    nextStatus === "READY_FOR_HUMAN_APPROVAL" ||
    nextStatus === "COMPLETED"
  ) {
    throw new Error("Refusing forbidden status advance from builder poll");
  }

  writeStatusJson(
    absolute,
    {
      planId: validation.planId,
      planPath: absolute,
      status: nextStatus,
      phase:
        nextStatus === IMPLEMENTATION_COMPLETE ? "implementation" : companion.phase,
      startedAt: companion.startedAt,
      cursor_agent: cursorAgent,
      implementation,
      merge: false,
      deploy: false,
    },
    { fromStatus: status },
  );

  return {
    ok: true,
    planId: validation.planId,
    planPath: planPathRelative,
    status: nextStatus,
    advanced,
    cursor_agent: cursorAgent,
    agent_status: cursorAgent.agent_status,
    run_status: cursorAgent.run_status,
    branch: cursorAgent.branch,
    pr_url: cursorAgent.pr_url,
    failure: TERMINAL_FAILURE.has(runStatus),
    message: advanced
      ? `Builder complete → ${IMPLEMENTATION_COMPLETE} (PR: ${cursorAgent.pr_url})`
      : `Status polled: run=${cursorAgent.run_status} agent=${cursorAgent.agent_status}`,
  };
}

async function main() {
  const { planPath } = parseArgs(process.argv);
  if (!planPath) {
    fail("Usage: node scripts/orchestrator/status-builder.js <plan.md>");
  }

  let result;
  try {
    result = await statusBuilder(planPath);
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
  statusBuilder,
  parseArgs,
};
