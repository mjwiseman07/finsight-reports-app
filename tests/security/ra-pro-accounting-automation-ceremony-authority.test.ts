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
import { DUAL_EXECUTABLE, DUAL_PUBLICATION } from "./helpers/ra-pro-accounting-automation-dual-immutable-pins";
import {
  assertAttemptNotRetired,
  buildAuthorizedRecord,
  createDisposablePublicationCommit,
  commitPublicationTree,
  describeApplyArtifactMap,
  listRetiredAttempts,
  preflightApplyAuthorization,
  revokeProductionApplyAuthorization,
} from "../../scripts/security/ra-pro-accounting-automation-apply-authorization.js";
import { APPLY_AUTHORIZATION_TOKEN } from "../../scripts/security/ra-pro-accounting-automation-apply-constants.js";

const RETIRED_ATTEMPT_ID = "apply-99e5f830789e-1dd9960c6f98a849c37da3ffe550f3e7";

const ROOT = process.cwd();
const AUTH_REL = "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json";
const BUNDLE_REL = "scripts/security/bundles/ra-pro-accounting-automation-applicator.standalone.cjs";
const BOOTSTRAP_REL =
  "scripts/security/bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1";
const NATIVE_ENTRY_REL = "scripts/security/enter-ra-pro-accounting-automation-ceremony.ps1";
const PROJECT_URL = "postgres://user:pass@db.jzmdgwwiestcmmeuhhkr.supabase.co:5432/postgres?sslmode=require";

type MutableAuth = {
  project_ref?: string;
  extra_field?: string;
  standalone_bundle?: { path?: string; oid?: string; sha256?: string; bytes?: number };
  visible_ceremony_bootstrap?: { path?: string; oid?: string; sha256?: string; bytes?: number };
  production_apply_authorization: {
    attempt_id?: string;
    authorized_executable_commit?: string;
    pre_apply_live_evidence: { sha256: string; oid: string; bytes: number };
    prior_dry_run_evidence: { sha256: string; oid: string; bytes: number };
    migrations: Array<{ oid: string }>;
    bundle: { path?: string; oid: string; sha256: string; bytes?: number };
    tls_trust_root?: { der_sha256: string };
  };
};

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

function hashBlob(bytes: Buffer) {
  const hashed = spawnSync("git", ["hash-object", "-w", "--stdin"], {
    cwd: ROOT,
    env: gitEnv(),
    input: bytes,
    windowsHide: true,
  });
  if (hashed.status !== 0) throw new Error(String(hashed.stderr || "hash-object failed"));
  return hashed.stdout.toString("utf8").trim();
}

