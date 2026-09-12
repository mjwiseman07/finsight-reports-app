/**
 * Protected TLS trust root for containment applicator.
 * Official Supabase CA is embedded + DER-fingerprint-pinned in the sealed bundle.
 * No runtime CA path, env path, argv CA, symlink, or worktree CA influence.
 * Hostname verification always on; TLS bypass modes refuse closed.
 */
"use strict";

const crypto = require("crypto");
const tls = require("tls");
const { X509Certificate } = require("crypto");
const {
  FORBIDDEN_SSL_ROOTCERT_ENV,
} = require("./credential-browser-containment-constants");
const {
  OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
} = require("./embedded-supabase-prod-ca-2021");

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

/**
 * Runtime CA path channel is retired. Any presence fails closed.
 */
function assertNoCaPathChannel(env = process.env) {
  const raw = env[FORBIDDEN_SSL_ROOTCERT_ENV];
  if (raw != null && String(raw).length > 0) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_PATH_FORBIDDEN",
      "BLOCKED_TLS_CA_PATH_FORBIDDEN: CONTAINMENT_APPLY_SSL_ROOTCERT is retired; trust root is embedded",
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
      "BLOCKED_TLS_CA_IN_URI: CA/cert paths in URL are forbidden; trust root is embedded",
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
 * Parse PEM bytes, optionally pin DER SHA-256, enforce validity window.
 * Never reads a filesystem path.
 */
function loadPinnedCaFromPem(pemInput, expectedDerSha256 = null) {
  if (pemInput == null) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_INVALID",
      "BLOCKED_TLS_CA_INVALID: empty CA PEM",
    );
  }
  const pemBuf = Buffer.isBuffer(pemInput)
    ? Buffer.from(pemInput)
    : Buffer.from(String(pemInput), "utf8");
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
  } catch {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_INVALID",
      "BLOCKED_TLS_CA_INVALID: X509 parse failed",
    );
  }
  assertCaValidityWindow(x509);

  const derSha = crypto.createHash("sha256").update(x509.raw).digest("hex");
  if (
    expectedDerSha256 != null &&
    String(expectedDerSha256).toLowerCase() !== derSha
  ) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_PIN_MISMATCH",
      "BLOCKED_TLS_CA_PIN_MISMATCH: embedded/official CA DER fingerprint mismatch",
    );
  }

  const pemSha = crypto.createHash("sha256").update(pemBuf).digest("hex");
  return Object.freeze({
    pem: text,
    der_sha256: derSha,
    pem_sha256: pemSha,
    bytes: pemBuf.length,
    valid_from: x509.validFrom,
    valid_to: x509.validTo,
    self_signed: x509.subject === x509.issuer,
    subject_class: /supabase/i.test(x509.subject) ? "supabase_named" : "other",
    pinned: true,
    source: expectedDerSha256
      ? "embedded_official_supabase_ca"
      : "in_memory_test_ca",
  });
}

/**
 * Load the freeze-sealed embedded official Supabase CA.
 * Recomputes DER SHA-256 and requires exact pin equality before any connection.
 */
function loadOfficialEmbeddedCa() {
  return loadPinnedCaFromPem(
    OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
    OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
  );
}

function sanitizeCaEvidence(ca) {
  if (!ca) {
    return {
      ca_provided: false,
      path_redacted: true,
      source: "none",
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
    source: ca.source || "unknown",
  };
}

/**
 * Build pg Client options.
 * Production / non-loopback: embedded official CA only.
 * Loopback without test override: no TLS (local disposable non-SSL postgres).
 * Loopback with opts.testTrustedCaPem: in-memory synthetic CA for disposable SSL tests
 * (never from env/path/argv).
 */
function buildPgClientOptions(databaseUrl, env = process.env, opts = {}) {
  assertNoTlsBypass(env);
  assertNoCaPathChannel(env);
  const u = assertUrlTlsPolicy(databaseUrl);
  const loopback = isLoopbackHost(u.hostname);

  let ca = null;
  if (opts && opts.testTrustedCaPem) {
    ca = loadPinnedCaFromPem(
      opts.testTrustedCaPem,
      opts.testExpectedDerSha256 || null,
    );
  } else if (!loopback) {
    ca = loadOfficialEmbeddedCa();
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
      mode: "verify_full_embedded_ca",
      hostname_verification: "enabled",
      reject_unauthorized: true,
      ca: sanitizeCaEvidence(ca),
    },
    _pinned_ca_der_sha256: ca.der_sha256,
  };
}

function classifyTlsError(err) {
  const code = String((err && (err.code || err.message)) || "");
  if (/BLOCKED_TLS_CA_EXPIRED/i.test(code)) return "BLOCKED_TLS_CA_EXPIRED";
  if (/BLOCKED_TLS_CA_NOT_YET_VALID/i.test(code))
    return "BLOCKED_TLS_CA_NOT_YET_VALID";
  if (/BLOCKED_TLS_CA_PIN_MISMATCH/i.test(code))
    return "BLOCKED_TLS_CA_PIN_MISMATCH";
  if (/BLOCKED_TLS_CA_PATH_FORBIDDEN/i.test(code))
    return "BLOCKED_TLS_CA_PATH_FORBIDDEN";
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
  FORBIDDEN_SSLMODES,
  FORBIDDEN_SSL_ROOTCERT_ENV,
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
  isLoopbackHost,
  assertNoTlsBypass,
  assertNoCaPathChannel,
  assertUrlTlsPolicy,
  loadPinnedCaFromPem,
  loadOfficialEmbeddedCa,
  sanitizeCaEvidence,
  buildPgClientOptions,
  classifyTlsError,
  assertCaValidityWindow,
};
