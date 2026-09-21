"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * One-attempt apply authorization.
 *
 * Runtime map (never a commit that contains its own SHA):
 * - publication commit: the commit whose Git blob holds this record. Production
 *   uses HEAD. It is discovered at runtime and is not stored in the file.
 * - authorized_executable_commit: an ancestor named by that record. It supplies
 *   the ceremony, gates, bundle, migrations, and CA.
 * Evidence publication and the apply token do not authorize apply.
 * This delivery leaves the committed record UNPUBLISHED.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
  EXPECTED_PROJECT_REF,
  MIGRATIONS,
} = require("./ra-pro-accounting-automation-apply-constants");
const { loadAndVerifyGitBlob } = require("./git-blob-authority");
const {
  OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256,
} = require("./ra-pro-accounting-automation-tls-ca");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_ONE_ATTEMPT_APPLY_AUTHORIZATION_V1";
const RETIREMENT_PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_ATTEMPT_RETIREMENT_V1";
const AUTH_REL = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";
const BUNDLE_REL = "scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs";
const ATTEMPT_RE = /^apply-[0-9a-f]{12}-[0-9a-f]{32}$/;
const HEX40 = /^[0-9a-f]{40}$/;
const RECORD_KEYS = Object.freeze([
  "status",
  "protocol",
  "apply_authorized",
  "authorized_executable_commit",
  "attempt_id",
  "project_ref",
  "database_url_env",
  "apply_authorization_token",
  "bundle",
  "migrations",
  "prior_dry_run_evidence",
  "pre_apply_live_evidence",
  "tls_trust_root",
  "publication_role",
  "note",
]);
const RETIREMENT_KEYS = Object.freeze([
  "protocol",
  "status",
  "attempt_id",
  "authorization_publication_commit",
  "authorized_executable_commit",
  "authorization_blob_oid",
  "authorization_blob_sha256",
  "authorization_blob_bytes",
  "terminal_reason",
  "prompt_opened",
  "marker_created",
  "node_db_client",
  "db_sql",
  "production_contact",
  "retired_at_utc",
  "note",
]);

const ARTIFACT_MAP = Object.freeze({
  authorization_record: "publication_commit",
  ceremony_entry_supervisor_gates_bootstrap: "authorized_executable_commit",
  bundle_migrations_ca: "authorized_executable_commit",
});

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "authorization";
  return error;
}

function gitEnv(cwd) {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
  env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "ra-acct-disposable";
  env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "ra-acct-disposable@invalid";
  env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || "ra-acct-disposable";
  env.GIT_COMMITTER_EMAIL = env.GIT_COMMITTER_EMAIL || "ra-acct-disposable@invalid";
  return env;
}

function gitText(args, cwd) {
  return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
}

function assertNotCircularPin(publication, executable, blobText) {
  if (
    !HEX40.test(String(executable || "")) ||
    executable === publication ||
    String(blobText || "").includes(publication)
  ) {
    throw blocked("APPLY_AUTHORIZATION_CIRCULAR_TIP", "publication commit must not name itself");
  }
}

function canonicalUnpublishedAuthorization() {
  return {
    status: "UNPUBLISHED",
    protocol: PROTOCOL,
    apply_authorized: false,
    authorized_executable_commit: null,
    attempt_id: null,
    project_ref: null,
    database_url_env: null,
    apply_authorization_token: null,
    bundle: null,
    migrations: null,
    prior_dry_run_evidence: null,
    pre_apply_live_evidence: null,
    tls_trust_root: null,
    publication_role: "later_descendant_commit",
    note: "The executable commit is an ancestor named by a later publication commit. This record must not contain that publication commit's own SHA. Evidence publication and the apply token do not authorize apply.",
  };
}

