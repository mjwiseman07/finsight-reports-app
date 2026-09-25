/**
 * Corrective dry-run execution authorization — non-circular one-attempt publication.
 * Dry-run must bind a validated production_executable_authority map; it may not
 * independently choose authorized_executable_commit.
 */
import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVIDENCE_PIN_AUTHORITY_COMMIT,
  TOOLING_AUTHORIZATION_PATH,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js";
import {
  BLOCKED_UNPUBLISHED,
  DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED,
  PROTOCOL,
  createDisposableDryRunPublicationCommit,
  describeDryRunArtifactMap,
  loadAuthFromGit,
  recheckDryRunAuthorizationPin,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js";
import {
  assertExecutableAuthorityBeforeCredentials,
  createDisposableExecutableAuthorityPublicationCommit,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-executable-authority.js";
import {
  assertCorrectiveApplyAuthorized,
  resolveExecutableCommit,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js";
import { runDryRun } from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-core.js";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS harness helper
const { resolveCorrectiveCleanExecutable } = require("./ra-pro-accounting-automation-corrective-clean-executable-harness.js");

const ROOT = process.cwd();
/** Clean remedial executable generation — future publication parent. */
const IMMUTABLE_EXECUTABLE = resolveCorrectiveCleanExecutable(ROOT);
const HISTORICAL_REJECTED = "9f31c3552a2a06fc3b851bd722aad9311dde40f8";
/** Rejected notes-only review tip — never authorized_executable_commit / never baseline. */
const REJECTED_NOTES_TIP = "98dfe61ee521a5177bfbda42be3e5ee0e6b6b082";
/**
 * Clean review tip: AUTH restored to executable identity; full tree equals executable.
 * Tests-only descendants may exist after this tip; they are not the publication baseline.
 */
const CLEAN_REVIEW_TIP = "b287fd85defa04b3c7895e2d1397d5cc69a33a04";
const AUTH_REL = TOOLING_AUTHORIZATION_PATH;

function git(args: string[], input?: string) {
  const r = spawnSync("git", ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    input,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout || args.join(" ")));
  return (r.stdout || "").trim();
}

function gitBuf(args: string[]) {
  const r = spawnSync("git", ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, ...args], {
    cwd: ROOT,
    windowsHide: true,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout || args.join(" ")));
  return r.stdout as Buffer;
}

function expectCode(fn: () => unknown, re: RegExp) {
  try {
    fn();
    throw new Error("expected throw");
  } catch (err) {
    const code = String((err as { code?: string }).code || (err as Error).message || err);
    expect(code).toMatch(re);
  }
}

function attemptFor(tip: string) {
  return `corr-dryrun-${tip.slice(0, 12)}-${randomBytes(16).toString("hex")}`;
}

function mktree(lines: string[]) {
  const input = lines.length ? `${lines.join("\n")}\n` : "";
  return git(["mktree"], input);
}

function replacePathInTree(tree: string, parts: string[], blob: string): string {
  const lines = git(["ls-tree", tree]).split(/\n/).filter(Boolean);
  const name = parts[0];
  let found = false;
  const next = lines.map((line) => {
    const tab = line.indexOf("\t");
    if (line.slice(tab + 1) !== name) return line;
    found = true;
    if (parts.length === 1) return `100644 blob ${blob}\t${name}`;
    const old = line.slice(0, tab).split(" ")[2];
    const child = replacePathInTree(old, parts.slice(1), blob);
    return `040000 tree ${child}\t${name}`;
  });
  if (!found) {
    if (parts.length === 1) next.push(`100644 blob ${blob}\t${name}`);
    else {
      const empty = mktree([]);
      const child = replacePathInTree(empty, parts.slice(1), blob);
      next.push(`040000 tree ${child}\t${name}`);
    }
  }
  return mktree(next);
}

/** Harness-only: AUTH-only publication whose parent is an explicit tip (e.g. clean review tip). */
function commitAuthOnlyFromParent(parent: string, authObject: object) {
  const text = `${JSON.stringify(authObject, null, 2)}\n`;
  expect(text.includes("\r")).toBe(false);
  const blob = git(["hash-object", "-w", "--stdin"], text);
  const tree = git(["rev-parse", `${parent}^{tree}`]);
  const newTree = replacePathInTree(tree, AUTH_REL.split("/"), blob);
  return git(
    ["commit-tree", newTree, "-p", parent, "-m", "disposable corrective dry-run authorization"],
  );
}

function makeExeAuth() {
  const created = createDisposableExecutableAuthorityPublicationCommit({
    cwd: ROOT,
    executableCommit: IMMUTABLE_EXECUTABLE,
    allowDisposableExecutableAuthorityPublicationCommit: true,
    testOnlyHarnessContext: true,
  });
  const map = assertExecutableAuthorityBeforeCredentials({
    cwd: ROOT,
    publicationCommit: created.publicationCommit,
    expectBlobOid: created.authorization_publication_blob_oid,
    expectedExecutableCommit: IMMUTABLE_EXECUTABLE,
    testOnlyHarnessContext: true,
    allowInProcessExpectedExecutable: true,
  });
  return { created, map };
}

function sealBootstrap(commit: string) {
  const rel =
    "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1";
  const buf = gitBuf(["cat-file", "blob", `${commit}:${rel}`]);
  return {
    path: rel,
    oid: git(["rev-parse", `${commit}:${rel}`]),
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
    line_endings: "LF",
  };
}

function sealCeremony(commit: string) {
  const rel =
    "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1";
  const buf = gitBuf(["cat-file", "blob", `${commit}:${rel}`]);
  return {
    path: rel,
    oid: git(["rev-parse", `${commit}:${rel}`]),
    sha256: createHash("sha256").update(buf).digest("hex"),
    bytes: buf.length,
    line_endings: "LF",
  };
}

function buildAuthorizedDryRunRecord(
  auth: Record<string, unknown> & {
    project_ref?: unknown;
    standalone_bundle?: unknown;
    evidence_pin_authority?: unknown;
    precondition_publication?: {
      evidence_path?: string;
      evidence_source_commit?: string;
      evidence_blob_oid?: string;
      evidence_sha256?: string;
      evidence_bytes?: number;
    };
    pre_apply_live_publication?: {
      evidence_path?: string;
      evidence_source_commit?: string;
      evidence_blob_oid?: string;
      evidence_sha256?: string;
      evidence_bytes?: number;
    };
  },
  attempt: string,
  exe: ReturnType<typeof makeExeAuth>,
  executableCommit = IMMUTABLE_EXECUTABLE,
) {
  return {
    status: "AUTHORIZED",
    protocol: PROTOCOL,
    dry_run_authorized: true,
    authorized_executable_commit: executableCommit,
    attempt_id: attempt,
    project_ref: auth.project_ref,
    bundle: auth.standalone_bundle,
    bootstrap: sealBootstrap(IMMUTABLE_EXECUTABLE),
    ceremony: sealCeremony(IMMUTABLE_EXECUTABLE),
    evidence_pin_authority: auth.evidence_pin_authority,
    precondition_evidence: {
      path: auth.precondition_publication.evidence_path,
      source_commit: auth.precondition_publication.evidence_source_commit,
      oid: auth.precondition_publication.evidence_blob_oid,
      sha256: auth.precondition_publication.evidence_sha256,
      bytes: auth.precondition_publication.evidence_bytes,
    },
    pre_apply_live_evidence: {
      path: auth.pre_apply_live_publication.evidence_path,
      source_commit: auth.pre_apply_live_publication.evidence_source_commit,
      oid: auth.pre_apply_live_publication.evidence_blob_oid,
      sha256: auth.pre_apply_live_publication.evidence_sha256,
      bytes: auth.pre_apply_live_publication.evidence_bytes,
    },
    executable_authority_publication_commit: exe.created.publicationCommit,
    executable_authority_publication_blob_oid: exe.created.authorization_publication_blob_oid,
    publication_role: "later_descendant_commit",
    note: "manual craft",
  };
}

describe("corrective dry-run execution authorization", () => {
  it("protocol id is the one-attempt dry-run authorization v1", () => {
    expect(PROTOCOL).toBe(
      "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_ONE_ATTEMPT_DRY_RUN_AUTHORIZATION_V1",
    );
  });

  it("dry-run without executable authority fails closed", () => {
    const tip = git(["rev-parse", "HEAD"]);
    expectCode(
      () => describeDryRunArtifactMap({ cwd: ROOT, publicationCommit: tip }),
      /DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED/,
    );
  });

  it("unpublished tip blocks before credentials once exe-auth is bound", () => {
    const exe = makeExeAuth();
    const tip = git(["rev-parse", "HEAD"]);
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: tip,
      executableAuthorityMap: exe.map,
    });
    expect(map.blocked).toBe(BLOCKED_UNPUBLISHED);
    expect(map.dry_run_authorized).toBe(false);
  });

  it("rejects arbitrary --executable-commit alone", () => {
    expectCode(
      () => resolveExecutableCommit({ executableCommit: IMMUTABLE_EXECUTABLE }),
      /DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED/,
    );
  });

  it("CLI-equivalent dry-run without publication pin fails closed", async () => {
    const result = await runDryRun({
      executableCommit: IMMUTABLE_EXECUTABLE,
      cwd: ROOT,
      env: {},
      argv: ["node"],
    });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(result.error_code).toBe("DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED");
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
  });

  it("dry-run authorization cannot satisfy apply authorization", () => {
    expectCode(
      () =>
        assertCorrectiveApplyAuthorized({
          cwd: ROOT,
          executableCommit: IMMUTABLE_EXECUTABLE,
          dryRunAuthorizationMap: {
            authorized_executable_commit: IMMUTABLE_EXECUTABLE,
            dry_run_authorized: true,
          },
        }),
      /APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS/,
    );
  });

  it("production argv/env cannot enable disposable dry-run harness", () => {
    const exe = makeExeAuth();
    expectCode(
      () =>
        createDisposableDryRunPublicationCommit({
          cwd: ROOT,
          executableAuthorityMap: exe.map,
          executableCommit: IMMUTABLE_EXECUTABLE,
          attemptId: attemptFor(IMMUTABLE_EXECUTABLE),
          allowDisposableDryRunPublicationCommit: true,
        }),
      /HARNESS_CONTEXT_REQUIRED/,
    );
  });

  it("clean executable AUTH triad remains UNPUBLISHED", () => {
    const auth = loadAuthFromGit(IMMUTABLE_EXECUTABLE, ROOT).auth;
    expect(auth.production_executable_authority.status).toBe("UNPUBLISHED");
    expect(auth.production_dry_run_authorization.status).toBe("UNPUBLISHED");
    expect(auth.production_apply_authorization.status).toBe("UNPUBLISHED");
    expect(IMMUTABLE_EXECUTABLE).not.toBe(HISTORICAL_REJECTED);
  });

  it("historical 9f31 tip is rejected as executable for remediated protocol", () => {
    expectCode(
      () =>
        createDisposableExecutableAuthorityPublicationCommit({
          cwd: ROOT,
          executableCommit: HISTORICAL_REJECTED,
          allowDisposableExecutableAuthorityPublicationCommit: true,
          testOnlyHarnessContext: true,
        }),
      /EXECUTABLE_AUTHORITY_HISTORICAL_REJECTED/,
    );
  });

  it("accepts AUTH-only publication descended from clean executable naming itself", () => {
    const exe = makeExeAuth();
    const cleanTip = IMMUTABLE_EXECUTABLE;
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    // Re-parent style: build the same AUTH object as another AUTH-only child of the clean executable.
    const { auth } = loadAuthFromGit(created.publicationCommit, ROOT);
    const fromClean = commitAuthOnlyFromParent(cleanTip, auth);
    expect(git(["merge-base", "--is-ancestor", cleanTip, fromClean])).toBe("");
    expect(git(["merge-base", "--is-ancestor", IMMUTABLE_EXECUTABLE, fromClean])).toBe("");
    expect(git(["diff", "--name-only", IMMUTABLE_EXECUTABLE, fromClean])).toBe(AUTH_REL);

    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: fromClean,
      executableAuthorityMap: exe.map,
    });
    expect(map.blocked).toBeNull();
    expect(map.dry_run_authorized).toBe(true);
    expect(map.authorized_executable_commit).toBe(IMMUTABLE_EXECUTABLE);
    expect(map.authorized_executable_commit).not.toBe(REJECTED_NOTES_TIP);
    expect(map.authorized_executable_commit).not.toBe(HISTORICAL_REJECTED);
    expect(map.attempt_id).toBe(attempt);
    expect(map.evidence_pin_authority_commit).toBe(EVIDENCE_PIN_AUTHORITY_COMMIT);
    expect(map.executable_authority_publication_commit).toBe(exe.created.publicationCommit);

    const left = loadAuthFromGit(IMMUTABLE_EXECUTABLE, ROOT).auth;
    const right = loadAuthFromGit(fromClean, ROOT).auth;
    left.production_dry_run_authorization = null;
    right.production_dry_run_authorization = null;
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
  });

  it("rejects publication based on rejected-note JSON against executable baseline", () => {
    const exe = makeExeAuth();
    const rejectedAuth = loadAuthFromGit(REJECTED_NOTES_TIP, ROOT).auth;
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    rejectedAuth.production_dry_run_authorization = buildAuthorizedDryRunRecord(
      rejectedAuth,
      attempt,
      exe,
    );
    rejectedAuth.production_dry_run_authorization.note = "poisoned notes baseline";
    const poisoned = commitAuthOnlyFromParent(IMMUTABLE_EXECUTABLE, rejectedAuth);
    expectCode(
      () =>
        describeDryRunArtifactMap({
          cwd: ROOT,
          publicationCommit: poisoned,
          executableAuthorityMap: exe.map,
        }),
      /DRY_RUN_AUTHORIZATION_ALLOWLIST/,
    );
  });

  it("rejects top-level notes drift and other non-authorization JSON changes", () => {
    const exe = makeExeAuth();
    const { auth } = loadAuthFromGit(IMMUTABLE_EXECUTABLE, ROOT);
    auth.notes = [...(auth.notes || []), "extraneous note drift"];
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    auth.production_dry_run_authorization = buildAuthorizedDryRunRecord(auth, attempt, exe);
    auth.production_dry_run_authorization.note = "notes drift";
    const drifted = commitAuthOnlyFromParent(IMMUTABLE_EXECUTABLE, auth);
    expectCode(
      () =>
        describeDryRunArtifactMap({
          cwd: ROOT,
          publicationCommit: drifted,
          executableAuthorityMap: exe.map,
        }),
      /DRY_RUN_AUTHORIZATION_ALLOWLIST/,
    );
  });

  it("rejects rejected notes tip as authorized_executable_commit via allowlist", () => {
    const exe = makeExeAuth();
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const good = loadAuthFromGit(created.publicationCommit, ROOT).auth;
    good.production_dry_run_authorization.authorized_executable_commit = REJECTED_NOTES_TIP;
    const pub = commitAuthOnlyFromParent(REJECTED_NOTES_TIP, good);
    expectCode(
      () =>
        describeDryRunArtifactMap({
          cwd: ROOT,
          publicationCommit: pub,
          executableAuthorityMap: exe.map,
        }),
      /DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH|DRY_RUN_AUTHORIZATION_ALLOWLIST|DRY_RUN_AUTHORIZATION_ANCESTRY|DRY_RUN_AUTHORIZATION_BUNDLE|DRY_RUN_AUTHORIZATION_SEAL/,
    );
  });

  it("rejects executable equal to the clean review tip", () => {
    const exe = makeExeAuth();
    const unpublished = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: CLEAN_REVIEW_TIP,
      executableAuthorityMap: exe.map,
    });
    expect(unpublished.blocked).toBe(BLOCKED_UNPUBLISHED);
    expect(unpublished.dry_run_authorized).toBe(false);
    expectCode(
      () => resolveExecutableCommit({ executableCommit: CLEAN_REVIEW_TIP }),
      /DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED/,
    );
  });

  it("rejects AUTH-only publication parented on dirty test-only tip (extra files vs executable)", () => {
    const exe = makeExeAuth();
    const noteBlob = git(["hash-object", "-w", "--stdin"], "test-only dryrun parent\n");
    const baseTree = git(["rev-parse", `${IMMUTABLE_EXECUTABLE}^{tree}`]);
    const lines = git(["ls-tree", baseTree]).split(/\n/).filter(Boolean);
    lines.push(`100644 blob ${noteBlob}\t.sealed-generation-test-only`);
    const dirtyTree = mktree(lines);
    const dirtyParent = git([
      "commit-tree",
      dirtyTree,
      "-p",
      IMMUTABLE_EXECUTABLE,
      "-m",
      "test-only dirty parent for dry-run allowlist",
    ]);
    expect(dirtyParent).not.toBe(IMMUTABLE_EXECUTABLE);

    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const { auth } = loadAuthFromGit(created.publicationCommit, ROOT);
    expect(auth.production_dry_run_authorization.authorized_executable_commit).toBe(
      IMMUTABLE_EXECUTABLE,
    );

    const fromDirty = commitAuthOnlyFromParent(dirtyParent, auth);
    const delta = git(["diff", "--name-only", IMMUTABLE_EXECUTABLE, fromDirty])
      .split(/\n/)
      .filter(Boolean);
    expect(delta).toContain(AUTH_REL);
    expect(delta.length).toBeGreaterThan(1);

    expectCode(
      () =>
        describeDryRunArtifactMap({
          cwd: ROOT,
          publicationCommit: fromDirty,
          executableAuthorityMap: exe.map,
        }),
      /DRY_RUN_AUTHORIZATION_ALLOWLIST/,
    );
  });

  it("rejects bare current test HEAD as executable", () => {
    const exe = makeExeAuth();
    const testHead = git(["rev-parse", "HEAD"]);
    const unpublished = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: testHead,
      executableAuthorityMap: exe.map,
    });
    expect(unpublished.blocked).toBe(BLOCKED_UNPUBLISHED);
    expect(unpublished.dry_run_authorized).toBe(false);
    expectCode(
      () => resolveExecutableCommit({ executableCommit: testHead }),
      /DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED/,
    );
  });

  it("successful publication never names clean review tip as executable", () => {
    const exe = makeExeAuth();
    const cleanTip = CLEAN_REVIEW_TIP;
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      executableAuthorityMap: exe.map,
    });
    expect(map.authorized_executable_commit).toBe(IMMUTABLE_EXECUTABLE);
    expect(map.authorized_executable_commit).not.toBe(cleanTip);
    expect(map.authorized_executable_commit).not.toBe(REJECTED_NOTES_TIP);
  });

  it("accepts synthetic AUTH-only dry-run publication offline and rejects worktree substitute", () => {
    const exe = makeExeAuth();
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      executableAuthorityMap: exe.map,
    });
    expect(map.blocked).toBeNull();
    expect(map.dry_run_authorized).toBe(true);
    expect(map.authorized_executable_commit).toBe(IMMUTABLE_EXECUTABLE);
    expect(map.attempt_id).toBe(attempt);
    expect(map.evidence_pin_authority_commit).toBe(EVIDENCE_PIN_AUTHORITY_COMMIT);
    expect(map.executable_authority_publication_commit).toBe(exe.created.publicationCommit);
    expect(map.executable_authority_publication_blob_oid).toBe(
      exe.created.authorization_publication_blob_oid,
    );

    const wt = JSON.parse(fs.readFileSync(path.join(ROOT, TOOLING_AUTHORIZATION_PATH), "utf8"));
    expectCode(
      () =>
        describeDryRunArtifactMap({
          cwd: ROOT,
          publicationCommit: created.publicationCommit,
          executableAuthorityMap: exe.map,
          auth: wt,
        }),
      /DRY_RUN_AUTHORIZATION_WORKTREE_SUBSTITUTE/,
    );

    recheckDryRunAuthorizationPin({
      cwd: ROOT,
      expectExecutable: IMMUTABLE_EXECUTABLE,
      expectCommit: created.publicationCommit,
      expectBlobOid: created.authorization_publication_blob_oid,
      expectBundleOid: map.bundle_oid,
      expectAttemptId: attempt,
      expectExecutableAuthorityCommit: exe.created.publicationCommit,
      expectExecutableAuthorityBlobOid: exe.created.authorization_publication_blob_oid,
      executableAuthorityMap: exe.map,
    });
    expect(map.publication_commit).toBe(created.publicationCommit);
  });

  it("positive: exe-auth + disposable dry-run reaches dry_run_authorized without credentials", async () => {
    const exe = makeExeAuth();
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      executableAuthorityMap: exe.map,
    });
    expect(map.blocked).toBeNull();
    expect(map.dry_run_authorized).toBe(true);
    expect(map.authorized_executable_commit).toBe(IMMUTABLE_EXECUTABLE);
    expect(map.executable_authority_publication_commit).toBe(exe.created.publicationCommit);

    const dry = await runDryRun({
      cwd: ROOT,
      env: {},
      argv: ["node"],
      executableAuthorityMap: exe.map,
      dryRunAuthorizationPublication: created.publicationCommit,
    });
    expect(dry.verdict).toBe("DRY_RUN_BLOCKED");
    expect(dry.databaseConnectionAttempts ?? 0).toBe(0);
    expect(dry.promptAttempts ?? dry.operatorPromptAttempts ?? 0).toBe(0);
  });

  it("rejects substituted executable-authority publication or blob on dry-run", () => {
    const exe1 = makeExeAuth();
    const exe2 = makeExeAuth();
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe1.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    expectCode(
      () =>
        describeDryRunArtifactMap({
          cwd: ROOT,
          publicationCommit: created.publicationCommit,
          executableAuthorityMap: exe2.map,
        }),
      /DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH/,
    );
  });

  it("rejects unpublished evidence-source tip as dry-run authority", () => {
    const exe = makeExeAuth();
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: "a055228c3ad704507cbd00613bd1c5b09cf4798c",
      executableAuthorityMap: exe.map,
    });
    expect(map.blocked).toBe(BLOCKED_UNPUBLISHED);
    expect(map.dry_run_authorized).toBe(false);
  });

  it("rejects wrong attempt id on recheck", () => {
    const exe = makeExeAuth();
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      executableAuthorityMap: exe.map,
    });
    expectCode(
      () =>
        recheckDryRunAuthorizationPin({
          cwd: ROOT,
          expectExecutable: map.authorized_executable_commit,
          expectCommit: map.publication_commit,
          expectBlobOid: map.authorization_publication_blob_oid,
          expectBundleOid: map.bundle_oid,
          expectAttemptId: attemptFor(IMMUTABLE_EXECUTABLE),
          expectExecutableAuthorityCommit: exe.created.publicationCommit,
          expectExecutableAuthorityBlobOid: exe.created.authorization_publication_blob_oid,
          executableAuthorityMap: exe.map,
        }),
      /DRY_RUN_AUTHORIZATION_PIN_MISMATCH/,
    );
  });

  it("recheck fails when publication pin blob mismatches after preflight", () => {
    const exe = makeExeAuth();
    const a1 = attemptFor(IMMUTABLE_EXECUTABLE);
    const a2 = attemptFor(IMMUTABLE_EXECUTABLE);
    const first = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: a1,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: first.publicationCommit,
      executableAuthorityMap: exe.map,
    });
    const other = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: a2,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    expectCode(
      () =>
        recheckDryRunAuthorizationPin({
          cwd: ROOT,
          expectExecutable: map.authorized_executable_commit,
          expectCommit: other.publicationCommit,
          expectBlobOid: map.authorization_publication_blob_oid,
          expectBundleOid: map.bundle_oid,
          expectAttemptId: map.attempt_id,
          expectExecutableAuthorityCommit: exe.created.publicationCommit,
          expectExecutableAuthorityBlobOid: exe.created.authorization_publication_blob_oid,
          executableAuthorityMap: exe.map,
        }),
      /DRY_RUN_AUTHORIZATION_PIN_MISMATCH|DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH|DRY_RUN_AUTHORIZATION_ANCESTRY/,
    );
  });

  it("live ref swap after preflight is rejected", () => {
    const exe = makeExeAuth();
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
      executableAuthorityMap: exe.map,
    });
    expectCode(
      () =>
        recheckDryRunAuthorizationPin({
          cwd: ROOT,
          expectExecutable: map.authorized_executable_commit,
          expectCommit: map.publication_commit,
          expectBlobOid: map.authorization_publication_blob_oid,
          expectBundleOid: map.bundle_oid,
          expectAttemptId: map.attempt_id,
          expectExecutableAuthorityCommit: exe.created.publicationCommit,
          expectExecutableAuthorityBlobOid: exe.created.authorization_publication_blob_oid,
          executableAuthorityMap: exe.map,
          expectLiveRef: "HEAD",
        }),
      /DRY_RUN_AUTHORIZATION_PIN_MISMATCH/,
    );
  });

  it("dry-run AUTH alone cannot choose executable independently of exe-auth map", () => {
    const exe = makeExeAuth();
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableAuthorityMap: exe.map,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const { auth } = loadAuthFromGit(created.publicationCommit, ROOT);
    // Keep exe-auth tuple matching map, but try to rename executable tip.
    auth.production_dry_run_authorization.authorized_executable_commit = CLEAN_REVIEW_TIP;
    const pub = commitAuthOnlyFromParent(IMMUTABLE_EXECUTABLE, auth);
    expectCode(
      () =>
        describeDryRunArtifactMap({
          cwd: ROOT,
          publicationCommit: pub,
          executableAuthorityMap: exe.map,
        }),
      /DRY_RUN_EXECUTABLE_AUTHORITY_MISMATCH/,
    );
  });

  it("unpublished dry-run and apply remain blocked before credentials/DB", async () => {
    const dry = await runDryRun({ cwd: ROOT, env: {}, argv: ["node"] });
    expect(dry.verdict).toBe("DRY_RUN_BLOCKED");
    expect(dry.error_code).toBe("DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED");
    expect(dry.databaseConnectionAttempts ?? 0).toBe(0);
    expectCode(
      () =>
        assertCorrectiveApplyAuthorized({
          cwd: ROOT,
          executableCommit: IMMUTABLE_EXECUTABLE,
        }),
      /APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS/,
    );
  });

  it("exports DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED constant", () => {
    expect(DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED).toBe("DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED");
  });
});
