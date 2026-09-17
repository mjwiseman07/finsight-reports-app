/**
 * Visible apply-path prior/pre-apply tip-materialization remediation.
 * supervisor → tip entry → tip apply ceremony → sealed test boundary.
 * Synthetic only — zero production contact / SecureString / Node applicator / DB.
 */
import { spawnSync, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const isWin = process.platform === "win32";
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
);
const SUPERVISE = path.join(
  ROOT,
  "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1",
);
const ENTER = path.join(
  ROOT,
  "scripts/security/enter-visible-ra-pro-cutover-ceremony.ps1",
);
const APPLY = path.join(
  ROOT,
  "scripts/security/operator-ra-pro-cutover-production-apply-ceremony.ps1",
);
const PRIOR_FIXTURE = path.join(
  ROOT,
  "tests/security/helpers/fixtures/ra-pro-cutover-prior-production-dry-run-evidence.json",
);
const PRE_APPLY_FIXTURE = path.join(
  ROOT,
  "tests/security/helpers/fixtures/ra-pro-cutover-pre-apply-live-evidence.json",
);
const PRIOR_SHA =
  "9679678436659c64857c47397b5196343e11b8e3cc8277b7af0594a99b4f9a88";
const PRE_APPLY_SHA =
  "98e8824b6a7137a893f3e12719e1fa5a1a39de6d69f3d6c19def821e6c1aea98";
const FREEZE = "a74d5108752d93e1ca4baa78f4dc7425120658b7";
const MARKER =
  "C:\\Users\\mattj\\AppData\\Local\\Temp\\ra-pro-prod-apply-AUTHORIZED_ONE.marker";
const FORBIDDEN =
  /sk_live_|sk_test_|whsec_|postgres:\/\/[^@\s]+:[^@\s]+@(?!127\.0\.0\.1)|AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC )?PRIVATE KEY-----/i;

function sha256File(p: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
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

function readAuth(): Record<string, any> {
  return JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
}

function git(args: string[], cwd = ROOT): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function runVisibleApply(opts: {
  evidenceDir: string;
  env?: NodeJS.ProcessEnv;
  extraArgs?: string[];
  timeoutSec?: number;
  repoRoot?: string;
  supervisePath?: string;
}): ReturnType<typeof spawnSync> {
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    opts.supervisePath || SUPERVISE,
    "-PrHead",
    FREEZE,
    "-CeremonyKind",
    "apply",
    "-RepoRoot",
    opts.repoRoot || ROOT,
    "-EvidenceOutDir",
    opts.evidenceDir,
    "-WaitForPromptReady",
    "-PromptReadyTimeoutSec",
    String(opts.timeoutSec ?? 180),
  ];
  if (opts.extraArgs) args.push(...opts.extraArgs);
  return spawnSync(systemPowerShell(), args, {
    cwd: opts.repoRoot || ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: (opts.timeoutSec ?? 180) * 1000 + 60000,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      USERPROFILE: process.env.USERPROFILE,
      RA_PRO_CUTOVER_CEREMONY_STOP_AFTER_PRE_APPLY_LIVE: "1",
      ...(opts.env || {}),
    },
  });
}

