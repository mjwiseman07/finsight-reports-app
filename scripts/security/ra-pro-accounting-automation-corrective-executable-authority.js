"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Non-circular corrective executable-authority publication.
 *
 * Tip AUTH keeps production_executable_authority UNPUBLISHED.
 * A later AUTH-only descendant may authorize exactly IMMUTABLE_EXECUTABLE_COMMIT
 * without storing the publication SHA in the AUTH blob.
 *
 * Dry-run authorization must bind a validated executable-authority map and may
 * not independently choose authorized_executable_commit.
 */
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
  EVIDENCE_PIN_AUTHORITY_AUTH_OID,
  EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
  EVIDENCE_PIN_AUTHORITY_COMMIT,
  EXPECTED_PROJECT_REF,
  IMMUTABLE_CORRECTIVE_EXECUTABLE_COMMIT,
  STANDALONE_BUNDLE_BYTES,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
  TOOLING_AUTHORIZATION_PATH,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { loadAndVerifyGitBlob } = require("./git-blob-authority");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_EXECUTABLE_AUTHORITY_V1";
const AUTH_REL = TOOLING_AUTHORIZATION_PATH;
const RECORD_KEY = "production_executable_authority";
const BLOCKED_UNPUBLISHED = "EXECUTABLE_AUTHORITY_REMAINS_UNPUBLISHED";
const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;

const BOOTSTRAP_REL =
  "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1";
const CEREMONY_REL =
  "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1";
const ENTRY_REL = "scripts/security/apply-ra-pro-accounting-automation-corrective.js";
const FRAME_REL = "scripts/security/ra-pro-accounting-automation-corrective-evidence.js";
const RECEIPT_REL =
  "scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js";

const RECORD_KEYS = Object.freeze([
  "status",
  "protocol",
  "executable_authorized",
  "authorized_executable_commit",
  "project_ref",
  "bundle",
  "bootstrap",
  "entry",
  "ceremony",
  "frame",
  "receipt",
  "evidence_pin_authority",
  "publication_role",
  "note",
]);

const ARTIFACT_MAP = Object.freeze({
  authorization_record: "publication_commit",
  sealed_runtime: "authorized_executable_commit",
});

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "executable_authority";
  return error;
}

function gitEnv(cwd) {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
  env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "ra-acct-corrective-exeauth-disposable";
  env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "ra-acct-corrective-exeauth-disposable@invalid";
  env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || "ra-acct-corrective-exeauth-disposable";
  env.GIT_COMMITTER_EMAIL = env.GIT_COMMITTER_EMAIL || "ra-acct-corrective-exeauth-disposable@invalid";
  return env;
}

function gitText(args, cwd) {
  return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
}

