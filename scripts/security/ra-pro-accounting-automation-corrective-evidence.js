/**
 * RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_EVIDENCE_V1
 * stdout: exactly one PROTOCOL:base64url frame (+ trailing LF).
 * Retained artifact = exact decoded canonical JSON bytes (LF, one trailing LF).
 */
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const crypto = require("node:crypto");
const fs = require("node:fs");
const {
  DATABASE_URL_ENV,
  EXPECTED_PROJECT_REF,
  FEATURE_FLAG_ENV,
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  STANDALONE_BUNDLE_BYTES,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
  TOOLING_AUTHORIZATION_PATH,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const {
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
  loadOfficialEmbeddedCa,
} = require("./ra-pro-accounting-automation-tls-ca");

const PROTOCOL_ID = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_EVIDENCE_V1";
const PROTOCOL_PREFIX = `${PROTOCOL_ID}:`;
const SCHEMA_VERSION = 1;
const MAX_PAYLOAD_BYTES = 512 * 1024;
const SAFE_METADATA_KEYS = new Set(["database_url_env", "feature_flag_env", "authorization_scope"]);

function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
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
    const e = new Error("CORRECTIVE_EVIDENCE_BASE64URL_INVALID");
    e.code = "CORRECTIVE_EVIDENCE_BASE64URL_INVALID";
    throw e;
  }
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

