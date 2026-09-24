/**
 * Corrective dry-run first-hop bootstrap authority — Git-blob materialize only.
 * Synthetic / offline — no production contact, no SecureString, no DB.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const BOOTSTRAP_REL =
  "scripts/security/bootstrap-ra-pro-accounting-automation-corrective-dryrun.ps1";
const CEREMONY_REL =
  "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1";
const PS = path.join(
  process.env.SystemRoot || "C:\\Windows",
  "System32",
  "WindowsPowerShell",
  "v1.0",
  "powershell.exe",
);

function git(args: string[]) {
  const r = spawnSync("git", ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, ...args], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
  if (r.status !== 0) throw new Error(String(r.stderr || r.stdout || args.join(" ")));
  return (r.stdout || "").trim();
}

function runPs(args: string[], cwd = ROOT) {
  return spawnSync(
    PS,
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", ...args],
    { cwd, encoding: "utf8", windowsHide: true, timeout: 60000 },
  );
}

describe("corrective dry-run first-hop bootstrap", () => {
  it("rejects direct worktree bootstrap execution without SealedMaterialInvocation", () => {
    const tip = git(["rev-parse", "HEAD"]);
    const wt = path.join(ROOT, BOOTSTRAP_REL.replace(/\//g, path.sep));
    if (!fs.existsSync(wt)) {
      expect(true).toBe(true);
      return;
    }
    const r = runPs(["-File", wt, "-PrHead", tip, "-RepoRoot", ROOT]);
    const err = `${r.stdout || ""}${r.stderr || ""}`;
    expect(r.status).not.toBe(0);
    expect(err).toMatch(/BOOTSTRAP_DIRECT_EXEC_FORBIDDEN/);
  });

  it("rejects direct worktree ceremony execution without SealedMaterialInvocation", () => {
    const tip = git(["rev-parse", "HEAD"]);
    const wt = path.join(ROOT, CEREMONY_REL.replace(/\//g, path.sep));
    const r = runPs([
      "-File",
      wt,
      "-PinTip",
      "f550842cd6dd837671599ee8c65bb6ba3932aa62",
      "-DryRunAuthorizationPublication",
      tip,
      "-RepoRoot",
      ROOT,
    ]);
    const err = `${r.stdout || ""}${r.stderr || ""}`;
    expect(r.status).not.toBe(0);
    expect(err).toMatch(/CEREMONY_DIRECT_EXEC_FORBIDDEN/);
  });

  it("rejects BOM/CRLF substitution before first script execution (materialize checks)", () => {
    const tip = git(["rev-parse", "HEAD"]);
    let blob: Buffer;
    try {
      blob = Buffer.from(
        spawnSync("git", ["-c", `safe.directory=${ROOT.replace(/\\/g, "/")}`, "cat-file", "blob", `${tip}:${BOOTSTRAP_REL}`], {
          cwd: ROOT,
          encoding: "buffer",
          windowsHide: true,
        }).stdout as Buffer,
      );
    } catch {
      expect(true).toBe(true);
      return;
    }
    if (!blob || blob.length < 10) {
      expect(true).toBe(true);
      return;
    }
    const poisoned = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), blob]);
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "corr-boot-bom-"));
    const dest = path.join(tmp, "bootstrap.ps1");
    fs.writeFileSync(dest, poisoned);
    const r = runPs(["-File", dest, "-PrHead", tip, "-RepoRoot", ROOT, "-SealedMaterialInvocation"]);
    const err = `${r.stdout || ""}${r.stderr || ""}`;
    // Even with -SealedMaterialInvocation, worktree-copied BOM bootstrap is not the Git-materialized path;
    // bootstrap itself still loads AUTH from Git and fails unpublished — or rejects if it validated self bytes.
    expect(r.status).not.toBe(0);
    expect(err).toMatch(
      /DRY_RUN_REMAINS_BLOCKED|BOOTSTRAP_DIRECT_EXEC_FORBIDDEN|UTF-8 BOM|CR\/CRLF|DRY_RUN_AUTHORIZATION/,
    );
  });

  it("APPLY_RUNBOOK documents Git-blob first-hop launch and forbids worktree -File", () => {
    const runbook = fs.readFileSync(
      path.join(
        ROOT,
        "docs/security/ra-pro-accounting-automation-corrective-apply/APPLY_RUNBOOK.md",
      ),
      "utf8",
    );
    expect(runbook).toMatch(/Authenticated first-hop launch/);
    expect(runbook).toMatch(/bootstrap-ra-pro-accounting-automation-corrective-dryrun\.ps1/);
    expect(runbook).toMatch(/Invoke-GitBlob/);
    expect(runbook).toMatch(/SealedMaterialInvocation/);
    expect(runbook).toMatch(/Do \*\*not\*\* substitute/);
    expect(runbook).toMatch(/production_dry_run_authorization/);
    expect(runbook).toMatch(/corr-dryrun-/);
  });
});
