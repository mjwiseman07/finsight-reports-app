/**
 * Scoped TLS trust for the RA Pro accounting-automation applicator.
 * Reuses the freeze-sealed official Supabase Root 2021 CA already reviewed
 * for the RA Pro cutover applicator. Does not read a CA path, does not
 * mutate process or machine trust stores, and never disables verification.
 */
"use strict";

const crypto = require("node:crypto");
const tls = require("node:tls");
const { X509Certificate } = require("node:crypto");
const {
  OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
} = require("./embedded-supabase-prod-ca-2021");

const FORBIDDEN_SSLMODES = new Set(["disable", "allow", "prefer", "no-verify"]);

function tlsPolicyError(code, message) {
  const e = new Error(message || code);
  e.code = code;
  e.phase = "tls_policy";
  return e;
}

function assertNoTlsBypass(env = process.env) {
  const reject = String(env.NODE_TLS_REJECT_UNAUTHORIZED ?? "").trim();
  if (reject === "0") {
    throw tlsPolicyError(
      "BLOCKED_TLS_BYPASS",
      "BLOCKED_TLS_BYPASS: NODE_TLS_REJECT_UNAUTHORIZED=0 is forbidden",
    );
  }
  for (const name of ["NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR"]) {
    if (env[name] != null && String(env[name]).length > 0) {
      throw tlsPolicyError(
        "BLOCKED_TLS_BYPASS",
        `BLOCKED_TLS_BYPASS: ${name} is forbidden`,
      );
    }
  }
}

function assertNoForbiddenSslMode(sslmode) {
  const mode = String(sslmode || "");
  if (FORBIDDEN_SSLMODES.has(mode) || FORBIDDEN_SSLMODES.has(mode.toLowerCase())) {
    throw tlsPolicyError(
      "BLOCKED_TLS_BYPASS",
      `BLOCKED_TLS_BYPASS: sslmode=${mode || "(empty)"} is forbidden`,
    );
  }
}

function countCertificates(pem) {
  return (String(pem || "").match(/-----BEGIN CERTIFICATE-----/g) || []).length;
}

function assertCaValidityWindow(x509) {
  const now = Date.now();
  const from = Date.parse(x509.validFrom);
  const to = Date.parse(x509.validTo);
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    throw tlsPolicyError("BLOCKED_TLS_CA_INVALID", "BLOCKED_TLS_CA_INVALID: cannot parse CA validity window");
  }
  if (now < from) {
    throw tlsPolicyError("BLOCKED_TLS_CA_NOT_YET_VALID", "BLOCKED_TLS_CA_NOT_YET_VALID: CA not yet valid");
  }
  if (now > to) {
    throw tlsPolicyError("BLOCKED_TLS_CA_EXPIRED", "BLOCKED_TLS_CA_EXPIRED: CA certificate expired");
  }
}

function loadPinnedCaFromPem(pemInput, expectedDerSha256 = null) {
  if (pemInput == null || (Array.isArray(pemInput) && pemInput.length !== 1)) {
    throw tlsPolicyError("BLOCKED_TLS_CA_EXTRA", "BLOCKED_TLS_CA_EXTRA: CA material must be exactly one certificate");
  }
  const pemText = Buffer.isBuffer(pemInput) ? pemInput.toString("utf8") : String(pemInput);
  if (countCertificates(pemText) !== 1) {
    throw tlsPolicyError(
      countCertificates(pemText) === 0 ? "BLOCKED_TLS_CA_INVALID" : "BLOCKED_TLS_CA_EXTRA",
      countCertificates(pemText) === 0
        ? "BLOCKED_TLS_CA_INVALID: PEM certificate marker missing"
        : "BLOCKED_TLS_CA_EXTRA: additional unapproved CA is forbidden",
    );
  }
  let x509;
  try {
    x509 = new X509Certificate(pemText);
  } catch {
    throw tlsPolicyError("BLOCKED_TLS_CA_INVALID", "BLOCKED_TLS_CA_INVALID: X509 parse failed");
  }
  assertCaValidityWindow(x509);
  const derSha = crypto.createHash("sha256").update(x509.raw).digest("hex");
  if (expectedDerSha256 != null && String(expectedDerSha256).toLowerCase() !== derSha) {
    throw tlsPolicyError(
      "BLOCKED_TLS_CA_PIN_MISMATCH",
      "BLOCKED_TLS_CA_PIN_MISMATCH: embedded/official CA DER fingerprint mismatch",
    );
  }
  const canonical = pemText.endsWith("\n") ? pemText : `${pemText}\n`;
  return Object.freeze({
    pem: canonical,
    der_sha256: derSha,
    pem_sha256: crypto.createHash("sha256").update(Buffer.from(canonical, "utf8")).digest("hex"),
    bytes: Buffer.byteLength(canonical),
    valid_from: x509.validFrom,
    valid_to: x509.validTo,
    subject: x509.subject,
  });
}

function loadOfficialEmbeddedCa() {
  const loaded = loadPinnedCaFromPem(
    OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
    OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
  );
  if (!String(loaded.subject).includes("Supabase Root 2021 CA")) {
    throw tlsPolicyError("TLS_CA_SUBJECT_MISMATCH", "TLS_CA_SUBJECT_MISMATCH: official CA subject mismatch");
  }
  return loaded;
}

function buildVerifySsl(hostname, caPem, env = process.env) {
  assertNoTlsBypass(env);
  if (!hostname || typeof hostname !== "string") {
    throw tlsPolicyError("BLOCKED_TLS_CA_INVALID", "BLOCKED_TLS_CA_INVALID: hostname required");
  }
  const ca = caPem
    ? loadPinnedCaFromPem(caPem, null)
    : loadOfficialEmbeddedCa();
  return {
    rejectUnauthorized: true,
    ca: ca.pem,
    checkServerIdentity: tls.checkServerIdentity,
    minVersion: "TLSv1.2",
    servername: hostname,
  };
}

function buildProductionSsl(hostname, env = process.env) {
  return buildVerifySsl(hostname, null, env);
}

function buildDisposableVerifySsl(opts = {}) {
  assertNoTlsBypass(opts.env || {});
  if (opts.rejectUnauthorized === false || opts.sslmode) {
    if (opts.rejectUnauthorized === false || FORBIDDEN_SSLMODES.has(String(opts.sslmode || "").toLowerCase())) {
      throw tlsPolicyError("BLOCKED_TLS_BYPASS", "BLOCKED_TLS_BYPASS: verification disable is forbidden");
    }
  }
  if (opts.extraCaPem) {
    throw tlsPolicyError("BLOCKED_TLS_CA_EXTRA", "BLOCKED_TLS_CA_EXTRA: additional unapproved CA is forbidden");
  }
  if (!opts.caPem) {
    throw tlsPolicyError("BLOCKED_TLS_CA_INVALID", "BLOCKED_TLS_CA_INVALID: disposable CA missing");
  }
  const loaded = loadPinnedCaFromPem(opts.caPem, opts.expectedDerSha256 || null);
  return buildVerifySsl(opts.servername, loaded.pem, opts.env || {});
}

module.exports = {
  FORBIDDEN_SSLMODES,
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
  OFFICIAL_SUPABASE_PROD_CA_2021_PEM,
  assertNoForbiddenSslMode,
  assertNoTlsBypass,
  buildDisposableVerifySsl,
  buildProductionSsl,
  loadOfficialEmbeddedCa,
  loadPinnedCaFromPem,
  tlsPolicyError,
};