function redactString(input) {
  let s = String(input ?? "");
  s = s.replace(/postgres(?:ql)?:\/\/[^\s)'"`]+/gi, "postgres://***");
  s = s.replace(/([?&](?:password|pass|pwd|token|secret|api[_-]?key)=)[^&\s)'"`]+/gi, "$1***");
  s = s.replace(/(password|passwd|pwd)\s*[:=]\s*[^\s)'"`]+/gi, "$1=***");
  s = s.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer ***");
  s = s.replace(
    new RegExp(`${DATABASE_URL_ENV}\\s*[:=]\\s*[^\\s)'"\`]+`, "gi"),
    `${DATABASE_URL_ENV}=***`,
  );
  s = s.replace(/\/\/([^:@\s/'"]+):([^@\s/'"]+)@/g, "//***:***@");
  return s;
}

function sanitizeEvidenceValue(value, depth = 0, seen = new WeakSet(), parentKey = "") {
  if (depth > 10) return "[depth-limited]";
  if (value == null) return value;
  if (typeof value === "string") {
    const pk = String(parentKey).toLowerCase();
    if (SAFE_METADATA_KEYS.has(pk) && value === DATABASE_URL_ENV) return DATABASE_URL_ENV;
    if (SAFE_METADATA_KEYS.has(pk) && value === FEATURE_FLAG_ENV) return FEATURE_FLAG_ENV;
    return redactString(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return String(value);
  if (Buffer.isBuffer(value)) return `[buffer:${value.length}]`;
  if (typeof value !== "object") return redactString(value);
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeEvidenceValue(v, depth + 1, seen, parentKey));
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const key = String(k).toLowerCase();
    if (SAFE_METADATA_KEYS.has(key)) {
      out[k] = sanitizeEvidenceValue(v, depth + 1, seen, key);
      continue;
    }
    if (
      key.includes("password") ||
      key.includes("connectionstring") ||
      key === "database_url" ||
      key === "databaseurl" ||
      key === "argv" ||
      key === "config"
    ) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = sanitizeEvidenceValue(v, depth + 1, seen, key);
  }
  return out;
}

function assertHex40(value, code) {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    const e = new Error(code);
    e.code = code;
    throw e;
  }
}

function assertHex64(value, code) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    const e = new Error(code);
    e.code = code;
    throw e;
  }
}

function assertSeal(obj, code) {
  if (!obj || typeof obj !== "object") {
    const e = new Error(code);
    e.code = code;
    throw e;
  }
  assertHex40(String(obj.oid || "").toLowerCase(), code);
  assertHex64(String(obj.sha256 || "").toLowerCase(), code);
  if (!Number.isInteger(obj.bytes) || obj.bytes <= 0) {
    const e = new Error(code);
    e.code = code;
    throw e;
  }
}

function validateCorrectiveDryRunEvidenceSchema(evidence) {
  try {
    if (!evidence || typeof evidence !== "object" || Array.isArray(evidence)) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_SCHEMA", phase: "schema" };
    }
    if (evidence.protocol !== PROTOCOL_ID) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_PROTOCOL", phase: "schema" };
    }
    if (evidence.schema_version !== SCHEMA_VERSION) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_SCHEMA_VERSION", phase: "schema" };
    }
    if (evidence.mode !== "dry-run") {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_MODE", phase: "schema" };
    }
    if (evidence.database_url_env !== DATABASE_URL_ENV) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_CHANNEL", phase: "schema" };
    }
    if (evidence.project_ref !== EXPECTED_PROJECT_REF) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_PROJECT", phase: "schema" };
    }
    assertHex40(String(evidence.execution_tip || "").toLowerCase(), "CORRECTIVE_EVIDENCE_EXECUTION_TIP");
    assertSeal(evidence.bundle, "CORRECTIVE_EVIDENCE_BUNDLE");
    if (
      evidence.bundle.path !== STANDALONE_BUNDLE_PATH ||
      String(evidence.bundle.oid).toLowerCase() !== String(STANDALONE_BUNDLE_OID).toLowerCase() ||
      String(evidence.bundle.sha256).toLowerCase() !== String(STANDALONE_BUNDLE_SHA256).toLowerCase() ||
      evidence.bundle.bytes !== STANDALONE_BUNDLE_BYTES
    ) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_BUNDLE_PATH", phase: "schema" };
    }
    if (!Array.isArray(evidence.corrective_migrations) || evidence.corrective_migrations.length !== 1) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_MIGRATION", phase: "schema" };
    }
    const mig = evidence.corrective_migrations[0];
    const expMig = MIGRATIONS[0];
    if (
      mig.version !== expMig.version ||
      mig.path !== expMig.path ||
      String(mig.oid).toLowerCase() !== expMig.oid ||
      String(mig.sha256).toLowerCase() !== expMig.sha256 ||
      mig.bytes !== expMig.bytes
    ) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_MIGRATION", phase: "schema" };
    }
    assertSeal(mig, "CORRECTIVE_EVIDENCE_MIGRATION");
    if (
      !Array.isArray(evidence.original_migrations_verify_only) ||
      evidence.original_migrations_verify_only.length !== 2
    ) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_ORIGINALS", phase: "schema" };
    }
    for (let i = 0; i < 2; i += 1) {
      const expected = ORIGINAL_COMMITTED_MIGRATIONS[i];
      const got = evidence.original_migrations_verify_only[i];
      if (
        got.version !== expected.version ||
        got.path !== expected.path ||
        String(got.oid).toLowerCase() !== expected.oid ||
        String(got.sha256).toLowerCase() !== expected.sha256 ||
        got.bytes !== expected.bytes
      ) {
        return { ok: false, code: "CORRECTIVE_EVIDENCE_ORIGINALS", phase: "schema" };
      }
      assertSeal(got, "CORRECTIVE_EVIDENCE_ORIGINALS");
    }
    const pre = evidence.published_precondition_evidence;
    const live = evidence.published_pre_apply_evidence;
    if (!pre || !live) return { ok: false, code: "CORRECTIVE_EVIDENCE_PINS", phase: "schema" };
    assertHex40(String(pre.evidence_blob_oid || "").toLowerCase(), "CORRECTIVE_EVIDENCE_PINS");
    assertHex64(String(pre.evidence_sha256 || "").toLowerCase(), "CORRECTIVE_EVIDENCE_PINS");
    assertHex40(String(live.evidence_blob_oid || "").toLowerCase(), "CORRECTIVE_EVIDENCE_PINS");
    assertHex64(String(live.evidence_sha256 || "").toLowerCase(), "CORRECTIVE_EVIDENCE_PINS");
    const triad = evidence.collection_authority_triad;
    if (!triad) return { ok: false, code: "CORRECTIVE_EVIDENCE_TRIAD", phase: "schema" };
    assertHex40(String(triad.authorized_executable_commit || "").toLowerCase(), "CORRECTIVE_EVIDENCE_TRIAD");
    assertHex40(String(triad.authorization_publication_commit || "").toLowerCase(), "CORRECTIVE_EVIDENCE_TRIAD");
    assertHex40(String(triad.authorization_publication_blob_oid || "").toLowerCase(), "CORRECTIVE_EVIDENCE_TRIAD");
    const ca = evidence.embedded_ca;
    if (!ca || ca.der_sha256 !== OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_CA", phase: "schema" };
    }
    if (typeof evidence.databaseConnectionAttempts !== "number") {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_COUNTERS", phase: "schema" };
    }
    if (typeof evidence.sqlApplicationAttempts !== "number") {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_SQL_ATTEMPTS", phase: "schema" };
    }
    if (typeof evidence.migration_sql_attempts !== "number") {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_MIGRATION_SQL", phase: "schema" };
    }
    if (evidence.retry_attempted !== false) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_RETRY", phase: "schema" };
    }
    if (evidence.automation_enabled !== false || evidence.provider_writes !== false) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_SAFETY", phase: "schema" };
    }
    const tx = evidence.transaction;
    if (!tx || typeof tx.began !== "boolean" || typeof tx.rolled_back !== "boolean") {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_TRANSACTION", phase: "schema" };
    }
    const hc = evidence.history_contract;
    if (!hc || hc.prior !== PRIOR_HISTORY_COUNT || hc.post !== POST_HISTORY_COUNT) {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_HISTORY", phase: "schema" };
    }
    if (typeof evidence.verdict !== "string" || typeof evidence.result_code !== "string") {
      return { ok: false, code: "CORRECTIVE_EVIDENCE_VERDICT", phase: "schema" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, code: err.code || "CORRECTIVE_EVIDENCE_SCHEMA", phase: "schema" };
  }
}