function assertNoAuthorizationEnv(env) {
  for (const key of [
    "RA_PRO_ACCOUNTING_AUTOMATION_SYNTHETIC_APPLY_AUTHORIZATION",
    "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_ATTEMPT_ID",
    "RA_PRO_ACCOUNTING_AUTOMATION_APPLY_MARKER_DIR",
    "RA_PRO_ACCOUNTING_AUTOMATION_PUBLICATION_COMMIT",
    "RA_PRO_ACCOUNTING_AUTOMATION_EXECUTABLE_COMMIT",
  ]) {
    if (env && Object.prototype.hasOwnProperty.call(env, key) && env[key]) {
      throw blocked("APPLY_AUTHORIZATION_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
}

function resolvePublicationCommit(inputs, cwd) {
  if (inputs.publicationCommit || inputs.tip) {
    if (inputs.allowDisposablePublicationCommit !== true || inputs.tip) {
      throw blocked("APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN", "publication commit");
    }
    const commit = String(inputs.publicationCommit || "").toLowerCase();
    if (!HEX40.test(commit)) throw blocked("APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN", "shape");
    return commit;
  }
  return gitText(["rev-parse", "HEAD"], cwd);
}

function loadAuthFromGit(commit, cwd) {
  const loaded = loadAndVerifyGitBlob({ commit, path: AUTH_REL, cwd });
  return { auth: JSON.parse(loaded.buffer.toString("utf8")), loaded };
}

function isAncestor(ancestor, descendant, cwd) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", ancestor, descendant], {
      cwd,
      env: gitEnv(cwd),
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function assertAllowlist(executable, publication, cwd) {
  if (!isAncestor(executable, publication, cwd) || executable === publication) {
    throw blocked("APPLY_AUTHORIZATION_ANCESTRY", "executable must be a strict ancestor");
  }
  const names = gitText(["diff", "--name-only", executable, publication], cwd)
    .split(/\n/)
    .filter(Boolean);
  if (names.length !== 1 || names[0] !== AUTH_REL) {
    throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", names.join(",") || "empty");
  }
  const left = loadAuthFromGit(executable, cwd).auth;
  const right = loadAuthFromGit(publication, cwd).auth;
  const prior = left.production_apply_authorization || {};
  if (prior.status !== "UNPUBLISHED" || prior.apply_authorized !== false || prior.authorized_executable_commit) {
    throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "executable record is not unpublished");
  }
  left.production_apply_authorization = null;
  right.production_apply_authorization = null;
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "non-authorization json changed");
  }
}

function requireSeal(seal, label) {
  if (!seal || !HEX40.test(String(seal.oid || "")) || !/^[0-9a-f]{64}$/.test(String(seal.sha256 || "")) || !Number.isInteger(seal.bytes)) {
    throw blocked("APPLY_AUTHORIZATION_SEAL_MISSING", label);
  }
}

function assertBlob(commit, rel, seal, cwd, code) {
  requireSeal(seal, rel);
  try {
    loadAndVerifyGitBlob({
      commit,
      path: rel,
      expectedOid: seal.oid,
      expectedSha256: seal.sha256,
      expectedBytes: seal.bytes,
      cwd,
    });
  } catch (err) {
    throw blocked(code, err && err.message ? err.message : rel);
  }
}

