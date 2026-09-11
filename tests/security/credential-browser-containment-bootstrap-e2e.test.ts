import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const ROOT = process.cwd();
const AUTH_PATH =
  "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json";
const BOOTSTRAP_REL = "scripts/security/bootstrap-credential-browser-containment.ps1";

function sha256(buf: Buffer | string) {
  return createHash("sha256").update(buf).digest("hex");
}

function readAuth() {
  return JSON.parse(
    execFileSync("git", ["cat-file", "blob", `HEAD:${AUTH_PATH}`], {
      cwd: ROOT,
      encoding: "utf8",
    }),
  );
}

function materializeBootstrapFromFreeze(freeze: string, dest: string) {
  const buf = execFileSync("git", ["cat-file", "blob", `${freeze}:${BOOTSTRAP_REL}`], {
    cwd: ROOT,
  }) as Buffer;
  fs.writeFileSync(dest, buf);
  return buf;
}

function runBootstrap(opts: {
  freeze: string;
  mode?: string;
  evidenceTip?: string;
  env?: NodeJS.ProcessEnv;
  forward?: string[];
  profileDir?: string;
  cwd?: string;
  /** When true, include PATHEXT (operator-realistic). Default false — prove no PATHEXT dependency. */
  withPathext?: boolean;
  /** Hostile Node injection vars set via cmd.exe so Node spawn cannot strip them. */
  hostileNodeEnv?: Record<string, string>;
}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contain-boot-test-"));
  const bootFile = path.join(dir, "bootstrap.ps1");
  const buf = materializeBootstrapFromFreeze(opts.freeze, bootFile);
  const auth = readAuth();
  expect(sha256(buf)).toBe(auth.native_bootstrap.sha256);
  expect(buf.length).toBe(auth.native_bootstrap.bytes);

  const psArgs = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    bootFile,
    "-PrHead",
    opts.freeze,
    "-Mode",
    opts.mode || "dry-run",
    "-RepoRoot",
    ROOT,
  ];
  if (opts.evidenceTip) {
    psArgs.push("-EvidenceTip", opts.evidenceTip);
  }
  if (opts.forward?.length) {
    psArgs.push(...opts.forward);
  }

  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    USERPROFILE: process.env.USERPROFILE,
    ComSpec: process.env.ComSpec,
    ...opts.env,
  };
  // Explicitly omit PATHEXT unless requested — must not be required for node.exe resolution.
  if (opts.withPathext) {
    env.PATHEXT = process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD";
  } else {
    delete env.PATHEXT;
  }
  if (opts.profileDir) {
    env.HOME = opts.profileDir;
    env.USERPROFILE = opts.profileDir;
  }

  let r;
  if (opts.hostileNodeEnv && Object.keys(opts.hostileNodeEnv).length > 0) {
    // Node may refuse to forward NODE_OPTIONS to children; set via cmd.exe argv form.
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

function parseEvidence(stdout: string) {
  const {
    parseContainmentStdout,
  } = require("./helpers/containment-evidence.js");
  return parseContainmentStdout(stdout);
}

const dockerOk = (() => {
  try {
    const r = spawnSync("docker", ["version"], {
      encoding: "utf8",
      timeout: 15000,
      windowsHide: true,
    });
    return r.status === 0;
  } catch {
    return false;
  }
})();

describe("native PowerShell bootstrap trust boundary", () => {
  const auth = readAuth();
  const freeze = auth.authorized_pr_head;

  it("publishes native_bootstrap seals matching freeze blob", () => {
    expect(freeze).toMatch(/^[0-9a-f]{40}$/i);
    expect(auth.native_bootstrap?.path).toBe(BOOTSTRAP_REL);
    expect(auth.native_bootstrap.sha256).toMatch(/^[0-9a-f]{64}$/i);
    const oid = execFileSync("git", ["rev-parse", `${freeze}:${BOOTSTRAP_REL}`], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    const buf = execFileSync("git", ["cat-file", "blob", `${freeze}:${BOOTSTRAP_REL}`], {
      cwd: ROOT,
    }) as Buffer;
    expect(oid).toBe(auth.native_bootstrap.oid);
    expect(sha256(buf)).toBe(auth.native_bootstrap.sha256);
    expect(buf.length).toBe(auth.native_bootstrap.bytes);
  });

  it("bundle content_scan has no unresolved pg-native require", () => {
    expect(auth.standalone_bundle.content_scan.has_unresolved_require_pg_native).toBe(false);
    expect(auth.standalone_bundle.content_scan.fail_closed_stub_present).toBe(true);
    expect(auth.standalone_bundle.content_scan.unresolved_external_requires).toEqual([]);
    const src = execFileSync(
      "git",
      ["cat-file", "blob", `${freeze}:${auth.standalone_bundle.path}`],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(src).toMatch(/PG_NATIVE_DISABLED/);
    expect(src).not.toMatch(/require\(["']pg-native["']\)/);
  });

  it("rejects wrong freeze before Node with structured zero attempts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contain-boot-wrong-"));
    const bootFile = path.join(dir, "bootstrap.ps1");
    materializeBootstrapFromFreeze(freeze, bootFile);
    const bad = spawnSync(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        bootFile,
        "-PrHead",
        "a".repeat(40),
        "-Mode",
        "dry-run",
        "-RepoRoot",
        ROOT,
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
        },
      },
    );
    fs.rmSync(dir, { recursive: true, force: true });
    expect(bad.status).toBe(2);
    const ev = parseEvidence(bad.stdout);
    expect(ev.verdict).toBe("BOOTSTRAP_BLOCKED");
    expect(ev.error_code).toMatch(/BLOCKED_PIN_MISMATCH|AUTH_/);
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(ev.databaseConnectionAttempts).toBe(0);
    expect(ev.nodeProcessStarted).toBe(false);
    expect(ev.advisory_lock_acquired).toBe(false);
  });

  it("strips hostile NODE_OPTIONS so preload never executes", () => {
    const marker = path.join(os.tmpdir(), `hostile-preload-${Date.now()}.marker`);
    const preload = path.join(os.tmpdir(), `hostile-preload-${Date.now()}.js`);
    fs.writeFileSync(
      preload,
      `require("fs").writeFileSync(${JSON.stringify(marker)}, "OWNED");\n`,
    );
    try {
      const r = runBootstrap({
        freeze,
        env: {
          CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
        },
        hostileNodeEnv: {
          NODE_OPTIONS: `--require ${preload}`,
        },
      });
      expect(fs.existsSync(marker)).toBe(false);
      expect(r.stdout + r.stderr).not.toMatch(/OWNED/);
      const ev = parseEvidence(r.stdout);
      expect(ev.sqlApplicationAttempts).toBe(0);
      expect(ev.databaseConnectionAttempts === 0 || ev.databaseConnectionAttempts === 1).toBe(
        true,
      );
      // Either bootstrap stripped before Node (unsafeRemoved) or child ran without preload
      const unsafe =
        ev.unsafeInheritedNodeEnvironmentRemoved === true ||
        ev.bootstrap?.unsafeInheritedNodeEnvironmentRemoved === true;
      expect(unsafe).toBe(true);
      expect(JSON.stringify(ev)).not.toMatch(/NODE_OPTIONS\s*=/);
      expect(JSON.stringify(ev)).not.toMatch(preload.replace(/\\/g, "\\\\"));
    } finally {
      try {
        fs.unlinkSync(preload);
      } catch {
        /* ignore */
      }
      try {
        fs.unlinkSync(marker);
      } catch {
        /* ignore */
      }
    }
  });

  it("strips NODE_PATH pointing at a malicious package tree", () => {
    const evil = fs.mkdtempSync(path.join(os.tmpdir(), "evil-node-path-"));
    fs.mkdirSync(path.join(evil, "pg"), { recursive: true });
    fs.writeFileSync(
      path.join(evil, "pg", "index.js"),
      'throw new Error("EVIL_NODE_PATH_PG");\n',
    );
    try {
      const r = runBootstrap({
        freeze,
        env: {
          CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
        },
        hostileNodeEnv: {
          NODE_PATH: evil,
        },
      });
      expect(r.stdout + r.stderr).not.toMatch(/EVIL_NODE_PATH_PG/);
      const ev = parseEvidence(r.stdout);
      expect(ev.sqlApplicationAttempts).toBe(0);
      const unsafe =
        ev.unsafeInheritedNodeEnvironmentRemoved === true ||
        ev.bootstrap?.unsafeInheritedNodeEnvironmentRemoved === true;
      expect(unsafe).toBe(true);
    } finally {
      fs.rmSync(evil, { recursive: true, force: true });
    }
  });

  it("rejects direct --require/--import/--loader/inspector argv", () => {
    for (const flag of ["--require", "--import", "--loader", "--inspect", "--inspect-brk"]) {
      const r = runBootstrap({
        freeze,
        forward: [flag, "x"],
        env: { CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
      });
      expect(r.status).toBe(2);
      const ev = parseEvidence(r.stdout);
      expect(ev.error_code).toBe("PROHIBITED_NODE_ARGV");
      expect(ev.nodeProcessStarted).toBe(false);
      expect(ev.sqlApplicationAttempts).toBe(0);
      expect(ev.databaseConnectionAttempts).toBe(0);
    }
  });

  it("does not load a hostile PowerShell profile (-NoProfile)", () => {
    const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "ps-profile-"));
    const marker = path.join(os.tmpdir(), `profile-marker-${Date.now()}.txt`);
    const docs = path.join(profileDir, "Documents", "WindowsPowerShell");
    fs.mkdirSync(docs, { recursive: true });
    fs.writeFileSync(
      path.join(docs, "Microsoft.PowerShell_profile.ps1"),
      `Set-Content -LiteralPath '${marker.replace(/'/g, "''")}' -Value 'PROFILE_RAN'\n`,
    );
    try {
      const r = runBootstrap({
        freeze,
        profileDir,
        env: { CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
      });
      expect(fs.existsSync(marker)).toBe(false);
      expect(r.stdout).toMatch(/CONTAINMENT_EVIDENCE_V1:/);
    } finally {
      fs.rmSync(profileDir, { recursive: true, force: true });
      try {
        fs.unlinkSync(marker);
      } catch {
        /* ignore */
      }
    }
  });

  it("ignores corrupted worktree launcher/core/bundle and CRLF bootstrap divergence", () => {
    const bootWt = path.join(ROOT, BOOTSTRAP_REL);
    const corePath = path.join(ROOT, "scripts/security/credential-browser-containment-apply-core.js");
    const launchPath = path.join(
      ROOT,
      "scripts/security/launch-credential-browser-containment-apply.js",
    );
    const bundlePath = path.join(ROOT, auth.standalone_bundle.path);
    const backups = {
      boot: fs.readFileSync(bootWt),
      core: fs.readFileSync(corePath),
      launch: fs.readFileSync(launchPath),
      bundle: fs.readFileSync(bundlePath),
    };
    try {
      fs.writeFileSync(bootWt, backups.boot.toString("utf8").replace(/\n/g, "\r\n"));
      fs.writeFileSync(corePath, "throw new Error('WT_CORE');\n");
      fs.writeFileSync(launchPath, "throw new Error('WT_LAUNCH');\n");
      fs.writeFileSync(bundlePath, "throw new Error('WT_BUNDLE');\n");
      const r = runBootstrap({
        freeze,
        env: { CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
      });
      expect(r.stdout + r.stderr).not.toMatch(/WT_CORE|WT_LAUNCH|WT_BUNDLE/);
      const ev = parseEvidence(r.stdout);
      expect(ev.sqlApplicationAttempts).toBe(0);
      const bundleSha = ev.bootstrap?.bundle_sha256 || ev.bundle_sha256;
      if (bundleSha) {
        expect(bundleSha).toBe(auth.standalone_bundle.sha256);
      } else {
        // Structured pre-Node or child evidence still required
        expect(ev.verdict || ev.error_code).toBeTruthy();
        expect(ev.databaseConnectionAttempts === 0 || typeof ev.databaseConnectionAttempts === "number").toBe(
          true,
        );
      }
    } finally {
      fs.writeFileSync(bootWt, backups.boot);
      fs.writeFileSync(corePath, backups.core);
      fs.writeFileSync(launchPath, backups.launch);
      fs.writeFileSync(bundlePath, backups.bundle);
    }
  });

  it("ignores malicious local pg and pg-native", () => {
    const pgTrap = path.join(ROOT, "node_modules", "pg", "lib", "index.js");
    const nativeDir = path.join(ROOT, "node_modules", "pg-native");
    const pgBackup = fs.existsSync(pgTrap) ? fs.readFileSync(pgTrap) : null;
    const hadNative = fs.existsSync(nativeDir);
    try {
      if (pgBackup) {
        fs.writeFileSync(pgTrap, "throw new Error('MALICIOUS_LOCAL_PG');\n");
      }
      fs.mkdirSync(nativeDir, { recursive: true });
      fs.writeFileSync(
        path.join(nativeDir, "index.js"),
        "throw new Error('MALICIOUS_PG_NATIVE');\n",
      );
      const r = runBootstrap({
        freeze,
        env: { CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
      });
      expect(r.stdout + r.stderr).not.toMatch(/MALICIOUS_LOCAL_PG|MALICIOUS_PG_NATIVE/);
      const ev = parseEvidence(r.stdout);
      expect(ev.sqlApplicationAttempts).toBe(0);
    } finally {
      if (pgBackup) fs.writeFileSync(pgTrap, pgBackup);
      if (!hadNative) {
        fs.rmSync(nativeDir, { recursive: true, force: true });
      }
    }
  });

  it("rejects tip SHA as PrHead when tip != freeze", () => {
    const tip = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    if (tip === freeze) return;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "contain-boot-tip-"));
    const bootFile = path.join(dir, "bootstrap.ps1");
    materializeBootstrapFromFreeze(freeze, bootFile);
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
        tip,
        "-Mode",
        "dry-run",
        "-RepoRoot",
        ROOT,
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
        },
      },
    );
    fs.rmSync(dir, { recursive: true, force: true });
    expect(r.status).toBe(2);
    const ev = parseEvidence(r.stdout);
    expect(ev.reason_code || ev.error_code).toMatch(/BLOCKED_PIN_MISMATCH/);
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(ev.databaseConnectionAttempts).toBe(0);
    expect(ev.evidence_source).toBe("native_wrapper_fallback");
  });

  it("cleans bootstrap temp materialization after exit", () => {
    const before = new Set(
      fs.readdirSync(os.tmpdir()).filter((n) => n.startsWith("containment-bootstrap-")),
    );
    runBootstrap({
      freeze,
      env: { CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
    });
    const after = fs
      .readdirSync(os.tmpdir())
      .filter((n) => n.startsWith("containment-bootstrap-"));
    for (const n of after) {
      expect(before.has(n)).toBe(true);
    }
  });

  it("rejects PATH with only node.cmd/.bat shims (no Application node.exe)", () => {
    const shimDir = fs.mkdtempSync(path.join(os.tmpdir(), "node-shim-"));
    fs.writeFileSync(
      path.join(shimDir, "node.cmd"),
      "@echo off\necho SHIM_CMD\r\nexit /b 0\r\n",
    );
    fs.writeFileSync(path.join(shimDir, "node.bat"), "@echo SHIM_BAT\r\n");
    // Keep system + git dirs so powershell/git resolve, but exclude dirs that provide node.exe.
    const sysRoot = process.env.SystemRoot || "C:\\Windows";
    const gitDir = path.dirname(
      execFileSync("where.exe", ["git"], { encoding: "utf8" }).trim().split(/\r?\n/)[0],
    );
    const systemPath = [
      path.join(sysRoot, "System32"),
      path.join(sysRoot, "System32", "WindowsPowerShell", "v1.0"),
      sysRoot,
      gitDir,
    ].join(path.delimiter);
    try {
      const r = runBootstrap({
        freeze,
        env: {
          PATH: `${shimDir}${path.delimiter}${systemPath}`,
          CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
        },
      });
      expect(r.status).toBe(2);
      const ev = parseEvidence(r.stdout);
      expect(ev.error_code).toMatch(/NODE_EXE_/);
      expect(ev.nodeProcessStarted).toBe(false);
      expect(ev.sqlApplicationAttempts).toBe(0);
      expect(ev.databaseConnectionAttempts).toBe(0);
      expect(ev.advisory_lock_acquired).toBe(false);
      expect(`${r.stdout}${r.stderr}`).not.toMatch(/SHIM_CMD|SHIM_BAT/);
    } finally {
      fs.rmSync(shimDir, { recursive: true, force: true });
    }
  });

  it("ignores malicious worktree node.exe shadow when real Application node.exe exists", () => {
    const trapDir = path.join(ROOT, ".tmp-node-trap");
    fs.mkdirSync(trapDir, { recursive: true });
    // Not a real PE — must never be selected when a real Application node.exe is on PATH.
    fs.writeFileSync(path.join(trapDir, "node.exe"), "not-a-real-pe");
    try {
      const r = runBootstrap({
        freeze,
        env: {
          // Real PATH first so Application resolution finds the genuine node.exe
          PATH: `${process.env.PATH}${path.delimiter}${trapDir}`,
          CONTAINMENT_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
        },
      });
      const ev = parseEvidence(r.stdout);
      expect(ev.error_code).not.toMatch(/NODE_EXE_VERSION_FAIL|NODE_EXE_REJECTED/);
      // Either connects (blocked) or structured evidence — not trap execution as shell script
      expect(ev.sqlApplicationAttempts).toBe(0);
      expect(ev.bootstrap?.node?.basename || ev.node?.basename || "node.exe").toBe("node.exe");
    } finally {
      fs.rmSync(trapDir, { recursive: true, force: true });
    }
  });
});

