"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Non-circular corrective evidence-collection authorization.
 *
 * Executable tip (this tip): production_collection_authorization is UNPUBLISHED.
 * A later strict-descendant publication commit may change ONLY that AUTH object and
 * name authorized_executable_commit as the already-known immutable executable tip.
 * The publication commit SHA is never stored inside the AUTH blob.
 *
 * Authority loads via git cat-file only. Worktree / env / path overrides are rejected.
 * Collection remains blocked before any production contact while unpublished.
 */
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  EXPECTED_PROJECT_REF,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_SHA256,
  STANDALONE_BUNDLE_BYTES,
  TOOLING_AUTHORIZATION_PATH,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { loadAndVerifyGitBlob } = require("./git-blob-authority");

const PROTOCOL = "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_EVIDENCE_COLLECTION_AUTHORIZATION_V1";
const AUTH_REL = TOOLING_AUTHORIZATION_PATH;
const RECORD_KEY = "production_collection_authorization";
const BLOCKED_UNPUBLISHED = "COLLECTION_REMAINS_BLOCKED_BEFORE_PRODUCTION_CONTACT";
const HEX40 = /^[0-9a-f]{40}$/;
const HEX64 = /^[0-9a-f]{64}$/;

/** Rejected / stale tip — historical negative tests only. Never authorize. */
const REJECTED_STALE_COLLECTION_TIP_DBDCE968 =
  "dbdce9680fa996aab4e952567562e0ab7fb9d237";

const PRECONDITION_CONTRACT_REL =
  "docs/security/ra-pro-accounting-automation-corrective-apply/PRECONDITION_EVIDENCE_CONTRACT.json";
const PRE_APPLY_CONTRACT_REL =
  "docs/security/ra-pro-accounting-automation-corrective-apply/PRE_APPLY_LIVE_EVIDENCE_CONTRACT.json";
const SCHEMA_REL =
  "scripts/security/ra-pro-accounting-automation-corrective-evidence-schema.js";
const PRECONDITION_GATES_REL =
  "scripts/security/ra-pro-accounting-automation-corrective-precondition-gates.js";
const PRE_APPLY_GATES_REL =
  "scripts/security/ra-pro-accounting-automation-corrective-pre-apply-gates.js";
const COLLECTOR_REL =
  "scripts/security/ra-pro-accounting-automation-corrective-evidence-collector.js";

const RECORD_KEYS = Object.freeze([
  "status",
  "protocol",
  "collection_authorized",
  "authorized_executable_commit",
  "project_ref",
  "bundle",
  "precondition_evidence_contract",
  "pre_apply_live_evidence_contract",
  "schema",
  "precondition_gates",
  "pre_apply_gates",
  "collector",
  "publication_role",
  "note",
]);

const ARTIFACT_MAP = Object.freeze({
  authorization_record: "publication_commit",
  contracts_schema_gates_collector_bundle: "authorized_executable_commit",
});

function blocked(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  error.phase = "collection_authorization";
  return error;
}

function gitEnv(cwd) {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = path.resolve(cwd).replace(/\\/g, "/");
  env.GIT_AUTHOR_NAME = env.GIT_AUTHOR_NAME || "ra-acct-corrective-collection-disposable";
  env.GIT_AUTHOR_EMAIL = env.GIT_AUTHOR_EMAIL || "ra-acct-corrective-collection-disposable@invalid";
  env.GIT_COMMITTER_NAME = env.GIT_COMMITTER_NAME || "ra-acct-corrective-collection-disposable";
  env.GIT_COMMITTER_EMAIL = env.GIT_COMMITTER_EMAIL || "ra-acct-corrective-collection-disposable@invalid";
  return env;
}

function gitText(args, cwd) {
  return execFileSync("git", args, { cwd, env: gitEnv(cwd), encoding: "utf8" }).trim();
}

function canonicalUnpublishedCollectionAuthorization() {
  return {
    status: "UNPUBLISHED",
    protocol: PROTOCOL,
    collection_authorized: false,
    authorized_executable_commit: null,
    project_ref: null,
    bundle: null,
    precondition_evidence_contract: null,
    pre_apply_live_evidence_contract: null,
    schema: null,
    precondition_gates: null,
    pre_apply_gates: null,
    collector: null,
    publication_role: "later_descendant_commit",
    note:
      "Corrective evidence-collection authorization is unpublished until a separate reviewed one-object publication names authorized_executable_commit. The publication commit SHA is not stored here. dbdce968 is rejected/stale and must never authorize collection.",
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
    if (/CORRECTIVE.*COLLECTION.*AUTH|COLLECTION_AUTHORIZATION/i.test(key) && env[key]) {
      throw blocked("COLLECTION_AUTHORIZATION_ENV_OVERRIDE_FORBIDDEN", key);
    }
  }
}