function canonicalUnpublishedExecutableAuthority() {
  return {
    status: "UNPUBLISHED",
    protocol: PROTOCOL,
    executable_authorized: false,
    authorized_executable_commit: null,
    project_ref: null,
    bundle: null,
    bootstrap: null,
    entry: null,
    ceremony: null,
    frame: null,
    receipt: null,
    evidence_pin_authority: null,
    publication_role: "later_descendant_commit",
    note:
      "Corrective executable authority is unpublished until a separate reviewed AUTH-only publication names the immutable executable tip. The publication commit SHA is not stored here. Dry-run authorization must bind that publication and cannot independently choose authorized_executable_commit.",
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
    if (/CORRECTIVE.*EXECUTABLE.*AUTH|EXECUTABLE_AUTHORITY/i.test(key) && env[key]) {
      throw blocked("EXECUTABLE_AUTHORITY_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
}

function resolvePublicationCommit(inputs, cwd) {
  if (inputs.publicationCommit != null) {
    const commit = String(inputs.publicationCommit || "").toLowerCase();
    if (!HEX40.test(commit)) {
      throw blocked("EXECUTABLE_AUTHORITY_REF_OVERRIDE_FORBIDDEN", "shape");
    }
    return commit;
  }
  return gitText(["rev-parse", "HEAD"], cwd).toLowerCase();
}

function assertNotCircularPin(publication, executable, blobText) {
  if (
    !HEX40.test(String(executable || "")) ||
    executable === publication ||
    String(blobText || "").includes(publication)
  ) {
    throw blocked("EXECUTABLE_AUTHORITY_CIRCULAR_TIP", "publication commit must not name itself");
  }
}

function priorIsUnpublished(prior) {
  if (prior == null) return true;
  if (typeof prior !== "object") return false;
  if (Object.keys(prior).length === 0) return true;
  return (
    prior.status === "UNPUBLISHED" &&
    prior.executable_authorized === false &&
    !prior.authorized_executable_commit
  );
}

function assertAllowlist(executable, publication, cwd) {
  if (!isAncestor(executable, publication, cwd) || executable === publication) {
    throw blocked("EXECUTABLE_AUTHORITY_ANCESTRY", "executable must be a strict ancestor");
  }
  const names = gitText(["diff", "--name-only", executable, publication], cwd)
    .split(/\n/)
    .filter(Boolean);
  if (names.length !== 1 || names[0] !== AUTH_REL) {
    throw blocked("EXECUTABLE_AUTHORITY_ALLOWLIST", names.join(",") || "empty");
  }
  const left = loadAuthFromGit(executable, cwd).auth;
  const right = loadAuthFromGit(publication, cwd).auth;
  if (!priorIsUnpublished(left[RECORD_KEY])) {
    throw blocked("EXECUTABLE_AUTHORITY_ALLOWLIST", "executable record is not unpublished");
  }
  left[RECORD_KEY] = null;
  right[RECORD_KEY] = null;
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw blocked("EXECUTABLE_AUTHORITY_ALLOWLIST", "non-authorization json changed");
  }
}

function requireSeal(seal, label) {
  if (
    !seal ||
    !HEX40.test(String(seal.oid || "")) ||
    !HEX64.test(String(seal.sha256 || "")) ||
    !Number.isInteger(seal.bytes)
  ) {
    throw blocked("EXECUTABLE_AUTHORITY_SEAL_MISSING", label);
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
    throw blocked("EXECUTABLE_AUTHORITY_EVIDENCE_AUTHORITY", "commit");
  }
  if (String(pin.auth_blob_oid || "").toLowerCase() !== EVIDENCE_PIN_AUTHORITY_AUTH_OID) {
    throw blocked("EXECUTABLE_AUTHORITY_EVIDENCE_AUTHORITY", "auth oid");
  }
  if (String(pin.auth_blob_sha256 || "").toLowerCase() !== EVIDENCE_PIN_AUTHORITY_AUTH_SHA256) {
    throw blocked("EXECUTABLE_AUTHORITY_EVIDENCE_AUTHORITY", "auth sha");
  }
  if (pin.auth_blob_bytes !== EVIDENCE_PIN_AUTHORITY_AUTH_BYTES) {
    throw blocked("EXECUTABLE_AUTHORITY_EVIDENCE_AUTHORITY", "auth bytes");
  }
}

function assertRecordSeals(record, executable, cwd) {
  if (record.project_ref !== EXPECTED_PROJECT_REF) {
    throw blocked("EXECUTABLE_AUTHORITY_SEAL_MISSING", "project");
  }
  assertEvidencePinBinding(record);
  const bundle = record.bundle || {};
  requireSeal(bundle, "bundle");
  if (bundle.path !== STANDALONE_BUNDLE_PATH) {
    throw blocked("EXECUTABLE_AUTHORITY_BUNDLE_MISMATCH", "path");
  }
  assertBlob(executable, STANDALONE_BUNDLE_PATH, bundle, cwd, "EXECUTABLE_AUTHORITY_BUNDLE_MISMATCH");

  const pairs = [
    ["bootstrap", BOOTSTRAP_REL],
    ["entry", ENTRY_REL],
    ["ceremony", CEREMONY_REL],
    ["frame", FRAME_REL],
    ["receipt", RECEIPT_REL],
  ];
  for (const [key, rel] of pairs) {
    const seal = record[key] || {};
    if (seal.path !== rel) throw blocked("EXECUTABLE_AUTHORITY_SEAL_MISSING", `${key} path`);
    assertBlob(executable, rel, seal, cwd, "EXECUTABLE_AUTHORITY_SEAL_MISSING");
  }
}

function describeExecutableAuthorityMap(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  assertNoAuthorizationEnv(inputs.env || {});
  const publication = resolvePublicationCommit(inputs, cwd);
  const { auth, loaded } = loadAuthFromGit(publication, cwd);
  if (inputs.auth && JSON.stringify(inputs.auth) !== JSON.stringify(auth)) {
    throw blocked("EXECUTABLE_AUTHORITY_WORKTREE_SUBSTITUTE", "auth object");
  }
  if (inputs.expectBlobOid) {
    const expectOid = String(inputs.expectBlobOid).toLowerCase();
    if (!HEX40.test(expectOid) || loaded.oid !== expectOid) {
      throw blocked("EXECUTABLE_AUTHORITY_PIN_MISMATCH", "blob oid");
    }
  }
  if (inputs.expectBlobSha256) {
    const expectSha = String(inputs.expectBlobSha256).toLowerCase();
    if (!HEX64.test(expectSha) || loaded.sha256 !== expectSha) {
      throw blocked("EXECUTABLE_AUTHORITY_PIN_MISMATCH", "blob sha");
    }
  }
  if (inputs.expectBlobBytes != null && loaded.bytes !== Number(inputs.expectBlobBytes)) {
    throw blocked("EXECUTABLE_AUTHORITY_PIN_MISMATCH", "blob bytes");
  }

  const record = auth[RECORD_KEY] || {};
  const base = {
    protocol: PROTOCOL,
    publication_commit: publication,
    authorization_publication_blob_oid: loaded.oid,
    authorization_publication_blob_sha256: loaded.sha256,
    authorization_publication_blob_bytes: loaded.bytes,
    authorized_executable_commit: null,
    bundle_oid: null,
    executable_authorized: false,
    artifact_map: ARTIFACT_MAP,
    blocked: null,
  };
  if (record.status !== "AUTHORIZED" || record.executable_authorized !== true) {
    return { ...base, blocked: BLOCKED_UNPUBLISHED };
  }
  const extraRecordKeys = Object.keys(record).filter((key) => !RECORD_KEYS.includes(key));
  if (extraRecordKeys.length) {
    throw blocked("EXECUTABLE_AUTHORITY_ALLOWLIST", `extra record field ${extraRecordKeys[0]}`);
  }
  for (const key of RECORD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      throw blocked("EXECUTABLE_AUTHORITY_SEAL_MISSING", key);
    }
  }
  const executable = String(record.authorized_executable_commit || "").toLowerCase();
  if (executable !== IMMUTABLE_CORRECTIVE_EXECUTABLE_COMMIT) {
    throw blocked(
      "EXECUTABLE_AUTHORITY_IMMUTABLE_MISMATCH",
      `authorized_executable_commit must be ${IMMUTABLE_CORRECTIVE_EXECUTABLE_COMMIT}`,
    );
  }
  assertNotCircularPin(publication, executable, loaded.buffer.toString("utf8"));
  assertAllowlist(executable, publication, cwd);
  assertRecordSeals(record, executable, cwd);
  return {
    ...base,
    authorized_executable_commit: executable,
    bundle_oid: record.bundle.oid,
    bundle_sha256: record.bundle.sha256,
    bundle_bytes: record.bundle.bytes,
    executable_authorized: true,
    blocked: null,
    evidence_pin_authority_commit: record.evidence_pin_authority.commit,
    seals: {
      bundle: record.bundle,
      bootstrap: record.bootstrap,
      entry: record.entry,
      ceremony: record.ceremony,
      frame: record.frame,
      receipt: record.receipt,
      evidence_pin_authority: record.evidence_pin_authority,
    },
  };
}

function assertExecutableAuthorityBeforeCredentials(inputs = {}) {
  const map = describeExecutableAuthorityMap(inputs);
  if (map.blocked || map.executable_authorized !== true) {
    throw blocked(map.blocked || BLOCKED_UNPUBLISHED, "executable unauthorized");
  }
  return map;
}

function expectedAuthorityFromMap(map) {
  return {
    authorized_executable_commit: map.authorized_executable_commit,
    authorization_publication_commit: map.publication_commit,
    authorization_publication_blob_oid: map.authorization_publication_blob_oid,
    authorization_publication_blob_sha256: map.authorization_publication_blob_sha256,
    authorization_publication_blob_bytes: map.authorization_publication_blob_bytes,
    bundle_oid: map.bundle_oid,
  };
}

function recheckExecutableAuthorityPin(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  const expectExecutable = String(inputs.expectExecutable || "").toLowerCase();
  const expectCommit = String(inputs.expectCommit || "").toLowerCase();
  const expectOid = String(inputs.expectBlobOid || "").toLowerCase();
  if (![expectExecutable, expectCommit, expectOid].every((value) => HEX40.test(value))) {
    throw blocked("EXECUTABLE_AUTHORITY_PIN_MISMATCH", "pin shape");
  }
  if (inputs.expectLiveRef != null && String(inputs.expectLiveRef).length) {
    const live = gitText(["rev-parse", String(inputs.expectLiveRef)], cwd).toLowerCase();
    if (live !== expectCommit) {
      throw blocked("EXECUTABLE_AUTHORITY_PIN_MISMATCH", "live ref swapped after preflight");
    }
  }
  const decision = describeExecutableAuthorityMap({
    cwd,
    publicationCommit: expectCommit,
    expectBlobOid: expectOid,
    expectBlobSha256: inputs.expectBlobSha256,
    expectBlobBytes: inputs.expectBlobBytes,
  });
  if (decision.blocked) throw blocked(decision.blocked, "recheck");
  if (
    decision.publication_commit !== expectCommit ||
    decision.authorization_publication_blob_oid !== expectOid ||
    decision.authorized_executable_commit !== expectExecutable
  ) {
    throw blocked("EXECUTABLE_AUTHORITY_PIN_MISMATCH", "map drift");
  }
  return decision;
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
    if (parts.length === 1) next.push(`100644 blob ${blob}\t${name}`);
    else {
      const emptyTree = mktree([], cwd);
      const child = replacePathInTree(emptyTree, parts.slice(1), blob, cwd);
      next.push(`040000 tree ${child}\t${name}`);
    }
  }
  return mktree(next, cwd);
}

