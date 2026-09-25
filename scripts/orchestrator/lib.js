/**
 * Advisacor Development Orchestrator V1 — shared helpers.
 * Fail-closed. No secrets. No shell execution from plan content.
 * Node.js only; no external dependencies.
 */

"use strict";

const fs = require("fs");
const path = require("path");

/** Canonical V1 plan lifecycle statuses. */
const VALID_STATUSES = Object.freeze([
  "DRAFT",
  "READY_FOR_REVIEW",
  "APPROVED_FOR_IMPLEMENTATION",
  "IN_PROGRESS",
  "IMPLEMENTATION_COMPLETE",
  "REVIEW_FAILED",
  "REVIEW_PASSED",
  "READY_FOR_HUMAN_APPROVAL",
  "COMPLETED",
  "BLOCKED",
]);

/**
 * Allowed automated transitions (scripts may perform these).
 * Human-only targets must not be written by scripts.
 */
const ALLOWED_TRANSITIONS = Object.freeze({
  DRAFT: Object.freeze(["READY_FOR_REVIEW", "BLOCKED"]),
  READY_FOR_REVIEW: Object.freeze(["APPROVED_FOR_IMPLEMENTATION", "DRAFT", "BLOCKED"]),
  APPROVED_FOR_IMPLEMENTATION: Object.freeze(["IN_PROGRESS", "BLOCKED"]),
  IN_PROGRESS: Object.freeze(["IMPLEMENTATION_COMPLETE", "BLOCKED"]),
  IMPLEMENTATION_COMPLETE: Object.freeze([
    "REVIEW_PASSED",
    "REVIEW_FAILED",
    "IN_PROGRESS",
    "BLOCKED",
  ]),
  REVIEW_FAILED: Object.freeze(["IN_PROGRESS", "BLOCKED"]),
  REVIEW_PASSED: Object.freeze(["READY_FOR_HUMAN_APPROVAL", "BLOCKED"]),
  READY_FOR_HUMAN_APPROVAL: Object.freeze(["BLOCKED"]),
  COMPLETED: Object.freeze([]),
  BLOCKED: Object.freeze(["DRAFT", "READY_FOR_REVIEW"]),
});

/** Statuses scripts must never write. */
const HUMAN_ONLY_STATUSES = Object.freeze([
  "COMPLETED",
  "APPROVED_FOR_IMPLEMENTATION",
]);

/** Independent review verdicts (REVIEW_AGENT.md). */
const REVIEW_VERDICTS = Object.freeze(["PASS", "NEEDS_CHANGES", "BLOCKED"]);

/** Required ## sections (aligned to PLAN_TEMPLATE). */
const REQUIRED_PLAN_SECTIONS = Object.freeze([
  "Plan ID",
  "Title",
  "Status",
  "Objective",
  "Scope",
  "Out of Scope",
  "Security Requirements",
  "Tenant Isolation Requirements",
  "Acceptance Criteria",
  "Required Tests",
  "Validation Commands",
  "Prohibited Changes",
  "Rollback Considerations",
  "Human Approval Gate",
]);

const STATUS_LINE_RE = /^STATUS:\s*([A-Z_]+)\s*$/im;
const SECTION_HEADER_RE = /^##\s+(.+?)\s*$/gm;
const PLAN_ID_RE = /^[A-Z0-9][A-Z0-9._-]{2,127}$/;

function getRepoRoot() {
  return path.resolve(__dirname, "..", "..");
}

/**
 * Resolve a user-supplied path and ensure it stays inside the repository.
 */
