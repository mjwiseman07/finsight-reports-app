/** Auto-generated RA Pro accounting-automation applicator standalone bundle. */
"use strict";
const __bundle_fs = require("node:fs");
const __bundle_path = require("node:path");
const __bundle_crypto = require("node:crypto");
const __bundle_child = require("node:child_process");
const { Client } = require("pg");
const module = { exports: {} };
const exports = module.exports;
/* ---- git-blob-authority ---- */


const path = __bundle_path;

const ROOT = path.resolve(__dirname, "../..");

function sha256Buffer(buf) {
  return __bundle_crypto.createHash("sha256").update(buf).digest("hex");
}

function assertBinaryBuffer(buf, label) {
  if (!Buffer.isBuffer(buf)) {
    throw new Error(`${label}: expected Buffer from git cat-file`);
  }
}

/**
 * Load exact blob bytes. Never falls back to filesystem.
 * @param {string} commit full or unambiguous git commit SHA
 * @param {string} pathRel repo-relative path
 * @param {{ cwd?: string }} [opts]
 */
function gitEnvForCwd(cwd) {
  // Trust the repository cwd for blob reads without mutating global git config.
  // Required when the worktree owner differs from the invoking user.
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
  return env;
}

function loadGitBlob(commit, pathRel, opts = {}) {
  if (!commit || !/^[0-9a-f]{7,40}$/i.test(commit)) {
    throw new Error(`invalid commit for git blob load: ${String(commit)}`);
  }
  if (!pathRel || pathRel.includes("\0") || path.isAbsolute(pathRel)) {
    throw new Error(`invalid path for git blob load: ${String(pathRel)}`);
  }
  const cwd = opts.cwd || ROOT;
  const buf = __bundle_child.execFileSync("git", ["cat-file", "blob", `${commit}:${pathRel}`], {
    cwd,
    env: gitEnvForCwd(cwd),
    // binary-safe: no encoding
  });
  assertBinaryBuffer(buf, pathRel);
  return buf;
}

function gitBlobOid(commit, pathRel, opts = {}) {
  const cwd = opts.cwd || ROOT;
  return __bundle_child.execFileSync("git", ["rev-parse", `${commit}:${pathRel}`], {
    cwd,
    env: gitEnvForCwd(cwd),
    encoding: "utf8",
  }).trim();
}

function assertUtf8LfNoBom(buf, label = "blob") {
  assertBinaryBuffer(buf, label);
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    throw new Error(`${label}: UTF-8 BOM forbidden`);
  }
  if (buf.includes(0x0d)) {
    throw new Error(`${label}: CR/CRLF bytes forbidden; require LF-only`);
  }
  // fatal UTF-8 decode
  new TextDecoder("utf-8", { fatal: true }).decode(buf);
}

/**
 * Verify blob OID + SHA-256 + byte length before any SQL use.
 * @returns {{ buffer: Buffer, oid: string, sha256: string, bytes: number, source: 'git_blob', commit: string, path: string }}
 */
function loadAndVerifyGitBlob(spec) {
  const {
    commit,
    path: pathRel,
    expectedOid,
    expectedSha256,
    expectedBytes,
    cwd,
  } = spec;

  let oid;
  let buffer;
  try {
    oid = gitBlobOid(commit, pathRel, { cwd });
    buffer = loadGitBlob(commit, pathRel, { cwd });
  } catch (err) {
    const e = new Error(`GIT_BLOB_LOAD_FAILED: ${err.message}`);
    e.code = "GIT_BLOB_LOAD_FAILED";
    throw e;
  }

  assertUtf8LfNoBom(buffer, pathRel);
  const digest = sha256Buffer(buffer);
  const bytes = buffer.length;

  if (expectedOid && oid !== expectedOid) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: blob OID for ${pathRel} at ${commit}: got ${oid}, expected ${expectedOid}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (expectedSha256 && digest !== expectedSha256) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: SHA-256 for ${pathRel}: got ${digest}, expected ${expectedSha256}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (expectedBytes != null && bytes !== expectedBytes) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: byte length for ${pathRel}: got ${bytes}, expected ${expectedBytes}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }

  return {
    buffer,
    oid,
    sha256: digest,
    bytes,
    source: "git_blob",
    commit,
    path: pathRel,
  };
}

