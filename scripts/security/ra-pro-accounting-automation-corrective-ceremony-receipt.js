/**
 * RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_CEREMONY_RECEIPT_V1
 *
 * Fail-closed ceremony cleanup receipt. Cleanup truth lives here — never on the
 * sealed applicator evidence frame. pin_ready is always recomputed from measured
 * facts; caller pin_ready / force_pin_ready are never trusted blindly.
 *
 * CLI:
 *   node ... write <measurements.json> <evidence.json> <receipt-out.json>
 */
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  PROTOCOL_ID: EVIDENCE_PROTOCOL_ID,
  SCHEMA_VERSION: EVIDENCE_SCHEMA_VERSION,
  DATABASE_URL_ENV,
  sanitizeEvidenceValue,
} = require("./ra-pro-accounting-automation-corrective-evidence");

const RECEIPT_PROTOCOL_ID =
  "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_DRY_RUN_CEREMONY_RECEIPT_V1";
const SCHEMA_VERSION = 1;
const MAX_RECEIPT_BYTES = 256 * 1024;

const MANDATORY_CLEANUP_BOOLS = Object.freeze([
  "credential_cleared",
  "securestring_zero_freed",
  "raw_stdout_removed",
  "temporary_bundle_removed",
  "decode_sidecar_removed",
  "child_terminated",
  "orphan_check_passed",
  "final_evidence_present",
  "final_evidence_sha256_unchanged",
  "final_evidence_bytes_unchanged",
]);

function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
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

function assertCanonicalJsonBytes(buf) {
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    const e = new Error("CORRECTIVE_RECEIPT_BYTES");
    e.code = "CORRECTIVE_RECEIPT_BYTES";
    throw e;
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    const e = new Error("CORRECTIVE_RECEIPT_BOM");
    e.code = "CORRECTIVE_RECEIPT_BOM";
    throw e;
  }
  if (buf.includes(0x0d)) {
    const e = new Error("CORRECTIVE_RECEIPT_CRLF");
    e.code = "CORRECTIVE_RECEIPT_CRLF";
    throw e;
  }
  if (buf[buf.length - 1] !== 0x0a) {
    const e = new Error("CORRECTIVE_RECEIPT_TRAILING_LF");
    e.code = "CORRECTIVE_RECEIPT_TRAILING_LF";
    throw e;
  }
  if (buf.length >= 2 && buf[buf.length - 2] === 0x0a) {
    const e = new Error("CORRECTIVE_RECEIPT_DOUBLE_TRAILING_LF");
    e.code = "CORRECTIVE_RECEIPT_DOUBLE_TRAILING_LF";
    throw e;
  }
}

function sanitize(value) {
  // Reuse evidence sanitizer (preserves DATABASE_URL_ENV channel name; redacts secrets).
  return sanitizeEvidenceValue(value);
}

function asBool(v) {
  return v === true;
}

function asInt(v) {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && /^-?\d+$/.test(v)) return Number(v);
  return NaN;
}

function normalizeErrorCodes(raw) {
  if (!Array.isArray(raw)) return null;
  const out = [];
  for (const item of raw) {
    if (typeof item !== "string" || item.length === 0) return null;
    out.push(item);
  }
  return out;
}

function computePinReady(measurements, materializationOk) {
  if (!materializationOk) return false;
  if (measurements.frame_valid !== true) return false;
  for (const key of MANDATORY_CLEANUP_BOOLS) {
    if (measurements[key] !== true) return false;
  }
  const codes = normalizeErrorCodes(measurements.cleanup_error_codes);
  if (!codes || codes.length !== 0) return false;
  if (measurements.cleanup_completed !== true) return false;
  // force_pin_ready must never bypass checks
  return true;
}

function computeCleanupCompleted(measurements) {
  for (const key of MANDATORY_CLEANUP_BOOLS) {
    if (measurements[key] !== true) return false;
  }
  const codes = normalizeErrorCodes(measurements.cleanup_error_codes);
  if (!codes || codes.length !== 0) return false;
  return true;
}