function assertCanonicalJsonBytes(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    const e = new Error("CORRECTIVE_EVIDENCE_BYTES");
    e.code = "CORRECTIVE_EVIDENCE_BYTES";
    throw e;
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    const e = new Error("CORRECTIVE_EVIDENCE_BOM");
    e.code = "CORRECTIVE_EVIDENCE_BOM";
    throw e;
  }
  if (buf.includes(0x0d)) {
    const e = new Error("CORRECTIVE_EVIDENCE_CRLF");
    e.code = "CORRECTIVE_EVIDENCE_CRLF";
    throw e;
  }
  if (buf[buf.length - 1] !== 0x0a) {
    const e = new Error("CORRECTIVE_EVIDENCE_TRAILING_LF");
    e.code = "CORRECTIVE_EVIDENCE_TRAILING_LF";
    throw e;
  }
  if (buf.length >= 2 && buf[buf.length - 2] === 0x0a) {
    const e = new Error("CORRECTIVE_EVIDENCE_DOUBLE_TRAILING_LF");
    e.code = "CORRECTIVE_EVIDENCE_DOUBLE_TRAILING_LF";
    throw e;
  }
}

function assertNoSecretsInText(text) {
  const checks = [
    [/postgres(?:ql)?:\/\/[^:]+:[^@\s]+@/i, "CORRECTIVE_EVIDENCE_SECRET_URL"],
    [/sk_live_[A-Za-z0-9]+/, "CORRECTIVE_EVIDENCE_SECRET_SK"],
    [/whsec_[A-Za-z0-9]+/, "CORRECTIVE_EVIDENCE_SECRET_WHSEC"],
    [/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, "CORRECTIVE_EVIDENCE_SECRET_JWT"],
    [/BEGIN CERTIFICATE/, "CORRECTIVE_EVIDENCE_SECRET_CERT"],
    [/SecureString/i, "CORRECTIVE_EVIDENCE_SECRET_SECURESTRING"],
  ];
  for (const [re, code] of checks) {
    if (re.test(text)) {
      const e = new Error(code);
      e.code = code;
      throw e;
    }
  }
}

