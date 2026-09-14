/**
 * FRLS operator/visible ceremony contract + Windows fail-closed behaviour.
 * Synthetic stubs only — zero DB, zero credentials, zero production contact.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const DRYRUN_CEREMONY =
  "scripts/security/operator-free-review-lead-session-production-dryrun-ceremony.ps1";
const APPLY_CEREMONY =
  "scripts/security/operator-free-review-lead-session-production-apply-ceremony.ps1";
const SUPERVISE =
  "scripts/security/supervise-visible-free-review-lead-session-ceremony.ps1";
const ENTER =
  "scripts/security/enter-visible-free-review-lead-session-ceremony.ps1";
const LAUNCHER =
  "scripts/security/launch-visible-free-review-lead-session-ceremony.ps1";
const DECODE_FRAME =
  "scripts/security/free-review-lead-session-evidence-decode-frame.js";
const EVIDENCE_MODULE = "scripts/security/free-review-lead-session-evidence.js";

const AUTH_PATH = path.join(
  ROOT,
  "docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json",
);
const STUB = path.join(
  ROOT,
  "tests/security/helpers/synthetic-visible-ceremony-stub.ps1",
);

const APPLY_TOKEN = "I_AUTHORIZE_FREE_REVIEW_LEAD_SESSIONS_APPLY_20260913235500";
const EVIDENCE_PROTOCOL_ID = "FRLS_LEAD_SESSION_EVIDENCE_V1";
// Not the published freeze: every ceremony must refuse it at the pin gate.
const UNAUTHORIZED_FREEZE = "a".repeat(40);

type Seal = { path: string; oid: string; sha256: string; bytes: number };

function readAuth(): Record<string, Seal | unknown> {
  return JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
}

function src(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
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

function decodeEvidenceFrame(stdout: string): Record<string, unknown> | null {
  const m = String(stdout || "").match(
    new RegExp(`${EVIDENCE_PROTOCOL_ID}:([A-Za-z0-9_-]+)`),
  );
  if (!m) return null;
  let b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

function runCeremony(opts: {
  script: string;
  outDir: string;
  prHead?: string;
  extraArgs?: string[];
  env?: NodeJS.ProcessEnv;
}): ReturnType<typeof spawnSync> {
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(ROOT, opts.script),
    "-PrHead",
    opts.prHead ?? UNAUTHORIZED_FREEZE,
    "-RepoRoot",
    ROOT,
    "-EvidenceOutDir",
    opts.outDir,
    ...(opts.extraArgs ?? []),
  ];
  return spawnSync(systemPowerShell(), args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: 120000,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      USERPROFILE: process.env.USERPROFILE,
      ...(opts.env || {}),
    },
  });
}

describe("FRLS ceremony seals are published in TOOLING_AUTHORIZATION", () => {
  it("pins operator + visible ceremony scripts to their worktree bytes", () => {
    const auth = readAuth();
    const pinned: Array<[string, string]> = [
      ["operator_ceremony", DRYRUN_CEREMONY],
      ["operator_apply_ceremony", APPLY_CEREMONY],
      ["visible_ceremony_supervisor", SUPERVISE],
      ["visible_ceremony_entry", ENTER],
      ["visible_ceremony_launcher", LAUNCHER],
    ];
    for (const [key, rel] of pinned) {
      const seal = auth[key] as Seal | undefined;
      expect(seal, `${key} seal missing`).toBeTruthy();
      expect(seal!.path).toBe(rel);
      expect(seal!.oid).toMatch(/^[0-9a-f]{40}$/);
      const buf = fs.readFileSync(path.join(ROOT, rel));
      expect(crypto.createHash("sha256").update(buf).digest("hex")).toBe(
        seal!.sha256,
      );
      expect(buf.length).toBe(seal!.bytes);
    }
  });

  it("pins the FRLS decode-frame helper and its shared framing dependency", () => {
    const proto = (readAuth().evidence_protocol ?? {}) as {
      id?: string;
      decode_frame?: Seal;
      shared_framing_module?: Seal;
    };
    expect(proto.id).toBe(EVIDENCE_PROTOCOL_ID);
    expect(proto.decode_frame?.path).toBe(DECODE_FRAME);
    const buf = fs.readFileSync(path.join(ROOT, DECODE_FRAME));
    expect(crypto.createHash("sha256").update(buf).digest("hex")).toBe(
      proto.decode_frame?.sha256,
    );
    expect(buf.length).toBe(proto.decode_frame?.bytes);
    // The FRLS evidence module require()s this sibling; ceremonies materialize it.
    expect(proto.shared_framing_module?.path).toBe(
      "scripts/security/containment-evidence-protocol.js",
    );
    expect(src(EVIDENCE_MODULE)).toMatch(/require\("\.\/containment-evidence-protocol"\)/);
  });

  it("keeps the tooling freeze pending and prior dry-run pins unpublished", () => {
    const auth = readAuth() as {
      authorized_pr_head: string;
      required_prior_dry_run_evidence_sha256: string | null;
      required_prior_dry_run_freeze: string | null;
      required_prior_dry_run_evidence_tip: string | null;
    };
    expect(auth.authorized_pr_head).toBe("da763eb1f63eec99a76e1773dc3affc0c2ba6ff4");
    expect(auth.required_prior_dry_run_evidence_sha256).toBeNull();
    expect(auth.required_prior_dry_run_freeze).toBeNull();
    expect(auth.required_prior_dry_run_evidence_tip).toBeNull();
  });
});

describe("FRLS Job Object containment (supervisor)", () => {
  it("creates a KILL_ON_JOB_CLOSE job with no breakaway", () => {
    const s = src(SUPERVISE);
    expect(s).toMatch(/FrlsVisible\.JobApi/);
    expect(s).toMatch(/JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000/);
    expect(s).toMatch(/CreateJobObject/);
    expect(s).toMatch(/SetInformationJobObject/);
    expect(s).toMatch(/AssignProcessToJobObject/);
    expect(s).toMatch(/TerminateJobObject/);
    expect(s).toMatch(/CREATE_SUSPENDED = 0x00000004/);
    expect(s).not.toMatch(/JOB_OBJECT_LIMIT_BREAKAWAY_OK/);
    expect(s).not.toMatch(/JOB_OBJECT_LIMIT_SILENT_BREAKAWAY_OK/);
    expect(s).not.toMatch(/CREATE_BREAKAWAY_FROM_JOB/);
  });

  it("assigns to the job before resuming the suspended child (fail-closed order)", () => {
    const s = src(SUPERVISE);
    const fn = s.indexOf("function Start-SuspendedInJob");
    expect(fn).toBeGreaterThan(0);
    const body = s.slice(fn);
    const createIdx = body.indexOf("[FrlsVisible.JobApi]::CreateProcess(");
    const assignIdx = body.indexOf("[FrlsVisible.JobApi]::AssignProcessToJobObject(");
    const resumeIdx = body.indexOf("[FrlsVisible.JobApi]::ResumeThread(");
    expect(createIdx).toBeGreaterThan(0);
    expect(assignIdx).toBeGreaterThan(createIdx);
    expect(resumeIdx).toBeGreaterThan(assignIdx);
    expect(body).toMatch(/TestForceAssignFail/);
  });
});

describe("FRLS SecureString credential ceremony", () => {
  it("reads the URL as a SecureString and zero-frees the BSTR", () => {
    for (const rel of [DRYRUN_CEREMONY, APPLY_CEREMONY]) {
      const s = src(rel);
      expect(s).toMatch(
        /Read-Host -Prompt "FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL" -AsSecureString/,
      );
      expect(s).toMatch(/SecureStringToBSTR/);
      expect(s).toMatch(/ZeroFreeBSTR/);
      expect(s).toMatch(/\$env:FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL = \$plain/);
      // Credential travels by process env only — never on a child command line.
      expect(s).not.toMatch(/Arguments.*\$plain/);
    }
  });

  it("resolves absolute System32 PowerShell in every ceremony script", () => {
    for (const rel of [DRYRUN_CEREMONY, APPLY_CEREMONY, SUPERVISE, ENTER, LAUNCHER]) {
      const s = src(rel);
      expect(s, rel).toMatch(/System32\\WindowsPowerShell\\v1\.0\\powershell\.exe/);
      expect(s, rel).not.toMatch(/cmd\.exe\s+\/c\s+start/i);
      expect(s, rel).not.toMatch(/Start-Process\s+-FilePath\s+"powershell\.exe"/);
      expect(s, rel).not.toMatch(/-FileName "powershell\.exe"/);
    }
    for (const rel of [SUPERVISE, ENTER, LAUNCHER]) {
      expect(src(rel), rel).toMatch(/Format-Win32Argument/);
    }
  });
});

describe("FRLS ceremony identifier adaptation", () => {
  it("carries no Stage-1 containment authority, protocol, or token identifiers", () => {
    const banned = [
      "CONTAINMENT_EVIDENCE_V1",
      "CONTAINMENT_CEREMONY_",
      "I_AUTHORIZE_CONTAINMENT_APPLY",
      "docs/security/connection-credential-browser-containment",
      "ContainmentVisible",
      "enter-containment-apply.ps1",
      "enter-visible-containment-ceremony",
      "launch-visible-containment-ceremony",
      "supervise-visible-containment-ceremony",
      "operator-containment-production-",
    ];
    for (const rel of [DRYRUN_CEREMONY, APPLY_CEREMONY, SUPERVISE, ENTER, LAUNCHER]) {
      const s = src(rel);
      for (const token of banned) {
        expect(s.includes(token), `${rel} still references ${token}`).toBe(false);
      }
    }
    // The launcher is handed verified bytes; only auth-loading scripts read the doc.
    for (const rel of [DRYRUN_CEREMONY, APPLY_CEREMONY, SUPERVISE, ENTER]) {
      expect(src(rel), rel).toMatch(
        /docs\/security\/free-review-lead-session-apply\/TOOLING_AUTHORIZATION\.json/,
      );
    }
  });

  it("drops the Target #2 fixture world from both operator ceremonies", () => {
    for (const rel of [DRYRUN_CEREMONY, APPLY_CEREMONY]) {
      const s = src(rel);
      expect(s).not.toMatch(/[Tt]arget2|TARGET2/);
      expect(s).not.toMatch(/print-fixture-target2-args/);
      expect(s).not.toMatch(/prior_history_count/);
      expect(s).toMatch(/FRLS_CEREMONY_ALLOW_SYNTHETIC_URL/);
    }
  });

  it("hardcodes dry-run mode with no apply token in the dry-run ceremony", () => {
    const s = src(DRYRUN_CEREMONY);
    expect(s).toMatch(/"-Mode", "dry-run"/);
    expect(s).toMatch(/Mode: dry-run \(no apply token\)/);
    expect(s).not.toMatch(/i-authorize-production-apply/);
    expect(s).not.toMatch(new RegExp(APPLY_TOKEN));
  });

  it("hardcodes apply mode with the sealed FRLS token in the apply ceremony", () => {
    const s = src(APPLY_CEREMONY);
    expect(s).toMatch(new RegExp(`ExactApplyToken = "${APPLY_TOKEN}"`));
    expect(s).toMatch(/"-Mode", "apply"/);
    expect(s).toMatch(/i-authorize-production-apply/);
    expect(s).toMatch(/PRODUCTION APPLY/);
    expect(s).not.toMatch(/"-Mode", "dry-run"/);
    expect(readAuth().apply_authorization_token).toBe(APPLY_TOKEN);
  });

  it("blocks apply until prior dry-run pins are published", () => {
    for (const rel of [APPLY_CEREMONY, SUPERVISE, ENTER]) {
      const s = src(rel);
      expect(s, rel).toMatch(/Test-PriorDryRunPinsPublished/);
      expect(s, rel).toMatch(/BLOCKED_PRIOR_DRY_RUN_PINS_UNPUBLISHED/);
    }
    // The parameter is optional at the shell boundary; the seal is the gate.
    expect(src(APPLY_CEREMONY)).toMatch(
      /\[Parameter\(Mandatory = \$false\)\]\r?\n\s*\[string\]\$PriorDryRunEvidencePath = ""/,
    );
  });

  it("apply ceremony materializes prior-dry-run gates from freeze, not inline or PSScriptRoot", () => {
    const s = src(APPLY_CEREMONY);
    expect(s).toMatch(/Import-FrlsPriorDryRunGatesFromFreeze/);
    expect(s).toMatch(/Clear-FrlsMaterializedGates/);
    expect(s).toMatch(/Materialize-GitBlob/);
    expect(s).toMatch(/Assert-PriorDryRunEvidence/);
    expect(s).not.toMatch(
      /Join-Path \$PSScriptRoot "free-review-lead-session-prior-dry-run-gates\.ps1"/,
    );
    expect(s).not.toMatch(/function Assert-PriorDryRunEvidence/);
  });
});

describe("FRLS_LEAD_SESSION_EVIDENCE_V1 decode helper", () => {
  it("round-trips a frame and rejects a polluted stdout capture", () => {
    const evidence = require(
      path.join(ROOT, "scripts/security/free-review-lead-session-evidence.js"),
    );
    const frame = evidence.encodeEvidenceFrame(
      evidence.normalizeApplicatorEvidence({
        result_code: "DRY_RUN_BLOCKED",
        reason_code: "SYNTHETIC",
        phase: "test",
        mode: "dry-run",
      }),
    );
    expect(frame.startsWith(`${EVIDENCE_PROTOCOL_ID}:`)).toBe(true);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-decode-"));
    const good = path.join(dir, "good.txt");
    const polluted = path.join(dir, "polluted.txt");
    fs.writeFileSync(good, `${frame}\n`);
    fs.writeFileSync(polluted, `noise\n${frame}\n`);

    const run = (capture: string) =>
      spawnSync(
        process.execPath,
        [
          path.join(ROOT, DECODE_FRAME),
          path.join(ROOT, EVIDENCE_MODULE),
          capture,
        ],
        { encoding: "utf8", windowsHide: true, timeout: 60000 },
      );

    const ok = JSON.parse(run(good).stdout.trim());
    expect(ok.ok).toBe(true);
    expect(ok.evidence.result_code).toBe("DRY_RUN_BLOCKED");

    const bad = JSON.parse(run(polluted).stdout.trim());
    expect(bad.ok).toBe(false);
    expect(bad.code).toBe("APPLICATOR_EVIDENCE_STDOUT_POLLUTED");

    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe("FRLS ceremony fail-closed runtime (no DB, no credentials)", () => {
  it("dry-run ceremony refuses the retired containment credential channel", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-cer-retired-"));
    const secret = "SYNTH_RETIRED_NEVER_LEAK";
    const r = runCeremony({
      script: DRYRUN_CEREMONY,
      outDir: dir,
      env: {
        CONTAINMENT_APPLY_DATABASE_URL: `postgresql://u:${secret}@127.0.0.1:1/postgres`,
      },
    });
    const summary = JSON.parse(
      fs.readFileSync(path.join(dir, "PRODUCTION_DRY_RUN_SUMMARY.json"), "utf8"),
    );
    expect(summary.result_code).toBe("BLOCKED_RETIRED_CREDENTIAL_CHANNEL");
    expect(summary.sqlApplicationAttempts ?? 0).toBe(0);
    expect(summary.databaseConnectionAttempts ?? 0).toBe(0);
    const blob = JSON.stringify({ summary, stdout: r.stdout, stderr: r.stderr });
    expect(blob).not.toMatch(new RegExp(secret));
    expect(blob).not.toMatch(/postgresql:\/\/u:/i);
    expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120000);

  it("dry-run ceremony refuses an unauthorized freeze with zero attempts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-cer-pin-"));
    runCeremony({ script: DRYRUN_CEREMONY, outDir: dir });
    const summary = JSON.parse(
      fs.readFileSync(path.join(dir, "PRODUCTION_DRY_RUN_SUMMARY.json"), "utf8"),
    );
    expect(summary.result_code).not.toBe(
      "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
    );
    expect(summary.sqlApplicationAttempts ?? 0).toBe(0);
    expect(summary.databaseConnectionAttempts ?? 0).toBe(0);
    expect(summary.credential_cleared).toBe(true);
    expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120000);

  it("apply ceremony runs non-interactively without -PriorDryRunEvidencePath and never commits", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-cer-apply-"));
    const r = runCeremony({ script: APPLY_CEREMONY, outDir: dir });
    // A mandatory parameter would have blocked on a prompt instead of finishing.
    expect(r.status).not.toBeNull();
    const summary = JSON.parse(
      fs.readFileSync(path.join(dir, "PRODUCTION_APPLY_SUMMARY.json"), "utf8"),
    );
    const evidence = JSON.parse(
      fs.readFileSync(path.join(dir, "PRODUCTION_APPLY_EVIDENCE.json"), "utf8"),
    );
    expect(summary.result_code).not.toBe("APPLY_COMMITTED");
    expect(summary.sqlApplicationAttempts ?? 0).toBe(0);
    expect(summary.databaseConnectionAttempts ?? 0).toBe(0);
    expect(evidence.prior_dry_run_evidence_sha256).toBeNull();
    expect(evidence.harness_derived_forward_args).toBe(false);
    expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120000);

  it("visible supervisor emits a V1 BLOCKED frame before PROMPT_READY on a bad pin", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-sup-pin-"));
    const r = spawnSync(
      systemPowerShell(),
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(ROOT, SUPERVISE),
        "-PrHead",
        UNAUTHORIZED_FREEZE,
        "-CeremonyKind",
        "dry-run",
        "-RepoRoot",
        ROOT,
        "-EvidenceOutDir",
        dir,
        "-TestStubScript",
        STUB,
        "-WaitForPromptReady",
        "-PromptReadyTimeoutSec",
        "15",
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 120000 },
    );
    expect(r.status).not.toBe(0);
    const ev =
      decodeEvidenceFrame(String(r.stdout || "")) ??
      JSON.parse(
        fs.readFileSync(path.join(dir, "VISIBLE_SUPERVISOR_EVIDENCE.json"), "utf8"),
      );
    expect(ev).toBeTruthy();
    // Pin gate once the authorization blob is committed; auth-load refusal before then.
    expect(String(ev!.reason_code)).toMatch(
      /^BLOCKED_(PIN_MISMATCH|VISIBLE_SUPERVISOR|SEAL_MISMATCH)$/,
    );
    expect(ev!.result_code).toBe("BLOCKED");
    expect(ev!.databaseConnectionAttempts).toBe(0);
    expect(ev!.sqlApplicationAttempts).toBe(0);
    expect(ev!.advisory_lock_acquired).toBe(false);
    expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
    const materials = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("material-"));
    expect(materials.length).toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120000);
});
