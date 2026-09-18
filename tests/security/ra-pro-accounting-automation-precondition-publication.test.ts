import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertPreconditionEvidencePublished, validateEvidence } = require(
  "../../scripts/security/ra-pro-accounting-automation-precondition-gates",
);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { assertUtf8LfNoBom } = require("../../scripts/security/git-blob-authority");

const ROOT = process.cwd();
const FIXTURE = "docs/security/ra-pro-accounting-automation-apply/RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_V1.json";
const REVIEWED_SHA = "8714cea78cf04defdc3bfa63555aca507220fb4ec985b3709fdef629a34499b8";
const REVIEWED_BYTES = 2112;
const SOURCE_COMMIT = "3fe3fb0fbe8506672956fdfdbf3ffc47ab74cf99";
const SOURCE_OID = "ab69f5cea7cabc14cb11201d1463b935d09a9a01";

function publishedAuth(patch: Record<string, unknown> = {}) {
  return {
    precondition_publication: {
      status: "PUBLISHED",
      evidence_path: FIXTURE,
      evidence_source_commit: SOURCE_COMMIT,
      evidence_blob_oid: SOURCE_OID,
      evidence_sha256: REVIEWED_SHA,
      evidence_bytes: REVIEWED_BYTES,
      ...patch,
    },
  };
}

type MutableEvidence = {
  valid_from_utc: string;
  valid_until_utc: string;
  collected_at_utc: string;
  automation_gate: { production_presence: string };
  database: { migration_history_count: number; authorizing_inventory: { total: number } };
  safety: { production_writes: number };
};

function sha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function fixture() {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, FIXTURE), "utf8"),
  ) as MutableEvidence;
}

describe("RA Pro accounting-automation precondition publication", () => {
  it("preserves the independently reviewed LF bytes", () => {
    const buffer = fs.readFileSync(path.join(ROOT, FIXTURE));
    expect(buffer.length).toBe(REVIEWED_BYTES);
    expect(sha256(buffer)).toBe(REVIEWED_SHA);
    expect(buffer.includes(0x0d)).toBe(false);
    expect(buffer[buffer.length - 1]).toBe(0x0a);
    expect(buffer[buffer.length - 2]).not.toBe(0x0a);
  });

  it("accepts the reviewed facts only inside their validity window", () => {
    expect(() => validateEvidence(fixture(), new Date("2026-09-18T12:00:00Z"))).not.toThrow();
  });

  it("rejects future-start and expired evidence", () => {
    const future = fixture();
    future.valid_from_utc = "2026-09-18T13:00:00Z";
    future.valid_until_utc = "2026-09-19T13:00:00Z";
    future.collected_at_utc = "2026-09-18T13:00:00Z";
    expect(() => validateEvidence(future, new Date("2026-09-18T12:00:00Z"))).toThrow(/START_NOT_UNEXPIRED/);
    expect(() => validateEvidence(fixture(), new Date("2026-09-19T01:00:07Z"))).toThrow(/EXPIRED/);
  });

  it.each([
    ["open gate", (e: MutableEvidence) => (e.automation_gate.production_presence = "present")],
    ["history drift", (e: MutableEvidence) => (e.database.migration_history_count = 189)],
    ["inventory drift", (e: MutableEvidence) => (e.database.authorizing_inventory.total = 5)],
    ["write claim", (e: MutableEvidence) => (e.safety.production_writes = 1)],
  ])("rejects %s", (_name, mutate) => {
    const evidence = fixture();
    mutate(evidence);
    expect(() => validateEvidence(evidence, new Date("2026-09-18T12:00:00Z"))).toThrow(/PRECONDITION_/);
  });

  it("rejects unpublished pins and all path/env overrides before blob loading", () => {
    expect(() => assertPreconditionEvidencePublished({ auth: {}, cwd: ROOT })).toThrow(/PINS_UNPUBLISHED/);
    const auth = { precondition_publication: { status: "PUBLISHED" } };
    expect(() => assertPreconditionEvidencePublished({ auth, cwd: ROOT, preconditionEvidencePath: "x" })).toThrow(/PATH_OVERRIDE_FORBIDDEN/);
    expect(() => assertPreconditionEvidencePublished({ auth, cwd: ROOT, env: { RA_PRO_ACCOUNTING_AUTOMATION_PRECONDITION_EVIDENCE_PATH: "x" } })).toThrow(/ENV_OVERRIDE_FORBIDDEN/);
  });

  it("accepts the source-commit blob and rejects tampered or substituted authorities", () => {
    expect(
      assertPreconditionEvidencePublished({
        auth: publishedAuth(),
        cwd: ROOT,
        now: new Date("2026-09-18T12:00:00Z"),
      }),
    ).toMatchObject({
      oid: SOURCE_OID,
      sha256: REVIEWED_SHA,
      bytes: REVIEWED_BYTES,
    });
    for (const patch of [
      { evidence_sha256: "0".repeat(64) },
      { evidence_path: "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json" },
      { evidence_bytes: REVIEWED_BYTES + 2 },
      { evidence_blob_oid: "0".repeat(40) },
    ]) {
      expect(() =>
        assertPreconditionEvidencePublished({
          auth: publishedAuth(patch),
          cwd: ROOT,
          now: new Date("2026-09-18T12:00:00Z"),
        }),
      ).toThrow();
    }
  });

  it("rejects missing evidence blobs before credentials or SQL", () => {
    expect(() =>
      assertPreconditionEvidencePublished({
        auth: publishedAuth({
          evidence_source_commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        }),
        cwd: ROOT,
        now: new Date("2026-09-18T12:00:00Z"),
      }),
    ).toThrow(/GIT_BLOB_LOAD_FAILED/);
  });

  it("rejects CRLF-converted evidence bytes", () => {
    expect(() => assertUtf8LfNoBom(Buffer.from('{"ok":true}\r\n', "utf8"), "precondition")).toThrow(
      /CR\/CRLF/,
    );
  });
});