function validateCeremonyReceiptSchema(receipt) {
  try {
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_SCHEMA" };
    }
    if (receipt.protocol !== RECEIPT_PROTOCOL_ID) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_PROTOCOL" };
    }
    if (receipt.schema_version !== SCHEMA_VERSION) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_SCHEMA_VERSION" };
    }
    if (receipt.sealed_evidence_protocol !== EVIDENCE_PROTOCOL_ID) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_EVIDENCE_PROTOCOL" };
    }
    if (receipt.sealed_evidence_schema_version !== EVIDENCE_SCHEMA_VERSION) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_EVIDENCE_SCHEMA_VERSION" };
    }
    assertHex64(String(receipt.sealed_evidence_sha256 || "").toLowerCase(), "CORRECTIVE_RECEIPT_EVIDENCE_SHA");
    if (!Number.isInteger(receipt.sealed_evidence_bytes) || receipt.sealed_evidence_bytes <= 0) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_EVIDENCE_BYTES" };
    }
    assertHex40(String(receipt.execution_tip || "").toLowerCase(), "CORRECTIVE_RECEIPT_EXECUTION_TIP");
    assertHex40(String(receipt.pin_tip || "").toLowerCase(), "CORRECTIVE_RECEIPT_PIN_TIP");
    assertHex40(
      String(receipt.dry_run_authorization_publication_commit || "").toLowerCase(),
      "CORRECTIVE_RECEIPT_DRY_RUN_PUBLICATION",
    );
    assertHex40(
      String(receipt.dry_run_authorization_publication_blob_oid || "").toLowerCase(),
      "CORRECTIVE_RECEIPT_DRY_RUN_BLOB",
    );
    assertHex40(
      String(receipt.executable_authority_publication_commit || "").toLowerCase(),
      "CORRECTIVE_RECEIPT_EXECUTABLE_AUTHORITY_PUBLICATION",
    );
    assertHex40(
      String(receipt.executable_authority_publication_blob_oid || "").toLowerCase(),
      "CORRECTIVE_RECEIPT_EXECUTABLE_AUTHORITY_BLOB",
    );
    if (!/^corr-dryrun-[0-9a-f]{12}-[0-9a-f]{32}$/.test(String(receipt.dry_run_attempt_id || ""))) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_DRY_RUN_ATTEMPT" };
    }

    for (const prefix of ["ceremony", "bundle"]) {
      if (typeof receipt[`${prefix}_path`] !== "string" || !receipt[`${prefix}_path`]) {
        return { ok: false, code: `CORRECTIVE_RECEIPT_${prefix.toUpperCase()}_PATH` };
      }
      assertHex40(String(receipt[`${prefix}_oid`] || "").toLowerCase(), `CORRECTIVE_RECEIPT_${prefix.toUpperCase()}_OID`);
      assertHex64(String(receipt[`${prefix}_sha256`] || "").toLowerCase(), `CORRECTIVE_RECEIPT_${prefix.toUpperCase()}_SHA`);
      if (!Number.isInteger(receipt[`${prefix}_bytes`]) || receipt[`${prefix}_bytes`] <= 0) {
        return { ok: false, code: `CORRECTIVE_RECEIPT_${prefix.toUpperCase()}_BYTES` };
      }
    }

    if (!Number.isInteger(receipt.node_exit)) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_NODE_EXIT" };
    }

    for (const key of MANDATORY_CLEANUP_BOOLS) {
      if (typeof receipt[key] !== "boolean") {
        return { ok: false, code: `CORRECTIVE_RECEIPT_${key.toUpperCase()}` };
      }
    }

    if (!Array.isArray(receipt.cleanup_error_codes)) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_CLEANUP_ERROR_CODES" };
    }
    for (const c of receipt.cleanup_error_codes) {
      if (typeof c !== "string") {
        return { ok: false, code: "CORRECTIVE_RECEIPT_CLEANUP_ERROR_CODES" };
      }
    }

    if (typeof receipt.cleanup_completed !== "boolean") {
      return { ok: false, code: "CORRECTIVE_RECEIPT_CLEANUP_COMPLETED" };
    }
    if (typeof receipt.pin_ready !== "boolean") {
      return { ok: false, code: "CORRECTIVE_RECEIPT_PIN_READY" };
    }
    if (receipt.apply_authorized !== false) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_APPLY_AUTHORIZED" };
    }
    if (receipt.production_apply_authorization_status !== "UNPUBLISHED") {
      return { ok: false, code: "CORRECTIVE_RECEIPT_APPLY_STATUS" };
    }

    // Fail-closed: claimed pin_ready must match recomputed truth from receipt fields.
    const recomputedCleanup =
      MANDATORY_CLEANUP_BOOLS.every((k) => receipt[k] === true) &&
      receipt.cleanup_error_codes.length === 0;
    const recomputedPin =
      recomputedCleanup &&
      receipt.cleanup_completed === true &&
      typeof receipt.sealed_evidence_sha256 === "string" &&
      Number.isInteger(receipt.sealed_evidence_bytes);
    // pin_ready also requires frame_valid which is not stored on receipt as a field —
    // sealCeremonyReceipt already gates it. Schema rejects pin_ready true without cleanup.
    if (receipt.pin_ready === true) {
      if (!recomputedCleanup || receipt.cleanup_completed !== true) {
        return { ok: false, code: "CORRECTIVE_RECEIPT_PIN_READY_INCONSISTENT" };
      }
    }
    if (receipt.cleanup_completed === true && !recomputedCleanup) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_CLEANUP_INCONSISTENT" };
    }
    if (receipt.pin_ready === true && !recomputedPin) {
      return { ok: false, code: "CORRECTIVE_RECEIPT_PIN_READY_INCONSISTENT" };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, code: err.code || "CORRECTIVE_RECEIPT_SCHEMA" };
  }
}

