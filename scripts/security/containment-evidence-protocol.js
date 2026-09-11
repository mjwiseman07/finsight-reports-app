/**
 * CONTAINMENT_EVIDENCE_V1 — deterministic child-evidence framing.
 * stdout: exactly one frame; progress/diagnostics on stderr only.
 * Never embeds credentials, raw DSNs, hostnames, usernames, or query strings.
 */
"use strict";

const PROTOCOL_ID = "CONTAINMENT_EVIDENCE_V1";
const PROTOCOL_PREFIX = `${PROTOCOL_ID}:`;
const SCHEMA_VERSION = 1;
const MAX_PAYLOAD_BYTES = 256 * 1024;

const HOST_CLASSES = Object.freeze([
  "session_pooler",
  "direct",
  "transaction_pooler",
  "unknown",
  "malformed_uri",
]);

const RESULT_CODES = Object.freeze([
  "DRY_RUN_READY",
  "DRY_RUN_BLOCKED",
  "APPLY_COMMITTED",
  "APPLY_BLOCKED",
  "APPLY_ROLLED_BACK",
  "INDETERMINATE_OUTCOME",
  "BLOCKED",
  "BOOTSTRAP_BLOCKED",
  "SELF_AUTHORITY_BLOCKED",
]);

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function base64UrlEncode(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(s) {
  if (typeof s !== "string" || !/^[A-Za-z0-9_-]*$/.test(s)) {
    const e = new Error("APPLICATOR_EVIDENCE_BASE64URL_INVALID");
    e.code = "APPLICATOR_EVIDENCE_BASE64URL_INVALID";
    throw e;
  }
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  try {
    return Buffer.from(b64, "base64");
  } catch (err) {
    const e = new Error("APPLICATOR_EVIDENCE_BASE64URL_INVALID");
    e.code = "APPLICATOR_EVIDENCE_BASE64URL_INVALID";
    throw e;
  }
}

/**
 * Classify a database URL without retaining or returning secret material.
 * Expected production Session pooler contract (Supabase):
 * - host class session_pooler (*.pooler.supabase.com, not transaction port)
 * - port 5432
 * - database name postgres
 * - username class project_ref_role (contains .<project_ref>)
 * - sslmode=require (or equivalent)
 */
function classifyDatabaseUrl(raw, expectedProjectRef) {
  const diagnostics = {
    structurally_valid_postgres_uri: false,
    project_match: false,
    host_class: "unknown",
    expected_port_match: false,
    database_name_match: false,
    username_class_match: false,
    ssl_requirement_match: false,
  };

  if (raw == null || String(raw).trim() === "") {
    diagnostics.host_class = "malformed_uri";
    return diagnostics;
  }
  const text = String(raw);
  if (!/^postgres(ql)?:\/\//i.test(text)) {
    diagnostics.host_class = "malformed_uri";
    return diagnostics;
  }

  let u;
  try {
    u = new URL(text);
  } catch {
    diagnostics.host_class = "malformed_uri";
    return diagnostics;
  }

  diagnostics.structurally_valid_postgres_uri = true;

  const host = (u.hostname || "").toLowerCase();
  const port = u.port ? Number(u.port) : 5432;
  const dbName = decodeURIComponent((u.pathname || "").replace(/^\//, "") || "");
  const user = decodeURIComponent(u.username || "");
  const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();

  if (host.includes("pooler.supabase.com")) {
    diagnostics.host_class = port === 6543 ? "transaction_pooler" : "session_pooler";
  } else if (host.endsWith(".supabase.co") || host.includes("db.")) {
    diagnostics.host_class = "direct";
  } else {
    diagnostics.host_class = "unknown";
  }

  diagnostics.expected_port_match = port === 5432;
  diagnostics.database_name_match = dbName === "postgres";

  const ref = String(expectedProjectRef || "");
  diagnostics.username_class_match = Boolean(ref) && user.includes(`.${ref}`);
  diagnostics.project_match =
    Boolean(ref) &&
    (user.includes(`.${ref}`) || host.includes(ref) || text.includes(ref));

  diagnostics.ssl_requirement_match =
    sslmode === "require" || sslmode === "verify-full" || sslmode === "verify-ca";

  // Drop locals; never return URL parts
  return diagnostics;
}

function requiredString(obj, key, errors) {
  if (typeof obj[key] !== "string" || obj[key].length === 0) {
    errors.push(key);
  }
}

function requiredBoolean(obj, key, errors) {
  if (typeof obj[key] !== "boolean") {
    errors.push(key);
  }
}

function requiredNumber(obj, key, errors) {
  if (typeof obj[key] !== "number" || !Number.isFinite(obj[key])) {
    errors.push(key);
  }
}

/**
 * Validate sealed applicator / wrapper evidence schema.
 * Does not invent missing applicator counters.
 */
function validateEvidenceSchema(obj) {
  const errors = [];
  if (!isPlainObject(obj)) {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_SCHEMA_INVALID",
      phase: "evidence_schema",
      missing_or_invalid: ["root"],
    };
  }

  if (obj.protocol_version !== SCHEMA_VERSION && obj.schema_version !== SCHEMA_VERSION) {
    if (
      typeof obj.protocol_version === "number" &&
      obj.protocol_version !== SCHEMA_VERSION
    ) {
      return {
        ok: false,
        code: "APPLICATOR_EVIDENCE_PROTOCOL_VERSION_MISMATCH",
        phase: "evidence_schema",
        missing_or_invalid: ["protocol_version"],
      };
    }
    if (typeof obj.schema_version === "number" && obj.schema_version !== SCHEMA_VERSION) {
      return {
        ok: false,
        code: "APPLICATOR_EVIDENCE_PROTOCOL_VERSION_MISMATCH",
        phase: "evidence_schema",
        missing_or_invalid: ["schema_version"],
      };
    }
    errors.push("protocol_version|schema_version");
  }

  requiredString(obj, "result_code", errors);
  requiredString(obj, "reason_code", errors);
  requiredString(obj, "phase", errors);
  requiredString(obj, "evidence_source", errors);
  requiredString(obj, "mode", errors);
  requiredNumber(obj, "databaseConnectionAttempts", errors);
  requiredNumber(obj, "sqlApplicationAttempts", errors);
  requiredBoolean(obj, "advisory_lock_acquired", errors);
  requiredBoolean(obj, "read_only", errors);

  if (
    obj.evidence_source !== "sealed_applicator" &&
    obj.evidence_source !== "native_wrapper_fallback"
  ) {
    errors.push("evidence_source");
  }
  if (obj.mode !== "dry-run" && obj.mode !== "apply") {
    errors.push("mode");
  }
  if (!isPlainObject(obj.cleanup)) {
    errors.push("cleanup");
  }
  if (!isPlainObject(obj.credential_redaction_confirmation)) {
    errors.push("credential_redaction_confirmation");
  }

  if (obj.uri_diagnostics != null) {
    if (!isPlainObject(obj.uri_diagnostics)) {
      errors.push("uri_diagnostics");
    } else {
      const d = obj.uri_diagnostics;
      for (const k of [
        "structurally_valid_postgres_uri",
        "project_match",
        "expected_port_match",
        "database_name_match",
        "username_class_match",
        "ssl_requirement_match",
      ]) {
        if (typeof d[k] !== "boolean") errors.push(`uri_diagnostics.${k}`);
      }
      if (!HOST_CLASSES.includes(d.host_class)) {
        errors.push("uri_diagnostics.host_class");
      }
    }
  }

  if (errors.length) {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_SCHEMA_INVALID",
      phase: "evidence_schema",
      missing_or_invalid: errors,
    };
  }
  return { ok: true };
}

function encodeEvidenceFrame(evidence) {
  const schema = validateEvidenceSchema(evidence);
  if (!schema.ok) {
    const e = new Error(schema.code);
    e.code = schema.code;
    e.details = schema;
    throw e;
  }
  const json = JSON.stringify(evidence);
  const buf = Buffer.from(json, "utf8");
  if (buf.length > MAX_PAYLOAD_BYTES) {
    const e = new Error("APPLICATOR_EVIDENCE_PAYLOAD_TOO_LARGE");
    e.code = "APPLICATOR_EVIDENCE_PAYLOAD_TOO_LARGE";
    throw e;
  }
  return `${PROTOCOL_PREFIX}${base64UrlEncode(buf)}`;
}

/**
 * Extract exactly one evidence frame from child stdout.
 * Ignores empty lines / CR; rejects any other non-empty stdout content.
 */
function extractEvidenceFrame(stdout) {
  const text = String(stdout || "").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const frames = lines.filter((l) => l.trimStart().startsWith(PROTOCOL_PREFIX));
  const nonFrames = lines.filter((l) => !l.trimStart().startsWith(PROTOCOL_PREFIX));

  if (frames.length === 0) {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_MISSING",
      phase: "evidence_extract",
      evidence: null,
    };
  }
  if (frames.length > 1) {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_MULTIPLE",
      phase: "evidence_extract",
      evidence: null,
    };
  }
  if (nonFrames.length > 0) {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_STDOUT_POLLUTED",
      phase: "evidence_extract",
      evidence: null,
    };
  }

  const line = frames[0].trim();
  if (!line.startsWith(PROTOCOL_PREFIX)) {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_MISSING",
      phase: "evidence_extract",
      evidence: null,
    };
  }
  if (line.startsWith("CONTAINMENT_EVIDENCE_") && !line.startsWith(PROTOCOL_PREFIX)) {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_PROTOCOL_VERSION_MISMATCH",
      phase: "evidence_extract",
      evidence: null,
    };
  }

  const payload = line.slice(PROTOCOL_PREFIX.length);
  if (!payload) {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_INCOMPLETE_FRAME",
      phase: "evidence_extract",
      evidence: null,
    };
  }

  let buf;
  try {
    buf = base64UrlDecode(payload);
  } catch (err) {
    return {
      ok: false,
      code: err.code || "APPLICATOR_EVIDENCE_BASE64URL_INVALID",
      phase: "evidence_extract",
      evidence: null,
    };
  }

  if (buf.length > MAX_PAYLOAD_BYTES) {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_PAYLOAD_TOO_LARGE",
      phase: "evidence_extract",
      evidence: null,
    };
  }

  let jsonText;
  try {
    jsonText = buf.toString("utf8");
    // Reject invalid UTF-8 replacement that indicates binary garbage
    if (jsonText.includes("\uFFFD") && buf.includes(0xff)) {
      return {
        ok: false,
        code: "APPLICATOR_EVIDENCE_UTF8_INVALID",
        phase: "evidence_extract",
        evidence: null,
      };
    }
  } catch {
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_UTF8_INVALID",
      phase: "evidence_extract",
      evidence: null,
    };
  }

  let obj;
  try {
    obj = JSON.parse(jsonText);
  } catch {
    // Truncation often presents as JSON parse failure
    if (!jsonText.trim().endsWith("}")) {
      return {
        ok: false,
        code: "APPLICATOR_EVIDENCE_INCOMPLETE_FRAME",
        phase: "evidence_extract",
        evidence: null,
      };
    }
    return {
      ok: false,
      code: "APPLICATOR_EVIDENCE_JSON_INVALID",
      phase: "evidence_extract",
      evidence: null,
    };
  }

  const schema = validateEvidenceSchema(obj);
  if (!schema.ok) {
    return {
      ok: false,
      code: schema.code,
      phase: schema.phase,
      evidence: null,
      missing_or_invalid: schema.missing_or_invalid,
    };
  }

  return { ok: true, code: null, phase: "evidence_extract", evidence: obj };
}

