/**
 * Visible-path tip ceremony authority: supervisor → tip entry → tip dry-run ceremony.
 * Synthetic loopback only — zero production contact.
 */
import { spawnSync, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

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
const DRYRUN = path.join(
  ROOT,
  "scripts/security/operator-ra-pro-cutover-production-dryrun-ceremony.ps1",
);
const STUB = path.join(
  ROOT,
  "tests/security/helpers/synthetic-visible-ceremony-stub.ps1",
);
const EVIDENCE_FIXTURE = path.join(
  ROOT,
  "tests/security/helpers/fixtures/ra-pro-cutover-precondition-evidence.json",
);
const EXPECTED_EVIDENCE_SHA =
  "fb3625f99027c600c1b1280f103df723b4fbff56ee21c60a3c8ed6e2789a7cd3";
const EXPECTED_EVIDENCE_BYTES = 1407;
const FREEZE = "a74d5108752d93e1ca4baa78f4dc7425120658b7";
const BUNDLE_SOURCE = "90af07d27e122d80d5fb5072f7a66da818f245a5";

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

function decodeEvidence(stdout: string): Record<string, unknown> | null {
  const m = String(stdout || "").match(
    /RA_PRO_CUTOVER_EVIDENCE_V1:([A-Za-z0-9_-]+)/,
  );
  if (!m) return null;
  let b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

function runSupervise(opts: {
  evidenceDir: string;
  stub?: string;
  prHead?: string;
  env?: NodeJS.ProcessEnv;
  timeoutSec?: number;
  extraArgs?: string[];
}): ReturnType<typeof spawnSync> {
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    SUPERVISE,
    "-PrHead",
    opts.prHead || FREEZE,
    "-CeremonyKind",
    "dry-run",
    "-RepoRoot",
    ROOT,
    "-EvidenceOutDir",
    opts.evidenceDir,
    "-WaitForPromptReady",
    "-PromptReadyTimeoutSec",
    String(opts.timeoutSec ?? 120),
  ];
  if (opts.stub) {
    args.push("-TestStubScript", opts.stub);
  }
  if (opts.extraArgs) args.push(...opts.extraArgs);
  return spawnSync(systemPowerShell(), args, {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
    timeout: (opts.timeoutSec ?? 120) * 1000 + 30000,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      ...(opts.env || {}),
    },
  });
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

describe("RA Pro visible tip ceremony authority (contract)", () => {
  it("entry tip-materializes dry-run operator_ceremony; freeze owns launcher", () => {
    const enter = fs.readFileSync(ENTER, "utf8");
    expect(enter).toMatch(/ceremonyAuthorityCommit = \$tip/);
    expect(enter).toMatch(/freeze ceremony fallback forbidden when precondition evidence is PUBLISHED/);
    expect(enter).toMatch(/Assert-PublicationTipAncestry/);
    expect(enter).toMatch(/Mixed authority map/);
    expect(enter).toMatch(/RA_PRO_CUTOVER_PUBLICATION_TIP/);
    expect(enter).toMatch(/Assert-BlobSeal -Commit \$ceremonyAuthorityCommit/);
    expect(enter).toMatch(/Assert-BlobSeal -Commit \$freeze -Rel "scripts\/security\/launch-visible-ra-pro-cutover-ceremony\.ps1"/);
    expect(enter).not.toMatch(
      /Assert-BlobSeal -Freeze \$freeze -Rel \$ceremonyRel/,
    );
  });

  it("tip operator_ceremony seal ≠ freeze blob (pin-review defect locus)", () => {
    const auth = readAuth();
    const tipOid = git([
      "rev-parse",
      `HEAD:${auth.operator_ceremony.path}`,
    ]);
    const freezeOid = git([
      "rev-parse",
      `${FREEZE}:${auth.operator_ceremony.path}`,
    ]);
    expect(tipOid).toBe(auth.operator_ceremony.oid);
    expect(freezeOid).not.toBe(auth.operator_ceremony.oid);
    expect(sha256File(DRYRUN)).toBe(auth.operator_ceremony.sha256);
  });

  it("evidence fixture remains byte-identical to published pin", () => {
    const buf = fs.readFileSync(EVIDENCE_FIXTURE);
    expect(buf.length).toBe(EXPECTED_EVIDENCE_BYTES);
    expect(sha256File(EVIDENCE_FIXTURE)).toBe(EXPECTED_EVIDENCE_SHA);
    const auth = readAuth();
    expect(auth.required_precondition_evidence_sha256).toBe(EXPECTED_EVIDENCE_SHA);
    expect(auth.published_precondition_evidence.evidence_bytes).toBe(
      EXPECTED_EVIDENCE_BYTES,
    );
    expect(auth.published_precondition_evidence.valid_until_utc).toBe(
      "2026-09-17T05:25:11Z",
    );
    expect(auth.authorized_pr_head).toBe(FREEZE);
    expect(auth.bundle_source_commit).toBe(BUNDLE_SOURCE);
    expect(auth.required_prior_dry_run_evidence_sha256).toBe(
      "9679678436659c64857c47397b5196343e11b8e3cc8277b7af0594a99b4f9a88",
    );
    expect(auth.published_prior_dry_run.status).toBe("PUBLISHED");
    expect(auth.published_prior_dry_run.evidence_bytes).toBe(112020);
    expect(auth.required_pre_apply_live_evidence_sha256).toBe(
      "98e8824b6a7137a893f3e12719e1fa5a1a39de6d69f3d6c19def821e6c1aea98",
    );
    expect(auth.published_pre_apply_live_evidence?.status).toBe("PUBLISHED");
    expect(auth.published_pre_apply_live_evidence?.evidence_bytes).toBe(2309);
  });

  it("freeze/source/tip identities preserved; no unresolved self-tip placeholder", () => {
    const auth = readAuth();
    expect(auth.authorized_pr_head).toBe(FREEZE);
    expect(auth.bundle_source_commit).toBe(BUNDLE_SOURCE);
    const tip = git(["rev-parse", "HEAD"]);
    expect(tip).toMatch(/^[0-9a-f]{40}$/);
    expect(tip).not.toBe(FREEZE);
    expect(tip).not.toBe(BUNDLE_SOURCE);
    const enter = fs.readFileSync(ENTER, "utf8");
    // Executable blobs may document ${PublicationTip}:path and reject PENDING_AFTER_COMMIT,
    // but must not embed an unresolved self-commit SHA placeholder.
    expect(enter).not.toMatch(/PublicationTip\s*=\s*["'][0-9a-fA-F]{40}["']/);
    expect(enter).not.toMatch(/PENDING_PUBLICATION_TIP|UNRESOLVED_PUBLICATION_TIP/);
    const body = JSON.stringify(auth);
    expect(body).not.toMatch(/PENDING_AFTER_COMMIT/);
    expect(String(auth.authorized_pr_head)).not.toMatch(/PENDING/i);
  });

  it("secret/forbidden-content scan on tip ceremony surface", () => {
    const files = [
      ENTER,
      DRYRUN,
      SUPERVISE,
      AUTH_PATH,
      EVIDENCE_FIXTURE,
      path.join(ROOT, "docs/security/ra-pro-cutover-apply/APPLY_RUNBOOK.md"),
    ];
    for (const f of files) {
      const text = fs.readFileSync(f, "utf8");
      expect(text, path.basename(f)).not.toMatch(FORBIDDEN);
    }
  });
});

describe.skipIf(!isWin)("RA Pro visible tip ceremony (Windows runtime)", () => {
  it("supervisor → tip entry → stub reaches PROMPT_READY; worktree ceremony poison ignored", () => {
    const auth = readAuth();
    expect(sha256File(ENTER)).toBe(auth.visible_ceremony_entry.sha256);
    expect(sha256File(DRYRUN)).toBe(auth.operator_ceremony.sha256);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-tip-ok-"));
    const backup = fs.readFileSync(DRYRUN);
    try {
      fs.appendFileSync(DRYRUN, "\n# WORKTREE_POISON_CEREMONY\n");
      const r = runSupervise({ evidenceDir: dir, stub: STUB, timeoutSec: 60 });
      expect(r.status, r.stderr || r.stdout || "").toBe(0);
      expect(String(r.stdout || "")).toMatch(/PROMPT_READY/);
      expect(fs.existsSync(path.join(dir, "SYNTHETIC_STUB_OK.txt"))).toBe(true);
    } finally {
      fs.writeFileSync(DRYRUN, backup);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("freeze ceremony OID cannot satisfy tip seal (fail-closed locus)", () => {
    const auth = readAuth();
    const freezeOid = git([
      "rev-parse",
      `${FREEZE}:${auth.operator_ceremony.path}`,
    ]);
    expect(freezeOid).not.toBe(auth.operator_ceremony.oid);
    // Tip materialization is required; freeze blob would fail OID check against tip seal.
    const tipOid = git(["rev-parse", `HEAD:${auth.operator_ceremony.path}`]);
    expect(tipOid).toBe(auth.operator_ceremony.oid);
  });

  it("forbidden publication-tip env fails before PROMPT_READY", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-tip-env-"));
    const r = runSupervise({
      evidenceDir: dir,
      stub: STUB,
      timeoutSec: 45,
      env: {
        RA_PRO_CUTOVER_PUBLICATION_TIP: FREEZE,
      },
    });
    expect(r.status).not.toBe(0);
    expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
    const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
    const ev = decodeEvidence(combined);
    if (ev) {
      expect(String(ev.reason_code || ev.error_code || "")).toMatch(
        /BLOCKED_INPUT_INVALID|BLOCKED_SEAL_MISMATCH|BLOCKED_ENTER/,
      );
    } else {
      expect(combined).toMatch(/forbidden env|BLOCKED/i);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("wrong PrHead / unrelated tip fails before PROMPT_READY", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-tip-badpin-"));
    const r = runSupervise({
      evidenceDir: dir,
      stub: STUB,
      prHead: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      timeoutSec: 30,
    });
    expect(r.status).not.toBe(0);
    expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
    const ev = decodeEvidence(`${r.stdout || ""}\n${r.stderr || ""}`);
    expect(String(ev?.reason_code || "")).toMatch(/BLOCKED_PIN_MISMATCH/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("tampered tip auth operator_ceremony seal fails before PROMPT_READY", () => {
    const wt = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-tip-tamper-"));
    try {
      execFileSync("git", ["worktree", "add", "--detach", wt, "HEAD"], {
        cwd: ROOT,
        encoding: "utf8",
      });
      const authPath = path.join(wt, "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json");
      const bad = JSON.parse(fs.readFileSync(authPath, "utf8"));
      bad.operator_ceremony.oid = "deadbeef".repeat(5);
      bad.operator_ceremony.sha256 = "ab".repeat(32);
      fs.writeFileSync(authPath, `${JSON.stringify(bad, null, 2)}\n`);
      execFileSync("git", ["add", "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json"], {
        cwd: wt,
      });
      execFileSync(
        "git",
        [
          "-c",
          "user.email=test@example.com",
          "-c",
          "user.name=test",
          "commit",
          "-m",
          "tamper tip ceremony seal",
        ],
        { cwd: wt, encoding: "utf8" },
      );

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-tip-tamper-ev-"));
      const r = spawnSync(
        systemPowerShell(),
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          path.join(wt, "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1"),
          "-PrHead",
          FREEZE,
          "-CeremonyKind",
          "dry-run",
          "-RepoRoot",
          wt,
          "-EvidenceOutDir",
          dir,
          "-TestStubScript",
          STUB,
          "-WaitForPromptReady",
          "-PromptReadyTimeoutSec",
          "30",
        ],
        {
          cwd: wt,
          encoding: "utf8",
          windowsHide: true,
          timeout: 90000,
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
          },
        },
      );
      expect(r.status).not.toBe(0);
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

  it("freeze ceremony seal substituted into tip auth fails before PROMPT_READY", () => {
    const wt = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-tip-freeze-sub-"));
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
      const freezeOid = git([
        "rev-parse",
        `${FREEZE}:${bad.operator_ceremony.path}`,
      ]);
      const freezeBytes = Buffer.from(
        execFileSync("git", ["cat-file", "blob", `${FREEZE}:${bad.operator_ceremony.path}`], {
          cwd: ROOT,
        }),
      );
      bad.operator_ceremony.oid = freezeOid;
      bad.operator_ceremony.sha256 = crypto
        .createHash("sha256")
        .update(freezeBytes)
        .digest("hex");
      bad.operator_ceremony.bytes = freezeBytes.length;
      fs.writeFileSync(authPath, `${JSON.stringify(bad, null, 2)}\n`);
      execFileSync(
        "git",
        ["add", "docs/security/ra-pro-cutover-apply/TOOLING_AUTHORIZATION.json"],
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
          "substitute freeze ceremony seal on tip",
        ],
        { cwd: wt, encoding: "utf8" },
      );

      // Restore tip-LF supervisor/entry bytes so worktree CRLF cannot mask ceremony seal failure.
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

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-tip-freeze-sub-ev-"));
      // No stub: forces tip materialize of operator_ceremony (seal≠tip blob → fail).
      const r = spawnSync(
        systemPowerShell(),
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          path.join(wt, "scripts/security/supervise-visible-ra-pro-cutover-ceremony.ps1"),
          "-PrHead",
          FREEZE,
          "-CeremonyKind",
          "dry-run",
          "-RepoRoot",
          wt,
          "-EvidenceOutDir",
          dir,
          "-WaitForPromptReady",
          "-PromptReadyTimeoutSec",
          "30",
        ],
        {
          cwd: wt,
          encoding: "utf8",
          windowsHide: true,
          timeout: 90000,
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
          },
        },
      );
      expect(r.status).not.toBe(0);
      expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
      const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
      const ev = decodeEvidence(combined);
      expect(String(ev?.reason_code || ev?.error_code || combined)).toMatch(
        /BLOCKED_SEAL_MISMATCH|OID mismatch|SHA-256 mismatch/i,
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

  it("CREATE_SUSPENDED assign failure remains fail-closed", () => {
    const hang = path.join(
      ROOT,
      "tests/security/helpers/synthetic-visible-ceremony-hang-stub.ps1",
    );
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-tip-assign-"));
    const r = runSupervise({
      evidenceDir: dir,
      stub: hang,
      timeoutSec: 30,
      extraArgs: ["-TestForceAssignFail"],
    });
    expect(r.status).not.toBe(0);
    expect(fs.existsSync(path.join(dir, "PROMPT_READY.txt"))).toBe(false);
    const ev = decodeEvidence(`${r.stdout || ""}\n${r.stderr || ""}`);
    expect(String(ev?.reason_code || "")).toMatch(
      /BLOCKED_JOB_OBJECT|BLOCKED_PIN_MISMATCH|BLOCKED_CHILD/,
    );
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe.skipIf(!isWin || !dockerOk)(
  "RA Pro visible tip ceremony e2e (synthetic loopback)",
  () => {
    let pg: { name: string; url: string; stop: () => Promise<void> };

    beforeAll(async () => {
      const { startDisposablePg, seedApplicatorWorld } = await import(
        "./helpers/ra-pro-cutover-applicator-sim.js"
      );
      pg = await startDisposablePg();
      const client = new Client({ connectionString: pg.url });
      await client.connect();
      await seedApplicatorWorld(client);
      await client.end();
    }, 180000);

    afterAll(async () => {
      if (pg) await pg.stop();
    });

    it("supervisor → tip entry → tip ceremony → sealed applicator dry-run", async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ra-pro-tip-e2e-"));
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
          FREEZE,
          "-CeremonyKind",
          "dry-run",
          "-RepoRoot",
          ROOT,
          "-EvidenceOutDir",
          dir,
          "-WaitForPromptReady",
          "-PromptReadyTimeoutSec",
          "180",
        ],
        {
          cwd: ROOT,
          encoding: "utf8",
          windowsHide: true,
          timeout: 240000,
          env: {
            PATH: process.env.PATH,
            SystemRoot: process.env.SystemRoot,
            TEMP: process.env.TEMP,
            TMP: process.env.TMP,
            RA_PRO_CUTOVER_CEREMONY_ALLOW_SYNTHETIC_URL: "1",
            RA_PRO_CUTOVER_CEREMONY_TEST_SYNTHETIC_DATABASE_URL: pg.url,
          },
        },
      );

      const combined = `${r.stdout || ""}\n${r.stderr || ""}`;
      expect(r.status, combined).toBe(0);
      expect(combined).toMatch(/PROMPT_READY/);

      // Ceremony evidence may land in evidence dir JSON or stdout frame from child.
      let evidence: Record<string, any> | null = null;
      const jsonCandidates = [
        path.join(dir, "PRODUCTION_DRY_RUN_EVIDENCE.json"),
        path.join(dir, "PRODUCTION_DRY_RUN_SUMMARY.json"),
        path.join(dir, "RA_PRO_CUTOVER_EVIDENCE.json"),
        path.join(dir, "CEREMONY_RESULT.json"),
        path.join(dir, "VISIBLE_ENTRY_EVIDENCE.json"),
      ];
      for (const p of jsonCandidates) {
        if (fs.existsSync(p)) {
          try {
            const j = JSON.parse(fs.readFileSync(p, "utf8"));
            if (j.evidence_source || j.verdict || j.result_code || j.applicator) {
              // Prefer nested applicator fields when summary wraps them
              evidence = j.applicator && j.applicator.evidence_source ? { ...j, ...j.applicator } : j;
              break;
            }
          } catch {
            /* continue */
          }
        }
      }
      if (!evidence) {
        // Walk evidence dir for frames
        for (const name of fs.readdirSync(dir)) {
          const p = path.join(dir, name);
          if (!fs.statSync(p).isFile()) continue;
          const text = fs.readFileSync(p, "utf8");
          const framed = decodeEvidence(text);
          if (framed && (framed.evidence_source || framed.verdict)) {
            evidence = framed;
            break;
          }
        }
      }
      if (!evidence) {
        evidence = decodeEvidence(combined);
      }

      expect(evidence, combined.slice(0, 2000)).toBeTruthy();
      expect(String(evidence!.evidence_source || "")).toBe("sealed_applicator");
      expect(
        String(evidence!.verdict || evidence!.result_code || ""),
      ).toMatch(/DRY_RUN_READY/);
      expect(Number(evidence!.databaseConnectionAttempts ?? 0)).toBeGreaterThanOrEqual(1);
      expect(Number(evidence!.sqlApplicationAttempts ?? -1)).toBe(0);
      expect(evidence!.advisory_lock_acquired).toBe(false);
      expect(String(evidence!.evidence_source)).not.toBe("native_wrapper_fallback");
      expect(
        evidence!.nodeProcessStarted === true ||
          evidence!.bootstrap?.nodeProcessStarted === true ||
          Number(evidence!.databaseConnectionAttempts ?? 0) >= 1,
      ).toBe(true);

      const scanText = `${combined}\n${JSON.stringify(evidence)}`;
      expect(scanText).not.toMatch(FORBIDDEN);
      expect(scanText).not.toMatch(/postgres:postgres/i);

      fs.rmSync(dir, { recursive: true, force: true });
    }, 300000);
  },
);