function sealCeremonyReceipt(measurements) {
  const m = measurements && typeof measurements === "object" ? measurements : {};
  const cleanupCompleted = computeCleanupCompleted(m);
  // Materialization success is assumed at seal time; write path re-validates.
  const pinReady = computePinReady(
    { ...m, cleanup_completed: cleanupCompleted },
    true,
  );

  const sealed = {
    protocol: RECEIPT_PROTOCOL_ID,
    schema_version: SCHEMA_VERSION,
    sealed_evidence_protocol: EVIDENCE_PROTOCOL_ID,
    sealed_evidence_schema_version: EVIDENCE_SCHEMA_VERSION,
    sealed_evidence_sha256: String(m.sealed_evidence_sha256 || "").toLowerCase(),
    sealed_evidence_bytes: asInt(m.sealed_evidence_bytes),
    execution_tip: String(m.execution_tip || "").toLowerCase(),
    pin_tip: String(m.pin_tip || "").toLowerCase(),
    dry_run_authorization_publication_commit: String(
      m.dry_run_authorization_publication_commit || "",
    ).toLowerCase(),
    dry_run_authorization_publication_blob_oid: String(
      m.dry_run_authorization_publication_blob_oid || "",
    ).toLowerCase(),
    executable_authority_publication_commit: String(
      m.executable_authority_publication_commit || "",
    ).toLowerCase(),
    executable_authority_publication_blob_oid: String(
      m.executable_authority_publication_blob_oid || "",
    ).toLowerCase(),
    dry_run_attempt_id: String(m.dry_run_attempt_id || ""),
    ceremony_path: String(m.ceremony_path || ""),
    ceremony_oid: String(m.ceremony_oid || "").toLowerCase(),
    ceremony_sha256: String(m.ceremony_sha256 || "").toLowerCase(),
    ceremony_bytes: asInt(m.ceremony_bytes),
    bundle_path: String(m.bundle_path || ""),
    bundle_oid: String(m.bundle_oid || "").toLowerCase(),
    bundle_sha256: String(m.bundle_sha256 || "").toLowerCase(),
    bundle_bytes: asInt(m.bundle_bytes),
    node_exit: asInt(m.node_exit),
    credential_cleared: asBool(m.credential_cleared),
    securestring_zero_freed: asBool(m.securestring_zero_freed),
    raw_stdout_removed: asBool(m.raw_stdout_removed),
    temporary_bundle_removed: asBool(m.temporary_bundle_removed),
    decode_sidecar_removed: asBool(m.decode_sidecar_removed),
    child_terminated: asBool(m.child_terminated),
    orphan_check_passed: asBool(m.orphan_check_passed),
    final_evidence_present: asBool(m.final_evidence_present),
    final_evidence_sha256_unchanged: asBool(m.final_evidence_sha256_unchanged),
    final_evidence_bytes_unchanged: asBool(m.final_evidence_bytes_unchanged),
    cleanup_error_codes: normalizeErrorCodes(m.cleanup_error_codes) || [],
    cleanup_completed: cleanupCompleted,
    // ALWAYS recompute — ignore caller pin_ready / force_pin_ready
    pin_ready: pinReady && cleanupCompleted && m.frame_valid === true,
    apply_authorized: false,
    production_apply_authorization_status: "UNPUBLISHED",
  };

  // Recompute pin_ready with explicit frame_valid gate after field normalization
  sealed.pin_ready = computePinReady(
    {
      ...m,
      ...sealed,
      frame_valid: m.frame_valid === true,
      cleanup_completed: sealed.cleanup_completed,
      cleanup_error_codes: sealed.cleanup_error_codes,
    },
    true,
  );

  return sanitize(sealed);
}

