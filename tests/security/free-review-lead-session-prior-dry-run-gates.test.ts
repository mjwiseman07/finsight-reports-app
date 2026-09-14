/**
 * FRLS prior-dry-run verdict allowlist + Assert-PriorDryRunEvidence regressions.
 * Synthetic evidence only — no DB, no credentials, no pin publication to tip auth.
 */
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const HARNESS = path.join(
  ROOT,
  "tests/security/helpers/frls-prior-dry-run-gate-harness.ps1",
);
const APPLY_CEREMONY =
  "scripts/security/operator-free-review-lead-session-production-apply-ceremony.ps1";
const GATES =
  "scripts/security/free-review-lead-session-prior-dry-run-gates.ps1";
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json",
);

const LONG = "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION";
const SHORT = "DRY_RUN_READY";
const FREEZE = "fdd365018a091d9f828df11af1c0afb66a7dcba5";
const TIP = "e581569b458ee4c64613675242a3a3d2468c71c0";

function systemPowerShell(): string {
  return path.join(
    process.env.SystemRoot || "C:\\Windows",
    "System32",
    "WindowsPowerShell",
    "v1.0",
    "powershell.exe",
  );
}

function runHarness(args: string[]): { status: number | null; out: string } {
  const r = spawnSync(
    systemPowerShell(),
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", HARNESS, ...args],
    { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 60000 },
  );
  return { status: r.status, out: String(r.stdout || "") + String(r.stderr || "") };
}