function assertRecordSeals(record, executable, cwd) {
  const bundle = record.bundle || {};
  requireSeal(bundle, "bundle");
  if (bundle.path !== BUNDLE_REL) throw blocked("APPLY_AUTHORIZATION_BUNDLE_MISMATCH", "path");
  assertBlob(executable, BUNDLE_REL, bundle, cwd, "APPLY_AUTHORIZATION_BUNDLE_MISMATCH");
  if (!Array.isArray(record.migrations) || record.migrations.length !== MIGRATIONS.length) {
    throw blocked("APPLY_AUTHORIZATION_SEAL_MISSING", "migrations");
  }
  MIGRATIONS.forEach((expected, index) => {
    const got = record.migrations[index] || {};
    if (got.version !== expected.version || got.path !== expected.path) {
      throw blocked("APPLY_AUTHORIZATION_MIGRATION_MISMATCH", expected.version);
    }
    assertBlob(executable, expected.path, got, cwd, "APPLY_AUTHORIZATION_MIGRATION_MISMATCH");
    if (got.oid !== expected.oid || got.sha256 !== expected.sha256 || got.bytes !== expected.bytes) {
      throw blocked("APPLY_AUTHORIZATION_MIGRATION_MISMATCH", expected.version);
    }
  });
  for (const key of ["prior_dry_run_evidence", "pre_apply_live_evidence"]) {
    const seal = record[key] || {};
    requireSeal(seal, key);
    if (!seal.path || !HEX40.test(String(seal.source_commit || ""))) {
      throw blocked("APPLY_AUTHORIZATION_SEAL_MISSING", key);
    }
    assertBlob(seal.source_commit, seal.path, seal, cwd, "APPLY_AUTHORIZATION_SEAL_MISSING");
  }
  const tls = record.tls_trust_root || {};
  requireSeal(tls, "ca");
  if (tls.der_sha256 !== OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256 || !tls.path || !HEX40.test(String(tls.source_commit || ""))) {
    throw blocked("APPLY_AUTHORIZATION_CA_MISMATCH", "der");
  }
  const loaded = loadAndVerifyGitBlob({
    commit: tls.source_commit,
    path: tls.path,
    expectedOid: tls.oid,
    expectedSha256: tls.sha256,
    expectedBytes: tls.bytes,
    cwd,
  });
  if (!loaded.buffer.toString("utf8").includes(tls.der_sha256)) {
    throw blocked("APPLY_AUTHORIZATION_CA_MISMATCH", "blob");
  }
  if (record.project_ref !== EXPECTED_PROJECT_REF) throw blocked("APPLY_AUTHORIZATION_SEAL_MISSING", "project");
  if (record.database_url_env !== DATABASE_URL_ENV) throw blocked("APPLY_AUTHORIZATION_SEAL_MISSING", "channel");
  if (record.apply_authorization_token !== APPLY_AUTHORIZATION_TOKEN) {
    throw blocked("APPLY_AUTHORIZATION_TOKEN_MISMATCH", "record token");
  }
}

function assertAttemptId(attemptId) {
  if (!ATTEMPT_RE.test(String(attemptId || ""))) throw blocked("APPLY_ATTEMPT_ID_INVALID", "attempt id");
}

function listRetiredAttempts(auth) {
  const rows = auth && Array.isArray(auth.production_apply_attempt_retirements)
    ? auth.production_apply_attempt_retirements
    : [];
  return rows;
}

function assertAttemptNotRetired(auth, attemptId) {
  assertAttemptId(attemptId);
  for (const row of listRetiredAttempts(auth)) {
    if (row && String(row.attempt_id || "") === String(attemptId)) {
      throw blocked("APPLY_ATTEMPT_RETIRED", String(row.terminal_reason || "retired"));
    }
  }
}

function buildAttemptRetirement(inputs = {}) {
  const attemptId = String(inputs.attempt_id || "");
  assertAttemptId(attemptId);
  const retirement = {
    protocol: RETIREMENT_PROTOCOL,
    status: "RETIRED",
    attempt_id: attemptId,
    authorization_publication_commit: String(inputs.authorization_publication_commit || "").toLowerCase(),
    authorized_executable_commit: String(inputs.authorized_executable_commit || "").toLowerCase(),
    authorization_blob_oid: String(inputs.authorization_blob_oid || "").toLowerCase(),
    authorization_blob_sha256: String(inputs.authorization_blob_sha256 || "").toLowerCase(),
    authorization_blob_bytes: inputs.authorization_blob_bytes,
    terminal_reason: String(inputs.terminal_reason || ""),
    prompt_opened: inputs.prompt_opened === true,
    marker_created: inputs.marker_created === true,
    node_db_client: Number.isInteger(inputs.node_db_client) ? inputs.node_db_client : 0,
    db_sql: Number.isInteger(inputs.db_sql) ? inputs.db_sql : 0,
    production_contact: inputs.production_contact === true,
    retired_at_utc: String(inputs.retired_at_utc || ""),
    note: String(
      inputs.note ||
        "Consumed without marker. Permanently non-reusable; absence of a marker does not restore the attempt.",
    ),
  };
  for (const key of RETIREMENT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(retirement, key)) {
      throw blocked("APPLY_ATTEMPT_RETIREMENT_INVALID", key);
    }
  }
  if (!HEX40.test(retirement.authorization_publication_commit)) {
    throw blocked("APPLY_ATTEMPT_RETIREMENT_INVALID", "publication");
  }
  if (!HEX40.test(retirement.authorized_executable_commit)) {
    throw blocked("APPLY_ATTEMPT_RETIREMENT_INVALID", "executable");
  }
  if (!HEX40.test(retirement.authorization_blob_oid) || !/^[0-9a-f]{64}$/.test(retirement.authorization_blob_sha256)) {
    throw blocked("APPLY_ATTEMPT_RETIREMENT_INVALID", "blob");
  }
  if (!Number.isInteger(retirement.authorization_blob_bytes) || retirement.authorization_blob_bytes <= 0) {
    throw blocked("APPLY_ATTEMPT_RETIREMENT_INVALID", "bytes");
  }
  if (!retirement.terminal_reason || !/^\d{4}-\d{2}-\d{2}T/.test(retirement.retired_at_utc)) {
    throw blocked("APPLY_ATTEMPT_RETIREMENT_INVALID", "terminal");
  }
  return retirement;
}