function materializeCanonicalReceiptBytes(receipt) {
  const sanitized = sanitize(receipt);
  const schema = validateCeremonyReceiptSchema(sanitized);
  if (!schema.ok) {
    const e = new Error(schema.code);
    e.code = schema.code;
    throw e;
  }
  const buf = Buffer.from(`${JSON.stringify(sanitized)}\n`, "utf8");
  assertCanonicalJsonBytes(buf);
  if (buf.length > MAX_RECEIPT_BYTES) {
    const e = new Error("CORRECTIVE_RECEIPT_PAYLOAD_TOO_LARGE");
    e.code = "CORRECTIVE_RECEIPT_PAYLOAD_TOO_LARGE";
    throw e;
  }
  return { bytes: buf, sha256: sha256Buffer(buf), receipt: sanitized };
}

function writeCanonicalReceiptFile(destPath, receipt) {
  let materialized;
  try {
    materialized = materializeCanonicalReceiptBytes(receipt);
  } catch (err) {
    return {
      ok: false,
      code: err.code || "CORRECTIVE_RECEIPT_MATERIALIZE_FAILED",
      pin_ready: false,
      cleanup_completed: false,
    };
  }
  const dir = path.dirname(destPath);
  const tmp = path.join(
    dir,
    `.receipt-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.tmp`,
  );
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmp, materialized.bytes);
    fs.renameSync(tmp, destPath);
  } catch (err) {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    return {
      ok: false,
      code: "CORRECTIVE_RECEIPT_WRITE_FAILED",
      pin_ready: false,
      cleanup_completed: materialized.receipt.cleanup_completed === true,
      detail: String(err && err.message),
    };
  }
  let after;
  try {
    after = fs.readFileSync(destPath);
  } catch (err) {
    return {
      ok: false,
      code: "CORRECTIVE_RECEIPT_REREAD_FAILED",
      pin_ready: false,
      cleanup_completed: materialized.receipt.cleanup_completed === true,
      detail: String(err && err.message),
    };
  }
  const afterSha = sha256Buffer(after);
  if (afterSha !== materialized.sha256 || after.length !== materialized.bytes.length) {
    return {
      ok: false,
      code: "CORRECTIVE_RECEIPT_BYTE_MISMATCH",
      pin_ready: false,
      cleanup_completed: materialized.receipt.cleanup_completed === true,
    };
  }
  try {
    assertCanonicalJsonBytes(after);
    const parsed = JSON.parse(after.toString("utf8"));
    const schema = validateCeremonyReceiptSchema(parsed);
    if (!schema.ok) {
      return {
        ok: false,
        code: schema.code || "CORRECTIVE_RECEIPT_POST_WRITE_SCHEMA",
        pin_ready: false,
        cleanup_completed: false,
      };
    }
  } catch (err) {
    return {
      ok: false,
      code: err.code || "CORRECTIVE_RECEIPT_POST_WRITE_INVALID",
      pin_ready: false,
      cleanup_completed: false,
    };
  }
  return {
    ok: true,
    sha256: afterSha,
    bytes: after.length,
    path: destPath,
    pin_ready: materialized.receipt.pin_ready === true,
    cleanup_completed: materialized.receipt.cleanup_completed === true,
    receipt: materialized.receipt,
  };
}