function commitReplacing(parent: string, files: Array<{ path: string; bytes: Buffer }>) {
  const index = path.join(os.tmpdir(), `ra-acct-idx-${crypto.randomBytes(6).toString("hex")}`);
  const env = { ...gitEnv(), GIT_INDEX_FILE: index };
  const text = (args: string[]) => {
    const r = spawnSync("git", args, { cwd: ROOT, env, encoding: "utf8", windowsHide: true });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
    return (r.stdout || "").trim();
  };
  try {
    text(["read-tree", parent]);
    for (const file of files) {
      text(["update-index", "--add", "--cacheinfo", `100644,${hashBlob(file.bytes)},${file.path}`]);
    }
    const tree = text(["write-tree"]);
    return text(["commit-tree", tree, "-p", parent, "-m", "disposable publication probe"]);
  } finally {
    fs.rmSync(index, { force: true });
  }
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

type LoadedAuth = {
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

function loadAuthAt(commit: string): LoadedAuth {
  const raw = spawnSync("git", ["cat-file", "-p", `${commit}:${AUTH_REL}`], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: gitEnv(),
  });
  if (raw.status !== 0) throw new Error(raw.stderr || "auth load failed");
  return JSON.parse(raw.stdout || "{}") as LoadedAuth;
}

function loadAuth() {
  return loadAuthAt(tipSha());
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

/**
 * Authenticated first hop: seal-materialize bootstrap, then launch temp only.
 * Dual apply probes must pass repoRoot = detached dual publication worktree so
 * Resolve-ImmutableExecutable asserts AUTH-only delta against that tip, not the
 * corrective HEAD (which carries later files and fails the allowlist).
 */
function runAuthenticatedBootstrap(
  args: string[],
  envExtra: Record<string, string> = {},
  existingOutDir = "",
  options: { repoRoot?: string; authCommit?: string } = {},
) {
  const repoRoot = options.repoRoot || ROOT;
  const auth = loadAuthAt(options.authCommit || (repoRoot === ROOT ? tipSha() : DUAL_EXECUTABLE));
  const tip =
    repoRoot === ROOT
      ? tipSha()
      : spawnSync("git", ["rev-parse", "HEAD"], {
          cwd: repoRoot,
          encoding: "utf8",
          windowsHide: true,
          env: gitEnv(),
        }).stdout?.toString().trim() || "";
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
      repoRoot,
      "-SealedMaterialInvocation",
      ...args,
    ],
    {
      cwd: repoRoot,
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

type DualPublicationCtx = {
  worktree: string;
  publicationCommit: string;
  executable: string;
  attempt: string;
};

const _INSIDE_DUAL_EVIDENCE_WINDOW = "2026-09-21T12:00:00Z";
void _INSIDE_DUAL_EVIDENCE_WINDOW;

/**
 * Disposable descendant of DUAL_EXECUTABLE whose only tree edits freshen the
 * sealed pre-apply live evidence window. Required after wall-clock expiry of
 * the immutable dual evidence (valid_until 2026-09-22T04:55:07Z) so apply-mode
 * VISIBLE_PROMPT_READY can still run without synthetic harness env. Does not
 * rewrite DUAL_EXECUTABLE / DUAL_PUBLICATION.
 */
function createFreshenedDualExecutableTip(): string {
  const auth = JSON.parse(git(["cat-file", "-p", `${DUAL_EXECUTABLE}:${AUTH_REL}`])) as {
    pre_apply_live_publication: Record<string, unknown>;
    publication: Record<string, unknown>;
    [key: string]: unknown;
  };
  const pre = auth.pre_apply_live_publication;
  const evidencePath = String(pre.evidence_path);
  const raw = spawnSync("git", ["cat-file", "blob", String(pre.evidence_blob_oid)], {
    cwd: ROOT,
    env: gitEnv(),
    windowsHide: true,
  });
  if (raw.status !== 0) throw new Error(String(raw.stderr || "evidence cat-file failed"));
  const evidence = JSON.parse(
    (Buffer.isBuffer(raw.stdout) ? raw.stdout : Buffer.from(raw.stdout || "")).toString("utf8"),
  ) as Record<string, unknown>;
  // Preserve the sealed dual evidence's exact 24h/collection spacing; slide the
  // window forward so wall-clock "now" remains inside without synthetic as-of.
  const slideSeconds = 24 * 60 * 60;
  const slide = (stamp: string) => {
    const sec = Math.floor(Date.parse(stamp) / 1000) + slideSeconds;
    const d = new Date(sec * 1000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}Z`;
  };
  evidence.valid_from_utc = slide(String(evidence.valid_from_utc));
  evidence.valid_until_utc = slide(String(evidence.valid_until_utc));
  evidence.collection_started_at_utc = slide(String(evidence.collection_started_at_utc));
  evidence.collection_ended_at_utc = slide(String(evidence.collection_ended_at_utc));
  if (evidence.serving_deployment && typeof evidence.serving_deployment === "object") {
    const serving = evidence.serving_deployment as Record<string, unknown>;
    if (typeof serving.observed_at_utc === "string") {
      serving.observed_at_utc = slide(serving.observed_at_utc);
    }
  }
  if (evidence.database_readonly && typeof evidence.database_readonly === "object") {
    const db = evidence.database_readonly as Record<string, unknown>;
    if (typeof db.observed_at_utc === "string") {
      db.observed_at_utc = slide(db.observed_at_utc);
    }
  }
  expect(String(evidence.valid_from_utc)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  expect(String(evidence.valid_until_utc)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  const freshBytes = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  expect(freshBytes.includes(0x0d)).toBe(false);
  const freshOid = hashBlob(freshBytes);
  const freshSha = crypto.createHash("sha256").update(freshBytes).digest("hex");
  const evidenceCommit = commitReplacing(DUAL_EXECUTABLE, [
    { path: evidencePath, bytes: freshBytes },
  ]);
  pre.evidence_source_commit = evidenceCommit;
  pre.evidence_blob_oid = freshOid;
  pre.evidence_sha256 = freshSha;
  pre.evidence_bytes = freshBytes.length;
  pre.valid_until_utc = evidence.valid_until_utc;
  auth.publication.required_pre_apply_live_evidence_sha256 = freshSha;
  if (Object.prototype.hasOwnProperty.call(auth.publication, "required_pre_apply_live_evidence_oid")) {
    auth.publication.required_pre_apply_live_evidence_oid = freshOid;
  }
  if (Object.prototype.hasOwnProperty.call(auth.publication, "required_pre_apply_live_evidence_bytes")) {
    auth.publication.required_pre_apply_live_evidence_bytes = freshBytes.length;
  }
  return commitReplacing(evidenceCommit, [
    { path: AUTH_REL, bytes: Buffer.from(`${JSON.stringify(auth, null, 2)}\n`, "utf8") },
  ]);
}

/** Detached worktree at a disposable dual publication (AUTH-only delta). Does not move branch tip. */
function withDisposableDualPublicationWorktree(
  fn: (ctx: DualPublicationCtx) => void,
  options: { freshenPreApplyEvidence?: boolean } = {},
) {
  const executable = options.freshenPreApplyEvidence
    ? createFreshenedDualExecutableTip()
    : DUAL_EXECUTABLE;
  if (!options.freshenPreApplyEvidence) {
    expect(executable).toBe(DUAL_EXECUTABLE);
  } else {
    expect(
      spawnSync("git", ["merge-base", "--is-ancestor", DUAL_EXECUTABLE, executable], {
        cwd: ROOT,
        env: gitEnv(),
        windowsHide: true,
      }).status,
    ).toBe(0);
  }
  const attempt = `apply-${DUAL_EXECUTABLE.slice(0, 12)}-${crypto.randomBytes(16).toString("hex")}`;
  const published = createDisposablePublicationCommit({
    cwd: ROOT,
    executableCommit: executable,
    attemptId: attempt,
  });
  expect(published.headUnchanged).toBe(true);
  expect(tipSha()).toBe(git(["rev-parse", "HEAD"]));
  const worktree = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-dual-wt-"));
  try {
    git(["worktree", "add", "--detach", worktree, published.publicationCommit]);
    fn({
      worktree,
      publicationCommit: published.publicationCommit,
      executable,
      attempt,
    });
  } finally {
    spawnSync("git", ["worktree", "remove", "--force", worktree], {
      cwd: ROOT,
      env: gitEnv(),
      windowsHide: true,
    });
    try {
      fs.rmSync(worktree, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

describe("RA Pro accounting-automation ceremony authority", () => {
  it("corrective HEAD is not a valid dual publication tip against immutable executable", () => {
    expect(git(["rev-parse", "--verify", `${DUAL_EXECUTABLE}^{commit}`])).toBe(DUAL_EXECUTABLE);
    expect(git(["rev-parse", "--verify", `${DUAL_PUBLICATION}^{commit}`])).toBe(DUAL_PUBLICATION);
    expect(git(["diff", "--name-only", DUAL_EXECUTABLE, DUAL_PUBLICATION])).toBe(AUTH_REL);
    expect(() => describeApplyArtifactMap({ cwd: ROOT })).toThrow(/APPLY_AUTHORIZATION_ALLOWLIST/);
    try {
      describeApplyArtifactMap({ cwd: ROOT });
    } catch (err) {
      expect(String((err as Error).message || err)).toMatch(/corrective/);
    }
  });

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
      "2ed897b17fc964619454a3eb3a40899cd9a08eede5481324f636762528d43c3e",
    );
    expect(auth.precondition_publication?.status).toBe("PUBLISHED");
    expect(auth.precondition_publication?.evidence_sha256).toBe(
      "149db26f0fed83d2d1cd1fd03a756fa999e8748f52bd7c5a71336dd43f0e2851",
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
    withDisposableDualPublicationWorktree(({ worktree, publicationCommit, executable }) => {
      const jsMap = describeApplyArtifactMap({
        cwd: ROOT,
        allowDisposablePublicationCommit: true,
        publicationCommit,
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      });
      expect(jsMap.blocked).toBeNull();
      expect(jsMap.apply_authorized).toBe(false);
      expect(jsMap.authorized_executable_commit).toBe(executable);
      expect(jsMap.publication_commit).toBe(publicationCommit);

      const visible = runAuthenticatedBootstrap(
        [
          "-Mode",
          "apply",
          "-PrHead",
          executable,
          "-EmitAuthorizationMap",
          "-TestPublicationCommit",
          publicationCommit,
        ],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(visible.run.status, `${visible.run.stdout}\n${visible.run.stderr}`).toBe(0);
      const psMap = JSON.parse(visible.run.stdout.trim());
      expect(psMap.blocked).toBeNull();
      expect(psMap.apply_authorized).toBe(false);
      expect(psMap.publication_commit).toBe(publicationCommit);
      expect(psMap.authorized_executable_commit).toBe(executable);
      expect(String(visible.run.stdout)).not.toMatch(/SecureString|postgres:\/\//i);
      expect(fs.readdirSync(visible.outDir).filter((name) => name.endsWith(".marker"))).toEqual([]);
      expect(visible.payload.productionContact ?? false).toBe(false);
    });
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
    const executable = DUAL_EXECUTABLE;
    const unpublishedJs = describeApplyArtifactMap({
      cwd: ROOT,
      allowDisposablePublicationCommit: true,
      publicationCommit: executable,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
    });
    expect(unpublishedJs.blocked).toBe("APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS");
    expect(unpublishedJs.apply_authorized).toBe(false);

    const execWorktree = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-exec-wt-"));
    try {
      git(["worktree", "add", "--detach", execWorktree, executable]);
      const unpublished = runAuthenticatedBootstrap(
        ["-Mode", "apply", "-PrHead", executable, "-EmitAuthorizationMap", "-TestPublicationCommit", executable],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: execWorktree, authCommit: executable },
      );
      expect(unpublished.run.status, `${unpublished.run.stdout}\n${unpublished.run.stderr}`).not.toBe(0);
      const unpublishedMap = JSON.parse(unpublished.run.stdout.trim());
      expect(unpublishedMap.blocked).toBe(unpublishedJs.blocked);
      expect(unpublishedMap.publication_commit).toBe(executable);
      expect(unpublished.payload.productionContact ?? false).toBe(false);
    } finally {
      spawnSync("git", ["worktree", "remove", "--force", execWorktree], {
        cwd: ROOT,
        env: gitEnv(),
        windowsHide: true,
      });
      try {
        fs.rmSync(execWorktree, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }

    withDisposableDualPublicationWorktree(({ worktree, publicationCommit, attempt }) => {
      const jsMap = describeApplyArtifactMap({
        cwd: ROOT,
        allowDisposablePublicationCommit: true,
        publicationCommit,
        authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      });
      expect(jsMap.blocked).toBeNull();
      expect(jsMap.apply_authorized).toBe(false);
      expect(jsMap.attempt_id).toBe(attempt);

      const visible = runAuthenticatedBootstrap(
        [
          "-Mode",
          "apply",
          "-PrHead",
          executable,
          "-EmitAuthorizationMap",
          "-TestPublicationCommit",
          publicationCommit,
        ],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(visible.run.status, `${visible.run.stdout}\n${visible.run.stderr}`).toBe(0);
      const psMap = JSON.parse(visible.run.stdout.trim());
      expect(psMap.blocked).toBeNull();
      expect(psMap.publication_commit).toBe(jsMap.publication_commit);
      expect(psMap.authorized_executable_commit).toBe(jsMap.authorized_executable_commit);
      expect(psMap.bundle_oid).toBe(jsMap.bundle_oid);
      expect(psMap.apply_authorized).toBe(false);
      expect(String(visible.run.stdout)).not.toMatch(/SecureString|postgres:\/\//i);
      expect(fs.readdirSync(visible.outDir).filter((name) => name.endsWith(".marker"))).toEqual([]);
    });
  });

  it("rejects synthetic descendant publications on the visible route before prompt or marker", () => {
    withDisposableDualPublicationWorktree(({ worktree, publicationCommit: basePublication, executable }) => {
      const base = JSON.parse(git(["cat-file", "-p", `${basePublication}:${AUTH_REL}`]));
      const cases: Array<{ code: RegExp; beforeNode: boolean; mutate: (auth: MutableAuth) => void }> = [
        { code: /APPLY_AUTHORIZATION_ALLOWLIST/, beforeNode: true, mutate: (auth) => { auth.extra_field = "not-allowed"; } },
        { code: /APPLY_AUTHORIZATION_ALLOWLIST/, beforeNode: true, mutate: (auth) => { auth.project_ref = "not-the-project"; } },
        {
          code: /APPLY_AUTHORIZATION_SEAL_MISSING/,
          beforeNode: false,
          mutate: (auth) => { auth.production_apply_authorization.pre_apply_live_evidence.sha256 = "a".repeat(64); },
        },
        {
          code: /APPLY_AUTHORIZATION_BUNDLE_MISMATCH/,
          beforeNode: false,
          mutate: (auth) => { auth.production_apply_authorization.bundle.oid = "b".repeat(40); },
        },
        {
          code: /APPLY_AUTHORIZATION_SEAL_MISSING/,
          beforeNode: false,
          mutate: (auth) => { delete auth.production_apply_authorization.tls_trust_root; },
        },
        {
          code: /APPLY_AUTHORIZATION_ANCESTRY/,
          beforeNode: true,
          mutate: (auth) => { auth.production_apply_authorization.authorized_executable_commit = "c".repeat(40); },
        },
      ];
      for (const item of cases) {
        const auth = JSON.parse(JSON.stringify(base)) as MutableAuth;
        item.mutate(auth);
        const publicationCommit = commitPublicationTree(ROOT, executable, auth);
        const js = preflightApplyAuthorization({
          cwd: ROOT,
          allowDisposablePublicationCommit: true,
          publicationCommit,
          now: "2026-09-21T12:00:00Z",
        });
        const visible = runAuthenticatedBootstrap(
          ["-Mode", "apply", "-PrHead", executable, "-EmitAuthorizationMap", "-TestPublicationCommit", publicationCommit],
          { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
          "",
          { repoRoot: worktree, authCommit: executable },
        );
        expect(visible.run.status, `${item.code} ${visible.run.stdout}\n${visible.run.stderr}`).not.toBe(0);
        const psMap = JSON.parse(visible.run.stdout.trim());
        if (item.beforeNode) {
          expect(psMap.verdict).toBe("BLOCKED");
          expect(String(psMap.reason || "")).toMatch(item.code);
          expect(psMap.blocked).toBeUndefined();
          expect(visible.run.stdout).not.toMatch(/"protocol"/);
        } else {
          expect(String(psMap.blocked || "")).toMatch(item.code);
          expect(psMap.blocked).toBe(js.blocked);
        }
        expect(fs.readdirSync(visible.outDir).filter((name) => name.endsWith(".marker"))).toEqual([]);
        expect(`${visible.run.stdout}\n${visible.run.stderr}`).not.toMatch(/SecureString/);
      }
    });
  });

  it("rejects a substituted bundle and a publication-selected first hop before Node", () => {
    withDisposableDualPublicationWorktree(({ worktree, publicationCommit: publishedCommit, executable }) => {
      const auth = JSON.parse(git(["cat-file", "-p", `${publishedCommit}:${AUTH_REL}`])) as MutableAuth;
      const stub = Buffer.from(
        'console.log(JSON.stringify({blocked:null,substituted:"SUBSTITUTED_BUNDLE_EXECUTED",protocol:"SUBSTITUTED"}))\n',
        "utf8",
      );
      const stubOid = hashBlob(stub);
      auth.standalone_bundle = {
        ...(auth.standalone_bundle || {}),
        path: BUNDLE_REL,
        oid: stubOid,
        sha256: crypto.createHash("sha256").update(stub).digest("hex"),
        bytes: stub.length,
      };
      auth.production_apply_authorization.bundle = {
        path: BUNDLE_REL,
        oid: stubOid,
        sha256: auth.standalone_bundle.sha256,
        bytes: stub.length,
      };
      const replaced = commitReplacing(executable, [
        { path: AUTH_REL, bytes: Buffer.from(`${JSON.stringify(auth, null, 2)}\n`, "utf8") },
        { path: BUNDLE_REL, bytes: stub },
      ]);
      const attack = runAuthenticatedBootstrap(
        ["-Mode", "apply", "-PrHead", executable, "-EmitAuthorizationMap", "-TestPublicationCommit", replaced],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(attack.run.status, `${attack.run.stdout}\n${attack.run.stderr}`).not.toBe(0);
      const attackMap = JSON.parse(attack.run.stdout.trim());
      expect(attackMap.verdict).toBe("BLOCKED");
      expect(String(attackMap.reason || "")).toMatch(/APPLY_AUTHORIZATION_BUNDLE_MISMATCH/);
      expect(attackMap.blocked).toBeUndefined();
      expect(`${attack.run.stdout}\n${attack.run.stderr}`).not.toMatch(/SUBSTITUTED_BUNDLE_EXECUTED|SecureString|"protocol"/);
      expect(fs.readdirSync(attack.outDir).filter((name) => name.endsWith(".marker"))).toEqual([]);

      const changedPath = JSON.parse(JSON.stringify(JSON.parse(git(["cat-file", "-p", `${publishedCommit}:${AUTH_REL}`])))) as MutableAuth;
      changedPath.standalone_bundle = { ...(changedPath.standalone_bundle || {}), path: "scripts/security/bundles/not-the-bundle.cjs" };
      const pathCommit = commitPublicationTree(ROOT, executable, changedPath);
      const pathRun = runAuthenticatedBootstrap(
        ["-Mode", "apply", "-PrHead", executable, "-EmitAuthorizationMap", "-TestPublicationCommit", pathCommit],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(JSON.parse(pathRun.run.stdout.trim()).reason).toMatch(/APPLY_AUTHORIZATION_BUNDLE_MISMATCH/);
      expect(pathRun.run.stdout).not.toMatch(/"protocol"/);

      const missing = JSON.parse(JSON.stringify(JSON.parse(git(["cat-file", "-p", `${publishedCommit}:${AUTH_REL}`])))) as MutableAuth;
      delete missing.standalone_bundle;
      const missingCommit = commitPublicationTree(ROOT, executable, missing);
      const missingRun = runAuthenticatedBootstrap(
        ["-Mode", "apply", "-PrHead", executable, "-EmitAuthorizationMap", "-TestPublicationCommit", missingCommit],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(JSON.parse(missingRun.run.stdout.trim()).reason).toMatch(/APPLY_AUTHORIZATION_SEAL_MISSING/);
      expect(missingRun.run.stdout).not.toMatch(/"protocol"/);

      const extra = commitReplacing(publishedCommit, [
        { path: "docs/security/ra-pro-accounting-automation-apply/EXTRA_PUBLICATION.txt", bytes: Buffer.from("extra\n", "utf8") },
      ]);
      const extraRun = runAuthenticatedBootstrap(
        ["-Mode", "apply", "-PrHead", executable, "-EmitAuthorizationMap", "-TestPublicationCommit", extra],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(JSON.parse(extraRun.run.stdout.trim()).reason).toMatch(/APPLY_AUTHORIZATION_ALLOWLIST/);
      expect(extraRun.run.stdout).not.toMatch(/"protocol"/);

      const wrongTip = runAuthenticatedBootstrap(
        ["-Mode", "apply", "-PrHead", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "-EmitAuthorizationMap", "-TestPublicationCommit", publishedCommit],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(String(wrongTip.payload.reason || "")).toMatch(/BLOCKED_PIN_MISMATCH/);
      expect(wrongTip.run.stdout).not.toMatch(/"protocol"|SUBSTITUTED_BUNDLE_EXECUTED/);

      const freeze = String(loadAuthAt(executable).authorized_pr_head || "");
      const swapped = commitReplacing(freeze, [
        {
          path: AUTH_REL,
          bytes: Buffer.from(`${JSON.stringify(JSON.parse(git(["cat-file", "-p", `${publishedCommit}:${AUTH_REL}`])), null, 2)}\n`, "utf8"),
        },
      ]);
      const swapRun = runAuthenticatedBootstrap(
        ["-Mode", "apply", "-PrHead", executable, "-EmitAuthorizationMap", "-TestPublicationCommit", swapped],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(JSON.parse(swapRun.run.stdout.trim()).reason).toMatch(/APPLY_AUTHORIZATION_ANCESTRY/);
      expect(swapRun.run.stdout).not.toMatch(/"protocol"/);

      const bundlePath = path.join(worktree, BUNDLE_REL);
      const originalBundle = fs.readFileSync(bundlePath);
      try {
        fs.writeFileSync(bundlePath, Buffer.from("POISONED_WORKTREE_BUNDLE\n", "utf8"));
        const poisoned = runAuthenticatedBootstrap(
          ["-Mode", "apply", "-PrHead", executable, "-EmitAuthorizationMap", "-TestPublicationCommit", publishedCommit],
          { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
          "",
          { repoRoot: worktree, authCommit: executable },
        );
        expect(poisoned.run.status, `${poisoned.run.stdout}\n${poisoned.run.stderr}`).toBe(0);
        const ok = JSON.parse(poisoned.run.stdout.trim());
        expect(ok.blocked).toBeNull();
        expect(ok.protocol).toBe("RA_PRO_ACCOUNTING_AUTOMATION_ONE_ATTEMPT_APPLY_AUTHORIZATION_V1");
        expect(poisoned.run.stdout).not.toMatch(/POISONED_WORKTREE_BUNDLE/);
        expect(fs.readdirSync(poisoned.outDir).filter((name) => name.endsWith(".marker"))).toEqual([]);
      } finally {
        fs.writeFileSync(bundlePath, originalBundle);
      }
    });
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
    const executableBlocks = launches.filter((block) => !block.includes("DO NOT RUN"));
    expect(executableBlocks).toHaveLength(1);

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

    withDisposableDualPublicationWorktree(({ worktree, publicationCommit, executable: executableTip }) => {
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
            cwd: worktree,
            encoding: "utf8",
            windowsHide: true,
            env: {
              ...gitEnv(),
              GIT_CONFIG_VALUE_0: worktree.replace(/\\/g, "/"),
              RA_ACCT_LAUNCH_SENTINEL: sentinel,
            },
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
      expect(launch).not.toMatch(/Get-Content[^\n]*ExpectedBootstrapPath/);
      expect(launch).toContain("publication bootstrap seal");
      expect(launch).toContain('Invoke-GitBlob "${bootSrc}:${ExpectedBootstrapPath}"');

      const bootstrapPath = path.join(worktree, BOOTSTRAP_REL);
      const bootstrapBytes = fs.readFileSync(bootstrapPath);
      try {
        fs.writeFileSync(bootstrapPath, Buffer.from("POISONED_WORKTREE_BOOTSTRAP\n", "utf8"));
        const poisoned = runSubstituted(neutralized);
        expect(poisoned.run.status, poisoned.text).toBe(0);
        expect(poisoned.launched).toBe(true);
        expect(poisoned.text).not.toMatch(/POISONED_WORKTREE_BOOTSTRAP/);
      } finally {
        fs.writeFileSync(bootstrapPath, bootstrapBytes);
      }

      const sealed = JSON.parse(git(["cat-file", "-p", `${publicationCommit}:${AUTH_REL}`])) as MutableAuth;
      sealed.visible_ceremony_bootstrap = {
        ...(sealed.visible_ceremony_bootstrap || {}),
        oid: "a".repeat(40),
        sha256: "b".repeat(64),
      };
      const selected = commitPublicationTree(ROOT, executableTip, sealed);
      const tipLine = '$Tip = (git -C $Repo rev-parse --verify "HEAD^{commit}").Trim().ToLowerInvariant()\n';
      const declared = runSubstituted(neutralized.replace(tipLine, `$Tip = "${selected}"\n`));
      expect(declared.run.status, declared.text).not.toBe(0);
      expect(declared.text).toMatch(/APPLY_AUTHORIZATION_ALLOWLIST: publication bootstrap seal/);
      expect(declared.launched).toBe(false);
    });
  });

  it("permanently retires the consumed attempt and keeps authorization UNPUBLISHED", () => {
    const tip = DUAL_EXECUTABLE;
    const auth = JSON.parse(git(["cat-file", "-p", `${tip}:${AUTH_REL}`]));
    expect(auth.production_apply_authorization.status).toBe("UNPUBLISHED");
    expect(auth.production_apply_authorization.apply_authorized).toBe(false);
    expect(auth.production_apply_authorization.authorized_executable_commit).toBeNull();
    expect(auth.production_apply_authorization.attempt_id).toBeNull();
    const retired = listRetiredAttempts(auth);
    expect(retired.some((row: { attempt_id?: string }) => row.attempt_id === RETIRED_ATTEMPT_ID)).toBe(true);
    expect(() => assertAttemptNotRetired(auth, RETIRED_ATTEMPT_ID)).toThrow(/APPLY_ATTEMPT_RETIRED/);
    expect(() =>
      createDisposablePublicationCommit({
        cwd: ROOT,
        executableCommit: DUAL_EXECUTABLE,
        attemptId: RETIRED_ATTEMPT_ID,
      }),
    ).toThrow(/APPLY_ATTEMPT_RETIRED/);
    const fresh = `apply-${tip.slice(0, 12)}-${crypto.randomBytes(16).toString("hex")}`;
    const crafted = JSON.parse(JSON.stringify(auth));
    crafted.production_apply_authorization = buildAuthorizedRecord(crafted, tip, fresh);
    crafted.production_apply_authorization.attempt_id = RETIRED_ATTEMPT_ID;
    const poisoned = commitPublicationTree(ROOT, tip, crafted);
    const map = preflightApplyAuthorization({
      cwd: ROOT,
      allowDisposablePublicationCommit: true,
      publicationCommit: poisoned,
      authorizationToken: APPLY_AUTHORIZATION_TOKEN,
      now: "2026-09-21T12:00:00Z",
    });
    expect(map.blocked).toMatch(/APPLY_ATTEMPT_RETIRED/);
    expect(map.apply_authorized).toBe(false);
  });

  it("explicit revoke refuses a second retirement of the same attempt id", () => {
    const tip = tipSha();
    const auth = JSON.parse(git(["cat-file", "-p", `${tip}:${AUTH_REL}`]));
    const row = listRetiredAttempts(auth).find(
      (item: { attempt_id?: string }) => item.attempt_id === RETIRED_ATTEMPT_ID,
    );
    expect(row).toBeTruthy();
    auth.production_apply_authorization = {
      ...auth.production_apply_authorization,
      status: "AUTHORIZED",
      apply_authorized: true,
      attempt_id: RETIRED_ATTEMPT_ID,
      authorized_executable_commit: tip,
    };
    expect(() =>
      revokeProductionApplyAuthorization(auth, {
        attempt_id: RETIRED_ATTEMPT_ID,
        authorization_publication_commit: String(row.authorization_publication_commit),
        authorized_executable_commit: String(row.authorized_executable_commit),
        authorization_blob_oid: String(row.authorization_blob_oid),
        authorization_blob_sha256: String(row.authorization_blob_sha256),
        authorization_blob_bytes: Number(row.authorization_blob_bytes),
        terminal_reason: "SYNTHETIC_URL_NOT_ALLOWED",
        retired_at_utc: "2026-09-21T23:00:00Z",
      }),
    ).toThrow(/APPLY_ATTEMPT_RETIRED/);
  });

  it("real descendant publication at HEAD reaches the visible prompt without synthetic harness env", () => {
    withDisposableDualPublicationWorktree(
      ({ worktree, executable }) => {
      expect(executable).not.toBe(DUAL_EXECUTABLE);
      expect(
        spawnSync("git", ["merge-base", "--is-ancestor", DUAL_EXECUTABLE, executable], {
          cwd: ROOT,
          env: gitEnv(),
          windowsHide: true,
        }).status,
      ).toBe(0);
      const auth = loadAuthAt(executable);
      const prePub = (auth as { pre_apply_live_publication?: { evidence_source_commit?: string; evidence_sha256?: string; valid_until_utc?: string } }).pre_apply_live_publication;
      expect(String(prePub?.evidence_source_commit || "")).not.toBe("bd79ac0fe2eb82393b2a0715732235e9e509cb23");
      expect(String(prePub?.valid_until_utc || "")).toMatch(/^2026-09-2[2-4]T/);
      const liveEvidence = JSON.parse(
        git(["cat-file", "-p", `${prePub?.evidence_source_commit}:${(auth as { pre_apply_live_publication: { evidence_path: string } }).pre_apply_live_publication.evidence_path}`]),
      ) as { valid_from_utc: string; valid_until_utc: string; collection_started_at_utc: string; collection_ended_at_utc: string };
      expect(liveEvidence.valid_from_utc).toBe(liveEvidence.collection_started_at_utc);
      expect(liveEvidence.valid_until_utc > liveEvidence.valid_from_utc).toBe(true);
      const bootSrc = String(auth.bootstrap_source_commit || "");
      const seal = auth.visible_ceremony_bootstrap;
      if (!seal?.path || !seal.oid || !seal.sha256 || !seal.bytes) {
        throw new Error("missing visible_ceremony_bootstrap seals");
      }
      const show = spawnSync("git", ["cat-file", "blob", `${bootSrc}:${seal.path}`], {
        cwd: ROOT,
        windowsHide: true,
        env: gitEnv(),
      });
      if (show.status !== 0) throw new Error(String(show.stderr || "cat-file failed"));
      const bytes = Buffer.isBuffer(show.stdout) ? show.stdout : Buffer.from(show.stdout || "");
      const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-desc-out-"));
      const materialDir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-desc-mat-"));
      const bootFile = path.join(materialDir, "bootstrap-visible-ra-pro-accounting-automation-ceremony.ps1");
      fs.writeFileSync(bootFile, bytes);
      const cleanEnv = { ...gitEnv() };
      delete cleanEnv.RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL;
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
          worktree,
          "-SealedMaterialInvocation",
          "-Mode",
          "apply",
          "-PrHead",
          executable,
          "-TestVisiblePromptProbe",
        ],
        {
          cwd: worktree,
          encoding: "utf8",
          windowsHide: true,
          env: cleanEnv,
        },
      );
      const payload = lastJson(`${run.stdout || ""}${run.stderr || ""}`);
      expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
      expect(payload.result_code).toBe("VISIBLE_PROMPT_READY");
      expect(String(payload.reason || "")).not.toMatch(/SYNTHETIC_URL_NOT_ALLOWED/);
      expect(payload.productionContact).toBe(false);
      expect(payload.attempt_marker).toBeNull();
      expect(payload.node_started ?? false).toBe(false);
      expect(fs.readdirSync(outDir).filter((f) => f.endsWith(".marker"))).toEqual([]);
      expect(`${run.stdout || ""}${run.stderr || ""}`).not.toMatch(/postgres:\/\//i);

      const unpublished = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          bootFile,
          "-EvidenceOutDir",
          fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-unpub-")),
          "-RepoRoot",
          ROOT,
          "-SealedMaterialInvocation",
          "-Mode",
          "apply",
          "-PrHead",
          DUAL_EXECUTABLE,
          "-TestVisiblePromptProbe",
        ],
        {
          cwd: ROOT,
          encoding: "utf8",
          windowsHide: true,
          env: cleanEnv,
        },
      );
      const unpublishedPayload = lastJson(`${unpublished.stdout || ""}${unpublished.stderr || ""}`);
      expect(unpublished.status).not.toBe(0);
      expect(String(unpublishedPayload.reason || "")).toMatch(
        /APPLY_AUTHORIZATION_ALLOWLIST|APPLY_REMAINS_BLOCKED_BEFORE_CREDENTIALS|AUTHORIZATION_PINS_UNPUBLISHED|PRE_APPLY_LIVE_EXPIRED|BLOCKED_PIN_MISMATCH/,
      );
      expect(String(unpublishedPayload.reason || "")).not.toMatch(/SYNTHETIC_URL_NOT_ALLOWED/);

      const harness = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          bootFile,
          "-EvidenceOutDir",
          fs.mkdtempSync(path.join(os.tmpdir(), "ra-acct-harness-")),
          "-RepoRoot",
          worktree,
          "-SealedMaterialInvocation",
          "-Mode",
          "apply",
          "-PrHead",
          executable,
          "-TestVisiblePromptProbe",
          "-TestSyntheticDatabaseUrl",
          PROJECT_URL,
        ],
        {
          cwd: worktree,
          encoding: "utf8",
          windowsHide: true,
          env: cleanEnv,
        },
      );
      const harnessPayload = lastJson(`${harness.stdout || ""}${harness.stderr || ""}`);
      expect(harness.status).not.toBe(0);
      expect(String(harnessPayload.reason || harnessPayload.result_code || "")).toMatch(
        /PROMPT_PROBE_REJECTS|SYNTHETIC_URL_NOT_ALLOWED|BLOCKED_HARNESS/,
      );
      try {
        fs.rmSync(materialDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    },
      { freshenPreApplyEvidence: true },
    );
  });

  it("credential-free synthetic publication map still requires harness env and never opens a prompt", () => {
    withDisposableDualPublicationWorktree(({ worktree, publicationCommit, executable, attempt }) => {
      const denied = runAuthenticatedBootstrap(
        [
          "-Mode",
          "apply",
          "-PrHead",
          executable,
          "-EmitAuthorizationMap",
          "-TestPublicationCommit",
          publicationCommit,
        ],
        {},
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(denied.run.status).not.toBe(0);
      expect(String(denied.payload.reason || "")).toMatch(/SYNTHETIC_URL_NOT_ALLOWED/);
      const allowed = runAuthenticatedBootstrap(
        [
          "-Mode",
          "apply",
          "-PrHead",
          executable,
          "-EmitAuthorizationMap",
          "-TestPublicationCommit",
          publicationCommit,
        ],
        { RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL: "1" },
        "",
        { repoRoot: worktree, authCommit: executable },
      );
      expect(allowed.run.status, `${allowed.run.stdout}\n${allowed.run.stderr}`).toBe(0);
      const map = JSON.parse(allowed.run.stdout.trim());
      expect(map.blocked).toBeNull();
      expect(map.attempt_id).toBe(attempt);
      expect(map.apply_authorized).toBe(false);
      expect(String(allowed.run.stdout)).not.toMatch(/SecureString|VISIBLE_PROMPT_READY/);
      expect(fs.readdirSync(allowed.outDir).filter((name) => name.endsWith(".marker"))).toEqual([]);
    });
  });
});
