/**
 * Protected TLS CA channel for containment applicator.
 * CA path via env only (never argv, never CA PEM in argv/evidence).
 * Hostname verification always on; TLS bypass modes refuse closed.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const tls = require("tls");
const { X509Certificate } = require("crypto");
const { SSL_ROOTCERT_ENV } = require("./credential-browser-containment-constants");

const FORBIDDEN_SSLMODES = new Set([
  "disable",
  "allow",
  "prefer",
  "no-verify",
]);

function tlsPolicyError(code, message) {
  const e = new Error(message);
  e.code = code;
  e.phase = "tls_policy";
  return e;
}

function isLoopbackHost(hostname) {
  const h = String(hostname || "").toLowerCase();
  return (
    h === "127.0.0.1" ||
    h === "localhost" ||
    h === "::1" ||
    h === "[::1]"
  );
}

function assertNoTlsBypass(env = process.env) {
  const reject = String(env.NODE_TLS_REJECT_UNAUTHORIZED ?? "").trim();
  if (reject === "0") {
    throw tlsPolicyError(
      "BLOCKED_TLS_BYPASS",
      "BLOCKED_TLS_BYPASS: NODE_TLS_REJECT_UNAUTHORIZED=0 is forbidden",
    );
  }
}

function parseDatabaseUrl(databaseUrl) {
  let u;
  try {
    u = new URL(databaseUrl);
  } catch {
    throw tlsPolicyError(
      "BLOCKED_URI_INVALID",
      "BLOCKED_URI_INVALID: cannot parse database URL",
    );
  }
  return u;
}

function assertUrlTlsPolicy(databaseUrl) {
  const u = parseDatabaseUrl(databaseUrl);
  const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();
  if (FORBIDDEN_SSLMODES.has(sslmode)) {
    throw tlsPolicyError(
      "BLOCKED_TLS_BYPASS",
      `BLOCKED_TLS_BYPASS: sslmode=${sslmode || "(empty)"} is forbidden`,
    );
  }
  if (
    u.searchParams.has("sslrootcert") ||
    u.searchParams.has("sslcert") ||
    u.searchParams.has("sslkey")
  ) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_IN_URI",
      "BLOCKED_TLS_CA_IN_URI: CA/cert paths must use CONTAINMENT_APPLY_SSL_ROOTCERT env, not URL query",
    );
  }
  for (const [k, v] of u.searchParams.entries()) {
    const blob = `${k}=${v}`.toLowerCase();
    if (
      blob.includes("no-verify") ||
      blob.includes("rejectunauthorized=false")
    ) {
      throw tlsPolicyError(
        "BLOCKED_TLS_BYPASS",
        "BLOCKED_TLS_BYPASS: TLS verification disable token in URL",
      );
    }
  }
  return u;
}

function assertNoReparseOrSymlink(resolvedPath, st) {
  if (typeof st.isSymbolicLink === "function" && st.isSymbolicLink()) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_SYMLINK",
      "BLOCKED_TLS_CA_SYMLINK: CONTAINMENT_APPLY_SSL_ROOTCERT must not be a symlink/junction",
    );
  }
  // Windows reparse points (junctions, mount points) often surface via mode bits.
  // FILE_ATTRIBUTE_REPARSE_POINT = 0x400; Node exposes via stats on some builds.
  if (st.isDirectory && st.isDirectory()) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_NOT_FILE",
      "BLOCKED_TLS_CA_NOT_FILE: CONTAINMENT_APPLY_SSL_ROOTCERT must be a regular file",
    );
  }
  if (!st.isFile()) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_NOT_FILE",
      "BLOCKED_TLS_CA_NOT_FILE: CONTAINMENT_APPLY_SSL_ROOTCERT must be a regular file",
    );
  }
}

function openCaFileNoFollow(resolvedPath) {
  let st;
  try {
    st = fs.lstatSync(resolvedPath);
  } catch (err) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_UNREADABLE",
      "BLOCKED_TLS_CA_UNREADABLE: cannot lstat CONTAINMENT_APPLY_SSL_ROOTCERT",
    );
  }
  assertNoReparseOrSymlink(resolvedPath, st);

  const flags =
    fs.constants.O_RDONLY |
    (fs.constants.O_NOFOLLOW != null ? fs.constants.O_NOFOLLOW : 0) |
    (fs.constants.O_SYMLINK != null ? 0 : 0);

  let fd;
  try {
    fd = fs.openSync(resolvedPath, flags);
  } catch (err) {
    if (err && (err.code === "ELOOP" || /symbolic link/i.test(String(err.message)))) {
      throw tlsPolicyError(
        "BLOCKED_TLS_CA_SYMLINK",
        "BLOCKED_TLS_CA_SYMLINK: CONTAINMENT_APPLY_SSL_ROOTCERT must not be a symlink/junction",
      );
    }
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_UNREADABLE",
      "BLOCKED_TLS_CA_UNREADABLE: cannot open CONTAINMENT_APPLY_SSL_ROOTCERT",
    );
  }

  try {
    const fst = fs.fstatSync(fd);
    assertNoReparseOrSymlink(resolvedPath, fst);
    if (fst.size <= 0 || fst.size > 1024 * 1024) {
      throw tlsPolicyError(
        "BLOCKED_TLS_CA_INVALID",
        "BLOCKED_TLS_CA_INVALID: CA file size out of bounds",
      );
    }
    const pem = Buffer.alloc(fst.size);
    const n = fs.readSync(fd, pem, 0, fst.size, 0);
    if (n !== fst.size) {
      throw tlsPolicyError(
        "BLOCKED_TLS_CA_UNREADABLE",
        "BLOCKED_TLS_CA_UNREADABLE: short read of CA file",
      );
    }
    // Pin: copy detached from path; never re-read path after this return.
    return Buffer.from(pem);
  } finally {
    try {
      fs.closeSync(fd);
    } catch (_) {}
  }
}

function assertCaValidityWindow(x509) {
  const now = Date.now();
  const from = Date.parse(x509.validFrom);
  const to = Date.parse(x509.validTo);
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_INVALID",
      "BLOCKED_TLS_CA_INVALID: cannot parse CA validity window",
    );
  }
  if (now < from) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_NOT_YET_VALID",
      "BLOCKED_TLS_CA_NOT_YET_VALID: CA not yet valid",
    );
  }
  if (now > to) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_EXPIRED",
      "BLOCKED_TLS_CA_EXPIRED: CA certificate expired",
    );
  }
}

/**
 * Load CA once from env path. Rejects symlink/non-regular files.
 * Pins in-memory PEM + DER fingerprint; never re-reads the path.
 */
