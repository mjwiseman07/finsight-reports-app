/**
 * Machine-readable blocker packet for the resolver / architect agent.
 * Fail-closed. No secrets. Concise evidence only.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { resolveSafeRepoPath, getRepoRoot } = require("./lib");

const MAX_STRING = 800;
const MAX_ARRAY = 40;
const MAX_FINDINGS = 25;
const SECRET_KEY_RE =
  /^(?:.*(?:api[_-]?key|authorization|password|secret|token|credential|private[_-]?key).*)$/i;
const SECRET_VALUE_RE =
  /\b(?:sk[-_]live[-_]|sk[-_]test[-_]|ghp_|github_pat_|xox[baprs]-|Bearer\s+[A-Za-z0-9\-._~+/]+=*)/i;

function getBlockerPacketPath(planPath) {
  const absolute = path.isAbsolute(planPath)
    ? planPath
    : resolveSafeRepoPath(planPath);
  const parsed = path.parse(absolute);
  return path.join(parsed.dir, `${parsed.name}.blocker.json`);
}

function truncateString(value, max = MAX_STRING) {
  const text = String(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…[truncated ${text.length - max} chars]`;
}

function redactValue(value, depth = 0) {
  if (depth > 6) return "[truncated-depth]";
  if (value == null) return value;
  if (typeof value === "string") {
    if (SECRET_VALUE_RE.test(value)) {
      return "[REDACTED]";
    }
    return truncateString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((item) => redactValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, child] of Object.entries(value)) {
      if (SECRET_KEY_RE.test(key)) {
        out[key] = "[REDACTED]";
        continue;
      }
      out[key] = redactValue(child, depth + 1);
    }
    return out;
  }
  return truncateString(String(value), 120);
}

function safeAgentSlice(agent) {
  if (!agent || typeof agent !== "object") return null;
  return redactValue({
    agent_id: agent.agent_id || null,
    run_id: agent.run_id || agent.latest_run_id || null,
    status: agent.run_status || agent.status || null,
    branch: agent.branch || null,
    pr_url: agent.pr_url || null,
  });
}

function summarizeFindings(findings) {
  if (!Array.isArray(findings)) return [];
  return findings.slice(0, MAX_FINDINGS).map((f) =>
    redactValue({
      severity: f?.severity || null,
      requirement: f?.requirement || null,
      file: f?.file || null,
      location: f?.location || null,
      explanation: f?.explanation || null,
      remediation: f?.remediation || null,
    }),
  );
}

/**
 * Build a concise blocker packet from companion status + plan metadata.
 * @param {object|null} companion
 * @param {object|null} planMeta - from parsePlanMetadata / validatePlanStructure
 * @param {object} [extras]
 */