function sha256Text(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

function baseEvidence(overrides: Record<string, unknown> = {}) {
  const appOverrides =
    (overrides.applicator as Record<string, unknown> | undefined) || {};
  const cleanupOverrides =
    (overrides.cleanup as Record<string, unknown> | undefined) || {};
  const { applicator: _a, cleanup: _c, ...top } = overrides;
  return {
    result_code: LONG,
    mode: "dry-run",
    sqlApplicationAttempts: 0,
    advisory_lock_acquired: false,
    applicator: {
      verdict: LONG,
      result_code: LONG,
      read_only: true,
      authorized_tooling_freeze: FREEZE,
      pr_head: FREEZE,
      evidence_tip: TIP,
      sqlApplicationAttempts: 0,
      advisory_lock_acquired: false,
      ...appOverrides,
    },
    cleanup: {
      credential_cleared: true,
      ca_path_env_absent: true,
      ...cleanupOverrides,
    },
    ...top,
  };
}

function writeEvidencePair(
  dir: string,
  evidence: Record<string, unknown>,
  authPins?: {
    sha?: string | null;
    freeze?: string | null;
    tip?: string | null;
  },
) {
  const evidencePath = path.join(dir, "prior-dry-run-evidence.json");
  const body = `${JSON.stringify(evidence, null, 2)}\n`;
  fs.writeFileSync(evidencePath, body, "utf8");
  const sha = sha256Text(body);
  const tipAuth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
  const auth = {
    ...tipAuth,
    required_prior_dry_run_evidence_sha256:
      authPins && "sha" in authPins ? authPins.sha : sha,
    required_prior_dry_run_freeze:
      authPins && "freeze" in authPins ? authPins.freeze : FREEZE,
    required_prior_dry_run_evidence_tip:
      authPins && "tip" in authPins ? authPins.tip : TIP,
  };
  const authPath = path.join(dir, "auth-with-pins.json");
  fs.writeFileSync(authPath, `${JSON.stringify(auth, null, 2)}\n`, "utf8");
  return { evidencePath, authPath, sha };
}

describe("FRLS prior-dry-run verdict allowlist (assert-codes)", () => {
  it("accepts long-form success in both wrapper and applicator", () => {
    const r = runHarness([
      "-Action",
      "assert-codes",
      "-WrapperResultCode",
      LONG,
      "-ApplicatorVerdict",
      LONG,
    ]);
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/ACCEPTED/);
  });

  it("accepts short-form historical success in both", () => {
    const r = runHarness([
      "-Action",
      "assert-codes",
      "-WrapperResultCode",
      SHORT,
      "-ApplicatorVerdict",
      SHORT,
    ]);
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/ACCEPTED/);
  });

  it("accepts long wrapper + short applicator (semantic agreement under allowlist)", () => {
    const r = runHarness([
      "-Action",
      "assert-codes",
      "-WrapperResultCode",
      LONG,
      "-ApplicatorVerdict",
      SHORT,
    ]);
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/ACCEPTED/);
  });

  it("accepts short wrapper + long applicator (semantic agreement under allowlist)", () => {
    const r = runHarness([
      "-Action",
      "assert-codes",
      "-WrapperResultCode",
      SHORT,
      "-ApplicatorVerdict",
      LONG,
    ]);
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/ACCEPTED/);
  });

  it("rejects success wrapper + blocked applicator", () => {
    const r = runHarness([
      "-Action",
      "assert-codes",
      "-WrapperResultCode",
      LONG,
      "-ApplicatorVerdict",
      "DRY_RUN_BLOCKED",
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_NOT_READY/);
  });

  it("rejects blocked wrapper + success applicator", () => {
    const r = runHarness([
      "-Action",
      "assert-codes",
      "-WrapperResultCode",
      "DRY_RUN_BLOCKED",
      "-ApplicatorVerdict",
      LONG,
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_NOT_READY/);
  });

  it("rejects missing/null applicator verdict", () => {
    const r = runHarness([
      "-Action",
      "assert-codes",
      "-WrapperResultCode",
      LONG,
      "-ApplicatorVerdictKind",
      "null",
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_NOT_READY/);
  });

  it("rejects non-string applicator verdict", () => {
    for (const kind of ["number", "bool", "object"]) {
      const r = runHarness([
        "-Action",
        "assert-codes",
        "-WrapperResultCode",
        LONG,
        "-ApplicatorVerdictKind",
        kind,
      ]);
      expect(r.status, kind).toBe(1);
      expect(r.out, kind).toMatch(/BLOCKED_PRIOR_DRY_RUN_NOT_READY/);
    }
  });

  it("rejects unknown spelling", () => {
    const r = runHarness([
      "-Action",
      "assert-codes",
      "-WrapperResultCode",
      "DRY_RUN_READY_FOR_APPLY",
      "-ApplicatorVerdict",
      LONG,
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_NOT_READY/);
  });
});

describe("FRLS Assert-PriorDryRunEvidence regressions", () => {
  it("accepts sealed long-form evidence when auth pins match", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-ok-"));
    const { evidencePath, authPath, sha } = writeEvidencePair(dir, baseEvidence());
    const r = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      evidencePath,
      "-AuthJsonPath",
      authPath,
    ]);
    expect(r.status).toBe(0);
    expect(r.out).toContain(`ACCEPTED:${sha}`);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("accepts short-form historical evidence when both sides short", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-short-"));
    const { evidencePath, authPath } = writeEvidencePair(
      dir,
      baseEvidence({
        result_code: SHORT,
        applicator: { verdict: SHORT, result_code: SHORT },
      }),
    );
    const r = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      evidencePath,
      "-AuthJsonPath",
      authPath,
    ]);
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/^ACCEPTED:/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects wrong evidence hash", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-hash-"));
    const { evidencePath, authPath } = writeEvidencePair(dir, baseEvidence(), {
      sha: "ab".repeat(32),
    });
    const r = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      evidencePath,
      "-AuthJsonPath",
      authPath,
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_SHA_MISMATCH/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects wrong freeze pin", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-freeze-"));
    const { evidencePath, authPath } = writeEvidencePair(dir, baseEvidence(), {
      freeze: "a".repeat(40),
    });
    const r = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      evidencePath,
      "-AuthJsonPath",
      authPath,
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects non-zero sqlApplicationAttempts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-sql-"));
    const { evidencePath, authPath } = writeEvidencePair(
      dir,
      baseEvidence({ sqlApplicationAttempts: 1 }),
    );
    const r = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      evidencePath,
      "-AuthJsonPath",
      authPath,
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/sqlApplicationAttempts must be 0/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects read_only false", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-ro-"));
    const { evidencePath, authPath } = writeEvidencePair(
      dir,
      baseEvidence({ applicator: { read_only: false } }),
    );
    const r = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      evidencePath,
      "-AuthJsonPath",
      authPath,
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/read_only must be true/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects advisory_lock_acquired true", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-adv-"));
    const { evidencePath, authPath } = writeEvidencePair(
      dir,
      baseEvidence({ advisory_lock_acquired: true }),
    );
    const r = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      evidencePath,
      "-AuthJsonPath",
      authPath,
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/advisory_lock_acquired must be false/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects malformed evidence JSON", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-mal-"));
    const evidencePath = path.join(dir, "bad.json");
    fs.writeFileSync(evidencePath, "{not-json", "utf8");
    const tipAuth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const authPath = path.join(dir, "auth.json");
    fs.writeFileSync(
      authPath,
      JSON.stringify({
        ...tipAuth,
        required_prior_dry_run_evidence_sha256: sha256Text("{not-json"),
        required_prior_dry_run_freeze: FREEZE,
        required_prior_dry_run_evidence_tip: TIP,
      }),
      "utf8",
    );
    const r = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      evidencePath,
      "-AuthJsonPath",
      authPath,
    ]);
    expect(r.status).toBe(1);
    expect(r.out).toMatch(/malformed evidence JSON|BLOCKED_PRIOR_DRY_RUN/);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("tip auth null prior-dry-run pins still block apply ceremony", () => {
    const { execFileSync } = require("node:child_process");
    const tipAuth = JSON.parse(
      execFileSync(
        "git",
        [
          "show",
          "HEAD:docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json",
        ],
        { encoding: "utf8" },
      ),
    );
    expect(tipAuth.required_prior_dry_run_evidence_sha256).toBeNull();
    expect(tipAuth.required_prior_dry_run_freeze).toBeNull();
    expect(tipAuth.required_prior_dry_run_evidence_tip).toBeNull();
    expect(tipAuth.authorized_pr_head).toMatch(/^[0-9a-f]{40}$/i);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-nullpins-"));
    const r = spawnSync(
      systemPowerShell(),
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(ROOT, APPLY_CEREMONY),
        "-PrHead",
        tipAuth.authorized_pr_head,
        "-RepoRoot",
        ROOT,
        "-EvidenceOutDir",
        dir,
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 120000 },
    );
    const summary = JSON.parse(
      fs.readFileSync(path.join(dir, "PRODUCTION_APPLY_SUMMARY.json"), "utf8"),
    );
    expect(summary.result_code).toBe("BLOCKED_PRIOR_DRY_RUN_PINS_UNPUBLISHED");
    expect(summary.sqlApplicationAttempts ?? 0).toBe(0);
    expect(r.status).not.toBe(0);
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120000);

  it("apply ceremony dotsources shared gates and uses identical allowlist", () => {
    const ceremony = fs.readFileSync(path.join(ROOT, APPLY_CEREMONY), "utf8");
    const gates = fs.readFileSync(path.join(ROOT, GATES), "utf8");
    expect(ceremony).toMatch(/free-review-lead-session-prior-dry-run-gates\.ps1/);
    expect(ceremony).not.toMatch(
      /applicator verdict must be DRY_RUN_READY"/,
    );
    expect(gates).toContain(LONG);
    expect(gates).toContain(SHORT);
    expect(gates).toMatch(/Assert-FrlsPriorDryRunReadyCodes/);
  });
});