function materializeCanonicalEvidenceBytes(evidence) {
  const sanitized = sanitizeEvidenceValue(evidence);
  const schema = validateCorrectiveDryRunEvidenceSchema(sanitized);
  if (!schema.ok) {
    const e = new Error(schema.code);
    e.code = schema.code;
    e.phase = schema.phase;
    throw e;
  }
  const buf = Buffer.from(`${JSON.stringify(sanitized)}\n`, "utf8");
  assertCanonicalJsonBytes(buf);
  assertNoSecretsInText(buf.toString("utf8"));
  if (buf.length > MAX_PAYLOAD_BYTES) {
    const e = new Error("CORRECTIVE_EVIDENCE_PAYLOAD_TOO_LARGE");
    e.code = "CORRECTIVE_EVIDENCE_PAYLOAD_TOO_LARGE";
    throw e;
  }
  return { bytes: buf, sha256: sha256Buffer(buf), evidence: sanitized };
}

function encodeEvidenceFrame(evidence) {
  const { bytes, sha256, evidence: sanitized } = materializeCanonicalEvidenceBytes(evidence);
  const frame = `${PROTOCOL_PREFIX}${base64UrlEncode(bytes)}\n`;
  const frameBytes = Buffer.from(frame, "utf8");
  if (frameBytes.includes(0x0d)) {
    const e = new Error("CORRECTIVE_EVIDENCE_FRAME_CRLF");
    e.code = "CORRECTIVE_EVIDENCE_FRAME_CRLF";
    throw e;
  }
  return { frameText: frame, frameBytes, payloadBytes: bytes, sha256, evidence: sanitized };
}

function extractEvidenceFrame(stdoutBufOrText) {
  const text = Buffer.isBuffer(stdoutBufOrText)
    ? stdoutBufOrText.toString("utf8")
    : String(stdoutBufOrText || "");
  const cleaned = text.replace(/^\uFEFF/, "");
  if (cleaned.includes("\r")) {
    return { ok: false, code: "CORRECTIVE_EVIDENCE_CRLF", phase: "evidence_extract" };
  }
  const lines = cleaned.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  const frames = lines.filter((l) => l.startsWith(PROTOCOL_PREFIX));
  const nonFrames = lines.filter((l) => !l.startsWith(PROTOCOL_PREFIX) && l.length > 0);
  if (frames.length === 0) {
    return { ok: false, code: "CORRECTIVE_EVIDENCE_MISSING", phase: "evidence_extract" };
  }
  if (frames.length > 1) {
    return { ok: false, code: "CORRECTIVE_EVIDENCE_MULTIPLE", phase: "evidence_extract" };
  }
  if (nonFrames.length > 0) {
    return { ok: false, code: "CORRECTIVE_EVIDENCE_STDOUT_POLLUTED", phase: "evidence_extract" };
  }
  const payload = frames[0].slice(PROTOCOL_PREFIX.length);
  if (!payload) {
    return { ok: false, code: "CORRECTIVE_EVIDENCE_INCOMPLETE_FRAME", phase: "evidence_extract" };
  }
  let buf;
  try {
    buf = base64UrlDecode(payload);
  } catch (err) {
    return {
      ok: false,
      code: err.code || "CORRECTIVE_EVIDENCE_BASE64URL_INVALID",
      phase: "evidence_extract",
    };
  }
  try {
    assertCanonicalJsonBytes(buf);
    assertNoSecretsInText(buf.toString("utf8"));
  } catch (err) {
    return { ok: false, code: err.code || "CORRECTIVE_EVIDENCE_BYTES", phase: "evidence_extract" };
  }
  let obj;
  try {
    obj = JSON.parse(buf.toString("utf8"));
  } catch {
    return { ok: false, code: "CORRECTIVE_EVIDENCE_JSON_INVALID", phase: "evidence_extract" };
  }
  const schema = validateCorrectiveDryRunEvidenceSchema(obj);
  if (!schema.ok) {
    return { ok: false, code: schema.code, phase: schema.phase || "schema" };
  }
  return {
    ok: true,
    evidence: obj,
    payloadBytes: buf,
    sha256: sha256Buffer(buf),
    bytes: buf.length,
  };
}

function writeEvidenceFrameToStdout(evidence) {
  const encoded = encodeEvidenceFrame(evidence);
  process.stdout.write(encoded.frameBytes);
  return encoded;
}

