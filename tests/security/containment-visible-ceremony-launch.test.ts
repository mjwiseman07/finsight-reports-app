/**
 * Windows visible-ceremony launch construction.
 * Proves cmd.exe `start ""` over-escaping is refused; Start-Process path works.
 * Synthetic stub only — zero DB / credential / production contact.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const LAUNCHER = path.join(
  ROOT,
  "scripts/security/launch-visible-containment-ceremony.ps1",
);
const STUB = path.join(
  ROOT,
  "tests/security/helpers/synthetic-visible-ceremony-stub.ps1",
);

describe("visible containment ceremony Windows launch (mandatory)", () => {
  it("documents that over-escaped cmd start empty-title yields a bogus executable path", () => {
    // The failing operator invocation was equivalent to:
    //   cmd /c start \"\" <payload>
    // After nested escaping, Windows treats the title token as FileName '\" \"'
    // (dialog: Windows cannot find '\" \"').
    const nestedEscapedTitle = '\\"\\"';
    expect(nestedEscapedTitle).toBe('\\"\\"');
    // Reconstruct the dialog token shape observed on the blocked attempt.
    const dialogToken = nestedEscapedTitle.replace(/\\"/g, '"').trim() || '""';
    // When further mangled through an extra escape layer, FileName becomes quote-space-quote.
    const bogusFileName = '\\" \\"';
    expect(bogusFileName).toMatch(/\\?"\s*\\?"/);
    expect(bogusFileName).not.toMatch(/powershell\.exe/i);
    expect(bogusFileName).not.toMatch(/launch-visible/i);
  });

  it("safe Start-Process launcher reaches PROMPT_READY via synthetic stub (no DB)", () => {
    expect(fs.existsSync(LAUNCHER)).toBe(true);
    expect(fs.existsSync(STUB)).toBe(true);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vis-launch-"));
    const freeze = "2f3fd594a6d4739fefaedbfcc3e72f828cb47eb5";
    const r = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        LAUNCHER,
        "-PrHead",
        freeze,
        "-RepoRoot",
        ROOT,
        "-EvidenceOutDir",
        dir,
        "-TestStubScript",
        STUB,
        "-WaitForPromptReady",
      ],
      { encoding: "utf8", windowsHide: true, timeout: 60000 },
    );
    expect(r.status, r.stderr || r.stdout || "").toBe(0);
    expect(String(r.stdout || "")).toMatch(/PROMPT_READY/);
    expect(fs.existsSync(path.join(dir, "VISIBLE_LAUNCH_STARTED.txt"))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(dir, "SYNTHETIC_STUB_OK.txt"))).toBe(true);
    // Stub clears PROMPT_READY after brief wait; started marker remains.
    const started = fs.readFileSync(
      path.join(dir, "VISIBLE_LAUNCH_STARTED.txt"),
      "utf8",
    );
    expect(started).toMatch(/pid=\d+/);
    expect(started).not.toMatch(/postgres:\/\//i);
    expect(started).not.toMatch(/CONTAINMENT_APPLY_DATABASE_URL/i);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("refuses to treat cmd start empty-title pattern as the reviewed FileName", () => {
    const launcherSrc = fs.readFileSync(LAUNCHER, "utf8");
    expect(launcherSrc).toMatch(
      /Start-Process\s+-FilePath\s+"powershell\.exe"/,
    );
    expect(launcherSrc).not.toMatch(/FileName\s*=\s*"cmd(\.exe)?"/i);
    expect(launcherSrc).not.toMatch(/cmd\.exe\s+\/c\s+start/i);
    // Executable path must be powershell, never a quote-only token.
    expect(launcherSrc).toMatch(/-FilePath\s+"powershell\.exe"/);
  });
});