/**
 * Legacy heuristic used by the broken ceremony/launcher path — for regression only.
 */
function legacyHeuristicExtractJson(stdout) {
  const text = String(stdout || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(text.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function redactSecrets(input) {
  let s = String(input ?? "");
  s = s.replace(/postgres(?:ql)?:\/\/[^\s)'"`]+/gi, "postgres://***");
  s = s.replace(/([?&](?:password|pass|pwd|token|secret)=)[^&\s)'"`]+/gi, "$1***");
  s = s.replace(/(password|passwd|pwd)\s*[:=]\s*[^\s)'"`]+/gi, "$1=***");
  s = s.replace(/CONTAINMENT_APPLY_DATABASE_URL\s*[:=]\s*\S+/gi, "CONTAINMENT_APPLY_DATABASE_URL=***");
  return s;
}

function normalizeApplicatorEvidence(partial) {
  const verdict = partial.verdict || partial.result_code || "BLOCKED";
  const result_code = partial.result_code || verdict;
  const reason_code =
    partial.reason_code ||
    partial.error_code ||
    (typeof partial.error === "string" && partial.error.match(/^[A-Z][A-Z0-9_]+/)
      ? partial.error.split(":")[0].trim()
      : result_code);
  const phase = partial.phase || "applicator";
  const evidence_source = partial.evidence_source || "sealed_applicator";

  const out = {
    protocol_version: SCHEMA_VERSION,
    schema_version: SCHEMA_VERSION,
    result_code,
    reason_code: String(reason_code),
    phase: String(phase),
    evidence_source,
    mode: partial.mode === "apply" ? "apply" : "dry-run",
    read_only:
      typeof partial.read_only === "boolean"
        ? partial.read_only
        : partial.mode !== "apply",
    databaseConnectionAttempts:
      typeof partial.databaseConnectionAttempts === "number"
        ? partial.databaseConnectionAttempts
        : 0,
    sqlApplicationAttempts:
      typeof partial.sqlApplicationAttempts === "number"
        ? partial.sqlApplicationAttempts
        : 0,
    advisory_lock_acquired: Boolean(partial.advisory_lock_acquired),
    cleanup: isPlainObject(partial.cleanup)
      ? partial.cleanup
      : { completed: true },
    credential_redaction_confirmation: isPlainObject(
      partial.credential_redaction_confirmation,
    )
      ? partial.credential_redaction_confirmation
      : {
          url_in_evidence: false,
          url_in_argv: false,
          values_undisclosed: true,
        },
  };

  const deny = new Set([
    "database_url",
    "connectionString",
    "password",
    "url",
  ]);
  for (const [k, v] of Object.entries(partial)) {
    if (out[k] !== undefined) continue;
    if (deny.has(k)) continue;
    if (v === undefined) continue;
    if (typeof v === "string") {
      out[k] = redactSecrets(v);
    } else {
      out[k] = v;
    }
  }

  if (typeof out.error === "string") out.error = redactSecrets(out.error);
  if (typeof out.reason_code === "string") out.reason_code = redactSecrets(out.reason_code);

  out.verdict = out.verdict || out.result_code;
  if (typeof out.verdict === "string") out.verdict = redactSecrets(out.verdict);
  return out;
}

function writeEvidenceFrameToStdout(evidence) {
  const normalized = normalizeApplicatorEvidence(evidence);
  const frame = encodeEvidenceFrame(normalized);
  process.stdout.write(`${frame}\n`);
  return normalized;
}

function buildWrapperFallback(fields) {
  return normalizeApplicatorEvidence({
    evidence_source: "native_wrapper_fallback",
    result_code: fields.result_code || "BOOTSTRAP_BLOCKED",
    verdict: fields.verdict || fields.result_code || "BOOTSTRAP_BLOCKED",
    reason_code: fields.reason_code || fields.error_code || "WRAPPER_FALLBACK",
    phase: fields.phase || "wrapper",
    mode: fields.mode || "dry-run",
    read_only: true,
    databaseConnectionAttempts:
      typeof fields.databaseConnectionAttempts === "number"
        ? fields.databaseConnectionAttempts
        : 0,
    sqlApplicationAttempts:
      typeof fields.sqlApplicationAttempts === "number"
        ? fields.sqlApplicationAttempts
        : 0,
    advisory_lock_acquired: false,
    cleanup: fields.cleanup || { completed: true },
    credential_redaction_confirmation: fields.credential_redaction_confirmation || {
      url_in_evidence: false,
      url_in_argv: false,
      values_undisclosed: true,
    },
    wrapper: {
      reason_code: fields.reason_code || fields.error_code || "WRAPPER_FALLBACK",
      phase: fields.phase || "wrapper",
      nodeProcessStarted: Boolean(fields.nodeProcessStarted),
      child_output_received: Boolean(fields.child_output_received),
      counters_are_wrapper_observed: true,
      error: fields.error || null,
    },
    error: fields.error,
    error_code: fields.error_code || fields.reason_code,
    ...fields.extra,
  });
}

module.exports = {
  PROTOCOL_ID,
  PROTOCOL_PREFIX,
  SCHEMA_VERSION,
  MAX_PAYLOAD_BYTES,
  HOST_CLASSES,
  RESULT_CODES,
  base64UrlEncode,
  base64UrlDecode,
  classifyDatabaseUrl,
  validateEvidenceSchema,
  encodeEvidenceFrame,
  extractEvidenceFrame,
  legacyHeuristicExtractJson,
  normalizeApplicatorEvidence,
  writeEvidenceFrameToStdout,
  buildWrapperFallback,
};