function commitPublicationTree(cwd, parent, authObject) {
  const text = `${JSON.stringify(authObject, null, 2)}\n`;
  if (text.includes("\r")) throw blocked("EXECUTABLE_AUTHORITY_ALLOWLIST", "crlf");
  const blob = execFileSync("git", ["hash-object", "-w", "--stdin"], {
    cwd,
    env: gitEnv(cwd),
    input: text,
    encoding: "utf8",
  }).trim();
  const tree = gitText(["log", "-1", "--format=%T", parent], cwd);
  const newTree = replacePathInTree(tree, AUTH_REL.split("/"), blob, cwd);
  return execFileSync(
    "git",
    ["commit-tree", newTree, "-p", parent, "-m", "disposable corrective executable authority"],
    { cwd, env: gitEnv(cwd), encoding: "utf8" },
  ).trim();
}

function createDisposableExecutableAuthorityPublicationCommit(inputs = {}) {
  if (inputs.allowDisposableExecutableAuthorityPublicationCommit !== true) {
    throw blocked("DISPOSABLE_PUBLICATION_FORBIDDEN", "harness flag required");
  }
  if (inputs.testOnlyHarnessContext !== true) {
    throw blocked("HARNESS_CONTEXT_REQUIRED", "testOnlyHarnessContext required");
  }
  const cwd = inputs.cwd || process.cwd();
  const executable = String(
    inputs.executableCommit || IMMUTABLE_CORRECTIVE_EXECUTABLE_COMMIT,
  ).toLowerCase();
  if (executable !== IMMUTABLE_CORRECTIVE_EXECUTABLE_COMMIT) {
    throw blocked("EXECUTABLE_AUTHORITY_IMMUTABLE_MISMATCH", executable);
  }
  const { auth } = loadAuthFromGit(executable, cwd);
  if ((auth[RECORD_KEY] || {}).status === "AUTHORIZED") {
    throw blocked("EXECUTABLE_AUTHORITY_ALLOWLIST", "refusing to broaden an authorized record");
  }

  auth[RECORD_KEY] = {
    status: "AUTHORIZED",
    protocol: PROTOCOL,
    executable_authorized: true,
    authorized_executable_commit: executable,
    project_ref: auth.project_ref || EXPECTED_PROJECT_REF,
    bundle: {
      path: STANDALONE_BUNDLE_PATH,
      oid: (auth.standalone_bundle && auth.standalone_bundle.oid) || STANDALONE_BUNDLE_OID,
      sha256: (auth.standalone_bundle && auth.standalone_bundle.sha256) || STANDALONE_BUNDLE_SHA256,
      bytes: (auth.standalone_bundle && auth.standalone_bundle.bytes) || STANDALONE_BUNDLE_BYTES,
    },
    bootstrap: sealAtCommit(executable, BOOTSTRAP_REL, cwd),
    entry: sealAtCommit(executable, ENTRY_REL, cwd),
    ceremony: sealAtCommit(executable, CEREMONY_REL, cwd),
    frame: sealAtCommit(executable, FRAME_REL, cwd),
    receipt: sealAtCommit(executable, RECEIPT_REL, cwd),
    evidence_pin_authority: {
      commit: EVIDENCE_PIN_AUTHORITY_COMMIT,
      auth_path: AUTH_REL,
      auth_blob_oid: EVIDENCE_PIN_AUTHORITY_AUTH_OID,
      auth_blob_sha256: EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
      auth_blob_bytes: EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
    },
    publication_role: "later_descendant_commit",
    note:
      "Disposable corrective executable-authority publication for harness only. Publication SHA is not stored here.",
  };

  const before = gitText(["rev-parse", "HEAD"], cwd);
  const publication = commitPublicationTree(cwd, executable, auth);
  const after = gitText(["rev-parse", "HEAD"], cwd);
  if (before !== after) throw blocked("EXECUTABLE_AUTHORITY_ALLOWLIST", "HEAD moved");
  if (JSON.stringify(auth).includes(publication)) {
    throw blocked("EXECUTABLE_AUTHORITY_CIRCULAR_TIP", "publication embedded");
  }
  return {
    publicationCommit: publication,
    executableCommit: executable,
    authorization_publication_blob_oid: gitText(["rev-parse", `${publication}:${AUTH_REL}`], cwd),
    headUnchanged: true,
  };
}

module.exports = {
  ARTIFACT_MAP,
  AUTH_REL,
  BLOCKED_UNPUBLISHED,
  BOOTSTRAP_REL,
  CEREMONY_REL,
  ENTRY_REL,
  FRAME_REL,
  IMMUTABLE_EXECUTABLE_COMMIT: IMMUTABLE_CORRECTIVE_EXECUTABLE_COMMIT,
  PROTOCOL,
  RECEIPT_REL,
  RECORD_KEY,
  RECORD_KEYS,
  assertExecutableAuthorityBeforeCredentials,
  canonicalUnpublishedExecutableAuthority,
  createDisposableExecutableAuthorityPublicationCommit,
  describeExecutableAuthorityMap,
  expectedAuthorityFromMap,
  loadAuthFromGit,
  recheckExecutableAuthorityPin,
};
