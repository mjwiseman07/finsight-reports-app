/**
 * Corrective dry-run ceremony cleanup receipt — fail-closed pin_ready protocol.
 * Synthetic / offline only — no production contact.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  PROTOCOL_ID as EVIDENCE_PROTOCOL_ID,
  encodeEvidenceFrame,
  sealCorrectiveDryRunEvidence,
  validateCorrectiveDryRunEvidenceSchema,
  assertCanonicalJsonBytes,
  retainCanonicalEvidenceFile,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-evidence.js";
import {
  RECEIPT_PROTOCOL_ID,
  SCHEMA_VERSION,
  MANDATORY_CLEANUP_BOOLS,
  sealCeremonyReceipt,
  validateCeremonyReceiptSchema,
  materializeCanonicalReceiptBytes,
  writeCanonicalReceiptFile,
  computePinReady,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js";
import {
  DATABASE_URL_ENV,
  MIGRATIONS,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
  STANDALONE_BUNDLE_BYTES,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js";

const ROOT = process.cwd();
const AUTH = JSON.parse(
  readFileSync(
    join(ROOT, "docs/security/ra-pro-accounting-automation-corrective-apply/TOOLING_AUTHORIZATION.json"),
    "utf8",
  ),
);
const REJECTED = join(
  ROOT,
  "tests/security/helpers/fixtures/ra-pro-accounting-automation-corrective-dry-run-evidence.rejected-crlf.json",
);
const RECEIPT_JS = join(
  ROOT,
  "scripts/security/ra-pro-accounting-automation-corrective-ceremony-receipt.js",
);
const CEREMONY_REL =
  "scripts/security/operator-ra-pro-accounting-automation-corrective-production-dryrun-ceremony.ps1";

function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

function gitEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const n = Number(env.GIT_CONFIG_COUNT || 0);
  env.GIT_CONFIG_COUNT = String(n + 1);
  env[`GIT_CONFIG_KEY_${n}`] = "safe.directory";
  env[`GIT_CONFIG_VALUE_${n}`] = ROOT.replace(/\\/g, "/");
  return env;
}

function git(args: string[]): Buffer {
  const r = spawnSync("git", args, { cwd: ROOT, env: gitEnv(), encoding: "buffer" });
  if (r.status !== 0) {
    throw new Error(String(r.stderr || r.stdout || `git ${args.join(" ")} failed`));
  }
  return r.stdout as Buffer;
}

function gitText(args: string[]): string {
  return git(args).toString("utf8").trim();
}

function readyPartial() {
  return {
    verdict: "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
    result_code: "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION",
    artifact_commit: AUTH.artifact_commit,
    advisory_lock: AUTH.advisory_lock,
    history_contract: AUTH.history_contract,
    feature_flag_touched: false,
    databaseConnectionAttempts: 1,
    sqlApplicationAttempts: 0,
    migration_sql_attempts: 0,
    productionContact: true,
    advisory_lock_acquired: true,
    prior_history_count: 190,
    evidence_gates: { phase: "evidence_gates", mode: "dry-run" },
    uri_diagnostics: {
      ok: true,
      host_class: "session_pooler",
      matches_expected_project_ref: true,
      expected_project_ref: "jzmdgwwiestcmmeuhhkr",
    },
    schema_probes: {
      history_count: 190,
      corrective_absent: true,
      originals_present_once: true,
      excess_service_role_dml: true,
      automation_enabled: false,
    },
    bundle_authority: {
      path: STANDALONE_BUNDLE_PATH,
      oid: STANDALONE_BUNDLE_OID,
      sha256: STANDALONE_BUNDLE_SHA256,
      bytes: STANDALONE_BUNDLE_BYTES,
      commit: "18fa394b477ca728c2c53c3f504f421087ac47eb",
    },
    dry_run_authorization: {
      publication_commit: "b111111111111111111111111111111111111111",
      authorization_publication_blob_oid: "b222222222222222222222222222222222222222",
      authorized_executable_commit: "18fa394b477ca728c2c53c3f504f421087ac47eb",
      attempt_id: "corr-dryrun-18fa394b477c-cccccccccccccccccccccccccccccccc",
      bundle_oid: STANDALONE_BUNDLE_OID,
      executable_authority_publication_commit: "c111111111111111111111111111111111111111",
      executable_authority_publication_blob_oid: "c222222222222222222222222222222222222222",
    },
    source_authority: [
      {
        version: MIGRATIONS[0].version,
        path: MIGRATIONS[0].path,
        oid: MIGRATIONS[0].oid,
        sha256: MIGRATIONS[0].sha256,
        bytes: MIGRATIONS[0].bytes,
        name: MIGRATIONS[0].name,
      },
    ],
  };
}

function sealEvidenceFile(dir: string) {
  const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
  expect(Object.prototype.hasOwnProperty.call(sealed, "cleanup")).toBe(false);
  const encoded = encodeEvidenceFrame(sealed);
  const dest = join(dir, "CORRECTIVE_PRODUCTION_DRY_RUN_EVIDENCE.json");
  const retained = retainCanonicalEvidenceFile(encoded.frameBytes, dest);
  expect(retained.ok).toBe(true);
  return {
    sealed,
    path: dest,
    sha256: retained.sha256 as string,
    bytes: retained.bytes as number,
  };
}

function tipHex(): string {
  return gitText(["rev-parse", "HEAD"]).toLowerCase();
}

function allCleanupTrue(overrides: Record<string, unknown> = {}) {
  const tip = tipHex();
  const base: Record<string, unknown> = {
    frame_valid: true,
    sealed_evidence_sha256: "a".repeat(64),
    sealed_evidence_bytes: 100,
    execution_tip: tip,
    pin_tip: tip,
    dry_run_authorization_publication_commit: "b111111111111111111111111111111111111111",
    dry_run_authorization_publication_blob_oid: "b222222222222222222222222222222222222222",
    executable_authority_publication_commit: "c111111111111111111111111111111111111111",
    executable_authority_publication_blob_oid: "c222222222222222222222222222222222222222",
    dry_run_attempt_id: "corr-dryrun-18fa394b477c-cccccccccccccccccccccccccccccccc",
    ceremony_path: CEREMONY_REL,
    ceremony_oid: "b".repeat(40),
    ceremony_sha256: "c".repeat(64),
    ceremony_bytes: 50,
    bundle_path: STANDALONE_BUNDLE_PATH,
    bundle_oid: STANDALONE_BUNDLE_OID,
    bundle_sha256: STANDALONE_BUNDLE_SHA256,
    bundle_bytes: STANDALONE_BUNDLE_BYTES,
    node_exit: 0,
    cleanup_error_codes: [],
    cleanup_completed: true,
  };
  for (const k of MANDATORY_CLEANUP_BOOLS) base[k] = true;
  return { ...base, ...overrides };
}

describe("corrective ceremony receipt", () => {
  it("no predictive cleanup in sealed frame; producer_cleanup optional measured only", () => {
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    expect(Object.prototype.hasOwnProperty.call(sealed, "cleanup")).toBe(false);
    expect(validateCorrectiveDryRunEvidenceSchema(sealed).ok).toBe(true);
    expect(
      validateCorrectiveDryRunEvidenceSchema({
        ...sealed,
        cleanup: { note: "ceremony fills cleanup" },
      }).ok,
    ).toBe(false);

    const measured = sealCorrectiveDryRunEvidence(
      { ...readyPartial(), producer_cleanup: { measured_before_emission: true } },
      AUTH,
    );
    expect(measured.producer_cleanup).toEqual({ measured_before_emission: true });
    const invented = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    expect(invented.producer_cleanup).toBeUndefined();
  });

  it("successful receipt binds correct frame and is pin_ready", () => {
    const dir = mkdtempSync(join(tmpdir(), "corr-rcpt-ok-"));
    const ev = sealEvidenceFile(dir);
    const tip = tipHex();
    const measurements = allCleanupTrue({
      sealed_evidence_sha256: ev.sha256,
      sealed_evidence_bytes: ev.bytes,
      execution_tip: tip,
      pin_tip: tip,
    });
    const sealed = sealCeremonyReceipt(measurements);
    expect(sealed.protocol).toBe(RECEIPT_PROTOCOL_ID);
    expect(sealed.schema_version).toBe(SCHEMA_VERSION);
    expect(sealed.sealed_evidence_protocol).toBe(EVIDENCE_PROTOCOL_ID);
    expect(sealed.sealed_evidence_sha256).toBe(ev.sha256);
    expect(sealed.sealed_evidence_bytes).toBe(ev.bytes);
    expect(sealed.pin_ready).toBe(true);
    expect(sealed.cleanup_completed).toBe(true);
    expect(sealed.apply_authorized).toBe(false);
    expect(sealed.production_apply_authorization_status).toBe("UNPUBLISHED");
    expect(sealed.database_url_env).toBeUndefined();

    const dest = join(dir, "CORRECTIVE_PRODUCTION_DRY_RUN_CEREMONY_RECEIPT.json");
    const written = writeCanonicalReceiptFile(dest, sealed);
    expect(written.ok).toBe(true);
    expect(written.pin_ready).toBe(true);
    const onDisk = readFileSync(dest);
    expect(onDisk.includes(0x0d)).toBe(false);
    expect(sha256(onDisk)).toBe(written.sha256);

    // CLI path
    const measPath = join(dir, "measurements.json");
    writeFileSync(measPath, `${JSON.stringify(measurements)}\n`);
    const cli = spawnSync(
      process.execPath,
      [RECEIPT_JS, "write", measPath, ev.path, join(dir, "receipt-cli.json")],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(cli.status).toBe(0);
    const line = JSON.parse(cli.stdout.trim().split("\n").pop()!);
    expect(line.ok).toBe(true);
    expect(line.pin_ready).toBe(true);
  });

  function expectPinReadyFalse(overrides: Record<string, unknown>) {
    const m = allCleanupTrue(overrides);
    const sealed = sealCeremonyReceipt(m);
    expect(sealed.pin_ready).toBe(false);
    expect(computePinReady(m as never, true)).toBe(false);
  }

  it("forced failures yield pin_ready false", () => {
    expectPinReadyFalse({ raw_stdout_removed: false });
    expectPinReadyFalse({ temporary_bundle_removed: false });
    expectPinReadyFalse({ decode_sidecar_removed: false });
    expectPinReadyFalse({ credential_cleared: false });
    expectPinReadyFalse({ securestring_zero_freed: false });
    expectPinReadyFalse({ child_terminated: false });
    expectPinReadyFalse({ orphan_check_passed: false });
    expectPinReadyFalse({ final_evidence_present: false });
    expectPinReadyFalse({ final_evidence_sha256_unchanged: false });
    expectPinReadyFalse({ final_evidence_bytes_unchanged: false });
    expectPinReadyFalse({ cleanup_error_codes: ["RAW_STDOUT_REMOVE_FAILED"] });
    expectPinReadyFalse({ frame_valid: false });
    expectPinReadyFalse({ cleanup_completed: false, raw_stdout_removed: false });
  });

  it("evidence changed / wrong frame binding / receipt write fail / missing receipt", () => {
    const dir = mkdtempSync(join(tmpdir(), "corr-rcpt-fail-"));
    const ev = sealEvidenceFile(dir);
    const tip = tipHex();

    // Wrong binding
    const badBind = allCleanupTrue({
      sealed_evidence_sha256: "d".repeat(64),
      sealed_evidence_bytes: ev.bytes,
      execution_tip: tip,
      pin_tip: tip,
    });
    const measBad = join(dir, "meas-bad.json");
    writeFileSync(measBad, `${JSON.stringify(badBind)}\n`);
    const cliBad = spawnSync(
      process.execPath,
      [RECEIPT_JS, "write", measBad, ev.path, join(dir, "r-bad.json")],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(cliBad.status).not.toBe(0);
    expect(JSON.parse(cliBad.stdout.trim()).code).toBe("CORRECTIVE_RECEIPT_EVIDENCE_BINDING_MISMATCH");

    // Evidence changed after seal inputs: mutate file then CLI
    const mutated = Buffer.from(`${JSON.stringify({ tampered: true })}\n`, "utf8");
    writeFileSync(ev.path, mutated);
    const goodMeas = allCleanupTrue({
      sealed_evidence_sha256: ev.sha256,
      sealed_evidence_bytes: ev.bytes,
      execution_tip: tip,
      pin_tip: tip,
    });
    const measPath = join(dir, "meas.json");
    writeFileSync(measPath, `${JSON.stringify(goodMeas)}\n`);
    const cliMut = spawnSync(
      process.execPath,
      [RECEIPT_JS, "write", measPath, ev.path, join(dir, "r-mut.json")],
      { cwd: ROOT, encoding: "utf8" },
    );
    expect(cliMut.status).not.toBe(0);

    // Receipt write fail: invalid destination path
    const restored = sealEvidenceFile(dir);
    const sealed = sealCeremonyReceipt(
      allCleanupTrue({
        sealed_evidence_sha256: restored.sha256,
        sealed_evidence_bytes: restored.bytes,
        execution_tip: tip,
        pin_tip: tip,
      }),
    );
    const invalidDest =
      process.platform === "win32"
        ? join(dir, "bad<>name", "receipt.json")
        : "/proc/1/cwd/forbidden-receipt.json";
    const writeFail = writeCanonicalReceiptFile(invalidDest, sealed);
    expect(writeFail.ok).toBe(false);
    expect(writeFail.pin_ready).toBe(false);
    expect(writeFail.code).toBe("CORRECTIVE_RECEIPT_WRITE_FAILED");

    // Missing receipt => frame alone is not pin-ready
    const frameOnlyDir = mkdtempSync(join(tmpdir(), "corr-frame-only-"));
    const frameOnly = sealEvidenceFile(frameOnlyDir);
    expect(existsSync(join(frameOnlyDir, "CORRECTIVE_PRODUCTION_DRY_RUN_CEREMONY_RECEIPT.json"))).toBe(
      false,
    );
    expect(validateCeremonyReceiptSchema(null as never).ok).toBe(false);
    expect(frameOnly.sha256).toBeTruthy();
    // Claiming pin_ready without receipt validation fails
    expect(
      validateCeremonyReceiptSchema({
        protocol: RECEIPT_PROTOCOL_ID,
        pin_ready: true,
      } as never).ok,
    ).toBe(false);
  });

  it("hard-coded green / force_pin_ready rejected — always recompute", () => {
    const m = allCleanupTrue({
      raw_stdout_removed: false,
      force_pin_ready: true,
      pin_ready: true,
    });
    const sealed = sealCeremonyReceipt(m);
    expect(sealed.pin_ready).toBe(false);
    expect(sealed.cleanup_completed).toBe(false);
    // Inject pin_ready true with incomplete cleanup into schema
    const forged = { ...sealed, pin_ready: true, cleanup_completed: true };
    expect(validateCeremonyReceiptSchema(forged).ok).toBe(false);
  });

  it("cleanup fault array forces pin_ready false even if bools look green", () => {
    const sealed = sealCeremonyReceipt(
      allCleanupTrue({ cleanup_error_codes: ["ORPHAN_CHILD_PID_REMAINS"] }),
    );
    expect(sealed.pin_ready).toBe(false);
    expect(sealed.cleanup_completed).toBe(false);
  });

  it("committed-blob seal reporting vs CRLF worktree copy", () => {
    const tip = tipHex();
    const blob = git(["cat-file", "blob", `${tip}:${CEREMONY_REL}`]);
    const oid = gitText(["rev-parse", `${tip}:${CEREMONY_REL}`]).toLowerCase();
    const tipSha = sha256(blob);
    expect(blob.includes(0x0d)).toBe(false);

    const dir = mkdtempSync(join(tmpdir(), "corr-crlf-cer-"));
    const crlfCopy = join(dir, "ceremony-crlf.ps1");
    // Create CRLF worktree-style copy (not substituting tip authority)
    const lfText = blob.toString("utf8");
    const crlf = Buffer.from(lfText.replace(/\n/g, "\r\n"), "utf8");
    writeFileSync(crlfCopy, crlf);
    expect(crlf.includes(0x0d)).toBe(true);
    expect(crlf.length).not.toBe(blob.length);
    expect(sha256(crlf)).not.toBe(tipSha);

    // Authority uses tip blob only
    expect(oid).toMatch(/^[0-9a-f]{40}$/);
    expect(tipSha).toMatch(/^[0-9a-f]{64}$/);
    // CR count mismatch would fail ceremony helper — simulate the check
    const tipCr = [...blob].filter((b) => b === 0x0d).length;
    const wtCr = [...crlf].filter((b) => b === 0x0d).length;
    expect(tipCr).not.toBe(wtCr);
  });

  it("rejected CRLF artifact still rejected; frame alone without receipt is not pin-ready", () => {
    expect(existsSync(REJECTED)).toBe(true);
    const buf = readFileSync(REJECTED);
    expect(sha256(buf)).toBe("bec0a81f626d5d93a6c3ece2bc032909ca1d26cd832f63c95e3e52b72a65458d");
    expect(buf.length).toBe(4701);
    expect(buf.includes(0x0d)).toBe(true);
    expect(() => assertCanonicalJsonBytes(buf)).toThrow(/CRLF/);

    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    expect(Object.prototype.hasOwnProperty.call(sealed, "cleanup")).toBe(false);
    // Frame schema ok does not imply pin_ready without receipt
    expect(validateCorrectiveDryRunEvidenceSchema(sealed).ok).toBe(true);
    expect(validateCeremonyReceiptSchema(undefined as never).ok).toBe(false);
  });

  it("channel name preserved in evidence; receipt has no secrets", () => {
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    expect(sealed.database_url_env).toBe(DATABASE_URL_ENV);
    const receipt = sealCeremonyReceipt(allCleanupTrue());
    const text = JSON.stringify(receipt);
    expect(text).not.toMatch(/postgres:\/\/[^:]+:[^@]+@/i);
    expect(text).not.toMatch(/sk_live_/);
    // Field name securestring_zero_freed is intentional; reject secret-bearing forms only.
    expect(text).not.toMatch(/AsSecureString|System\.Security\.SecureString|SecureStringToBSTR/i);
    const mat = materializeCanonicalReceiptBytes(receipt);
    expect(mat.bytes.includes(0x0d)).toBe(false);
  });
});
