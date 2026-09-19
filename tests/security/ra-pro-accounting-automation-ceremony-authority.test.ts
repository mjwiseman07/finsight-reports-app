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
import { describeApplyArtifactMap, createDisposablePublicationCommit } from "../../scripts/security/ra-pro-accounting-automation-apply-authorization.js";
import { APPLY_AUTHORIZATION_TOKEN } from "../../scripts/security/ra-pro-accounting-automation-apply-constants.js";

const ROOT = process.cwd();
const AUTH_REL = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";
const BOOTSTRAP_REL =
  "scripts/security/bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1";
const NATIVE_ENTRY_REL = "scripts/security/enter-ra-pro-accounting-automation-ceremony.ps1";
const PROJECT_URL = "postgres://user:pass@db.jzmdgwwiestcmmeuhhkr.supabase.co:5432/postgres?sslmode=require";

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
    tls_trust_root?: AuthSeal & {
      der_sha256?: string;
      certificate_pem_sha256?: string;
      certificate_bytes?: number;
      subject?: string;
    };
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
function runAuthenticatedBootstrap(
  args: string[],
  envExtra: Record<string, string> = {},
  existingOutDir = "",
) {
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

  const outDir = existingOutDir || fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-boot-"));
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

    expect(auth.publication?.status).toBe("PUBLISHED");
    expect(auth.publication?.required_prior_dry_run_evidence_sha256).toBe(
      "f89c3e701703d199f56577a65ae6f28b5ba120be45ee482f2ab75c284d763d18",
    );
    expect(auth.publication?.required_pre_apply_live_evidence_sha256).toBe(
      "bf42b0c83b1604d2bb627e97807cc7ed7fa32a172ec0508046c1012c9f0ec6cf",
    );
    expect(auth.precondition_publication?.status).toBe("PUBLISHED");
    expect(auth.precondition_publication?.evidence_sha256).toBe(
      "d2e47fb6c77501fa6a8b7e29ea728550c23f0daef1713ded7de96c080bcf8288",
    );
    const tls = auth.tls_trust_root;
    expect(tls?.path).toBe("scripts/security/embedded-supabase-prod-ca-2021.js");
    expect(String(tls?.source_commit).toLowerCase()).toBe(freeze);
    expect(tls?.der_sha256).toBe(
      "807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa",
    );
    expect(tls?.subject).toBe("Supabase Root 2021 CA");
    expect(tls?.line_endings).toBe("LF");
    expect(git(["rev-parse", `${freeze}:${tls?.path}`])).toBe(tls?.oid);
    const tlsBytes = spawnSync("git", ["show", `${freeze}:${tls?.path}`], {
      cwd: ROOT,
      windowsHide: true,
      env: gitEnv(),
    }).stdout as Buffer;
    const tlsBuf = Buffer.isBuffer(tlsBytes) ? tlsBytes : Buffer.from(tlsBytes || "");
    expect(tlsBuf.includes(0x0d)).toBe(false);
    expect(tlsBuf.length).toBe(Number(tls?.bytes));
    expect(crypto.createHash("sha256").update(tlsBuf).digest("hex")).toBe(tls?.sha256);
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

  it("authenticated chain reaches a visible interactive SecureString host without a marker", () => {
    const tip = tipSha();
    const { run, outDir, payload } = runAuthenticatedBootstrap(
      ["-Mode", "dry-run", "-PrHead", tip, "-TestVisiblePromptProbe"],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(payload.result_code).toBe("VISIBLE_PROMPT_READY");
    expect(payload.productionContact).toBe(false);
    expect(payload.prompt_host_noninteractive).toBe(false);
    expect(payload.prompt_host_visible).toBe(true);
    expect(payload.attempt_marker).toBeNull();
    expect(payload.marker_before_child).toBe(false);
    expect(payload.child_evidence ?? null).toBeNull();
    expect(fs.readdirSync(outDir).filter((f) => f.startsWith("attempt-"))).toEqual([]);
    expect(String(`${run.stdout || ""}${run.stderr || ""}`)).not.toMatch(/postgres:\/\//i);
  });

  it("default prompt window outlives the old 180-second parent kill", () => {
    const tip = tipSha();
    const { run, outDir, payload } = runAuthenticatedBootstrap(
      ["-Mode", "dry-run", "-PrHead", tip, "-TestTimeoutBudgetProbe"],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(payload.result_code).toBe("TIMEOUT_BUDGET_READY");
    expect(Number(payload.prompt_input_timeout_ms)).toBe(600000);
    expect(Number(payload.child_runtime_timeout_ms)).toBe(120000);
    expect(Number(payload.parent_wait_floor_ms)).toBeGreaterThan(180000);
    expect(Number(payload.parent_wait_floor_ms)).toBeGreaterThan(Number(payload.prompt_input_timeout_ms));
    expect(payload.securestring_acquired).toBe(false);
    expect(payload.attempt_marker).toBeNull();
    expect(payload.node_started).toBe(false);
    expect(payload.productionContact).toBe(false);
    expect(fs.existsSync(path.join(outDir, "PRODUCTION_DRY_RUN_EVIDENCE.json"))).toBe(true);
    expect(fs.readdirSync(outDir).filter((f) => f.startsWith("attempt-"))).toEqual([]);
  });

  it("forced parent termination retains sanitized fallback evidence and no marker", () => {
    const tip = tipSha();
    const { run, outDir, payload } = runAuthenticatedBootstrap(
      [
        "-Mode",
        "dry-run",
        "-PrHead",
        tip,
        "-TestHangBeforeEvidence",
        "-PromptInputTimeoutMs",
        "1000",
        "-ChildTimeoutMs",
        "1000",
      ],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(run.status, `${run.stdout}\n${run.stderr}`).not.toBe(0);
    const evidencePath = path.join(outDir, "PRODUCTION_DRY_RUN_EVIDENCE.json");
    expect(fs.existsSync(evidencePath)).toBe(true);
    const onDisk = JSON.parse(fs.readFileSync(evidencePath, "utf8")) as Record<string, unknown>;
    expect(onDisk.fallback_frame === true || payload.fallback_frame === true).toBe(true);
    const frame = onDisk.fallback_frame === true ? onDisk : payload;
    expect(frame.result_code).toBe("PROMPT_PARENT_TERMINATED");
    expect(frame.securestring_acquired).toBe(false);
    expect(frame.attempt_marker ?? null).toBeNull();
    expect(frame.node_started).toBe(false);
    expect(frame.productionContact).toBe(false);
    expect(frame.database_connection_attempts).toBe(0);
    expect(frame.sql_application_attempts).toBe(0);
    expect(frame.pr_tip).toBe(tip);
    expect(fs.readdirSync(outDir).filter((f) => f.startsWith("attempt-"))).toEqual([]);
    expect(fs.readdirSync(outDir).filter((f) => /^bundle-.*\.cjs$/.test(f))).toEqual([]);
    expect(fs.readFileSync(evidencePath, "utf8")).not.toMatch(/postgres:\/\//i);
  });

  it("apply remains blocked before credentials after pre-apply pins publish", () => {
    const tip = tipSha();
    const { run, payload } = runAuthenticatedBootstrap(["-Mode", "apply", "-PrHead", tip]);
    expect(run.status).toBe(1);
    expect(String(payload.reason || "")).toMatch(
      /APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS|PRE_APPLY_LIVE_EXPIRED/,
    );
    expect(payload.productionContact).toBe(false);
  });

  it("operator-supplied attempt ids and publication refs cannot authorize the visible route", () => {
    const tip = tipSha();
    const attempt = `apply-${tip.slice(0, 12)}-${crypto.randomBytes(16).toString("hex")}`;
    const { run, payload } = runAuthenticatedBootstrap(
      ["-Mode", "apply", "-PrHead", tip, "-TestApplyAttemptId", attempt],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(run.status, `${run.stdout}\n${run.stderr}`).not.toBe(0);
    expect(String(payload.reason || "")).toMatch(/APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN/);
    expect(payload.productionContact).toBe(false);
  });

  it("visible route and applicator agree on the committed authorization map before credentials", () => {
    const executable = tipSha();
    const head = describeApplyArtifactMap({ cwd: ROOT });
    expect(head.blocked).toBe("APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS");
    expect(head.apply_authorized).toBe(false);
    const unpublished = runAuthenticatedBootstrap(
      ["-Mode", "apply", "-PrHead", executable, "-EmitAuthorizationMap", "-TestPublicationCommit", executable],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(unpublished.run.status, `${unpublished.run.stdout}\n${unpublished.run.stderr}`).not.toBe(0);
    const unpublishedMap = JSON.parse(unpublished.run.stdout.trim());
    expect(unpublishedMap.blocked).toBe(head.blocked);
    expect(unpublishedMap.publication_commit).toBe(executable);
    expect(unpublished.payload.productionContact ?? false).toBe(false);

    const attempt = `apply-${executable.slice(0, 12)}-${crypto.randomBytes(16).toString("hex")}`;
    const published = createDisposablePublicationCommit({
      cwd: ROOT,
      executableCommit: executable,
      attemptId: attempt,
    });
    expect(published.headUnchanged).toBe(true);
    expect(tipSha()).toBe(executable);
    const jsMap = describeApplyArtifactMap({
      cwd: ROOT,
      allowDisposablePublicationCommit: true,
      publicationCommit: published.publicationCommit,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
    });
    const visible = runAuthenticatedBootstrap(
      [
        "-Mode",
        "apply",
        "-PrHead",
        executable,
        "-EmitAuthorizationMap",
        "-TestPublicationCommit",
        published.publicationCommit,
      ],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(visible.run.status, `${visible.run.stdout}\n${visible.run.stderr}`).toBe(0);
    const psMap = JSON.parse(visible.run.stdout.trim());
    expect(psMap.blocked).toBeNull();
    expect(psMap.publication_commit).toBe(jsMap.publication_commit);
    expect(psMap.authorized_executable_commit).toBe(jsMap.authorized_executable_commit);
    expect(psMap.bundle_oid).toBe(jsMap.bundle_oid);
    expect(psMap.apply_authorized).toBe(false);
    expect(String(visible.run.stdout)).not.toMatch(/SecureString|postgres:\/\//i);
    expect(tipSha()).toBe(executable);
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
