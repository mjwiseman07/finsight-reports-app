/**
 * Poll remediation builder; on FINISHED → REMEDIATION_COMPLETE → IMPLEMENTATION_COMPLETE
 * (clears prior reviewer so a NEW independent review can run).
 *
 * Usage:
 *   node scripts/orchestrator/status-remediation.js <plan.md>
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
const { fetchPullRequest, assertBuilderPrEligible } = require("./github-pr");
const { appendAuditEventInMemory } = require("./audit-trail");

const REMEDIATION_IN_PROGRESS = "REMEDIATION_IN_PROGRESS";
const REMEDIATION_COMPLETE = "REMEDIATION_COMPLETE";
const IMPLEMENTATION_COMPLETE = "IMPLEMENTATION_COMPLETE";
const TERMINAL_SUCCESS = new Set(["FINISHED"]);
const TERMINAL_FAILURE = new Set(["ERROR", "CANCELLED", "EXPIRED"]);

function parseArgs(argv) {
  const planPath = argv[2];
  for (let i = 3; i < argv.length; i += 1) {
    if (argv[i].startsWith("-")) fail(`Unexpected argument: ${argv[i]}`);
  }
  return { planPath };
}

async function statusRemediation(planPathInput, {
  fetchImpl = undefined,
  githubFetchImpl = undefined,
  env = process.env,
  now = () => new Date().toISOString(),
  advanceOnComplete = true,
} = {}) {
  if (!planPathInput) {
    throw new Error(
      "Usage: node scripts/orchestrator/status-remediation.js <plan.md>",
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
  if (!companion?.cursor_remediation?.agent_id || !companion?.cursor_remediation?.run_id) {
    throw new Error("No cursor_remediation association; launch remediation first");
  }

  const apiKey = getApiKey({ env });
  const client = createCursorCloudClient({ fetchImpl, env });
  let agent;
  let run;
  try {
    agent = await client.getAgent(companion.cursor_remediation.agent_id);
    run = await client.getRun(
      companion.cursor_remediation.agent_id,
      companion.cursor_remediation.run_id,
    );
  } catch (err) {
    const msg =
      err instanceof CursorCloudAgentError
        ? redactSecrets(err.message, apiKey)
        : redactSecrets(err.message || String(err), apiKey);
    throw new Error(`Remediation status poll failed: ${msg}`);
  }

  const safeMeta = extractSafeRunMetadata(run, agent);
  const nowIso = now();
  const cursorRemediation = sanitizeCursorAgentRecord({
    ...companion.cursor_remediation,
    ...safeMeta,
    last_checked_at: nowIso,
  });
  const runStatus = String(safeMeta.run_status || "").toUpperCase();

  companion = { ...companion, cursor_remediation: cursorRemediation };

  if (!TERMINAL_SUCCESS.has(runStatus) && !TERMINAL_FAILURE.has(runStatus)) {
    writeStatusJson(absolute, companion, { fromStatus: status, syncMarkdown: false });
    return {
      ok: true,
      planId: validation.planId,
      planPath: planPathRelative,
      status,
      advanced: false,
      cursor_remediation: cursorRemediation,
      message: `Remediation polled: run=${runStatus}`,
    };
  }

  if (TERMINAL_FAILURE.has(runStatus)) {
    companion.status = "ANALYZING_BLOCKER";
    appendAuditEventInMemory(companion, {
      timestamp: nowIso,
      fromStatus: status,
      toStatus: "ANALYZING_BLOCKER",
      actor: "remediation_builder",
      agentId: cursorRemediation.agent_id,
      runId: cursorRemediation.run_id,
      result: runStatus,
      reason: "Remediation run failed; re-analyze",
    });
    writeStatusJson(absolute, companion, {
      fromStatus: REMEDIATION_IN_PROGRESS,
      syncMarkdown: true,
    });
    return {
      ok: true,
      planId: validation.planId,
      status: "ANALYZING_BLOCKER",
      advanced: true,
      failure: true,
      message: `Remediation failed (${runStatus}) → ANALYZING_BLOCKER`,
    };
  }

  if (!advanceOnComplete) {
    writeStatusJson(absolute, companion, { fromStatus: status, syncMarkdown: false });
    return {
      ok: true,
      planId: validation.planId,
      status,
      advanced: false,
      message: "Remediation FINISHED (advance disabled)",
    };
  }

  // Refresh PR head SHA
  const prUrl = companion.cursor_agent?.pr_url;
  if (!prUrl) throw new Error("Builder PR URL missing after remediation");
  const pr = await fetchPullRequest(prUrl, {
    fetchImpl: githubFetchImpl || fetchImpl || globalThis.fetch,
  });
  assertBuilderPrEligible(pr, { expectedUrl: prUrl });
  if (pr.headRef !== companion.cursor_agent.branch) {
    throw new Error(
      `Post-remediation branch mismatch: ${pr.headRef} != ${companion.cursor_agent.branch}`,
    );
  }

  companion.builder_head_sha = pr.headSha;
  companion.cursor_remediation = {
    ...cursorRemediation,
    completed_at: nowIso,
  };
  companion.remediation = {
    ...(companion.remediation || {}),
    last_completed_at: nowIso,
    last_head_sha: pr.headSha,
  };

  // Step 1: REMEDIATION_COMPLETE
  companion.status = REMEDIATION_COMPLETE;
  appendAuditEventInMemory(companion, {
    timestamp: nowIso,
    fromStatus: REMEDIATION_IN_PROGRESS,
    toStatus: REMEDIATION_COMPLETE,
    actor: "remediation_builder",
    agentId: cursorRemediation.agent_id,
    runId: cursorRemediation.run_id,
    pr: prUrl,
    commitSha: pr.headSha,
    result: "FINISHED",
    reason: "Remediation complete; preparing re-review",
  });
  writeStatusJson(absolute, companion, {
    fromStatus: REMEDIATION_IN_PROGRESS,
    syncMarkdown: true,
  });

  // Step 2: IMPLEMENTATION_COMPLETE + clear prior reviewer (force NEW review)
  companion = readStatusJson(absolute);
  companion.status = IMPLEMENTATION_COMPLETE;
  companion.phase = "review";
  companion.previous_review = companion.review || null;
  companion.previous_cursor_reviewer = companion.cursor_reviewer || null;
  delete companion.review;
  delete companion.cursor_reviewer;
  companion.builder_head_sha = pr.headSha;
  companion.merge = false;
  companion.deploy = false;
  appendAuditEventInMemory(companion, {
    timestamp: nowIso,
    fromStatus: REMEDIATION_COMPLETE,
    toStatus: IMPLEMENTATION_COMPLETE,
    actor: "orchestrator",
    pr: prUrl,
    commitSha: pr.headSha,
    result: "READY_FOR_RE_REVIEW",
    reason: "Cleared prior review; new reviewer required for new head SHA",
  });
  writeStatusJson(absolute, companion, {
    fromStatus: REMEDIATION_COMPLETE,
    syncMarkdown: true,
  });

  return {
    ok: true,
    planId: validation.planId,
    planPath: planPathRelative,
    status: IMPLEMENTATION_COMPLETE,
    advanced: true,
    builder_head_sha: pr.headSha,
    cursor_remediation: cursorRemediation,
    message:
      "Remediation FINISHED → REMEDIATION_COMPLETE → IMPLEMENTATION_COMPLETE (re-review required)",
  };
}

async function main() {
  const { planPath } = parseArgs(process.argv);
  if (!planPath) {
    fail("Usage: node scripts/orchestrator/status-remediation.js <plan.md>");
  }
  try {
    const result = await statusRemediation(planPath);
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

module.exports = { statusRemediation, parseArgs };
