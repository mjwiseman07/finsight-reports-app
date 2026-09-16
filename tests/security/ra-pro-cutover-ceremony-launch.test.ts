/**
 * Thin RA Pro visible-ceremony / Job Object contract tests.
 * Synthetic stubs only — zero DB, zero credentials, zero production contact.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
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

describe("RA Pro cutover ceremony launch (thin)", () => {
  it("ceremony scripts use RaProCutoverVisible.JobApi and RA Pro evidence protocol", () => {
    const supervise = fs.readFileSync(path.join(ROOT, SUPERVISE), "utf8");
    expect(supervise).toMatch(/RaProCutoverVisible\.JobApi/);
    expect(supervise).not.toMatch(/FrlsVisible\.JobApi/);
    expect(supervise).toMatch(/RA_PRO_CUTOVER_EVIDENCE_V1/);
    expect(supervise).toMatch(/JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE/);

    for (const rel of [LAUNCHER, ENTER, DRYRUN, APPLY]) {
      const body = fs.readFileSync(path.join(ROOT, rel), "utf8");
      expect(body.length).toBeGreaterThan(1000);
      expect(body).toMatch(/RA_PRO_CUTOVER/);
    }
    expect(fs.readFileSync(path.join(ROOT, DRYRUN), "utf8")).toMatch(
      /RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL/,
    );
  });

  it.skipIf(!isWin)("supervisor fails closed when CeremonyKind missing (cancellation-safe)", () => {
    const ps = path.join(
      process.env.SystemRoot || "C:\\Windows",
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe",
    );
    const r = spawnSync(
      ps,
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
});