function cliWrite(measurementsPath, evidencePath, receiptOutPath) {
  let measurements;
  try {
    measurements = JSON.parse(fs.readFileSync(measurementsPath, "utf8"));
  } catch {
    const out = { ok: false, pin_ready: false, cleanup_completed: false, code: "CORRECTIVE_RECEIPT_MEASUREMENTS_INVALID" };
    process.stdout.write(`${JSON.stringify(out)}\n`);
    process.exitCode = 2;
    return;
  }

  let evidenceBuf;
  try {
    evidenceBuf = fs.readFileSync(evidencePath);
  } catch {
    const out = { ok: false, pin_ready: false, cleanup_completed: false, code: "CORRECTIVE_RECEIPT_EVIDENCE_MISSING" };
    process.stdout.write(`${JSON.stringify(out)}\n`);
    process.exitCode = 2;
    return;
  }

  const evidenceSha = sha256Buffer(evidenceBuf);
  const evidenceBytes = evidenceBuf.length;
  const expectedSha = String(measurements.sealed_evidence_sha256 || "").toLowerCase();
  const expectedBytes = asInt(measurements.sealed_evidence_bytes);
  if (evidenceSha !== expectedSha || evidenceBytes !== expectedBytes) {
    const out = {
      ok: false,
      pin_ready: false,
      cleanup_completed: false,
      code: "CORRECTIVE_RECEIPT_EVIDENCE_BINDING_MISMATCH",
      sha256: evidenceSha,
      bytes: evidenceBytes,
    };
    process.stdout.write(`${JSON.stringify(out)}\n`);
    process.exitCode = 2;
    return;
  }

  // Bind measured evidence digests into seal inputs (authoritative from file).
  const sealInput = {
    ...measurements,
    sealed_evidence_sha256: evidenceSha,
    sealed_evidence_bytes: evidenceBytes,
  };

  let sealed;
  try {
    sealed = sealCeremonyReceipt(sealInput);
  } catch (err) {
    const out = {
      ok: false,
      pin_ready: false,
      cleanup_completed: false,
      code: err.code || "CORRECTIVE_RECEIPT_SEAL_FAILED",
    };
    process.stdout.write(`${JSON.stringify(out)}\n`);
    process.exitCode = 2;
    return;
  }

  const written = writeCanonicalReceiptFile(receiptOutPath, sealed);

  // Recheck evidence sha after receipt write (must be unchanged).
  let evidenceAfter;
  try {
    evidenceAfter = fs.readFileSync(evidencePath);
  } catch {
    const out = {
      ok: false,
      pin_ready: false,
      cleanup_completed: written.cleanup_completed === true,
      code: "CORRECTIVE_RECEIPT_EVIDENCE_GONE_AFTER_WRITE",
    };
    process.stdout.write(`${JSON.stringify(out)}\n`);
    process.exitCode = 2;
    return;
  }
  const afterSha = sha256Buffer(evidenceAfter);
  if (afterSha !== evidenceSha || evidenceAfter.length !== evidenceBytes) {
    const out = {
      ok: false,
      pin_ready: false,
      cleanup_completed: false,
      code: "CORRECTIVE_RECEIPT_EVIDENCE_CHANGED_AFTER_WRITE",
      sha256: written.sha256,
      bytes: written.bytes,
    };
    process.stdout.write(`${JSON.stringify(out)}\n`);
    process.exitCode = 2;
    return;
  }

  // pin_ready requires successful write + recomputed seal pin_ready
  const pinReady = written.ok === true && written.pin_ready === true && sealed.pin_ready === true;
  const out = {
    ok: written.ok === true && pinReady,
    pin_ready: pinReady,
    cleanup_completed: written.cleanup_completed === true,
    sha256: written.sha256 || null,
    bytes: written.bytes || null,
  };
  if (!written.ok) out.code = written.code || "CORRECTIVE_RECEIPT_WRITE_FAILED";
  else if (!pinReady) out.code = "CORRECTIVE_RECEIPT_NOT_PIN_READY";
  process.stdout.write(`${JSON.stringify(out)}\n`);
  process.exitCode = pinReady ? 0 : 2;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv[0] === "write" && argv.length === 4) {
    cliWrite(argv[1], argv[2], argv[3]);
    return;
  }
  process.stderr.write(
    "usage: node ra-pro-accounting-automation-corrective-ceremony-receipt.js write <measurements.json> <evidence.json> <receipt-out.json>\n",
  );
  process.exitCode = 2;
}

if (require.main === module) {
  main();
}

module.exports = {
  DATABASE_URL_ENV,
  MANDATORY_CLEANUP_BOOLS,
  RECEIPT_PROTOCOL_ID,
  SCHEMA_VERSION,
  assertCanonicalJsonBytes,
  computePinReady,
  materializeCanonicalReceiptBytes,
  sanitize,
  sealCeremonyReceipt,
  sha256Buffer,
  validateCeremonyReceiptSchema,
  writeCanonicalReceiptFile,
};
