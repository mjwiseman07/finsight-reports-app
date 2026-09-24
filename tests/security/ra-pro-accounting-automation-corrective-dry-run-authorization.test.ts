/**
 * Corrective dry-run execution authorization — non-circular one-attempt publication.
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
  PROTOCOL,
  createDisposableDryRunPublicationCommit,
  describeDryRunArtifactMap,
  loadAuthFromGit,
  recheckDryRunAuthorizationPin,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js";
import {
  assertCorrectiveApplyAuthorized,
  resolveExecutableCommit,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js";
import { runDryRun } from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-core.js";

const ROOT = process.cwd();
/** Sole immutable dry-run executable tip (frozen by review). */
const IMMUTABLE_EXECUTABLE = "9f31c3552a2a06fc3b851bd722aad9311dde40f8";
/** Rejected notes-only review tip — never authorized_executable_commit / never baseline. */
const REJECTED_NOTES_TIP = "98dfe61ee521a5177bfbda42be3e5ee0e6b6b082";
/**
 * Clean review tip: AUTH restored to executable identity; full tree equals executable.
 * Tests-only descendants may exist after this tip; they are not the publication baseline.
 */
const CLEAN_REVIEW_TIP = "b287fd85defa04b3c7895e2d1397d5cc69a33a04";
const EXEC_AUTH_OID = "0f64efc038f13459a2140d339c02794f934fa25f";
const EXEC_AUTH_SHA = "25dac9806a4b45434d6a4e068a64328b90f383de000385f61b3be0c70b7199b8";
const EXEC_AUTH_BYTES = 13022;
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

