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
    const e = new Error(
      "BLOCKED_TLS_BYPASS: NODE_TLS_REJECT_UNAUTHORIZED=0 is forbidden",
    );
    e.code = "BLOCKED_TLS_BYPASS";
    e.phase = "tls_policy";
    throw e;
  }
}

function parseDatabaseUrl(databaseUrl) {
  let u;
  try {
    u = new URL(databaseUrl);
  } catch {
    const e = new Error("BLOCKED_URI_INVALID: cannot parse database URL");
    e.code = "BLOCKED_URI_INVALID";
    e.phase = "tls_policy";
    throw e;
  }
  return u;
}

function assertUrlTlsPolicy(databaseUrl) {
  const u = parseDatabaseUrl(databaseUrl);
  const sslmode = (u.searchParams.get("sslmode") || "").toLowerCase();
  if (FORBIDDEN_SSLMODES.has(sslmode)) {
    const e = new Error(
      `BLOCKED_TLS_BYPASS: sslmode=${sslmode || "(empty)"} is forbidden`,
    );
    e.code = "BLOCKED_TLS_BYPASS";
    e.phase = "tls_policy";
    throw e;
  }
  if (u.searchParams.has("sslrootcert") || u.searchParams.has("sslcert") || u.searchParams.has("sslkey")) {
    const e = new Error(
      "BLOCKED_TLS_CA_IN_URI: CA/cert paths must use CONTAINMENT_APPLY_SSL_ROOTCERT env, not URL query",
    );
    e.code = "BLOCKED_TLS_CA_IN_URI";
    e.phase = "tls_policy";
    throw e;
  }
  // Explicit no-verify token anywhere in query
  for (const [k, v] of u.searchParams.entries()) {
    const blob = `${k}=${v}`.toLowerCase();
    if (blob.includes("no-verify") || blob.includes("rejectunauthorized=false")) {
      const e = new Error("BLOCKED_TLS_BYPASS: TLS verification disable token in URL");
      e.code = "BLOCKED_TLS_BYPASS";
      e.phase = "tls_policy";
      throw e;
    }
  }
  return u;
}

function loadCaFromEnv(env = process.env) {
  const caPath = env[SSL_ROOTCERT_ENV];
  if (!caPath || !String(caPath).trim()) {
    return null;
  }
  const resolved = path.resolve(String(caPath).trim());
  let pem;
  try {
    pem = fs.readFileSync(resolved);
  } catch (err) {
    const e = new Error(
      `BLOCKED_TLS_CA_UNREADABLE: cannot read ${SSL_ROOTCERT_ENV}`,
    );
    e.code = "BLOCKED_TLS_CA_UNREADABLE";
    e.phase = "tls_policy";
    e.cause = err;
    throw e;
  }
  const text = pem.toString("utf8");
  if (!/-----BEGIN CERTIFICATE-----/.test(text)) {
    const e = new Error("BLOCKED_TLS_CA_INVALID: PEM certificate marker missing");
    e.code = "BLOCKED_TLS_CA_INVALID";
    e.phase = "tls_policy";
    throw e;
  }
  let x509;
  try {
    x509 = new X509Certificate(pem);
  } catch (err) {
    const e = new Error("BLOCKED_TLS_CA_INVALID: X509 parse failed");
    e.code = "BLOCKED_TLS_CA_INVALID";
    e.phase = "tls_policy";
    e.cause = err;
    throw e;
  }
  return {
    pem: text,
    path_resolved: resolved,
    der_sha256: crypto.createHash("sha256").update(x509.raw).digest("hex"),
    pem_sha256: crypto.createHash("sha256").update(pem).digest("hex"),
    bytes: pem.length,
    valid_from: x509.validFrom,
    valid_to: x509.validTo,
    self_signed: x509.subject === x509.issuer,
    subject_class: /supabase/i.test(x509.subject) ? "supabase_named" : "other",
  };
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
  };
}

/**
 * Build pg Client options with explicit verified CA when required.
 * Never sets rejectUnauthorized:false. Hostname verification remains enabled.
 */
function buildPgClientOptions(databaseUrl, env = process.env) {
  assertNoTlsBypass(env);
  const u = assertUrlTlsPolicy(databaseUrl);
  const loopback = isLoopbackHost(u.hostname);
  const ca = loadCaFromEnv(env);

  if (!loopback && !ca) {
    const e = new Error(
      `BLOCKED_TLS_CA_REQUIRED: non-loopback targets require ${SSL_ROOTCERT_ENV}`,
    );
    e.code = "BLOCKED_TLS_CA_REQUIRED";
    e.phase = "tls_policy";
    throw e;
  }

  // Strip sslmode from URL so node-pg cannot apply rejectUnauthorized:false for require.
  const cleaned = new URL(u.toString());
  cleaned.searchParams.delete("sslmode");
  cleaned.searchParams.delete("uselibpqcompat");

  if (!ca) {
    // Loopback disposable Postgres without TLS.
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
      mode: "verify_full_explicit_ca",
      hostname_verification: "enabled",
      reject_unauthorized: true,
      ca: sanitizeCaEvidence(ca),
    },
  };
}

function classifyTlsError(err) {
  const code = String(err && (err.code || err.message) || "");
  if (/SELF_SIGNED_CERT_IN_CHAIN/i.test(code)) return "SELF_SIGNED_CERT_IN_CHAIN";
  if (/UNABLE_TO_VERIFY_LEAF_SIGNATURE/i.test(code)) return "UNABLE_TO_VERIFY_LEAF_SIGNATURE";
  if (/CERT_HAS_EXPIRED/i.test(code)) return "CERT_HAS_EXPIRED";
  if (/ERR_TLS_CERT_ALTNAME_INVALID|Hostname\/IP does not match/i.test(code))
    return "HOSTNAME_MISMATCH";
  if (/BLOCKED_TLS_/i.test(code)) return err.code;
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
};
