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
  resolveDatabaseUrlFromEnv,
  assertAuthorizationPublished,
} from "../../scripts/security/ra-pro-accounting-automation-apply-core.js";
import { EXPECTED_PROJECT_REF } from "../../scripts/security/ra-pro-accounting-automation-apply-constants.js";

const ROOT = process.cwd();
const PRECOND_SHA = "8714cea78cf04defdc3bfa63555aca507220fb4ec985b3709fdef629a34499b8";
const PROJECT_URL = `postgres://user:pass@db.${EXPECTED_PROJECT_REF}.supabase.co:5432/postgres`;
const WRONG_PROJECT_URL = "postgres://user:pass@db.otherprojectref000000000000.supabase.co:5432/postgres";
const LOOPBACK_URL = "postgres://postgres:postgres@127.0.0.1:5432/postgres";

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

function runCeremony(args: string[], envExtra: Record<string, string> = {}) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-dryrun-"));
  const run = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1",
      "-RepoRoot",
      ROOT,
      "-EvidenceOutDir",
      outDir,
      ...args,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env, ...envExtra },
    },
  );
  const lines = `${run.stdout || ""}${run.stderr || ""}`.trim().split(/\r?\n/).filter(Boolean);
  let payload: Record<string, unknown> = {};
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      payload = JSON.parse(lines[i]);
      break;
    } catch {
      // continue
    }
  }
  return { run, outDir, payload };
}

function assertCleanupTruthful(payload: Record<string, unknown>, expectOk: boolean) {
  const cleanup = payload.cleanup as Record<string, unknown>;
  expect(cleanup).toBeTruthy();
  expect(typeof cleanup.completed).toBe("boolean");
  expect(typeof cleanup.credential_cleared).toBe("boolean");
  expect(typeof cleanup.secure_string_zero_freed).toBe("boolean");
  expect(typeof cleanup.raw_stdout_removed).toBe("boolean");
  expect(typeof cleanup.material_removed).toBe("boolean");
  expect(typeof cleanup.child_terminated).toBe("boolean");
  expect(typeof cleanup.orphan_check_completed).toBe("boolean");
  if (expectOk) {
    expect(cleanup.completed).toBe(true);
    expect(cleanup.credential_cleared).toBe(true);
    expect(cleanup.secure_string_zero_freed).toBe(true);
    expect(cleanup.raw_stdout_removed).toBe(true);
    expect(cleanup.material_removed).toBe(true);
    expect(cleanup.child_terminated).toBe(true);
    expect(cleanup.orphan_check_completed).toBe(true);
  }
  // Never hard-code fixed green values without checking files.
  const outDir = String((payload as { _out?: string })._out || "");
  return outDir;
}

