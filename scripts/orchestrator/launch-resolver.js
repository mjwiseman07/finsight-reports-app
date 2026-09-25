/**
 * Launch independent resolver / architect Cloud Agent.
 *
 * Usage:
 *   node scripts/orchestrator/launch-resolver.js <plan.md> [--dry-run]
 *
 * Valid from: REVIEW_FAILED | ANALYZING_BLOCKER | BLOCKED (with evidence)
 * Transitions to ANALYZING_BLOCKER on launch (if not already).
 * Does not mutate application code during diagnosis.
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
  hasActiveResolverAgent,
  sanitizeCursorAgentRecord,
  getRemediationCycle,
  assertRemediationBudget,
  extractSectionBody,
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
const { buildResolverPrompt } = require("./resolver-prompt-builder");
const {
  buildBlockerPacket,
  writeBlockerPacket,
  readBlockerPacket,
} = require("./blocker-packet");
const { appendAuditEventInMemory } = require("./audit-trail");

const ALLOWED_LAUNCH_STATUSES = new Set([
  "REVIEW_FAILED",
  "ANALYZING_BLOCKER",
  "BLOCKED",
  "IN_PROGRESS",
]);

function parseArgs(argv) {
  const args = argv.slice(2);
  let planPath = null;
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--dry-run") dryRun = true;
    else if (args[i].startsWith("-")) fail(`Unexpected argument: ${args[i]}`);
    else if (!planPath) planPath = args[i];
    else fail(`Unexpected argument: ${args[i]}`);
  }
  return { planPath, dryRun };
}

async function launchResolver(planPathInput, {
  dryRun = false,
  fetchImpl = undefined,
  env = process.env,
  now = () => new Date().toISOString(),
} = {}) {
  if (!planPathInput) {
    throw new Error(
      "Usage: node scripts/orchestrator/launch-resolver.js <plan.md> [--dry-run]",
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
  if (!ALLOWED_LAUNCH_STATUSES.has(status)) {
    throw new Error(
      `Cannot launch resolver: STATUS is ${status || "MISSING"}, required one of ${[...ALLOWED_LAUNCH_STATUSES].join("|")}`,
    );
  }

  let companion = readStatusJson(absolute);
  if (!companion) throw new Error("Missing companion status JSON");

  if (companion.planId && validation.planId && companion.planId !== validation.planId) {
    throw new Error(
      `PLAN_ID mismatch: companion ${companion.planId} vs plan ${validation.planId}`,
    );
  }

  if (status === "HUMAN_DECISION_REQUIRED") {
    throw new Error("Cannot launch resolver: human decision already required");
  }

  assertRemediationBudget(companion, config.MAX_REMEDIATION_CYCLES);

  if (hasActiveResolverAgent(companion)) {
    throw new Error(
      `Cannot launch resolver: active cursor_resolver.agent_id=${companion.cursor_resolver.agent_id}`,
    );
  }

  const hasEvidence =
    companion.review ||
    companion.implementation ||
    readBlockerPacket(absolute) ||
    companion.blocker;
  if (!hasEvidence) {
    throw new Error("Cannot launch resolver: no blocker evidence (review/implementation/packet)");
  }

  const meta = parsePlanMetadata(validation.markdown);
  let packet = readBlockerPacket(absolute);
  if (!packet) {
    packet = buildBlockerPacket(companion, meta, {
      approved_plan_path: planPathRelative,
      current_state: status,
      prohibited_changes: extractSectionBody(validation.markdown, "Prohibited Changes"),
      maximum_retry_count: config.MAX_REMEDIATION_CYCLES,
      retry_count: getRemediationCycle(companion),
    });
    writeBlockerPacket(absolute, packet);
  }

  const promptText = buildResolverPrompt({
    planId: meta.planId,
    planPathRelative,
    blockerPacket: packet,
    planExcerpt: validation.markdown.slice(0, 6000),
  });

  const createBody = buildCreateAgentRequest({
    promptText,
    name: `Advisacor resolve ${meta.planId}`.slice(0, 100),
    prUrl: companion.cursor_agent?.pr_url || undefined,
    autoCreatePR: false,
    skipReviewerRequest: true,
    workOnCurrentBranch: false,
  });

  if (createBody.autoCreatePR !== false) {
    throw new Error("Refusing resolver launch: autoCreatePR must be false");
  }
  if (createBody.workOnCurrentBranch !== false) {
    throw new Error("Refusing resolver launch: workOnCurrentBranch must be false");
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
      apiKeyConfigured,
      request: sanitizedRequest,
      networkCalled: false,
      statusChanged: false,
      message: "Resolver dry-run complete: preconditions OK; no API call.",
    };
  }

  const apiKey = getApiKey({ env });
  const client = createCursorCloudClient({ fetchImpl, env });
  let apiResponse;
  try {
    apiResponse = await client.createAgent(createBody);
  } catch (err) {
    const msg =
      err instanceof CursorCloudAgentError
        ? redactSecrets(err.message, apiKey)
        : redactSecrets(err.message || String(err), apiKey);
    throw new Error(`Cursor resolver create failed; status unchanged: ${msg}`);
  }

  const safeMeta = extractSafeAgentMetadata(apiResponse);
  const builderId = companion.cursor_agent?.agent_id;
  const reviewerId = companion.cursor_reviewer?.agent_id;
  if (safeMeta.agent_id === builderId || safeMeta.agent_id === reviewerId) {
    throw new Error(
      "Refusing to record resolver: agent_id collides with builder or reviewer",
    );
  }

  const launchedAt = now();
  const cursorResolver = sanitizeCursorAgentRecord({
    ...safeMeta,
    launched_at: launchedAt,
    last_checked_at: launchedAt,
  });

  const fromStatus = status;
  const nextStatus = "ANALYZING_BLOCKER";
  let next = {
    ...companion,
    planId: meta.planId,
    planPath: absolute,
    status: nextStatus,
    phase: "resolution",
    cursor_resolver: cursorResolver,
    blocker: packet,
    merge: false,
    deploy: false,
  };
  appendAuditEventInMemory(next, {
    timestamp: launchedAt,
    fromStatus,
    toStatus: nextStatus,
    actor: "resolver",
    agentId: cursorResolver.agent_id,
    runId: cursorResolver.run_id,
    pr: companion.cursor_agent?.pr_url || null,
    commitSha: companion.builder_head_sha || null,
    result: "LAUNCHED",
    reason: "Resolver Cloud Agent launched",
  });

  writeStatusJson(absolute, next, { fromStatus, syncMarkdown: true });

  return {
    ok: true,
    dryRun: false,
    planId: meta.planId,
    planPath: planPathRelative,
    status: nextStatus,
    cursor_resolver: cursorResolver,
    networkCalled: true,
    statusChanged: true,
    message: `Resolver launched: agent_id=${cursorResolver.agent_id} run_id=${cursorResolver.run_id}`,
  };
}

async function main() {
  const { planPath, dryRun } = parseArgs(process.argv);
  if (!planPath) {
    fail("Usage: node scripts/orchestrator/launch-resolver.js <plan.md> [--dry-run]");
  }
  try {
    const result = await launchResolver(planPath, { dryRun });
    ok(result.message);
    emitJson(result);
  } catch (err) {
    emitJson({ ok: false, dryRun, error: err.message });
    fail(err.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { launchResolver, parseArgs };
