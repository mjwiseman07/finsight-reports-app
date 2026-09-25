/**
 * Launch Cursor Cloud Agent builder for an APPROVED_FOR_IMPLEMENTATION plan.
 *
 * Usage:
 *   node scripts/orchestrator/launch-builder.js <plan.md> [--dry-run]
 *
 * Fail-closed. Does not advance to IN_PROGRESS unless Cloud Agent create succeeds.
 */

"use strict";

require("./load-env").loadOrchestratorEnv();

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
  hasActiveCursorAgent,
  sanitizeCursorAgentRecord,
  fail,
  ok,
  emitJson,
} = require("./lib");
const {
  CursorCloudAgentError,
  buildCreateAgentRequest,
  extractSafeAgentMetadata,
  createCursorCloudClient,
  redactSecrets,
  getApiKey,
} = require("./cursor-cloud-agent");
const { buildImplementationPrompt } = require("./prompt-builder");

const APPROVED = "APPROVED_FOR_IMPLEMENTATION";
const IN_PROGRESS = "IN_PROGRESS";

function parseArgs(argv) {
  const args = argv.slice(2);
  let planPath = null;
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i].startsWith("-")) {
      fail(`Unexpected argument: ${args[i]}`);
    } else if (!planPath) {
      planPath = args[i];
    } else {
      fail(`Unexpected argument: ${args[i]}`);
    }
  }
  return { planPath, dryRun };
}

/**
 * Core launch logic (testable). Returns a result object; does not process.exit.
 */
async function launchBuilder(planPathInput, {
  dryRun = false,
  fetchImpl = undefined,
  env = process.env,
  now = () => new Date().toISOString(),
} = {}) {
  if (!planPathInput) {
    throw new Error(
      "Usage: node scripts/orchestrator/launch-builder.js <plan.md> [--dry-run]",
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
  if (status !== APPROVED) {
    throw new Error(
      `Cannot launch builder: STATUS is ${status || "MISSING"}, required ${APPROVED}`,
    );
  }

  let companion;
  try {
    companion = readStatusJson(absolute);
  } catch (err) {
    throw err;
  }

  if (companion?.planId && validation.planId && companion.planId !== validation.planId) {
    throw new Error(
      `PLAN_ID mismatch: companion ${companion.planId} vs plan ${validation.planId}`,
    );
  }

  if (hasActiveCursorAgent(companion)) {
    throw new Error(
      `Cannot launch builder: plan already has cursor_agent.agent_id=${companion.cursor_agent.agent_id}`,
    );
  }

  const meta = parsePlanMetadata(validation.markdown);
  const promptText = buildImplementationPrompt({
    planId: meta.planId,
    planPathRelative,
    title: meta.title,
    objective: meta.objective,
  });

  const createBody = buildCreateAgentRequest({
    promptText,
    name: `Advisacor ${meta.planId}`.slice(0, 100),
  });

  // Verify request invariants before any network call
  if (createBody.workOnCurrentBranch !== false) {
    throw new Error("Refusing launch: workOnCurrentBranch must be false");
  }
  if (createBody.repos?.[0]?.startingRef !== config.STARTING_REF) {
    throw new Error(`Refusing launch: startingRef must be ${config.STARTING_REF}`);
  }
  if (createBody.repos?.[0]?.url !== config.REPOSITORY_URL) {
    throw new Error("Refusing launch: repository URL mismatch");
  }
  if (createBody.autoCreatePR !== true) {
    throw new Error("Refusing launch: autoCreatePR must be true");
  }

  const sanitizedRequest = {
    ...createBody,
    prompt: {
      text: `[prompt length ${createBody.prompt.text.length} chars — not echoed in dry-run summary beyond preview]`,
      preview: createBody.prompt.text.slice(0, 240),
    },
  };

  if (dryRun) {
    // Dry-run may check that API key exists without calling the API —
    // but missing key should still fail closed so operators know setup is incomplete.
    // User asked dry-run must NOT call Cursor API. Checking key presence is local-only.
    let apiKeyConfigured = false;
    try {
      getApiKey({ env });
      apiKeyConfigured = true;
    } catch {
      apiKeyConfigured = false;
    }

    return {
      ok: true,
      dryRun: true,
      planId: meta.planId,
      planPath: planPathRelative,
      status,
      apiKeyConfigured,
      request: sanitizedRequest,
      networkCalled: false,
      statusChanged: false,
      message:
        "Dry-run complete: validation and request construction OK; no API call; no status change.",
    };
  }

  let apiKey;
  try {
    apiKey = getApiKey({ env });
  } catch (err) {
    throw err;
  }

  const client = createCursorCloudClient({ fetchImpl, env });
  let apiResponse;
  try {
    apiResponse = await client.createAgent(createBody);
  } catch (err) {
    const msg =
      err instanceof CursorCloudAgentError
        ? redactSecrets(err.message, apiKey)
        : redactSecrets(err.message || String(err), apiKey);
    throw new Error(`Cursor Cloud Agent create failed; plan status unchanged: ${msg}`);
  }

  let safeMeta;
  try {
    safeMeta = extractSafeAgentMetadata(apiResponse);
  } catch (err) {
    throw new Error(
      `Cursor API response incomplete; plan status unchanged: ${err.message}`,
    );
  }

  const launchedAt = now();
  const cursorAgent = sanitizeCursorAgentRecord({
    ...safeMeta,
    launched_at: launchedAt,
    last_checked_at: launchedAt,
  });

  writeStatusJson(
    absolute,
    {
      planId: meta.planId,
      planPath: absolute,
      status: IN_PROGRESS,
      phase: "implementation",
      startedAt: launchedAt,
      cursor_agent: cursorAgent,
      merge: false,
      deploy: false,
    },
    { fromStatus: APPROVED },
  );

  return {
    ok: true,
    dryRun: false,
    planId: meta.planId,
    planPath: planPathRelative,
    status: IN_PROGRESS,
    cursor_agent: cursorAgent,
    networkCalled: true,
    statusChanged: true,
    message: `Cloud Agent launched: agent_id=${cursorAgent.agent_id} run_id=${cursorAgent.run_id}`,
  };
}

async function main() {
  const { planPath, dryRun } = parseArgs(process.argv);
  if (!planPath) {
    fail(
      "Usage: node scripts/orchestrator/launch-builder.js <plan.md> [--dry-run]",
    );
  }

  let result;
  try {
    result = await launchBuilder(planPath, { dryRun });
  } catch (err) {
    emitJson({
      ok: false,
      dryRun,
      error: err.message,
    });
    fail(err.message);
  }

  if (result.dryRun) {
    ok(result.message);
  } else {
    ok(result.message);
  }
  emitJson(result);
}

if (require.main === module) {
  main();
}

module.exports = {
  launchBuilder,
  parseArgs,
};