describe("RA Pro accounting-automation dry-run path authority", () => {
  it("apply authorization pins remain unpublished and refuse apply", () => {
    expect(() => assertAuthorizationPublished({})).toThrow(/AUTHORIZATION_PINS_UNPUBLISHED/);
  });

  it("dry-run rejects evidence-path overrides before credentials", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      preconditionEvidencePath: "evil.json",
      env: { [DATABASE_URL_ENV]: PROJECT_URL },
    });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(String(result.error_code || "")).toMatch(/PATH_OVERRIDE_FORBIDDEN/);
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
  });

  it("dry-run rejects precondition env override before credentials", async () => {
    const result = await runApplicator({
      mode: "dry-run",
      env: {
        [DATABASE_URL_ENV]: PROJECT_URL,
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
      env: { [DATABASE_URL_ENV]: PROJECT_URL },
    });
    expect(result.verdict).toBe("DRY_RUN_BLOCKED");
    expect(String(result.error_code || "")).toMatch(/EXPIRED/);
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
  });

  it("wrong project / localhost / malformed fail before DB; harness localhost allowed in-process only", async () => {
    expect(() => resolveDatabaseUrlFromEnv({ [DATABASE_URL_ENV]: LOOPBACK_URL })).toThrow(
      /DATABASE_PROJECT_REF_MISMATCH/,
    );
    expect(() => resolveDatabaseUrlFromEnv({ [DATABASE_URL_ENV]: WRONG_PROJECT_URL })).toThrow(
      /DATABASE_PROJECT_REF_MISMATCH/,
    );
    expect(() => resolveDatabaseUrlFromEnv({ [DATABASE_URL_ENV]: "not-a-url" })).toThrow(
      /MALFORMED_DATABASE_URL/,
    );
    const okLocal = resolveDatabaseUrlFromEnv(
      { [DATABASE_URL_ENV]: LOOPBACK_URL },
      { allowLocalhostForHarness: true },
    );
    expect(okLocal.uri_diagnostics.host_class).toBe("loopback");
    expect(okLocal.uri_diagnostics).not.toHaveProperty("host");

    const mismatched = await runApplicator({
      mode: "dry-run",
      env: { [DATABASE_URL_ENV]: WRONG_PROJECT_URL },
    });
    expect(mismatched.verdict).toBe("DRY_RUN_BLOCKED");
    expect(String(mismatched.error_code || "")).toBe("DATABASE_PROJECT_REF_MISMATCH");
    expect(mismatched.databaseConnectionAttempts ?? 0).toBe(0);
    expect(mismatched.sqlApplicationAttempts ?? 0).toBe(0);
    expect(JSON.stringify(mismatched)).not.toMatch(/postgres:\/\/user:pass/);

    const loop = await runApplicator({
      mode: "dry-run",
      env: { [DATABASE_URL_ENV]: LOOPBACK_URL },
    });
    expect(String(loop.error_code || "")).toBe("DATABASE_PROJECT_REF_MISMATCH");
    expect(loop.databaseConnectionAttempts ?? 0).toBe(0);

    expect(() =>
      resolveDatabaseUrlFromEnv(
        {
          [DATABASE_URL_ENV]: LOOPBACK_URL,
          RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST: "1",
        },
        { allowLocalhostForHarness: true },
      ),
    ).not.toThrow();
    const harnessEnv = await runApplicator({
      mode: "dry-run",
      allowLocalhostForHarness: true,
      env: {
        [DATABASE_URL_ENV]: LOOPBACK_URL,
        RA_PRO_ACCOUNTING_AUTOMATION_ALLOW_LOCALHOST: "1",
      },
    });
    expect(String(harnessEnv.error_code || "")).toMatch(/HARNESS_VIA_ENV_FORBIDDEN/);
    expect(harnessEnv.databaseConnectionAttempts ?? 0).toBe(0);

    const cli = spawnSync(
      process.execPath,
      ["scripts/security/apply-ra-pro-accounting-automation.js", "--dry-run"],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, [DATABASE_URL_ENV]: LOOPBACK_URL },
      },
    );
    expect(cli.status).toBe(1);
    const cliPayload = JSON.parse(
      `${cli.stdout || ""}${cli.stderr || ""}`.trim().split(/\r?\n/).pop() || "{}",
    );
    expect(String(cliPayload.error_code || cliPayload.result_code || "")).toMatch(
      /DATABASE_PROJECT_REF_MISMATCH/,
    );
    expect(cliPayload.databaseConnectionAttempts ?? 0).toBe(0);

    const standalone = spawnSync(
      process.execPath,
      ["scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs"],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        env: { ...process.env, [DATABASE_URL_ENV]: LOOPBACK_URL },
      },
    );
    const standPayload = JSON.parse(
      `${standalone.stdout || ""}${standalone.stderr || ""}`.trim().split(/\r?\n/).pop() || "{}",
    );
    expect(String(standPayload.error_code || standPayload.result_code || "")).toMatch(
      /DATABASE_PROJECT_REF_MISMATCH/,
    );
    expect(standPayload.databaseConnectionAttempts ?? 0).toBe(0);
  });

  it("apply remains unreachable with token + URL while prior pins unpublished", async () => {
    const result = await runApplicator({
      mode: "apply",
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      env: { [DATABASE_URL_ENV]: PROJECT_URL },
    });
    expect(result.verdict).toBe("APPLY_BLOCKED");
    expect(String(result.error_code || result.result_code || "")).toMatch(/AUTHORIZATION_PINS_UNPUBLISHED/);
    expect(result.databaseConnectionAttempts ?? 0).toBe(0);
    expect(result.sqlApplicationAttempts ?? 0).toBe(0);
  });

  it("operator ceremony refuses wrong tip before SecureString", () => {
    const { run, outDir, payload } = runCeremony([
      "-PrHead",
      "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      "-TestSyntheticDatabaseUrl",
      PROJECT_URL,
    ], { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" });
    expect(run.status).toBe(1);
    expect(String(payload.result_code || payload.reason || "")).toMatch(/WRONG_TIP/);
    expect(payload.productionContact).toBe(false);
    expect(fs.existsSync(path.join(outDir, "raw-child-stdout.frame.txt"))).toBe(false);
    expect(fs.readdirSync(outDir).filter((f) => f.startsWith("bundle-") && f.endsWith(".cjs"))).toEqual(
      [],
    );
    const cleanup = payload.cleanup as Record<string, unknown>;
    expect(cleanup.raw_stdout_removed).toBe(true);
    expect(cleanup.material_removed).toBe(true);
    expect(cleanup.credential_cleared).toBe(true);
  });

  it("operator ceremony cancels closed when synthetic URL disallowed (no DB)", () => {
    const tip = tipSha();
    const { run, outDir, payload } = runCeremony([
      "-PrHead",
      tip,
      "-TestSyntheticDatabaseUrl",
      PROJECT_URL,
    ]);
    expect(run.status).toBe(1);
    expect(String(payload.result_code || payload.reason || "")).toMatch(/SYNTHETIC_URL_NOT_ALLOWED/);
    expect(payload.productionContact).toBe(false);
    const cleanup = payload.cleanup as Record<string, unknown>;
    expect(cleanup.credential_cleared).toBe(true);
    expect(cleanup.raw_stdout_removed).toBe(true);
    expect(cleanup.material_removed).toBe(true);
    expect(fs.existsSync(path.join(outDir, "raw-child-stdout.frame.txt"))).toBe(false);
  });

  it("ceremony rejects localhost and wrong-project hosts before child", () => {
    const tip = tipSha();
    const local = runCeremony(
      ["-PrHead", tip, "-TestSyntheticDatabaseUrl", LOOPBACK_URL, "-TestHarnessChildStub", "success"],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(local.run.status).toBe(1);
    expect(String(local.payload.result_code || "")).toMatch(/DATABASE_PROJECT_REF_MISMATCH/);
    expect(local.payload.productionContact).toBe(false);
    expect((local.payload.cleanup as Record<string, unknown>).material_removed).toBe(true);

    const wrong = runCeremony(
      ["-PrHead", tip, "-TestSyntheticDatabaseUrl", WRONG_PROJECT_URL, "-TestHarnessChildStub", "success"],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(String(wrong.payload.result_code || "")).toMatch(/DATABASE_PROJECT_REF_MISMATCH/);
  });

  it("success stub cleans raw output and material with truthful cleanup fields", () => {
    const tip = tipSha();
    const { run, outDir, payload } = runCeremony(
      [
        "-PrHead",
        tip,
        "-TestSyntheticDatabaseUrl",
        PROJECT_URL,
        "-TestHarnessChildStub",
        "success",
      ],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(run.status, JSON.stringify(payload)).toBe(0);
    expect(payload.result_code).toBe("DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION");
    const cleanup = payload.cleanup as Record<string, unknown>;
    expect(cleanup.completed).toBe(true);
    expect(cleanup.raw_stdout_removed).toBe(true);
    expect(cleanup.material_removed).toBe(true);
    expect(cleanup.child_terminated).toBe(true);
    expect(cleanup.orphan_check_completed).toBe(true);
    expect(fs.existsSync(path.join(outDir, "raw-child-stdout.frame.txt"))).toBe(false);
    expect(fs.readdirSync(outDir).filter((f) => /^bundle-.*\.cjs$/.test(f))).toEqual([]);
    const supervision = payload.child_supervision as Record<string, unknown>;
    expect(supervision.orphan_free).toBe(true);
    expect(supervision.orphan_count).toBe(0);
    expect(supervision.timed_out).toBe(false);
    expect(Number(supervision.child_pid)).toBeGreaterThan(0);
  });

  it("timeout kills only the scoped child tree and leaves no scoped orphan", () => {
    const tip = tipSha();
    const { run, outDir, payload } = runCeremony(
      [
        "-PrHead",
        tip,
        "-TestSyntheticDatabaseUrl",
        PROJECT_URL,
        "-TestHarnessChildStub",
        "hang",
        "-ChildTimeoutMs",
        "1500",
      ],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(run.status).toBe(1);
    expect(String(payload.result_code || "")).toMatch(/CEREMONY_CHILD_TIMEOUT|CEREMONY_CLEANUP/);
    const cleanup = payload.cleanup as Record<string, unknown>;
    const supervision = payload.child_supervision as Record<string, unknown>;
    expect(supervision.timed_out).toBe(true);
    expect(cleanup.child_terminated).toBe(true);
    expect(supervision.orphan_free).toBe(true);
    expect(supervision.orphan_count).toBe(0);
    expect(cleanup.raw_stdout_removed).toBe(true);
    expect(cleanup.material_removed).toBe(true);
    expect(fs.readdirSync(outDir).filter((f) => /^bundle-.*\.cjs$/.test(f))).toEqual([]);
  });

  it("child failure and malformed output still clean up", () => {
    const tip = tipSha();
    for (const stub of ["fail", "malformed"] as const) {
      const { run, outDir, payload } = runCeremony(
        [
          "-PrHead",
          tip,
          "-TestSyntheticDatabaseUrl",
          PROJECT_URL,
          "-TestHarnessChildStub",
          stub,
        ],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
      );
      expect(run.status).toBe(1);
      const cleanup = payload.cleanup as Record<string, unknown>;
      expect(cleanup.raw_stdout_removed).toBe(true);
      expect(cleanup.material_removed).toBe(true);
      expect(cleanup.credential_cleared).toBe(true);
      expect(fs.existsSync(path.join(outDir, "raw-child-stdout.frame.txt"))).toBe(false);
    }
  });

  it("forced cleanup/termination failure fails closed", () => {
    const tip = tipSha();
    const cleanupFail = runCeremony(
      [
        "-PrHead",
        tip,
        "-TestSyntheticDatabaseUrl",
        PROJECT_URL,
        "-TestHarnessChildStub",
        "success",
        "-TestForceCleanupFailure",
      ],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(cleanupFail.run.status).toBe(1);
    expect(String(cleanupFail.payload.result_code || "")).toBe("CEREMONY_CLEANUP_FAILED");
    expect((cleanupFail.payload.cleanup as Record<string, unknown>).completed).toBe(false);

    const termFail = runCeremony(
      [
        "-PrHead",
        tip,
        "-TestSyntheticDatabaseUrl",
        PROJECT_URL,
        "-TestHarnessChildStub",
        "success",
        "-TestForceTerminateFailure",
      ],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(termFail.run.status).toBe(1);
    expect(String(termFail.payload.result_code || "")).toMatch(
      /CEREMONY_CHILD_TERMINATION_FAILED|CEREMONY_CLEANUP_FAILED/,
    );
  });

  it("records accepted precondition sha on dry-run blocked before URL", async () => {
    const result = await runApplicator({ mode: "dry-run", env: {} });
    expect(result.precondition_evidence?.sha256).toBe(PRECOND_SHA);
    expect(result.authorization_scope).toBe("dry_run_precondition_only");
  });
});

// silence unused helper in typecheck paths
void assertCleanupTruthful;
