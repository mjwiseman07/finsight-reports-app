/**
 * GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY core for Free Review lead sessions.
 * Default path is dry-run/read-only. Never logs credentials or token values.
 * Database URL: FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL env only (never argv).
 */
"use strict";

const crypto = require("crypto");
const { Client } = require("pg");
const {
  ADVISORY_LOCK,
  EXPECTED_PROJECT_REF,
  PRIOR_HISTORY_COUNT,
  MIGRATION_VERSION,
  MIGRATION_NAME,
  MIGRATION_PATH,
  MIGRATION_BLOB_OID,
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  ARTIFACT_COMMIT,
  DATABASE_URL_ENV,
  FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV,
  APPLY_AUTHORIZATION_TOKEN,
  ATTESTED_FREEZE_ENV,
  GIT_CWD_ENV,
  EXPECTED_AUTH_SEALS_DIGEST,
  EXPECTED_STANDALONE_BUNDLE_SHA256,
  AUTHORIZED_TOOLING_FREEZE,
} = require("./free-review-lead-session-apply-constants");
const {
  loadAndVerifyGitBlob,
  stripOuterBeginCommit,
  assertNoDropCascade,
  sha256Buffer,
} = require("./git-blob-authority");
const {
  classifyDatabaseUrl,
  normalizeApplicatorEvidence,
} = require("./free-review-lead-session-evidence");
const {
  buildPgClientOptions,
  classifyTlsError,
} = require("./free-review-lead-session-tls-ca");

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
  s = s.replace(/(?:mongodb|mysql|redis):\/\/[^\s)'"`]+/gi, "[redacted-url]");
  s = s.replace(/([?&](?:password|pass|pwd|token|secret|api[_-]?key)=)[^&\s)'"`]+/gi, "$1***");
  s = s.replace(/(password|passwd|pwd)\s*[:=]\s*[^\s)'"`]+/gi, "$1=***");
  s = s.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer ***");
  s = s.replace(
    /FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL\s*[:=]\s*[^\s)'"`]+/gi,
    `${DATABASE_URL_ENV}=***`,
  );
  s = s.replace(
    /CONTAINMENT_APPLY_DATABASE_URL\s*[:=]\s*[^\s)'"`]+/gi,
    "CONTAINMENT_APPLY_DATABASE_URL=***",
  );
  s = s.replace(/\/\/([^:@\s/'"]+):([^@\s/'"]+)@/g, "//***:***@");
  s = s.replace(/%3A[A-Za-z0-9._~\-%]+/gi, "%3A***");
  s = s.replace(/lead_id=[0-9a-f-]{36}/gi, "lead_id=[redacted]");
  s = s.replace(/token_hash=[0-9a-f]{64}/gi, "token_hash=[redacted]");
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
    if (Array.isArray(value)) {
      return value.map((v) => sanitizeValue(v, depth + 1, seen));
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const key = String(k).toLowerCase();
      if (
        key.includes("password") ||
        key.includes("connectionstring") ||
        key.includes("database_url") ||
        key.includes("databaseurl") ||
        key.includes("sslrootcert") ||
        key.includes("token_hash") ||
        key === "lead_id" ||
        key.includes("lead_id") ||
        key === "ca" ||
        key === "argv" ||
        key === "config" ||
        key === "connectionparameters" ||
        key === "access_token" ||
        key === "refresh_token"
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
  if (sanitized && typeof sanitized === "object" && sanitized.message) {
    return sanitized.message;
  }
  return redactString(err && err.message ? err.message : err);
}

function redactedUrlEvidence() {
  return `${DATABASE_URL_ENV}=***redacted***`;
}

function resolveDatabaseUrlFromEnv(env = process.env, expectedProjectRef = EXPECTED_PROJECT_REF) {
  if (Object.prototype.hasOwnProperty.call(env, "DATABASE_URL") && env.DATABASE_URL) {
    const e = new Error("PROHIBITED_CREDENTIAL_CHANNEL: generic DATABASE_URL is forbidden");
    e.code = "PROHIBITED_CREDENTIAL_CHANNEL";
    e.uri_diagnostics = classifyDatabaseUrl(env.DATABASE_URL, expectedProjectRef);
    e.phase = "uri_validate";
    throw e;
  }
  if (
    Object.prototype.hasOwnProperty.call(env, FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV) &&
    env[FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV]
  ) {
    const e = new Error(
      `PROHIBITED_CREDENTIAL_CHANNEL: ${FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV} is forbidden for FRLS applicator`,
    );
    e.code = "PROHIBITED_CREDENTIAL_CHANNEL";
    e.uri_diagnostics = classifyDatabaseUrl(
      env[FORBIDDEN_CONTAINMENT_DATABASE_URL_ENV],
      expectedProjectRef,
    );
    e.phase = "uri_validate";
    throw e;
  }
  const raw = env[DATABASE_URL_ENV];
  if (raw == null || String(raw).trim() === "") {
    const e = new Error(`MISSING_INPUT: ${DATABASE_URL_ENV}`);
    e.code = "MISSING_INPUT";
    e.uri_diagnostics = classifyDatabaseUrl("", expectedProjectRef);
    e.phase = "uri_validate";
    throw e;
  }
  const url = String(raw);
  const uri_diagnostics = classifyDatabaseUrl(url, expectedProjectRef);
  if (!uri_diagnostics.structurally_valid_postgres_uri) {
    const e = new Error(`MALFORMED_DATABASE_URL: ${DATABASE_URL_ENV} must be a postgres URL`);
    e.code = "MALFORMED_DATABASE_URL";
    e.uri_diagnostics = uri_diagnostics;
    e.phase = "uri_validate";
    throw e;
  }
  return { url, uri_diagnostics };
}

function buildEvidenceBase(inputs) {
  return {
    mechanism: "GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY",
    evidence_source: "sealed_applicator",
    protocol_version: 1,
    schema_version: 1,
    mode: inputs.mode,
    read_only: inputs.mode !== "apply",
    phase: "applicator_init",
    result_code: "BLOCKED",
    reason_code: "INIT",
    project_ref_expected: EXPECTED_PROJECT_REF,
    project_ref_provided: inputs.projectRef,
    pr_head: inputs.prHead,
    authorized_tooling_freeze: inputs.authorizedPrHead,
    evidence_tip: inputs.evidenceTip || null,
    artifact_commit: inputs.artifactCommit,
    migration_path: inputs.migrationPath,
    migration_version: inputs.version,
    migration_name: inputs.name,
    advisory_lock: {
      name: ADVISORY_LOCK.name,
      key1: ADVISORY_LOCK.key1,
      key2: ADVISORY_LOCK.key2,
    },
    source_authority: null,
    sqlApplicationAttempts: 0,
    databaseConnectionAttempts: 0,
    advisory_lock_acquired: false,
    database_url_channel: redactedUrlEvidence(),
    cleanup: { completed: false },
    credential_redaction_confirmation: {
      url_in_evidence: false,
      url_in_argv: false,
      values_undisclosed: true,
    },
  };
}

function finalizeEvidence(evidence) {
  const verdict = evidence.verdict || evidence.result_code || "BLOCKED";
  evidence.verdict = verdict;
  evidence.result_code = evidence.result_code || verdict;
  evidence.reason_code =
    evidence.reason_code ||
    evidence.error_code ||
    (typeof evidence.error === "string" ? evidence.error.split(":")[0].trim() : verdict);
  evidence.phase = evidence.phase || "applicator";
  evidence.evidence_source = evidence.evidence_source || "sealed_applicator";
  evidence.read_only =
    typeof evidence.read_only === "boolean" ? evidence.read_only : evidence.mode !== "apply";
  if (!evidence.cleanup || typeof evidence.cleanup !== "object") {
    evidence.cleanup = { completed: true };
  } else {
    evidence.cleanup.completed = true;
  }
  if (!evidence.credential_redaction_confirmation) {
    evidence.credential_redaction_confirmation = {
      url_in_evidence: false,
      url_in_argv: false,
      values_undisclosed: true,
    };
  }
  return normalizeApplicatorEvidence(evidence);
}

function resolveGitCwd(inputs) {
  const env = inputs.env || process.env;
  const fromInput = inputs.cwd || env[GIT_CWD_ENV];
  if (fromInput && typeof fromInput === "string" && fromInput.trim()) {
    return fromInput.trim();
  }
  return process.cwd();
}

function assertFreezeDefenseInDepth(inputs) {
  const env = inputs.env || process.env;
  if (inputs.prHead !== inputs.authorizedPrHead) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: prHead ${inputs.prHead} != authorizedPrHead ${inputs.authorizedPrHead}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (!/^[0-9a-f]{40}$/i.test(inputs.authorizedPrHead)) {
    const e = new Error("BLOCKED_PIN_MISMATCH: authorizedPrHead must be full 40-char SHA");
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (inputs.evidenceTip) {
    if (!/^[0-9a-f]{40}$/i.test(inputs.evidenceTip)) {
      const e = new Error("BLOCKED_PIN_MISMATCH: evidenceTip must be full 40-char SHA when provided");
      e.code = "BLOCKED_PIN_MISMATCH";
      throw e;
    }
    if (inputs.authorizedPrHead.toLowerCase() === inputs.evidenceTip.toLowerCase()) {
      const e = new Error("BLOCKED_PIN_MISMATCH: evidence tip cannot be used as tooling freeze");
      e.code = "BLOCKED_PIN_MISMATCH";
      throw e;
    }
  }

  const attested = env[ATTESTED_FREEZE_ENV];
  if (!attested || attested !== inputs.authorizedPrHead) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: ${ATTESTED_FREEZE_ENV} attestation missing or != authorized freeze`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }

  if (
    AUTHORIZED_TOOLING_FREEZE &&
    AUTHORIZED_TOOLING_FREEZE !== "PENDING_AFTER_COMMIT" &&
    inputs.authorizedPrHead !== AUTHORIZED_TOOLING_FREEZE
  ) {
    const e = new Error("BLOCKED_PIN_MISMATCH: authorizedPrHead != sealed AUTHORIZED_TOOLING_FREEZE");
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }

  if (
    EXPECTED_AUTH_SEALS_DIGEST &&
    !EXPECTED_AUTH_SEALS_DIGEST.startsWith("PENDING_") &&
    inputs.authSealsDigest !== EXPECTED_AUTH_SEALS_DIGEST
  ) {
    const e = new Error("BLOCKED_PIN_MISMATCH: authorization seals digest mismatch");
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }

  if (inputs.requireStandaloneBundleSelfHash) {
    if (
      !EXPECTED_STANDALONE_BUNDLE_SHA256 ||
      EXPECTED_STANDALONE_BUNDLE_SHA256.startsWith("PENDING_")
    ) {
      const e = new Error("BLOCKED_PIN_MISMATCH: standalone bundle sha pin not published");
      e.code = "BLOCKED_PIN_MISMATCH";
      throw e;
    }
  }
}

function assertModeContract(inputs) {
  const mode = inputs.mode;
  const token = inputs.applyAuthorizationToken;
  if (mode !== "dry-run" && mode !== "apply") {
    const e = new Error(`BLOCKED_MODE: unknown mode ${mode}`);
    e.code = "BLOCKED_MODE";
    throw e;
  }
  if (mode === "dry-run") {
    if (token != null && token !== "") {
      const e = new Error("BLOCKED_MODE: dry-run must not carry apply authorization token");
      e.code = "BLOCKED_MODE";
      throw e;
    }
    if (inputs.applyAuthorized === true) {
      const e = new Error("BLOCKED_MODE: dry-run cannot carry applyAuthorized");
      e.code = "BLOCKED_MODE";
      throw e;
    }
  }
  if (mode === "apply") {
    if (token !== APPLY_AUTHORIZATION_TOKEN) {
      const e = new Error(
        "APPLY_NOT_AUTHORIZED: exact --i-authorize-production-apply token required",
      );
      e.code = "APPLY_NOT_AUTHORIZED";
      throw e;
    }
  }
}

function assertInputPins(inputs) {
  assertModeContract(inputs);

  const required = [
    "mode",
    "projectRef",
    "prHead",
    "artifactCommit",
    "migrationPath",
    "migrationBlobOid",
    "migrationSha256",
    "migrationBytes",
    "version",
    "name",
    "authorizedPrHead",
  ];
  for (const k of required) {
    if (inputs[k] === undefined || inputs[k] === null || inputs[k] === "") {
      const e = new Error(`MISSING_INPUT: ${k}`);
      e.code = "MISSING_INPUT";
      throw e;
    }
  }

  if (inputs.projectRef !== EXPECTED_PROJECT_REF) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: project ref got ${inputs.projectRef}, expected ${EXPECTED_PROJECT_REF}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  assertFreezeDefenseInDepth(inputs);
  if (inputs.artifactCommit !== ARTIFACT_COMMIT) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: artifactCommit got ${inputs.artifactCommit}, expected ${ARTIFACT_COMMIT}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (inputs.migrationPath !== MIGRATION_PATH) {
    const e = new Error("BLOCKED_PIN_MISMATCH: migrationPath mismatch");
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (inputs.migrationBlobOid !== MIGRATION_BLOB_OID) {
    const e = new Error("BLOCKED_PIN_MISMATCH: migration blob OID mismatch");
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (inputs.migrationSha256 !== MIGRATION_SHA256) {
    const e = new Error("BLOCKED_PIN_MISMATCH: migration SHA-256 mismatch");
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (Number(inputs.migrationBytes) !== MIGRATION_BYTES) {
    const e = new Error("BLOCKED_PIN_MISMATCH: migration bytes mismatch");
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (inputs.version !== MIGRATION_VERSION) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: version got ${inputs.version}, expected ${MIGRATION_VERSION}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (inputs.name !== MIGRATION_NAME) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: name got ${inputs.name}, expected ${MIGRATION_NAME}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
}

async function withClient(databaseUrl, fn, env = process.env, onReadyToConnect = null) {
  const opts = buildPgClientOptions(databaseUrl, env);
  if (typeof onReadyToConnect === "function") {
    onReadyToConnect(opts.tls_evidence);
  }
  const client = new Client({
    connectionString: opts.connectionString,
    ssl: opts.ssl,
  });
  await client.connect();
  try {
    return await fn(client, opts.tls_evidence);
  } finally {
    await client.end().catch(() => {});
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
    const joined = statements.join("\n");
    return {
      version: r.version,
      name: r.name,
      statement_count: statements.length,
      statements_digest: sha256Buffer(Buffer.from(joined, "utf8")),
    };
  });
}

async function assertVersionAbsent(client, version) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations WHERE version = $1`,
    [version],
  );
  if (rows[0].c !== 0) {
    throw new Error(`VERSION_ALREADY_PRESENT: ${version}`);
  }
}

async function assertHistoryCount(client, expected) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
  );
  if (rows[0].c !== expected) {
    throw new Error(`HISTORY_COUNT_MISMATCH: got ${rows[0].c}, expected ${expected}`);
  }
}

async function probePreChangeContract(client) {
  const { rows } = await client.query(`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'free_review_leads'
      ) AS parent_table_exists,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'free_review_leads'
          AND column_name = 'status' AND udt_name = 'text'
      ) AS parent_status_column,
      (
        SELECT column_default FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'free_review_leads'
          AND column_name = 'status'
      ) AS status_default,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'free_review_lead_sessions'
      ) AS sessions_table_exists,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rotate_free_review_lead_session'
      ) AS rotate_fn_exists,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'cleanup_free_review_lead_sessions'
      ) AS cleanup_fn_exists,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'prevent_active_free_review_lead_session_delete'
      ) AS delete_guard_fn_exists,
      EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'free_review_lead_sessions'
          AND indexname = 'free_review_lead_sessions_token_hash_uidx'
      ) AS token_hash_index_exists,
      EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'free_review_lead_sessions'
          AND indexname = 'free_review_lead_sessions_one_unrevoked_per_lead_uidx'
      ) AS one_unrevoked_index_exists,
      EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'free_review_lead_sessions'
          AND t.tgname = 'trg_prevent_active_free_review_lead_session_delete'
          AND NOT t.tgisinternal
      ) AS delete_guard_trigger_exists
  `);
  return rows[0];
}

function assertPreChangeMatch(probe) {
  if (
    !probe.parent_table_exists ||
    !probe.parent_status_column ||
    probe.sessions_table_exists ||
    probe.rotate_fn_exists ||
    probe.cleanup_fn_exists ||
    probe.delete_guard_fn_exists ||
    probe.token_hash_index_exists ||
    probe.one_unrevoked_index_exists ||
    probe.delete_guard_trigger_exists
  ) {
    throw new Error(
      `PRE_CHANGE_CONTRACT_MISMATCH: ${JSON.stringify({
        parent_table_exists: probe.parent_table_exists,
        parent_status_column: probe.parent_status_column,
        sessions_table_exists: probe.sessions_table_exists,
        rotate_fn_exists: probe.rotate_fn_exists,
      })}`,
    );
  }
  const def = String(probe.status_default || "");
  if (!def.includes("lead_captured")) {
    throw new Error("PRE_CHANGE_CONTRACT_MISMATCH: free_review_leads.status default != lead_captured");
  }
}

function classifyDryRunFailure(err, evidence) {
  const msg = String((err && err.message) || "");
  const explicit = err && err.code ? String(err.code) : "";
  const tlsCompleted = Boolean(evidence && evidence.tls && evidence.tls.mode);
  const phaseHint = (err && err.phase) || null;

  if (
    explicit === "PRE_CHANGE_CONTRACT_MISMATCH" ||
    /PRE_CHANGE_CONTRACT_MISMATCH/.test(msg)
  ) {
    return { code: "PRE_CHANGE_CONTRACT_MISMATCH", phase: phaseHint || "pre_change_contract" };
  }

  const lead = msg.match(/^([A-Z][A-Z0-9_]{2,}):/);
  const leadCode = lead ? lead[1] : "";
  const looksTlsCode = (c) =>
    /^(TLS_FAIL|BLOCKED_TLS_|SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF|CERT_HAS_EXPIRED|HOSTNAME_MISMATCH)/i.test(
      String(c || ""),
    );

  if (leadCode && !looksTlsCode(leadCode)) {
    return { code: leadCode, phase: phaseHint || "dry_run_queries" };
  }
  if (explicit && !looksTlsCode(explicit)) {
    return { code: explicit, phase: phaseHint || "dry_run_queries" };
  }

  if (!tlsCompleted) {
    const tlsCode = classifyTlsError(err);
    return { code: tlsCode, phase: phaseHint || "tls_policy" };
  }

  if (explicit && !looksTlsCode(explicit)) {
    return { code: explicit, phase: phaseHint || "dry_run_queries" };
  }
  if (leadCode && !looksTlsCode(leadCode)) {
    return { code: leadCode, phase: phaseHint || "dry_run_queries" };
  }
  return { code: "DRY_RUN_FAIL", phase: phaseHint || "dry_run_queries" };
}

async function assertPostApplyPrivileges(client) {
  const { rows } = await client.query(`
    SELECT
      EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'free_review_lead_sessions'
      ) AS table_exists,
      (
        SELECT c.relrowsecurity FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'free_review_lead_sessions'
      ) AS rls_enabled,
      has_table_privilege('service_role','public.free_review_lead_sessions','SELECT') AS svc_sel,
      has_table_privilege('service_role','public.free_review_lead_sessions','INSERT') AS svc_ins,
      has_table_privilege('service_role','public.free_review_lead_sessions','UPDATE') AS svc_upd,
      has_table_privilege('service_role','public.free_review_lead_sessions','DELETE') AS svc_del,
      has_table_privilege('anon','public.free_review_lead_sessions','SELECT') AS anon_sel,
      has_table_privilege('authenticated','public.free_review_lead_sessions','SELECT') AS auth_sel,
      has_table_privilege('anon','public.free_review_lead_sessions','INSERT') AS anon_ins,
      has_table_privilege('authenticated','public.free_review_lead_sessions','INSERT') AS auth_ins,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'rotate_free_review_lead_session'
      ) AS rotate_fn_exists,
      EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'cleanup_free_review_lead_sessions'
      ) AS cleanup_fn_exists,
      has_function_privilege('service_role', 'public.rotate_free_review_lead_session(uuid, text, timestamptz)', 'EXECUTE') AS svc_rotate_exec,
      has_function_privilege('anon', 'public.rotate_free_review_lead_session(uuid, text, timestamptz)', 'EXECUTE') AS anon_rotate_exec,
      has_function_privilege('authenticated', 'public.rotate_free_review_lead_session(uuid, text, timestamptz)', 'EXECUTE') AS auth_rotate_exec,
      has_function_privilege('service_role', 'public.cleanup_free_review_lead_sessions(integer)', 'EXECUTE') AS svc_cleanup_exec,
      has_function_privilege('anon', 'public.cleanup_free_review_lead_sessions(integer)', 'EXECUTE') AS anon_cleanup_exec,
      EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'free_review_lead_sessions'
          AND indexname = 'free_review_lead_sessions_one_unrevoked_per_lead_uidx'
      ) AS one_unrevoked_index_exists,
      EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'free_review_lead_sessions'
          AND t.tgname = 'trg_prevent_active_free_review_lead_session_delete'
          AND NOT t.tgisinternal
      ) AS delete_guard_trigger_exists
  `);
  const r = rows[0];
  if (
    !r.table_exists ||
    !r.rls_enabled ||
    !r.svc_sel ||
    !r.svc_ins ||
    !r.svc_upd ||
    !r.svc_del ||
    r.anon_sel ||
    r.auth_sel ||
    r.anon_ins ||
    r.auth_ins ||
    !r.rotate_fn_exists ||
    !r.cleanup_fn_exists ||
    !r.svc_rotate_exec ||
    !r.svc_cleanup_exec ||
    r.anon_rotate_exec ||
    r.auth_rotate_exec ||
    r.anon_cleanup_exec ||
    !r.one_unrevoked_index_exists ||
    !r.delete_guard_trigger_exists
  ) {
    throw new Error(`POST_APPLY_ASSERT_FAIL: ${JSON.stringify(r)}`);
  }
}

async function runSyntheticFunctionalProbes(client) {
  const synthLeadId = crypto.randomUUID();
  const tokenHash = "a".repeat(64);
  const expiresAt = new Date(Date.now() + 3600000).toISOString();
  const probes = {
    rotate_ok: false,
    delete_guard_active: false,
    cleanup_status_ok: false,
  };

  await client.query(
    `
    INSERT INTO public.free_review_leads (
      id, first_name, last_name, business_name, email, status
    ) VALUES ($1, 'Synth', 'Probe', 'Probe Co', 'synth-probe@example.invalid', 'lead_captured')
    `,
    [synthLeadId],
  );

  const { rows: rotateRows } = await client.query(
    `SELECT public.rotate_free_review_lead_session($1::uuid, $2, $3::timestamptz) AS session_id`,
    [synthLeadId, tokenHash, expiresAt],
  );
  probes.rotate_ok = rotateRows.length === 1 && rotateRows[0].session_id != null;

  await client.query("SAVEPOINT frls_synth_delete_guard");
  try {
    await client.query(`DELETE FROM public.free_review_lead_sessions WHERE lead_id = $1`, [
      synthLeadId,
    ]);
    probes.delete_guard_active = false;
    await client.query("RELEASE SAVEPOINT frls_synth_delete_guard");
  } catch (err) {
    await client.query("ROLLBACK TO SAVEPOINT frls_synth_delete_guard");
    probes.delete_guard_active = /cannot_delete_active_lead_session/.test(
      String(err && err.message ? err.message : err),
    );
  }

  await client.query(
    `
    UPDATE public.free_review_lead_sessions
    SET
      created_at = clock_timestamp() - interval '32 days',
      revoked_at = clock_timestamp() - interval '31 days',
      expires_at = clock_timestamp() - interval '31 days'
    WHERE lead_id = $1
    `,
    [synthLeadId],
  );
  const { rows: cleanupRows } = await client.query(
    `SELECT public.cleanup_free_review_lead_sessions(30) AS deleted`,
  );
  probes.cleanup_status_ok = typeof cleanupRows[0]?.deleted === "number";

  await client.query(`DELETE FROM public.free_review_leads WHERE id = $1`, [synthLeadId]);
  return probes;
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

function isConnectionUncertaintyError(err) {
  const msg = String(err && err.message ? err.message : err);
  const code = err && err.code;
  return (
    err instanceof IndeterminateCommitError ||
    code === "INDETERMINATE_OUTCOME" ||
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "ETIMEDOUT" ||
    code === "57P01" ||
    code === "57P02" ||
    code === "57P03" ||
    /connection (terminated|closed|ended|refused|reset)|timeout|sock|not queryable|server closed/i.test(
      msg,
    )
  );
}

function loadSealedMigration(inputs) {
  assertInputPins(inputs);
  const loaded = loadAndVerifyGitBlob({
    commit: inputs.artifactCommit,
    path: inputs.migrationPath,
    expectedOid: inputs.migrationBlobOid,
    expectedSha256: inputs.migrationSha256,
    expectedBytes: inputs.migrationBytes,
    cwd: resolveGitCwd(inputs),
  });
  const fullSql = loaded.buffer.toString("utf8");
  assertNoDropCascade(fullSql);
  const innerSql = stripOuterBeginCommit(fullSql);
  return { loaded, fullSql, innerSql };
}

async function reconcileAfterIndeterminate(databaseUrl, inputs, packed, priorManifest, env = process.env) {
  const result = {
    classification: "INDETERMINATE_REQUIRES_OPERATOR",
    version_present: null,
    statement_match: null,
    post_apply_ok: null,
  };
  try {
    await withClient(databaseUrl, async (client) => {
      await client.query("SET default_transaction_read_only = on");
      const { rows } = await client.query(
        `SELECT version, name, statements FROM supabase_migrations.schema_migrations WHERE version = $1`,
        [inputs.version],
      );
      if (rows.length === 0) {
        result.version_present = false;
        try {
          const probe = await probePreChangeContract(client);
          assertPreChangeMatch(probe);
          result.pre_change_restored = true;
        } catch {
          result.pre_change_restored = false;
        }
        if (priorManifest) {
          const now = await captureHistoryManifest(client);
          result.prior_manifest_unchanged = manifestsEqual(now, priorManifest);
        }
        result.classification =
          result.pre_change_restored && result.prior_manifest_unchanged !== false
            ? "NOT_APPLIED_CONFIRMED"
            : "INDETERMINATE_REQUIRES_OPERATOR";
        return;
      }
      result.version_present = true;
      const stmts = rows[0].statements || [];
      result.statement_count = stmts.length;
      result.statement_match =
        stmts.length === 1 &&
        stmts[0] === packed.fullSql &&
        sha256Buffer(Buffer.from(stmts[0], "utf8")) === packed.loaded.sha256;
      try {
        await assertPostApplyPrivileges(client);
        result.post_apply_ok = true;
      } catch {
        result.post_apply_ok = false;
      }
      if (priorManifest) {
        const now = await captureHistoryManifest(client);
        const priorOnly = now.filter((r) => r.version !== inputs.version);
        result.prior_manifest_unchanged = manifestsEqual(priorOnly, priorManifest);
      }
      if (
        result.statement_match &&
        result.post_apply_ok &&
        result.prior_manifest_unchanged !== false
      ) {
        result.classification = "APPLIED_CONFIRMED_AFTER_RECONCILIATION";
      } else {
        result.classification = "INDETERMINATE_REQUIRES_OPERATOR";
      }
    }, env);
  } catch (err) {
    result.reconcile_error = sanitizeError(err);
    result.classification = "INDETERMINATE_REQUIRES_OPERATOR";
  }
  result.operator_note =
    "No automatic retry or rollback. New authorization required before any further mutation.";
  return result;
}

async function runDryRun(inputs) {
  const evidence = buildEvidenceBase(inputs);
  evidence.mode = "dry-run";

  let databaseUrl;
  let packed;
  try {
    assertInputPins(inputs);
    const resolvedDry = resolveDatabaseUrlFromEnv(inputs.env || process.env);
    databaseUrl = resolvedDry.url;
    evidence.uri_diagnostics = resolvedDry.uri_diagnostics;
    packed = loadSealedMigration(inputs);
  } catch (err) {
    evidence.verdict = "DRY_RUN_BLOCKED";
    evidence.result_code = "DRY_RUN_BLOCKED";
    evidence.error = sanitizeError(err);
    evidence.error_sanitized = sanitizeValue(err);
    evidence.error_code = err.code || "PIN_OR_LOAD_FAIL";
    evidence.reason_code = err.code || "PIN_OR_LOAD_FAIL";
    evidence.phase = err.phase || "pre_connect";
    if (err.uri_diagnostics) evidence.uri_diagnostics = err.uri_diagnostics;
    evidence.sqlApplicationAttempts = 0;
    evidence.databaseConnectionAttempts = 0;
    return finalizeEvidence(evidence);
  }

  evidence.source_authority = {
    kind: "git_blob",
    commit: packed.loaded.commit,
    path: packed.loaded.path,
    oid: packed.loaded.oid,
    sha256: packed.loaded.sha256,
    bytes: packed.loaded.bytes,
    single_sealed_version_only: true,
    unrelated_tip_migrations: false,
  };

  try {
    evidence.databaseConnectionAttempts = 0;
    const env = inputs.env || process.env;
    await withClient(
      databaseUrl,
      async (client) => {
        await client.query("SET default_transaction_read_only = on");
        await assertVersionAbsent(client, inputs.version);
        await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
        const manifest = await captureHistoryManifest(client);
        evidence.prior_history_manifest = manifest;
        evidence.prior_history_count = manifest.length;

        const probe = await probePreChangeContract(client);
        assertPreChangeMatch(probe);
        evidence.pre_change_probe = {
          parent_table_exists: probe.parent_table_exists,
          parent_status_column: probe.parent_status_column,
          status_default_has_lead_captured: String(probe.status_default || "").includes(
            "lead_captured",
          ),
          sessions_table_absent: !probe.sessions_table_exists,
          rotate_fn_absent: !probe.rotate_fn_exists,
          cleanup_fn_absent: !probe.cleanup_fn_exists,
          delete_guard_fn_absent: !probe.delete_guard_fn_exists,
          session_indexes_absent:
            !probe.token_hash_index_exists && !probe.one_unrevoked_index_exists,
          delete_guard_trigger_absent: !probe.delete_guard_trigger_exists,
        };

        await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
        await assertVersionAbsent(client, inputs.version);
      },
      env,
      (tlsEv) => {
        evidence.tls = tlsEv;
        evidence.databaseConnectionAttempts = 1;
      },
    );

    evidence.sqlApplicationAttempts = 0;
    evidence.advisory_lock_acquired = false;
    evidence.verdict = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
    evidence.result_code = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
    evidence.reason_code = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
    evidence.phase = "dry_run_complete";
  } catch (err) {
    evidence.verdict = "DRY_RUN_BLOCKED";
    evidence.result_code = "DRY_RUN_BLOCKED";
    evidence.error = sanitizeError(err);
    evidence.error_sanitized = sanitizeValue(err);
    const classified = classifyDryRunFailure(err, evidence);
    evidence.error_code = classified.code;
    evidence.reason_code = classified.code;
    evidence.phase = classified.phase;
    if (classified.phase === "tls_policy" || err.phase === "tls_policy") {
      evidence.databaseConnectionAttempts = 0;
    }
    evidence.sqlApplicationAttempts = 0;
    evidence.advisory_lock_acquired = false;
  }
  return finalizeEvidence(evidence);
}

async function runApply(inputs) {
  const evidence = buildEvidenceBase(inputs);
  evidence.mode = "apply";

  let databaseUrl;
  let packed;
  try {
    assertInputPins(inputs);
    const resolvedApply = resolveDatabaseUrlFromEnv(inputs.env || process.env);
    databaseUrl = resolvedApply.url;
    evidence.uri_diagnostics = resolvedApply.uri_diagnostics;
    packed = loadSealedMigration(inputs);
  } catch (err) {
    evidence.verdict = "APPLY_BLOCKED";
    evidence.result_code = "APPLY_BLOCKED";
    evidence.error = sanitizeError(err);
    evidence.error_sanitized = sanitizeValue(err);
    evidence.error_code = err.code || "PIN_OR_LOAD_FAIL";
    evidence.reason_code = err.code || "PIN_OR_LOAD_FAIL";
    evidence.phase = err.phase || "pre_connect";
    if (err.uri_diagnostics) evidence.uri_diagnostics = err.uri_diagnostics;
    evidence.sqlApplicationAttempts = 0;
    evidence.databaseConnectionAttempts = 0;
    return finalizeEvidence(evidence);
  }

  evidence.source_authority = {
    kind: "git_blob",
    commit: packed.loaded.commit,
    path: packed.loaded.path,
    oid: packed.loaded.oid,
    sha256: packed.loaded.sha256,
    bytes: packed.loaded.bytes,
    single_sealed_version_only: true,
    unrelated_tip_migrations: false,
  };

  let priorManifest = null;
  let commitPhase = "pre_commit";
  const env = inputs.env || process.env;

  try {
    evidence.databaseConnectionAttempts = 0;
    await withClient(
      databaseUrl,
      async (client) => {
        await client.query("BEGIN");
        await client.query("SET LOCAL statement_timeout = '15s'");
        await client.query("SET LOCAL lock_timeout = '5s'");
        await client.query("SELECT pg_advisory_xact_lock($1::int, $2::int)", [
          ADVISORY_LOCK.key1,
          ADVISORY_LOCK.key2,
        ]);
        evidence.advisory_lock_acquired = true;

        await assertVersionAbsent(client, inputs.version);
        await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
        priorManifest = await captureHistoryManifest(client);
        evidence.prior_history_count = priorManifest.length;

        const probe = await probePreChangeContract(client);
        assertPreChangeMatch(probe);

        if (inputs.injectFailure === "before_sql") {
          throw new Error("INJECTED_FAILURE_BEFORE_SQL");
        }

        evidence.sqlApplicationAttempts = 1;
        await client.query(packed.innerSql);

        if (inputs.injectFailure === "before_history") {
          throw new Error("INJECTED_FAILURE_BEFORE_HISTORY");
        }

        await client.query(
          `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
           VALUES ($1, $2, ARRAY[$3]::text[])`,
          [inputs.version, inputs.name, packed.fullSql],
        );

        if (inputs.injectFailure === "after_history") {
          throw new Error("INJECTED_FAILURE_AFTER_HISTORY");
        }

        if (inputs.injectFailure === "mutate_prior") {
          const victim = priorManifest[0];
          if (victim) {
            await client.query(
              `UPDATE supabase_migrations.schema_migrations
               SET name = name || '_MUTATED'
               WHERE version = $1`,
              [victim.version],
            );
          }
        }

        const { rows: stored } = await client.query(
          `SELECT version, name, statements
           FROM supabase_migrations.schema_migrations
           WHERE version = $1`,
          [inputs.version],
        );
        if (stored.length !== 1) {
          throw new Error("HISTORY_INSERT_VERIFY_FAIL: version row count != 1");
        }
        const stmts = stored[0].statements || [];
        if (stmts.length !== 1) {
          throw new Error(`HISTORY_INSERT_VERIFY_FAIL: statement count ${stmts.length} != 1`);
        }
        if (stmts[0] !== packed.fullSql) {
          throw new Error("HISTORY_INSERT_VERIFY_FAIL: statements[1] != sealed full migration file");
        }
        if (sha256Buffer(Buffer.from(stmts[0], "utf8")) !== packed.loaded.sha256) {
          throw new Error("HISTORY_INSERT_VERIFY_FAIL: stored statement digest mismatch");
        }
        if (Buffer.byteLength(stmts[0], "utf8") !== packed.loaded.bytes) {
          throw new Error("HISTORY_INSERT_VERIFY_FAIL: stored statement byte length mismatch");
        }

        const postManifest = await captureHistoryManifest(client);
        const priorOnly = postManifest.filter((r) => r.version !== inputs.version);
        if (!manifestsEqual(priorOnly, priorManifest)) {
          throw new Error("PRIOR_HISTORY_MUTATION_DETECTED");
        }
        if (postManifest.length !== PRIOR_HISTORY_COUNT + 1) {
          throw new Error(
            `HISTORY_COUNT_AFTER_MISMATCH: got ${postManifest.length}, expected ${PRIOR_HISTORY_COUNT + 1}`,
          );
        }

        await assertPostApplyPrivileges(client);
        evidence.synthetic_probes = await runSyntheticFunctionalProbes(client);

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

        evidence.verdict = "APPLY_COMMITTED";
        evidence.result_code = "APPLY_COMMITTED";
        evidence.reason_code = "APPLY_COMMITTED";
        evidence.phase = "apply_committed";
        evidence.stored_statement_digest = packed.loaded.sha256;
        evidence.stored_statement_bytes = packed.loaded.bytes;
      },
      env,
      (tlsEv) => {
        evidence.tls = tlsEv;
        evidence.databaseConnectionAttempts = 1;
      },
    );
  } catch (err) {
    const uncertain =
      commitPhase === "committing" ||
      commitPhase === "committed" ||
      err instanceof IndeterminateCommitError;

    if (uncertain || (commitPhase === "committing" && isConnectionUncertaintyError(err))) {
      evidence.verdict = "INDETERMINATE_OUTCOME";
      evidence.result_code = "INDETERMINATE_OUTCOME";
      evidence.reason_code = "INDETERMINATE_OUTCOME";
      evidence.phase = "apply_indeterminate";
      evidence.error = sanitizeError(err);
      evidence.error_sanitized = sanitizeValue(err);
      evidence.error_code = "INDETERMINATE_OUTCOME";
      evidence.commit_phase = commitPhase;
      evidence.reconciliation = await reconcileAfterIndeterminate(
        databaseUrl,
        inputs,
        packed,
        priorManifest,
        env,
      );
      return finalizeEvidence(evidence);
    }

    evidence.verdict = "APPLY_ROLLED_BACK";
    evidence.result_code = "APPLY_ROLLED_BACK";
    evidence.reason_code = err.code || "APPLY_FAIL";
    evidence.phase = "apply_rolled_back";
    evidence.error = sanitizeError(err);
    evidence.error_sanitized = sanitizeValue(err);
    evidence.error_code = err.code || "APPLY_FAIL";
    evidence.commit_phase = commitPhase;
    try {
      await withClient(databaseUrl, async (client) => {
        await client.query("SET default_transaction_read_only = on");
        const { rows } = await client.query(
          `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations WHERE version = $1`,
          [inputs.version],
        );
        evidence.rollback_verify = {
          version_absent: rows[0].c === 0,
        };
        try {
          const probe = await probePreChangeContract(client);
          assertPreChangeMatch(probe);
          evidence.rollback_verify.pre_change_restored = true;
        } catch (probeErr) {
          evidence.rollback_verify.pre_change_restored = false;
          evidence.rollback_verify.pre_change_error = sanitizeError(probeErr);
        }
        if (priorManifest) {
          const now = await captureHistoryManifest(client);
          evidence.rollback_verify.prior_manifest_unchanged = manifestsEqual(now, priorManifest);
        }
      }, env);
    } catch (verifyErr) {
      evidence.rollback_verify = {
        error: sanitizeError(verifyErr),
      };
    }
  }

  return finalizeEvidence(evidence);
}

async function runApplicator(inputs) {
  const mode = inputs.mode || "dry-run";
  if (mode === "dry-run") {
    return runDryRun({ ...inputs, mode: "dry-run" });
  }
  if (mode === "apply") {
    return runApply({ ...inputs, mode: "apply" });
  }
  const evidence = buildEvidenceBase({ ...inputs, mode });
  evidence.verdict = "BLOCKED";
  evidence.result_code = "BLOCKED";
  evidence.reason_code = "UNKNOWN_MODE";
  evidence.phase = "mode_select";
  evidence.error = `unknown mode: ${mode}`;
  evidence.sqlApplicationAttempts = 0;
  return finalizeEvidence(evidence);
}

module.exports = {
  runApplicator,
  runDryRun,
  runApply,
  loadSealedMigration,
  captureHistoryManifest,
  probePreChangeContract,
  assertPostApplyPrivileges,
  assertPreChangeMatch,
  assertInputPins,
  resolveDatabaseUrlFromEnv,
  classifyDatabaseUrl,
  classifyDryRunFailure,
  finalizeEvidence,
  sanitizeError,
  sanitizeValue,
  runSyntheticFunctionalProbes,
  IndeterminateCommitError,
  ADVISORY_LOCK,
  DATABASE_URL_ENV,
  APPLY_AUTHORIZATION_TOKEN,
};