function resolveSafeRepoPath(inputPath, { mustExist = false } = {}) {
  if (inputPath == null || String(inputPath).trim() === "") {
    throw new Error("Path required");
  }
  const raw = String(inputPath);
  if (raw.includes("\0")) {
    throw new Error("Invalid path: null byte");
  }
  const root = getRepoRoot();
  const absolute = path.resolve(root, raw);
  const rel = path.relative(root, absolute);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes repository root: ${raw}`);
  }
  if (mustExist && !fs.existsSync(absolute)) {
    throw new Error(`File not found: ${absolute}`);
  }
  return absolute;
}

function readText(filePath) {
  const root = getRepoRoot();
  let absolute;
  if (path.isAbsolute(filePath)) {
    const rel = path.relative(root, filePath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error(`Path escapes repository root: ${filePath}`);
    }
    absolute = filePath;
    if (!fs.existsSync(absolute)) {
      throw new Error(`File not found: ${absolute}`);
    }
  } else {
    absolute = resolveSafeRepoPath(filePath, { mustExist: true });
  }
  return { absolute, text: fs.readFileSync(absolute, "utf8") };
}

function parseStatusFromMarkdown(markdown) {
  const match = String(markdown || "").match(STATUS_LINE_RE);
  return match ? match[1].trim() : null;
}

function parseSectionHeaders(markdown) {
  const headers = [];
  let m;
  const re = new RegExp(SECTION_HEADER_RE.source, "gm");
  while ((m = re.exec(markdown)) !== null) {
    headers.push(m[1].trim());
  }
  return headers;
}

function normalizeSectionName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getStatusJsonPath(planPath) {
  const absolute = path.isAbsolute(planPath)
    ? planPath
    : resolveSafeRepoPath(planPath);
  const parsed = path.parse(absolute);
  return path.join(parsed.dir, `${parsed.name}.status.json`);
}

function readStatusJson(planPath) {
  const statusPath = getStatusJsonPath(planPath);
  if (!fs.existsSync(statusPath)) {
    return null;
  }
  let raw;
  try {
    raw = fs.readFileSync(statusPath, "utf8");
  } catch {
    throw new Error(`Unreadable status companion: ${statusPath}`);
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Malformed status companion JSON: ${statusPath}`);
  }
}

function assertNoHumanOnlyWrite(status) {
  if (HUMAN_ONLY_STATUSES.includes(status)) {
    throw new Error(
      `Refusing to write ${status}: this status is human-only`,
    );
  }
}

function assertTransitionAllowed(fromStatus, toStatus) {
  if (!VALID_STATUSES.includes(toStatus)) {
    throw new Error(`Invalid target STATUS: ${toStatus}`);
  }
  if (fromStatus && !VALID_STATUSES.includes(fromStatus)) {
    throw new Error(`Invalid source STATUS: ${fromStatus}`);
  }
  assertNoHumanOnlyWrite(toStatus);
  if (!fromStatus) {
    return;
  }
  const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus)) {
    throw new Error(`Invalid state transition: ${fromStatus} → ${toStatus}`);
  }
}

/**
 * Rewrite the markdown STATUS: line in place (LF-safe). Does not shell out.
 * Used so companion JSON and plan markdown stay synchronized during automated phases.
 */
function updateMarkdownStatus(planPath, nextStatus) {
  if (!VALID_STATUSES.includes(nextStatus)) {
    throw new Error(`Invalid STATUS for markdown update: ${nextStatus}`);
  }
  assertNoHumanOnlyWrite(nextStatus);
  const absolute = path.isAbsolute(planPath)
    ? planPath
    : resolveSafeRepoPath(planPath);
  const text = fs.readFileSync(absolute, "utf8");
  if (!STATUS_LINE_RE.test(text)) {
    throw new Error(`Cannot update markdown STATUS: STATUS line missing in ${absolute}`);
  }
  const updated = text.replace(STATUS_LINE_RE, `STATUS: ${nextStatus}`);
  fs.writeFileSync(absolute, updated, "utf8");
}

