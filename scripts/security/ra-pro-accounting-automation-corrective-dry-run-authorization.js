"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Non-circular corrective one-attempt dry-run execution authorization.
 *
 * Executable tip: production_dry_run_authorization is UNPUBLISHED.
 * A later strict-descendant publication may change ONLY that AUTH object,
 * name authorized_executable_commit as the already-known immutable executable tip,
 * and bind a unique attempt_id. The publication commit SHA is never stored in AUTH.
 *
 * Authority loads via git cat-file only. Worktree / env / path overrides are rejected.
 * --executable-commit alone is never a source of trust.
 */
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
  EVIDENCE_PIN_AUTHORITY_AUTH_OID,
  EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
  EVIDENCE_PIN_AUTHORITY_COMMIT,
  EXPECTED_PROJECT_REF,
  REJECTED_HISTORICAL_EXECUTABLE_COMMITS,
  STANDALONE_BUNDLE_BYTES,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
  TOOLING_AUTHORIZATION_PATH,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { loadAndVerifyGitBlob } = require("./git-blob-authority");
const {
  assertExecutableAuthorityBeforeCredentials,
  assertNotHistoricalExecutable,
} = require("./ra-pro-accounting-automation-corrective-executable-authority");

const PROTOCOL =
  "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_ONE_ATTEMPT_DRY_RUN_AUTHORIZATION_V1";
const AUTH_REL = TOOLING_AUTHORIZATION_PATH;
const RECORD_KEY = "production_dry_run_authorization";
const BLOCKED_UNPUBLISHED = "DRY_RUN_REMAINS_BLOCKED_BEFORE_CREDENTIALS";
const DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED = "DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED";
const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;
const ATTEMPT_RE = /^corr-dryrun-[0-9a-f]{12}-[0-9a-f]{32}$/;

const BOOTSTRAP_REL =
  "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1";
const CEREMONY_REL =
  "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1";

function assertDryRunPublicationAllowlist(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  const executable = String(inputs.executable || inputs.executableCommit || "").toLowerCase();
  const publication = String(
    inputs.publication || inputs.publicationCommit || "",
  ).toLowerCase();
  if (!HEX40.test(executable) || !HEX40.test(publication)) {
    throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "commit shape");
  }
  assertAllowlist(executable, publication, cwd);
  return { ok: true, executable, publication };
}

const RECORD_KEYS = Object.freeze([
  "status",
  "protocol",
  "dry_run_authorized",
  "authorized_executable_commit",
  "attempt_id",
  "project_ref",
  "bundle",
  "bootstrap",
  "ceremony",
  "evidence_pin_authority",
  "precondition_evidence",
  "pre_apply_live_evidence",
  "executable_authority_publication_commit",
  "executable_authority_publication_blob_oid",
  "publication_role",
  "note",
]);

const ARTIFACT_MAP = Object.freeze({
  authorization_record: "publication_commit",
  bundle_bootstrap_ceremony: "authorized_executable_commit",
});

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "dry_run_authorization";
  return error;
}

function gitEnv(cwd) {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
  env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "ra-acct-corrective-dryrun-disposable";
  env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "ra-acct-corrective-dryrun-disposable@invalid";
  env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || "ra-acct-corrective-dryrun-disposable";
  env.GIT_COMMITTER_EMAIL = env.GIT_COMMITTER_EMAIL || "ra-acct-corrective-dryrun-disposable@invalid";
  return env;
}

function gitText(args, cwd) {
  return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
}