/**
 * Explicit revocation/retirement transition.
 * AUTHORIZED -> append immutable retirement -> UNPUBLISHED.
 * Not a silent reseal reset: reseal still refuses AUTHORIZED records.
 */
function revokeProductionApplyAuthorization(auth, retirementInputs = {}) {
  if (!auth || typeof auth !== "object") throw blocked("APPLY_AUTHORIZATION_SEAL_MISSING", "auth");
  const record = auth.production_apply_authorization || {};
  if (record.status !== "AUTHORIZED" || record.apply_authorized !== true) {
    throw blocked("APPLY_AUTHORIZATION_REVOKE_FORBIDDEN", "record is not AUTHORIZED");
  }
  const attemptId = String(retirementInputs.attempt_id || record.attempt_id || "");
  if (attemptId !== String(record.attempt_id || "")) {
    throw blocked("APPLY_AUTHORIZATION_REVOKE_FORBIDDEN", "attempt id mismatch");
  }
  assertAttemptNotRetired(auth, attemptId);
  const retirement = buildAttemptRetirement({
    ...retirementInputs,
    attempt_id: attemptId,
    authorized_executable_commit:
      retirementInputs.authorized_executable_commit || record.authorized_executable_commit,
  });
  const prior = listRetiredAttempts(auth).slice();
  prior.push(retirement);
  auth.production_apply_attempt_retirements = prior;
  auth.production_apply_authorization = canonicalUnpublishedAuthorization();
  return { auth, retirement };
}

function describeApplyArtifactMap(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  assertNoAuthorizationEnv(inputs.env || {});
  const publication = resolvePublicationCommit(inputs, cwd);
  const { auth, loaded } = loadAuthFromGit(publication, cwd);
  if (inputs.auth && JSON.stringify(inputs.auth) !== JSON.stringify(auth)) {
    throw blocked("APPLY_AUTHORIZATION_WORKTREE_SUBSTITUTE", "auth object");
  }
  const record = auth.production_apply_authorization || {};
  const base = {
    protocol: PROTOCOL,
    publication_commit: publication,
    authorization_blob_oid: loaded.oid,
    authorized_executable_commit: null,
    bundle_oid: null,
    apply_authorized: false,
    artifact_map: ARTIFACT_MAP,
    blocked: null,
  };
  if (record.status !== "AUTHORIZED" || record.apply_authorized !== true) {
    return { ...base, blocked: "APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS" };
  }
  const extraRecordKeys = Object.keys(record).filter((key) => !RECORD_KEYS.includes(key));
  if (extraRecordKeys.length) {
    throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", `extra record field ${extraRecordKeys[0]}`);
  }
  for (const key of RECORD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      throw blocked("APPLY_AUTHORIZATION_SEAL_MISSING", key);
    }
  }
  const executable = String(record.authorized_executable_commit || "").toLowerCase();
  assertNotCircularPin(publication, executable, loaded.buffer.toString("utf8"));
  assertAllowlist(executable, publication, cwd);
  assertAttemptId(record.attempt_id);
  assertAttemptNotRetired(auth, record.attempt_id);
  assertRecordSeals(record, executable, cwd);
  return {
    ...base,
    authorized_executable_commit: executable,
    bundle_oid: record.bundle.oid,
    bundle_sha256: record.bundle.sha256,
    bundle_bytes: record.bundle.bytes,
    attempt_id: record.attempt_id,
    prior_evidence: record.prior_dry_run_evidence,
    pre_apply_evidence: record.pre_apply_live_evidence,
    tls_der_sha256: record.tls_trust_root.der_sha256,
    blocked: null,
  };
}

