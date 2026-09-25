/**
 * Sealed corrective dry-run evidence frame hygiene + retention.
 * Synthetic / offline only — no production contact.
 */
import { createHash } from "node:crypto";
import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PROTOCOL_ID,
  SCHEMA_VERSION,
  encodeEvidenceFrame,
  extractEvidenceFrame,
  materializeCanonicalEvidenceBytes,
  retainCanonicalEvidenceFile,
  sealCorrectiveDryRunEvidence,
  validateCorrectiveDryRunEvidenceSchema,
  assertCanonicalJsonBytes,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-evidence.js";
import {
  DATABASE_URL_ENV,
  MIGRATIONS,
  ORIGINAL_COMMITTED_MIGRATIONS,
  STANDALONE_BUNDLE_OID,
  STANDALONE_BUNDLE_PATH,
  STANDALONE_BUNDLE_SHA256,
  STANDALONE_BUNDLE_BYTES,
} from "../../scripts/security/ra-pro-accounting-automation-corrective-apply-constants.js";
import { OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256 } from "../../scripts/security/ra-pro-accounting-automation-tls-ca.js";

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

function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
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

describe("corrective dry-run evidence frame", () => {
  it("emits LF canonical bytes equal to retained bytes", () => {
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    const encoded = encodeEvidenceFrame(sealed);
    expect(encoded.frameBytes.includes(0x0d)).toBe(false);
    expect(encoded.payloadBytes[encoded.payloadBytes.length - 1]).toBe(0x0a);
    assertCanonicalJsonBytes(encoded.payloadBytes);

    const dir = mkdtempSync(join(tmpdir(), "corr-ev-"));
    const dest = join(dir, "CORRECTIVE_PRODUCTION_DRY_RUN_EVIDENCE.json");
    const retained = retainCanonicalEvidenceFile(encoded.frameBytes, dest);
    expect(retained.ok).toBe(true);
    expect(retained.sha256).toBe(encoded.sha256);
    expect(retained.bytes).toBe(encoded.payloadBytes.length);
    expect(retained.before_sha256).toBe(retained.after_sha256);
    const onDisk = readFileSync(dest);
    expect(sha256(onDisk)).toBe(encoded.sha256);
    expect(Buffer.compare(onDisk, encoded.payloadBytes)).toBe(0);
    expect(sealed.database_url_env).toBe(DATABASE_URL_ENV);
    expect(sealed.embedded_ca.der_sha256).toBe(OFFICIAL_SUPABASE_PROD_CA_2021_DER_SHA256);
    expect(sealed.original_migrations_verify_only).toHaveLength(2);
    expect(sealed.original_migrations_verify_only[0].oid).toBe(ORIGINAL_COMMITTED_MIGRATIONS[0].oid);
  });

  it("rejects CRLF / BOM / missing / double trailing LF", () => {
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    const { bytes: payloadBytes } = materializeCanonicalEvidenceBytes(sealed);
    expect(payloadBytes).toBeTruthy();
    expect(() => assertCanonicalJsonBytes(Buffer.from(payloadBytes.toString("utf8").replace(/\n/g, "\r\n"), "utf8"))).toThrow(
      /CRLF/,
    );
    const bom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), payloadBytes]);
    expect(() => assertCanonicalJsonBytes(bom)).toThrow(/BOM|CORRECTIVE_EVIDENCE_BOM/);
    const noLf = payloadBytes.subarray(0, payloadBytes.length - 1);
    expect(() => assertCanonicalJsonBytes(noLf)).toThrow(/TRAILING_LF/);
    const double = Buffer.concat([payloadBytes, Buffer.from("\n")]);
    expect(() => assertCanonicalJsonBytes(double)).toThrow(/DOUBLE_TRAILING_LF/);
  });

  it("rejects extra stdout and multiple frames", () => {
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    const { frameText } = encodeEvidenceFrame(sealed);
    expect(extractEvidenceFrame(`noise\n${frameText}`).code).toBe("CORRECTIVE_EVIDENCE_STDOUT_POLLUTED");
    expect(extractEvidenceFrame(`${frameText}${frameText}`).code).toBe("CORRECTIVE_EVIDENCE_MULTIPLE");
  });

  it("rejects wrong bundle / migration / triad / CA seals", () => {
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    expect(
      validateCorrectiveDryRunEvidenceSchema({
        ...sealed,
        bundle: { ...sealed.bundle, oid: "a".repeat(40) },
      }).ok,
    ).toBe(false);
    expect(
      validateCorrectiveDryRunEvidenceSchema({
        ...sealed,
        corrective_migrations: [{ ...sealed.corrective_migrations[0], version: "nope" }],
      }).ok,
    ).toBe(false);
    expect(
      validateCorrectiveDryRunEvidenceSchema({
        ...sealed,
        original_migrations_verify_only: [
          { ...sealed.original_migrations_verify_only[0], oid: "b".repeat(40) },
          sealed.original_migrations_verify_only[1],
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateCorrectiveDryRunEvidenceSchema({
        ...sealed,
        collection_authority_triad: {
          authorized_executable_commit: "dead",
          authorization_publication_commit:
            sealed.collection_authority_triad.authorization_publication_commit,
          authorization_publication_blob_oid:
            sealed.collection_authority_triad.authorization_publication_blob_oid,
        },
      }).ok,
    ).toBe(false);
    expect(
      validateCorrectiveDryRunEvidenceSchema({
        ...sealed,
        embedded_ca: { ...sealed.embedded_ca, der_sha256: "d".repeat(64) },
      }).ok,
    ).toBe(false);
  });

  it("rejects hash/byte mismatch on retain", () => {
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    const encoded = encodeEvidenceFrame(sealed);
    const dir = mkdtempSync(join(tmpdir(), "corr-ev-bad-"));
    const dest = join(dir, "out.json");
    // Corrupt after write by intercepting: write wrong then compare via retain on polluted stdout
    const polluted = Buffer.concat([encoded.frameBytes, Buffer.from("x")]);
    const r = retainCanonicalEvidenceFile(polluted, dest);
    expect(r.ok).toBe(false);
    expect(existsSync(dest)).toBe(false);
  });

  it("rejected CRLF prior artifact fails new hygiene checks", () => {
    expect(existsSync(REJECTED)).toBe(true);
    const buf = readFileSync(REJECTED);
    expect(buf.includes(0x0d)).toBe(true);
    expect(sha256(buf)).toBe("bec0a81f626d5d93a6c3ece2bc032909ca1d26cd832f63c95e3e52b72a65458d");
    expect(buf.length).toBe(4701);
    expect(() => assertCanonicalJsonBytes(buf)).toThrow(/CRLF/);
    const asFrame = `${PROTOCOL_ID}:${buf.toString("base64")}\n`;
    expect(extractEvidenceFrame(asFrame).ok).toBe(false);
    const parsed = JSON.parse(buf.toString("utf8"));
    expect(validateCorrectiveDryRunEvidenceSchema(parsed).ok).toBe(false);
  });

  it("channel name preserved; secrets absent; schema_version present", () => {
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    expect(sealed.protocol).toBe(PROTOCOL_ID);
    expect(sealed.schema_version).toBe(SCHEMA_VERSION);
    expect(sealed.database_url_env).toBe(DATABASE_URL_ENV);
    const text = JSON.stringify(sealed);
    expect(text).not.toMatch(/postgres:\/\/[^:]+:[^@]+@/i);
    expect(text).not.toMatch(/sk_live_/);
    expect(text).not.toMatch(/SecureString/i);
  });

  it("documents that PowerShell must not reserialize the sealed frame", () => {
    // Ceremony contract: retainCanonicalEvidenceFile writes payload bytes only.
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    const encoded = encodeEvidenceFrame(sealed);
    const dir = mkdtempSync(join(tmpdir(), "corr-ev-ps-"));
    const dest = join(dir, "frame.json");
    retainCanonicalEvidenceFile(encoded.frameBytes, dest);
    const a = readFileSync(dest);
    // Simulate forbidden ConvertTo-Json rewrite (CRLF pretty JSON) — must not match
    const psStyle = Buffer.from(JSON.stringify(JSON.parse(a.toString("utf8")), null, 4).replace(/\n/g, "\r\n") + "\n", "utf8");
    expect(Buffer.compare(a, psStyle)).not.toBe(0);
    expect(psStyle.includes(0x0d)).toBe(true);
  });

  it("sealed frame has no cleanup key; schema rejects predictive cleanup", () => {
    const sealed = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    expect(Object.prototype.hasOwnProperty.call(sealed, "cleanup")).toBe(false);
    expect(JSON.stringify(sealed)).not.toMatch(/ceremony fills cleanup/);
    expect(
      validateCorrectiveDryRunEvidenceSchema({
        ...sealed,
        cleanup: { completed: false, note: "ceremony fills cleanup after credential/material disposal" },
      }).ok,
    ).toBe(false);
    expect(
      validateCorrectiveDryRunEvidenceSchema({
        ...sealed,
        cleanup: { completed: false, note: "ceremony fills cleanup after credential/material disposal" },
      }).code,
    ).toBe("CORRECTIVE_EVIDENCE_CLEANUP_FORBIDDEN");
    expect(
      validateCorrectiveDryRunEvidenceSchema({
        ...sealed,
        stray_note: "ceremony fills cleanup after disposal",
      }).code,
    ).toBe("CORRECTIVE_EVIDENCE_PREDICTIVE_CLEANUP");
  });

  it("includes producer_cleanup only when measured object provided", () => {
    const without = sealCorrectiveDryRunEvidence(readyPartial(), AUTH);
    expect(Object.prototype.hasOwnProperty.call(without, "producer_cleanup")).toBe(false);
    const withPc = sealCorrectiveDryRunEvidence(
      {
        ...readyPartial(),
        producer_cleanup: { measured_before_emission: true, stdout_flushed: true },
      },
      AUTH,
    );
    expect(withPc.producer_cleanup).toEqual({
      measured_before_emission: true,
      stdout_flushed: true,
    });
    expect(validateCorrectiveDryRunEvidenceSchema(withPc).ok).toBe(true);
  });
});
