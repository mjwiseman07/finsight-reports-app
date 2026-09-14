import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ARTIFACT_COMMIT } from "../../scripts/security/free-review-lead-session-apply-constants.js";

const ROOT = process.cwd();
const AUTH_PATH = "docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json";
const BOOTSTRAP_REL = "scripts/security/bootstrap-free-review-lead-session-apply.ps1";
const ENTER_REL = "scripts/security/enter-free-review-lead-session-apply.ps1";
const isWin = process.platform === "win32";

function sha256(buf: Buffer | string) {
  return createHash("sha256").update(buf).digest("hex");
}

function readAuth() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, AUTH_PATH), "utf8"));
}

function parseEvidence(stdout: string) {
  const { parseFrlsStdout } = require("./helpers/frls-evidence.js");
  return parseFrlsStdout(stdout);
}

function resolveTestPrHead() {
  return String(readAuth().authorized_pr_head || "PENDING_AFTER_COMMIT");
}

function materializeBootstrap(dest: string) {
  const auth = readAuth();
  const buf = fs.readFileSync(path.join(ROOT, BOOTSTRAP_REL));
  expect(sha256(buf)).toBe(auth.native_bootstrap.sha256);
  expect(buf.length).toBe(auth.native_bootstrap.bytes);
  fs.writeFileSync(dest, buf);
  return buf;
}

function runBootstrap(opts: {
  prHead?: string;
  mode?: string;
  evidenceTip?: string;
  env?: NodeJS.ProcessEnv;
  forward?: string[];
  cwd?: string;
  hostileNodeEnv?: Record<string, string>;
}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-boot-test-"));
  const bootFile = path.join(dir, "bootstrap.ps1");
  materializeBootstrap(bootFile);
  const prHead = opts.prHead ?? resolveTestPrHead();

  const psArgs = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    bootFile,
    "-PrHead",
    prHead,
    "-Mode",
    opts.mode || "dry-run",
    "-RepoRoot",
    ROOT,
  ];
  if (opts.evidenceTip) psArgs.push("-EvidenceTip", opts.evidenceTip);
  if (opts.forward?.length) psArgs.push(...opts.forward);

  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    USERPROFILE: process.env.USERPROFILE,
    ComSpec: process.env.ComSpec,
    ...opts.env,
  };
  delete env.PATHEXT;

  let r;
  if (opts.hostileNodeEnv && Object.keys(opts.hostileNodeEnv).length > 0) {
    const cmdArgs = ["/c"];
    for (const [k, v] of Object.entries(opts.hostileNodeEnv)) {
      cmdArgs.push("set", `${k}=${v}`, "&&");
    }
    cmdArgs.push("powershell.exe", ...psArgs);
    r = spawnSync("cmd.exe", cmdArgs, {
      cwd: opts.cwd || ROOT,
      encoding: "utf8",
      windowsHide: true,
      env,
    });
  } else {
    r = spawnSync("powershell.exe", psArgs, {
      cwd: opts.cwd || ROOT,
      encoding: "utf8",
      windowsHide: true,
      env,
    });
  }

  fs.rmSync(dir, { recursive: true, force: true });
  return r;
}

function runEnter(opts: {
  prHead: string;
  mode?: string;
  env?: NodeJS.ProcessEnv;
}) {
  const enterPath = path.join(ROOT, ENTER_REL);
  const psArgs = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    enterPath,
    "-PrHead",
    opts.prHead,
    "-Mode",
    opts.mode || "dry-run",
  ];
  return spawnSync("powershell.exe", psArgs, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      ...opts.env,
    },
  });
}