function canonicalUnpublishedDryRunAuthorization() {
  return {
    status: "UNPUBLISHED",
    protocol: PROTOCOL,
    dry_run_authorized: false,
    authorized_executable_commit: null,
    attempt_id: null,
    project_ref: null,
    bundle: null,
    bootstrap: null,
    ceremony: null,
    evidence_pin_authority: null,
    precondition_evidence: null,
    pre_apply_live_evidence: null,
    executable_authority_publication_commit: null,
    executable_authority_publication_blob_oid: null,
    publication_role: "later_descendant_commit",
    note:
      "Corrective dry-run execution authorization is unpublished until a separate reviewed one-object publication names authorized_executable_commit and a unique attempt_id. The publication commit SHA is not stored here. Dry-run AUTH may not independently choose an executable tip — a validated production_executable_authority publication must bind the clean executable first. Historical tip 9f31c355… is rejected. --executable-commit alone is never authority.",
  };
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

function assertNoAuthorizationEnv(env) {
  for (const key of Object.keys(env || {})) {
    if (
      /CORRECTIVE.*(DRY_RUN.*AUTH|DRYRUN.*AUTH|EXECUTABLE_COMMIT|AUTHORITY_PUBLICATION)/i.test(key) &&
      env[key] &&
      !/DATABASE_URL|APPLY_TOKEN/i.test(key)
    ) {
      throw blocked("DRY_RUN_AUTHORIZATION_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
}

function resolvePublicationCommit(inputs, cwd) {
  if (inputs.publicationCommit != null) {
    const commit = String(inputs.publicationCommit || "").toLowerCase();
    if (!HEX40.test(commit)) {
      throw blocked("DRY_RUN_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN", "shape");
    }
    return commit;
  }
  return gitText(["rev-parse", "HEAD"], cwd).toLowerCase();
}

/**
 * Executable tip comes only from a validated executable-authority map.
 * Dry-run AUTH may recheck that tip; it must not independently choose one.
 */
function resolveBoundExecutableAuthority(inputs = {}) {
  if (inputs.executableAuthorityMap) {
    const map = inputs.executableAuthorityMap;
    if (map.blocked || map.executable_authorized !== true) {
      throw blocked(DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED, "executable authority map blocked");
    }
    const executable = String(map.authorized_executable_commit || "").toLowerCase();
    if (!HEX40.test(executable)) {
      throw blocked("DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH", "map missing executable");
    }
    assertNotHistoricalExecutable(executable);
    return map;
  }
  const pub =
    inputs.executableAuthorityPublication ||
    inputs.executableAuthorityPublicationCommit ||
    null;
  if (!pub || !HEX40.test(String(pub).toLowerCase())) {
    throw blocked(
      DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED,
      "validated executableAuthorityMap or executableAuthorityPublication required",
    );
  }
  return assertExecutableAuthorityBeforeCredentials({
    cwd: inputs.cwd || process.cwd(),
    publicationCommit: String(pub).toLowerCase(),
    env: inputs.env || {},
    expectBlobOid: inputs.expectExecutableAuthorityBlobOid,
    expectBlobSha256: inputs.expectExecutableAuthorityBlobSha256,
    expectBlobBytes: inputs.expectExecutableAuthorityBlobBytes,
    auth: inputs.executableAuthorityAuth,
  });
}

function assertNotCircularPin(publication, executable, blobText) {
  if (
    !HEX40.test(String(executable || "")) ||
    executable === publication ||
    String(blobText || "").includes(publication)
  ) {
    throw blocked("DRY_RUN_AUTHORIZATION_CIRCULAR_TIP", "publication commit must not name itself");
  }
}

function assertAllowlist(executable, publication, cwd) {
  if (!isAncestor(executable, publication, cwd) || executable === publication) {
    throw blocked("DRY_RUN_AUTHORIZATION_ANCESTRY", "executable must be a strict ancestor");
  }
  const names = gitText(["diff", "--name-only", executable, publication], cwd)
    .split(/\n/)
    .filter(Boolean);
  if (names.length !== 1 || names[0] !== AUTH_REL) {
    throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", names.join(",") || "empty");
  }
  const left = loadAuthFromGit(executable, cwd).auth;
  const right = loadAuthFromGit(publication, cwd).auth;
  const prior = left[RECORD_KEY] || {};
  if (
    prior.status !== "UNPUBLISHED" ||
    prior.dry_run_authorized !== false ||
    prior.authorized_executable_commit ||
    prior.attempt_id
  ) {
    throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "executable record is not unpublished");
  }
  left[RECORD_KEY] = null;
  right[RECORD_KEY] = null;
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "non-authorization json changed");
  }
}

function requireSeal(seal, label) {
  if (
    !seal ||
    !HEX40.test(String(seal.oid || "")) ||
    !HEX64.test(String(seal.sha256 || "")) ||
    !Number.isInteger(seal.bytes)
  ) {
    throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", label);
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

function assertEvidencePinBinding(record) {
  const pin = record.evidence_pin_authority || {};
  if (String(pin.commit || "").toLowerCase() !== EVIDENCE_PIN_AUTHORITY_COMMIT) {
    throw blocked("DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY", "commit");
  }
  if (String(pin.auth_blob_oid || "").toLowerCase() !== EVIDENCE_PIN_AUTHORITY_AUTH_OID) {
    throw blocked("DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY", "auth oid");
  }
  if (String(pin.auth_blob_sha256 || "").toLowerCase() !== EVIDENCE_PIN_AUTHORITY_AUTH_SHA256) {
    throw blocked("DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY", "auth sha");
  }
  if (pin.auth_blob_bytes !== EVIDENCE_PIN_AUTHORITY_AUTH_BYTES) {
    throw blocked("DRY_RUN_AUTHORIZATION_EVIDENCE_AUTHORITY", "auth bytes");
  }
}

function assertRecordSeals(record, executable, cwd) {
  if (record.project_ref !== EXPECTED_PROJECT_REF) {
    throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", "project");
  }
  if (!ATTEMPT_RE.test(String(record.attempt_id || ""))) {
    throw blocked("DRY_RUN_ATTEMPT_ID_INVALID", String(record.attempt_id || ""));
  }
  assertEvidencePinBinding(record);
  const bundle = record.bundle || {};
  requireSeal(bundle, "bundle");
  if (bundle.path !== STANDALONE_BUNDLE_PATH) {
    throw blocked("DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH", "path");
  }
  assertBlob(executable, STANDALONE_BUNDLE_PATH, bundle, cwd, "DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH");

  const bootstrap = record.bootstrap || {};
  if (bootstrap.path !== BOOTSTRAP_REL) {
    throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", "bootstrap path");
  }
  assertBlob(executable, BOOTSTRAP_REL, bootstrap, cwd, "DRY_RUN_AUTHORIZATION_SEAL_MISSING");

  const ceremony = record.ceremony || {};
  if (ceremony.path !== CEREMONY_REL) {
    throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", "ceremony path");
  }
  assertBlob(executable, CEREMONY_REL, ceremony, cwd, "DRY_RUN_AUTHORIZATION_SEAL_MISSING");

  for (const key of ["precondition_evidence", "pre_apply_live_evidence"]) {
    const seal = record[key] || {};
    requireSeal(seal, key);
    if (!HEX40.test(String(seal.source_commit || "").toLowerCase())) {
      throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", `${key} source_commit`);
    }
  }
}

function describeDryRunArtifactMap(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  assertNoAuthorizationEnv(inputs.env || {});
  const executableAuthority = resolveBoundExecutableAuthority({ ...inputs, cwd });
  const boundExecutable = String(executableAuthority.authorized_executable_commit).toLowerCase();

  const publication = resolvePublicationCommit(inputs, cwd);
  const { auth, loaded } = loadAuthFromGit(publication, cwd);
  if (inputs.auth && JSON.stringify(inputs.auth) !== JSON.stringify(auth)) {
    throw blocked("DRY_RUN_AUTHORIZATION_WORKTREE_SUBSTITUTE", "auth object");
  }
  const record = auth[RECORD_KEY] || {};
  const base = {
    protocol: PROTOCOL,
    publication_commit: publication,
    authorization_publication_blob_oid: loaded.oid,
    authorized_executable_commit: null,
    attempt_id: null,
    bundle_oid: null,
    dry_run_authorized: false,
    artifact_map: ARTIFACT_MAP,
    blocked: null,
    executable_authority_publication_commit: executableAuthority.publication_commit,
    executable_authority_publication_blob_oid:
      executableAuthority.authorization_publication_blob_oid,
  };
  if (record.status !== "AUTHORIZED" || record.dry_run_authorized !== true) {
    return { ...base, blocked: BLOCKED_UNPUBLISHED };
  }
  const extraRecordKeys = Object.keys(record).filter((key) => !RECORD_KEYS.includes(key));
  if (extraRecordKeys.length) {
    throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", `extra record field ${extraRecordKeys[0]}`);
  }
  for (const key of RECORD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      throw blocked("DRY_RUN_AUTHORIZATION_SEAL_MISSING", key);
    }
  }
  const executable = String(record.authorized_executable_commit || "").toLowerCase();
  if (executable !== boundExecutable) {
    throw blocked(
      "DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH",
      "dry-run authorized_executable_commit must match executable-authority map",
    );
  }
  const recordExecAuthCommit = String(
    record.executable_authority_publication_commit || "",
  ).toLowerCase();
  const recordExecAuthOid = String(
    record.executable_authority_publication_blob_oid || "",
  ).toLowerCase();
  if (
    recordExecAuthCommit !== String(executableAuthority.publication_commit).toLowerCase() ||
    recordExecAuthOid !==
      String(executableAuthority.authorization_publication_blob_oid).toLowerCase()
  ) {
    throw blocked(
      "DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH",
      "dry-run record executable-authority tuple must match validated map",
    );
  }
  assertNotCircularPin(publication, executable, loaded.buffer.toString("utf8"));
  assertAllowlist(executable, publication, cwd);
  assertRecordSeals(record, executable, cwd);
  return {
    ...base,
    authorized_executable_commit: executable,
    attempt_id: record.attempt_id,
    bundle_oid: record.bundle.oid,
    bundle_sha256: record.bundle.sha256,
    bundle_bytes: record.bundle.bytes,
    dry_run_authorized: true,
    blocked: null,
    evidence_pin_authority_commit: record.evidence_pin_authority.commit,
    evidence_pin_authority_auth_oid: record.evidence_pin_authority.auth_blob_oid,
    seals: {
      bundle: record.bundle,
      bootstrap: record.bootstrap,
      ceremony: record.ceremony,
      precondition_evidence: record.precondition_evidence,
      pre_apply_live_evidence: record.pre_apply_live_evidence,
      evidence_pin_authority: record.evidence_pin_authority,
    },
    executable_authority: {
      publication_commit: executableAuthority.publication_commit,
      authorization_publication_blob_oid:
        executableAuthority.authorization_publication_blob_oid,
      authorized_executable_commit: boundExecutable,
      bundle_oid: executableAuthority.bundle_oid,
    },
  };
}

function preflightDryRunAuthorization(inputs = {}) {
  try {
    return describeDryRunArtifactMap(inputs);
  } catch (err) {
    return {
      blocked: err.code || "DRY_RUN_AUTHORIZATION_PREFLIGHT_FAILED",
      dry_run_authorized: false,
      publication_commit: inputs.publicationCommit || null,
      authorization_publication_blob_oid: null,
      authorized_executable_commit: null,
      attempt_id: null,
      executable_authority_publication_commit: null,
      executable_authority_publication_blob_oid: null,
    };
  }
}

function recheckDryRunAuthorizationPin(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  const expectExecutable = String(inputs.expectExecutable || "").toLowerCase();
  const expectCommit = String(inputs.expectCommit || "").toLowerCase();
  const expectOid = String(inputs.expectBlobOid || "").toLowerCase();
  const expectBundle = String(inputs.expectBundleOid || "").toLowerCase();
  const expectAttempt = String(inputs.expectAttemptId || "");
  const expectExecAuthCommit = String(
    inputs.expectExecutableAuthorityCommit ||
      inputs.expectExecutableAuthorityPublication ||
      "",
  ).toLowerCase();
  const expectExecAuthOid = String(
    inputs.expectExecutableAuthorityBlobOid || "",
  ).toLowerCase();
  if (![expectExecutable, expectCommit, expectOid, expectBundle].every((value) => HEX40.test(value))) {
    throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "pin shape");
  }
  if (!ATTEMPT_RE.test(expectAttempt)) {
    throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "attempt shape");
  }
  assertNotHistoricalExecutable(expectExecutable);
  if (!HEX40.test(expectExecAuthCommit) || !HEX40.test(expectExecAuthOid)) {
    throw blocked(DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED, "executable-authority pin shape");
  }
  // Pin is the immutable publication commit OID (may be orphan/disposable). Live refs are optional.
  if (inputs.expectLiveRef != null && String(inputs.expectLiveRef).length) {
    const live = gitText(["rev-parse", String(inputs.expectLiveRef)], cwd).toLowerCase();
    if (live !== expectCommit) {
      throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "live ref swapped after preflight");
    }
  }
  if (!isAncestor(expectExecutable, expectCommit, cwd) || expectExecutable === expectCommit) {
    throw blocked("DRY_RUN_AUTHORIZATION_ANCESTRY", "executable moved after preflight");
  }
  const bundleAtExecutable = gitText(
    ["rev-parse", `${expectExecutable}:${STANDALONE_BUNDLE_PATH}`],
    cwd,
  ).toLowerCase();
  let bundleAtPublication = "";
  try {
    bundleAtPublication = gitText(
      ["rev-parse", `${expectCommit}:${STANDALONE_BUNDLE_PATH}`],
      cwd,
    ).toLowerCase();
  } catch (err) {
    throw blocked(
      "DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH",
      err && err.message ? err.message : "publication bundle",
    );
  }
  if (bundleAtExecutable !== expectBundle || bundleAtPublication !== expectBundle) {
    throw blocked("DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH", "bundle moved after preflight");
  }
  const { loaded } = loadAuthFromGit(expectCommit, cwd);
  if (loaded.oid !== expectOid) {
    throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "authorization blob changed");
  }
  const decision = describeDryRunArtifactMap({
    cwd,
    publicationCommit: expectCommit,
    executableAuthorityPublication: expectExecAuthCommit,
    expectExecutableAuthorityBlobOid: expectExecAuthOid,
    executableAuthorityMap: inputs.executableAuthorityMap,
  });
  if (decision.blocked) throw blocked(decision.blocked, "recheck");
  if (
    decision.publication_commit !== expectCommit ||
    decision.authorization_publication_blob_oid !== expectOid ||
    decision.authorized_executable_commit !== expectExecutable ||
    decision.bundle_oid !== expectBundle ||
    decision.attempt_id !== expectAttempt ||
    decision.executable_authority_publication_commit !== expectExecAuthCommit ||
    decision.executable_authority_publication_blob_oid !== expectExecAuthOid
  ) {
    throw blocked("DRY_RUN_AUTHORIZATION_PIN_MISMATCH", "map drift");
  }
  return decision;
}

