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

const PROJECT_REF = "jzmdgwwiestcmmeuhhkr";
const MIGRATION_VERSION = "20260913235500";
const MIGRATION_NAME = "free_review_lead_sessions";
const MIGRATION_PATH =
  "supabase/migrations/20260913235500_free_review_lead_sessions.sql";
const MIGRATION_BLOB_OID = "7dca9674673eb51ab5094d3ec09508d0711f16cd";
const MIGRATION_SHA256 =
  "b7e1e68b82a5975e85e1b9d6f0c491fa632474801ce00b311cea366f3b9b0ddb";
const MIGRATION_BYTES = 8108;
const PRIOR_HISTORY_COUNT = 186;

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
  const wrapCredOverrides =
    (overrides.credential_redaction_confirmation as Record<string, unknown> | undefined) ||
    {};
  const appCredOverrides =
    (appOverrides.credential_redaction_confirmation as Record<string, unknown> | undefined) ||
    {};
  const { applicator: _a, cleanup: _c, credential_redaction_confirmation: _wcr, ...top } =
    overrides;
  const { credential_redaction_confirmation: _acr, ...appRest } = appOverrides;
  return {
    result_code: LONG,
    evidence_source: "sealed_applicator",
    mode: "dry-run",
    freeze: FREEZE,
    databaseConnectionAttempts: 1,
    sqlApplicationAttempts: 0,
    advisory_lock_acquired: false,
    credential_redaction_confirmation: {
      url_in_evidence: false,
      url_in_argv: false,
      ...wrapCredOverrides,
    },
    applicator: {
      verdict: LONG,
      evidence_source: "sealed_applicator",
      mode: "dry-run",
      read_only: true,
      project_ref_provided: PROJECT_REF,
      authorized_tooling_freeze: FREEZE,
      evidence_tip: TIP,
      migration_version: MIGRATION_VERSION,
      migration_name: MIGRATION_NAME,
      migration_path: MIGRATION_PATH,
      migration_blob_oid: MIGRATION_BLOB_OID,
      migration_sha256: MIGRATION_SHA256,
      migration_bytes: MIGRATION_BYTES,
      prior_history_count: PRIOR_HISTORY_COUNT,
      version_absent: true,
      migration_objects_absent: true,
      transaction_mutation: false,
      databaseConnectionAttempts: 1,
      sqlApplicationAttempts: 0,
      advisory_lock_acquired: false,
      credential_redaction_confirmation: {
        values_undisclosed: true,
        ...appCredOverrides,
      },
      ...appRest,
    },
    cleanup: {
      credential_cleared: true,
      ca_path_env_absent: true,
      completed: true,
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

function assertEvidenceRejected(
  evidence: Record<string, unknown>,
  pattern: RegExp,
) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-neg-"));
  const { evidencePath, authPath } = writeEvidencePair(dir, evidence);
  const r = runHarness([
    "-Action",
    "assert-evidence",
    "-EvidencePath",
    evidencePath,
    "-AuthJsonPath",
    authPath,
  ]);
  expect(r.status).toBe(1);
  expect(r.out).toMatch(pattern);
  fs.rmSync(dir, { recursive: true, force: true });
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
        applicator: { verdict: SHORT },
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
    assertEvidenceRejected(
      baseEvidence({ sqlApplicationAttempts: 1 }),
      /sqlApplicationAttempts must be 0/,
    );
  });

  it("rejects read_only false", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { read_only: false } }),
      /read_only must be true/,
    );
  });

  it("rejects advisory_lock_acquired true", () => {
    assertEvidenceRejected(
      baseEvidence({ advisory_lock_acquired: true }),
      /BLOCKED_PRIOR_DRY_RUN_LOCK|advisory_lock_acquired must be false/,
    );
  });

  it("rejects missing wrapper advisory_lock_acquired", () => {
    const ev = baseEvidence();
    delete (ev as Record<string, unknown>).advisory_lock_acquired;
    assertEvidenceRejected(ev, /BLOCKED_PRIOR_DRY_RUN_LOCK|missing field advisory_lock_acquired/);
  });

  it("rejects missing applicator advisory_lock_acquired", () => {
    const ev = baseEvidence();
    delete (ev.applicator as Record<string, unknown>).advisory_lock_acquired;
    assertEvidenceRejected(ev, /BLOCKED_PRIOR_DRY_RUN_LOCK|missing field advisory_lock_acquired/);
  });

  it("rejects null wrapper advisory_lock_acquired", () => {
    assertEvidenceRejected(
      baseEvidence({ advisory_lock_acquired: null }),
      /BLOCKED_PRIOR_DRY_RUN_LOCK|null field advisory_lock_acquired/,
    );
  });

  it("rejects string wrapper advisory_lock_acquired", () => {
    assertEvidenceRejected(
      baseEvidence({ advisory_lock_acquired: "false" as unknown as boolean }),
      /BLOCKED_PRIOR_DRY_RUN_LOCK|non-boolean field advisory_lock_acquired/,
    );
  });

  it("rejects number wrapper advisory_lock_acquired", () => {
    assertEvidenceRejected(
      baseEvidence({ advisory_lock_acquired: 0 as unknown as boolean }),
      /BLOCKED_PRIOR_DRY_RUN_LOCK|non-boolean field advisory_lock_acquired/,
    );
  });

  it("rejects wrapper/applicator advisory_lock disagreement", () => {
    assertEvidenceRejected(
      baseEvidence({
        advisory_lock_acquired: false,
        applicator: { advisory_lock_acquired: true },
      }),
      /BLOCKED_PRIOR_DRY_RUN_LOCK/,
    );
  });

  it("accepts explicit boolean false advisory_lock on wrapper and applicator", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-lockok-"));
    const { evidencePath, authPath } = writeEvidencePair(dir, baseEvidence());
    const r = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      evidencePath,
      "-AuthJsonPath",
      authPath,
    ]);
    expect(r.status).toBe(0);
    expect(r.out).toMatch(/ACCEPTED|sha256/i);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("rejects missing read_only (no false inference success)", () => {
    const ev = baseEvidence();
    delete (ev.applicator as Record<string, unknown>).read_only;
    assertEvidenceRejected(ev, /missing field read_only|BLOCKED_PRIOR_DRY_RUN_INVALID/);
  });

  it("rejects missing version_absent", () => {
    const ev = baseEvidence();
    delete (ev.applicator as Record<string, unknown>).version_absent;
    assertEvidenceRejected(ev, /missing field version_absent|BLOCKED_PRIOR_DRY_RUN_VERSION/);
  });

  it("rejects missing migration_objects_absent", () => {
    const ev = baseEvidence();
    delete (ev.applicator as Record<string, unknown>).migration_objects_absent;
    assertEvidenceRejected(ev, /missing field migration_objects_absent|BLOCKED_PRIOR_DRY_RUN_OBJECTS/);
  });

  it("rejects missing transaction_mutation", () => {
    const ev = baseEvidence();
    delete (ev.applicator as Record<string, unknown>).transaction_mutation;
    assertEvidenceRejected(ev, /missing field transaction_mutation|BLOCKED_PRIOR_DRY_RUN_TX/);
  });

  it("rejects missing cleanup.completed", () => {
    const ev = baseEvidence();
    delete (ev.cleanup as Record<string, unknown>).completed;
    assertEvidenceRejected(ev, /missing field completed|BLOCKED_PRIOR_DRY_RUN_CLEANUP/);
  });

  it("rejects missing cleanup.credential_cleared", () => {
    const ev = baseEvidence();
    delete (ev.cleanup as Record<string, unknown>).credential_cleared;
    assertEvidenceRejected(ev, /missing field credential_cleared|BLOCKED_PRIOR_DRY_RUN_CLEANUP/);
  });

  it("rejects missing url_in_evidence redaction boolean", () => {
    const ev = baseEvidence();
    delete (ev.credential_redaction_confirmation as Record<string, unknown>).url_in_evidence;
    assertEvidenceRejected(ev, /missing field url_in_evidence|BLOCKED_PRIOR_DRY_RUN_REDACTION/);
  });

  it("rejects wrong prior_history_count", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { prior_history_count: 185 } }),
      /BLOCKED_PRIOR_DRY_RUN_HISTORY/,
    );
  });

  it("rejects version_absent false", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { version_absent: false } }),
      /BLOCKED_PRIOR_DRY_RUN_VERSION/,
    );
  });

  it("rejects wrong project_ref", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { project_ref_provided: "not-the-project" } }),
      /BLOCKED_PRIOR_DRY_RUN_PROJECT/,
    );
  });

  it("rejects wrong migration_blob_oid", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { migration_blob_oid: "deadbeef".repeat(5) } }),
      /migration_blob_oid mismatch/,
    );
  });

  it("rejects wrong migration_sha256", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { migration_sha256: "ff".repeat(32) } }),
      /migration_sha256 mismatch/,
    );
  });

  it("rejects wrong migration_bytes", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { migration_bytes: 99999 } }),
      /migration_bytes mismatch/,
    );
  });

  it("rejects databaseConnectionAttempts 0", () => {
    assertEvidenceRejected(
      baseEvidence({ databaseConnectionAttempts: 0 }),
      /BLOCKED_PRIOR_DRY_RUN_DB_ATTEMPTS/,
    );
  });

  it("rejects databaseConnectionAttempts 2", () => {
    assertEvidenceRejected(
      baseEvidence({ databaseConnectionAttempts: 2 }),
      /BLOCKED_PRIOR_DRY_RUN_DB_ATTEMPTS/,
    );
  });

  it("rejects applicator sqlApplicationAttempts 1", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { sqlApplicationAttempts: 1 } }),
      /sqlApplicationAttempts must be 0/,
    );
  });

  it("rejects applicator advisory_lock_acquired true", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { advisory_lock_acquired: true } }),
      /BLOCKED_PRIOR_DRY_RUN_LOCK|advisory_lock_acquired must be false/,
    );
  });

  it("rejects incomplete cleanup", () => {
    assertEvidenceRejected(
      baseEvidence({ cleanup: { completed: false } }),
      /BLOCKED_PRIOR_DRY_RUN_CLEANUP/,
    );
  });

  it("rejects missing evidence_source on wrapper", () => {
    const ev = baseEvidence();
    delete (ev as Record<string, unknown>).evidence_source;
    assertEvidenceRejected(ev, /BLOCKED_PRIOR_DRY_RUN_SOURCE/);
  });

  it("rejects transaction_mutation true", () => {
    assertEvidenceRejected(
      baseEvidence({ applicator: { transaction_mutation: true } }),
      /BLOCKED_PRIOR_DRY_RUN_TX/,
    );
  });

  it("rejects wrapper/applicator freeze mismatch against auth pin", () => {
    assertEvidenceRejected(
      baseEvidence({
        freeze: FREEZE,
        applicator: { authorized_tooling_freeze: "b".repeat(40) },
      }),
      /BLOCKED_PRIOR_DRY_RUN_STALE_FREEZE/,
    );
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

  it("tip auth published prior-dry-run pins accept fixture and block missing/wrong evidence", () => {
    const { execFileSync } = require("node:child_process");
    // Prefer worktree auth (pin publication); tip HEAD is authoritative after freeze/source/tip seals.
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const publishedSha = String(auth.required_prior_dry_run_evidence_sha256 || "");
    expect(publishedSha).toBe(
      "b27e927b98efc8be40d74940cf1e547a968687dfcfccff4b7d0c85c416141209",
    );
    expect(auth.required_prior_dry_run_freeze).toBe(
      "7e4d4e4b4e57052ed2bdfdc201b12564edc46349",
    );
    expect(auth.required_prior_dry_run_evidence_tip).toBe(
      "d08134526141be86e8936f477da38b76a8ae4c26",
    );
    expect(auth.required_prior_dry_run_bundle_source).toBe(
      "823b466445599b6095e03a376f57ffc86fe0bf1d",
    );
    expect(auth.published_prior_dry_run?.rejected_evidence_sha256).toContain(
      "e5202a46c3a3055b6debb5ee7ce2865d34a369e120fa789eb4c6abff42b05096",
    );
    expect(
      auth.authorized_pr_head === "PENDING_AFTER_COMMIT" ||
        /^[0-9a-f]{40}$/i.test(String(auth.authorized_pr_head)),
    ).toBe(true);
    if (/^[0-9a-f]{40}$/i.test(String(auth.authorized_pr_head))) {
      expect(auth.bundle_source_commit).toMatch(/^[0-9a-f]{40}$/i);
      expect(auth.bundle_source_commit).not.toBe(auth.authorized_pr_head);
    }

    const fixture = path.join(
      ROOT,
      "tests/security/helpers/fixtures/frls-prior-production-dry-run-evidence.json",
    );
    const fixtureSha = createHash("sha256")
      .update(fs.readFileSync(fixture))
      .digest("hex");
    expect(fixtureSha).toBe(publishedSha);

    const acceptDir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-accept-"));
    const acceptAuth = path.join(acceptDir, "auth.json");
    fs.writeFileSync(acceptAuth, `${JSON.stringify(auth, null, 2)}\n`, "utf8");
    const accept = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      fixture,
      "-AuthJsonPath",
      acceptAuth,
    ]);
    expect(accept.status, accept.out).toBe(0);
    expect(accept.out).toMatch(/ACCEPTED:[0-9a-f]{64}/i);
    fs.rmSync(acceptDir, { recursive: true, force: true });

    // Superseded APPLICATOR_EVIDENCE_MISSING evidence must not satisfy the pin.
    const rejectDir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-rej-"));
    const bogus = path.join(rejectDir, "e5202a46.json");
    fs.writeFileSync(bogus, `${JSON.stringify(baseEvidence({}), null, 2)}\n`, "utf8");
    const rejectAuth = path.join(rejectDir, "auth.json");
    fs.writeFileSync(rejectAuth, `${JSON.stringify(auth, null, 2)}\n`, "utf8");
    const rejected = runHarness([
      "-Action",
      "assert-evidence",
      "-EvidencePath",
      bogus,
      "-AuthJsonPath",
      rejectAuth,
    ]);
    expect(rejected.status).toBe(1);
    expect(rejected.out).toMatch(/BLOCKED_PRIOR_DRY_RUN_SHA_MISMATCH/);
    fs.rmSync(rejectDir, { recursive: true, force: true });

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "frls-pdr-nullpins-"));
    const tipAuthJson = String(
      execFileSync(
        "git",
        [
          "show",
          "HEAD:docs/security/free-review-lead-session-apply/TOOLING_AUTHORIZATION.json",
        ],
        { encoding: "utf8" },
      ),
    );
    const tipAuthLive = JSON.parse(tipAuthJson);
    const tipReady =
      /^[0-9a-f]{40}$/i.test(String(tipAuthLive.authorized_pr_head)) &&
      /^[0-9a-f]{40}$/i.test(String(tipAuthLive.bundle_source_commit)) &&
      Boolean(tipAuthLive.required_prior_dry_run_evidence_sha256) &&
      !tipAuthJson.includes("PENDING_AFTER_COMMIT");
    if (tipReady) {
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
          String(tipAuthLive.authorized_pr_head),
          "-RepoRoot",
          ROOT,
          "-EvidenceOutDir",
          dir,
        ],
        { cwd: ROOT, encoding: "utf8", windowsHide: true, timeout: 120000 },
      );
      const summaryPath = path.join(dir, "PRODUCTION_APPLY_SUMMARY.json");
      expect(fs.existsSync(summaryPath)).toBe(true);
      const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
      expect(summary.result_code).toMatch(
        /^BLOCKED_PRIOR_DRY_RUN_(MISSING|EVIDENCE)$/,
      );
      expect(summary.result_code).not.toBe("APPLY_COMMITTED");
      expect(summary.sqlApplicationAttempts ?? 0).toBe(0);
      expect(r.status).not.toBe(0);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }, 120000);

  it("apply ceremony materializes gates from freeze, not PSScriptRoot", () => {
    const ceremony = fs.readFileSync(path.join(ROOT, APPLY_CEREMONY), "utf8");
    const gates = fs.readFileSync(path.join(ROOT, GATES), "utf8");
    expect(ceremony).toMatch(/Import-FrlsPriorDryRunGatesFromFreeze/);
    expect(ceremony).toMatch(/Materialize-GitBlob/);
    expect(ceremony).toMatch(/BLOCKED_GATE_MODULE/);
    expect(ceremony).toMatch(/Clear-FrlsMaterializedGates/);
    expect(ceremony).not.toMatch(
      /Join-Path \$PSScriptRoot "free-review-lead-session-prior-dry-run-gates\.ps1"/,
    );
    expect(ceremony).not.toMatch(
      /applicator verdict must be DRY_RUN_READY"/,
    );
    expect(gates).toContain(LONG);
    expect(gates).toContain(SHORT);
    expect(gates).toMatch(/Assert-FrlsPriorDryRunReadyCodes/);
  });
});

