/**
 * Dual-migration sealed applicator for RA Pro accounting automation.
 * Applies weekly then month-end in one transaction. Default path dry-run.
 * Database URL: RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL only.
 * Never enables ENABLE_RA_PRO_ACCOUNTING_AUTOMATION.
 * Published evidence pins are not apply authorization. Production apply stays
 * blocked until a later descendant publication names an ancestor executable.
 */
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");
const { execFileSync } = require("node:child_process");
const {
  ADVISORY_LOCK,
  APPLY_AUTHORIZATION_TOKEN,
  ARTIFACT_COMMIT,
  DATABASE_URL_ENV,
  EXPECTED_PROJECT_REF,
  EXPECTED_STANDALONE_BUNDLE_SHA256,
  FEATURE_FLAG_ENV,
  FORBIDDEN_DATABASE_URL_ENVS,
  MIGRATIONS,
  POST_HISTORY_COUNT,
  PRIOR_HISTORY_COUNT,
  STANDALONE_BUNDLE_BYTES,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
  TOOLING_AUTHORIZATION_PATH,
} = require("./ra-pro-accounting-automation-apply-constants");
const {
  loadAndVerifyGitBlob,
  stripOuterBeginCommit,
  assertNoDropCascade,
  sha256Buffer,
  ROOT,
} = require("./git-blob-authority");
const {
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
  assertNoTlsBypass,
  buildProductionSsl,
  tlsPolicyError,
} = require("./ra-pro-accounting-automation-tls-ca");
const {
  assertPreconditionEvidencePublished,
} = require("./ra-pro-accounting-automation-precondition-gates");
const {
  assertPriorDryRunEvidencePublished,
} = require("./ra-pro-accounting-automation-prior-dry-run-gates");
const {
  assertPreApplyLiveEvidencePublished,
} = require("./ra-pro-accounting-automation-pre-apply-gates");
const {
  assertOneAttemptApplyAuthorization,
  preflightApplyAuthorization,
  recheckApplyAuthorizationPin,
} = require("./ra-pro-accounting-automation-apply-authorization");
const {
  captureSentinelCounts,
  collectDryRunSchemaProbes,
  verifyPostCommit,
} = require("./ra-pro-accounting-automation-schema-probes");

class IndeterminateCommitError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "IndeterminateCommitError";
    this.code = "INDETERMINATE_OUTCOME";
    this.cause = cause;
  }
}