describe("corrective dry-run execution authorization", () => {
  it("protocol id is the one-attempt dry-run authorization v1", () => {
    expect(PROTOCOL).toBe(
      "RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_ONE_ATTEMPT_DRY_RUN_AUTHORIZATION_V1",
    );
  });

  it("unpublished tip blocks before credentials", () => {
    const tip = git(["rev-parse", "HEAD"]);
    const map = describeDryRunArtifactMap({ cwd: ROOT, publicationCommit: tip });
    expect(map.blocked).toBe(BLOCKED_UNPUBLISHED);
    expect(map.dry_run_authorized).toBe(false);
  });

  it("rejects arbitrary --executable-commit alone", () => {
    expectCode(
      () => resolveExecutableCommit({ executableCommit: IMMUTABLE_EXECUTABLE }),
      /DRY_RUN_AUTHORIZATION_REQUIRED/,
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
    expect(result.error_code).toBe("DRY_RUN_AUTHORIZATION_REQUIRED");
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
    expectCode(
      () =>
        createDisposableDryRunPublicationCommit({
          cwd: ROOT,
          executableCommit: IMMUTABLE_EXECUTABLE,
          attemptId: attemptFor(IMMUTABLE_EXECUTABLE),
          allowDisposableDryRunPublicationCommit: true,
        }),
      /HARNESS_CONTEXT_REQUIRED/,
    );
  });

  it("clean review tip AUTH is byte-identical to immutable executable AUTH", () => {
    expect(CLEAN_REVIEW_TIP).not.toBe(REJECTED_NOTES_TIP);
    expect(CLEAN_REVIEW_TIP).not.toBe(IMMUTABLE_EXECUTABLE);
    expect(git(["merge-base", "--is-ancestor", CLEAN_REVIEW_TIP, "HEAD"])).toBe("");
    expect(git(["rev-parse", CLEAN_REVIEW_TIP + "^{tree}"])).toBe(
      git(["rev-parse", IMMUTABLE_EXECUTABLE + "^{tree}"]),
    );
    const execOid = git(["rev-parse", `${IMMUTABLE_EXECUTABLE}:${AUTH_REL}`]);
    const cleanOid = git(["rev-parse", `${CLEAN_REVIEW_TIP}:${AUTH_REL}`]);
    expect(execOid).toBe(EXEC_AUTH_OID);
    expect(cleanOid).toBe(EXEC_AUTH_OID);
    const execBuf = gitBuf(["cat-file", "blob", `${IMMUTABLE_EXECUTABLE}:${AUTH_REL}`]);
    const cleanBuf = gitBuf(["cat-file", "blob", `${CLEAN_REVIEW_TIP}:${AUTH_REL}`]);
    expect(execBuf.equals(cleanBuf)).toBe(true);
    expect(execBuf.length).toBe(EXEC_AUTH_BYTES);
    expect(createHash("sha256").update(execBuf).digest("hex")).toBe(EXEC_AUTH_SHA);
    expect(createHash("sha256").update(cleanBuf).digest("hex")).toBe(EXEC_AUTH_SHA);
    expect(execBuf.includes(0x0d)).toBe(false);
  });

  it("rejected notes tip AUTH differs from executable; cannot be publication baseline", () => {
    const rejectedOid = git(["rev-parse", `${REJECTED_NOTES_TIP}:${AUTH_REL}`]);
    expect(rejectedOid).not.toBe(EXEC_AUTH_OID);
    const execAuth = loadAuthFromGit(IMMUTABLE_EXECUTABLE, ROOT).auth;
    const rejectedAuth = loadAuthFromGit(REJECTED_NOTES_TIP, ROOT).auth;
    expect(JSON.stringify(execAuth.notes)).not.toBe(JSON.stringify(rejectedAuth.notes));
  });

  it("accepts AUTH-only publication descended from clean review tip naming immutable executable", () => {
    const cleanTip = CLEAN_REVIEW_TIP;
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    // Re-parent style: build the same AUTH object as a child of the clean review tip.
    const { auth } = loadAuthFromGit(created.publicationCommit, ROOT);
    const fromClean = commitAuthOnlyFromParent(cleanTip, auth);
    expect(git(["merge-base", "--is-ancestor", cleanTip, fromClean])).toBe("");
    expect(git(["merge-base", "--is-ancestor", IMMUTABLE_EXECUTABLE, fromClean])).toBe("");
    expect(git(["diff", "--name-only", IMMUTABLE_EXECUTABLE, fromClean])).toBe(AUTH_REL);

    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: fromClean,
    });
    expect(map.blocked).toBeNull();
    expect(map.dry_run_authorized).toBe(true);
    expect(map.authorized_executable_commit).toBe(IMMUTABLE_EXECUTABLE);
    expect(map.authorized_executable_commit).not.toBe(cleanTip);
    expect(map.authorized_executable_commit).not.toBe(REJECTED_NOTES_TIP);
    expect(map.attempt_id).toBe(attempt);
    expect(map.evidence_pin_authority_commit).toBe(EVIDENCE_PIN_AUTHORITY_COMMIT);

    const left = loadAuthFromGit(IMMUTABLE_EXECUTABLE, ROOT).auth;
    const right = loadAuthFromGit(fromClean, ROOT).auth;
    left.production_dry_run_authorization = null;
    right.production_dry_run_authorization = null;
    expect(JSON.stringify(left)).toBe(JSON.stringify(right));
  });

  it("rejects publication based on rejected-note JSON against executable baseline", () => {
    const rejectedAuth = loadAuthFromGit(REJECTED_NOTES_TIP, ROOT).auth;
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    rejectedAuth.production_dry_run_authorization = {
      status: "AUTHORIZED",
      protocol: PROTOCOL,
      dry_run_authorized: true,
      authorized_executable_commit: IMMUTABLE_EXECUTABLE,
      attempt_id: attempt,
      project_ref: rejectedAuth.project_ref,
      bundle: rejectedAuth.standalone_bundle,
      bootstrap: {
        path: "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1",
        oid: git(["rev-parse", `${IMMUTABLE_EXECUTABLE}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`]),
        sha256: createHash("sha256")
          .update(
            gitBuf([
              "cat-file",
              "blob",
              `${IMMUTABLE_EXECUTABLE}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`,
            ]),
          )
          .digest("hex"),
        bytes: gitBuf([
          "cat-file",
          "blob",
          `${IMMUTABLE_EXECUTABLE}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`,
        ]).length,
        line_endings: "LF",
      },
      ceremony: {
        path: "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1",
        oid: git([
          "rev-parse",
          `${IMMUTABLE_EXECUTABLE}:scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1`,
        ]),
        sha256: createHash("sha256")
          .update(
            gitBuf([
              "cat-file",
              "blob",
              `${IMMUTABLE_EXECUTABLE}:scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1`,
            ]),
          )
          .digest("hex"),
        bytes: gitBuf([
          "cat-file",
          "blob",
          `${IMMUTABLE_EXECUTABLE}:scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1`,
        ]).length,
        line_endings: "LF",
      },
      evidence_pin_authority: rejectedAuth.evidence_pin_authority,
      precondition_evidence: {
        path: rejectedAuth.precondition_publication.evidence_path,
        source_commit: rejectedAuth.precondition_publication.evidence_source_commit,
        oid: rejectedAuth.precondition_publication.evidence_blob_oid,
        sha256: rejectedAuth.precondition_publication.evidence_sha256,
        bytes: rejectedAuth.precondition_publication.evidence_bytes,
      },
      pre_apply_live_evidence: {
        path: rejectedAuth.pre_apply_live_publication.evidence_path,
        source_commit: rejectedAuth.pre_apply_live_publication.evidence_source_commit,
        oid: rejectedAuth.pre_apply_live_publication.evidence_blob_oid,
        sha256: rejectedAuth.pre_apply_live_publication.evidence_sha256,
        bytes: rejectedAuth.pre_apply_live_publication.evidence_bytes,
      },
      publication_role: "later_descendant_commit",
      note: "poisoned notes baseline",
    };
    const poisoned = commitAuthOnlyFromParent(IMMUTABLE_EXECUTABLE, rejectedAuth);
    expectCode(
      () => describeDryRunArtifactMap({ cwd: ROOT, publicationCommit: poisoned }),
      /DRY_RUN_AUTHORIZATION_ALLOWLIST/,
    );
  });

  it("rejects top-level notes drift and other non-authorization JSON changes", () => {
    const { auth } = loadAuthFromGit(IMMUTABLE_EXECUTABLE, ROOT);
    auth.notes = [...(auth.notes || []), "extraneous note drift"];
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    auth.production_dry_run_authorization = {
      status: "AUTHORIZED",
      protocol: PROTOCOL,
      dry_run_authorized: true,
      authorized_executable_commit: IMMUTABLE_EXECUTABLE,
      attempt_id: attempt,
      project_ref: auth.project_ref,
      bundle: auth.standalone_bundle,
      bootstrap: {
        path: "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1",
        oid: git(["rev-parse", `${IMMUTABLE_EXECUTABLE}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`]),
        sha256: createHash("sha256")
          .update(
            gitBuf([
              "cat-file",
              "blob",
              `${IMMUTABLE_EXECUTABLE}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`,
            ]),
          )
          .digest("hex"),
        bytes: gitBuf([
          "cat-file",
          "blob",
          `${IMMUTABLE_EXECUTABLE}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`,
        ]).length,
        line_endings: "LF",
      },
      ceremony: {
        path: "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1",
        oid: git([
          "rev-parse",
          `${IMMUTABLE_EXECUTABLE}:scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1`,
        ]),
        sha256: createHash("sha256")
          .update(
            gitBuf([
              "cat-file",
              "blob",
              `${IMMUTABLE_EXECUTABLE}:scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1`,
            ]),
          )
          .digest("hex"),
        bytes: gitBuf([
          "cat-file",
          "blob",
          `${IMMUTABLE_EXECUTABLE}:scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1`,
        ]).length,
        line_endings: "LF",
      },
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
      publication_role: "later_descendant_commit",
      note: "notes drift",
    };
    const drifted = commitAuthOnlyFromParent(IMMUTABLE_EXECUTABLE, auth);
    expectCode(
      () => describeDryRunArtifactMap({ cwd: ROOT, publicationCommit: drifted }),
      /DRY_RUN_AUTHORIZATION_ALLOWLIST/,
    );
  });

  it("rejects rejected notes tip as authorized_executable_commit via allowlist", () => {
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const good = loadAuthFromGit(created.publicationCommit, ROOT).auth;
    good.production_dry_run_authorization.authorized_executable_commit = REJECTED_NOTES_TIP;
    const pub = commitAuthOnlyFromParent(REJECTED_NOTES_TIP, good);
    expectCode(
      () => describeDryRunArtifactMap({ cwd: ROOT, publicationCommit: pub }),
      /DRY_RUN_AUTHORIZATION_ALLOWLIST|DRY_RUN_AUTHORIZATION_ANCESTRY|DRY_RUN_AUTHORIZATION_BUNDLE|DRY_RUN_AUTHORIZATION_SEAL/,
    );
  });

  it("rejects executable equal to the clean review tip", () => {
    const unpublished = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: CLEAN_REVIEW_TIP,
    });
    expect(unpublished.blocked).toBe(BLOCKED_UNPUBLISHED);
    expect(unpublished.dry_run_authorized).toBe(false);
    expectCode(
      () => resolveExecutableCommit({ executableCommit: CLEAN_REVIEW_TIP }),
      /DRY_RUN_AUTHORIZATION_REQUIRED/,
    );
  });

  it("successful publication never names clean review tip as executable", () => {
    const cleanTip = CLEAN_REVIEW_TIP;
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
    });
    expect(map.authorized_executable_commit).toBe(IMMUTABLE_EXECUTABLE);
    expect(map.authorized_executable_commit).not.toBe(cleanTip);
    expect(map.authorized_executable_commit).not.toBe(REJECTED_NOTES_TIP);
  });

  it("accepts synthetic AUTH-only dry-run publication offline and rejects worktree substitute", () => {
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
    });
    expect(map.blocked).toBeNull();
    expect(map.dry_run_authorized).toBe(true);
    expect(map.authorized_executable_commit).toBe(IMMUTABLE_EXECUTABLE);
    expect(map.attempt_id).toBe(attempt);
    expect(map.evidence_pin_authority_commit).toBe(EVIDENCE_PIN_AUTHORITY_COMMIT);

    const wt = JSON.parse(fs.readFileSync(path.join(ROOT, TOOLING_AUTHORIZATION_PATH), "utf8"));
    expectCode(
      () =>
        describeDryRunArtifactMap({
          cwd: ROOT,
          publicationCommit: created.publicationCommit,
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
    });
    expect(map.publication_commit).toBe(created.publicationCommit);
  });

  it("rejects unpublished evidence-source tip as dry-run authority", () => {
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: "a055228c3ad704507cbd00613bd1c5b09cf4798c",
    });
    expect(map.blocked).toBe(BLOCKED_UNPUBLISHED);
    expect(map.dry_run_authorized).toBe(false);
  });

  it("rejects wrong attempt id on recheck", () => {
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
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
        }),
      /DRY_RUN_AUTHORIZATION_PIN_MISMATCH/,
    );
  });

  it("recheck fails when publication pin blob mismatches after preflight", () => {
    const a1 = attemptFor(IMMUTABLE_EXECUTABLE);
    const a2 = attemptFor(IMMUTABLE_EXECUTABLE);
    const first = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: a1,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: first.publicationCommit,
    });
    const other = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
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
        }),
      /DRY_RUN_AUTHORIZATION_PIN_MISMATCH|DRY_RUN_AUTHORIZATION_BUNDLE_MISMATCH|DRY_RUN_AUTHORIZATION_ANCESTRY/,
    );
  });

  it("live ref swap after preflight is rejected", () => {
    const attempt = attemptFor(IMMUTABLE_EXECUTABLE);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: IMMUTABLE_EXECUTABLE,
      attemptId: attempt,
      allowDisposableDryRunPublicationCommit: true,
      testOnlyHarnessContext: true,
    });
    const map = describeDryRunArtifactMap({
      cwd: ROOT,
      publicationCommit: created.publicationCommit,
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
          expectLiveRef: "HEAD",
        }),
      /DRY_RUN_AUTHORIZATION_PIN_MISMATCH/,
    );
  });

  it("unpublished dry-run and apply remain blocked before credentials/DB", async () => {
    const dry = await runDryRun({ cwd: ROOT, env: {}, argv: ["node"] });
    expect(dry.verdict).toBe("DRY_RUN_BLOCKED");
    expect(dry.error_code).toBe("DRY_RUN_AUTHORIZATION_REQUIRED");
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
});
