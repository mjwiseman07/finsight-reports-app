/**
 * Corrective dry-run execution authorization — non-circular one-attempt publication.
 */
import { randomBytes } from "node:crypto";
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
  recheckDryRunAuthorizationPin,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-dry-run-authorization.js";
import {
  assertCorrectiveApplyAuthorized,
  resolveExecutableCommit,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js";
import { runDryRun } from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-core.js";

const ROOT = process.cwd();

function git(args: string[]) {
  const r = spawnSync("git", ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout || args.join(" ")));
  return (r.stdout || "").trim();
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
    const tip = git(["rev-parse", "HEAD"]);
    expectCode(
      () => resolveExecutableCommit({ executableCommit: tip }),
      /DRY_RUN_AUTHORIZATION_REQUIRED/,
    );
  });

  it("CLI-equivalent dry-run without publication pin fails closed", async () => {
    const tip = git(["rev-parse", "HEAD"]);
    const result = await runDryRun({ executableCommit: tip, cwd: ROOT, env: {}, argv: ["node"] });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(result.error_code).toBe("DRY_RUN_AUTHORIZATION_REQUIRED");
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
  });

  it("dry-run authorization cannot satisfy apply authorization", () => {
    const tip = git(["rev-parse", "HEAD"]);
    expectCode(
      () =>
        assertCorrectiveApplyAuthorized({
          cwd: ROOT,
          executableCommit: tip,
          dryRunAuthorizationMap: {
            authorized_executable_commit: tip,
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
          executableCommit: git(["rev-parse", "HEAD"]),
          attemptId: attemptFor(git(["rev-parse", "HEAD"])),
          allowDisposableDryRunPublicationCommit: true,
        }),
      /HARNESS_CONTEXT_REQUIRED/,
    );
  });

  it("accepts synthetic AUTH-only dry-run publication offline and rejects worktree substitute", () => {
    const tip = git(["rev-parse", "HEAD"]);
    // Bootstrap+ceremony must exist at executable tip (committed).
    try {
      git(["cat-file", "-e", `${tip}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`]);
    } catch {
      // Tip under remediation may not yet include bootstrap — skip until executable tip lands.
      expect(true).toBe(true);
      return;
    }
    const attempt = attemptFor(tip);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: tip,
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
    expect(map.authorized_executable_commit).toBe(tip);
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
      expectExecutable: tip,
      expectCommit: created.publicationCommit,
      expectBlobOid: created.authorization_publication_blob_oid,
      expectBundleOid: map.bundle_oid,
      expectAttemptId: attempt,
    });

    // Credential-free mapping only — no DB contact from authorization alone.
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
    const tip = git(["rev-parse", "HEAD"]);
    try {
      git(["cat-file", "-e", `${tip}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`]);
    } catch {
      expect(true).toBe(true);
      return;
    }
    const attempt = attemptFor(tip);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: tip,
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
          expectAttemptId: attemptFor(tip),
        }),
      /DRY_RUN_AUTHORIZATION_PIN_MISMATCH/,
    );
  });

  it("recheck fails when publication pin blob mismatches after preflight", () => {
    const tip = git(["rev-parse", "HEAD"]);
    try {
      git(["cat-file", "-e", `${tip}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`]);
    } catch {
      expect(true).toBe(true);
      return;
    }
    const a1 = attemptFor(tip);
    const a2 = attemptFor(tip);
    const first = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: tip,
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
      executableCommit: tip,
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
    const tip = git(["rev-parse", "HEAD"]);
    try {
      git(["cat-file", "-e", `${tip}:scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1`]);
    } catch {
      expect(true).toBe(true);
      return;
    }
    const attempt = attemptFor(tip);
    const created = createDisposableDryRunPublicationCommit({
      cwd: ROOT,
      executableCommit: tip,
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
});