function redactString(input) {
  let s = String(input ?? "");
  s = s.replace(/postgres(?:ql)?:\/\/[^\s)'"`]+/gi, "postgres://***");
  s = s.replace(/([?&](?:password|pass|pwd|token|secret|api[_-]?key)=)[^&\s)'"`]+/gi, "$1***");
  s = s.replace(/(password|passwd|pwd)\s*[:=]\s*[^\s)'"`]+/gi, "$1=***");
  s = s.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer ***");
  for (const envName of [DATABASE_URL_ENV, ...FORBIDDEN_DATABASE_URL_ENVS]) {
    const re = new RegExp(`${envName}\\s*[:=]\\s*[^\\s)'"\`]+`, "gi");
    s = s.replace(re, `${envName}=***`);
  }
  s = s.replace(/\/\/([^:@\s/'"]+):([^@\s/'"]+)@/g, "//***:***@");
  return s;
}

function sanitizeValue(value, depth = 0, seen = new WeakSet()) {
  if (depth > 8) return "[depth-limited]";
  if (value == null) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return String(value);
  if (typeof value === "function") return "[function]";
  if (Buffer.isBuffer(value)) return `[buffer:${value.length}]`;
  if (typeof value === "object") {
    if (seen.has(value)) return "[circular]";
    seen.add(value);
    if (value instanceof Error) {
      return {
        name: value.name,
        message: redactString(value.message),
        code: value.code || undefined,
        stack: value.stack ? redactString(value.stack) : undefined,
        cause: value.cause ? sanitizeValue(value.cause, depth + 1, seen) : undefined,
      };
    }
    if (Array.isArray(value)) return value.map((v) => sanitizeValue(v, depth + 1, seen));
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const key = String(k).toLowerCase();
      if (
        key.includes("password") ||
        key.includes("connectionstring") ||
        key.includes("database_url") ||
        key.includes("databaseurl") ||
        key === "argv" ||
        key === "config"
      ) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = sanitizeValue(v, depth + 1, seen);
    }
    return out;
  }
  return redactString(value);
}

function sanitizeError(err) {
  const sanitized = sanitizeValue(err);
  if (sanitized && typeof sanitized === "object" && sanitized.message) return sanitized.message;
  return redactString(err && err.message ? err.message : err);
}

const HOST_CLASSES = new Set([
  "direct",
  "session_pooler",
  "transaction_pooler",
  "loopback",
  "mismatched",
  "malformed",
]);
const USERNAME_CLASSES = new Set(["project_bound", "not_applicable", "mismatched", "absent"]);

function decodeOnce(value) {
  const text = String(value || "");
  if (!text.includes("%")) return text;
  if (/%(?![0-9A-Fa-f]{2})/.test(text)) return null;
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

function canonicalPort(token) {
  if (!/^[1-9][0-9]{0,4}$/.test(token)) return null;
  const port = Number(token);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || String(port) !== token) return null;
  return port;
}

function parseQueryAllowlist(query) {
  if (query == null) return { ok: false, sslmode: null };
  if (query === "" || query.includes("#") || query.includes("+")) return { ok: false, sslmode: null };
  const segments = query.split("&");
  if (segments.length !== 1 || segments[0] === "") return { ok: false, sslmode: null };
  const eq = segments[0].indexOf("=");
  if (eq <= 0) return { ok: false, sslmode: null };
  const rawKey = segments[0].slice(0, eq);
  const rawValue = segments[0].slice(eq + 1);
  if (rawKey !== "sslmode") return { ok: false, sslmode: null };
  if (rawValue !== "require" && rawValue !== "verify-full" && rawValue !== "verify-ca") {
    return { ok: false, sslmode: null };
  }
  return { ok: true, sslmode: rawValue };
}

function splitHostPort(authority) {
  if (!authority) return null;
  if (authority.startsWith("[")) {
    const end = authority.indexOf("]");
    if (end < 2) return null;
    const host = authority.slice(1, end);
    const rest = authority.slice(end + 1);
    if (rest === "") return { host, explicitPort: null };
    if (!rest.startsWith(":") || rest.length < 2) return null;
    return { host, explicitPort: rest.slice(1) };
  }
  const colon = authority.lastIndexOf(":");
  if (colon === -1) return { host: authority, explicitPort: null };
  const token = authority.slice(colon + 1);
  if (!/^[0-9]+$/.test(token)) return { host: authority, explicitPort: null };
  return { host: authority.slice(0, colon), explicitPort: token };
}

function parsePostgresUrl(raw) {
  const text = String(raw || "").trim();
  if (/[\u0000-\u0020\u007f]/.test(text) || text.includes("\\") || text.includes("#")) return null;
  const scheme = text.match(/^(postgres(?:ql)?):\/\/([\s\S]*)$/i);
  if (!scheme) return null;
  const rest = scheme[2];
  const qPos = rest.indexOf("?");
  const beforeQuery = qPos === -1 ? rest : rest.slice(0, qPos);
  const query = qPos === -1 ? null : rest.slice(qPos + 1);
  const slash = beforeQuery.indexOf("/");
  if (slash <= 0) return null;
  const authority = beforeQuery.slice(0, slash);
  const databaseRaw = beforeQuery.slice(slash + 1);
  if (databaseRaw.includes("/")) return null;
  const at = authority.lastIndexOf("@");
  const userinfo = at === -1 ? "" : authority.slice(0, at);
  const hostport = at === -1 ? authority : authority.slice(at + 1);
  const split = splitHostPort(hostport);
  if (!split || !split.host) return null;
  const hostDecoded = decodeOnce(split.host);
  const database = decodeOnce(databaseRaw);
  if (hostDecoded == null || database == null) return null;
  const host = hostDecoded.toLowerCase();
  if (!host || host.includes("%")) return null;
  let username = "";
  let password = "";
  if (userinfo) {
    const colon = userinfo.indexOf(":");
    const rawUser = colon === -1 ? userinfo : userinfo.slice(0, colon);
    const rawPass = colon === -1 ? "" : userinfo.slice(colon + 1);
    username = decodeOnce(rawUser);
    password = decodeOnce(rawPass);
    if (username == null || password == null) return null;
  }
  let explicitPort = null;
  let effectivePort = 5432;
  if (split.explicitPort != null) {
    explicitPort = canonicalPort(split.explicitPort);
    if (explicitPort == null) return null;
    effectivePort = explicitPort;
  }
  const queryParsed = parseQueryAllowlist(query);
  return {
    host,
    explicitPort,
    effectivePort,
    database,
    username,
    password,
    sslmode: queryParsed.sslmode,
    sslOk: queryParsed.ok,
  };
}

function isLoopbackHost(host) {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function isExactDirectHost(host, ref) {
  return host === `db.${ref}.supabase.co`;
}

function isApprovedPoolerHost(host) {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.pooler\.supabase\.com$/.test(
    host,
  );
}

function classifyDatabaseUrl(raw, expectedProjectRef = EXPECTED_PROJECT_REF) {
  const ref = String(expectedProjectRef || "").toLowerCase();
  const empty = {
    ok: false,
    reason: "MALFORMED_DATABASE_URL",
    host_class: "malformed",
    username_class: "absent",
    is_local: false,
    matches_expected_project_ref: false,
    database_name_match: false,
    ssl_requirement_match: false,
    port_class_match: false,
    expected_project_ref: expectedProjectRef,
  };
  const parts = parsePostgresUrl(raw);
  if (!parts || !ref) return empty;
  const databaseNameMatch = parts.database === "postgres";
  const sslRequirementMatch = parts.sslOk === true;
  if (isLoopbackHost(parts.host)) {
    return {
      ok: true,
      host_class: "loopback",
      username_class: "not_applicable",
      is_local: true,
      matches_expected_project_ref: false,
      database_name_match: databaseNameMatch,
      ssl_requirement_match: sslRequirementMatch,
      port_class_match: parts.effectivePort === 5432,
      expected_project_ref: expectedProjectRef,
    };
  }
  if (isExactDirectHost(parts.host, ref)) {
    const portClassMatch = parts.effectivePort === 5432;
    return {
      ok: true,
      host_class: "direct",
      username_class: "not_applicable",
      is_local: false,
      matches_expected_project_ref: portClassMatch && databaseNameMatch && sslRequirementMatch,
      database_name_match: databaseNameMatch,
      ssl_requirement_match: sslRequirementMatch,
      port_class_match: portClassMatch,
      expected_project_ref: expectedProjectRef,
    };
  }
  if (isApprovedPoolerHost(parts.host)) {
    const session = parts.effectivePort === 5432;
    const transaction = parts.explicitPort === 6543;
    const portClassMatch = session || transaction;
    const usernameClass =
      parts.username === `postgres.${ref}` ? "project_bound" : parts.username ? "mismatched" : "absent";
    return {
      ok: true,
      host_class: transaction ? "transaction_pooler" : session ? "session_pooler" : "mismatched",
      username_class: usernameClass,
      is_local: false,
      matches_expected_project_ref:
        portClassMatch && databaseNameMatch && sslRequirementMatch && usernameClass === "project_bound",
      database_name_match: databaseNameMatch,
      ssl_requirement_match: sslRequirementMatch,
      port_class_match: portClassMatch,
      expected_project_ref: expectedProjectRef,
    };
  }
  return {
    ok: true,
    host_class: "mismatched",
    username_class: parts.username ? "mismatched" : "absent",
    is_local: false,
    matches_expected_project_ref: false,
    database_name_match: databaseNameMatch,
    ssl_requirement_match: sslRequirementMatch,
    port_class_match: false,
    expected_project_ref: expectedProjectRef,
  };
}

function sanitizeUriDiagnostics(diagnostics) {
  if (!diagnostics || typeof diagnostics !== "object") return diagnostics;
  const hostClass = HOST_CLASSES.has(diagnostics.host_class)
    ? diagnostics.host_class
    : diagnostics.ok
      ? "mismatched"
      : "malformed";
  const usernameClass = USERNAME_CLASSES.has(diagnostics.username_class)
    ? diagnostics.username_class
    : "absent";
  return {
    ok: Boolean(diagnostics.ok),
    host_class: hostClass,
    username_class: usernameClass,
    is_local: Boolean(diagnostics.is_local),
    matches_expected_project_ref: Boolean(diagnostics.matches_expected_project_ref),
    database_name_match: Boolean(diagnostics.database_name_match),
    ssl_requirement_match: Boolean(diagnostics.ssl_requirement_match),
    port_class_match: Boolean(diagnostics.port_class_match),
    expected_project_ref: diagnostics.expected_project_ref || EXPECTED_PROJECT_REF,
    reason: diagnostics.reason || undefined,
  };
}

function buildPgClientConfig(raw, env = process.env) {
  const parts = parsePostgresUrl(raw);
  if (!parts) {
    const e = new Error("MALFORMED_DATABASE_URL");
    e.code = "MALFORMED_DATABASE_URL";
    throw e;
  }
  const config = {
    host: parts.host,
    port: parts.effectivePort,
    user: parts.username,
    password: parts.password,
    database: parts.database,
  };
  if (!isLoopbackHost(parts.host)) {
    config.ssl = buildProductionSsl(parts.host, env);
  }
  return config;
}

function classificationParity(raw) {
  const diagnostics = classifyDatabaseUrl(raw);
  const parts = parsePostgresUrl(raw);
  return {
    ok: Boolean(diagnostics.ok),
    host_class: diagnostics.host_class || "malformed",
    username_class: diagnostics.username_class || "absent",
    is_local: Boolean(diagnostics.is_local),
    matches_expected_project_ref: Boolean(diagnostics.matches_expected_project_ref),
    database_name_match: Boolean(diagnostics.database_name_match),
    ssl_requirement_match: Boolean(diagnostics.ssl_requirement_match),
    port_class_match: Boolean(diagnostics.port_class_match),
    effective_port: parts && parts.effectivePort ? parts.effectivePort : 0,
  };
}

function inspectNormalizedClient(raw) {
  const diagnostics = sanitizeUriDiagnostics(classifyDatabaseUrl(raw));
  const accepted = Boolean(
    diagnostics && diagnostics.ok && (diagnostics.matches_expected_project_ref || diagnostics.is_local),
  );
  if (!accepted) return { accepted: false, uri_diagnostics: diagnostics };
  const config = buildPgClientConfig(raw);
  return {
    accepted: true,
    uri_diagnostics: diagnostics,
    client: {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: config.ssl
        ? {
            rejectUnauthorized: config.ssl.rejectUnauthorized === true,
            servername: config.host,
            ca_der_sha256: OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
            hostname_verification: "enabled",
            min_version: "TLSv1.2",
          }
        : null,
    },
  };
}

function assertFeatureFlagUntouched(env = process.env) {
  if (Object.prototype.hasOwnProperty.call(env, FEATURE_FLAG_ENV) && env[FEATURE_FLAG_ENV] === "true") {
    const e = new Error(
      `${FEATURE_FLAG_ENV}=true is forbidden during applicator execution; leave absent/false`,
    );
    e.code = "FEATURE_FLAG_MUST_REMAIN_CLOSED";
    throw e;
  }
}

function resolveDatabaseUrlFromEnv(env = process.env, options = {}) {
  assertNoTlsBypass(env);
  assertFeatureFlagUntouched(env);
  for (const forbidden of FORBIDDEN_DATABASE_URL_ENVS) {
    if (Object.prototype.hasOwnProperty.call(env, forbidden) && env[forbidden]) {
      const e = new Error(`PROHIBITED_CREDENTIAL_CHANNEL: ${forbidden} is forbidden`);
      e.code = "PROHIBITED_CREDENTIAL_CHANNEL";
      e.uri_diagnostics = sanitizeUriDiagnostics(classifyDatabaseUrl(env[forbidden]));
      e.phase = "uri_validate";
      throw e;
    }
  }
  const raw = env[DATABASE_URL_ENV];
  if (!raw) {
    const e = new Error(`MISSING_INPUT: ${DATABASE_URL_ENV} required`);
    e.code = "MISSING_INPUT";
    e.phase = "uri_validate";
    throw e;
  }
  const diagnostics = sanitizeUriDiagnostics(classifyDatabaseUrl(raw));
  if (!diagnostics.ok) {
    const e = new Error("MALFORMED_DATABASE_URL");
    e.code = "MALFORMED_DATABASE_URL";
    e.uri_diagnostics = diagnostics;
    e.phase = "uri_validate";
    throw e;
  }
  const allowLocalhostForHarness = options.allowLocalhostForHarness === true;
  if (diagnostics.is_local) {
    if (!allowLocalhostForHarness) {
      const e = new Error(
        "DATABASE_PROJECT_REF_MISMATCH: loopback hosts are forbidden outside in-process harness",
      );
      e.code = "DATABASE_PROJECT_REF_MISMATCH";
      e.uri_diagnostics = diagnostics;
      e.phase = "uri_validate";
      throw e;
    }
  } else if (!diagnostics.matches_expected_project_ref) {
    const e = new Error(
      `DATABASE_PROJECT_REF_MISMATCH: connection is not bound to Supabase project ${EXPECTED_PROJECT_REF}`,
    );
    e.code = "DATABASE_PROJECT_REF_MISMATCH";
    e.uri_diagnostics = diagnostics;
    e.phase = "uri_validate";
    throw e;
  }
  return { clientConfig: buildPgClientConfig(raw, env), uri_diagnostics: diagnostics };
}

function scopedClientOptions(clientConfig, env = process.env) {
  assertNoTlsBypass(env);
  if (!clientConfig || typeof clientConfig !== "object" || clientConfig.connectionString) {
    const e = new Error("MALFORMED_DATABASE_URL");
    e.code = "MALFORMED_DATABASE_URL";
    throw e;
  }
  if (clientConfig.sslmode || clientConfig.sslrootcert) {
    throw tlsPolicyError("BLOCKED_TLS_BYPASS", "BLOCKED_TLS_BYPASS: sslmode/sslrootcert on the client is forbidden");
  }
  const options = {
    host: clientConfig.host,
    port: clientConfig.port,
    user: clientConfig.user,
    password: clientConfig.password,
    database: clientConfig.database,
  };
  if (isLoopbackHost(clientConfig.host)) {
    if (clientConfig.ssl && clientConfig.ssl.rejectUnauthorized === false) {
      throw tlsPolicyError("BLOCKED_TLS_BYPASS", "BLOCKED_TLS_BYPASS: rejectUnauthorized false is forbidden");
    }
    if (clientConfig.ssl) options.ssl = clientConfig.ssl;
    return options;
  }
  const ssl = buildProductionSsl(clientConfig.host, env);
  if (clientConfig.ssl) {
    if (clientConfig.ssl.rejectUnauthorized === false) {
      throw tlsPolicyError("BLOCKED_TLS_BYPASS", "BLOCKED_TLS_BYPASS: rejectUnauthorized false is forbidden");
    }
    if (Array.isArray(clientConfig.ssl.ca)) {
      throw tlsPolicyError("BLOCKED_TLS_CA_EXTRA", "BLOCKED_TLS_CA_EXTRA: additional unapproved CA is forbidden");
    }
    if (clientConfig.ssl.ca && clientConfig.ssl.ca !== ssl.ca) {
      throw tlsPolicyError(
        "BLOCKED_TLS_CA_PIN_MISMATCH",
        "BLOCKED_TLS_CA_PIN_MISMATCH: client CA does not match the sealed Supabase root",
      );
    }
    if (clientConfig.ssl.servername && clientConfig.ssl.servername !== clientConfig.host) {
      throw tlsPolicyError("HOSTNAME_MISMATCH", "HOSTNAME_MISMATCH: servername must equal the validated host");
    }
  }
  options.ssl = ssl;
  return options;
}

function resolveRepoRoot(inputs = {}) {
  if (inputs.cwd) return inputs.cwd;
  const candidates = [
    process.cwd(),
    ROOT,
    // Modular scripts live in scripts/security → ../..
    path.resolve(__dirname, "../.."),
    // Standalone bundle lives in scripts/security/bundles → ../../..
    path.resolve(__dirname, "../../.."),
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(path.join(candidate, TOOLING_AUTHORIZATION_PATH))) {
        return candidate;
      }
    } catch {
      // continue
    }
  }
  return process.cwd();
}

function loadAuthorizationPackage(cwd = ROOT, commit) {
  const publication = commit || execFileSync("git", ["rev-parse", "HEAD"], {
    cwd,
    encoding: "utf8",
    env: (() => {
      const env = { ...process.env };
      const n = Number(env.GIT_CONFIG_COUNT || 0);
      env.GIT_CONFIG_COUNT = String(n + 1);
      env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
      env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
      return env;
    })(),
  }).trim();
  const loaded = loadAndVerifyGitBlob({
    commit: publication,
    path: TOOLING_AUTHORIZATION_PATH,
    cwd,
  });
  return JSON.parse(loaded.buffer.toString("utf8"));
}

function assertNoHarnessEnvOrArgv(inputs = {}) {
  const env = inputs.env || process.env;
  const forbiddenEnv = [
    "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_HARNESS",
    "ALLOW_UNPUBLISHED_FOR_HARNESS",
    "ALLOW_UNPUBLISHED_RA_PRO_ACCOUNTING_AUTOMATION",
    "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST",
    "ALLOW_LOCALHOST_FOR_HARNESS",
    "RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST_FOR_HARNESS",
    "RA_PRO_ACCOUNTING_AUTOMATION_SYNTHETIC_APPLY_AUTHORIZATION",
    "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_ATTEMPT_ID",
    "RA_PRO_ACCOUNTING_AUTOMATION_PUBLICATION_COMMIT",
    "RA_PRO_ACCOUNTING_AUTOMATION_EXECUTABLE_COMMIT",
  ];
  for (const name of forbiddenEnv) {
    if (Object.prototype.hasOwnProperty.call(env, name) && env[name]) {
      const e = new Error(`HARNESS_VIA_ENV_FORBIDDEN: ${name}`);
      e.code = "HARNESS_VIA_ENV_FORBIDDEN";
      e.phase = "bundle_authority";
      throw e;
    }
  }
  const argv = inputs.argv || process.argv || [];
  if (argv.some((a) => /harness|allow-unpublished|allow-localhost|synthetic-apply|apply-attempt|publication-commit|executable-commit/i.test(String(a)))) {
    const e = new Error("HARNESS_VIA_ARGV_FORBIDDEN");
    e.code = "HARNESS_VIA_ARGV_FORBIDDEN";
    e.phase = "bundle_authority";
    throw e;
  }
}

function isPublishedHexOid(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/i.test(value);
}

function isPublishedHexSha256(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value) && !value.startsWith("PENDING_");
}

function resolveBundleSeals(inputs = {}) {
  if (inputs.bundleSealsOverride) return inputs.bundleSealsOverride;
  const auth = loadAuthorizationPackage(resolveRepoRoot(inputs));
  const fromAuth = auth.standalone_bundle || {};
  const oid = fromAuth.oid || STANDALONE_BUNDLE_OID;
  const sha256 = fromAuth.sha256 || STANDALONE_BUNDLE_SHA256;
  const bytes = fromAuth.bytes != null ? fromAuth.bytes : STANDALONE_BUNDLE_BYTES;
  const bundlePath = fromAuth.path || STANDALONE_BUNDLE_PATH;
  return { path: bundlePath, oid, sha256, bytes, source: "tooling_authorization+constants" };
}

/**
 * Mandatory external bundle gate. Runs before credentials, DB connect, or SQL.
 * PENDING EXPECTED_STANDALONE_BUNDLE_SHA256 is inert and never treated as a match.
 * Authority is git cat-file of the committed LF blob (never CRLF worktree bytes).
 */
function assertBundleAuthority(inputs = {}) {
  assertNoHarnessEnvOrArgv(inputs);

  // EXPECTED_STANDALONE_BUNDLE_SHA256 must never authorize by itself.
  if (
    EXPECTED_STANDALONE_BUNDLE_SHA256 &&
    !String(EXPECTED_STANDALONE_BUNDLE_SHA256).startsWith("PENDING_") &&
    isPublishedHexSha256(EXPECTED_STANDALONE_BUNDLE_SHA256)
  ) {
    // Optional cross-check only when published; still requires external OID/bytes gate below.
  } else if (
    EXPECTED_STANDALONE_BUNDLE_SHA256 &&
    !String(EXPECTED_STANDALONE_BUNDLE_SHA256).startsWith("PENDING_")
  ) {
    const e = new Error("BUNDLE_SELF_HASH_INVALID");
    e.code = "BUNDLE_AUTHORITY_UNPUBLISHED";
    e.phase = "bundle_authority";
    throw e;
  }

  const seals = resolveBundleSeals(inputs);
  if (
    !seals ||
    !isPublishedHexOid(seals.oid) ||
    !isPublishedHexSha256(seals.sha256) ||
    !Number.isInteger(seals.bytes) ||
    seals.bytes <= 0 ||
    String(seals.oid).startsWith("PENDING_") ||
    String(seals.sha256).startsWith("PENDING_")
  ) {
    const e = new Error(
      "BUNDLE_AUTHORITY_UNPUBLISHED: standalone_bundle OID/SHA/bytes pins missing or PENDING",
    );
    e.code = "BUNDLE_AUTHORITY_UNPUBLISHED";
    e.phase = "bundle_authority";
    throw e;
  }

  // Constants mirror must agree when both are published (detect drift).
  if (isPublishedHexOid(STANDALONE_BUNDLE_OID) && STANDALONE_BUNDLE_OID !== seals.oid) {
    const e = new Error("BUNDLE_AUTHORITY_CONSTANTS_DRIFT: OID mismatch vs TOOLING_AUTHORIZATION");
    e.code = "BUNDLE_AUTHORITY_MISMATCH";
    e.phase = "bundle_authority";
    throw e;
  }
  if (
    isPublishedHexSha256(STANDALONE_BUNDLE_SHA256) &&
    STANDALONE_BUNDLE_SHA256 !== seals.sha256
  ) {
    const e = new Error("BUNDLE_AUTHORITY_CONSTANTS_DRIFT: SHA-256 mismatch vs TOOLING_AUTHORIZATION");
    e.code = "BUNDLE_AUTHORITY_MISMATCH";
    e.phase = "bundle_authority";
    throw e;
  }
  if (
    Number.isInteger(STANDALONE_BUNDLE_BYTES) &&
    STANDALONE_BUNDLE_BYTES > 0 &&
    STANDALONE_BUNDLE_BYTES !== seals.bytes
  ) {
    const e = new Error("BUNDLE_AUTHORITY_CONSTANTS_DRIFT: bytes mismatch vs TOOLING_AUTHORIZATION");
    e.code = "BUNDLE_AUTHORITY_MISMATCH";
    e.phase = "bundle_authority";
    throw e;
  }

  const cwd = resolveRepoRoot(inputs);
  let commit = inputs.bundleAuthorityCommit;
  if (!commit) {
    try {
      commit = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd,
        encoding: "utf8",
        env: (() => {
          const env = { ...process.env };
          const n = Number(env.GIT_CONFIG_COUNT || 0);
          env.GIT_CONFIG_COUNT = String(n + 1);
          env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
          env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
          return env;
        })(),
      }).trim();
    } catch (err) {
      const e = new Error(`BUNDLE_AUTHORITY_GIT_HEAD_UNRESOLVED: ${err.message}`);
      e.code = "BUNDLE_AUTHORITY_MISMATCH";
      e.phase = "bundle_authority";
      throw e;
    }
  }

  try {
    const loaded = loadAndVerifyGitBlob({
      commit,
      path: seals.path,
      expectedOid: seals.oid,
      expectedSha256: seals.sha256,
      expectedBytes: seals.bytes,
      cwd,
    });
    if (loaded.buffer.includes(0x0d)) {
      const e = new Error("BUNDLE_NOT_LF_ONLY: committed blob contains CR");
      e.code = "BUNDLE_CRLF_FORBIDDEN";
      e.phase = "bundle_authority";
      throw e;
    }
    return {
      path: seals.path,
      oid: loaded.oid,
      sha256: loaded.sha256,
      bytes: loaded.bytes,
      commit,
      phase: "bundle_authority",
    };
  } catch (err) {
    if (err.code && String(err.code).startsWith("BUNDLE_")) throw err;
    const e = new Error(err.message || "BUNDLE_AUTHORITY_MISMATCH");
    e.code = err.code || "BUNDLE_AUTHORITY_MISMATCH";
    e.phase = "bundle_authority";
    e.cause = err;
    throw e;
  }
}

/**
 * Apply-mode authority only. Dry-run must NOT call this — prior-dry-run /
 * pre-apply pins are produced by a reviewed production dry run and would be circular.
 */
function assertAuthorizationPublished(inputs = {}) {
  assertNoHarnessEnvOrArgv(inputs);
  const cwd = resolveRepoRoot(inputs);
  const publicationCommit =
    inputs.allowDisposablePublicationCommit === true ? inputs.publicationCommit : undefined;
  const auth = loadAuthorizationPackage(cwd, publicationCommit);
  const pub = auth.publication || {};
  if (pub.required_prior_dry_run_evidence_sha256 != null) {
    assertPriorDryRunEvidencePublished({
      auth,
      cwd,
      env: inputs.env || process.env,
      priorDryRunEvidencePath: inputs.priorDryRunEvidencePath,
    });
  }
  if (pub.required_prior_dry_run_evidence_sha256 == null) {
    const e = new Error(
      "AUTHORIZATION_PINS_UNPUBLISHED: prior-dry-run and pre-apply pins are null/UNPUBLISHED; apply remains unreachable",
    );
    e.code = "AUTHORIZATION_PINS_UNPUBLISHED";
    e.phase = "authorization";
    throw e;
  }
  assertPreApplyLiveEvidencePublished({
    auth,
    cwd,
    env: inputs.env || process.env,
    preApplyEvidencePath: inputs.preApplyEvidencePath,
    now: inputs.now,
  });
  const decision = assertOneAttemptApplyAuthorization({
    ...inputs,
    cwd,
    auth,
    env: inputs.env || {},
  });
  if (decision.authorized_executable_commit) {
    const executable = decision.authorized_executable_commit;
    const requestedArtifact = inputs.artifactCommit ? String(inputs.artifactCommit).toLowerCase() : "";
    const requestedBundle = inputs.bundleAuthorityCommit ? String(inputs.bundleAuthorityCommit).toLowerCase() : "";
    if ((requestedArtifact && requestedArtifact !== executable) || (requestedBundle && requestedBundle !== executable)) {
      const e = new Error("APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN: executable commit");
      e.code = "APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN";
      e.phase = "authorization";
      throw e;
    }
    inputs.artifactCommit = executable;
    inputs.bundleAuthorityCommit = executable;
  }
  return decision;
}

const assertApplyAuthorizationPublished = assertAuthorizationPublished;

function assertPublishedPrecondition(inputs = {}) {
  const cwd = resolveRepoRoot(inputs);
  const auth = loadAuthorizationPackage(cwd);
  return assertPreconditionEvidencePublished({
    auth,
    cwd,
    now: inputs.now,
    env: inputs.env || process.env,
    preconditionEvidencePath: inputs.preconditionEvidencePath,
  });
}

function assertMigrationOrder(migrations = MIGRATIONS) {
  for (let i = 1; i < migrations.length; i += 1) {
    if (migrations[i].version <= migrations[i - 1].version) {
      const e = new Error(
        `MIGRATION_ORDER_INVALID: ${migrations[i].version} must follow ${migrations[i - 1].version}`,
      );
      e.code = "MIGRATION_ORDER_INVALID";
      throw e;
    }
  }
  if (PRIOR_HISTORY_COUNT + migrations.length !== POST_HISTORY_COUNT) {
    const e = new Error("HISTORY_CONTRACT_INVALID");
    e.code = "HISTORY_CONTRACT_INVALID";
    throw e;
  }
}

function loadSealedMigrations(inputs = {}) {
  assertMigrationOrder();
  const commit = inputs.artifactCommit || ARTIFACT_COMMIT;
  const cwd = resolveRepoRoot(inputs);
  return MIGRATIONS.map((migration) => {
    const loaded = loadAndVerifyGitBlob({
      commit,
      path: migration.path,
      expectedOid: migration.oid,
      expectedSha256: migration.sha256,
      expectedBytes: migration.bytes,
      cwd,
    });
    const fullSql = loaded.buffer.toString("utf8");
    assertNoDropCascade(fullSql);
    const innerSql = stripOuterBeginCommit(fullSql);
    return { migration, loaded, fullSql, innerSql };
  });
}

async function withClient(clientConfig, fn) {
  const options = scopedClientOptions(clientConfig);
  if (options.connectionString) {
    const e = new Error("MALFORMED_DATABASE_URL");
    e.code = "MALFORMED_DATABASE_URL";
    throw e;
  }
  const client = new Client({
    host: options.host,
    port: options.port,
    user: options.user,
    password: options.password,
    database: options.database,
    ssl: options.ssl,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function assertHistoryCount(client, expected) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
  );
  if (rows[0].c !== expected) {
    const e = new Error(`HISTORY_COUNT_MISMATCH: got ${rows[0].c}, expected ${expected}`);
    e.code = "HISTORY_COUNT_MISMATCH";
    throw e;
  }
}

async function assertVersionAbsent(client, version) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations WHERE version = $1`,
    [version],
  );
  if (rows[0].c !== 0) {
    const e = new Error(`VERSION_ALREADY_PRESENT: ${version}`);
    e.code = "VERSION_ALREADY_PRESENT";
    throw e;
  }
}

async function captureHistoryManifest(client) {
  const { rows } = await client.query(`
    SELECT version, name, statements
    FROM supabase_migrations.schema_migrations
    ORDER BY version ASC
  `);
  return rows.map((r) => {
    const statements = r.statements || [];
    return {
      version: r.version,
      name: r.name,
      statement_count: statements.length,
      statements_digest: sha256Buffer(Buffer.from(statements.join("\n"), "utf8")),
    };
  });
}

function manifestsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].version !== b[i].version ||
      a[i].name !== b[i].name ||
      a[i].statement_count !== b[i].statement_count ||
      a[i].statements_digest !== b[i].statements_digest
    ) {
      return false;
    }
  }
  return true;
}

function buildEvidenceBase(inputs) {
  return {
    package: "ra-pro-accounting-automation-apply",
    mode: inputs.mode || "dry-run",
    artifact_commit: ARTIFACT_COMMIT,
    database_url_env: DATABASE_URL_ENV,
    advisory_lock: ADVISORY_LOCK,
    history_contract: { prior: PRIOR_HISTORY_COUNT, post: POST_HISTORY_COUNT },
    migrations: MIGRATIONS.map((m) => ({ version: m.version, name: m.name, oid: m.oid })),
    feature_flag_env: FEATURE_FLAG_ENV,
    feature_flag_touched: false,
    sqlApplicationAttempts: 0,
    databaseConnectionAttempts: 0,
    productionContact: false,
  };
}

function finalizeEvidence(evidence) {
  return sanitizeValue(evidence);
}

async function tryAdvisoryLock(client, inputs = {}) {
  if (inputs.lockTimeoutMs === 0) {
    const { rows } = await client.query(
      `SELECT pg_try_advisory_xact_lock($1::int, $2::int) AS got`,
      [ADVISORY_LOCK.key1, ADVISORY_LOCK.key2],
    );
    if (!rows[0].got) {
      const e = new Error("ADVISORY_LOCK_CONTENTION");
      e.code = "ADVISORY_LOCK_CONTENTION";
      throw e;
    }
    return;
  }
  await client.query("SET LOCAL lock_timeout = '5s'");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1::int, $2::int)", [
      ADVISORY_LOCK.key1,
      ADVISORY_LOCK.key2,
    ]);
  } catch (err) {
    const e = new Error("ADVISORY_LOCK_CONTENTION");
    e.code = "ADVISORY_LOCK_CONTENTION";
    e.cause = err;
    throw e;
  }
}

async function insertMigrationHistory(client, packed) {
  await client.query(packed.innerSql);
  await client.query(
    `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
     VALUES ($1, $2, ARRAY[$3]::text[])`,
    [packed.migration.version, packed.migration.name, packed.fullSql],
  );
  const { rows: stored } = await client.query(
    `SELECT version, name, statements
     FROM supabase_migrations.schema_migrations
     WHERE version = $1`,
    [packed.migration.version],
  );
  if (stored.length !== 1) {
    throw new Error(`HISTORY_INSERT_VERIFY_FAIL: ${packed.migration.version} row count != 1`);
  }
  const stmts = stored[0].statements || [];
  if (stmts.length !== 1 || stmts[0] !== packed.fullSql) {
    throw new Error(`HISTORY_INSERT_VERIFY_FAIL: ${packed.migration.version} statements mismatch`);
  }
  if (sha256Buffer(Buffer.from(stmts[0], "utf8")) !== packed.loaded.sha256) {
    throw new Error(`HISTORY_INSERT_VERIFY_FAIL: ${packed.migration.version} digest mismatch`);
  }
  if (Buffer.byteLength(stmts[0], "utf8") !== packed.loaded.bytes) {
    throw new Error(`HISTORY_INSERT_VERIFY_FAIL: ${packed.migration.version} byte length mismatch`);
  }
}

async function runDryRun(inputs = {}) {
  const evidence = buildEvidenceBase({ ...inputs, mode: "dry-run" });
  evidence.authorization_scope = "dry_run_precondition_only";
  evidence.migration_sql_attempts = 0;
  try {
    // Bundle → precondition → (no prior/pre-apply pins) → credentials → DB → zero SQL apply.
    evidence.bundle_authority = assertBundleAuthority(inputs);
    evidence.databaseConnectionAttempts = 0;
    evidence.sqlApplicationAttempts = 0;
    evidence.precondition_evidence = assertPublishedPrecondition(inputs);
    // Intentionally do NOT call assertAuthorizationPublished / apply pins here.
    assertFeatureFlagUntouched(inputs.env || process.env);
    const packed = loadSealedMigrations(inputs);
    evidence.source_authority = packed.map((p) => ({
      version: p.migration.version,
      oid: p.loaded.oid,
      sha256: p.loaded.sha256,
      bytes: p.loaded.bytes,
    }));
    const resolved = resolveDatabaseUrlFromEnv(inputs.env || process.env, {
      allowLocalhostForHarness: inputs.allowLocalhostForHarness === true,
    });
    evidence.uri_diagnostics = resolved.uri_diagnostics;
    evidence.databaseConnectionAttempts = 1;
    evidence.productionContact = inputs.allowLocalhostForHarness === true ? false : true;
    evidence.read_only = true;
    evidence.transaction_mutation = false;
    await withClient(resolved.clientConfig, async (client) => {
      await client.query("BEGIN");
      try {
        await tryAdvisoryLock(client, inputs);
        evidence.advisory_lock_acquired = true;
        const probes = await collectDryRunSchemaProbes(client);
        evidence.schema_probes = probes.view;
        evidence.prior_history_count = probes.view.history_count;
        evidence.versions_absent = probes.versionsAbsent;
        if (probes.failed.includes("versions_absent")) {
          throw Object.assign(new Error("VERSION_ALREADY_PRESENT"), { code: "VERSION_ALREADY_PRESENT" });
        }
        if (probes.failed.includes("history_count")) {
          throw Object.assign(new Error("HISTORY_COUNT_MISMATCH"), { code: "HISTORY_COUNT_MISMATCH" });
        }
        if (!probes.ok) {
          throw Object.assign(new Error("SCHEMA_PROBE_FAILED"), { code: "SCHEMA_PROBE_FAILED" });
        }
        await client.query("ROLLBACK");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      }
    });
    evidence.verdict = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
    evidence.result_code = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
    evidence.sqlApplicationAttempts = 0;
    evidence.migration_sql_attempts = 0;
    return finalizeEvidence(evidence);
  } catch (err) {
    evidence.verdict = "DRY_RUN_BLOCKED";
    evidence.result_code = err.code || "DRY_RUN_FAIL";
    evidence.error = sanitizeError(err);
    evidence.error_code = err.code || "DRY_RUN_FAIL";
    evidence.phase = err.phase || "dry_run";
    if (err.uri_diagnostics) evidence.uri_diagnostics = err.uri_diagnostics;
    return finalizeEvidence(evidence);
  }
}

async function runApply(inputs = {}) {
  const evidence = buildEvidenceBase({ ...inputs, mode: "apply" });
  let clientConfig;
  let packed;
  let priorManifest = null;
  let commitPhase = "pre_commit";

  try {
    // Bundle → precondition → apply pins (prior-dry-run + pre-apply) → token → credentials → SQL.
    evidence.bundle_authority = assertBundleAuthority(inputs);
    evidence.databaseConnectionAttempts = 0;
    evidence.sqlApplicationAttempts = 0;
    if (inputs.allowDisposablePublicationCommit !== true) {
      const pin = String(inputs.authorizationPin || "");
      const parts = pin.split(":");
      if (parts.length === 2 && /^[0-9a-f]{40}$/.test(parts[0]) && /^[0-9a-f]{40}$/.test(parts[1])) {
        recheckApplyAuthorizationPin({
          cwd: resolveRepoRoot(inputs),
          expectCommit: parts[0],
          expectBlobOid: parts[1],
          now: inputs.now,
        });
      } else {
        const probe = preflightApplyAuthorization({
          cwd: resolveRepoRoot(inputs),
          now: inputs.now,
        });
        if (!probe.blocked) {
          const pinError = new Error("APPLY_AUTHORIZATION_PIN_MISMATCH: pin required before credentials");
          pinError.code = "APPLY_AUTHORIZATION_PIN_MISMATCH";
          pinError.phase = "authorization";
          throw pinError;
        }
      }
    }
    evidence.authorization_scope = "apply_requires_prior_and_pre_apply_pins";
    evidence.precondition_evidence = assertPublishedPrecondition(inputs);
    evidence.apply_authorization = assertApplyAuthorizationPublished(inputs);
    if (inputs.bundleAuthorityCommit) {
      evidence.bundle_authority = assertBundleAuthority(inputs);
    }
    packed = loadSealedMigrations(inputs);
    evidence.source_authority = packed.map((p) => ({
      version: p.migration.version,
      oid: p.loaded.oid,
      sha256: p.loaded.sha256,
      bytes: p.loaded.bytes,
    }));
    assertFeatureFlagUntouched(inputs.env || process.env);
    if (inputs.authorizationToken !== APPLY_AUTHORIZATION_TOKEN) {
      const e = new Error("APPLY_AUTHORIZATION_TOKEN_MISMATCH");
      e.code = "APPLY_AUTHORIZATION_TOKEN_MISMATCH";
      throw e;
    }
    const resolved = resolveDatabaseUrlFromEnv(inputs.env || process.env, {
      allowLocalhostForHarness: inputs.allowLocalhostForHarness === true,
    });
    clientConfig = resolved.clientConfig;
    evidence.uri_diagnostics = resolved.uri_diagnostics;
    // Migrations were sealed before the credential parse. Reuse that pack.
  } catch (err) {
    evidence.verdict = "APPLY_BLOCKED";
    evidence.result_code = err.code || "APPLY_BLOCKED";
    evidence.error = sanitizeError(err);
    evidence.error_code = err.code || "APPLY_BLOCKED";
    evidence.phase = err.phase || "pre_connect";
    if (err.uri_diagnostics) evidence.uri_diagnostics = err.uri_diagnostics;
    evidence.sqlApplicationAttempts = 0;
    return finalizeEvidence(evidence);
  }

  try {
    evidence.databaseConnectionAttempts = 1;
    await withClient(clientConfig, async (client) => {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '30s'");
      await tryAdvisoryLock(client, inputs);
      evidence.advisory_lock_acquired = true;

      for (const p of packed) await assertVersionAbsent(client, p.migration.version);
      await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
      priorManifest = await captureHistoryManifest(client);
      evidence.prior_history_count = priorManifest.length;
      const sentinelBefore = await captureSentinelCounts(client);

      if (inputs.injectFailure === "before_sql") {
        throw new Error("INJECTED_FAILURE_BEFORE_SQL");
      }

      evidence.sqlApplicationAttempts = packed.length;
      for (const p of packed) {
        if (inputs.injectFailure === "before_history" && p === packed[0]) {
          await client.query(p.innerSql);
          throw new Error("INJECTED_FAILURE_BEFORE_HISTORY");
        }
        await insertMigrationHistory(client, p);
        if (inputs.injectFailure === "after_first_history" && p === packed[0]) {
          throw new Error("INJECTED_FAILURE_AFTER_FIRST_HISTORY");
        }
      }

      const postManifest = await captureHistoryManifest(client);
      const priorOnly = postManifest.filter(
        (row) => !packed.some((p) => p.migration.version === row.version),
      );
      if (!manifestsEqual(priorOnly, priorManifest)) {
        throw new Error("PRIOR_HISTORY_MUTATION_DETECTED");
      }
      if (postManifest.length !== POST_HISTORY_COUNT) {
        throw new Error(
          `HISTORY_COUNT_AFTER_MISMATCH: got ${postManifest.length}, expected ${POST_HISTORY_COUNT}`,
        );
      }

      if (inputs.injectFailure === "before_commit") {
        throw new Error("INJECTED_FAILURE_BEFORE_COMMIT");
      }
      commitPhase = "committing";
      if (inputs.injectFailure === "during_commit") {
        throw new IndeterminateCommitError("INJECTED_CONNECTION_LOSS_DURING_COMMIT");
      }
      await client.query("COMMIT");
      commitPhase = "committed";
      if (inputs.injectFailure === "after_commit_ack") {
        throw new IndeterminateCommitError("INJECTED_CONNECTION_LOSS_AFTER_COMMIT_ACK");
      }

      commitPhase = "verifying";
      const verification = await verifyPostCommit(client, {
        packed,
        sentinelBefore,
        env: inputs.env || process.env,
        injectFailure: inputs.injectFailure,
      });
      evidence.post_commit_verification = verification.view;
      if (!verification.ok) {
        const failed = Object.assign(new Error("POST_COMMIT_VERIFICATION_FAILED"), {
          code: verification.failed[0] || "POST_COMMIT_VERIFICATION_FAILED",
          verificationFailed: true,
        });
        throw failed;
      }
      assertFeatureFlagUntouched(inputs.env || process.env);
      evidence.feature_flag_touched = false;
      evidence.retry_attempted = false;
      evidence.verdict = "APPLY_COMMITTED";
      evidence.result_code = "APPLY_COMMITTED";
      evidence.phase = "apply_committed";
      evidence.stored = packed.map((p) => ({
        version: p.migration.version,
        sha256: p.loaded.sha256,
        bytes: p.loaded.bytes,
      }));
    });
  } catch (err) {
    if (err.verificationFailed || commitPhase === "verifying") {
      evidence.verdict = "POST_COMMIT_VERIFICATION_FAILED";
      evidence.result_code = err.code || "POST_COMMIT_VERIFICATION_FAILED";
      evidence.error = sanitizeError(err);
      evidence.error_code = err.code || "POST_COMMIT_VERIFICATION_FAILED";
      evidence.phase = "post_commit_verification";
      evidence.retry_attempted = false;
      return finalizeEvidence(evidence);
    }
    const uncertain =
      commitPhase === "committing" ||
      commitPhase === "committed" ||
      err instanceof IndeterminateCommitError;
    if (uncertain) {
      evidence.verdict = "INDETERMINATE_OUTCOME";
      evidence.result_code = "INDETERMINATE_OUTCOME";
      evidence.error = sanitizeError(err);
      evidence.error_code = "INDETERMINATE_OUTCOME";
      evidence.commit_phase = commitPhase;
      evidence.reconciliation = await reconcileAfterIndeterminate(
        clientConfig,
        packed,
        priorManifest,
      );
      return finalizeEvidence(evidence);
    }
    evidence.verdict = "APPLY_ROLLED_BACK";
    evidence.result_code = err.code || "APPLY_FAIL";
    evidence.error = sanitizeError(err);
    evidence.error_code = err.code || "APPLY_FAIL";
    evidence.phase = "apply_rollback";
    return finalizeEvidence(evidence);
  }

  return finalizeEvidence(evidence);
}

async function reconcileAfterIndeterminate(clientConfig, packed, priorManifest) {
  try {
    return await withClient(clientConfig, async (client) => {
      const versions = packed.map((p) => p.migration.version);
      const { rows } = await client.query(
        `SELECT version, statements FROM supabase_migrations.schema_migrations
         WHERE version = ANY($1::text[]) ORDER BY version`,
        [versions],
      );
      const count = (
        await client.query(`SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`)
      ).rows[0].c;
      if (rows.length === packed.length && count === POST_HISTORY_COUNT) {
        const digestsOk = rows.every((row, idx) => {
          const stmts = row.statements || [];
          return (
            stmts.length === 1 &&
            sha256Buffer(Buffer.from(stmts[0], "utf8")) === packed[idx].loaded.sha256
          );
        });
        if (digestsOk) {
          return { outcome: "APPLIED_CONFIRMED_AFTER_RECONCILIATION", history_count: count };
        }
      }
      if (rows.length === 0 && count === PRIOR_HISTORY_COUNT) {
        return { outcome: "NOT_APPLIED_CONFIRMED", history_count: count };
      }
      return {
        outcome: "INDETERMINATE_NEEDS_OPERATOR",
        history_count: count,
        present_versions: rows.map((r) => r.version),
        prior_manifest_length: priorManifest ? priorManifest.length : null,
      };
    });
  } catch (err) {
    return { outcome: "RECONCILIATION_FAILED", error: sanitizeError(err) };
  }
}

async function runApplicator(inputs = {}) {
  const mode = inputs.mode || "dry-run";
  if (mode === "apply") return runApply(inputs);
  return runDryRun(inputs);
}

module.exports = {
  ADVISORY_LOCK,
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
  FEATURE_FLAG_ENV,
  IndeterminateCommitError,
  assertApplyAuthorizationPublished,
  assertAuthorizationPublished,
  assertBundleAuthority,
  assertFeatureFlagUntouched,
  assertMigrationOrder,
  assertNoHarnessEnvOrArgv,
  assertPublishedPrecondition,
  classifyDatabaseUrl,
  classificationParity,
  buildPgClientConfig,
  inspectNormalizedClient,
  scopedClientOptions,
  loadSealedMigrations,
  resolveBundleSeals,
  resolveDatabaseUrlFromEnv,
  runApplicator,
  runApply,
  runDryRun,
  sanitizeError,
  sanitizeUriDiagnostics,
  sanitizeValue,
};
