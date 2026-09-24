/**
 * Runtime Git-object authority regression for corrective dry-run/apply.
 * Proves worktree AUTH poison is ignored and commits are mandatory.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVIDENCE_PIN_AUTHORITY_AUTH_BYTES,
  EVIDENCE_PIN_AUTHORITY_AUTH_OID,
  EVIDENCE_PIN_AUTHORITY_AUTH_SHA256,
  EVIDENCE_PIN_AUTHORITY_COMMIT,
  TOOLING_AUTHORIZATION_PATH,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js";
import {
  assertCorrectiveApplyAuthorized,
  loadEvidencePinAuthority,
  loadToolingAuthorization,
  recheckEvidencePinAuthority,
  resolveEvidenceAuthorityCommit,
  resolveExecutableCommit,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js";
import {
  enforceCorrectiveEvidenceGates,
  resolveBundleSeals,
  runApplicator,
  runDryRun,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-core.js";

const ROOT = process.cwd();
const AUTH_ABS = path.join(ROOT, TOOLING_AUTHORIZATION_PATH);

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

describe("corrective runtime Git-object authority", () => {
  it("pins evidence authority to f550842c and its AUTH blob identity", () => {
    expect(resolveEvidenceAuthorityCommit({})).toBe(EVIDENCE_PIN_AUTHORITY_COMMIT);
    const loaded = loadEvidencePinAuthority({ cwd: ROOT });
    expect(loaded.source).toBe("git_blob");
    expect(loaded.loaded.oid).toBe(EVIDENCE_PIN_AUTHORITY_AUTH_OID);
    expect(loaded.loaded.sha256).toBe(EVIDENCE_PIN_AUTHORITY_AUTH_SHA256);
    expect(loaded.loaded.bytes).toBe(EVIDENCE_PIN_AUTHORITY_AUTH_BYTES);
    expect(loaded.auth.precondition_publication.status).toBe("PUBLISHED");
    expect(loaded.auth.pre_apply_live_publication.status).toBe("PUBLISHED");
  });

  it("rejects caller-selected unvalidated evidence authority commits", () => {
    expectCode(
      () =>
        resolveEvidenceAuthorityCommit({
          evidenceAuthorityCommit: "a055228c3ad704507cbd00613bd1c5b09cf4798c",
        }),
      /EVIDENCE_AUTHORITY_COMMIT_FORBIDDEN/,
    );
  });

  it("rejects missing executable commit before credentials", () => {
    expectCode(() => resolveExecutableCommit({}), /EXECUTABLE_COMMIT_REQUIRED/);
  });

  it("rejects worktree AUTH load without harness context", () => {
    expectCode(
      () =>
        loadToolingAuthorization({
          cwd: ROOT,
          allowWorktreeAuthLoad: true,
        }),
      /HARNESS_CONTEXT_REQUIRED|AUTHORITY_COMMIT_REQUIRED/,
    );
    expectCode(() => loadToolingAuthorization({ cwd: ROOT }), /AUTHORITY_COMMIT_REQUIRED/);
  });

  it("ignores worktree AUTH poison for evidence gates and seal resolution", async () => {
    const tip = git(["rev-parse", "HEAD"]);
    const original = fs.readFileSync(AUTH_ABS, "utf8");
    const poisoned = JSON.parse(original);
    poisoned.precondition_publication = {
      ...poisoned.precondition_publication,
      evidence_blob_oid: "0".repeat(40),
      evidence_sha256: "0".repeat(64),
      evidence_bytes: 1,
    };
    poisoned.standalone_bundle = {
      ...poisoned.standalone_bundle,
      oid: "0".repeat(40),
      sha256: "0".repeat(64),
      bytes: 1,
    };
    fs.writeFileSync(AUTH_ABS, `${JSON.stringify(poisoned, null, 2)}\n`);
    try {
      const gates = enforceCorrectiveEvidenceGates(
        { cwd: ROOT, executableCommit: tip, now: new Date("2026-09-24T06:00:00Z") },
        "dry-run",
      );
      // Gates load f550842c Git blob — poison must not change authority oid.
      expect(gates.evidence_authority_commit).toBe(EVIDENCE_PIN_AUTHORITY_COMMIT);
      expect(gates.evidence_authority_auth_oid).toBe(EVIDENCE_PIN_AUTHORITY_AUTH_OID);
      expect(gates.evidence_authority_source).toBe("git_blob");

      const seals = resolveBundleSeals({ cwd: ROOT, executableCommit: tip });
      expect(seals.source).toBe("executable_git_auth");
      // Seals come from Git at executable tip, not poisoned worktree (tip may still match worktree until commit).
      const gitAuth = loadToolingAuthorization({ cwd: ROOT, commit: tip });
      expect(seals.oid).toBe(gitAuth.auth.standalone_bundle.oid);

      const recheck = recheckEvidencePinAuthority({ cwd: ROOT });
      expect(recheck.evidence_authority_auth_oid).toBe(EVIDENCE_PIN_AUTHORITY_AUTH_OID);
    } finally {
      fs.writeFileSync(AUTH_ABS, original);
    }
  });

  it("fails dry-run without executable commit before DB", async () => {
    const result = await runDryRun({ cwd: ROOT, env: {}, argv: ["node"] });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(result.error_code).toBe("EXECUTABLE_COMMIT_REQUIRED");
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
  });

  it("apply remains blocked from executable Git AUTH while unpublished", async () => {
    const tip = git(["rev-parse", "HEAD"]);
    expectCode(
      () =>
        assertCorrectiveApplyAuthorized({
          cwd: ROOT,
          executableCommit: tip,
        }),
      /APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS/,
    );
    const result = await runApplicator({
      mode: "apply",
      executableCommit: tip,
      cwd: ROOT,
      env: {},
      argv: ["node", "apply"],
    });
    expect(result.verdict).toBe("APPLY_BLOCKED");
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
    expect([
      "APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS",
      "CORRECTIVE_PRECONDITION_EXPIRED",
      "CORRECTIVE_PRE_APPLY_EXPIRED",
      "BUNDLE_AUTHORITY_UNPUBLISHED",
      "BLOCKED_PIN_MISMATCH",
    ]).toContain(result.error_code);
  });

  it("rejects wrong evidence authority auth blob oid", () => {
    expectCode(
      () =>
        loadToolingAuthorization({
          cwd: ROOT,
          commit: EVIDENCE_PIN_AUTHORITY_COMMIT,
          expectedOid: "0".repeat(40),
        }),
      /BLOCKED_PIN_MISMATCH/,
    );
  });

  it("rejects tip/source as substitute for evidence pin authority", () => {
    const source = "a055228c3ad704507cbd00613bd1c5b09cf4798c";
    const tooling = "99dc4cc35240beab1a0c3a12098c177dde06bd98";
    expectCode(
      () => resolveEvidenceAuthorityCommit({ evidenceAuthorityCommit: source }),
      /EVIDENCE_AUTHORITY_COMMIT_FORBIDDEN/,
    );
    expectCode(
      () => resolveEvidenceAuthorityCommit({ evidenceAuthorityCommit: tooling }),
      /EVIDENCE_AUTHORITY_COMMIT_FORBIDDEN/,
    );
    // Equal to the pinned authority is allowed (identity match).
    expect(resolveEvidenceAuthorityCommit({ evidenceAuthorityCommit: EVIDENCE_PIN_AUTHORITY_COMMIT })).toBe(
      EVIDENCE_PIN_AUTHORITY_COMMIT,
    );
  });

  it("production source has no reachable worktree AUTH readFileSync without harness", () => {
    const authJs = fs.readFileSync(
      path.join(ROOT, "scripts/security/ra-pro-accounting-automation-corrective-apply-authorization.js"),
      "utf8",
    );
    expect(authJs).toMatch(/allowWorktreeAuthLoad === true/);
    expect(authJs).toMatch(/AUTHORITY_COMMIT_REQUIRED/);
    const core = fs.readFileSync(
      path.join(ROOT, "scripts/security/ra-pro-accounting-automation-corrective-apply-core.js"),
      "utf8",
    );
    expect(core).not.toMatch(/loadToolingAuthorization\(cwd\)/);
    expect(core).not.toMatch(/loadToolingAuthorization\(resolveRepoRoot/);
    const cli = fs.readFileSync(
      path.join(ROOT, "scripts/security/apply-ra-pro-accounting-automation-corrective.js"),
      "utf8",
    );
    expect(cli).not.toMatch(/readFileSync/);
    expect(cli).toMatch(/--executable-commit/);
  });
});
