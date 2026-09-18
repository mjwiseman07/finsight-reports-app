/**
 * Ceremony-authority / first-hop seal-materialize coverage for RA Pro accounting-automation.
 * Never contacts production.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const AUTH_REL = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";
const BOOTSTRAP_REL =
  "scripts/security/bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1";
const NATIVE_ENTRY_REL = "scripts/security/enter-ra-pro-accounting-automation-ceremony.ps1";
const PROJECT_URL = "postgres://user:pass@db.jzmdgwwiestcmmeuhhkr.supabase.co:5432/postgres";

function gitEnv() {
  return {
    ...process.env,
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "safe.directory",
    GIT_CONFIG_VALUE_0: ROOT.replace(/\\/g, "/"),
  };
}

function git(args: string[]) {
  const r = spawnSync("git", args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: gitEnv(),
  });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  }
  return (r.stdout || "").trim();
}

function tipSha() {
  return git(["rev-parse", "HEAD"]);
}

type AuthSeal = {
  path?: string;
  source_commit?: string;
  oid?: string;
  sha256?: string;
  bytes?: number;
  line_endings?: string;
};

function loadAuth() {
  const tip = tipSha();
  const raw = spawnSync("git", ["show", `${tip}:${AUTH_REL}`], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: gitEnv(),
  });
  if (raw.status !== 0) throw new Error(raw.stderr || "auth load failed");
  return JSON.parse(raw.stdout || "{}") as {
    authorized_pr_head?: string;
    bootstrap_source_commit?: string;
    ceremony_source_commit?: string;
    visible_ceremony_bootstrap?: AuthSeal;
    visible_ceremony_native_entry?: AuthSeal;
    visible_ceremony_supervisor?: AuthSeal;
    visible_ceremony_entry?: AuthSeal;
    operator_ceremony?: AuthSeal;
    publication?: {
      status?: string;
      required_prior_dry_run_evidence_sha256?: string | null;
      required_pre_apply_live_evidence_sha256?: string | null;
    };
    precondition_publication?: { status?: string; evidence_sha256?: string };
  };
}

function lastJson(text: string): Record<string, unknown> {
  const lines = `${text || ""}`.trim().split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      return JSON.parse(lines[i]);
    } catch {
      // continue
    }
  }
  return {};
}

/** Authenticated first hop: tip-seal materialize bootstrap, then launch temp only. */
function runAuthenticatedBootstrap(args: string[], envExtra: Record<string, string> = {}) {
  const auth = loadAuth();
  const tip = tipSha();
  const bootSrc = String(auth.bootstrap_source_commit || "");
  const seal = auth.visible_ceremony_bootstrap;
  if (!seal?.path || !seal.oid || !seal.sha256 || !seal.bytes) {
    throw new Error("missing visible_ceremony_bootstrap seals");
  }
  const oid = git(["rev-parse", `${bootSrc}:${seal.path}`]);
  expect(oid).toBe(seal.oid);
  const show = spawnSync("git", ["cat-file", "blob", `${bootSrc}:${seal.path}`], {
    cwd: ROOT,
    windowsHide: true,
    env: gitEnv(),
  });
  if (show.status !== 0) throw new Error(String(show.stderr || "cat-file failed"));
  const bytes = Buffer.isBuffer(show.stdout)
    ? show.stdout
    : Buffer.from(show.stdout || "");
  expect(bytes.includes(0x0d)).toBe(false);
  expect(bytes.length).toBe(Number(seal.bytes));
  expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe(seal.sha256);

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-boot-"));
  const materialDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-boot-mat-"));
  const bootFile = path.join(materialDir, "bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1");
  fs.writeFileSync(bootFile, bytes);
  const run = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      bootFile,
      "-EvidenceOutDir",
      outDir,
      "-RepoRoot",
      ROOT,
      "-SealedMaterialInvocation",
      ...args,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
      env: { ...gitEnv(), ...envExtra },
    },
  );
  try {
    fs.rmSync(materialDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
  return {
    run,
    outDir,
    payload: lastJson(`${run.stdout || ""}${run.stderr || ""}`),
    tip,
  };
}

describe("RA Pro accounting-automation ceremony authority", () => {
  it("publishes non-circular freeze/bootstrap/ceremony/tip seals", () => {
    const auth = loadAuth();
    const tip = tipSha().toLowerCase();
    const freeze = String(auth.authorized_pr_head || "").toLowerCase();
    const bootSrc = String(auth.bootstrap_source_commit || "").toLowerCase();
    const source = String(auth.ceremony_source_commit || "").toLowerCase();
    expect(freeze).toMatch(/^[0-9a-f]{40}$/);
    expect(bootSrc).toMatch(/^[0-9a-f]{40}$/);
    expect(source).toMatch(/^[0-9a-f]{40}$/);
    expect(tip).toMatch(/^[0-9a-f]{40}$/);
    expect(new Set([freeze, bootSrc, source, tip]).size).toBe(4);
    expect(git(["merge-base", "--is-ancestor", freeze, bootSrc])).toBe("");
    expect(git(["merge-base", "--is-ancestor", bootSrc, source])).toBe("");
    expect(git(["merge-base", "--is-ancestor", source, tip])).toBe("");

    for (const [key, expectedSource] of [
      ["visible_ceremony_bootstrap", bootSrc],
      ["visible_ceremony_native_entry", bootSrc],
      ["visible_ceremony_supervisor", source],
      ["visible_ceremony_entry", source],
      ["operator_ceremony", source],
    ] as const) {
      const seal = auth[key] as AuthSeal;
      expect(seal?.path).toBeTruthy();
      expect(String(seal.source_commit).toLowerCase()).toBe(expectedSource);
      expect(seal.line_endings).toBe("LF");
      expect(String(seal.oid)).toMatch(/^[0-9a-f]{40}$/);
      expect(String(seal.sha256)).toMatch(/^[0-9a-f]{64}$/);
      expect(Number(seal.bytes)).toBeGreaterThan(0);
      const oid = git(["rev-parse", `${expectedSource}:${seal.path}`]);
      expect(oid).toBe(seal.oid);
      const buf = spawnSync("git", ["show", `${expectedSource}:${seal.path}`], {
        cwd: ROOT,
        windowsHide: true,
        env: gitEnv(),
      }).stdout as Buffer;
      const bytes = Buffer.isBuffer(buf) ? buf : Buffer.from(buf || "");
      expect(bytes.includes(0x0d)).toBe(false);
      expect(bytes.length).toBe(Number(seal.bytes));
      expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe(seal.sha256);
    }

    expect(auth.publication?.status).toBe("UNPUBLISHED");
    expect(auth.publication?.required_prior_dry_run_evidence_sha256).toBeNull();
    expect(auth.publication?.required_pre_apply_live_evidence_sha256).toBeNull();
    expect(auth.precondition_publication?.status).toBe("PUBLISHED");
    expect(auth.precondition_publication?.evidence_sha256).toBe(
      "d2e47fb6c77501fa6a8b7e29ea728550c23f0daef1713ded7de96c080bcf8288",
    );
  });

  it("worktree-poisoned supervisor still executes only sealed ceremony-source blobs", () => {
    const tip = tipSha();
    const supervisorPath = path.join(
      ROOT,
      "scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1",
    );
    const ceremonyPath = path.join(
      ROOT,
      "scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1",
    );
    const bootstrapPath = path.join(ROOT, BOOTSTRAP_REL);
    const nativeEntryPath = path.join(ROOT, NATIVE_ENTRY_REL);
    const supervisorBackup = fs.readFileSync(supervisorPath);
    const ceremonyBackup = fs.readFileSync(ceremonyPath);
    const bootstrapBackup = fs.readFileSync(bootstrapPath);
    const nativeEntryBackup = fs.readFileSync(nativeEntryPath);
    try {
      fs.writeFileSync(
        supervisorPath,
        'Write-Output \'{"verdict":"POISONED","reason":"WORKTREE_SUPERVISOR"}\'; exit 0\n',
        "utf8",
      );
      fs.writeFileSync(
        ceremonyPath,
        `${ceremonyBackup.toString("utf8")}\n# POISON_CEREMONY_${Date.now()}\n`,
        "utf8",
      );
      fs.writeFileSync(
        bootstrapPath,
        'Write-Output \'{"verdict":"POISONED","reason":"WORKTREE_BOOTSTRAP"}\'; exit 0\n',
        "utf8",
      );
      fs.writeFileSync(
        nativeEntryPath,
        'Write-Output \'{"verdict":"POISONED","reason":"WORKTREE_NATIVE_ENTRY"}\'; exit 0\n',
        "utf8",
      );
      const { run, payload } = runAuthenticatedBootstrap(
        [
          "-Mode",
          "dry-run",
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
      expect(payload.productionContact).toBe(false);
      expect(String(payload.reason || "")).not.toMatch(/POISONED|WORKTREE_/);
      const child = payload.child_evidence as Record<string, unknown>;
      expect(child.databaseConnectionAttempts ?? 0).toBe(0);
      expect(child.sqlApplicationAttempts ?? 0).toBe(0);
    } finally {
      fs.writeFileSync(supervisorPath, supervisorBackup);
      fs.writeFileSync(ceremonyPath, ceremonyBackup);
      fs.writeFileSync(bootstrapPath, bootstrapBackup);
      fs.writeFileSync(nativeEntryPath, nativeEntryBackup);
    }
  });

  it("wrong PrHead / forbidden env overrides fail before credentials", () => {
    const tip = tipSha();
    const wrong = runAuthenticatedBootstrap(
      ["-Mode", "dry-run", "-PrHead", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(wrong.run.status).toBe(1);
    expect(String(wrong.payload.reason || "")).toMatch(/BLOCKED_PIN_MISMATCH|BLOCKED_PUBLICATION_TIP/);

    const envOverride = runAuthenticatedBootstrap(
      ["-Mode", "dry-run", "-PrHead", tip, "-TestSyntheticDatabaseUrl", PROJECT_URL],
      {
        RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1",
        RA_PRO_ACCOUNTING_AUTOMATION_SUPERVISOR_PATH: "C:\\evil\\supervise.ps1",
      },
    );
    expect(envOverride.run.status).toBe(1);
    expect(String(envOverride.payload.reason || "")).toMatch(/BLOCKED_INPUT_INVALID/);
  });

  it("direct bootstrap/supervisor/ceremony/enter-apply execution are rejected", () => {
    const tip = tipSha();
    const directBoot = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        BOOTSTRAP_REL,
        "-PrHead",
        tip,
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true, env: { ...process.env } },
    );
    expect(directBoot.status).toBe(1);
    expect(String(lastJson(`${directBoot.stdout || ""}${directBoot.stderr || ""}`).reason || "")).toMatch(
      /BOOTSTRAP_DIRECT_EXEC_FORBIDDEN/,
    );

    const directSup = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1",
        "-PrHead",
        tip,
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true, env: { ...process.env } },
    );
    expect(directSup.status).toBe(1);
    expect(String(lastJson(`${directSup.stdout || ""}${directSup.stderr || ""}`).reason || "")).toMatch(
      /SUPERVISOR_DIRECT_EXEC_FORBIDDEN/,
    );

    const directCer = spawnSync(
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
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true, env: { ...process.env } },
    );
    expect(directCer.status).toBe(1);
    expect(String(lastJson(`${directCer.stdout || ""}${directCer.stderr || ""}`).reason || "")).toMatch(
      /CEREMONY_DIRECT_EXEC_FORBIDDEN/,
    );

    const directEnter = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        "scripts/security/enter-ra-pro-accounting-automation-apply.ps1",
        "-Mode",
        "dry-run",
        "-PrHead",
        tip,
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true, env: { ...process.env } },
    );
    expect(directEnter.status).toBe(1);
    expect(String(lastJson(`${directEnter.stdout || ""}${directEnter.stderr || ""}`).reason || "")).toMatch(
      /ENTRY_DIRECT_EXEC_FORBIDDEN/,
    );

    const directNative = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        NATIVE_ENTRY_REL,
        "-Mode",
        "apply",
        "-PrHead",
        tip,
        "-RepoRoot",
        ROOT,
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true, env: { ...process.env } },
    );
    expect(directNative.status).toBe(1);
    expect(String(lastJson(`${directNative.stdout || ""}${directNative.stderr || ""}`).reason || "")).toMatch(
      /NATIVE_ENTRY_DIRECT_EXEC_FORBIDDEN/,
    );
    expect(String(`${directNative.stdout || ""}${directNative.stderr || ""}`)).not.toMatch(/AUTHORIZATION_PINS_UNPUBLISHED/);
  });

  it("apply remains blocked by unpublished later pins via authenticated bootstrap path", () => {
    const tip = tipSha();
    const { run, payload } = runAuthenticatedBootstrap(["-Mode", "apply", "-PrHead", tip]);
    expect(run.status).toBe(1);
    expect(String(payload.reason || "")).toMatch(/AUTHORIZATION_PINS_UNPUBLISHED/);
    expect(payload.productionContact).toBe(false);
  });

  it("rejects UTF-8 BOM, CRLF, and reparse substitution before the runbook launches bootstrap", () => {
    const runbook = fs.readFileSync(
      path.join(ROOT, "docs/security/ra-pro-accounting-automation-apply/APPLY_RUNBOOK.md"),
      "utf8",
    );
    expect(runbook).toContain("bootstrap UTF-8 BOM forbidden");
    expect(runbook).toContain("bootstrap CR/CRLF forbidden");
    expect(runbook).toContain("materialized file is reparse point");
    expect(runbook).toContain("material directory is reparse point");
    expect(runbook).toContain("materialized file is not byte-identical to Git blob");
    expect(runbook).toContain("materialized path escaped private temp directory");
    expect(runbook).toContain("NATIVE_ENTRY_DIRECT_EXEC_FORBIDDEN");
    expect(runbook).not.toContain("Convenience helper");
    const launches = runbook.split("```powershell").slice(1).map((block) => block.split("```")[0]);
    const executable = launches.filter((block) => !block.includes("DO NOT RUN"));
    expect(executable).toHaveLength(1);

    const marker = runbook.indexOf("Supported launch");
    const fence = runbook.indexOf("```powershell\n", marker);
    const codeStart = fence + "```powershell\n".length;
    const codeEnd = runbook.indexOf("\n```", codeStart);
    const launch = runbook.slice(codeStart, codeEnd).replace(/\r\n/g, "\n");
    const fileLine =
      '& "$env:SystemRoot\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -File $resolved -Mode dry-run -PrHead $Tip -RepoRoot $Repo -SealedMaterialInvocation\n  exit $LASTEXITCODE';
    expect(launch).toContain("-File $resolved");
    const neutralized = launch.replace(
      fileLine,
      'Set-Content -LiteralPath $env:RA_ACCT_LAUNCH_SENTINEL -Value "launched"\n  exit 0',
    );
    expect(neutralized).not.toContain("-File $resolved");

    function runSubstituted(script: string) {
      const sentinel = path.join(
        os.tmpdir(),
        `ra-acct-sentinel-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`,
      );
      const scriptPath = path.join(os.tmpdir(), `ra-acct-launch-${process.pid}-${Date.now()}.ps1`);
      fs.writeFileSync(scriptPath, script.replace(/\n/g, "\r\n"), "utf8");
      const run = spawnSync(
        "powershell.exe",
        ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
        {
          cwd: ROOT,
          encoding: "utf8",
          windowsHide: true,
          env: { ...gitEnv(), RA_ACCT_LAUNCH_SENTINEL: sentinel },
        },
      );
      return { run, launched: fs.existsSync(sentinel), text: `${run.stdout || ""}${run.stderr || ""}` };
    }

    const bytesLine = '$bytes = Invoke-GitBlob "${bootSrc}:${ExpectedBootstrapPath}"\n';
    const bom = runSubstituted(
      neutralized.replace(
        bytesLine,
        `${bytesLine}$bytes = [byte[]](@(0xEF,0xBB,0xBF) + [byte[]]$bytes)\n`,
      ),
    );
    expect(bom.run.status).not.toBe(0);
    expect(bom.text).toMatch(/bootstrap UTF-8 BOM forbidden/);
    expect(bom.launched).toBe(false);

    const crlf = runSubstituted(
      neutralized.replace(bytesLine, `${bytesLine}$bytes = [byte[]](@(0x0D) + [byte[]]$bytes)\n`),
    );
    expect(crlf.run.status).not.toBe(0);
    expect(crlf.text).toMatch(/bootstrap CR\/CRLF forbidden/);
    expect(crlf.launched).toBe(false);

    const dirLine =
      '$tmpDirFull = [IO.Path]::GetFullPath((New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ("ra-acct-boot-" + [guid]::NewGuid().ToString("N")))).FullName)\n';
    const reparse = runSubstituted(
      neutralized.replace(
        dirLine,
        [
          '$realPrivate = [IO.Path]::GetFullPath((New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ("ra-acct-real-" + [guid]::NewGuid().ToString("N")))).FullName)',
          '$linkPrivate = Join-Path ([IO.Path]::GetTempPath()) ("ra-acct-link-" + [guid]::NewGuid().ToString("N"))',
          'cmd /c mklink /J "$linkPrivate" "$realPrivate" | Out-Null',
          'if (-not (Test-Path -LiteralPath $linkPrivate)) { throw "junction create failed" }',
          "$tmpDirFull = [IO.Path]::GetFullPath($linkPrivate)",
          "",
        ].join("\n"),
      ),
    );
    expect(reparse.run.status, reparse.text).not.toBe(0);
    expect(reparse.text).toMatch(/reparse point/);
    expect(reparse.launched).toBe(false);

    const wrongPath = runSubstituted(
      neutralized.replace(
        '$ExpectedBootstrapPath = "scripts/security/bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1"\n',
        '$ExpectedBootstrapPath = "scripts/security/not-the-bootstrap.ps1"\n',
      ),
    );
    expect(wrongPath.run.status).not.toBe(0);
    expect(wrongPath.text).toMatch(/bootstrap path mismatch/);
    expect(wrongPath.launched).toBe(false);
  });
});