function loadCaFromEnv(env = process.env) {
  const caPath = env[SSL_ROOTCERT_ENV];
  if (!caPath || !String(caPath).trim()) {
    return null;
  }
  // Do not echo the path in errors (broad path exposure).
  const resolved = path.resolve(String(caPath).trim());
  const pemBuf = openCaFileNoFollow(resolved);
  const text = pemBuf.toString("utf8");
  if (!/-----BEGIN CERTIFICATE-----/.test(text)) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_INVALID",
      "BLOCKED_TLS_CA_INVALID: PEM certificate marker missing",
    );
  }
  let x509;
  try {
    x509 = new X509Certificate(pemBuf);
  } catch (err) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_INVALID",
      "BLOCKED_TLS_CA_INVALID: X509 parse failed",
    );
  }
  assertCaValidityWindow(x509);

  const pinnedPem = text;
  const derSha = crypto.createHash("sha256").update(x509.raw).digest("hex");
  const pemSha = crypto.createHash("sha256").update(pemBuf).digest("hex");

  return Object.freeze({
    pem: pinnedPem,
    // Intentionally omit filesystem path from returned object (evidence/redaction).
    der_sha256: derSha,
    pem_sha256: pemSha,
    bytes: pemBuf.length,
    valid_from: x509.validFrom,
    valid_to: x509.validTo,
    self_signed: x509.subject === x509.issuer,
    subject_class: /supabase/i.test(x509.subject) ? "supabase_named" : "other",
    pinned: true,
  });
}