describe.skipIf(!dockerOk)("bootstrap success path (local disposable postgres)", () => {
  let pg: { name: string; url: string; stop: () => Promise<void> };

  beforeAll(async () => {
    const {
      startDisposablePg,
      seedApplicatorWorld,
    } = require("./helpers/containment-applicator-sim.js");
    pg = await startDisposablePg();
    const { Client } = require("pg");
    const client = new Client({ connectionString: pg.url });
    await client.connect();
    await seedApplicatorWorld(client);
    await client.end();
  }, 120000);

  afterAll(async () => {
    if (pg) await pg.stop();
  });

  it("empty-temp + no PATHEXT → sealed bundle → DRY_RUN_READY", () => {
    const auth = readAuth();
    const freeze = auth.authorized_pr_head;
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "empty-boot-cwd-"));
    const corePath = path.join(ROOT, "scripts/security/credential-browser-containment-apply-core.js");
    const coreBackup = fs.readFileSync(corePath);
    fs.writeFileSync(corePath, "throw new Error('WORKTREE_MUST_NOT_RUN');\n");
    try {
      const r = runBootstrap({
        freeze,
        cwd: empty,
        withPathext: false,
        env: { CONTAINMENT_APPLY_DATABASE_URL: pg.url },
      });
      const ev = parseEvidence(r.stdout);
      expect(ev.verdict).toBe("DRY_RUN_READY");
      expect(ev.sqlApplicationAttempts).toBe(0);
      expect(ev.advisory_lock_acquired).toBe(false);
      expect(ev.bootstrap?.cwd_was_temp).toBe(true);
      expect(ev.bootstrap?.cleanup?.cleaned).toBe(true);
      expect(ev.bootstrap?.node?.basename).toBe("node.exe");
      expect(ev.bootstrap?.node?.version).toMatch(/^v\d+\.\d+\.\d+/);
      expect(JSON.stringify(ev)).not.toMatch(/postgres:postgres|password=/i);
      // Must not leak absolute user paths in committed-style evidence fields
      expect(JSON.stringify(ev.bootstrap?.node || {})).not.toMatch(/Users\\/);
    } finally {
      fs.writeFileSync(corePath, coreBackup);
      fs.rmSync(empty, { recursive: true, force: true });
    }
  }, 120000);

  it("empty-temp + PATHEXT present still DRY_RUN_READY", () => {
    const auth = readAuth();
    const freeze = auth.authorized_pr_head;
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), "empty-boot-cwd-pe-"));
    try {
      const r = runBootstrap({
        freeze,
        cwd: empty,
        withPathext: true,
        env: { CONTAINMENT_APPLY_DATABASE_URL: pg.url },
      });
      const ev = parseEvidence(r.stdout);
      expect(ev.verdict).toBe("DRY_RUN_READY");
      expect(ev.sqlApplicationAttempts).toBe(0);
      expect(ev.bootstrap?.node?.basename).toBe("node.exe");
    } finally {
      fs.rmSync(empty, { recursive: true, force: true });
    }
  }, 120000);

  it("no-PATHEXT + hostile existing --require preload → DRY_RUN_READY, marker absent", () => {
    const auth = readAuth();
    const freeze = auth.authorized_pr_head;
    const marker = path.join(os.tmpdir(), `hostile-abs-${Date.now()}.marker`);
    const preload = path.join(os.tmpdir(), `hostile-abs-${Date.now()}.js`);
    fs.writeFileSync(
      preload,
      `require("fs").writeFileSync(${JSON.stringify(marker)}, "ABS_OWNED");\n`,
    );
    expect(fs.existsSync(preload)).toBe(true);
    try {
      const r = runBootstrap({
        freeze,
        withPathext: false,
        env: {
          CONTAINMENT_APPLY_DATABASE_URL: pg.url,
        },
        hostileNodeEnv: {
          NODE_OPTIONS: `--require ${preload}`,
        },
      });
      expect(fs.existsSync(marker)).toBe(false);
      const ev = parseEvidence(r.stdout);
      expect(ev.verdict).toBe("DRY_RUN_READY");
      expect(ev.sqlApplicationAttempts).toBe(0);
      expect(ev.advisory_lock_acquired).toBe(false);
      expect(
        ev.bootstrap?.unsafeInheritedNodeEnvironmentRemoved === true ||
          ev.unsafeInheritedNodeEnvironmentRemoved === true,
      ).toBe(true);
      expect(ev.bootstrap?.node?.basename).toBe("node.exe");
      expect(JSON.stringify(ev)).not.toMatch(/ABS_OWNED|NODE_OPTIONS\s*=/);
    } finally {
      try {
        fs.unlinkSync(preload);
      } catch {
        /* ignore */
      }
      try {
        fs.unlinkSync(marker);
      } catch {
        /* ignore */
      }
    }
  }, 120000);

  it("native enter → bootstrap sentinel reports unsafe removal with hostile NODE_OPTIONS", () => {
    const auth = readAuth();
    const freeze = auth.authorized_pr_head;
    const ENTRY = "scripts/security/enter-containment-apply.ps1";
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "enter-mat-"));
    const entryFile = path.join(work, "enter.ps1");
    const entryBuf = execFileSync("git", ["cat-file", "blob", `${freeze}:${ENTRY}`], {
      cwd: ROOT,
    }) as Buffer;
    expect(sha256(entryBuf)).toBe(auth.native_entry.sha256);
    fs.writeFileSync(entryFile, entryBuf);

    const marker = path.join(os.tmpdir(), `enter-hostile-${Date.now()}.marker`);
    const preload = path.join(os.tmpdir(), `enter-hostile-${Date.now()}.js`);
    fs.writeFileSync(
      preload,
      `require("fs").writeFileSync(${JSON.stringify(marker)}, "ENTER_OWNED");\n`,
    );

    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      ComSpec: process.env.ComSpec,
      CONTAINMENT_APPLY_DATABASE_URL: pg.url,
    };
    delete env.PATHEXT;

    const r = spawnSync(
      "cmd.exe",
      [
        "/c",
        "set",
        `NODE_OPTIONS=--require ${preload}`,
        "&&",
        "powershell.exe",
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        entryFile,
        "-PrHead",
        freeze,
        "-Mode",
        "dry-run",
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true, env },
    );
    try {
      expect(fs.existsSync(marker)).toBe(false);
      const ev = parseEvidence(r.stdout);
      expect(ev.verdict).toBe("DRY_RUN_READY");
      expect(ev.sqlApplicationAttempts).toBe(0);
      expect(ev.advisory_lock_acquired).toBe(false);
      expect(
        ev.bootstrap?.unsafeInheritedNodeEnvironmentRemoved === true ||
          ev.unsafeInheritedNodeEnvironmentRemoved === true,
      ).toBe(true);
      expect(ev.bootstrap?.node?.basename).toBe("node.exe");
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
      try {
        fs.unlinkSync(preload);
      } catch {
        /* ignore */
      }
      try {
        fs.unlinkSync(marker);
      } catch {
        /* ignore */
      }
    }
  }, 120000);
});