/**
 * Deterministically remove exactly one outer BEGIN;/COMMIT; pair.
 * Full file (including wrapper) remains the history statements[1] payload.
 */
function stripOuterBeginCommit(fullSqlUtf8) {
  if (typeof fullSqlUtf8 !== "string") {
    throw new Error("stripOuterBeginCommit: expected string");
  }
  if (fullSqlUtf8.includes("\r")) {
    throw new Error("stripOuterBeginCommit: CR bytes forbidden");
  }
  const beginMatches = [...fullSqlUtf8.matchAll(/^BEGIN;/gm)];
  const commitMatches = [...fullSqlUtf8.matchAll(/^COMMIT;/gm)];
  if (beginMatches.length !== 1 || commitMatches.length !== 1) {
    throw new Error(
      `stripOuterBeginCommit: expected exactly one outer BEGIN; and one COMMIT; (begin=${beginMatches.length}, commit=${commitMatches.length})`,
    );
  }
  const beginIdx = beginMatches[0].index;
  const commitIdx = commitMatches[0].index;
  if (commitIdx <= beginIdx) {
    throw new Error("stripOuterBeginCommit: COMMIT; before BEGIN;");
  }
  // BEGIN; must be followed by newline; COMMIT; must be last non-empty statement
  if (!fullSqlUtf8.slice(beginIdx).startsWith("BEGIN;\n")) {
    throw new Error("stripOuterBeginCommit: BEGIN; must be followed by LF");
  }
  const afterCommit = fullSqlUtf8.slice(commitIdx);
  if (!/^COMMIT;\n?$/.test(afterCommit)) {
    throw new Error("stripOuterBeginCommit: COMMIT; must terminate the file");
  }
  const inner = fullSqlUtf8.slice(beginIdx + "BEGIN;\n".length, commitIdx);
  if (!inner.trim()) {
    throw new Error("stripOuterBeginCommit: empty inner body");
  }
  return inner;
}

function assertNoDropCascade(sql) {
  if (/\bDROP\s+(VIEW|TABLE|SCHEMA|FUNCTION|MATERIALIZED\s+VIEW)\b[\s\S]{0,200}?\bCASCADE\b/i.test(sql)) {
    throw new Error("DROP ... CASCADE detected in SQL artifact");
  }
}

module.exports = {
  ROOT,
  sha256Buffer,
  loadGitBlob,
  gitBlobOid,
  assertUtf8LfNoBom,
  loadAndVerifyGitBlob,
  stripOuterBeginCommit,
  assertNoDropCascade,
};

const gitBlobAuthority = module.exports;
module.exports = {};
/* ---- constants ---- */
/**
 * Offline authority for the RA Pro accounting-automation migration applicator.
 * Production apply remains unreachable until prior-dry-run and pre-apply pins publish.
 */
const ARTIFACT_COMMIT = "85ae600be8ef8ef3498703bf480f8148d6fe0971";
const EXPECTED_PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
const DATABASE_URL_ENV = "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_DATABASE_URL";
const APPLY_AUTHORIZATION_TOKEN =
  "I_AUTHORIZE_RA_PRO_ACCOUNTING_AUTOMATION_APPLY_20260917";

const FORBIDDEN_DATABASE_URL_ENVS = Object.freeze([
  "DATABASE_URL",
  "RA_PRO_CUTOVER_APPLY_DATABASE_URL",
  "CONTAINMENT_APPLY_DATABASE_URL",
  "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL",
]);

const FEATURE_FLAG_ENV = "ENABLE_RA_PRO_ACCOUNTING_AUTOMATION";

const ADVISORY_LOCK = Object.freeze({
  name: "RA_PRO_ACCOUNTING_AUTOMATION_APPLY",
  key1: 0x52414141, // RAAA
  key2: 0x20260917,
});

const PRIOR_HISTORY_COUNT = 188;
const POST_HISTORY_COUNT = 190;