function preflightApplyAuthorization(inputs = {}) {
  try {
    const cwd = inputs.cwd || process.cwd();
    const publication = resolvePublicationCommit(inputs, cwd);
    const { auth } = loadAuthFromGit(publication, cwd);
    const { assertPriorDryRunEvidencePublished } = require("./ra-pro-accounting-automation-prior-dry-run-gates");
    const { assertPreApplyLiveEvidencePublished } = require("./ra-pro-accounting-automation-pre-apply-gates");
    const publicationPins = auth.publication || {};
    if (publicationPins.required_prior_dry_run_evidence_sha256 != null) {
      assertPriorDryRunEvidencePublished({ auth, cwd, env: {} });
    }
    if (publicationPins.required_pre_apply_live_evidence_sha256 != null) {
      assertPreApplyLiveEvidencePublished({ auth, cwd, env: {}, now: inputs.now });
    }
    const map = describeApplyArtifactMap(inputs);
    if (inputs.authorizationToken != null && inputs.authorizationToken !== APPLY_AUTHORIZATION_TOKEN) {
      throw blocked("APPLY_AUTHORIZATION_TOKEN_MISMATCH", "token");
    }
    return map;
  } catch (err) {
    return {
      blocked: err.code || "APPLY_AUTHORIZATION_PREFLIGHT_FAILED",
      apply_authorized: false,
      publication_commit: inputs.publicationCommit || null,
      authorization_blob_oid: null,
    };
  }
}

function recheckApplyAuthorizationPin(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  const expectExecutable = String(inputs.expectExecutable || "").toLowerCase();
  const expectCommit = String(inputs.expectCommit || "").toLowerCase();
  const expectOid = String(inputs.expectBlobOid || "").toLowerCase();
  const expectBundle = String(inputs.expectBundleOid || "").toLowerCase();
  if (![expectExecutable, expectCommit, expectOid, expectBundle].every((value) => HEX40.test(value))) {
    throw blocked("APPLY_AUTHORIZATION_PIN_MISMATCH", "pin shape");
  }
  const head = gitText(["rev-parse", "HEAD"], cwd);
  if (head !== expectCommit) throw blocked("APPLY_AUTHORIZATION_PIN_MISMATCH", "HEAD changed after preflight");
  if (!isAncestor(expectExecutable, head, cwd) || expectExecutable === head) {
    throw blocked("APPLY_AUTHORIZATION_ANCESTRY", "executable moved after preflight");
  }
  const bundleAtExecutable = gitText(["rev-parse", `${expectExecutable}:${BUNDLE_REL}`], cwd).toLowerCase();
  let bundleAtHead = "";
  try {
    bundleAtHead = gitText(["rev-parse", `${head}:${BUNDLE_REL}`], cwd).toLowerCase();
  } catch (err) {
    throw blocked("APPLY_AUTHORIZATION_BUNDLE_MISMATCH", err && err.message ? err.message : "publication bundle");
  }
  if (bundleAtExecutable !== expectBundle || bundleAtHead !== expectBundle) {
    throw blocked("APPLY_AUTHORIZATION_BUNDLE_MISMATCH", "bundle moved after preflight");
  }
  const { loaded } = loadAuthFromGit(head, cwd);
  if (loaded.oid !== expectOid) throw blocked("APPLY_AUTHORIZATION_PIN_MISMATCH", "authorization blob changed");
  const decision = preflightApplyAuthorization({
    cwd,
    now: inputs.now,
    authorizationToken: inputs.authorizationToken,
  });
  if (decision.blocked) throw blocked(decision.blocked, "recheck");
  if (
    decision.publication_commit !== expectCommit ||
    decision.authorization_blob_oid !== expectOid ||
    decision.authorized_executable_commit !== expectExecutable ||
    String(decision.bundle_oid || "").toLowerCase() !== expectBundle
  ) {
    throw blocked("APPLY_AUTHORIZATION_PIN_MISMATCH", "decision changed");
  }
  return decision;
}

function markerFile(dir, attemptId) {
  assertAttemptId(attemptId);
  if (!dir || typeof dir !== "string") throw blocked("APPLY_MARKER_DIR_REQUIRED", "dir");
  return path.join(dir, `${attemptId}.marker`);
}

