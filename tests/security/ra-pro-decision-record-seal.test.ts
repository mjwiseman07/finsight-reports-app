/**
 * Asserts the committed Git LF blob for the RA Pro cutover operator decision
 * is the seal authority (not a CRLF worktree digest).
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const DECISION_PATH = "docs/security/ra-pro-cutover-operator-decision.json";

const SUPERSEDED_CRLF_SHA =
  "8499dd36b0938f2c22a71e32a4fd50c2347fa887629e307f4c8590f12d811a43";
const SUPERSEDED_CRLF_BYTES = 1148;

/** Authoritative Git LF blob (tip after decision-record authority remediation). */
const EXPECTED_OID = "0dd39de5ffbfd2b35d3d73887dd0fa915a061c93";
const EXPECTED_SHA256 =
  "f00039cb536b0ffef09ea41c0613ce83d7f52067b2bffc4ff27980f8e9bd46e1";
const EXPECTED_BYTES = 1122;

const EXPECTED_MAPPING_SHA =
  "93f6fe31360222ccd282e814a3764ccf07929e7cb91c25c70e10b750ec0ec953";

function blobAtHead(): { oid: string; bytes: Buffer; sha256: string } {
  const oid = execFileSync("git", ["rev-parse", `HEAD:${DECISION_PATH}`], {
    encoding: "utf8",
  }).trim();
  const bytes = execFileSync("git", ["cat-file", "blob", oid]);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { oid, bytes, sha256 };
}

describe("RA Pro cutover operator decision Git LF seal authority", () => {
  it("committed blob is LF-only and not the superseded CRLF digest", () => {
    const { bytes, sha256 } = blobAtHead();
    expect(bytes.includes(0x0d)).toBe(false);
    expect(sha256).not.toBe(SUPERSEDED_CRLF_SHA);
    expect(bytes.length).not.toBe(SUPERSEDED_CRLF_BYTES);
  });

  it("HEAD blob matches the published tip seal (OID / SHA-256 / bytes)", () => {
    const { oid, bytes, sha256 } = blobAtHead();
    expect(sha256).toBe(EXPECTED_SHA256);
    expect(bytes.length).toBe(EXPECTED_BYTES);
    expect(oid).toBe(EXPECTED_OID);
  });

  it("semantic decision remains NO_CUTOVER × 4 bound to mapping artifact", () => {
    const { bytes } = blobAtHead();
    const json = JSON.parse(bytes.toString("utf8"));
    expect(json.actions).toEqual({
      NO_CUTOVER: 4,
      LINK_EXISTING_FIRM: 0,
      CREATE_NEW_FIRM: 0,
    });
    expect(json.backfill_authorized).toBe(false);
    expect(json.mapping_artifact_sha256).toBe(EXPECTED_MAPPING_SHA);
    expect(json.expected_linked_firms_after_migration).toBe(0);
  });

  it("CRLF expansion of the authoritative blob yields the superseded digest", () => {
    const { bytes } = blobAtHead();
    const crlf = Buffer.from(bytes.toString("utf8").replace(/\n/g, "\r\n"), "utf8");
    const sha = createHash("sha256").update(crlf).digest("hex");
    expect(crlf.length).toBe(SUPERSEDED_CRLF_BYTES);
    expect(sha).toBe(SUPERSEDED_CRLF_SHA);
  });
});