const MIGRATIONS = Object.freeze([
  Object.freeze({
    version: "20260917044537",
    name: "ra_pro_weekly_completeness_findings",
    path: "supabase/migrations/20260917044537_ra_pro_weekly_completeness_findings.sql",
    oid: "788de3e4b600c0aac57738c9ca3509d1b7e76d49",
    sha256: "7ce512e9e58a589766db12e6179300bf7f8ba8918a50685cfff5820989925430",
    bytes: 6952,
  }),
  Object.freeze({
    version: "20260917180140",
    name: "ra_pro_month_end_review_packages",
    path: "supabase/migrations/20260917180140_ra_pro_month_end_review_packages.sql",
    oid: "929054aec3d08bbf45d13d2a23f187f6200005dd",
    sha256: "ea22749b259a9b14a8cb8c5c575495430262057179d148496d506aaeebbbff10",
    bytes: 3997,
  }),
]);

const TOOLING_AUTHORIZATION_PATH =
  "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";

const STANDALONE_BUNDLE_PATH =
  "scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs";

/** Pending placeholder — whole-file self-hash fixed-point not used (cutover/FRLS contract). */
const EXPECTED_STANDALONE_BUNDLE_SHA256 =
  "PENDING_BUNDLE_BUILD_SHA256_PLACEHOLDER_00000000000000000000000000000000";

const SELF_AUTHORITY_MODULES = Object.freeze([
  "scripts/security/apply-ra-pro-accounting-automation.js",
  "scripts/security/ra-pro-accounting-automation-apply-core.js",
  "scripts/security/ra-pro-accounting-automation-apply-constants.js",
  "scripts/security/git-blob-authority.js",
  "scripts/security/verify-ra-pro-accounting-automation-apply-authority.js",
]);

module.exports = {
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
  SELF_AUTHORITY_MODULES,
  STANDALONE_BUNDLE_PATH,
  TOOLING_AUTHORIZATION_PATH,
};

const applyConstants = module.exports;
module.exports = {};
/* ---- apply-core ---- */
const fs = __bundle_fs;
const path = __bundle_path;

const {
  loadAndVerifyGitBlob,
  stripOuterBeginCommit,
  assertNoDropCascade,
  sha256Buffer,
  ROOT,
} = gitBlobAuthority;

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