function assertDryRunAuthorizedBeforeCredentials(inputs = {}) {
  const map = describeDryRunArtifactMap(inputs);
  if (map.blocked || map.dry_run_authorized !== true) {
    throw blocked(map.blocked || BLOCKED_UNPUBLISHED, "dry-run unauthorized");
  }
  return map;
}

function mktree(lines, cwd) {
  const input = lines.length ? `${lines.join("\n")}\n` : "";
  return execFileSync("git", ["mktree"], {
    cwd,
    env: gitEnv(cwd),
    input,
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
  if (!found) {
    if (parts.length === 1) {
      next.push(`100644 blob ${blob}\t${name}`);
    } else {
      const emptyTree = mktree([], cwd);
      const child = replacePathInTree(emptyTree, parts.slice(1), blob, cwd);
      next.push(`040000 tree ${child}\t${name}`);
    }
  }
  return mktree(next, cwd);
}

function commitPublicationTree(cwd, parent, authObject) {
  const text = `${JSON.stringify(authObject, null, 2)}\n`;
  if (text.includes("\r")) throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "crlf");
  const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd,
    env: gitEnv(cwd),
    input: text,
    encoding: "utf8",
  }).trim();
  const tree = gitText(["rev-parse", `${parent}^{tree}`], cwd);
  const newTree = replacePathInTree(tree, AUTH_REL.split("/"), blob, cwd);
  return execFileSync(
    "git",
    ["commit-tree", newTree, "-p", parent, "-m", "disposable corrective dry-run authorization"],
    { cwd, env: gitEnv(cwd), encoding: "utf8" },
  ).trim();
}

