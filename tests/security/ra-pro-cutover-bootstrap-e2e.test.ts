/**
 * RA Pro cutover bootstrap materialize / freeze→source→tip e2e.
 * Synthetic loopback only — no production contact.
 * Publication-dependent cases early-return only while freeze===source or pins PENDING.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ARTIFACT_COMMIT } from "../../scripts/security/ra-pro-cutover-apply-constants.js";

const ROOT = process.cwd();
const AUTH_PATH = "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json";
const BOOTSTRAP_REL = "scripts/security/bootstrap-ra-pro-cutover-apply.ps1";
const ENTER_REL = "scripts/security/enter-ra-pro-cutover-apply.ps1";
const BUNDLE_REL = "scripts/security/bundles/ra-pro-cutover-applicator.standalone.cjs";
const isWin = process.platform === "win32";

function sha256(buf: Buffer | string) {
  return createHash("sha256").update(buf).digest("hex");
}

function readAuth() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, AUTH_PATH), "utf8"));
}

function parseEvidence(stdout: string) {
  const { parseRaProStdout } = require("./helpers/ra-pro-cutover-evidence.js");
  return parseRaProStdout(stdout);
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

function resolveTestPrHead() {
  return String(readAuth().authorized_pr_head || "PENDING_AFTER_COMMIT");
}

function publishedFreezeSource(): { freeze: string; source: string } | null {
  const auth = readAuth();
  const freeze = String(auth.authorized_pr_head || "");
  const source = String(auth.bundle_source_commit || "");
  if (!/^[0-9a-f]{40}$/i.test(freeze) || !/^[0-9a-f]{40}$/i.test(source)) {
    return null;
  }
  if (freeze.toLowerCase() === source.toLowerCase()) {
    return null;
  }
  return { freeze, source };
}

function materializeBootstrap(dest: string) {
  const auth = readAuth();
  // Prefer tip Git blob (LF authority) over worktree bytes that may be CRLF-checked out.
  const buf = execFileSync("git", ["cat-file", "-p", `HEAD:${BOOTSTRAP_REL}`], {
    cwd: ROOT,
  });
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
  repoRoot?: string;
}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-boot-test-"));
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
    opts.repoRoot || ROOT,
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
    cmdArgs.push(systemPowerShell(), ...psArgs);
    r = spawnSync("cmd.exe", cmdArgs, {
      cwd: opts.cwd || ROOT,
      encoding: "utf8",
      windowsHide: true,
      env,
    });
  } else {
    r = spawnSync(systemPowerShell(), psArgs, {
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
  return spawnSync(systemPowerShell(), psArgs, {
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

describe("RA Pro cutover bootstrap auth surface", () => {
  it("bootstrap + enter scripts exist and reference RA Pro channels", () => {
    const boot = fs.readFileSync(path.join(ROOT, BOOTSTRAP_REL), "utf8");
    const enter = fs.readFileSync(path.join(ROOT, ENTER_REL), "utf8");
    expect(boot).toMatch(/RA_PRO_CUTOVER_APPLY_DATABASE_URL/);
    expect(boot).toMatch(/ra-pro-cutover-applicator\.standalone\.cjs/);
    expect(boot).toMatch(/BLOCKED_BUNDLE_SOURCE/);
    expect(boot).toMatch(/AUTHORIZED_TOOLING_FREEZE/);
    expect(enter).toMatch(/native_bootstrap|bootstrap-ra-pro-cutover-apply/);
    expect(enter).toMatch(/RA_PRO_CUTOVER/);
  });

  it("TOOLING_AUTHORIZATION publishes precondition and prior dry-run pins", () => {
    const auth = readAuth();
    expect(auth.published_prior_dry_run.status).toBe("PUBLISHED");
    expect(auth.required_prior_dry_run_evidence_sha256).toBe(
      "9679678436659c64857c47397b5196343e11b8e3cc8277b7af0594a99b4f9a88",
    );
    expect(auth.required_prior_dry_run_freeze).toBe(
      "a74d5108752d93e1ca4baa78f4dc7425120658b7",
    );
    expect(auth.migration_blob_oid).toBe("d36f5e2c50f7bab956c3191723c0e8a223279df5");
    expect(auth.required_precondition_evidence_sha256).toBe(
      "fb3625f99027c600c1b1280f103df723b4fbff56ee21c60a3c8ed6e2789a7cd3",
    );
    expect(auth.required_precondition_freeze).toBe(
      "a74d5108752d93e1ca4baa78f4dc7425120658b7",
    );
    expect(auth.required_precondition_evidence_tip).toBe(
      "52fbbfcfc16e88a5862df6cd363823f40ac06ff4",
    );
    expect(auth.required_precondition_bundle_source).toBe(
      "90af07d27e122d80d5fb5072f7a66da818f245a5",
    );
    expect(auth.published_precondition_evidence?.status).toBe("PUBLISHED");
    expect(auth.published_precondition_evidence?.evidence_fixture_path).toBe(
      "tests/security/helpers/fixtures/ra-pro-cutover-precondition-evidence.json",
    );
    expect(auth.published_precondition_evidence?.valid_until_utc).toBe(
      "2026-09-17T05:25:11Z",
    );
    expect(auth.gate_aware_merge_base_ref).toBe(
      "19e8bd071bae5f8afed85340f50168d4ca8e5586",
    );
    expect(auth.required_pre_apply_live_evidence_sha256).toBe(
      "98e8824b6a7137a893f3e12719e1fa5a1a39de6d69f3d6c19def821e6c1aea98",
    );
    expect(auth.required_pre_apply_live_freeze).toBe(
      "a74d5108752d93e1ca4baa78f4dc7425120658b7",
    );
    expect(auth.required_pre_apply_live_evidence_tip).toBe(
      "a34ebaa58bd18352468967a9cbdda9177c63c36f",
    );
    expect(auth.required_pre_apply_live_bundle_source).toBe(
      "90af07d27e122d80d5fb5072f7a66da818f245a5",
    );
    expect(auth.published_pre_apply_live_evidence?.status).toBe("PUBLISHED");
    expect(auth.published_pre_apply_live_evidence?.evidence_bytes).toBe(2309);
    expect(auth.published_pre_apply_live_evidence?.valid_until_utc).toBe(
      "2026-09-18T00:55:00Z",
    );
    expect(auth.pre_apply_live_evidence_protocol?.id).toBe(
      "RA_PRO_CUTOVER_PRE_APPLY_LIVE_EVIDENCE_V1",
    );
  });
});

describe.skipIf(!isWin)("RA Pro native bootstrap / entry (Windows)", () => {
  it("rejects wrong PrHead before Node with structured zero attempts", () => {
    const r = runBootstrap({
      prHead: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      env: { RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
    });
    expect(r.status).toBe(2);
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code)).toMatch(/BLOCKED_PIN_MISMATCH/);
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(ev.databaseConnectionAttempts).toBe(0);
  });

  it("rejects argv bundle-source override before Node", () => {
    const r = runBootstrap({
      env: { RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
      forward: ["--bundle-source-commit", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    });
    expect(r.status).toBe(2);
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code)).toMatch(
      /PROHIBITED_BUNDLE_AUTHORITY_OVERRIDE/,
    );
    expect(ev.databaseConnectionAttempts).toBe(0);
    expect(ev.nodeProcessStarted).toBe(false);
  });

  it("rejects env bundle-source override before Node", () => {
    const r = runBootstrap({
      env: {
        RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
        BUNDLE_SOURCE_COMMIT: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
    });
    expect(r.status).toBe(2);
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code)).toMatch(
      /PROHIBITED_BUNDLE_AUTHORITY_OVERRIDE/,
    );
    expect(ev.databaseConnectionAttempts).toBe(0);
    expect(ev.nodeProcessStarted).toBe(false);
  });

  it("strips hostile NODE_OPTIONS so preload never executes", () => {
    const preload = path.join(ROOT, ".tmp-ra-pro-preload-trap.js");
    fs.writeFileSync(preload, 'throw new Error("RA_PRO_PRELOAD_SHOULD_NOT_RUN");');
    try {
      const r = runBootstrap({
        prHead: resolveTestPrHead(),
        env: { RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
        hostileNodeEnv: { NODE_OPTIONS: `--require ${preload}` },
      });
      const out = `${r.stdout}${r.stderr}`;
      expect(out).not.toMatch(/RA_PRO_PRELOAD_SHOULD_NOT_RUN/);
      if (String(r.stdout || "").includes("RA_PRO_CUTOVER_EVIDENCE_V1:")) {
        const ev = parseEvidence(r.stdout);
        expect(ev.sqlApplicationAttempts).toBe(0);
        expect(JSON.stringify(ev)).not.toMatch(/NODE_OPTIONS\s*=/);
      }
    } finally {
      fs.rmSync(preload, { force: true });
    }
  });

  it("native entry rejects tip SHA as PrHead or fails closed before Node", () => {
    const tip = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: ROOT,
      encoding: "utf8",
    }).trim();
    const freeze = String(readAuth().authorized_pr_head || "");
    if (/^[0-9a-f]{40}$/i.test(freeze) && tip.toLowerCase() === freeze.toLowerCase()) {
      // Tip equals freeze in intermediate publications — skip tip≠freeze assertion.
      return;
    }
    const r = runEnter({ prHead: tip });
    expect(r.status).toBe(2);
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code)).toMatch(
      /BLOCKED_PIN_MISMATCH|AUTH_METADATA_LOAD_FAIL/,
    );
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(ev.databaseConnectionAttempts).toBe(0);
  });

  it("published tip/freeze chain materializes tip-sealed bundle (not freeze stale)", () => {
    const pub = publishedFreezeSource();
    if (!pub) {
      // Freeze-only / circular intermediate publication still uses PENDING or freeze===source.
      const auth = readAuth();
      const freeze = String(auth.authorized_pr_head || "");
      const source = String(auth.bundle_source_commit || "");
      expect(
        freeze === "PENDING_AFTER_COMMIT" ||
          source === "" ||
          source === "null" ||
          freeze.toLowerCase() === source.toLowerCase(),
      ).toBeTruthy();
      return;
    }
    const auth = readAuth();
    const tipBundle = execFileSync(
      "git",
      ["rev-parse", `HEAD:${auth.standalone_bundle.path}`],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    const sourceBundle = execFileSync(
      "git",
      ["rev-parse", `${pub.source}:${auth.standalone_bundle.path}`],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    const freezeBundle = execFileSync(
      "git",
      ["rev-parse", `${pub.freeze}:${auth.standalone_bundle.path}`],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    expect(sourceBundle).toBe(auth.standalone_bundle.oid);
    expect(tipBundle).toBe(auth.standalone_bundle.oid);
    expect(freezeBundle).not.toBe(auth.standalone_bundle.oid);

    const r = runBootstrap({
      prHead: pub.freeze,
      env: { RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
    });
    expect(r.status).not.toBe(0);
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code || ev.result_code || "")).not.toMatch(
      /BUNDLE_OID_MISMATCH|BUNDLE_HASH_MISMATCH|BUNDLE_BYTES_MISMATCH|BLOCKED_BUNDLE_SOURCE/,
    );
    expect(String(ev.error_code || ev.reason_code || "")).not.toMatch(
      /APPLICATOR_EVIDENCE_MISSING|BUNDLE_EMBEDDED_FREEZE/,
    );
    expect(String(ev.evidence_source || "")).not.toBe("native_wrapper_fallback");
    expect(ev.nodeProcessStarted === true || ev.bootstrap?.nodeProcessStarted === true).toBe(
      true,
    );
    expect(Number(ev.databaseConnectionAttempts ?? 0)).toBeGreaterThanOrEqual(1);
    expect(ev.sqlApplicationAttempts ?? 0).toBe(0);
  });

  it("source=freeze rejection (temp worktree poison auth)", () => {
    const pub = publishedFreezeSource();
    if (!pub) {
      // Current circular tip already equals source=freeze — assert bootstrap fails closed.
      const freeze = resolveTestPrHead();
      if (!/^[0-9a-f]{40}$/i.test(freeze)) return;
      const r = runBootstrap({
        prHead: freeze,
        env: { RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
      });
      expect(r.status).toBe(2);
      const ev = parseEvidence(r.stdout);
      expect(String(ev.error_code || ev.reason_code)).toMatch(/BLOCKED_BUNDLE_SOURCE/);
      expect(ev.databaseConnectionAttempts).toBe(0);
      expect(ev.nodeProcessStarted).toBe(false);
      return;
    }

    const wt = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-srcfreeze-"));
    try {
      execFileSync("git", ["worktree", "add", "--detach", wt, "HEAD"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      const authPath = path.join(wt, AUTH_PATH);
      const bad = JSON.parse(fs.readFileSync(authPath, "utf8"));
      bad.bundle_source_commit = pub.freeze;
      fs.writeFileSync(authPath, `${JSON.stringify(bad, null, 2)}\n`);
      execFileSync("git", ["add", AUTH_PATH], { cwd: wt });
      execFileSync(
        "git",
        [
          "-c",
          "user.email=test@example.com",
          "-c",
          "user.name=test",
          "commit",
          "-m",
          "bad bundle source equals freeze",
        ],
        { cwd: wt, encoding: "utf8" },
      );
      const bootFile = path.join(wt, "bootstrap-test.ps1");
      materializeBootstrap(bootFile);
      const r = spawnSync(
        systemPowerShell(),
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          bootFile,
          "-PrHead",
          pub.freeze,
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
            RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
          },
        },
      );
      expect(r.status).toBe(2);
      const ev = parseEvidence(r.stdout);
      expect(String(ev.error_code || ev.reason_code)).toMatch(/BLOCKED_BUNDLE_SOURCE/);
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

  it("wrong ancestry rejection", () => {
    const pub = publishedFreezeSource();
    if (!pub) return;

    const wt = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-ancestry-"));
    try {
      execFileSync("git", ["worktree", "add", "--detach", wt, "HEAD"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      const authPath = path.join(wt, AUTH_PATH);
      const bad = JSON.parse(fs.readFileSync(authPath, "utf8"));
      // Unrelated sealed migration commit — not a descendant of freeze for this chain.
      bad.bundle_source_commit = ARTIFACT_COMMIT;
      fs.writeFileSync(authPath, `${JSON.stringify(bad, null, 2)}\n`);
      execFileSync("git", ["add", AUTH_PATH], { cwd: wt });
      execFileSync(
        "git",
        [
          "-c",
          "user.email=test@example.com",
          "-c",
          "user.name=test",
          "commit",
          "-m",
          "bad bundle source ancestry",
        ],
        { cwd: wt, encoding: "utf8" },
      );
      const bootFile = path.join(wt, "bootstrap-test.ps1");
      materializeBootstrap(bootFile);
      const r = spawnSync(
        systemPowerShell(),
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          bootFile,
          "-PrHead",
          pub.freeze,
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
            RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db",
          },
        },
      );
      expect(r.status).toBe(2);
      const ev = parseEvidence(r.stdout);
      expect(String(ev.error_code || ev.reason_code)).toMatch(
        /BLOCKED_BUNDLE_SOURCE_ANCESTRY|BLOCKED_BUNDLE_SOURCE|AUTH_METADATA/,
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

  it("tip/worktree poison of bundle file is ignored (bootstrap uses git blob)", () => {
    const pub = publishedFreezeSource();
    if (!pub) return;

    const poisonMarker = "RA_PRO_BUNDLE_WORKTREE_POISON_SHOULD_NOT_EXECUTE";
    const bundlePath = path.join(ROOT, BUNDLE_REL);
    const original = fs.readFileSync(bundlePath);
    try {
      fs.writeFileSync(
        bundlePath,
        `throw new Error("${poisonMarker}");\n`,
        "utf8",
      );
      const r = runBootstrap({
        prHead: pub.freeze,
        env: { RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
      });
      const out = `${r.stdout || ""}${r.stderr || ""}`;
      expect(out).not.toMatch(new RegExp(poisonMarker));
      const ev = parseEvidence(r.stdout);
      expect(String(ev.error_code || ev.reason_code || "")).not.toMatch(
        /BUNDLE_OID_MISMATCH|BUNDLE_HASH_MISMATCH|BUNDLE_BYTES_MISMATCH/,
      );
      expect(String(ev.error_code || ev.reason_code || "")).not.toMatch(
        /BUNDLE_EMBEDDED_FREEZE_MISSING|BUNDLE_EMBEDDED_FREEZE_MISMATCH/,
      );
    } finally {
      fs.writeFileSync(bundlePath, original);
    }
  });

  it("embedded freeze match on published chain", () => {
    const pub = publishedFreezeSource();
    if (!pub) return;

    const sourceBytes = execFileSync("git", ["cat-file", "-p", `${pub.source}:${BUNDLE_REL}`], {
      cwd: ROOT,
    });
    const text = sourceBytes.toString("utf8");
    const m = text.match(
      /ra-pro-cutover-apply-constants\.js[\s\S]{0,4000}?AUTHORIZED_TOOLING_FREEZE = "([0-9a-fA-F]{40})"/,
    );
    expect(m?.[1]?.toLowerCase()).toBe(pub.freeze.toLowerCase());

    const r = runBootstrap({
      prHead: pub.freeze,
      env: { RA_PRO_CUTOVER_APPLY_DATABASE_URL: "postgres://u:p@127.0.0.1:1/db" },
    });
    const ev = parseEvidence(r.stdout);
    expect(String(ev.error_code || ev.reason_code || "")).not.toMatch(
      /BUNDLE_EMBEDDED_FREEZE/,
    );
  });
});

void ARTIFACT_COMMIT;