function retainCanonicalEvidenceFile(stdoutBufOrText, destPath) {
  const extracted = extractEvidenceFrame(stdoutBufOrText);
  if (!extracted.ok) {
    return {
      ok: false,
      code: extracted.code,
      phase: extracted.phase,
      verdict: "CORRECTIVE_EVIDENCE_FRAME_INVALID",
    };
  }
  const beforeSha = extracted.sha256;
  const beforeBytes = extracted.bytes;
  fs.writeFileSync(destPath, extracted.payloadBytes);
  const after = fs.readFileSync(destPath);
  const afterSha = sha256Buffer(after);
  if (afterSha !== beforeSha || after.length !== beforeBytes) {
    try {
      fs.unlinkSync(destPath);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      code: "CORRECTIVE_EVIDENCE_BYTE_MISMATCH",
      phase: "evidence_retain",
      verdict: "CORRECTIVE_EVIDENCE_FRAME_INVALID",
    };
  }
  return {
    ok: true,
    path: destPath,
    sha256: afterSha,
    bytes: after.length,
    evidence: extracted.evidence,
    before_sha256: beforeSha,
    after_sha256: afterSha,
  };
}

function loadAuthorityPinsFromAuth(auth) {
  const pre = (auth && auth.precondition_publication) || {};
  const live = (auth && auth.pre_apply_live_publication) || {};
  return {
    published_precondition_evidence: {
      protocol: pre.protocol || null,
      status: pre.status || null,
      evidence_path: pre.evidence_path || null,
      evidence_source_commit: pre.evidence_source_commit || null,
      evidence_blob_oid: String(pre.evidence_blob_oid || "").toLowerCase() || null,
      evidence_sha256: String(pre.evidence_sha256 || "").toLowerCase() || null,
      evidence_bytes: pre.evidence_bytes != null ? pre.evidence_bytes : null,
      valid_from_utc: pre.valid_from_utc || null,
      valid_until_utc: pre.valid_until_utc || null,
    },
    published_pre_apply_evidence: {
      protocol: live.protocol || null,
      status: live.status || null,
      evidence_path: live.evidence_path || null,
      evidence_source_commit: live.evidence_source_commit || null,
      evidence_blob_oid: String(live.evidence_blob_oid || "").toLowerCase() || null,
      evidence_sha256: String(live.evidence_sha256 || "").toLowerCase() || null,
      evidence_bytes: live.evidence_bytes != null ? live.evidence_bytes : null,
      valid_from_utc: live.valid_from_utc || null,
      valid_until_utc: live.valid_until_utc || null,
      apply_authorized: live.apply_authorized === true,
    },
    collection_authority_triad: {
      authorized_executable_commit: String(
        pre.authorized_executable_commit || live.authorized_executable_commit || "",
      ).toLowerCase(),
      authorization_publication_commit: String(
        pre.authorization_publication_commit || live.authorization_publication_commit || "",
      ).toLowerCase(),
      authorization_publication_blob_oid: String(
        pre.authorization_publication_blob_oid || live.authorization_publication_blob_oid || "",
      ).toLowerCase(),
    },
    evidence_source_commit: pre.evidence_source_commit || live.evidence_source_commit || null,
    pin_publication_identities: {
      precondition_blob_oid: String(pre.evidence_blob_oid || "").toLowerCase() || null,
      pre_apply_blob_oid: String(live.evidence_blob_oid || "").toLowerCase() || null,
    },
  };
}

function embeddedCaIdentity() {
  const loaded = loadOfficialEmbeddedCa();
  return {
    module: "scripts/security/embedded-supabase-prod-ca-2021.js",
    subject: "Supabase Root 2021 CA",
    der_sha256: loaded.der_sha256,
    pem_sha256: loaded.pem_sha256,
    bytes: loaded.bytes,
    official_der_sha256_constant: OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
  };
}

