/**
 * Poll resolver Cloud Agent and ingest validated resolver results.
 *
 * Usage:
 *   node scripts/orchestrator/status-resolver.js <plan.md>
 *
 * AUTONOMOUSLY_RESOLVABLE → RESOLUTION_PROPOSED
 * HUMAN_DECISION_REQUIRED → HUMAN_DECISION_REQUIRED (+ packet)
 * TRANSIENT_RETRY → stays ANALYZING_BLOCKER (or records transient)
 * FATAL_INFRASTRUCTURE_BLOCK → HUMAN_DECISION_REQUIRED or BLOCKED
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
  extractResolverResultJson,
  assertResolverResultValid,
} = require("./resolver-result");
const {
  buildHumanDecisionPacket,
  writeHumanDecisionPacket,
} = require("./human-decision");
const { appendAuditEventInMemory } = require("./audit-trail");

const TERMINAL_SUCCESS = new Set(["FINISHED"]);
const TERMINAL_FAILURE = new Set(["ERROR", "CANCELLED", "EXPIRED"]);

function parseArgs(argv) {
  const planPath = argv[2];
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i].startsWith("-")) fail(`Unexpected argument: ${argv[i]}`);
  }
  return { planPath };
}

async function statusResolver(planPathInput, {
  fetchImpl = undefined,
  env = process.env,
  now = () => new Date().toISOString(),
  advanceOnComplete = true,
  resultTextOverride = null,
} = {}) {
  if (!planPathInput) {
    throw new Error(
      "Usage: node scripts/orchestrator/status-resolver.js <plan.md>",
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
  let companion = readStatusJson(absolute);
  if (!companion?.cursor_resolver?.agent_id || !companion?.cursor_resolver?.run_id) {
    throw new Error("No cursor_resolver association; launch resolver first");
  }

  const apiKey = getApiKey({ env });
  const client = createCursorCloudClient({ fetchImpl, env });
  let agent;
  let run;
  try {
    agent = await client.getAgent(companion.cursor_resolver.agent_id);
    run = await client.getRun(
      companion.cursor_resolver.agent_id,
      companion.cursor_resolver.run_id,
    );
  } catch (err) {
    const msg =
      err instanceof CursorCloudAgentError
        ? redactSecrets(err.message, apiKey)
        : redactSecrets(err.message || String(err), apiKey);
    throw new Error(`Resolver status poll failed: ${msg}`);
  }

  const safeMeta = extractSafeRunMetadata(run, agent);
  const nowIso = now();
  const cursorResolver = sanitizeCursorAgentRecord({
    ...companion.cursor_resolver,
    ...safeMeta,
    last_checked_at: nowIso,
  });

  const runStatus = String(safeMeta.run_status || "").toUpperCase();
  companion = {
    ...companion,
    cursor_resolver: cursorResolver,
  };

  if (!TERMINAL_SUCCESS.has(runStatus) && !TERMINAL_FAILURE.has(runStatus)) {
    writeStatusJson(absolute, companion, {
      fromStatus: status,
      syncMarkdown: false,
    });
    return {
      ok: true,
      planId: validation.planId,
      planPath: planPathRelative,
      status,
      advanced: false,
      classification: null,
      cursor_resolver: cursorResolver,
      message: `Resolver polled: run=${runStatus} agent=${safeMeta.agent_status}`,
    };
  }

  if (TERMINAL_FAILURE.has(runStatus)) {
    companion.status = status;
    writeStatusJson(absolute, companion, { fromStatus: status, syncMarkdown: false });
    return {
      ok: true,
      planId: validation.planId,
      planPath: planPathRelative,
      status,
      advanced: false,
      failure: true,
      cursor_resolver: cursorResolver,
      message: `Resolver run terminal failure: ${runStatus}`,
    };
  }

  if (!advanceOnComplete) {
    writeStatusJson(absolute, companion, { fromStatus: status, syncMarkdown: false });
    return {
      ok: true,
      planId: validation.planId,
      planPath: planPathRelative,
      status,
      advanced: false,
      cursor_resolver: cursorResolver,
      message: "Resolver FINISHED (advance disabled)",
    };
  }

  const resultText =
    resultTextOverride != null
      ? resultTextOverride
      : run.result || safeMeta.result_summary || "";
  let validated;
  try {
    const raw = extractResolverResultJson(resultText);
    validated = assertResolverResultValid(raw, {
      expectedPlanId: validation.planId,
    });
  } catch (err) {
    throw new Error(`Resolver result validation failed: ${err.message}`);
  }

  const fromStatus = status === "ANALYZING_BLOCKER" ? status : "ANALYZING_BLOCKER";
  // Ensure we are on ANALYZING_BLOCKER before leaving it
  if (status !== "ANALYZING_BLOCKER") {
    if (status === "REVIEW_FAILED" || status === "BLOCKED" || status === "IN_PROGRESS") {
      companion.status = "ANALYZING_BLOCKER";
      writeStatusJson(absolute, companion, { fromStatus: status, syncMarkdown: true });
    } else {
      throw new Error(`Cannot ingest resolver result from status ${status}`);
    }
  }

  companion = readStatusJson(absolute);
  companion.cursor_resolver = {
    ...cursorResolver,
    completed_at: nowIso,
    resolver_result: validated,
  };
  companion.resolver = {
    completedAt: nowIso,
    classification: validated.classification,
    result: validated,
    source: "cursor_cloud_resolver",
  };

  let nextStatus;
  let humanPacket = null;

  if (validated.classification === "AUTONOMOUSLY_RESOLVABLE") {
    nextStatus = "RESOLUTION_PROPOSED";
    companion.resolution = {
      proposedAt: nowIso,
      remediation_plan: validated.remediation_plan,
      root_cause: validated.root_cause,
      confidence: validated.confidence,
    };
  } else if (validated.classification === "HUMAN_DECISION_REQUIRED") {
    nextStatus = "HUMAN_DECISION_REQUIRED";
    humanPacket = buildHumanDecisionPacket({
      planId: validation.planId,
      state: nextStatus,
      question: validated.human_question,
      why: validated.root_cause,
      options: [],
      recommended: validated.recommended_resolution,
      completed: [
        `Builder: ${companion.cursor_agent?.agent_id || "n/a"}`,
        `Reviewer: ${companion.cursor_reviewer?.agent_id || "n/a"}`,
      ],
      waiting: ["Human decision before further automation"],
    });
    writeHumanDecisionPacket(absolute, humanPacket);
    companion.human_decision = humanPacket;
  } else if (validated.classification === "TRANSIENT_RETRY") {
    nextStatus = "ANALYZING_BLOCKER";
    companion.transient = {
      ...(companion.transient || {}),
      last_retry_at: nowIso,
      reason: validated.root_cause,
      count: Number(companion.transient?.count || 0) + 1,
    };
  } else {
    // FATAL_INFRASTRUCTURE_BLOCK
    nextStatus = "HUMAN_DECISION_REQUIRED";
    humanPacket = buildHumanDecisionPacket({
      planId: validation.planId,
      state: nextStatus,
      question:
        validated.human_question ||
        "Infrastructure is blocked — approve retry after env fix, or abort this plan?",
      why: validated.root_cause,
      options: [
        { id: "A", label: "Retry after infra fix", behavior: "Resume orchestrator after fix" },
        { id: "B", label: "Abort plan", behavior: "Leave HUMAN_DECISION_REQUIRED / close" },
      ],
      recommended: validated.recommended_resolution,
      completed: [],
      waiting: ["Infrastructure remediation"],
    });
    writeHumanDecisionPacket(absolute, humanPacket);
    companion.human_decision = humanPacket;
  }

  companion.status = nextStatus;
  companion.merge = false;
  companion.deploy = false;
  appendAuditEventInMemory(companion, {
    timestamp: nowIso,
    fromStatus: "ANALYZING_BLOCKER",
    toStatus: nextStatus,
    actor: "resolver",
    agentId: cursorResolver.agent_id,
    runId: cursorResolver.run_id,
    result: validated.classification,
    reason: validated.root_cause,
  });

  writeStatusJson(absolute, companion, {
    fromStatus: "ANALYZING_BLOCKER",
    syncMarkdown: true,
  });

  return {
    ok: true,
    planId: validation.planId,
    planPath: planPathRelative,
    status: nextStatus,
    advanced: nextStatus !== "ANALYZING_BLOCKER" || validated.classification === "TRANSIENT_RETRY",
    classification: validated.classification,
    resolver_result: validated,
    human_decision: humanPacket,
    cursor_resolver: companion.cursor_resolver,
    message: `Resolver result ${validated.classification} → ${nextStatus}`,
  };
}

async function main() {
  const { planPath } = parseArgs(process.argv);
  if (!planPath) {
    fail("Usage: node scripts/orchestrator/status-resolver.js <plan.md>");
  }
  try {
    const result = await statusResolver(planPath);
    ok(result.message);
    emitJson(result);
  } catch (err) {
    emitJson({ ok: false, error: err.message });
    fail(err.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { statusResolver, parseArgs };
