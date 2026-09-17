/**
 * RA Pro visible-ceremony / Job Object contract tests.
 * Synthetic stubs only — zero DB, zero credentials, zero production contact.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SUPERVISE =
  "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1";
const LAUNCHER =
  "scripts/security/launch-visible-ra-pro-cutover-ceremony.ps1";
const ENTER =
  "scripts/security/enter-visible-ra-pro-cutover-ceremony.ps1";
const DRYRUN =
  "scripts/security/operator-ra-pro-cutover-production-dryrun-ceremony.ps1";
const APPLY =
  "scripts/security/operator-ra-pro-cutover-production-apply-ceremony.ps1";

const isWin = process.platform === "win32";

function src(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function systemPowerShell(): string {
  return path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

describe("RA Pro cutover ceremony launch", () => {
  it("ceremony scripts use RaProCutoverVisible.JobApi and RA Pro evidence protocol", () => {
    const supervise = src(SUPERVISE);
    expect(supervise).toMatch(/RaProCutoverVisible\.JobApi/);
    expect(supervise).not.toMatch(/FrlsVisible\.JobApi/);
    expect(supervise).toMatch(/RA_PRO_CUTOVER_EVIDENCE_V1/);
    expect(supervise).toMatch(/JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE/);

    for (const rel of [LAUNCHER, ENTER, DRYRUN, APPLY]) {
      const body = src(rel);
      expect(body.length).toBeGreaterThan(1000);
      expect(body).toMatch(/RA_PRO_CUTOVER/);
    }
    expect(src(DRYRUN)).toMatch(/RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL/);
  });

  it("creates a KILL_ON_JOB_CLOSE job with no breakaway (hard-kill containment)", () => {
    const s = src(SUPERVISE);
    expect(s).toMatch(/JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000/);
    expect(s).toMatch(/CreateJobObject/);
    expect(s).toMatch(/SetInformationJobObject/);
    expect(s).toMatch(/AssignProcessToJobObject/);
    expect(s).toMatch(/TerminateJobObject/);
    expect(s).toMatch(/CREATE_SUSPENDED = 0x00000004/);
    expect(s).not.toMatch(/JOB_OBJECT_LIMIT_BREAKAWAY_OK/);
    expect(s).not.toMatch(/JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK/);
    expect(s).not.toMatch(/CREATE_BREAKAWAY_FROM_JOB/);
  });

  it("assigns to the job before resuming the suspended child (fail-closed order)", () => {
    const s = src(SUPERVISE);
    const fn = s.indexOf("function Start-SuspendedInJob");
    expect(fn).toBeGreaterThan(0);
    const body = s.slice(fn);
    const createIdx = body.indexOf("[RaProCutoverVisible.JobApi]::CreateProcess(");
    const assignIdx = body.indexOf(
      "[RaProCutoverVisible.JobApi]::AssignProcessToJobObject(",
    );
    const resumeIdx = body.indexOf("[RaProCutoverVisible.JobApi]::ResumeThread(");
    expect(createIdx).toBeGreaterThan(0);
    expect(assignIdx).toBeGreaterThan(createIdx);
    expect(resumeIdx).toBeGreaterThan(assignIdx);
    expect(body).toMatch(/TestForceAssignFail/);
    expect(s).toMatch(/TestForceOperatorCancel/);
    expect(s).toMatch(/synthetic assign failure/);
    expect(s).toMatch(/BLOCKED_OPERATOR_CANCEL/);
  });

  it("exposes TestForceAssignFail / TestForceOperatorCancel switches on supervisor", () => {
    const s = src(SUPERVISE);
    expect(s).toMatch(/\[switch\]\$TestForceAssignFail/);
    expect(s).toMatch(/\[switch\]\$TestForceOperatorCancel/);
    expect(s).toMatch(/Format-Win32Argument "-TestForceAssignFail"/);
  });

  it.skipIf(!isWin)("supervisor fails closed when CeremonyKind missing (cancellation-safe)", () => {
    const r = spawnSync(
      systemPowerShell(),
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(ROOT, SUPERVISE),
        // Missing -CeremonyKind should fail before PROMPT_READY / DB
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        timeout: 60000,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          TEMP: process.env.TEMP,
          TMP: process.env.TMP,
        },
      },
    );
    expect(r.status).not.toBe(0);
    const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
    expect(combined).toMatch(/CeremonyKind|BLOCKED|Missing|required/i);
    expect(combined).not.toMatch(/postgres:\/\//i);
  });

  it.skipIf(!isWin)("supervisor fails closed on TestForceAssignFail before PROMPT_READY", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-sup-assign-"));
    const r = spawnSync(
      systemPowerShell(),
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(ROOT, SUPERVISE),
        "-PrHead",
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "-CeremonyKind",
        "dry-run",
        "-RepoRoot",
        ROOT,
        "-EvidenceOutDir",
        dir,
        "-TestForceAssignFail",
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        timeout: 120000,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          TEMP: process.env.TEMP,
          TMP: process.env.TMP,
        },
      },
    );
    expect(r.status).not.toBe(0);
    const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
    let reason = combined;
    const frame = combined.match(/RA_PRO_CUTOVER_EVIDENCE_V1:([A-Za-z0-9_-]+)/);
    if (frame) {
      let b64 = frame[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const ev = JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as {
        reason_code?: string;
        error_code?: string;
      };
      reason = `${ev.reason_code || ""} ${ev.error_code || ""}`;
    }
    // Unauthorized freeze hits pin gate before assign-fail; both are fail-closed.
    expect(reason).toMatch(/BLOCKED_JOB_OBJECT|BLOCKED_PIN_MISMATCH|BLOCKED_CHILD_START|assign/i);
    expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort cleanup */
    }
  });
});
