/**
 * Windows visible-ceremony launch / trust-root e2e (mandatory).
 * Synthetic stubs only — zero DB / credential / production contact.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
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

function decodeEvidenceFrame(stdout: string): Record<string, unknown> | null {
  const m = String(stdout || "").match(/CONTAINMENT_EVIDENCE_V1:([A-Za-z0-9_-]+)/);
  if (!m) return null;
  let b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

function runLauncher(opts: {
  evidenceDir: string;
  ceremony: string;
  prHead?: string;
  wait?: boolean;
  timeoutSec?: number;
  expectedCeremonySha?: string;
  expectedCeremonyBytes?: number;
  expectedLauncherSha?: string;
  expectedLauncherBytes?: number;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}) {
  const ceremonySha = opts.expectedCeremonySha ?? sha256File(opts.ceremony);
  const ceremonyBytes =
    opts.expectedCeremonyBytes ?? fs.statSync(opts.ceremony).size;
  const launcherSha = opts.expectedLauncherSha ?? sha256File(LAUNCHER);
  const launcherBytes =
    opts.expectedLauncherBytes ?? fs.statSync(LAUNCHER).size;
  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    LAUNCHER,
    "-PrHead",
    opts.prHead ?? "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "-RepoRoot",
    ROOT,
    "-EvidenceOutDir",
    opts.evidenceDir,
    "-CeremonyScriptPath",
    opts.ceremony,
    "-ExpectedCeremonySha256",
    ceremonySha,
    "-ExpectedCeremonyBytes",
    String(ceremonyBytes),
    "-ExpectedLauncherSha256",
    launcherSha,
    "-ExpectedLauncherBytes",
    String(launcherBytes),
  ];
  if (opts.wait !== false) {
    args.push("-WaitForPromptReady");
    args.push("-PromptReadyTimeoutSec");
    args.push(String(opts.timeoutSec ?? 30));
  }
  return spawnSync(systemPowerShell(), args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: opts.timeoutMs ?? 90000,
    env: { ...process.env, ...(opts.env || {}) },
  });
}

function runEnter(opts: {
  evidenceDir: string;
  prHead: string;
  stub?: string;
  wait?: boolean;
  timeoutSec?: number;
  timeoutMs?: number;
}) {
  const args = [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    ENTER,
    "-PrHead",
    opts.prHead,
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
    args.push(String(opts.timeoutSec ?? 60));
  }
  return spawnSync(systemPowerShell(), args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: opts.timeoutMs ?? 120000,
  });
}

describe("visible containment ceremony Windows launch (mandatory)", () => {
  it("refuses cmd.exe / PATH-relative powershell as the reviewed FileName", () => {
    const launcherSrc = fs.readFileSync(LAUNCHER, "utf8");
    const enterSrc = fs.readFileSync(ENTER, "utf8");
    for (const src of [launcherSrc, enterSrc]) {
      expect(src).toMatch(/System32\\WindowsPowerShell\\v1\.0\\powershell\.exe/);
      expect(src).toMatch(/ProcessStartInfo/);
      expect(src).toMatch(/Format-Win32Argument/);
      expect(src).not.toMatch(/FileName\s*=\s*"cmd(\.exe)?"/i);
      expect(src).not.toMatch(/cmd\.exe\s+\/c\s+start/i);
      expect(src).not.toMatch(/Start-Process\s+-FilePath\s+"powershell\.exe"/);
    }
  });

  it("preserves exact argv for paths with spaces, &, (), apostrophe, Unicode, trailing sep", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "vis-argv-"));
    const evidenceDir = path.join(
      base,
      "evidence dir (test) & more",
      "café's",
      "trail\\",
    );
    fs.mkdirSync(evidenceDir, { recursive: true });
    // Normalize trailing sep the way operators might type it.
    const evidenceWithTrail = evidenceDir.endsWith(path.sep)
      ? evidenceDir
      : evidenceDir + path.sep;

    const r = runLauncher({
      evidenceDir: evidenceWithTrail,
      ceremony: ARGV_STUB,
      timeoutSec: 20,
    });
    expect(r.status, r.stderr || r.stdout || "").toBe(0);
    expect(String(r.stdout || "")).toMatch(/PROMPT_READY/);
    const argvPath = path.join(evidenceWithTrail, "SYNTHETIC_ARGV.json");
    expect(fs.existsSync(argvPath)).toBe(true);
    const argv = JSON.parse(fs.readFileSync(argvPath, "utf8")) as {
      EvidenceOutDir: string;
      RepoRoot: string;
    };
    // Child must see the same evidence path boundary (trailing sep may normalize).
    expect(path.normalize(argv.EvidenceOutDir)).toBe(
      path.normalize(evidenceWithTrail),
    );
    expect(path.normalize(argv.RepoRoot)).toBe(path.normalize(ROOT));
    expect(fs.readFileSync(argvPath, "utf8")).not.toMatch(/postgres:\/\//i);
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("fail-closes on NUL/newline injection in EvidenceOutDir", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-inj-"));
    const evil = path.join(dir, "ok") + "\n-Evil";
    const r = runLauncher({
      evidenceDir: evil,
      ceremony: STUB,
      timeoutSec: 10,
      timeoutMs: 30000,
    });
    expect(r.status).not.toBe(0);
    const ev =
      decodeEvidenceFrame(String(r.stdout || "")) ||
      (fs.existsSync(path.join(dir, "VISIBLE_LAUNCH_EVIDENCE.json"))
        ? JSON.parse(
            fs.readFileSync(
              path.join(dir, "VISIBLE_LAUNCH_EVIDENCE.json"),
              "utf8",
            ),
          )
        : null);
    // Injection may prevent evidence dir creation; either blocked code or non-zero is required.
    if (ev) {
      expect(String(ev.reason_code || ev.error_code)).toMatch(
        /BLOCKED_INPUT_INJECTION|BLOCKED_INPUT_INVALID|BLOCKED/,
      );
      expect(ev.databaseConnectionAttempts).toBe(0);
      expect(ev.sqlApplicationAttempts).toBe(0);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("ignores PATH-shim powershell.exe and still reaches PROMPT_READY", () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), "vis-shim-"));
    const shimDir = path.join(base, "shim");
    fs.mkdirSync(shimDir, { recursive: true });
    // Non-executable marker file named powershell.exe — if PATH were used, start would fail.
    fs.writeFileSync(
      path.join(shimDir, "powershell.exe"),
      "@echo off\r\nexit /b 99\r\n",
    );
    const evidenceDir = path.join(base, "evidence");
    fs.mkdirSync(evidenceDir);
    const r = runLauncher({
      evidenceDir,
      ceremony: STUB,
      env: {
        PATH: `${shimDir};${process.env.PATH || ""}`,
      },
    });
    expect(r.status, r.stderr || r.stdout || "").toBe(0);
    expect(String(r.stdout || "")).toMatch(/PROMPT_READY/);
    const idPath = path.join(evidenceDir, "VISIBLE_LAUNCH_PS_IDENTITY.json");
    expect(fs.existsSync(idPath)).toBe(true);
    const id = JSON.parse(fs.readFileSync(idPath, "utf8")) as {
      basename: string;
      path_hijack_ignored: boolean;
      absolute_path?: string;
    };
    expect(id.basename).toBe("powershell.exe");
    expect(id.path_hijack_ignored).toBe(true);
    expect(id.absolute_path).toBeUndefined();
    fs.rmSync(base, { recursive: true, force: true });
  });

  it("fail-closes on ceremony seal mismatch with structured V1 evidence", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-seal-"));
    const r = runLauncher({
      evidenceDir: dir,
      ceremony: STUB,
      expectedCeremonySha: "0".repeat(64),
      expectedCeremonyBytes: 1,
      timeoutSec: 10,
    });
    expect(r.status).not.toBe(0);
    const frame = decodeEvidenceFrame(String(r.stdout || ""));
    const fileEv = JSON.parse(
      fs.readFileSync(path.join(dir, "VISIBLE_LAUNCH_EVIDENCE.json"), "utf8"),
    ) as Record<string, unknown>;
    const ev = frame || fileEv;
    expect(ev.reason_code).toBe("BLOCKED_SEAL_MISMATCH");
    expect(ev.databaseConnectionAttempts).toBe(0);
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(ev.advisory_lock_acquired).toBe(false);
    expect(ev.prompt_ready_observed).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("timeout kills hang stub and emits BLOCKED_PROMPT_TIMEOUT with cleanup", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-hang-"));
    const r = runLauncher({
      evidenceDir: dir,
      ceremony: HANG_STUB,
      timeoutSec: 3,
      timeoutMs: 60000,
    });
    expect(r.status).not.toBe(0);
    const frame = decodeEvidenceFrame(String(r.stdout || ""));
    const fileEv = JSON.parse(
      fs.readFileSync(path.join(dir, "VISIBLE_LAUNCH_EVIDENCE.json"), "utf8"),
    ) as Record<string, unknown>;
    const ev = frame || fileEv;
    expect(ev.reason_code).toBe("BLOCKED_PROMPT_TIMEOUT");
    expect(ev.databaseConnectionAttempts).toBe(0);
    expect(ev.sqlApplicationAttempts).toBe(0);
    const cleanup = ev.cleanup as { child?: { terminated?: boolean } };
    expect(cleanup?.child?.terminated).toBe(true);
    expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("verified freeze-materialized enter reaches PROMPT_READY (tip→freeze seals)", () => {
    expect(fs.existsSync(ENTER)).toBe(true);
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8")) as {
      authorized_pr_head: string;
      visible_ceremony_entry?: { sha256: string; bytes: number };
      visible_ceremony_launcher: { sha256: string; bytes: number };
    };
    // Requires published tip pin (no PENDING). Run after freeze→tip publication.
    if (
      !/^[0-9a-f]{40}$/i.test(auth.authorized_pr_head) ||
      /PENDING/i.test(auth.authorized_pr_head)
    ) {
      throw new Error(
        "authorized_pr_head must be pinned before enter e2e (got " +
          auth.authorized_pr_head +
          ")",
      );
    }
    expect(sha256File(LAUNCHER)).toBe(auth.visible_ceremony_launcher.sha256);
    expect(fs.statSync(LAUNCHER).size).toBe(
      auth.visible_ceremony_launcher.bytes,
    );
    if (auth.visible_ceremony_entry) {
      expect(sha256File(ENTER)).toBe(auth.visible_ceremony_entry.sha256);
    }

    const dir = fs.mkdtempSync(
      path.join(os.tmpdir(), "vis-enter (ok) & café-"),
    );
    // Corrupt worktree launcher bytes — enter must still use freeze materialization.
    const backup = fs.readFileSync(LAUNCHER);
    try {
      fs.appendFileSync(LAUNCHER, "\n# CORRUPT_WORKTREE_TEST\n");
      const r = runEnter({
        evidenceDir: dir,
        prHead: auth.authorized_pr_head,
        stub: STUB,
        timeoutSec: 45,
      });
      expect(r.status, r.stderr || r.stdout || "").toBe(0);
      expect(String(r.stdout || "")).toMatch(/PROMPT_READY/);
      expect(fs.existsSync(path.join(dir, "SYNTHETIC_STUB_OK.txt"))).toBe(true);
      expect(fs.existsSync(path.join(dir, "VISIBLE_LAUNCH_STARTED.txt"))).toBe(
        true,
      );
      const started = fs.readFileSync(
        path.join(dir, "VISIBLE_LAUNCH_STARTED.txt"),
        "utf8",
      );
      expect(started).toMatch(/pid=\d+/);
      expect(started).not.toMatch(/postgres:\/\//i);
      expect(started).not.toMatch(/CONTAINMENT_APPLY_DATABASE_URL/i);
    } finally {
      fs.writeFileSync(LAUNCHER, backup);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("enter fail-closes on wrong PrHead with structured V1 evidence", () => {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8")) as {
      authorized_pr_head: string;
    };
    if (!/^[0-9a-f]{40}$/.test(auth.authorized_pr_head)) {
      return;
    }
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-enter-bad-"));
    const r = runEnter({
      evidenceDir: dir,
      prHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      stub: STUB,
      timeoutSec: 15,
    });
    expect(r.status).not.toBe(0);
    const frame = decodeEvidenceFrame(String(r.stdout || ""));
    const filePath = path.join(dir, "VISIBLE_ENTRY_EVIDENCE.json");
    const fileEv = fs.existsSync(filePath)
      ? (JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<
          string,
          unknown
        >)
      : null;
    const ev = frame || fileEv;
    expect(ev).toBeTruthy();
    expect(String(ev!.reason_code)).toBe("BLOCKED_PIN_MISMATCH");
    expect(ev!.databaseConnectionAttempts).toBe(0);
    expect(ev!.sqlApplicationAttempts).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
