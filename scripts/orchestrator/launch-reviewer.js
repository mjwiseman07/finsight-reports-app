/**
 * Launch independent Cursor Cloud Agent reviewer for IMPLEMENTATION_COMPLETE plans.
 *
 * Usage:
 *   node scripts/orchestrator/launch-reviewer.js <plan.md> [--dry-run]
 *
 * Fail-closed. Does not change plan status on launch (stays IMPLEMENTATION_COMPLETE
 * until a validated reviewer result is ingested by status-reviewer.js).
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
  hasActiveReviewerAgent,
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
const { buildReviewerPrompt } = require("./reviewer-prompt-builder");
const {
  fetchPullRequest,
  assertBuilderPrEligible,
} = require("./github-pr");

const IMPLEMENTATION_COMPLETE = "IMPLEMENTATION_COMPLETE";

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

async function launchReviewer(planPathInput, {
  dryRun = false,
  fetchImpl = undefined,
  githubFetchImpl = undefined,
  env = process.env,
  now = () => new Date().toISOString(),
} = {}) {
  if (!planPathInput) {
    throw new Error(
      "Usage: node scripts/orchestrator/launch-reviewer.js <plan.md> [--dry-run]",
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
  if (status !== IMPLEMENTATION_COMPLETE) {
    throw new Error(
      `Cannot launch reviewer: STATUS is ${status || "MISSING"}, required ${IMPLEMENTATION_COMPLETE}`,
    );
  }

  let companion;
  try {
    companion = readStatusJson(absolute);
  } catch (err) {
    throw err;
  }

  if (!companion) {
    throw new Error("Missing companion status JSON");
  }
  if (companion.planId && validation.planId && companion.planId !== validation.planId) {
    throw new Error(
      `PLAN_ID mismatch: companion ${companion.planId} vs plan ${validation.planId}`,
    );
  }

  const builder = companion.cursor_agent;
  if (!builder?.agent_id || !builder?.run_id) {
    throw new Error("Builder cursor_agent metadata required before reviewer launch");
  }
  if (!builder.pr_url) {
    throw new Error("Builder PR URL missing; cannot launch reviewer");
  }

  if (hasActiveReviewerAgent(companion)) {
    throw new Error(
      `Cannot launch reviewer: cursor_reviewer.agent_id already set (${companion.cursor_reviewer.agent_id})`,
    );
  }

  let pr;
  try {
    pr = await fetchPullRequest(builder.pr_url, {
      fetchImpl: githubFetchImpl || fetchImpl || globalThis.fetch,
    });
    assertBuilderPrEligible(pr, { expectedUrl: builder.pr_url });
  } catch (err) {
    throw new Error(`Builder PR precondition failed: ${err.message}`);
  }

  const meta = parsePlanMetadata(validation.markdown);
  const promptText = buildReviewerPrompt({
    planId: meta.planId,
    planPathRelative,
    builderPrUrl: builder.pr_url,
    builderBranch: builder.branch || pr.headRef,
    builderAgentId: builder.agent_id,
    builderHeadSha: pr.headSha,
    title: meta.title,
  });

  const createBody = buildCreateAgentRequest({
    promptText,
    name: `Advisacor review ${meta.planId}`.slice(0, 100),
    prUrl: builder.pr_url,
    autoCreatePR: false,
    skipReviewerRequest: true,
    workOnCurrentBranch: false,
  });

  if (createBody.autoCreatePR !== false) {
    throw new Error("Refusing reviewer launch: autoCreatePR must be false");
  }
  if (createBody.workOnCurrentBranch !== false) {
    throw new Error("Refusing reviewer launch: workOnCurrentBranch must be false");
  }
  if (!createBody.repos?.[0]?.prUrl) {
    throw new Error("Refusing reviewer launch: repos[0].prUrl required");
  }

  const sanitizedRequest = {
    ...createBody,
    prompt: {
      text: `[prompt length ${createBody.prompt.text.length} chars]`,
      preview: createBody.prompt.text.slice(0, 240),
    },
  };

  if (dryRun) {
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
      builderPr: builder.pr_url,
      builderHeadSha: pr.headSha,
      apiKeyConfigured,
      request: sanitizedRequest,
      networkCalled: false,
      statusChanged: false,
      message:
        "Reviewer dry-run complete: preconditions + request OK; no API call; status unchanged.",
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
    throw new Error(
      `Cursor reviewer create failed; plan status unchanged: ${msg}`,
    );
  }

  let safeMeta;
  try {
    safeMeta = extractSafeAgentMetadata(apiResponse);
  } catch (err) {
    throw new Error(
      `Cursor reviewer response incomplete; plan status unchanged: ${err.message}`,
    );
  }

  if (safeMeta.agent_id === builder.agent_id) {
    throw new Error(
      "Refusing to record reviewer: agent_id collides with builder agent_id",
    );
  }

  const launchedAt = now();
  const cursorReviewer = sanitizeCursorAgentRecord({
    ...safeMeta,
    launched_at: launchedAt,
    last_checked_at: launchedAt,
  });

  // Stay on IMPLEMENTATION_COMPLETE until validated result arrives.
  writeStatusJson(
    absolute,
    {
      ...companion,
      planId: meta.planId,
      planPath: absolute,
      status: IMPLEMENTATION_COMPLETE,
      phase: "review",
      cursor_agent: builder,
      cursor_reviewer: cursorReviewer,
      builder_head_sha: pr.headSha,
      merge: false,
      deploy: false,
    },
    { fromStatus: IMPLEMENTATION_COMPLETE, syncMarkdown: true },
  );

  return {
    ok: true,
    dryRun: false,
    planId: meta.planId,
    planPath: planPathRelative,
    status: IMPLEMENTATION_COMPLETE,
    cursor_reviewer: cursorReviewer,
    builder_agent_id: builder.agent_id,
    builder_pr: builder.pr_url,
    builder_head_sha: pr.headSha,
    networkCalled: true,
    statusChanged: false,
    message: `Reviewer Cloud Agent launched: agent_id=${cursorReviewer.agent_id} run_id=${cursorReviewer.run_id}`,
  };
}

async function main() {
  const { planPath, dryRun } = parseArgs(process.argv);
  if (!planPath) {
    fail(
      "Usage: node scripts/orchestrator/launch-reviewer.js <plan.md> [--dry-run]",
    );
  }
  let result;
  try {
    result = await launchReviewer(planPath, { dryRun });
  } catch (err) {
    emitJson({ ok: false, dryRun, error: err.message });
    fail(err.message);
  }
  ok(result.message);
  emitJson(result);
}

if (require.main === module) {
  main();
}

module.exports = {
  launchReviewer,
  parseArgs,
};