function createApplyMarkerAtomic(dir, executable, attemptId) {
  const file = markerFile(dir, attemptId);
  if (fs.existsSync(file)) throw blocked("APPLY_ATTEMPT_CONSUMED", "exists");
  fs.mkdirSync(dir, { recursive: true });
  let fd;
  try {
    fd = fs.openSync(file, "wx");
    fs.writeFileSync(fd, `apply\n${executable}\n${attemptId}\n`);
  } catch (err) {
    if (err && (err.code === "EEXIST" || err.code === "APPLY_ATTEMPT_CONSUMED")) {
      throw blocked("APPLY_ATTEMPT_CONSUMED", "create collision");
    }
    throw blocked("APPLY_MARKER_CREATE_FAILED", err && err.message ? err.message : "create");
  } finally {
    if (fd != null) fs.closeSync(fd);
  }
  return file;
}

function verifyExistingMarker(file, executable, attemptId) {
  assertAttemptId(attemptId);
  if (!file || !fs.existsSync(file)) throw blocked("APPLY_MARKER_MISSING", "before credentials");
  const lines = fs.readFileSync(file, "utf8").split(/\n/);
  if (lines[0] === "dry-run") throw blocked("APPLY_MARKER_DRY_RUN_REUSE_FORBIDDEN", "body");
  if (lines[0] !== "apply" || lines[1] !== executable || lines[2] !== attemptId) {
    throw blocked("APPLY_MARKER_MISMATCH", "body");
  }
  return file;
}

function assertOneAttemptApplyAuthorization(inputs = {}) {
  const map = describeApplyArtifactMap(inputs);
  if (map.blocked) throw blocked(map.blocked, "production apply authorization is unpublished");
  if (inputs.authorizationToken !== APPLY_AUTHORIZATION_TOKEN) {
    throw blocked("APPLY_AUTHORIZATION_TOKEN_MISMATCH", "token");
  }
  const executable = map.authorized_executable_commit;
  const attemptId = map.attempt_id;
  if (inputs.existingMarkerPath) {
    return {
      ...map,
      marker: verifyExistingMarker(inputs.existingMarkerPath, executable, attemptId),
      attemptId,
    };
  }
  return {
    ...map,
    marker: createApplyMarkerAtomic(inputs.markerDir, executable, attemptId),
    attemptId,
  };
}

function buildAuthorizedRecord(auth, executable, attemptId) {
  assertAttemptNotRetired(auth, attemptId);
  const prior = auth.prior_dry_run_publication || {};
  const pre = auth.pre_apply_live_publication || {};
  const bundle = auth.standalone_bundle || {};
  return {
    status: "AUTHORIZED",
    protocol: PROTOCOL,
    apply_authorized: true,
    authorized_executable_commit: executable,
    attempt_id: attemptId,
    project_ref: auth.project_ref,
    database_url_env: auth.database_url_env,
    apply_authorization_token: auth.apply_authorization_token,
    bundle: {
      path: bundle.path,
      oid: bundle.oid,
      sha256: bundle.sha256,
      bytes: bundle.bytes,
    },
    migrations: (auth.migrations || []).map((row) => ({
      version: row.version,
      path: row.path,
      oid: row.oid,
      sha256: row.sha256,
      bytes: row.bytes,
    })),
    prior_dry_run_evidence: {
      path: prior.evidence_path,
      source_commit: prior.evidence_source_commit,
      oid: prior.evidence_blob_oid,
      sha256: prior.evidence_sha256,
      bytes: prior.evidence_bytes,
    },
    pre_apply_live_evidence: {
      path: pre.evidence_path,
      source_commit: pre.evidence_source_commit,
      oid: pre.evidence_blob_oid,
      sha256: pre.evidence_sha256,
      bytes: pre.evidence_bytes,
    },
    tls_trust_root: {
      path: auth.tls_trust_root && auth.tls_trust_root.path,
      source_commit: auth.tls_trust_root && auth.tls_trust_root.source_commit,
      oid: auth.tls_trust_root && auth.tls_trust_root.oid,
      sha256: auth.tls_trust_root && auth.tls_trust_root.sha256,
      bytes: auth.tls_trust_root && auth.tls_trust_root.bytes,
      der_sha256: auth.tls_trust_root && auth.tls_trust_root.der_sha256,
    },
    publication_role: "later_descendant_commit",
    note: "Disposable or later publication. The publication commit SHA is not stored here.",
  };
}

