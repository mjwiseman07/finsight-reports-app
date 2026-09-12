/**
 * Windows visible-ceremony supervisor / Job Object e2e (mandatory).
 * Synthetic stubs only — zero DB / credential / production contact.
 */
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SUPERVISE = path.join(
  ROOT,
  "scripts/security/supervise-visible-containment-ceremony.ps1",
);
const ENTER = path.join(
  ROOT,
  "scripts/security/enter-visible-containment-ceremony.ps1",
);
const LAUNCHER = path.join(
  ROOT,
  "scripts/security/launch-visible-containment-ceremony.ps1",
);
const STUB = path.join(
  ROOT,
  "tests/security/helpers/synthetic-visible-ceremony-stub.ps1",
);
const ARGV_STUB = path.join(
  ROOT,
  "tests/security/helpers/synthetic-visible-ceremony-argv-stub.ps1",
);
const HANG_STUB = path.join(
  ROOT,
  "tests/security/helpers/synthetic-visible-ceremony-hang-stub.ps1",
);
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json",
);

function sha256File(p: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function systemPowerShell(): string {
  const sysRoot = process.env.SystemRoot || "C:\\Windows";
  return path.join(
    sysRoot,
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

function taskkill(): string {
  return path.join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe");
}

function decodeEvidenceFrame(stdout: string): Record<string, unknown> | null {
  const m = String(stdout || "").match(
    /CONTAINMENT_EVIDENCE_V1:([A-Za-z0-9_-]+)/,
  );
  if (!m) return null;
  let b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

function authFreeze(): string {
  const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8")) as {
    authorized_pr_head: string;
  };
  if (
    !/^[0-9a-f]{40}$/i.test(auth.authorized_pr_head) ||
    /PENDING/i.test(auth.authorized_pr_head)
  ) {
    throw new Error(
      "authorized_pr_head must be pinned (got " + auth.authorized_pr_head + ")",
    );
  }
  return auth.authorized_pr_head;
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function listHangPids(): number[] {
  const r = spawnSync(
    systemPowerShell(),
    [
      "-NoProfile",
      "-Command",
      "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -and $_.CommandLine -match 'synthetic-visible-ceremony-hang' -and $_.CommandLine -notmatch 'Where-Object' } | ForEach-Object { $_.ProcessId }",
    ],
    { encoding: "utf8", windowsHide: true, timeout: 30000 },
  );
  return String(r.stdout || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => /^\d+$/.test(s))
    .map((s) => Number(s));
}

function runSupervise(opts: {
  evidenceDir: string;
  stub?: string;
  wait?: boolean;
  timeoutSec?: number;
  timeoutMs?: number;
  forcePsFail?: boolean;
  forceChildFail?: boolean;
  prHead?: string;
  env?: NodeJS.ProcessEnv;
}): ReturnType<typeof spawnSync> {
  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    SUPERVISE,
    "-PrHead",
    opts.prHead ?? authFreeze(),
    "-RepoRoot",
    ROOT,
    "-EvidenceOutDir",
    opts.evidenceDir,
  ];
  if (opts.stub) {
    args.push("-TestStubScript", opts.stub);
  }
  if (opts.wait !== false) {
    args.push("-WaitForPromptReady");
    args.push("-PromptReadyTimeoutSec");
    args.push(String(opts.timeoutSec ?? 45));
  }
  if (opts.forcePsFail) args.push("-TestForcePowerShellIdentityFail");
  if (opts.forceChildFail) args.push("-TestForceChildStartFail");
  return spawnSync(systemPowerShell(), args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: opts.timeoutMs ?? 180000,
    env: { ...process.env, ...(opts.env || {}) },
  });
}

function readSupervisorEvidence(dir: string, stdout: string) {
  const frame = decodeEvidenceFrame(stdout);
  const p = path.join(dir, "VISIBLE_SUPERVISOR_EVIDENCE.json");
  const file = fs.existsSync(p)
    ? (JSON.parse(fs.readFileSync(p, "utf8")) as Record<string, unknown>)
    : null;
  return frame || file;
}

describe("visible containment ceremony Windows launch (mandatory)", () => {
  it("refuses cmd.exe / PATH-relative powershell; requires JobApi supervisor", () => {
    const superviseSrc = fs.readFileSync(SUPERVISE, "utf8");
    const launcherSrc = fs.readFileSync(LAUNCHER, "utf8");
    const enterSrc = fs.readFileSync(ENTER, "utf8");
    for (const src of [superviseSrc, launcherSrc, enterSrc]) {
      expect(src).toMatch(/System32\\WindowsPowerShell\\v1\.0\\powershell\.exe/);
      expect(src).toMatch(/Format-Win32Argument/);
      expect(src).not.toMatch(/cmd\.exe\s+\/c\s+start/i);
      expect(src).not.toMatch(/Start-Process\s+-FilePath\s+"powershell\.exe"/);
    }
    expect(superviseSrc).toMatch(/ContainmentVisible\.JobApi/);
    expect(superviseSrc).toMatch(/JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE/);
    expect(superviseSrc).toMatch(/AssignProcessToJobObject/);
    expect(superviseSrc).toMatch(/CREATE_SUSPENDED/);
    expect(superviseSrc).not.toMatch(/JOB_OBJECT_LIMIT_BREAKAWAY_OK/);
    expect(superviseSrc).not.toMatch(/JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK/);
    expect(superviseSrc).not.toMatch(/CREATE_BREAKAWAY_FROM_JOB/);
  });

  it("preserves exact argv for special evidence paths via supervisor", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "vis-argv-"));
    const evidenceDir =
      path.join(base, "evidence dir (test) & more", "café's", "trail") +
      path.sep;
    fs.mkdirSync(evidenceDir, { recursive: true });
    const r = runSupervise({
      evidenceDir,
      stub: ARGV_STUB,
      timeoutSec: 40,
    });
    expect(r.status, r.stderr || r.stdout || "").toBe(0);
    expect(String(r.stdout || "")).toMatch(/PROMPT_READY/);
    const argvPath = path.join(evidenceDir, "SYNTHETIC_ARGV.json");
    expect(fs.existsSync(argvPath)).toBe(true);
    const argv = JSON.parse(fs.readFileSync(argvPath, "utf8")) as {
      EvidenceOutDir: string;
      RepoRoot: string;
    };
    expect(path.normalize(argv.EvidenceOutDir)).toBe(
      path.normalize(evidenceDir),
    );
    expect(path.normalize(argv.RepoRoot)).toBe(path.normalize(ROOT));
    // material-* cleaned after success
    const mats = fs
      .readdirSync(evidenceDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("material-"));
    expect(mats.length).toBe(0);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("fail-closes on NUL/newline injection in EvidenceOutDir", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-inj-"));
    const evil = path.join(dir, "ok") + "\n-Evil";
    const r = runSupervise({
      evidenceDir: evil,
      stub: STUB,
      timeoutSec: 15,
      timeoutMs: 60000,
    });
    expect(r.status).not.toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("ignores PATH-shim powershell.exe and records path_hijack_ignored", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "vis-shim-"));
    const shimDir = path.join(base, "shim");
    fs.mkdirSync(shimDir, { recursive: true });
    fs.writeFileSync(
      path.join(shimDir, "powershell.exe"),
      "@echo off\r\nexit /b 99\r\n",
    );
    const evidenceDir = path.join(base, "evidence");
    fs.mkdirSync(evidenceDir);
    const r = runSupervise({
      evidenceDir,
      stub: STUB,
      env: { PATH: `${shimDir};${process.env.PATH || ""}` },
    });
    expect(r.status, r.stderr || r.stdout || "").toBe(0);
    const id = JSON.parse(
      fs.readFileSync(
        path.join(evidenceDir, "VISIBLE_SUPERVISOR_PS_IDENTITY.json"),
        "utf8",
      ),
    ) as { path_hijack_ignored: boolean; absolute_path?: string };
    expect(id.path_hijack_ignored).toBe(true);
    expect(id.absolute_path).toBeUndefined();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("emits BLOCKED_POWERSHELL_IDENTITY with zero attempts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-psid-"));
    const r = runSupervise({
      evidenceDir: dir,
      stub: STUB,
      forcePsFail: true,
      timeoutSec: 20,
    });
    expect(r.status).not.toBe(0);
    const ev = readSupervisorEvidence(dir, String(r.stdout || ""));
    expect(ev).toBeTruthy();
    expect(ev!.reason_code).toBe("BLOCKED_POWERSHELL_IDENTITY");
    expect(ev!.databaseConnectionAttempts).toBe(0);
    expect(ev!.sqlApplicationAttempts).toBe(0);
    expect(ev!.advisory_lock_acquired).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("emits BLOCKED_CHILD_START with zero attempts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-cstart-"));
    const r = runSupervise({
      evidenceDir: dir,
      stub: STUB,
      forceChildFail: true,
      timeoutSec: 20,
    });
    expect(r.status).not.toBe(0);
    const ev = readSupervisorEvidence(dir, String(r.stdout || ""));
    expect(ev).toBeTruthy();
    expect(ev!.reason_code).toBe("BLOCKED_CHILD_START");
    expect(ev!.databaseConnectionAttempts).toBe(0);
    expect(ev!.sqlApplicationAttempts).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("timeout kills hang tree and cleans material with V1 evidence", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-hang-"));
    const before = new Set(listHangPids());
    const r = runSupervise({
      evidenceDir: dir,
      stub: HANG_STUB,
      timeoutSec: 4,
      timeoutMs: 90000,
    });
    expect(r.status).not.toBe(0);
    const ev = readSupervisorEvidence(dir, String(r.stdout || ""));
    expect(ev!.reason_code).toBe("BLOCKED_PROMPT_TIMEOUT");
    expect(ev!.databaseConnectionAttempts).toBe(0);
    const hangPidPath = path.join(dir, "SYNTHETIC_HANG_PID.txt");
    if (fs.existsSync(hangPidPath)) {
      const hp = Number(fs.readFileSync(hangPidPath, "utf8").trim());
      expect(pidAlive(hp)).toBe(false);
    }
    const after = listHangPids().filter((p) => !before.has(p));
    expect(after.length).toBe(0);
    const mats = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("material-"));
    expect(mats.length).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("hard-kill enter after VISIBLE_LAUNCH_STARTED leaves zero orphans (supervisor survives)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-hardkill-"));
    const freeze = authFreeze();
    const child = spawn(
      systemPowerShell(),
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        SUPERVISE,
        "-PrHead",
        freeze,
        "-RepoRoot",
        ROOT,
        "-EvidenceOutDir",
        dir,
        "-TestStubScript",
        HANG_STUB,
        "-WaitForPromptReady",
        "-PromptReadyTimeoutSec",
        "60",
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });

    const startedPath = path.join(dir, "VISIBLE_LAUNCH_STARTED.txt");
    const entryStarted = path.join(dir, "VISIBLE_ENTRY_STARTED.txt");
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      if (fs.existsSync(startedPath) || fs.existsSync(entryStarted)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(
      fs.existsSync(startedPath) || fs.existsSync(entryStarted),
    ).toBe(true);

    // Hard-kill the enter process (not supervisor) using VISIBLE_SUPERVISOR_STARTED enter_pid
    const supStarted = path.join(dir, "VISIBLE_SUPERVISOR_STARTED.txt");
    expect(fs.existsSync(supStarted)).toBe(true);
    const enterPid = Number(
      fs.readFileSync(supStarted, "utf8").match(/enter_pid=(\d+)/)?.[1],
    );
    expect(enterPid).toBeGreaterThan(0);
    spawnSync(taskkill(), ["/PID", String(enterPid), "/T", "/F"], {
      windowsHide: true,
    });

    const exitCode = await new Promise<number | null>((resolve) => {
      const t = setTimeout(() => {
        try {
          spawnSync(taskkill(), ["/PID", String(child.pid), "/T", "/F"], {
            windowsHide: true,
          });
        } catch {}
        resolve(null);
      }, 90000);
      child.on("exit", (code) => {
        clearTimeout(t);
        resolve(code);
      });
    });
    expect(exitCode).not.toBeNull();
    expect(exitCode).not.toBe(0);

    const hangPidPath = path.join(dir, "SYNTHETIC_HANG_PID.txt");
    if (fs.existsSync(hangPidPath)) {
      const hp = Number(fs.readFileSync(hangPidPath, "utf8").trim());
      expect(pidAlive(hp)).toBe(false);
    }
    expect(listHangPids().length).toBe(0);

    const ev = readSupervisorEvidence(dir, stdout);
    expect(ev).toBeTruthy();
    expect(String(ev!.reason_code)).toMatch(
      /BLOCKED_ENTER_TERMINATED|BLOCKED_CHILD_EXIT|BLOCKED_PROMPT_TIMEOUT/,
    );
    expect(ev!.databaseConnectionAttempts).toBe(0);
    expect(ev!.sqlApplicationAttempts).toBe(0);
    const orphan = JSON.parse(
      fs.readFileSync(path.join(dir, "SUPERVISOR_ORPHAN_CHECK.json"), "utf8"),
    ) as { sentinel_alive: boolean; material_cleaned: boolean };
    expect(orphan.sentinel_alive).toBe(false);
    expect(orphan.material_cleaned).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120000);

  it("supervisor hard-kill still kills job tree (no V1 required; zero orphans)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-supkill-"));
    const freeze = authFreeze();
    const child = spawn(
      systemPowerShell(),
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        SUPERVISE,
        "-PrHead",
        freeze,
        "-RepoRoot",
        ROOT,
        "-EvidenceOutDir",
        dir,
        "-TestStubScript",
        HANG_STUB,
        "-WaitForPromptReady",
        "-PromptReadyTimeoutSec",
        "60",
      ],
      { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] },
    );
    const startedPath = path.join(dir, "VISIBLE_LAUNCH_STARTED.txt");
    const deadline = Date.now() + 45000;
    while (Date.now() < deadline) {
      if (fs.existsSync(startedPath)) break;
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(fs.existsSync(startedPath)).toBe(true);
    let hangPid: number | null = null;
    const hangPidPath = path.join(dir, "SYNTHETIC_HANG_PID.txt");
    // hang stub may write slightly after launch started
    for (let i = 0; i < 50; i++) {
      if (fs.existsSync(hangPidPath)) {
        hangPid = Number(fs.readFileSync(hangPidPath, "utf8").trim());
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(hangPid).toBeTruthy();
    expect(pidAlive(hangPid!)).toBe(true);

    // Hard-kill supervisor — job handle close must kill descendants.
    spawnSync(taskkill(), ["/PID", String(child.pid), "/T", "/F"], {
      windowsHide: true,
    });
    await new Promise((r) => setTimeout(r, 3000));
    expect(pidAlive(hangPid!)).toBe(false);
    expect(listHangPids().length).toBe(0);
    // No claim that V1 survives supervisor death.
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120000);

  it("child crash before PROMPT_READY yields structured V1 zero-attempt evidence", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-crash-"));
    const crash = path.join(dir, "crash-stub.ps1");
    fs.writeFileSync(
      crash,
      "param($PrHead,$RepoRoot,$EvidenceOutDir,$SupervisorSentinel)\nexit 44\n",
    );
    const r = runSupervise({
      evidenceDir: dir,
      stub: crash,
      timeoutSec: 30,
    });
    expect(r.status).not.toBe(0);
    const ev = readSupervisorEvidence(dir, String(r.stdout || ""));
    expect(ev).toBeTruthy();
    expect(String(ev!.reason_code)).toMatch(
      /BLOCKED_ENTER_TERMINATED|BLOCKED_CHILD_EXIT/,
    );
    expect(ev!.databaseConnectionAttempts).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("verified tip-materialized entry reaches PROMPT_READY; corrupt worktree ignored", () => {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8")) as {
      authorized_pr_head: string;
      visible_ceremony_supervisor?: { sha256: string; bytes: number };
      visible_ceremony_entry: { sha256: string; bytes: number };
      visible_ceremony_launcher: { sha256: string; bytes: number };
    };
    expect(sha256File(SUPERVISE)).toBe(auth.visible_ceremony_supervisor!.sha256);
    expect(sha256File(ENTER)).toBe(auth.visible_ceremony_entry.sha256);
    expect(sha256File(LAUNCHER)).toBe(auth.visible_ceremony_launcher.sha256);

    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "vis-enter (ok) & café-"),
    );
    const backupLaunch = fs.readFileSync(LAUNCHER);
    const backupEnter = fs.readFileSync(ENTER);
    try {
      fs.appendFileSync(LAUNCHER, "\n# CORRUPT_WORKTREE_LAUNCHER\n");
      fs.appendFileSync(ENTER, "\n# CORRUPT_WORKTREE_ENTRY\n");
      const r = runSupervise({
        evidenceDir: dir,
        stub: STUB,
        timeoutSec: 45,
      });
      expect(r.status, r.stderr || r.stdout || "").toBe(0);
      expect(String(r.stdout || "")).toMatch(/PROMPT_READY/);
      expect(fs.existsSync(path.join(dir, "SYNTHETIC_STUB_OK.txt"))).toBe(true);
    } finally {
      fs.writeFileSync(LAUNCHER, backupLaunch);
      fs.writeFileSync(ENTER, backupEnter);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("enter fail-closes on wrong PrHead via supervisor", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-badpin-"));
    const r = runSupervise({
      evidenceDir: dir,
      stub: STUB,
      prHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      timeoutSec: 15,
    });
    expect(r.status).not.toBe(0);
    const ev = readSupervisorEvidence(dir, String(r.stdout || ""));
    expect(ev!.reason_code).toBe("BLOCKED_PIN_MISMATCH");
    expect(ev!.databaseConnectionAttempts).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