function resolvePublicationCommit(inputs, cwd) {
  if (inputs.publicationCommit != null) {
    const commit = String(inputs.publicationCommit || "").toLowerCase();
    if (!HEX40.test(commit)) throw blocked("COLLECTION_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN", "shape");
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
    throw blocked("COLLECTION_AUTHORIZATION_CIRCULAR_TIP", "publication commit must not name itself");
  }
  if (String(executable) === REJECTED_STALE_COLLECTION_TIP_DBDCE968) {
    throw blocked("COLLECTION_AUTHORIZATION_REJECTED_STALE_TIP", REJECTED_STALE_COLLECTION_TIP_DBDCE968);
  }
  if (String(blobText || "").includes(REJECTED_STALE_COLLECTION_TIP_DBDCE968)) {
    throw blocked("COLLECTION_AUTHORIZATION_REJECTED_STALE_TIP", "dbdce968 in auth blob");
  }
}

function assertAllowlist(executable, publication, cwd) {
  if (!isAncestor(executable, publication, cwd) || executable === publication) {
    throw blocked("COLLECTION_AUTHORIZATION_ANCESTRY", "executable must be a strict ancestor");
  }
  const names = gitText(["diff", "--name-only", executable, publication], cwd)
    .split(/\n/)
    .filter(Boolean);
  if (names.length !== 1 || names[0] !== AUTH_REL) {
    throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", names.join(",") || "empty");
  }
  const left = loadAuthFromGit(executable, cwd).auth;
  const right = loadAuthFromGit(publication, cwd).auth;
  const prior = left[RECORD_KEY] || {};
  if (
    prior.status !== "UNPUBLISHED" ||
    prior.collection_authorized !== false ||
    prior.authorized_executable_commit
  ) {
    throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "executable record is not unpublished");
  }
  left[RECORD_KEY] = null;
  right[RECORD_KEY] = null;
  if (JSON.stringify(left) !== JSON.stringify(right)) {
    throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "non-authorization json changed");
  }
}

function requireSeal(seal, label) {
  if (
    !seal ||
    !HEX40.test(String(seal.oid || "")) ||
    !HEX64.test(String(seal.sha256 || "")) ||
    !Number.isInteger(seal.bytes)
  ) {
    throw blocked("COLLECTION_AUTHORIZATION_SEAL_MISSING", label);
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
  if (record.project_ref !== EXPECTED_PROJECT_REF) {
    throw blocked("COLLECTION_AUTHORIZATION_SEAL_MISSING", "project");
  }
  const bundle = record.bundle || {};
  requireSeal(bundle, "bundle");
  if (bundle.path !== STANDALONE_BUNDLE_PATH) {
    throw blocked("COLLECTION_AUTHORIZATION_BUNDLE_MISMATCH", "path");
  }
  // Collection seals bind the authorized executable tip blob only. Tip HEAD
  // standalone constants may reseal later (evidence-pin / gate embed); never
  // require them to equal the historical collection-authorization bundle.
  assertBlob(executable, STANDALONE_BUNDLE_PATH, bundle, cwd, "COLLECTION_AUTHORIZATION_BUNDLE_MISMATCH");

  const pairs = [
    ["precondition_evidence_contract", PRECONDITION_CONTRACT_REL],
    ["pre_apply_live_evidence_contract", PRE_APPLY_CONTRACT_REL],
    ["schema", SCHEMA_REL],
    ["precondition_gates", PRECONDITION_GATES_REL],
    ["pre_apply_gates", PRE_APPLY_GATES_REL],
    ["collector", COLLECTOR_REL],
  ];
  for (const [key, rel] of pairs) {
    const seal = record[key] || {};
    if (seal.path !== rel) throw blocked("COLLECTION_AUTHORIZATION_SEAL_MISSING", key + " path");
    assertBlob(executable, rel, seal, cwd, "COLLECTION_AUTHORIZATION_SEAL_MISSING");
  }
}

function describeCollectionArtifactMap(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  assertNoAuthorizationEnv(inputs.env || {});
  const publication = resolvePublicationCommit(inputs, cwd);
  const { auth, loaded } = loadAuthFromGit(publication, cwd);
  if (inputs.auth && JSON.stringify(inputs.auth) !== JSON.stringify(auth)) {
    throw blocked("COLLECTION_AUTHORIZATION_WORKTREE_SUBSTITUTE", "auth object");
  }
  const record = auth[RECORD_KEY] || {};
  const base = {
    protocol: PROTOCOL,
    publication_commit: publication,
    authorization_publication_blob_oid: loaded.oid,
    authorized_executable_commit: null,
    bundle_oid: null,
    collection_authorized: false,
    artifact_map: ARTIFACT_MAP,
    blocked: null,
  };
  if (record.status !== "AUTHORIZED" || record.collection_authorized !== true) {
    return { ...base, blocked: BLOCKED_UNPUBLISHED };
  }
  const extraRecordKeys = Object.keys(record).filter((key) => !RECORD_KEYS.includes(key));
  if (extraRecordKeys.length) {
    throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", `extra record field ${extraRecordKeys[0]}`);
  }
  for (const key of RECORD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      throw blocked("COLLECTION_AUTHORIZATION_SEAL_MISSING", key);
    }
  }
  const executable = String(record.authorized_executable_commit || "").toLowerCase();
  assertNotCircularPin(publication, executable, loaded.buffer.toString("utf8"));
  assertAllowlist(executable, publication, cwd);
  assertRecordSeals(record, executable, cwd);
  return {
    ...base,
    authorized_executable_commit: executable,
    bundle_oid: record.bundle.oid,
    bundle_sha256: record.bundle.sha256,
    bundle_bytes: record.bundle.bytes,
    collection_authorized: true,
    blocked: null,
    seals: {
      precondition_evidence_contract: record.precondition_evidence_contract,
      pre_apply_live_evidence_contract: record.pre_apply_live_evidence_contract,
      schema: record.schema,
      precondition_gates: record.precondition_gates,
      pre_apply_gates: record.pre_apply_gates,
      collector: record.collector,
      bundle: record.bundle,
    },
  };
}

