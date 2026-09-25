/**
 * Launch remediation builder on the SAME builder PR branch.
 *
 * Usage:
 *   node scripts/orchestrator/launch-remediation.js <plan.md> [--dry-run]
 *
 * Requires RESOLUTION_PROPOSED + verified PR/branch safety checks.
 * Never targets main.
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
  getRemediationCycle,
  assertRemediationBudget,
  extractSectionBody,
  fail,
  ok,
  emitJson,
} = require("./lib");
const {
  CursorCloudAgentError,
  buildRemediationAgentRequest,
  extractSafeAgentMetadata,
  createCursorCloudClient,
  redactSecrets,
  getApiKey,
} = require("./cursor-cloud-agent");
const { buildRemediationPrompt } = require("./remediation-prompt-builder");
const {
  fetchPullRequest,
  assertBuilderPrEligible,
} = require("./github-pr");
const { appendAuditEventInMemory } = require("./audit-trail");

const RESOLUTION_PROPOSED = "RESOLUTION_PROPOSED";
const REMEDIATION_IN_PROGRESS = "REMEDIATION_IN_PROGRESS";

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

function assertRemediationBranchSafe(pr, companion) {
  const recordedBranch = companion.cursor_agent?.branch;
  if (!recordedBranch) {
    throw new Error("Builder branch missing from cursor_agent metadata");
  }
  if (recordedBranch === "main" || recordedBranch === "master") {
    throw new Error("Remediation refuses builder branch main/master");
  }
  if (pr.headRef !== recordedBranch) {
    throw new Error(
      `Builder branch mismatch: PR head ${pr.headRef} != recorded ${recordedBranch}`,
    );
  }
  if (pr.baseRef !== "main") {
    throw new Error(`Builder PR must target main (base=${pr.baseRef})`);
  }
  if (companion.builder_head_sha && pr.headSha !== companion.builder_head_sha) {
    // Allow if PR advanced from prior remediation — update will capture new SHA.
    // Still require sha present.
  }
  if (!pr.headSha) throw new Error("PR missing head SHA");
  return true;
}

async function launchRemediation(planPathInput, {
  dryRun = false,
  fetchImpl = undefined,
  githubFetchImpl = undefined,
  env = process.env,
  now = () => new Date().toISOString(),
} = {}) {
  if (!planPathInput) {
    throw new Error(
      "Usage: node scripts/orchestrator/launch-remediation.js <plan.md> [--dry-run]",
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
  if (status !== RESOLUTION_PROPOSED) {
    throw new Error(
      `Cannot launch remediation: STATUS is ${status || "MISSING"}, required ${RESOLUTION_PROPOSED}`,
    );
  }

  let companion = readStatusJson(absolute);
  if (!companion) throw new Error("Missing companion status JSON");

  assertRemediationBudget(companion, config.MAX_REMEDIATION_CYCLES);

  const remediationPlan =
    companion.resolution?.remediation_plan ||
    companion.resolver?.result?.remediation_plan;
  if (!remediationPlan) {
    throw new Error("RESOLUTION_PROPOSED missing remediation_plan");
  }

  const builder = companion.cursor_agent;
  if (!builder?.agent_id || !builder?.pr_url || !builder?.branch) {
    throw new Error("Builder cursor_agent metadata incomplete for remediation");
  }

  if (companion.cursor_remediation?.agent_id) {
    const rs = String(
      companion.cursor_remediation.run_status || companion.cursor_remediation.status || "",
    ).toUpperCase();
    if (!["FINISHED", "ERROR", "CANCELLED", "EXPIRED"].includes(rs)) {
      throw new Error(
        `Remediation agent already active: ${companion.cursor_remediation.agent_id}`,
      );
    }
  }

  let pr;
  try {
    pr = await fetchPullRequest(builder.pr_url, {
      fetchImpl: githubFetchImpl || fetchImpl || globalThis.fetch,
    });
    assertBuilderPrEligible(pr, { expectedUrl: builder.pr_url });
    assertRemediationBranchSafe(pr, companion);
  } catch (err) {
    throw new Error(`Remediation branch verification failed: ${err.message}`);
  }

  const meta = parsePlanMetadata(validation.markdown);
  const cycle = getRemediationCycle(companion) + 1;
  const promptText = buildRemediationPrompt({
    planId: meta.planId,
    planPathRelative,
    remediationPlan,
    resolverResult: companion.resolver?.result || null,
    reviewFindings: companion.review?.result?.findings || companion.review?.findings || [],
    previousAttempts: companion.remediation?.attempts || [],
    prohibitedChanges: extractSectionBody(validation.markdown, "Prohibited Changes"),
  });

  const createBody = buildRemediationAgentRequest({
    promptText,
    name: `Advisacor remediate ${meta.planId} c${cycle}`.slice(0, 100),
    prUrl: builder.pr_url,
    builderBranch: builder.branch,
    builderHeadSha: pr.headSha,
    verified: true,
  });

  if (createBody.workOnCurrentBranch !== true) {
    throw new Error("Remediation request must use verified workOnCurrentBranch");
  }
  if (createBody.autoCreatePR !== false) {
    throw new Error("Remediation must not autoCreatePR");
  }
  if (!createBody.repos?.[0]?.prUrl) {
    throw new Error("Remediation must include repos[0].prUrl");
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
      builderBranch: builder.branch,
      builderPr: builder.pr_url,
      builderHeadSha: pr.headSha,
      cycle,
      apiKeyConfigured,
      request: sanitizedRequest,
      networkCalled: false,
      statusChanged: false,
      message: "Remediation dry-run complete: branch verified; no API call.",
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
    throw new Error(`Cursor remediation create failed; status unchanged: ${msg}`);
  }

  const safeMeta = extractSafeAgentMetadata(apiResponse);
  if (
    safeMeta.agent_id === builder.agent_id ||
    safeMeta.agent_id === companion.cursor_reviewer?.agent_id ||
    safeMeta.agent_id === companion.cursor_resolver?.agent_id
  ) {
    throw new Error(
      "Refusing remediation: agent_id collides with builder/reviewer/resolver",
    );
  }

  const launchedAt = now();
  const cursorRemediation = sanitizeCursorAgentRecord({
    ...safeMeta,
    launched_at: launchedAt,
    last_checked_at: launchedAt,
  });

  const attempts = Array.isArray(companion.remediation?.attempts)
    ? companion.remediation.attempts.slice()
    : [];
  attempts.push({
    cycle,
    agent_id: cursorRemediation.agent_id,
    run_id: cursorRemediation.run_id,
    launched_at: launchedAt,
    head_sha_before: pr.headSha,
  });

  let next = {
    ...companion,
    planId: meta.planId,
    planPath: absolute,
    status: REMEDIATION_IN_PROGRESS,
    phase: "remediation",
    cursor_remediation: cursorRemediation,
    remediation: {
      ...(companion.remediation || {}),
      cycle_number: cycle,
      max_cycles: config.MAX_REMEDIATION_CYCLES,
      attempts,
      builder_attempts: Number(companion.remediation?.builder_attempts || 0) + 1,
    },
    merge: false,
    deploy: false,
  };
  appendAuditEventInMemory(next, {
    timestamp: launchedAt,
    fromStatus: RESOLUTION_PROPOSED,
    toStatus: REMEDIATION_IN_PROGRESS,
    actor: "remediation_builder",
    agentId: cursorRemediation.agent_id,
    runId: cursorRemediation.run_id,
    pr: builder.pr_url,
    commitSha: pr.headSha,
    result: "LAUNCHED",
    reason: `Remediation cycle ${cycle}`,
  });

  writeStatusJson(absolute, next, {
    fromStatus: RESOLUTION_PROPOSED,
    syncMarkdown: true,
  });

  return {
    ok: true,
    dryRun: false,
    planId: meta.planId,
    planPath: planPathRelative,
    status: REMEDIATION_IN_PROGRESS,
    cursor_remediation: cursorRemediation,
    cycle,
    builder_pr: builder.pr_url,
    builder_branch: builder.branch,
    networkCalled: true,
    statusChanged: true,
    message: `Remediation launched cycle=${cycle} agent_id=${cursorRemediation.agent_id}`,
  };
}

async function main() {
  const { planPath, dryRun } = parseArgs(process.argv);
  if (!planPath) {
    fail("Usage: node scripts/orchestrator/launch-remediation.js <plan.md> [--dry-run]");
  }
  try {
    const result = await launchRemediation(planPath, { dryRun });
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

module.exports = { launchRemediation, parseArgs, assertRemediationBranchSafe };