function buildBlockerPacket(companion, planMeta, extras = {}) {
  const c = companion && typeof companion === "object" ? companion : {};
  const meta = planMeta && typeof planMeta === "object" ? planMeta : {};
  const rem = c.remediation && typeof c.remediation === "object" ? c.remediation : {};
  const review = c.review && typeof c.review === "object" ? c.review : {};
  const reviewResult = review.result || review;
  const impl = c.implementation && typeof c.implementation === "object" ? c.implementation : {};
  const implResults = impl.results && typeof impl.results === "object" ? impl.results : {};

  const retryCount =
    extras.retry_count != null
      ? Number(extras.retry_count)
      : rem.cycle_number != null
        ? Number(rem.cycle_number)
        : 0;
  const maxRetries =
    extras.maximum_retry_count != null
      ? Number(extras.maximum_retry_count)
      : rem.max_cycles != null
        ? Number(rem.max_cycles)
        : null;

  const findings =
    extras.review_findings ||
    reviewResult?.findings ||
    review.findings ||
    [];

  const packet = {
    schema: "advisacor.blocker_packet.v1",
    plan_id: meta.planId || c.planId || extras.plan_id || null,
    current_state: c.status || meta.status || extras.current_state || null,
    approved_plan_path:
      extras.approved_plan_path || c.planPath || meta.planPath || null,
    approved_plan_commit: extras.approved_plan_commit || c.plan_commit || null,
    builder_agent_id: c.cursor_agent?.agent_id || null,
    builder_run_id: c.cursor_agent?.run_id || c.cursor_agent?.latest_run_id || null,
    builder_branch: c.cursor_agent?.branch || extras.builder_branch || null,
    builder_pr: c.cursor_agent?.pr_url || extras.builder_pr || null,
    builder_head_sha: c.builder_head_sha || extras.builder_head_sha || null,
    reviewer_agent_id: c.cursor_reviewer?.agent_id || null,
    reviewer_run_id:
      c.cursor_reviewer?.run_id || c.cursor_reviewer?.latest_run_id || null,
    review_result: review.verdict || reviewResult?.review_result || null,
    review_findings: summarizeFindings(findings),
    failed_acceptance_criteria: redactValue(
      extras.failed_acceptance_criteria ||
        (Array.isArray(reviewResult?.acceptance_criteria)
          ? reviewResult.acceptance_criteria.filter((a) => {
              const st = String(a?.status || "").toUpperCase();
              return st === "FAIL" || st === "UNCLEAR";
            })
          : []),
    ),
    validation_failures: redactValue(
      extras.validation_failures || implResults.validationFailures || null,
    ),
    test_failures: redactValue(extras.test_failures || implResults.tests || null),
    lint_failures: redactValue(extras.lint_failures || implResults.lint || null),
    typecheck_failures: redactValue(
      extras.typecheck_failures || implResults.typecheck || null,
    ),
    build_failures: redactValue(extras.build_failures || implResults.build || null),
    relevant_changed_files: redactValue(
      extras.relevant_changed_files || implResults.changedFiles || [],
    ),
    git_diff_summary: redactValue(extras.git_diff_summary || null),
    recent_agent_attempts: redactValue(
      extras.recent_agent_attempts || rem.attempts || [],
    ),
    previous_resolutions: redactValue(
      extras.previous_resolutions || rem.previous_resolutions || [],
    ),
    current_error_messages: redactValue(extras.current_error_messages || []),
    security_context: redactValue(
      extras.security_context || {
        merge: false,
        deploy: false,
        notes: meta.securityRequirements
          ? truncateString(meta.securityRequirements, 400)
          : null,
      },
    ),
    database_context: redactValue(extras.database_context || null),
    scope_constraints: redactValue(
      extras.scope_constraints || {
        scope: meta.scope ? truncateString(meta.scope, 400) : null,
        out_of_scope: meta.outOfScope
          ? truncateString(meta.outOfScope, 400)
          : null,
      },
    ),
    prohibited_changes: redactValue(extras.prohibited_changes || null),
    retry_count: Number.isFinite(retryCount) ? retryCount : 0,
    maximum_retry_count: maxRetries,
    agents: {
      builder: safeAgentSlice(c.cursor_agent),
      reviewer: safeAgentSlice(c.cursor_reviewer),
      resolver: safeAgentSlice(c.cursor_resolver),
    },
    pr: c.cursor_agent?.pr_url || extras.builder_pr || null,
    sha: c.builder_head_sha || extras.builder_head_sha || null,
    created_at: extras.created_at || new Date().toISOString(),
    merge: false,
    deploy: false,
  };

  return redactValue(packet);
}

function writeBlockerPacket(planPath, packet) {
  const packetPath = getBlockerPacketPath(planPath);
  const root = getRepoRoot();
  const rel = path.relative(root, packetPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Blocker packet path escapes repository root: ${packetPath}`);
  }
  if (!packet || typeof packet !== "object" || Array.isArray(packet)) {
    throw new Error("Blocker packet must be a JSON object");
  }
  if (packet.merge === true || packet.deploy === true) {
    throw new Error("Blocker packet must not grant merge or deploy authority");
  }
  const payload = redactValue({
    ...packet,
    merge: false,
    deploy: false,
    updated_at: new Date().toISOString(),
  });
  fs.writeFileSync(packetPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return packetPath;
}

function readBlockerPacket(planPath) {
  const packetPath = getBlockerPacketPath(planPath);
  if (!fs.existsSync(packetPath)) {
    return null;
  }
  let raw;
  try {
    raw = fs.readFileSync(packetPath, "utf8");
  } catch {
    throw new Error(`Unreadable blocker packet: ${packetPath}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Malformed blocker packet JSON: ${packetPath}`);
  }
}

module.exports = {
  getBlockerPacketPath,
  buildBlockerPacket,
  writeBlockerPacket,
  readBlockerPacket,
  redactValue,
  redactSecretsDeep: redactValue,
  truncateString,
};