function preflightCollectionAuthorization(inputs = {}) {
  try {
    return describeCollectionArtifactMap(inputs);
  } catch (err) {
    return {
      blocked: err.code || "COLLECTION_AUTHORIZATION_PREFLIGHT_FAILED",
      collection_authorized: false,
      publication_commit: inputs.publicationCommit || null,
      authorization_publication_blob_oid: null,
      authorized_executable_commit: null,
    };
  }
}

function recheckCollectionAuthorizationPin(inputs = {}) {
  const cwd = inputs.cwd || process.cwd();
  const expectExecutable = String(inputs.expectExecutable || "").toLowerCase();
  const expectCommit = String(inputs.expectCommit || "").toLowerCase();
  const expectOid = String(inputs.expectBlobOid || "").toLowerCase();
  const expectBundle = String(inputs.expectBundleOid || "").toLowerCase();
  if (![expectExecutable, expectCommit, expectOid, expectBundle].every((value) => HEX40.test(value))) {
    throw blocked("COLLECTION_AUTHORIZATION_PIN_MISMATCH", "pin shape");
  }
  const head = gitText(["rev-parse", "HEAD"], cwd).toLowerCase();
  if (head !== expectCommit) {
    throw blocked("COLLECTION_AUTHORIZATION_PIN_MISMATCH", "HEAD changed after preflight");
  }
  if (!isAncestor(expectExecutable, head, cwd) || expectExecutable === head) {
    throw blocked("COLLECTION_AUTHORIZATION_ANCESTRY", "executable moved after preflight");
  }
  const bundleAtExecutable = gitText(
    ["rev-parse", `${expectExecutable}:${STANDALONE_BUNDLE_PATH}`],
    cwd,
  ).toLowerCase();
  let bundleAtHead = "";
  try {
    bundleAtHead = gitText(["rev-parse", `${head}:${STANDALONE_BUNDLE_PATH}`], cwd).toLowerCase();
  } catch (err) {
    throw blocked(
      "COLLECTION_AUTHORIZATION_BUNDLE_MISMATCH",
      err && err.message ? err.message : "publication bundle",
    );
  }
  if (bundleAtExecutable !== expectBundle || bundleAtHead !== expectBundle) {
    throw blocked("COLLECTION_AUTHORIZATION_BUNDLE_MISMATCH", "bundle moved after preflight");
  }
  const { loaded } = loadAuthFromGit(head, cwd);
  if (loaded.oid !== expectOid) {
    throw blocked("COLLECTION_AUTHORIZATION_PIN_MISMATCH", "authorization blob changed");
  }
  const decision = describeCollectionArtifactMap({ cwd, publicationCommit: head });
  if (decision.blocked) throw blocked(decision.blocked, "recheck");
  if (
    decision.publication_commit !== expectCommit ||
    decision.authorization_publication_blob_oid !== expectOid ||
    decision.authorized_executable_commit !== expectExecutable ||
    decision.bundle_oid !== expectBundle
  ) {
    throw blocked("COLLECTION_AUTHORIZATION_PIN_MISMATCH", "map drift");
  }
  return decision;
}

/**
 * Fail-closed gate before env listing, credentials, DB, observation, or emit.
 */