function sanitizeCaEvidence(ca) {
  if (!ca) {
    return {
      ca_provided: false,
      path_redacted: true,
    };
  }
  return {
    ca_provided: true,
    path_redacted: true,
    der_sha256: ca.der_sha256,
    pem_sha256: ca.pem_sha256,
    bytes: ca.bytes,
    valid_from: ca.valid_from,
    valid_to: ca.valid_to,
    self_signed: ca.self_signed,
    subject_class: ca.subject_class,
    pinned: Boolean(ca.pinned),
  };
}

/**
 * Build pg Client options with explicit verified CA when required.
 * Always rejectUnauthorized true + hostname verification when CA present.
 * Never re-reads the CA path after loadCaFromEnv.
 */
function buildPgClientOptions(databaseUrl, env = process.env) {
  assertNoTlsBypass(env);
  const u = assertUrlTlsPolicy(databaseUrl);
  const loopback = isLoopbackHost(u.hostname);
  const ca = loadCaFromEnv(env);

  if (!loopback && !ca) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_REQUIRED",
      `BLOCKED_TLS_CA_REQUIRED: non-loopback targets require ${SSL_ROOTCERT_ENV}`,
    );
  }

  const cleaned = new URL(u.toString());
  cleaned.searchParams.delete("sslmode");
  cleaned.searchParams.delete("uselibpqcompat");

  if (!ca) {
    return {
      connectionString: cleaned.toString(),
      ssl: false,
      tls_evidence: {
        mode: "loopback_no_tls",
        hostname_verification: "n/a",
        ca: sanitizeCaEvidence(null),
      },
    };
  }

  // Use pinned in-memory PEM only — never pass a path to pg/sslrootcert.
  const ssl = {
    rejectUnauthorized: true,
    ca: ca.pem,
    checkServerIdentity: tls.checkServerIdentity,
    minVersion: "TLSv1.2",
  };

  return {
    connectionString: cleaned.toString(),
    ssl,
    tls_evidence: {
      mode: "verify_full_explicit_ca",
      hostname_verification: "enabled",
      reject_unauthorized: true,
      ca: sanitizeCaEvidence(ca),
    },
    // Internal pin for tests — not serialized into applicator evidence.
    _pinned_ca_der_sha256: ca.der_sha256,
  };
}

function classifyTlsError(err) {
  const code = String((err && (err.code || err.message)) || "");
  if (/BLOCKED_TLS_CA_EXPIRED/i.test(code)) return "BLOCKED_TLS_CA_EXPIRED";
  if (/BLOCKED_TLS_CA_NOT_YET_VALID/i.test(code))
    return "BLOCKED_TLS_CA_NOT_YET_VALID";
  if (/BLOCKED_TLS_CA_SYMLINK/i.test(code)) return "BLOCKED_TLS_CA_SYMLINK";
  if (/BLOCKED_TLS_CA_NOT_FILE/i.test(code)) return "BLOCKED_TLS_CA_NOT_FILE";
  if (/BLOCKED_TLS_/i.test(code) && err && err.code) return err.code;
  if (/SELF_SIGNED_CERT_IN_CHAIN/i.test(code)) return "SELF_SIGNED_CERT_IN_CHAIN";
  if (/UNABLE_TO_VERIFY_LEAF_SIGNATURE/i.test(code))
    return "UNABLE_TO_VERIFY_LEAF_SIGNATURE";
  if (/CERT_HAS_EXPIRED/i.test(code)) return "CERT_HAS_EXPIRED";
  if (/ERR_TLS_CERT_ALTNAME_INVALID|Hostname\/IP does not match/i.test(code))
    return "HOSTNAME_MISMATCH";
  return err && err.code ? err.code : "TLS_FAIL";
}

module.exports = {
  SSL_ROOTCERT_ENV,
  FORBIDDEN_SSLMODES,
  isLoopbackHost,
  assertNoTlsBypass,
  assertUrlTlsPolicy,
  loadCaFromEnv,
  sanitizeCaEvidence,
  buildPgClientOptions,
  classifyTlsError,
  assertCaValidityWindow,
  openCaFileNoFollow,
};