function writeStatusJson(planPath, data, { fromStatus = null, syncMarkdown = true } = {}) {
  const statusPath = getStatusJsonPath(planPath);
  const root = getRepoRoot();
  const rel = path.relative(root, statusPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Status path escapes repository root: ${statusPath}`);
  }

  const nextStatus = data?.status;
  if (!nextStatus || !VALID_STATUSES.includes(nextStatus)) {
    throw new Error(`Cannot write status JSON: invalid status ${nextStatus}`);
  }

  let prior = null;
  try {
    prior = readStatusJson(planPath);
  } catch (err) {
    throw err;
  }

  const effectiveFrom = fromStatus || prior?.status || null;

  if (effectiveFrom && effectiveFrom !== nextStatus) {
    assertTransitionAllowed(effectiveFrom, nextStatus);
  } else {
    assertNoHumanOnlyWrite(nextStatus);
  }

  if (data.planId != null && !PLAN_ID_RE.test(String(data.planId))) {
    throw new Error(`Invalid planId in status write: ${data.planId}`);
  }

  const payload = {
    ...data,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(statusPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  if (syncMarkdown) {
    updateMarkdownStatus(planPath, nextStatus);
  }

  return statusPath;
}

/**
 * Fail closed if companion JSON claims a late-stage status without evidence.
 * Prevents advancing by hand-editing status.json into an invalid state.
 */
function assertCompanionIntegrity(companion) {
  if (!companion || typeof companion !== "object") {
    return;
  }
  const status = companion.status;
  if (!status) {
    return;
  }
  if (!VALID_STATUSES.includes(status)) {
    throw new Error(`Invalid companion JSON status: ${status}`);
  }
  if (companion.merge === true || companion.deploy === true) {
    throw new Error(
      "Companion JSON must not grant merge or deploy authority",
    );
  }
  if (
    (status === "IMPLEMENTATION_COMPLETE" ||
      status === "REVIEW_PASSED" ||
      status === "REVIEW_FAILED" ||
      status === "READY_FOR_HUMAN_APPROVAL") &&
    !companion.implementation
  ) {
    throw new Error(
      `Companion integrity: status ${status} requires implementation evidence`,
    );
  }
  if (
    (status === "REVIEW_PASSED" || status === "READY_FOR_HUMAN_APPROVAL") &&
    companion.review?.verdict !== "PASS"
  ) {
    throw new Error(
      `Companion integrity: status ${status} requires review.verdict PASS`,
    );
  }
  if (
    status === "REVIEW_FAILED" &&
    (!companion.review?.verdict || companion.review.verdict === "PASS")
  ) {
    throw new Error(
      "Companion integrity: REVIEW_FAILED requires a non-PASS review verdict",
    );
  }
}

function resolveEffectiveStatus(planPath, markdown) {
  const markdownStatus = parseStatusFromMarkdown(markdown);
  const statusJson = readStatusJson(planPath);
  const jsonStatus = statusJson?.status ?? null;

  if (markdownStatus && !VALID_STATUSES.includes(markdownStatus)) {
    throw new Error(`Invalid markdown STATUS: ${markdownStatus}`);
  }
  if (jsonStatus && !VALID_STATUSES.includes(jsonStatus)) {
    throw new Error(`Invalid companion JSON status: ${jsonStatus}`);
  }
  if (markdownStatus && jsonStatus && markdownStatus !== jsonStatus) {
    throw new Error(
      `Status mismatch: markdown STATUS:${markdownStatus} vs companion JSON status:${jsonStatus}`,
    );
  }

  if (statusJson) {
    assertCompanionIntegrity(statusJson);
  }

  return jsonStatus || markdownStatus || null;
}

function extractSectionBody(markdown, sectionTitle) {
  // Do not let whitespace after the title consume newlines — that skips the
  // blank line before the next ## and incorrectly absorbs the following section.
  const re = new RegExp(
    `##\\s+${escapeRegExp(sectionTitle)}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i",
  );
  const match = String(markdown || "").match(re);
  return match ? match[1].trim() : "";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseAcceptanceCriteria(body) {
  const lines = String(body || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  return lines.filter((l) => /^([-*]|\d+[.)])\s+\S/.test(l));
}

function validatePlanStructure(planPathInput) {
  const errors = [];
  let absolute;
  let markdown;
  try {
    const read = readText(planPathInput);
    absolute = read.absolute;
    markdown = read.text;
  } catch (err) {
    return {
      ok: false,
      errors: [err.message],
      markdown: null,
      status: null,
      headers: [],
      planPath: null,
      planId: null,
      acceptanceCriteria: [],
    };
  }

  const headers = parseSectionHeaders(markdown);
  const normalized = new Set(headers.map(normalizeSectionName));

  for (const required of REQUIRED_PLAN_SECTIONS) {
    if (!normalized.has(normalizeSectionName(required))) {
      errors.push(`Missing required section: ## ${required}`);
    }
  }

  const status = parseStatusFromMarkdown(markdown);
  if (!status) {
    errors.push(
      "Missing STATUS line (expected: STATUS: <VALUE> under ## Status)",
    );
  } else if (!VALID_STATUSES.includes(status)) {
    errors.push(`Invalid STATUS value: ${status}`);
  }

  const planIdMatch = markdown.match(/^Plan ID:\s*(.+)$/im);
  const planId = planIdMatch ? planIdMatch[1].trim() : "";
  if (!planId) {
    errors.push(
      "Missing Plan ID field (expected: Plan ID: <ID> under ## Plan ID)",
    );
  } else if (!PLAN_ID_RE.test(planId)) {
    errors.push(`Invalid Plan ID format: ${planId}`);
  }

  const objective = extractSectionBody(markdown, "Objective");
  if (!objective || objective.length < 8) {
    errors.push("Missing or empty Objective section body");
  }

  const acceptanceBody = extractSectionBody(markdown, "Acceptance Criteria");
  const criteria = parseAcceptanceCriteria(acceptanceBody);
  if (!acceptanceBody || criteria.length === 0) {
    errors.push(
      "Missing or empty Acceptance Criteria (need at least one bullet item)",
    );
  }

  const securityBody = extractSectionBody(markdown, "Security Requirements");
  if (!securityBody || securityBody.length < 3) {
    errors.push("Missing or empty Security Requirements section body");
  }

  const humanGate = extractSectionBody(markdown, "Human Approval Gate");
  if (!humanGate || humanGate.length < 3) {
    errors.push("Missing or empty Human Approval Gate section body");
  }

  try {
    const companion = readStatusJson(absolute);
    if (companion) {
      if (companion.planId && planId && companion.planId !== planId) {
        errors.push(
          `Companion planId mismatch: JSON ${companion.planId} vs markdown ${planId}`,
        );
      }
      if (companion.status && status && companion.status !== status) {
        errors.push(
          `Status mismatch: markdown STATUS:${status} vs companion JSON status:${companion.status}`,
        );
      }
      try {
        assertCompanionIntegrity(companion);
      } catch (integrityErr) {
        errors.push(integrityErr.message);
      }
    }
  } catch (err) {
    errors.push(err.message);
  }

  return {
    ok: errors.length === 0,
    errors,
    markdown,
    status,
    headers,
    planPath: absolute,
    planId: planId || null,
    acceptanceCriteria: criteria,
  };
}

function parsePlanMetadata(markdown) {
  const field = (label) => {
    const re = new RegExp(`^${label}:\\s*(.+)$`, "im");
    const match = String(markdown || "").match(re);
    return match ? match[1].trim() : null;
  };

  return {
    planId: field("Plan ID"),
    title: field("Title"),
    status: parseStatusFromMarkdown(markdown),
    branch: field("Branch"),
    objective: extractSectionBody(markdown, "Objective"),
    scope: extractSectionBody(markdown, "Scope"),
    outOfScope: extractSectionBody(markdown, "Out of Scope"),
    acceptanceCriteria: parseAcceptanceCriteria(
      extractSectionBody(markdown, "Acceptance Criteria"),
    ),
    validationCommands: extractSectionBody(markdown, "Validation Commands"),
    securityRequirements: extractSectionBody(markdown, "Security Requirements"),
  };
}

function assertImplementationResultValid(results, expectedPlanId) {
  if (results == null || typeof results !== "object" || Array.isArray(results)) {
    throw new Error("Implementation results must be a JSON object");
  }
  if (!results.planId) {
    throw new Error("Implementation results missing PLAN_ID / planId");
  }
  if (expectedPlanId && results.planId !== expectedPlanId) {
    throw new Error(
      `PLAN_ID mismatch in results: ${results.planId} != ${expectedPlanId}`,
    );
  }
  if (results.success === false || results.validationFailed === true) {
    throw new Error(
      "Cannot record successful implementation: validation failed",
    );
  }
  const gates = ["lint", "typecheck", "tests", "build"];
  for (const g of gates) {
    const v = results[g];
    if (v === "fail" || v === "FAIL" || v === false) {
      throw new Error(
        `Cannot record successful implementation: ${g} failed`,
      );
    }
  }
}

function assertNoProductionAuthority(payload) {
  const banned = ["merge", "deploy", "production_deploy", "auto_merge"];
  for (const key of banned) {
    if (payload && payload[key] === true) {
      throw new Error(`Production authority flag forbidden: ${key}`);
    }
  }
}

/**
 * Ensure a plan path resolves inside docs/plans/ (or configured plans dir).
 */
function assertPlanInPlansDirectory(absolutePlanPath, plansDirRelative = "docs/plans") {
  const root = getRepoRoot();
  const plansRoot = path.resolve(root, plansDirRelative);
  const absolute = path.resolve(absolutePlanPath);
  const rel = path.relative(plansRoot, absolute);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(
      `Plan path must be inside ${plansDirRelative}/: ${absolutePlanPath}`,
    );
  }
  return absolute;
}