function assertCollectionAuthorityBeforeObservation(inputs = {}) {
  const map = describeCollectionArtifactMap(inputs);
  if (map.blocked || map.collection_authorized !== true) {
    throw blocked(map.blocked || BLOCKED_UNPUBLISHED, "collection unauthorized");
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
  if (text.includes("\r")) throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "crlf");
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
    ["commit-tree", newTree, "-p", parent, "-m", "disposable corrective collection authorization"],
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
 * Tests ONLY. Builds a disposable AUTHORIZED one-object publication commit.
 * Requires inputs.allowDisposablePublicationCommit === true.
 */
function createDisposableCollectionPublicationCommit(inputs = {}) {
  if (inputs.allowDisposablePublicationCommit !== true) {
    throw blocked("DISPOSABLE_PUBLICATION_FORBIDDEN", "harness flag required");
  }
  const cwd = inputs.cwd || process.cwd();
  const executable = String(inputs.executableCommit || gitText(["rev-parse", "HEAD"], cwd)).toLowerCase();
  if (!HEX40.test(executable)) throw blocked("COLLECTION_AUTHORIZATION_ANCESTRY", "executable");
  if (executable === REJECTED_STALE_COLLECTION_TIP_DBDCE968) {
    throw blocked("COLLECTION_AUTHORIZATION_REJECTED_STALE_TIP", executable);
  }

  const { auth } = loadAuthFromGit(executable, cwd);
  if ((auth[RECORD_KEY] || {}).status === "AUTHORIZED") {
    throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "refusing to broaden an authorized record");
  }

  auth[RECORD_KEY] = {
    status: "AUTHORIZED",
    protocol: PROTOCOL,
    collection_authorized: true,
    authorized_executable_commit: executable,
    project_ref: auth.project_ref || EXPECTED_PROJECT_REF,
    bundle: {
      path: STANDALONE_BUNDLE_PATH,
      oid: (auth.standalone_bundle && auth.standalone_bundle.oid) || STANDALONE_BUNDLE_OID,
      sha256: (auth.standalone_bundle && auth.standalone_bundle.sha256) || STANDALONE_BUNDLE_SHA256,
      bytes: (auth.standalone_bundle && auth.standalone_bundle.bytes) || STANDALONE_BUNDLE_BYTES,
    },
    precondition_evidence_contract: sealAtCommit(executable, PRECONDITION_CONTRACT_REL, cwd),
    pre_apply_live_evidence_contract: sealAtCommit(executable, PRE_APPLY_CONTRACT_REL, cwd),
    schema: sealAtCommit(executable, SCHEMA_REL, cwd),
    precondition_gates: sealAtCommit(executable, PRECONDITION_GATES_REL, cwd),
    pre_apply_gates: sealAtCommit(executable, PRE_APPLY_GATES_REL, cwd),
    collector: sealAtCommit(executable, COLLECTOR_REL, cwd),
    publication_role: "later_descendant_commit",
    note:
      "Disposable corrective collection publication for harness only. Publication SHA is not stored here.",
  };

  const before = gitText(["rev-parse", "HEAD"], cwd);
  const publication = commitPublicationTree(cwd, executable, auth);
  const after = gitText(["rev-parse", "HEAD"], cwd);
  if (before !== after) throw blocked("COLLECTION_AUTHORIZATION_ALLOWLIST", "HEAD moved");
  if (JSON.stringify(auth).includes(publication)) {
    throw blocked("COLLECTION_AUTHORIZATION_CIRCULAR_TIP", "publication embedded");
  }
  return {
    publicationCommit: publication,
    executableCommit: executable,
    authorization_publication_blob_oid: gitText(["rev-parse", `${publication}:${AUTH_REL}`], cwd),
    headUnchanged: true,
  };
}

function expectedAuthorityFromMap(map) {
  if (!map || map.blocked || map.collection_authorized !== true) {
    throw blocked(BLOCKED_UNPUBLISHED, "expected authority unavailable");
  }
  return {
    authorized_executable_commit: map.authorized_executable_commit,
    authorization_publication_commit: map.publication_commit,
    authorization_publication_blob_oid: map.authorization_publication_blob_oid,
  };
}

module.exports = {
  ARTIFACT_MAP,
  AUTH_REL,
  BLOCKED_UNPUBLISHED,
  COLLECTOR_REL,
  PRECONDITION_CONTRACT_REL,
  PRE_APPLY_CONTRACT_REL,
  PROTOCOL,
  RECORD_KEY,
  RECORD_KEYS,
  REJECTED_STALE_COLLECTION_TIP_DBDCE968,
  SCHEMA_REL,
  assertCollectionAuthorityBeforeObservation,
  assertNotCircularPin,
  canonicalUnpublishedCollectionAuthorization,
  createDisposableCollectionPublicationCommit,
  describeCollectionArtifactMap,
  expectedAuthorityFromMap,
  loadAuthFromGit,
  preflightCollectionAuthorization,
  recheckCollectionAuthorizationPin,
};
