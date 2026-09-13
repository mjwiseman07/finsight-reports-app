import { describe, expect, it } from "vitest";
import {
  PROTOCOL_PREFIX,
  SCHEMA_VERSION,
  encodeEvidenceFrame,
  extractEvidenceFrame,
  legacyHeuristicExtractJson,
  normalizeApplicatorEvidence,
  classifyDatabaseUrl,
  buildWrapperFallback,
  validateEvidenceSchema,
} from "../../scripts/security/containment-evidence-protocol.js";

const SYNTH_DSN =
  "postgresql://postgres.jzmdgwwiestcmmeuhhkr:SYNTH_PASSWORD_NEVER_LEAK@aws-1-us-east-2.pooler.supabase.com:5432/postgres?sslmode=require";
const SYNTH_PASSWORD = "SYNTH_PASSWORD_NEVER_LEAK";

function readyEvidence(over: Record<string, unknown> = {}) {
  return normalizeApplicatorEvidence({
    result_code: "DRY_RUN_READY",
    reason_code: "DRY_RUN_READY",
    phase: "dry_run_complete",
    evidence_source: "sealed_applicator",
    mode: "dry-run",
    read_only: true,
    databaseConnectionAttempts: 1,
    sqlApplicationAttempts: 0,
    advisory_lock_acquired: false,
    ...over,
  });
}

function blockedEvidence(over: Record<string, unknown> = {}) {
  return normalizeApplicatorEvidence({
    result_code: "DRY_RUN_BLOCKED",
    reason_code: "MALFORMED_DATABASE_URL",
    phase: "uri_validate",
    evidence_source: "sealed_applicator",
    mode: "dry-run",
    read_only: true,
    databaseConnectionAttempts: 0,
    sqlApplicationAttempts: 0,
    advisory_lock_acquired: false,
    uri_diagnostics: classifyDatabaseUrl("not-a-url", "jzmdgwwiestcmmeuhhkr"),
    ...over,
  });
}

function b64url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

describe("containment evidence protocol V1", () => {
  it("encodes/decodes ready evidence", () => {
    const frame = encodeEvidenceFrame(readyEvidence());
    expect(frame.startsWith(PROTOCOL_PREFIX)).toBe(true);
    const r = extractEvidenceFrame(`${frame}\n`);
    expect(r.ok).toBe(true);
    expect(r.evidence.result_code).toBe("DRY_RUN_READY");
    expect(r.evidence.evidence_source).toBe("sealed_applicator");
    expect(r.evidence.protocol_version).toBe(SCHEMA_VERSION);
  });

  it("encodes/decodes blocked evidence with uri diagnostics (CRLF)", () => {
    const frame = encodeEvidenceFrame(blockedEvidence());
    const r = extractEvidenceFrame(`\r\n${frame}\r\n`);
    expect(r.ok).toBe(true);
    expect(r.evidence.result_code).toBe("DRY_RUN_BLOCKED");
    expect(r.evidence.uri_diagnostics.host_class).toBe("malformed_uri");
  });

  it("missing frame", () => {
    expect(extractEvidenceFrame("progress only\n").code).toBe("APPLICATOR_EVIDENCE_MISSING");
  });

  it("duplicate frames", () => {
    const frame = encodeEvidenceFrame(readyEvidence());
    expect(extractEvidenceFrame(`${frame}\n${frame}\n`).code).toBe(
      "APPLICATOR_EVIDENCE_MULTIPLE",
    );
  });

  it("malformed base64url", () => {
    expect(extractEvidenceFrame(`${PROTOCOL_PREFIX}!!!not-base64!!!\n`).code).toBe(
      "APPLICATOR_EVIDENCE_BASE64URL_INVALID",
    );
  });

  it("malformed JSON", () => {
    const r = extractEvidenceFrame(`${PROTOCOL_PREFIX}${b64url("{not-json")}\n`);
    expect(r.ok).toBe(false);
    expect([
      "APPLICATOR_EVIDENCE_JSON_INVALID",
      "APPLICATOR_EVIDENCE_INCOMPLETE_FRAME",
    ]).toContain(r.code);
  });

  it("wrong protocol version marker", () => {
    expect(extractEvidenceFrame("CONTAINMENT_EVIDENCE_V0:abc\n").ok).toBe(false);
  });

  it("truncated frame", () => {
    const frame = encodeEvidenceFrame(readyEvidence());
    expect(extractEvidenceFrame(frame.slice(0, PROTOCOL_PREFIX.length + 8)).ok).toBe(false);
  });

  it("schema invalid missing fields", () => {
    const r = extractEvidenceFrame(
      `${PROTOCOL_PREFIX}${b64url(JSON.stringify({ protocol_version: 1, schema_version: 1, result_code: "X" }))}\n`,
    );
    expect(r.code).toBe("APPLICATOR_EVIDENCE_SCHEMA_INVALID");
  });

  it("wrong field types", () => {
    const raw = { ...readyEvidence(), databaseConnectionAttempts: "zero" };
    const r = extractEvidenceFrame(`${PROTOCOL_PREFIX}${b64url(JSON.stringify(raw))}\n`);
    expect(r.code).toBe("APPLICATOR_EVIDENCE_SCHEMA_INVALID");
  });

  it("oversized payload", () => {
    expect(() => encodeEvidenceFrame(readyEvidence({ error: "x".repeat(300 * 1024) }))).toThrow(
      /PAYLOAD_TOO_LARGE/,
    );
  });

  it("stdout pollution", () => {
    const frame = encodeEvidenceFrame(readyEvidence());
    expect(extractEvidenceFrame(`hello\n${frame}\n`).code).toBe(
      "APPLICATOR_EVIDENCE_STDOUT_POLLUTED",
    );
  });

  it("unicode-safe payload", () => {
    const r = extractEvidenceFrame(
      encodeEvidenceFrame(readyEvidence({ error: "resume OK 日本語" })),
    );
    expect(r.ok).toBe(true);
    expect(r.evidence.error).toContain("日本語");
  });

  it("never leaks synthetic DSN/password", () => {
    const r = extractEvidenceFrame(
      encodeEvidenceFrame(
        blockedEvidence({ error: `failed ${SYNTH_DSN} password=${SYNTH_PASSWORD}` }),
      ),
    );
    const blob = JSON.stringify(r.evidence);
    expect(blob).not.toContain(SYNTH_PASSWORD);
    expect(blob).not.toMatch(/aws-1-us-east-2/);
  });

  it("classifies session pooler without secrets", () => {
    const d = classifyDatabaseUrl(SYNTH_DSN, "jzmdgwwiestcmmeuhhkr");
    expect(d.host_class).toBe("session_pooler");
    expect(d.ssl_requirement_match).toBe(true);
    expect(JSON.stringify(d)).not.toContain(SYNTH_PASSWORD);
  });

  it("wrapper fallback source", () => {
    const fb = buildWrapperFallback({
      reason_code: "APPLICATOR_EVIDENCE_MISSING",
      phase: "evidence_extract",
    });
    expect(fb.evidence_source).toBe("native_wrapper_fallback");
  });

  it("reproduces legacy parse failure then V1 success", () => {
    const frame = encodeEvidenceFrame(readyEvidence());
    expect(legacyHeuristicExtractJson(frame)).toBeNull();
    expect(extractEvidenceFrame(frame).evidence.result_code).toBe("DRY_RUN_READY");
  });

  it("validateEvidenceSchema rejects unknown source", () => {
    const v = validateEvidenceSchema({
      ...readyEvidence(),
      evidence_source: "forged",
    });
    expect(v.ok).toBe(false);
  });
});
