/**
 * RA_PRO_CUTOVER_EVIDENCE_V1 — deterministic child-evidence framing.
 * stdout: exactly one frame; progress/diagnostics on stderr only.
 */
"use strict";

const {
  SCHEMA_VERSION,
  MAX_PAYLOAD_BYTES,
  HOST_CLASSES,
  base64UrlEncode,
  base64UrlDecode,
  classifyDatabaseUrl,
  validateEvidenceSchema,
  legacyHeuristicExtractJson,
} = require("./containment-evidence-protocol");

function redactSecrets(input) {
  let s = String(input ?? "");
  s = s.replace(/postgres(?:ql)?:\/\/[^\s)'"`]+/gi, "postgres://***");
  s = s.replace(/([?&](?:password|pass|pwd|token|secret)=)[^&\s)'"`]+/gi, "$1***");
  s = s.replace(/(password|passwd|pwd)\s*[:=]\s*[^\s)'"`]+/gi, "$1=***");
  s = s.replace(
    /RA_PRO_CUTOVER_APPLY_DATABASE_URL\s*[:=]\s*\S+/gi,
    "RA_PRO_CUTOVER_APPLY_DATABASE_URL=***",
  );
  s = s.replace(
    /CONTAINMENT_APPLY_DATABASE_URL\s*[:=]\s*\S+/gi,
    "CONTAINMENT_APPLY_DATABASE_URL=***",
  );
  s = s.replace(
    /FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL\s*[:=]\s*\S+/gi,
    "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL=***",
  );
  return s;
}

const PROTOCOL_ID = "RA_PRO_CUTOVER_EVIDENCE_V1";
const PROTOCOL_PREFIX = `${PROTOCOL_ID}:`;

const RESULT_CODES = Object.freeze([
  "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
  "DRY_RUN_BLOCKED",
  "APPLY_COMMITTED",
  "APPLY_BLOCKED",
  "APPLY_ROLLED_BACK",
  "INDETERMINATE_OUTCOME",
  "BLOCKED",
  "BOOTSTRAP_BLOCKED",
  "SELF_AUTHORITY_BLOCKED",
]);

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
    cleanup: partial.cleanup && typeof partial.cleanup === "object"
      ? partial.cleanup
      : { completed: true },
    credential_redaction_confirmation:
      partial.credential_redaction_confirmation &&
      typeof partial.credential_redaction_confirmation === "object"
        ? partial.credential_redaction_confirmation
        : {
            url_in_evidence: false,
            url_in_argv: false,
            values_undisclosed: true,
          },
  };

  const deny = new Set(["database_url", "connectionString", "password", "url"]);
  for (const [k, v] of Object.entries(partial)) {
    if (out[k] !== undefined) continue;
    if (deny.has(k)) continue;
    if (v === undefined) continue;
    out[k] = typeof v === "string" ? redactSecrets(v) : v;
  }

  if (typeof out.error === "string") out.error = redactSecrets(out.error);
  if (typeof out.reason_code === "string") out.reason_code = redactSecrets(out.reason_code);
  out.verdict = out.verdict || out.result_code;
  if (typeof out.verdict === "string") out.verdict = redactSecrets(out.verdict);
  return out;
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

  let obj;
  try {
    obj = JSON.parse(buf.toString("utf8"));
  } catch {
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