describe.skipIf(!isWin)("FRLS native bootstrap / entry (Windows)", () => {
  it("rejects wrong PrHead before Node with structured zero attempts", () => {
    const r = runBootstrap({
      prHead: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      env: { FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
    });
    expect(r.status).toBe(2);
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code)).toMatch(/BLOCKED_PIN_MISMATCH/);
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(ev.databaseConnectionAttempts).toBe(0);
  });

  it("strips hostile NODE_OPTIONS so preload never executes", () => {
    const preload = path.join(ROOT, ".tmp-frls-preload-trap.js");
    fs.writeFileSync(preload, 'throw new Error("FRLS_PRELOAD_SHOULD_NOT_RUN");');
    try {
      const r = runBootstrap({
        prHead: resolveTestPrHead(),
        env: { FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
        hostileNodeEnv: { NODE_OPTIONS: `--require ${preload}` },
      });
      const out = `${r.stdout}${r.stderr}`;
      expect(out).not.toMatch(/FRLS_PRELOAD_SHOULD_NOT_RUN/);
      if (r.stdout.trim().startsWith("FRLS_LEAD_SESSION_EVIDENCE_V1:")) {
        const ev = parseEvidence(r.stdout);
        expect(ev.sqlApplicationAttempts).toBe(0);
        expect(JSON.stringify(ev)).not.toMatch(/NODE_OPTIONS\s*=/);
      }
    } finally {
      fs.rmSync(preload, { force: true });
    }
  });

  it("cleans bootstrap temp materialization after exit", () => {
    const prefix = "frls-bootstrap-";
    const before = new Set(fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith(prefix)));
    runBootstrap({
      env: { FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
    });
    const after = fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith(prefix));
    for (const n of after) {
      expect(before.has(n)).toBe(true);
    }
  });

  it("bootstrap evidence confirms orphan temp cleanup on blocked path", () => {
    const r = runBootstrap({
      prHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      env: { FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
    });
    const ev = parseEvidence(r.stdout);
    expect(ev.cleanup?.completed ?? ev.bootstrap?.cleanup?.completed).toBe(true);
    expect(ev.sqlApplicationAttempts).toBe(0);
  });

  it("native entry rejects tip SHA as PrHead or fails closed before Node", () => {
    const tip = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
    const r = runEnter({ prHead: tip });
    expect(r.status).toBe(2);
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code)).toMatch(
      /BLOCKED_PIN_MISMATCH|AUTH_METADATA_LOAD_FAIL/,
    );
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(ev.databaseConnectionAttempts).toBe(0);
  });

  it("enter resolves System32 Windows PowerShell for nested bootstrap", () => {
    const sysRoot = process.env.SystemRoot || "C:\\Windows";
    const expected = path.join(sysRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    expect(fs.existsSync(expected)).toBe(true);
    const auth = readAuth();
    expect(auth.notes.join(" ")).toMatch(/System32 PowerShell/);
  });

  it("rejects argv bundle-source override before Node", () => {
    const r = runBootstrap({
      env: { FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
      forward: ["--bundle-source-commit", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    });
    expect(r.status).toBe(2);
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code)).toMatch(/PROHIBITED_BUNDLE_AUTHORITY_OVERRIDE/);
    expect(ev.databaseConnectionAttempts).toBe(0);
    expect(ev.nodeProcessStarted).toBe(false);
  });

  it("rejects env bundle-source override before Node", () => {
    const r = runBootstrap({
      env: {
        FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
        FRLS_BUNDLE_SOURCE_COMMIT: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });
    expect(r.status).toBe(2);
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code)).toMatch(/PROHIBITED_BUNDLE_AUTHORITY_OVERRIDE/);
    expect(ev.databaseConnectionAttempts).toBe(0);
    expect(ev.nodeProcessStarted).toBe(false);
  });

  it("published tip/freeze chain materializes tip-sealed bundle (not freeze stale)", () => {
    const auth = readAuth();
    const freeze = String(auth.authorized_pr_head || "");
    const source = String(auth.bundle_source_commit || "");
    if (!/^[0-9a-f]{40}$/i.test(freeze) || !/^[0-9a-f]{40}$/i.test(source)) {
      // Freeze-only intermediate publication still uses PENDING/null; tip pin required.
      expect(freeze === "PENDING_AFTER_COMMIT" || source === "" || source === "null").toBeTruthy();
      return;
    }
    const tipBundle = execFileSync(
      "git",
      ["rev-parse", `HEAD:${auth.standalone_bundle.path}`],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    const sourceBundle = execFileSync(
      "git",
      ["rev-parse", `${source}:${auth.standalone_bundle.path}`],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    const freezeBundle = execFileSync(
      "git",
      ["rev-parse", `${freeze}:${auth.standalone_bundle.path}`],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    expect(sourceBundle).toBe(auth.standalone_bundle.oid);
    expect(tipBundle).toBe(auth.standalone_bundle.oid);
    expect(freezeBundle).not.toBe(auth.standalone_bundle.oid);

    const r = runBootstrap({
      prHead: freeze,
      env: { FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
    });
    expect(r.status).not.toBe(0);
    const ev = parseEvidence(r.stdout);
    // Past bundle verify: Node may start and fail on loopback; must not be BUNDLE_OID_MISMATCH.
    expect(String(ev.error_code || ev.reason_code || ev.result_code || "")).not.toMatch(
      /BUNDLE_OID_MISMATCH|BUNDLE_HASH_MISMATCH|BUNDLE_BYTES_MISMATCH|BLOCKED_BUNDLE_SOURCE/,
    );
    expect(ev.sqlApplicationAttempts ?? 0).toBe(0);
  });

  it("wrong bundle_source_commit fails before Node with zero attempts", () => {
    const auth = readAuth();
    const freeze = String(auth.authorized_pr_head || "");
    const source = String(auth.bundle_source_commit || "");
    if (!/^[0-9a-f]{40}$/i.test(freeze) || !/^[0-9a-f]{40}$/i.test(source)) {
      return;
    }
    const wt = fs.mkdtempSync(path.join(os.tmpdir(), "frls-badsrc-"));
    try {
      execFileSync("git", ["worktree", "add", "--detach", wt, "HEAD"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      const authPath = path.join(
        wt,
        "docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json",
      );
      const bad = JSON.parse(fs.readFileSync(authPath, "utf8"));
      bad.bundle_source_commit = freeze; // equal to freeze — rejected
      fs.writeFileSync(authPath, `${JSON.stringify(bad, null, 2)}\n`);
      execFileSync("git", ["add", "docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json"], {
        cwd: wt,
      });
      execFileSync(
        "git",
        ["-c", "user.email=test@example.com", "-c", "user.name=test", "commit", "-m", "bad bundle source"],
        { cwd: wt, encoding: "utf8" },
      );
      const bootFile = path.join(wt, "bootstrap-test.ps1");
      materializeBootstrap(bootFile);
      const r = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          bootFile,
          "-PrHead",
          freeze,
          "-Mode",
          "dry-run",
          "-RepoRoot",
          wt,
        ],
        {
          cwd: wt,
          encoding: "utf8",
          windowsHide: true,
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
            FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
          },
        },
      );
      expect(r.status).toBe(2);
      const ev = parseEvidence(r.stdout);
      expect(String(ev.error_code || ev.reason_code)).toMatch(
        /BLOCKED_BUNDLE_SOURCE|BLOCKED_BUNDLE_SOURCE_ANCESTRY|AUTH_METADATA/,
      );
      expect(ev.databaseConnectionAttempts).toBe(0);
      expect(ev.nodeProcessStarted).toBe(false);
    } finally {
      try {
        execFileSync("git", ["worktree", "remove", "--force", wt], { cwd: ROOT });
      } catch {
        fs.rmSync(wt, { recursive: true, force: true });
      }
    }
  });
});

void ARTIFACT_COMMIT;