function toRepoRelative(absolutePath) {
  const root = getRepoRoot();
  const rel = path.relative(root, absolutePath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes repository root: ${absolutePath}`);
  }
  return rel.split(path.sep).join("/");
}

function hasActiveCursorAgent(companion) {
  const agent = companion?.cursor_agent;
  if (!agent || typeof agent !== "object") return false;
  if (!agent.agent_id) return false;
  return true;
}

function hasActiveReviewerAgent(companion) {
  const agent = companion?.cursor_reviewer;
  if (!agent || typeof agent !== "object") return false;
  if (!agent.agent_id) return false;
  return true;
}

function sanitizeCursorAgentRecord(record) {
  if (!record || typeof record !== "object") return null;
  const allowed = [
    "agent_id",
    "run_id",
    "status",
    "agent_status",
    "run_status",
    "branch",
    "pr_url",
    "agent_url",
    "latest_run_id",
    "launched_at",
    "last_checked_at",
    "result_summary",
    "duration_ms",
  ];
  const out = {};
  for (const key of allowed) {
    if (record[key] !== undefined) out[key] = record[key];
  }
  delete out.api_key;
  delete out.authorization;
  delete out.CURSOR_API_KEY;
  return out;
}

function fail(message, code = 1) {
  console.error(`[orchestrator] ERROR: ${message}`);
  process.exit(code);
}

function ok(message) {
  console.log(`[orchestrator] OK: ${message}`);
}

function emitJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

module.exports = {
  VALID_STATUSES,
  ALLOWED_TRANSITIONS,
  HUMAN_ONLY_STATUSES,
  REVIEW_VERDICTS,
  REQUIRED_PLAN_SECTIONS,
  PLAN_ID_RE,
  getRepoRoot,
  resolveSafeRepoPath,
  readText,
  parseStatusFromMarkdown,
  parseSectionHeaders,
  getStatusJsonPath,
  readStatusJson,
  writeStatusJson,
  resolveEffectiveStatus,
  validatePlanStructure,
  parsePlanMetadata,
  parseAcceptanceCriteria,
  assertTransitionAllowed,
  assertCompanionIntegrity,
  assertImplementationResultValid,
  assertNoProductionAuthority,
  assertPlanInPlansDirectory,
  toRepoRelative,
  hasActiveCursorAgent,
  hasActiveReviewerAgent,
  sanitizeCursorAgentRecord,
  extractSectionBody,
  updateMarkdownStatus,
  fail,
  ok,
  emitJson,
};
