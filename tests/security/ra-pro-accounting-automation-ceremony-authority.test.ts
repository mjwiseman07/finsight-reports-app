/**
 * Ceremony-authority seal/materialize coverage for RA Pro accounting-automation.
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
    ceremony_source_commit?: string;
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

function runSupervise(args: string[], envExtra: Record<string, string> = {}) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-sup-"));
  const run = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      "scripts/security/supervise-visible-ra-pro-accounting-automation-ceremony.ps1",
      "-EvidenceOutDir",
      outDir,
      ...args,
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      windowsHide: true,
      env: { ...gitEnv(), ...envExtra },
    },
  );
  return {
    run,
    outDir,
    payload: lastJson(`${run.stdout || ""}${run.stderr || ""}`),
  };
}

describe("RA Pro accounting-automation ceremony authority", () => {
  it("publishes non-circular freeze/source/tip seals for supervise/enter/ceremony", () => {
    const auth = loadAuth();
    const tip = tipSha().toLowerCase();
    const freeze = String(auth.authorized_pr_head || "").toLowerCase();
    const source = String(auth.ceremony_source_commit || "").toLowerCase();
    expect(freeze).toMatch(/^[0-9a-f]{40}$/);
    expect(source).toMatch(/^[0-9a-f]{40}$/);
    expect(tip).toMatch(/^[0-9a-f]{40}$/);
    expect(tip).not.toBe(freeze);
    expect(tip).not.toBe(source);
    expect(freeze).not.toBe(source);
    expect(git(["merge-base", "--is-ancestor", freeze, source])).toBe("");
    expect(git(["merge-base", "--is-ancestor", source, tip])).toBe("");

    for (const key of [
      "visible_ceremony_supervisor",
      "visible_ceremony_entry",
      "operator_ceremony",
    ] as const) {
      const seal = auth[key] as AuthSeal;
      expect(seal?.path).toBeTruthy();
      expect(String(seal.source_commit).toLowerCase()).toBe(source);
      expect(seal.line_endings).toBe("LF");
      expect(String(seal.oid)).toMatch(/^[0-9a-f]{40}$/);
      expect(String(seal.sha256)).toMatch(/^[0-9a-f]{64}$/);
      expect(Number(seal.bytes)).toBeGreaterThan(0);
      const oid = git(["rev-parse", `${source}:${seal.path}`]);
      expect(oid).toBe(seal.oid);
      const buf = spawnSync("git", ["show", `${source}:${seal.path}`], {
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
      "8714cea78cf04defdc3bfa63555aca507220fb4ec985b3709fdef629a34499b8",
    );
  });

  it("worktree-poisoned enter+ceremony still executes only sealed source blobs", () => {
    const tip = tipSha();
    const enterPath = path.join(ROOT, "scripts/security/enter-ra-pro-accounting-automation-apply.ps1");
    const ceremonyPath = path.join(
      ROOT,
      "scripts/security/operator-ra-pro-accounting-automation-production-dryrun-ceremony.ps1",
    );
    const enterBackup = fs.readFileSync(enterPath);
    const ceremonyBackup = fs.readFileSync(ceremonyPath);
    try {
      fs.writeFileSync(
        enterPath,
        `${enterBackup.toString("utf8")}\n# POISON_ENTER_${Date.now()}\n`,
        "utf8",
      );
      fs.writeFileSync(
        ceremonyPath,
        `${ceremonyBackup.toString("utf8")}\n# POISON_CEREMONY_${Date.now()}\n`,
        "utf8",
      );
      const { run, payload } = runSupervise(
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
      const child = payload.child_evidence as Record<string, unknown>;
      expect(child.databaseConnectionAttempts ?? 0).toBe(0);
      expect(child.sqlApplicationAttempts ?? 0).toBe(0);
    } finally {
      fs.writeFileSync(enterPath, enterBackup);
      fs.writeFileSync(ceremonyPath, ceremonyBackup);
    }
  });

  it("wrong PrHead / forbidden env overrides fail before credentials", () => {
    const tip = tipSha();
    const wrong = runSupervise(
      ["-Mode", "dry-run", "-PrHead", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
      { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
    );
    expect(wrong.run.status).toBe(1);
    expect(String(wrong.payload.reason || "")).toMatch(/BLOCKED_PIN_MISMATCH|BLOCKED_PUBLICATION_TIP/);

    const envOverride = runSupervise(
      [
        "-Mode",
        "dry-run",
        "-PrHead",
        tip,
        "-TestSyntheticDatabaseUrl",
        PROJECT_URL,
      ],
      {
        RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1",
        RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_PATH: "C:\\evil\\ceremony.ps1",
      },
    );
    expect(envOverride.run.status).toBe(1);
    expect(String(envOverride.payload.reason || "")).toMatch(/BLOCKED_INPUT_INVALID/);
  });

  it("direct ceremony and direct enter execution are rejected", () => {
    const tip = tipSha();
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
    const cerPayload = lastJson(`${directCer.stdout || ""}${directCer.stderr || ""}`);
    expect(directCer.status).toBe(1);
    expect(String(cerPayload.reason || "")).toMatch(/CEREMONY_DIRECT_EXEC_FORBIDDEN/);

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
    const enterPayload = lastJson(`${directEnter.stdout || ""}${directEnter.stderr || ""}`);
    expect(directEnter.status).toBe(1);
    expect(String(enterPayload.reason || "")).toMatch(/ENTRY_DIRECT_EXEC_FORBIDDEN/);
  });

  it("apply remains blocked by unpublished later pins via sealed supervise path", () => {
    const tip = tipSha();
    const { run, payload } = runSupervise(["-Mode", "apply", "-PrHead", tip]);
    expect(run.status).toBe(1);
    expect(String(payload.reason || "")).toMatch(/AUTHORIZATION_PINS_UNPUBLISHED/);
    expect(payload.productionContact).toBe(false);
  });
});
