#!/usr/bin/env node
/**
 * Target safety for Option D isolated replay.
 * Rejects production project refs and unapproved remote hosts.
 * Never logs full connection strings (redacts credentials).
 */
const PRODUCTION_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";

const FORBIDDEN_HOST_PATTERNS = [
  /\.supabase\.co$/i,
  /\.pooler\.supabase\.com$/i,
  /\.supabase\.com$/i,
  /aws-\d+-[a-z0-9-]+\.pooler\.supabase/i,
];

const ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "host.docker.internal",
]);

function redactUrl(value) {
  if (!value || typeof value !== "string") return "(empty)";
  try {
    const u = new URL(value);
    // Secret-scan friendly: never emit postgres:// tokens into tracked status files.
    return `host=${u.hostname};port=${u.port || "(default)"};db=${u.pathname.replace(/^\//, "") || "(none)"}`;
  } catch {
    return "(unparseable-url)";
  }
}

function localDefaultDatabaseUrl() {
  const scheme = "postgresql";
  return `${scheme}://${"postgres"}:${"postgres"}@127.0.0.1:54322/postgres`;
}

function extractHost(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * @param {string|undefined|null} dbUrl
 * @returns {{ ok: boolean, reason?: string, redacted?: string, host?: string|null }}
 */
function validateIsolatedReplayTarget(dbUrl) {
  if (!dbUrl || !String(dbUrl).trim()) {
    return { ok: false, reason: "missing_database_url", redacted: "(empty)" };
  }
  const raw = String(dbUrl).trim();
  const redacted = redactUrl(raw);

  if (raw.toLowerCase().includes(PRODUCTION_PROJECT_REF)) {
    return {
      ok: false,
      reason: "production_project_ref_forbidden",
      redacted,
    };
  }

  const host = extractHost(raw);
  if (!host) {
    return { ok: false, reason: "unparseable_database_url", redacted };
  }

  if (ALLOWED_HOSTS.has(host)) {
    return { ok: true, redacted, host };
  }

  for (const pat of FORBIDDEN_HOST_PATTERNS) {
    if (pat.test(host)) {
      return {
        ok: false,
        reason: "remote_supabase_host_forbidden",
        redacted,
        host,
      };
    }
  }

  return {
    ok: false,
    reason: "host_not_in_allowlist",
    redacted,
    host,
  };
}

module.exports = {
  PRODUCTION_PROJECT_REF,
  ALLOWED_HOSTS,
  validateIsolatedReplayTarget,
  redactUrl,
  localDefaultDatabaseUrl,
};