function sealAtCommit(commit, rel, cwd) {
  const loaded = loadAndVerifyGitBlob({ commit, path: rel, cwd });
  return {
    path: rel,
    oid: loaded.oid,
    sha256: loaded.sha256,
    bytes: loaded.bytes,
    line_endings: "LF",
  };
}

/**
 * Tests ONLY. Builds a disposable AUTHORIZED one-object dry-run publication.
 * authorized_executable_commit is taken only from a validated executable-authority map.
 */
function createDisposableDryRunPublicationCommit(inputs = {}) {
  if (inputs.allowDisposableDryRunPublicationCommit !== true) {
    throw blocked("DISPOSABLE_PUBLICATION_FORBIDDEN", "harness flag required");
  }
  if (inputs.testOnlyHarnessContext !== true) {
    throw blocked("HARNESS_CONTEXT_REQUIRED", "testOnlyHarnessContext required");
  }
  const cwd = inputs.cwd || process.cwd();
  const executableAuthority = resolveBoundExecutableAuthority({ ...inputs, cwd });
  const executable = String(executableAuthority.authorized_executable_commit).toLowerCase();
  assertNotHistoricalExecutable(executable);
  if (inputs.executableCommit != null) {
    const recheck = String(inputs.executableCommit).toLowerCase();
    if (recheck !== executable) {
      throw blocked(
        "DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH",
        "caller executableCommit recheck does not match executable-authority map",
      );
    }
  }
  const attemptId = String(inputs.attemptId || "");
  if (!ATTEMPT_RE.test(attemptId)) throw blocked("DRY_RUN_ATTEMPT_ID_INVALID", attemptId);

  const { auth } = loadAuthFromGit(executable, cwd);
  if ((auth[RECORD_KEY] || {}).status === "AUTHORIZED") {
    throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "refusing to broaden an authorized record");
  }

  const prePub = auth.precondition_publication || {};
  const livePub = auth.pre_apply_live_publication || {};

  auth[RECORD_KEY] = {
    status: "AUTHORIZED",
    protocol: PROTOCOL,
    dry_run_authorized: true,
    authorized_executable_commit: executable,
    attempt_id: attemptId,
    project_ref: auth.project_ref || EXPECTED_PROJECT_REF,
    bundle: {
      path: STANDALONE_BUNDLE_PATH,
      oid: (auth.standalone_bundle && auth.standalone_bundle.oid) || STANDALONE_BUNDLE_OID,
      sha256: (auth.standalone_bundle && auth.standalone_bundle.sha256) || STANDALONE_BUNDLE_SHA256,
      bytes: (auth.standalone_bundle && auth.standalone_bundle.bytes) || STANDALONE_BUNDLE_BYTES,
    },
    bootstrap: sealAtCommit(executable, BOOTSTRAP_REL, cwd),
    ceremony: sealAtCommit(executable, CEREMONY_REL, cwd),
    evidence_pin_authority: {
      commit: EVIDENCE_PIN_AUTHORITY_COMMIT,
      auth_path: AUTH_REL,
      auth_blob_oid: EVIDENCE_PIN_AUTHORITY_AUTH_OID,
      auth_blob_sha256: EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
      auth_blob_bytes: EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
    },
    precondition_evidence: {
      path: prePub.evidence_path,
      source_commit: prePub.evidence_source_commit,
      oid: prePub.evidence_blob_oid,
      sha256: prePub.evidence_sha256,
      bytes: prePub.evidence_bytes,
    },
    pre_apply_live_evidence: {
      path: livePub.evidence_path,
      source_commit: livePub.evidence_source_commit,
      oid: livePub.evidence_blob_oid,
      sha256: livePub.evidence_sha256,
      bytes: livePub.evidence_bytes,
    },
    executable_authority_publication_commit: executableAuthority.publication_commit,
    executable_authority_publication_blob_oid:
      executableAuthority.authorization_publication_blob_oid,
    publication_role: "later_descendant_commit",
    note:
      "Disposable corrective dry-run publication for harness only. Publication SHA is not stored here. Executable tip bound from executable-authority map.",
  };

  const before = gitText(["rev-parse", "HEAD"], cwd);
  const publication = commitPublicationTree(cwd, executable, auth);
  const after = gitText(["rev-parse", "HEAD"], cwd);
  if (before !== after) throw blocked("DRY_RUN_AUTHORIZATION_ALLOWLIST", "HEAD moved");
  if (JSON.stringify(auth).includes(publication)) {
    throw blocked("DRY_RUN_AUTHORIZATION_CIRCULAR_TIP", "publication embedded");
  }
  return {
    publicationCommit: publication,
    executableCommit: executable,
    attemptId,
    authorization_publication_blob_oid: gitText(["rev-parse", `${publication}:${AUTH_REL}`], cwd),
    executable_authority_publication_commit: executableAuthority.publication_commit,
    executable_authority_publication_blob_oid:
      executableAuthority.authorization_publication_blob_oid,
    headUnchanged: true,
  };
}