function readSummary(dir: string): Record<string, any> | null {
  const p = path.join(dir, "PRODUCTION_APPLY_SUMMARY.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readSupervisor(dir: string): Record<string, any> | null {
  const p = path.join(dir, "VISIBLE_SUPERVISOR_EVIDENCE.json");
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

describe("RA Pro visible apply prior-evidence handoff (contract)", () => {
  it("supervisor no longer requires PriorDryRunEvidencePath (old BLOCKED_PRIOR_DRY_RUN_MISSING locus)", () => {
    const text = fs.readFileSync(SUPERVISE, "utf8");
    expect(text).not.toMatch(/BLOCKED_PRIOR_DRY_RUN_MISSING/);
    expect(text).not.toMatch(
      /PriorDryRunEvidencePath required for apply ceremony kind/,
    );
    expect(text).toMatch(
      /PriorDryRunEvidencePath operator\/path override forbidden; tip-sealed fixture only/,
    );
    expect(text).toMatch(
      /PreApplyLiveEvidencePath operator\/path override forbidden; tip-sealed fixture only/,
    );
    expect(text).toMatch(/Test-PreApplyLivePinsPublished/);
    expect(text).not.toMatch(
      /argParts \+= \(Format-Win32Argument "-PriorDryRunEvidencePath"\)/,
    );
  });

  it("entry forbids operator prior/pre-apply paths; tip materializes apply ceremony", () => {
    const enter = fs.readFileSync(ENTER, "utf8");
    expect(enter).toMatch(
      /PriorDryRunEvidencePath operator\/path override forbidden; tip-sealed fixture only/,
    );
    expect(enter).toMatch(
      /PreApplyLiveEvidencePath operator\/path override forbidden; tip-sealed fixture only/,
    );
    expect(enter).toMatch(
      /Apply ceremony tip-materializes prior \+ pre-apply live evidence itself; never forward operator paths/,
    );
    expect(enter).toMatch(/apply operator_ceremony must materialize from publication tip/);
  });

  it("committed tip fixtures and pins remain byte-identical", () => {
    const auth = readAuth();
    expect(sha256File(PRIOR_FIXTURE)).toBe(PRIOR_SHA);
    expect(sha256File(PRE_APPLY_FIXTURE)).toBe(PRE_APPLY_SHA);
    expect(auth.required_prior_dry_run_evidence_sha256).toBe(PRIOR_SHA);
    expect(auth.required_pre_apply_live_evidence_sha256).toBe(PRE_APPLY_SHA);
    expect(auth.published_prior_dry_run.status).toBe("PUBLISHED");
    expect(auth.published_pre_apply_live_evidence.status).toBe("PUBLISHED");
    expect(auth.published_pre_apply_live_evidence.valid_until_utc).toBe(
      "2026-09-18T00:55:00Z",
    );
  });

  it("consumed production apply attempt marker remains intact", () => {
    expect(fs.existsSync(MARKER)).toBe(true);
  });
});

describe.skipIf(!isWin)(
  "RA Pro visible apply prior-evidence handoff (Windows e2e)",
  () => {
    it("supervisor → entry → apply ceremony → TEST_BOUNDARY_STOP_AFTER_PRE_APPLY_LIVE", () => {
      const auth = readAuth();
      expect(sha256File(SUPERVISE)).toBe(auth.visible_ceremony_supervisor.sha256);
      expect(sha256File(ENTER)).toBe(auth.visible_ceremony_entry.sha256);
      expect(sha256File(APPLY)).toBe(auth.operator_apply_ceremony.sha256);

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-ok-"));
      try {
        const r = runVisibleApply({ evidenceDir: dir, timeoutSec: 180 });
        const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
        expect(combined).not.toMatch(/BLOCKED_PRIOR_DRY_RUN_MISSING/);
        expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);

        const summary = readSummary(dir);
        expect(summary, combined).toBeTruthy();
        expect(summary!.result_code).toBe(
          "TEST_BOUNDARY_STOP_AFTER_PRE_APPLY_LIVE",
        );
        expect(summary!.prior_dry_run_evidence_sha256).toBe(PRIOR_SHA);
        expect(summary!.pre_apply_live_evidence_sha256).toBe(PRE_APPLY_SHA);
        expect(summary!.databaseConnectionAttempts ?? 0).toBe(0);
        expect(summary!.sqlApplicationAttempts ?? 0).toBe(0);
        expect(summary!.evidence_source).toBe("ceremony_test_boundary");
        expect(summary!.evidence_source).not.toBe("native_wrapper_fallback");
        expect(JSON.stringify(summary)).not.toMatch(FORBIDDEN);

        const done = fs.readFileSync(path.join(dir, "CEREMONY_DONE.txt"), "utf8");
        expect(done).toMatch(/TEST_BOUNDARY_STOP_AFTER_PRE_APPLY_LIVE/);

        const sup = readSupervisor(dir);
        expect(sup, combined).toBeTruthy();
        expect(String(sup!.reason_code || "")).not.toBe(
          "BLOCKED_PRIOR_DRY_RUN_MISSING",
        );
        expect(String(sup!.result_code || "")).toBe(
          "TEST_BOUNDARY_STOP_AFTER_PRE_APPLY_LIVE",
        );
        expect(sup!.nodeProcessStarted ?? false).toBe(false);
        expect(sup!.databaseConnectionAttempts ?? 0).toBe(0);
        expect(sup!.sqlApplicationAttempts ?? 0).toBe(0);
        expect(r.status, combined).toBe(0);
        expect(fs.existsSync(MARKER)).toBe(true);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("argv PriorDryRunEvidencePath is rejected before SecureString/Node/DB", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-argv-"));
      try {
        const r = runVisibleApply({
          evidenceDir: dir,
          timeoutSec: 60,
          extraArgs: ["-PriorDryRunEvidencePath", PRIOR_FIXTURE],
        });
        expect(r.status).not.toBe(0);
        expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
        const summary = readSummary(dir);
        expect(summary).toBeNull();
        const sup = readSupervisor(dir);
        expect(String(sup?.reason_code || "")).toMatch(
          /BLOCKED_INPUT_INVALID|BLOCKED_PRIOR/,
        );
        expect(String(sup?.phase || "")).toMatch(/prior_dry_run_gate/);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("argv PreApplyLiveEvidencePath is rejected before SecureString/Node/DB", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-argv-pa-"));
      try {
        const r = runVisibleApply({
          evidenceDir: dir,
          timeoutSec: 60,
          extraArgs: ["-PreApplyLiveEvidencePath", PRE_APPLY_FIXTURE],
        });
        expect(r.status).not.toBe(0);
        expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
        expect(readSummary(dir)).toBeNull();
        const sup = readSupervisor(dir);
        expect(String(sup?.reason_code || "")).toMatch(/BLOCKED_INPUT_INVALID/);
        expect(String(sup?.phase || "")).toMatch(/pre_apply_live_gate/);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("evidence-path environment variables are rejected", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-env-"));
      try {
        const r = runVisibleApply({
          evidenceDir: dir,
          timeoutSec: 60,
          env: {
            RA_PRO_CUTOVER_PRIOR_DRY_RUN_EVIDENCE_PATH: PRIOR_FIXTURE,
          },
        });
        expect(r.status).not.toBe(0);
        expect(readSummary(dir)).toBeNull();
        const sup = readSupervisor(dir);
        expect(String(sup?.reason_code || "")).toMatch(/BLOCKED_INPUT_INVALID/);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("pre-apply evidence-path env is rejected", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-env-pa-"));
      try {
        const r = runVisibleApply({
          evidenceDir: dir,
          timeoutSec: 60,
          env: {
            RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_PATH: PRE_APPLY_FIXTURE,
          },
        });
        expect(r.status).not.toBe(0);
        expect(readSummary(dir)).toBeNull();
        const sup = readSupervisor(dir);
        expect(String(sup?.reason_code || "")).toMatch(/BLOCKED_INPUT_INVALID/);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("wrong PrHead fails before PROMPT_READY / summary", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-badpin-"));
      try {
        const r = spawnSync(
          systemPowerShell(),
          [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            SUPERVISE,
            "-PrHead",
            "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
            "-CeremonyKind",
            "apply",
            "-RepoRoot",
            ROOT,
            "-EvidenceOutDir",
            dir,
            "-WaitForPromptReady",
            "-PromptReadyTimeoutSec",
            "30",
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
              RA_PRO_CUTOVER_CEREMONY_STOP_AFTER_PRE_APPLY_LIVE: "1",
            },
          },
        );
        expect(r.status).not.toBe(0);
        expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
        expect(readSummary(dir)).toBeNull();
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("worktree poison of apply ceremony is ignored (tip blob authority)", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-poison-"));
      const backup = fs.readFileSync(APPLY);
      try {
        fs.appendFileSync(APPLY, "\n# WORKTREE_POISON_APPLY_CEREMONY\n");
        const r = runVisibleApply({ evidenceDir: dir, timeoutSec: 180 });
        const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
        expect(combined).not.toMatch(/BLOCKED_PRIOR_DRY_RUN_MISSING/);
        const summary = readSummary(dir);
        expect(summary, combined).toBeTruthy();
        expect(summary!.result_code).toBe(
          "TEST_BOUNDARY_STOP_AFTER_PRE_APPLY_LIVE",
        );
        expect(summary!.prior_dry_run_evidence_sha256).toBe(PRIOR_SHA);
        expect(summary!.pre_apply_live_evidence_sha256).toBe(PRE_APPLY_SHA);
        expect(r.status, combined).toBe(0);
      } finally {
        fs.writeFileSync(APPLY, backup);
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("unpublished prior pins fail closed before SecureString/Node/DB", () => {
      const wt = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-unpub-"));
      try {
        execFileSync("git", ["worktree", "add", "--detach", wt, "HEAD"], {
          cwd: ROOT,
          encoding: "utf8",
        });
        const authPath = path.join(
          wt,
          "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
        );
        const bad = JSON.parse(fs.readFileSync(authPath, "utf8"));
        bad.required_prior_dry_run_evidence_sha256 = null;
        bad.required_prior_dry_run_freeze = null;
        bad.required_prior_dry_run_evidence_tip = null;
        bad.required_prior_dry_run_bundle_source = null;
        bad.published_prior_dry_run = { status: "UNPUBLISHED" };
        fs.writeFileSync(authPath, `${JSON.stringify(bad, null, 2)}\n`);
        // Reseal supervisor/entry from this wt so tip auth matches executable bytes.
        execFileSync("node", ["scripts/security/reseal-ra-pro-cutover-auth-artifacts.js"], {
          cwd: wt,
          encoding: "utf8",
        });
        execFileSync(
          "git",
          [
            "add",
            "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
            "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1",
            "scripts/security/enter-visible-ra-pro-cutover-ceremony.ps1",
            "scripts/security/operator-ra-pro-cutover-production-apply-ceremony.ps1",
          ],
          { cwd: wt },
        );
        execFileSync(
          "git",
          [
            "-c",
            "user.email=test@example.com",
            "-c",
            "user.name=test",
            "commit",
            "-m",
            "unpublish prior pins for fail-closed test",
          ],
          { cwd: wt, encoding: "utf8" },
        );
        // Materialize tip LF blobs into worktree for seal self-verify.
        const tipSha = git(["rev-parse", "HEAD"], wt);
        for (const rel of [
          "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1",
          "scripts/security/enter-visible-ra-pro-cutover-ceremony.ps1",
        ]) {
          const bytes = execFileSync("git", ["cat-file", "blob", `${tipSha}:${rel}`], {
            cwd: wt,
          });
          fs.writeFileSync(path.join(wt, rel), bytes);
        }

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-unpub-ev-"));
        const r = runVisibleApply({
          evidenceDir: dir,
          timeoutSec: 60,
          repoRoot: wt,
          supervisePath: path.join(
            wt,
            "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1",
          ),
        });
        expect(r.status).not.toBe(0);
        expect(readSummary(dir)).toBeNull();
        const sup = readSupervisor(dir);
        expect(String(sup?.reason_code || "")).toMatch(
          /BLOCKED_PRIOR_DRY_RUN_PINS_UNPUBLISHED/,
        );
        fs.rmSync(dir, { recursive: true, force: true });
      } finally {
        try {
          execFileSync("git", ["worktree", "remove", "--force", wt], {
            cwd: ROOT,
            encoding: "utf8",
          });
        } catch {
          fs.rmSync(wt, { recursive: true, force: true });
        }
      }
    });

    it("wrong publication tip (forbidden env) fails before PROMPT_READY", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-badtip-"));
      try {
        const r = runVisibleApply({
          evidenceDir: dir,
          timeoutSec: 45,
          env: { RA_PRO_CUTOVER_PUBLICATION_TIP: FREEZE },
        });
        expect(r.status).not.toBe(0);
        expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
        expect(readSummary(dir)).toBeNull();
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });

    it("tampered tip prior fixture path fails closed", () => {
      const wt = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-badfix-"));
      try {
        execFileSync("git", ["worktree", "add", "--detach", wt, "HEAD"], {
          cwd: ROOT,
          encoding: "utf8",
        });
        const authPath = path.join(
          wt,
          "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
        );
        const bad = JSON.parse(fs.readFileSync(authPath, "utf8"));
        bad.published_prior_dry_run.evidence_fixture_path =
          "tests/security/helpers/fixtures/DOES-NOT-EXIST.json";
        fs.writeFileSync(authPath, `${JSON.stringify(bad, null, 2)}\n`);
        execFileSync("node", ["scripts/security/reseal-ra-pro-cutover-auth-artifacts.js"], {
          cwd: wt,
          encoding: "utf8",
        });
        execFileSync(
          "git",
          [
            "add",
            "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json",
            "scripts/security",
          ],
          { cwd: wt },
        );
        execFileSync(
          "git",
          [
            "-c",
            "user.email=test@example.com",
            "-c",
            "user.name=test",
            "commit",
            "-m",
            "wrong prior fixture path",
          ],
          { cwd: wt, encoding: "utf8" },
        );
        const tipSha = git(["rev-parse", "HEAD"], wt);
        for (const rel of [
          "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1",
          "scripts/security/enter-visible-ra-pro-cutover-ceremony.ps1",
          "scripts/security/operator-ra-pro-cutover-production-apply-ceremony.ps1",
        ]) {
          const bytes = execFileSync("git", ["cat-file", "blob", `${tipSha}:${rel}`], {
            cwd: wt,
          });
          fs.writeFileSync(path.join(wt, rel), bytes);
        }

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-badfix-ev-"));
        const r = runVisibleApply({
          evidenceDir: dir,
          timeoutSec: 120,
          repoRoot: wt,
          supervisePath: path.join(
            wt,
            "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1",
          ),
        });
        expect(r.status).not.toBe(0);
        const summary = readSummary(dir);
        if (summary) {
          expect(String(summary.result_code || "")).not.toBe(
            "TEST_BOUNDARY_STOP_AFTER_PRE_APPLY_LIVE",
          );
          expect(String(summary.result_code || "")).not.toBe("APPLY_COMMITTED");
        }
        expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
        fs.rmSync(dir, { recursive: true, force: true });
      } finally {
        try {
          execFileSync("git", ["worktree", "remove", "--force", wt], {
            cwd: ROOT,
            encoding: "utf8",
          });
        } catch {
          fs.rmSync(wt, { recursive: true, force: true });
        }
      }
    });

    it("CRLF-tampered tip prior evidence blob fails hash-object/OID gates", () => {
      const wt = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-crlf-"));
      try {
        execFileSync("git", ["worktree", "add", "--detach", wt, "HEAD"], {
          cwd: ROOT,
          encoding: "utf8",
        });
        const rel =
          "tests/security/helpers/fixtures/ra-pro-cutover-prior-production-dry-run-evidence.json";
        const lf = fs.readFileSync(path.join(wt, rel));
        const crlf = Buffer.from(lf.toString("utf8").replace(/\n/g, "\r\n"), "utf8");
        fs.writeFileSync(path.join(wt, rel), crlf);
        execFileSync("git", ["add", rel], { cwd: wt });
        execFileSync(
          "git",
          [
            "-c",
            "user.email=test@example.com",
            "-c",
            "user.name=test",
            "commit",
            "-m",
            "crlf tamper prior fixture",
          ],
          { cwd: wt, encoding: "utf8" },
        );
        // Keep tip auth pins pointing at original SHA while tip blob differs.
        const tipSha = git(["rev-parse", "HEAD"], wt);
        for (const scriptRel of [
          "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1",
          "scripts/security/enter-visible-ra-pro-cutover-ceremony.ps1",
          "scripts/security/operator-ra-pro-cutover-production-apply-ceremony.ps1",
        ]) {
          const bytes = execFileSync(
            "git",
            ["cat-file", "blob", `${tipSha}:${scriptRel}`],
            { cwd: wt },
          );
          fs.writeFileSync(path.join(wt, scriptRel), bytes);
        }

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-crlf-ev-"));
        const r = runVisibleApply({
          evidenceDir: dir,
          timeoutSec: 120,
          repoRoot: wt,
          supervisePath: path.join(
            wt,
            "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1",
          ),
        });
        expect(r.status).not.toBe(0);
        const summary = readSummary(dir);
        if (summary) {
          expect(summary.prior_dry_run_evidence_sha256).not.toBe(PRIOR_SHA);
          expect(String(summary.result_code || "")).not.toBe(
            "TEST_BOUNDARY_STOP_AFTER_PRE_APPLY_LIVE",
          );
        }
        expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
        fs.rmSync(dir, { recursive: true, force: true });
      } finally {
        try {
          execFileSync("git", ["worktree", "remove", "--force", wt], {
            cwd: ROOT,
            encoding: "utf8",
          });
        } catch {
          fs.rmSync(wt, { recursive: true, force: true });
        }
      }
    });

    it("expired / future-start pre-apply evidence fails closed (gate unit via tip ceremony path)", () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-vis-apply-time-"));
      try {
        const gates = path.join(
          ROOT,
          "scripts/security/ra-pro-cutover-pre-apply-live-gates.ps1",
        );
        const baseAuth = readAuth();

        const cases: Array<{
          label: string;
          patch: Record<string, string>;
          expect: RegExp;
        }> = [
          {
            label: "expired",
            patch: {
              valid_from_utc: "2020-01-01T00:00:00Z",
              valid_until_utc: "2020-01-02T00:00:00Z",
              collection_started_at_utc: "2020-01-01T00:00:00Z",
              collection_ended_at_utc: "2020-01-01T01:00:00Z",
            },
            expect: /PRE_APPLY_LIVE_EVIDENCE_EXPIRED|START_NOT_UNEXPIRED/,
          },
          {
            label: "future",
            patch: {
              valid_from_utc: "2099-01-01T00:00:00Z",
              valid_until_utc: "2099-12-31T23:59:59Z",
              collection_started_at_utc: "2099-06-01T10:00:00Z",
              collection_ended_at_utc: "2099-06-01T11:00:00Z",
            },
            expect: /PRE_APPLY_LIVE_EVIDENCE_START_NOT_UNEXPIRED/,
          },
        ];

        for (const c of cases) {
          const fixture = {
            ...JSON.parse(fs.readFileSync(PRE_APPLY_FIXTURE, "utf8")),
            ...c.patch,
            serving_deployment: {
              ...JSON.parse(fs.readFileSync(PRE_APPLY_FIXTURE, "utf8"))
                .serving_deployment,
              observed_at_utc: c.patch.collection_ended_at_utc,
            },
            stripe_tcp1: {
              ...JSON.parse(fs.readFileSync(PRE_APPLY_FIXTURE, "utf8")).stripe_tcp1,
              visibility_window_start_utc: c.patch.collection_started_at_utc,
              visibility_window_end_utc: c.patch.collection_ended_at_utc,
            },
            database_readonly: {
              ...JSON.parse(fs.readFileSync(PRE_APPLY_FIXTURE, "utf8"))
                .database_readonly,
              relevant_activity_window_start_utc: c.patch.collection_started_at_utc,
              relevant_activity_window_end_utc: c.patch.collection_ended_at_utc,
            },
          };
          const body = `${JSON.stringify(fixture, null, 2)}\n`;
          const evidencePath = path.join(dir, `${c.label}.json`);
          fs.writeFileSync(evidencePath, body);
          const sha = crypto.createHash("sha256").update(body).digest("hex");
          const auth = {
            ...baseAuth,
            required_pre_apply_live_evidence_sha256: sha,
            published_pre_apply_live_evidence: {
              ...baseAuth.published_pre_apply_live_evidence,
              evidence_sha256: sha,
              evidence_bytes: Buffer.byteLength(body),
              valid_from_utc: c.patch.valid_from_utc,
              valid_until_utc: c.patch.valid_until_utc,
            },
          };
          const authPath = path.join(dir, `${c.label}-auth.json`);
          fs.writeFileSync(authPath, `${JSON.stringify(auth, null, 2)}\n`);

          const r = spawnSync(
            systemPowerShell(),
            [
              "-NoProfile",
              "-NonInteractive",
              "-ExecutionPolicy",
              "Bypass",
              "-Command",
              `
                $ErrorActionPreference = 'Stop'
                . '${gates.replace(/'/g, "''")}'
                $auth = Get-Content -LiteralPath '${authPath.replace(/'/g, "''")}' -Raw -Encoding UTF8 | ConvertFrom-Json
                try {
                  Assert-RaProPreApplyLiveEvidence -Path '${evidencePath.replace(/'/g, "''")}' -Auth $auth
                  Write-Output 'UNEXPECTED_ACCEPT'
                  exit 0
                } catch {
                  Write-Output ([string]$_.Exception.Message)
                  exit 1
                }
              `,
            ],
            {
              cwd: ROOT,
              encoding: "utf8",
              windowsHide: true,
              timeout: 60000,
            },
          );
          expect(r.status, c.label).not.toBe(0);
          expect(String(r.stdout || "") + String(r.stderr || ""), c.label).toMatch(
            c.expect,
          );
        }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  },
);
