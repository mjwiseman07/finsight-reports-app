/**
 * Test-infrastructure only: resolve pg.Client options for
 * JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL.
 *
 * NOT a production/runtime API — do not import from app barrels or services.
 * Used by postgres integration suites and Option D suite-mirrored probes.
 *
 * Transport rules:
 * - plaintext (ssl:false) only when sslmode=disable AND host is proven loopback-only
 * - otherwise preserve ssl:{ rejectUnauthorized:false } (never silent downgrade)
 * - non-loopback + sslmode=disable → reject
 */
"use strict";

const dns = require("node:dns");
const net = require("node:net");
const { URL } = require("node:url");

const DEFAULT_SSL = Object.freeze({ rejectUnauthorized: false });

const CLOUD_OR_POOLER_HOST =
  /(^|\.)supabase\.(co|com)$|(^|\.)pooler\.supabase\.com$|pooler|neon\.tech|railway\.app|render\.com/i;

/**
 * @typedef {{ address: string, family?: number }} LookupAddress
 * @typedef {(hostname: string) => Promise<LookupAddress[]>} DnsLookupAll
 *
 * @typedef {{
 *   connectionString: string,
 *   ssl: false | { rejectUnauthorized: false },
 *   transport: 'plaintext_loopback' | 'tls_required',
 *   hostname: string,
 *   port: number,
 *   database: string,
 *   sslmode: string | null,
 *   credentialsIncludedInEvidence: false,
 * }} JeReusePgClientConfig
 *
 * @typedef {{
 *   ok: true,
 *   config: JeReusePgClientConfig,
 *   redacted: string,
 * }} JeReusePgClientConfigOk
 *
 * @typedef {{
 *   ok: false,
 *   reason: string,
 *   failures: Array<{ rule: string, [key: string]: unknown }>,
 *   redacted: string,
 * }} JeReusePgClientConfigErr
 */

function redactUrl(value) {
  if (!value || typeof value !== "string") return "(empty)";
  try {
    const u = new URL(value);
    return `host=${u.hostname};port=${u.port || "(default)"};db=${(u.pathname || "/").replace(/^\//, "") || "(none)"}`;
  } catch {
    return "(unparseable-url)";
  }
}