describe("FRLS prior-dry-run gate materialization authority", () => {
  it("Import-FrlsPriorDryRunGatesFromFreeze reads freeze cat-file, not worktree path", () => {
    const ceremony = fs.readFileSync(path.join(ROOT, APPLY_CEREMONY), "utf8");
    expect(ceremony).toMatch(/function Import-FrlsPriorDryRunGatesFromFreeze/);
    expect(ceremony).toMatch(/Materialize-GitBlob -Rel \$rel -Dest \$dest/);
    expect(ceremony).toMatch(/cat-file blob \$\{Freeze\}:/);
    expect(ceremony).not.toMatch(
      /Join-Path \$PSScriptRoot "free-review-lead-session-prior-dry-run-gates\.ps1"/,
    );
  });

  it("corrupted worktree gates file does not affect freeze cat-file authority", () => {
    const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    const seal = auth.prior_dry_run_gates;
    const { execFileSync } = require("node:child_process");
    const freeze = String(auth.authorized_pr_head || "");
    const rel = seal.path;
    const gatesPath = path.join(ROOT, rel);
    const backup = fs.readFileSync(gatesPath);
    const authority =
      /^[0-9a-f]{40}$/i.test(freeze) ? `${freeze}:${rel}` : `HEAD:${rel}`;
    const before = execFileSync("git", ["cat-file", "blob", authority], {
      encoding: "buffer",
    });
    fs.writeFileSync(
      gatesPath,
      "# CORRUPTED WORKTREE GATES\nthrow 'CORRUPTED'\n",
      "utf8",
    );
    try {
      const blob = execFileSync("git", ["cat-file", "blob", authority], {
        encoding: "buffer",
      });
      expect(Buffer.compare(blob, before)).toBe(0);
      expect(blob.toString("utf8")).not.toMatch(/CORRUPTED WORKTREE/);
      if (/^[0-9a-f]{40}$/i.test(freeze)) {
        expect(createHash("sha256").update(blob).digest("hex")).toBe(seal.sha256);
        expect(blob.length).toBe(seal.bytes);
      }
    } finally {
      fs.writeFileSync(gatesPath, backup);
    }
  });

  it("documents gate module OID/SHA/bytes mismatch codes in apply ceremony", () => {
    const ceremony = fs.readFileSync(path.join(ROOT, APPLY_CEREMONY), "utf8");
    for (const code of [
      "BLOCKED_GATE_MODULE_OID",
      "BLOCKED_GATE_MODULE_SHA",
      "BLOCKED_GATE_MODULE_BYTES",
    ]) {
      expect(ceremony, code).toContain(code);
    }
  });
});
