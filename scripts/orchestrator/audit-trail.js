/**
 * Append-only audit trail for orchestrator plan lifecycle events.
 * Stored in companion.audit_trail (capped) and optional <plan>.audit.jsonl.
 * Never stores secrets.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const {
  resolveSafeRepoPath,
  getRepoRoot,
  readStatusJson,
  getStatusJsonPath,
} = require("./lib");
const { redactValue } = require("./blocker-packet");

const MAX_AUDIT_EVENTS = 200;

const ALLOWED_EVENT_KEYS = Object.freeze([
  "timestamp",
  "fromStatus",
  "toStatus",
  "actor",
  "agentId",
  "runId",
  "pr",
  "commitSha",
  "result",
  "reason",
]);

function getAuditJsonlPath(planPath) {
  const absolute = path.isAbsolute(planPath)
    ? planPath
    : resolveSafeRepoPath(planPath);
  const parsed = path.parse(absolute);
  return path.join(parsed.dir, `${parsed.name}.audit.jsonl`);
}

function sanitizeAuditEvent(event) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw new Error("Audit event must be a JSON object");
  }
  const out = {};
  for (const key of ALLOWED_EVENT_KEYS) {
    if (event[key] !== undefined && event[key] !== null) {
      out[key] = event[key];
    }
  }
  if (!out.timestamp) {
    out.timestamp = new Date().toISOString();
  }
  // Explicitly strip common secret fields if a caller spreads an object
  delete out.api_key;
  delete out.authorization;
  delete out.CURSOR_API_KEY;
  delete out.token;
  delete out.password;
  delete out.secret;

  const redacted = redactValue(out);
  if (redacted.merge === true || redacted.deploy === true) {
    throw new Error("Audit event must not grant merge or deploy authority");
  }
  return redacted;
}

function appendAuditJsonl(planPath, event) {
  const jsonlPath = getAuditJsonlPath(planPath);
  const root = getRepoRoot();
  const rel = path.relative(root, jsonlPath);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Audit jsonl path escapes repository root: ${jsonlPath}`);
  }
  fs.appendFileSync(jsonlPath, `${JSON.stringify(event)}\n`, "utf8");
  return jsonlPath;
}

/**
 * Append an audit event into companion.audit_trail and optional jsonl sidecar.
 * Does not change status. Fail-closed on path escape / malformed events.
 *
 * @param {string} planPath
 * @param {object} event
 * @param {object} [options]
 * @param {boolean} [options.writeJsonl=true]
 * @param {object|null} [options.companion] - if provided, mutate in place and return;
 *   if omitted, read companion (may be null) and write companion when present
 * @returns {{ event: object, companion: object|null, jsonlPath: string|null }}
 */
function appendAuditEvent(planPath, event, options = {}) {
  const { writeJsonl = true, companion: companionIn = undefined } = options;
  const safeEvent = sanitizeAuditEvent(event);

  let companion =
    companionIn !== undefined ? companionIn : readStatusJson(planPath);

  if (companion && typeof companion === "object") {
    const trail = Array.isArray(companion.audit_trail)
      ? companion.audit_trail.slice()
      : [];
    trail.push(safeEvent);
    while (trail.length > MAX_AUDIT_EVENTS) {
      trail.shift();
    }
    companion = {
      ...companion,
      audit_trail: trail,
    };

    // Persist companion only when it already exists on disk (do not invent status).
    const statusPath = getStatusJsonPath(planPath);
    if (fs.existsSync(statusPath) && companionIn === undefined) {
      const root = getRepoRoot();
      const rel = path.relative(root, statusPath);
      if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error(`Status path escapes repository root: ${statusPath}`);
      }
      const payload = {
        ...companion,
        updatedAt: new Date().toISOString(),
      };
      // Never persist secrets
      delete payload.api_key;
      delete payload.authorization;
      delete payload.CURSOR_API_KEY;
      fs.writeFileSync(statusPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    }
  }

  let jsonlPath = null;
  if (writeJsonl) {
    jsonlPath = appendAuditJsonl(planPath, safeEvent);
  }

  return { event: safeEvent, companion, jsonlPath };
}

function readAuditTrail(planPath) {
  const companion = readStatusJson(planPath);
  const fromCompanion = Array.isArray(companion?.audit_trail)
    ? companion.audit_trail
    : [];

  const jsonlPath = getAuditJsonlPath(planPath);
  const fromJsonl = [];
  if (fs.existsSync(jsonlPath)) {
    const raw = fs.readFileSync(jsonlPath, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        fromJsonl.push(JSON.parse(line));
      } catch {
        // skip malformed lines fail-soft for read helpers
      }
    }
  }

  return {
    companion: fromCompanion,
    jsonl: fromJsonl,
  };
}

/**
 * Append event into an in-memory companion object without disk write.
 * Caller is expected to persist via writeStatusJson.
 */
function appendAuditEventInMemory(companion, event) {
  if (!companion || typeof companion !== "object") {
    throw new Error("companion object required");
  }
  const safeEvent = sanitizeAuditEvent(event);
  const trail = Array.isArray(companion.audit_trail)
    ? companion.audit_trail.slice()
    : [];
  trail.push(safeEvent);
  while (trail.length > MAX_AUDIT_EVENTS) {
    trail.shift();
  }
  companion.audit_trail = trail;
  return { event: safeEvent, companion };
}

module.exports = {
  MAX_AUDIT_EVENTS,
  getAuditJsonlPath,
  sanitizeAuditEvent,
  appendAuditEvent,
  appendAuditEventInMemory,
  readAuditTrail,
};