function classifyDatabaseUrl(raw, expectedProjectRef = EXPECTED_PROJECT_REF) {
  const url = String(raw || "");
  let host = null;
  try {
    host = new URL(url.replace(/^postgres(ql)?:/i, "http:")).hostname;
  } catch {
    return { ok: false, reason: "MALFORMED_DATABASE_URL", host: null };
  }
  const isLocal = host === "127.0.0.1" || host === "localhost";
  const matchesRef = host && host.includes(expectedProjectRef);
  return {
    ok: true,
    host,
    is_local: isLocal,
    matches_expected_project_ref: Boolean(matchesRef),
    expected_project_ref: expectedProjectRef,
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

function resolveDatabaseUrlFromEnv(env = process.env) {
  assertFeatureFlagUntouched(env);
  for (const forbidden of FORBIDDEN_DATABASE_URL_ENVS) {
    if (Object.prototype.hasOwnProperty.call(env, forbidden) && env[forbidden]) {
      const e = new Error(`PROHIBITED_CREDENTIAL_CHANNEL: ${forbidden} is forbidden`);
      e.code = "PROHIBITED_CREDENTIAL_CHANNEL";
      e.uri_diagnostics = classifyDatabaseUrl(env[forbidden]);
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
  const diagnostics = classifyDatabaseUrl(raw);
  if (!diagnostics.ok) {
    const e = new Error("MALFORMED_DATABASE_URL");
    e.code = "MALFORMED_DATABASE_URL";
    e.uri_diagnostics = diagnostics;
    e.phase = "uri_validate";
    throw e;
  }
  return { url: raw, uri_diagnostics: diagnostics };
}

function loadAuthorizationPackage(cwd = ROOT) {
  const abs = path.join(cwd, TOOLING_AUTHORIZATION_PATH);
  try {
    return JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (err) {
    const e = new Error("AUTHORIZATION_PACKAGE_UNREADABLE");
    e.code = "AUTHORIZATION_PINS_UNPUBLISHED";
    e.cause = err;
    throw e;
  }
}

function assertAuthorizationPublished(inputs = {}) {
  if (inputs.allowUnpublishedForHarness === true) return { harness_bypass: true };
  const auth = loadAuthorizationPackage(inputs.cwd || ROOT);
  const pub = auth.publication || {};
  const unpublished =
    auth.publication?.status === "UNPUBLISHED" ||
    pub.required_prior_dry_run_evidence_sha256 == null ||
    pub.required_pre_apply_live_evidence_sha256 == null;
  if (unpublished) {
    const e = new Error(
      "AUTHORIZATION_PINS_UNPUBLISHED: prior-dry-run and pre-apply pins are null/UNPUBLISHED; refuse before production contact",
    );
    e.code = "AUTHORIZATION_PINS_UNPUBLISHED";
    e.phase = "authorization";
    throw e;
  }
  return { harness_bypass: false, publication: pub };
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
  const cwd = inputs.cwd || ROOT;
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

async function withClient(databaseUrl, fn) {
  const client = new Client({ connectionString: databaseUrl });
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
  try {
    assertAuthorizationPublished(inputs);
    assertFeatureFlagUntouched(inputs.env || process.env);
    const packed = loadSealedMigrations(inputs);
    evidence.source_authority = packed.map((p) => ({
      version: p.migration.version,
      oid: p.loaded.oid,
      sha256: p.loaded.sha256,
      bytes: p.loaded.bytes,
    }));
    const { url, uri_diagnostics } = resolveDatabaseUrlFromEnv(inputs.env || process.env);
    evidence.uri_diagnostics = uri_diagnostics;
    evidence.databaseConnectionAttempts = 1;
    await withClient(url, async (client) => {
      await client.query("BEGIN");
      await tryAdvisoryLock(client, inputs);
      evidence.advisory_lock_acquired = true;
      await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
      for (const p of packed) await assertVersionAbsent(client, p.migration.version);
      evidence.prior_history_count = PRIOR_HISTORY_COUNT;
      await client.query("ROLLBACK");
    });
    evidence.verdict = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
    evidence.result_code = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
    evidence.sqlApplicationAttempts = 0;
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
  let databaseUrl;
  let packed;
  let priorManifest = null;
  let commitPhase = "pre_commit";

  try {
    assertAuthorizationPublished(inputs);
    assertFeatureFlagUntouched(inputs.env || process.env);
    if (inputs.authorizationToken !== APPLY_AUTHORIZATION_TOKEN) {
      const e = new Error("APPLY_AUTHORIZATION_TOKEN_MISMATCH");
      e.code = "APPLY_AUTHORIZATION_TOKEN_MISMATCH";
      throw e;
    }
    const resolved = resolveDatabaseUrlFromEnv(inputs.env || process.env);
    databaseUrl = resolved.url;
    evidence.uri_diagnostics = resolved.uri_diagnostics;
    packed = loadSealedMigrations(inputs);
    evidence.source_authority = packed.map((p) => ({
      version: p.migration.version,
      oid: p.loaded.oid,
      sha256: p.loaded.sha256,
      bytes: p.loaded.bytes,
    }));
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
    await withClient(databaseUrl, async (client) => {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '30s'");
      await tryAdvisoryLock(client, inputs);
      evidence.advisory_lock_acquired = true;

      for (const p of packed) await assertVersionAbsent(client, p.migration.version);
      await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
      priorManifest = await captureHistoryManifest(client);
      evidence.prior_history_count = priorManifest.length;

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
        databaseUrl,
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

async function reconcileAfterIndeterminate(databaseUrl, packed, priorManifest) {
  try {
    return await withClient(databaseUrl, async (client) => {
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
  assertAuthorizationPublished,
  assertFeatureFlagUntouched,
  assertMigrationOrder,
  classifyDatabaseUrl,
  loadSealedMigrations,
  resolveDatabaseUrlFromEnv,
  runApplicator,
  runApply,
  runDryRun,
  sanitizeError,
  sanitizeValue,
};

const applyCore = module.exports;
module.exports = { ...applyConstants, ...applyCore, runApplicator: applyCore.runApplicator };
if (require.main === module) {
  applyCore.runApplicator({ mode: process.argv.includes("--apply") ? "apply" : "dry-run", authorizationToken: process.env.RA_PRO_ACCOUNTING_AUTOMATION_APPLY_TOKEN, env: process.env }).then((r) => {
    process.stdout.write(JSON.stringify(r) + "\n");
    if (r.verdict !== "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" && r.verdict !== "APPLY_COMMITTED") process.exitCode = 1;
  }).catch((err) => { process.stderr.write(JSON.stringify({ verdict: "BLOCKED", reason: String(err && err.message) }) + "\n"); process.exitCode = 1; });
}