function sanitizeErrorMessage(message) {
  let s = String(message || "").slice(0, 240);
  s = s.replace(/postgres(?:ql)?:\/\/[^\s)'"]+/gi, "[redacted-url]");
  s = s.replace(/password\s*=\s*\S+/gi, "password=[redacted]");
  s = s.replace(/:[^:@\s/]+@/g, ":[redacted]@");
  return s;
}

/**
 * @param {string} addr
 * @returns {boolean}
 */
function isLoopbackIp(addr) {
  const a = String(addr || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  if (!a) return false;
  if (a === "::1") return true;
  if (a.startsWith("::ffff:")) return isLoopbackIp(a.slice(7));
  // IPv4 127.0.0.0/8
  const m = a.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const octets = m.slice(1).map((x) => Number(x));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return octets[0] === 127;
}

/**
 * Literal hostname forms that are loopback without DNS.
 * @param {string} hostname
 */
function isLiteralLoopbackHostname(hostname) {
  const h = String(hostname || "")
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  return h === "127.0.0.1" || h === "::1" || isLoopbackIp(h);
}

/**
 * Reject deceptive / alternate encodings before DNS.
 * @param {string} hostname
 * @param {string} rawUrl
 */
function assertHostnameSafe(hostname, rawUrl) {
  const failures = [];
  const h = String(hostname || "");
  if (!h) {
    failures.push({ rule: "missing_hostname" });
    return failures;
  }
  // Reject userinfo leakage patterns and whitespace
  if (/\s/.test(h) || h.includes("@") || h.includes("/") || h.includes("\\")) {
    failures.push({ rule: "deceptive_hostname_characters", hostname: h });
  }
  // Reject percent-encoding / null bytes in hostname
  if (/%|\\x|\\u|\0/i.test(h) || /%/.test(String(rawUrl))) {
    // Allow % only outside hostname in password etc.; check hostname specifically
    if (/%|\0/.test(h)) {
      failures.push({ rule: "encoded_hostname_rejected", hostname: h });
    }
  }
  // Reject trailing dots / empty labels tricks
  if (h.includes("..") || h.startsWith(".") || h.endsWith(".")) {
    failures.push({ rule: "hostname_dot_trick_rejected", hostname: h });
  }
  // Reject numeric looks-like-loopback with extra labels (127.0.0.1.evil.com)
  if (/^127\.\d+\.\d+\.\d+\./i.test(h) || /^localhost\./i.test(h) || h.includes("::1.")) {
    failures.push({ rule: "loopback_suffix_trick_rejected", hostname: h });
  }
  // Bracket abuse
  if ((h.includes("[") || h.includes("]")) && h.replace(/^\[|\]$/g, "") === h) {
    failures.push({ rule: "malformed_ipv6_hostname", hostname: h });
  }
  return failures;
}

/**
 * @param {URL} u
 */
function collectSslmodes(u) {
  const modes = u.searchParams.getAll("sslmode").map((m) => String(m).toLowerCase());
  return modes;
}

/**
 * @param {URL} u
 * @param {string[]} sslmodes
 */
function detectConflictingSslParams(u, sslmodes) {
  const failures = [];
  const unique = [...new Set(sslmodes)];
  if (unique.length > 1) {
    failures.push({ rule: "conflicting_sslmode_values", sslmodes: unique });
  }
  const sslParam = u.searchParams.getAll("ssl").map((v) => String(v).toLowerCase());
  const wantsDisable = unique.includes("disable");
  if (wantsDisable && sslParam.some((v) => v === "true" || v === "1" || v === "require")) {
    failures.push({ rule: "conflicting_ssl_and_sslmode_disable", ssl: sslParam });
  }
  // Reject exotic sslrootcert/sslcert with disable (ambiguous intent)
  if (
    wantsDisable &&
    (u.searchParams.has("sslrootcert") ||
      u.searchParams.has("sslcert") ||
      u.searchParams.has("sslkey"))
  ) {
    failures.push({ rule: "conflicting_ssl_material_with_sslmode_disable" });
  }
  return failures;
}

/**
 * Default DNS lookup (all addresses).
 * @type {DnsLookupAll}
 */
async function defaultLookupAll(hostname) {
  const result = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  return result.map((r) => ({ address: r.address, family: r.family }));
}

/**
 * Resolve effective pg.Client config for JE_REUSE integration tests.
 *
 * @param {string|null|undefined} databaseUrl
 * @param {{ lookupAll?: DnsLookupAll }} [opts]
 * @returns {Promise<JeReusePgClientConfigOk | JeReusePgClientConfigErr>}
 */
async function resolveJeReusePgClientConfig(databaseUrl, opts = {}) {
  const failures = [];
  const redacted = redactUrl(databaseUrl);
  const lookupAll = opts.lookupAll || defaultLookupAll;

  if (!databaseUrl || !String(databaseUrl).trim()) {
    return {
      ok: false,
      reason: "missing_database_url",
      failures: [{ rule: "missing_database_url" }],
      redacted,
    };
  }

  const raw = String(databaseUrl).trim();
  let u;
  try {
    u = new URL(raw);
  } catch (err) {
    return {
      ok: false,
      reason: "malformed_url",
      failures: [
        {
          rule: "malformed_url",
          message: sanitizeErrorMessage(err && err.message),
        },
      ],
      redacted,
    };
  }

  const protocol = (u.protocol || "").replace(/:$/, "").toLowerCase();
  if (protocol !== "postgres" && protocol !== "postgresql") {
    failures.push({ rule: "unexpected_protocol", protocol });
  }

  // Reject credentials embedded in a way URL can't parse cleanly (ambiguous userinfo)
  // e.g. multiple @ signs in opaque parts
  const atCount = (raw.match(/@/g) || []).length;
  if (atCount > 1) {
    failures.push({ rule: "ambiguous_userinfo" });
  }

  const hostname = (u.hostname || "").toLowerCase();
  failures.push(...assertHostnameSafe(hostname, raw));

  const sslmodes = collectSslmodes(u);
  failures.push(...detectConflictingSslParams(u, sslmodes));
  const sslmode = sslmodes.length ? sslmodes[sslmodes.length - 1] : null;
  const wantsPlaintext = sslmode === "disable";

  const port = u.port ? Number(u.port) : 5432;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    failures.push({ rule: "invalid_port", port: u.port });
  }
  const database = (u.pathname || "/").replace(/^\//, "") || "";

  if (CLOUD_OR_POOLER_HOST.test(hostname) && wantsPlaintext) {
    failures.push({ rule: "cloud_or_pooler_sslmode_disable_rejected", hostname });
  }

  // Determine loopback-only proof
  let loopbackOnly = false;
  let resolvedAddresses = [];

  if (failures.length === 0) {
    if (isLiteralLoopbackHostname(hostname)) {
      loopbackOnly = true;
      resolvedAddresses = [hostname.replace(/^\[|\]$/g, "")];
    } else if (hostname === "localhost") {
      try {
        resolvedAddresses = (await lookupAll("localhost")).map((r) => r.address);
        if (!resolvedAddresses.length) {
          failures.push({ rule: "localhost_dns_empty" });
        } else if (!resolvedAddresses.every((a) => isLoopbackIp(a))) {
          failures.push({
            rule: "mixed_loopback_non_loopback_resolution",
            addresses: resolvedAddresses.map((a) => String(a)),
          });
        } else {
          loopbackOnly = true;
        }
      } catch (err) {
        failures.push({
          rule: "localhost_dns_failed",
          message: sanitizeErrorMessage(err && err.message),
        });
      }
    } else if (net.isIP(hostname)) {
      // Other literal IPs
      loopbackOnly = isLoopbackIp(hostname);
      resolvedAddresses = [hostname];
      if (!loopbackOnly && wantsPlaintext) {
        failures.push({
          rule: "non_loopback_sslmode_disable_rejected",
          hostname,
        });
      }
    } else {
      // Hostname requiring DNS — never treat as loopback for plaintext without full proof
      try {
        resolvedAddresses = (await lookupAll(hostname)).map((r) => r.address);
        if (!resolvedAddresses.length) {
          failures.push({ rule: "dns_empty", hostname });
        } else if (resolvedAddresses.every((a) => isLoopbackIp(a))) {
          // Rare: public name resolving only to loopback — still reject cloud patterns above
          loopbackOnly = true;
        } else if (wantsPlaintext) {
          failures.push({
            rule: "non_loopback_sslmode_disable_rejected",
            hostname,
            addressesSample: resolvedAddresses.slice(0, 4).map(String),
          });
        }
      } catch (err) {
        if (wantsPlaintext) {
          failures.push({
            rule: "dns_failed_cannot_prove_loopback",
            message: sanitizeErrorMessage(err && err.message),
          });
        }
        // For TLS path, DNS failure is not required to reject config construction;
        // preserve SSL and let connect fail later. Still OK for config ok.
      }
    }
  }

  if (wantsPlaintext && !loopbackOnly && !failures.some((f) => /sslmode_disable|loopback|dns|cloud|pooler|deceptive|malformed|ambiguous|conflicting|encoded|hostname|protocol|port|missing/.test(f.rule))) {
    failures.push({
      rule: "non_loopback_sslmode_disable_rejected",
      hostname,
    });
  }

  if (failures.length) {
    return {
      ok: false,
      reason: failures[0].rule,
      failures,
      redacted,
    };
  }

  if (wantsPlaintext && loopbackOnly) {
    // Keep sslmode=disable in the connection string; effective Client ssl must be false.
    return {
      ok: true,
      config: {
        connectionString: raw,
        ssl: false,
        transport: "plaintext_loopback",
        hostname,
        port,
        database,
        sslmode: "disable",
        credentialsIncludedInEvidence: false,
      },
      redacted,
    };
  }

  // Default / TLS path: strip sslmode like historical helper, preserve SSL object.
  const tlsUrl = new URL(raw);
  tlsUrl.searchParams.delete("sslmode");
  return {
    ok: true,
    config: {
      connectionString: tlsUrl.toString(),
      ssl: { rejectUnauthorized: false },
      transport: "tls_required",
      hostname,
      port,
      database,
      sslmode,
      credentialsIncludedInEvidence: false,
    },
    redacted,
  };
}

module.exports = {
  resolveJeReusePgClientConfig,
  redactUrl,
  sanitizeErrorMessage,
  isLoopbackIp,
  isLiteralLoopbackHostname,
  DEFAULT_SSL,
  CLOUD_OR_POOLER_HOST,
};
