/**
 * Advisacor Development Orchestrator V1 — shared helpers.
 * Node.js only; no external dependencies.
 */

const fs = require("fs");
const path = require("path");

/** Valid plan lifecycle statuses (V1). */
const VALID_STATUSES = [
  "DRAFT",
  "APPROVED_FOR_IMPLEMENTATION",
  "IN_IMPLEMENTATION",
  "IMPLEMENTATION_COMPLETE",
  "IN_REVIEW",
  "REVIEW_PASS",
  "REVIEW_FAIL",
  "READY_FOR_HUMAN_REVIEW",
  "APPROVED_FOR_MERGE",
  "REJECTED",
  "CANCELLED",
];

/** Required ## sections in every plan document. */
const REQUIRED_PLAN_SECTIONS = [
  "Plan ID",
  "Title",
  "Status",
  "Objective",
  "Scope",
  "Out of Scope",
  "Risks and Constraints",
  "Validation Plan",
  "Rollback Plan",
  "Approval",
];

const STATUS_LINE_RE = /^STATUS:\s*([A-Z_]+)\s*$/im;
const SECTION_HEADER_RE = /^##\s+(.+?)\s*$/gm;

function readText(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function parseStatusFromMarkdown(markdown) {
  const match = markdown.match(STATUS_LINE_RE);
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
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

function getStatusJsonPath(planPath) {
  const parsed = path.parse(planPath);
  return path.join(parsed.dir, `${parsed.name}.status.json`);
}

function readStatusJson(planPath) {
  const statusPath = getStatusJsonPath(planPath);
  if (!fs.existsSync(statusPath)) {
    return null;
  }
  const raw = fs.readFileSync(statusPath, "utf8");
  return JSON.parse(raw);
}

function writeStatusJson(planPath, data) {
  const statusPath = getStatusJsonPath(planPath);
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(statusPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  return statusPath;
}

function resolveEffectiveStatus(planPath, markdown) {
  const markdownStatus = parseStatusFromMarkdown(markdown);
  const statusJson = readStatusJson(planPath);
  const jsonStatus = statusJson?.status ?? null;

  if (markdownStatus && jsonStatus && markdownStatus !== jsonStatus) {
    throw new Error(
      `Status mismatch: markdown STATUS:${markdownStatus} vs companion JSON status:${jsonStatus}`,
    );
  }

  return jsonStatus || markdownStatus;
}

function validatePlanStructure(planPath) {
  const errors = [];
  const markdown = readText(planPath);
  const headers = parseSectionHeaders(markdown);
  const normalized = new Set(headers.map(normalizeSectionName));

  for (const required of REQUIRED_PLAN_SECTIONS) {
    if (!normalized.has(normalizeSectionName(required))) {
      errors.push(`Missing required section: ## ${required}`);
    }
  }

  const status = parseStatusFromMarkdown(markdown);
  if (!status) {
    errors.push("Missing STATUS line (expected: STATUS: <VALUE> under ## Status)");
  } else if (!VALID_STATUSES.includes(status)) {
    errors.push(`Invalid STATUS value: ${status}`);
  }

  const planIdMatch = markdown.match(/^Plan ID:\s*(.+)$/im);
  if (!planIdMatch || !planIdMatch[1].trim()) {
    errors.push("Missing Plan ID field (expected: Plan ID: <ID> under ## Plan ID)");
  }

  return { ok: errors.length === 0, errors, markdown, status, headers };
}

function parsePlanMetadata(markdown) {
  const field = (label) => {
    const re = new RegExp(`^${label}:\\s*(.+)$`, "im");
    const match = markdown.match(re);
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
    validationPlan: extractSectionBody(markdown, "Validation Plan"),
  };
}

function extractSectionBody(markdown, sectionTitle) {
  const re = new RegExp(
    `##\\s+${escapeRegExp(sectionTitle)}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`,
    "i",
  );
  const match = markdown.match(re);
  return match ? match[1].trim() : "";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
  REQUIRED_PLAN_SECTIONS,
  readText,
  parseStatusFromMarkdown,
  parseSectionHeaders,
  getStatusJsonPath,
  readStatusJson,
  writeStatusJson,
  resolveEffectiveStatus,
  validatePlanStructure,
  parsePlanMetadata,
  fail,
  ok,
  emitJson,
};