function mktree(lines, cwd) {
  return execFileSync("git", ["mktree"], {
    cwd,
    env: gitEnv(cwd),
    input: `${lines.join("\n")}\n`,
    encoding: "utf8",
  }).trim();
}

function replacePathInTree(tree, parts, blob, cwd) {
  const lines = gitText(["ls-tree", tree], cwd).split(/\n/).filter(Boolean);
  const name = parts[0];
  let found = false;
  const next = lines.map((line) => {
    const tab = line.indexOf("\t");
    if (line.slice(tab + 1) !== name) return line;
    found = true;
    if (parts.length === 1) return `100644 blob ${blob}\t${name}`;
    const old = line.slice(0, tab).split(" ")[2];
    const child = replacePathInTree(old, parts.slice(1), blob, cwd);
    return `040000 tree ${child}\t${name}`;
  });
  if (!found) throw blocked("GIT_BLOB_LOAD_FAILED", parts.join("/"));
  return mktree(next, cwd);
}

function commitPublicationTree(cwd, parent, authObject) {
  const text = `${JSON.stringify(authObject, null, 2)}\n`;
  if (text.includes("\r")) throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "crlf");
  const executable = String((authObject.production_apply_authorization || {}).authorized_executable_commit || "");
  const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd,
    env: gitEnv(cwd),
    input: text,
    encoding: "utf8",
  }).trim();
  const tree = gitText(["rev-parse", `${parent}^{tree}`], cwd);
  const newTree = replacePathInTree(tree, AUTH_REL.split("/"), blob, cwd);
  const publication = execFileSync(
    "git",
    ["commit-tree", newTree, "-p", parent, "-m", "disposable accounting apply authorization"],
    { cwd, env: gitEnv(cwd), encoding: "utf8" },
  ).trim();
  assertNotCircularPin(publication, executable, text);
  return publication;
}

function createDisposablePublicationCommit(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  const executable = String(inputs.executableCommit || "").toLowerCase();
  if (!HEX40.test(executable)) throw blocked("APPLY_AUTHORIZATION_ANCESTRY", "executable");
  assertAttemptId(inputs.attemptId);
  const { auth } = loadAuthFromGit(executable, cwd);
  assertAttemptNotRetired(auth, inputs.attemptId);
  if ((auth.production_apply_authorization || {}).status === "AUTHORIZED") {
    throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "refusing to broaden an authorized record");
  }
  auth.production_apply_authorization = buildAuthorizedRecord(auth, executable, inputs.attemptId);
  const before = gitText(["rev-parse", "HEAD"], cwd);
  const publication = commitPublicationTree(cwd, executable, auth);
  const after = gitText(["rev-parse", "HEAD"], cwd);
  if (before !== after) throw blocked("APPLY_AUTHORIZATION_ALLOWLIST", "HEAD moved");
  return { publicationCommit: publication, executableCommit: executable, headUnchanged: true };
}

function assertResealPreservesAuthorization(record) {
  const current = record || {};
  if (current.status === "AUTHORIZED" || current.apply_authorized === true || current.authorized_executable_commit) {
    throw blocked("RESEAL_WOULD_RESET_AUTHORIZATION", "reseal cannot publish or clear an authorization");
  }
}

module.exports = {
  AUTH_REL,
  ARTIFACT_MAP,
  PROTOCOL,
  RETIREMENT_PROTOCOL,
  assertOneAttemptApplyAuthorization,
  assertResealPreservesAuthorization,
  assertNotCircularPin,
  assertAttemptNotRetired,
  buildAttemptRetirement,
  buildAuthorizedRecord,
  canonicalUnpublishedAuthorization,
  createApplyMarkerAtomic,
  createDisposablePublicationCommit,
  commitPublicationTree,
  describeApplyArtifactMap,
  listRetiredAttempts,
  preflightApplyAuthorization,
  recheckApplyAuthorizationPin,
  revokeProductionApplyAuthorization,
  verifyExistingMarker,
};
