/**
 * Dry-run authority split + visible ceremony fail-closed coverage.
 * Never contacts production.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
  runApplicator,
  assertAuthorizationPublished,
} from "../../scripts/security/ra-pro-accounting-automation-apply-core.js";

const ROOT = process.cwd();
const PRECOND_SHA = "8714cea78cf04defdc3bfa63555aca507220fb4ec985b3709fdef629a34499b8";

function tipSha() {
  const r = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      ...process.env,
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "safe.directory",
      GIT_CONFIG_VALUE_0: ROOT.replace(/\\/g, "/"),
    },
  });
  return (r.stdout || "").trim();
}

describe("RA Pro accounting-automation dry-run path authority", () => {
  it("apply authorization pins remain unpublished and refuse apply", () => {
    expect(() => assertAuthorizationPublished({})).toThrow(/AUTHORIZATION_PINS_UNPUBLISHED/);
  });

  it("dry-run rejects evidence-path overrides before credentials", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      preconditionEvidencePath: "evil.json",
      env: { [DATABASE_URL_ENV]: "postgres://x@127.0.0.1/db" },
    });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(String(result.error_code || "")).toMatch(/PATH_OVERRIDE_FORBIDDEN/);
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
  });

  it("dry-run rejects precondition env override before credentials", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      env: {
        [DATABASE_URL_ENV]: "postgres://x@127.0.0.1/db",
        RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_PATH: "evil.json",
      },
    });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(String(result.error_code || "")).toMatch(/ENV_OVERRIDE_FORBIDDEN/);
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
  });

  it("dry-run rejects expired precondition clock without DB contact", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      now: new Date("2026-09-19T01:00:07Z"),
      env: { [DATABASE_URL_ENV]: "postgres://x@127.0.0.1/db" },
    });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(String(result.error_code || "")).toMatch(/EXPIRED/);
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
  });

  it("apply remains unreachable with token + URL while prior pins unpublished", async () => {
    const result = await runApplicator({
      mode: "apply",
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      env: { [DATABASE_URL_ENV]: "postgres://x@127.0.0.1/db" },
    });
    expect(result.verdict).toBe("APPLY_BLOCKED");
    expect(String(result.error_code || "")).toMatch(/AUTHORIZATION_PINS_UNPUBLISHED/);
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
    expect(result.sqlApplicationAttempts ?? 0).toBe(0);
  });

  it("operator ceremony refuses wrong tip before SecureString", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-dryrun-wrong-tip-"));
    const run = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1",
        "-PrHead",
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "-RepoRoot",
        ROOT,
        "-EvidenceOutDir",
        outDir,
        "-TestSyntheticDatabaseUrl",
        "postgres://postgres:postgres@127.0.0.1:5432/postgres",
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        env: {
          ...process.env,
          RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1",
        },
      },
    );
    expect(run.status).toBe(1);
    const payload = JSON.parse(run.stdout.trim().split(/\r?\n/).pop() || "{}");
    expect(String(payload.reason || "")).toMatch(/WRONG_TIP/);
    expect(payload.productionContact).toBe(false);
  });

  it("operator ceremony cancels closed when synthetic URL disallowed (no DB)", () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-dryrun-cancel-"));
    const tip = tipSha();
    const run = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1",
        "-PrHead",
        tip,
        "-RepoRoot",
        ROOT,
        "-EvidenceOutDir",
        outDir,
        "-TestSyntheticDatabaseUrl",
        "postgres://postgres:postgres@127.0.0.1:5432/postgres",
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env },
      },
    );
    expect(run.status).toBe(1);
    const payload = JSON.parse(run.stdout.trim().split(/\r?\n/).pop() || "{}");
    expect(String(payload.reason || "")).toMatch(/SYNTHETIC_URL_NOT_ALLOWED/);
    expect(payload.credential_cleared).toBe(true);
    expect(payload.productionContact).toBe(false);
  });

  it("records accepted precondition sha on dry-run blocked before URL", async () => {
    const result = await runApplicator({ mode: "dry-run", env: {} });
    expect(result.precondition_evidence?.sha256).toBe(PRECOND_SHA);
    expect(result.authorization_scope).toBe("dry_run_precondition_only");
  });
});