function sealCorrectiveDryRunEvidence(partial, auth, options = {}) {
  const executionTip = String(
    (partial.bundle_authority && partial.bundle_authority.commit) || options.executionTip || "",
  ).toLowerCase();
  const pins = loadAuthorityPinsFromAuth(auth || {});
  const bundle = partial.bundle_authority || {};
  const contacted = partial.advisory_lock_acquired === true || partial.productionContact === true;
  const sealed = {
    protocol: PROTOCOL_ID,
    schema_version: SCHEMA_VERSION,
    package: "ra-pro-accounting-automation-corrective-apply",
    mode: "dry-run",
    evidence_source: partial.evidence_source || "sealed_applicator",
    authorization_scope: "corrective_dry_run",
    execution_tip: executionTip,
    project_ref: EXPECTED_PROJECT_REF,
    database_url_env: DATABASE_URL_ENV,
    feature_flag_env: FEATURE_FLAG_ENV,
    feature_flag_touched: partial.feature_flag_touched === true,
    automation_enabled: false,
    provider_writes: false,
    apply_authorization_status: "UNPUBLISHED",
    apply_authorized: false,
    retry_attempted: false,
    artifact_commit: partial.artifact_commit || null,
    advisory_lock: partial.advisory_lock || null,
    history_contract: partial.history_contract || {
      prior: PRIOR_HISTORY_COUNT,
      post: POST_HISTORY_COUNT,
    },
    bundle: {
      path: bundle.path || STANDALONE_BUNDLE_PATH,
      oid: String(bundle.oid || "").toLowerCase(),
      sha256: String(bundle.sha256 || "").toLowerCase(),
      bytes: bundle.bytes,
    },
    corrective_migrations: (partial.source_authority && partial.source_authority.length
      ? partial.source_authority
      : MIGRATIONS
    ).map((m) => ({
      version: m.version,
      name: m.name || MIGRATIONS[0].name,
      path: m.path || MIGRATIONS[0].path,
      oid: String(m.oid || "").toLowerCase(),
      sha256: String(m.sha256 || "").toLowerCase(),
      bytes: m.bytes,
    })),
    original_migrations_verify_only: ORIGINAL_COMMITTED_MIGRATIONS.map((m) => ({
      version: m.version,
      name: m.name,
      path: m.path,
      oid: m.oid,
      sha256: m.sha256,
      bytes: m.bytes,
    })),
    ...pins,
    embedded_ca: embeddedCaIdentity(),
    databaseConnectionAttempts: Number(partial.databaseConnectionAttempts || 0),
    sqlApplicationAttempts: Number(partial.sqlApplicationAttempts || 0),
    migration_sql_attempts: Number(partial.migration_sql_attempts || 0),
    productionContact: partial.productionContact === true,
    read_only: true,
    transaction_mutation: false,
    transaction: {
      began: contacted,
      advisory_lock_acquired: partial.advisory_lock_acquired === true,
      rolled_back: contacted,
      advisory_lock_released_by_rollback: contacted,
    },
    uri_diagnostics: partial.uri_diagnostics || null,
    schema_probes: partial.schema_probes || null,
    prior_history_count: partial.prior_history_count,
    evidence_gates: partial.evidence_gates || null,
    cleanup: partial.cleanup || {
      completed: false,
      note: "ceremony fills cleanup after credential/material disposal",
    },
    verdict: partial.verdict || "DRY_RUN_BLOCKED",
    result_code: partial.result_code || partial.verdict || "DRY_RUN_BLOCKED",
    error: partial.error,
    error_code: partial.error_code,
    phase: partial.phase,
    tooling_authorization_path: TOOLING_AUTHORIZATION_PATH,
  };
  return sanitizeEvidenceValue(sealed);
}

module.exports = {
  DATABASE_URL_ENV,
  MAX_PAYLOAD_BYTES,
  PROTOCOL_ID,
  PROTOCOL_PREFIX,
  SAFE_METADATA_KEYS,
  SCHEMA_VERSION,
  assertCanonicalJsonBytes,
  assertNoSecretsInText,
  encodeEvidenceFrame,
  extractEvidenceFrame,
  materializeCanonicalEvidenceBytes,
  retainCanonicalEvidenceFile,
  sanitizeEvidenceValue,
  sealCorrectiveDryRunEvidence,
  sha256Buffer,
  validateCorrectiveDryRunEvidenceSchema,
  writeEvidenceFrameToStdout,
};