function expectedDryRunAuthorityFromMap(map) {
  if (!map || map.blocked || map.dry_run_authorized !== true) {
    throw blocked(BLOCKED_UNPUBLISHED, "expected dry-run authority unavailable");
  }
  if (
    !map.executable_authority_publication_commit ||
    !map.executable_authority_publication_blob_oid
  ) {
    throw blocked(DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED, "executable-authority tuple missing");
  }
  return {
    authorized_executable_commit: map.authorized_executable_commit,
    authorization_publication_commit: map.publication_commit,
    authorization_publication_blob_oid: map.authorization_publication_blob_oid,
    attempt_id: map.attempt_id,
    bundle_oid: map.bundle_oid,
    executable_authority_publication_commit: map.executable_authority_publication_commit,
    executable_authority_publication_blob_oid: map.executable_authority_publication_blob_oid,
  };
}

module.exports = {
  ARTIFACT_MAP,
  ATTEMPT_RE,
  AUTH_REL,
  BLOCKED_UNPUBLISHED,
  BOOTSTRAP_REL,
  CEREMONY_REL,
  DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED,
  PROTOCOL,
  RECORD_KEY,
  RECORD_KEYS,
  REJECTED_HISTORICAL_EXECUTABLE_COMMITS,
  assertDryRunAuthorizedBeforeCredentials,
  assertDryRunPublicationAllowlist,
  assertNotCircularPin,
  canonicalUnpublishedDryRunAuthorization,
  createDisposableDryRunPublicationCommit,
  describeDryRunArtifactMap,
  expectedDryRunAuthorityFromMap,
  loadAuthFromGit,
  preflightDryRunAuthorization,
  recheckDryRunAuthorizationPin,
  resolveBoundExecutableAuthority,
};
